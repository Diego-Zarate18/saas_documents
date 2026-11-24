"""O-40. Reconciliar las tres bases: PostgreSQL es la fuente del registro (D-13).

Uso, desde backend/:  uv run python -m herramientas.reconciliar

Compara, por documento y movimiento, la existencia, el estado y el tipo entre PostgreSQL, MongoDB y Neo4j, y las
sustituciones a medias (D-14). Reporta cada diferencia y la corrige: reencola en el outbox lo que falta o no coincide
en las réplicas (la entrega es idempotente, AG-06 y AD-01) y, en una SUSTITUYE_A a medias, ajusta el estado en
PostgreSQL al que dicta la relación, que vive en Neo4j (D-24). El tipo de un expediente no se corrige solo: no
cambia (D-26) y una diferencia es un defecto que se reporta.
"""

import argparse
from collections import defaultdict
from datetime import UTC, datetime

import psycopg
from neo4j import Driver
from psycopg.types.json import Jsonb
from pymongo.database import Database

from app.config import cargar_ajustes
from app.dominio.modelos import CAMPOS_TIPO
from herramientas.esquemas import conectar


def _texto(valor) -> str | None:
    if valor is None:
        return None
    return valor.isoformat() if isinstance(valor, datetime) else str(valor)


def _encolar(pg: psycopg.Connection, destino: str, tipo: str, id_entidad, datos: dict) -> None:
    pg.execute(
        'INSERT INTO outbox (destino, tipo_evento, id_entidad, datos) VALUES (%s, %s, %s, %s)',
        (destino, tipo, id_entidad, Jsonb(datos)),
    )


def _evento_documento(d: dict) -> dict:
    return {
        'id_documento': str(d['id_documento']),
        'tipo': d['tipo'],
        'estado': d['estado'],
        'confidencial': d['confidencial'],
        'id_area_emisora': _texto(d['id_area_emisora']),
    }


def _evento_movimiento(m: dict, otros: list) -> dict:
    campos = (
        'id_movimiento',
        'id_documento',
        'tipo',
        'fecha_hora',
        'id_grupo_turno',
        'id_area_origen',
        'id_area_destino',
        'rol',
        'motivo',
        'id_area_sugerida',
        'id_persona',
        'id_titular_al_turnar',
    )
    datos = {c: _texto(m[c]) for c in campos}
    datos['id_corrige'] = _texto(m['id_movimiento_corregido'])
    datos['origenes'] = [str(o) for o in ([m['id_area_origen'], *otros] if m['id_area_origen'] else [])]
    return datos


def reconciliar(pg: psycopg.Connection, db: Database, grafo: Driver) -> dict:
    """O-40. Devuelve las diferencias encontradas por clase y cuántas se corrigieron."""
    documentos = {
        str(f[0]): dict(zip(('id_documento', 'tipo', 'estado', 'confidencial', 'id_area_emisora'), f, strict=True))
        for f in pg.execute('SELECT id_documento, tipo, estado, confidencial, id_area_emisora FROM documento')
    }
    columnas = [
        'id_movimiento',
        'id_documento',
        'tipo',
        'fecha_hora',
        'id_grupo_turno',
        'id_area_origen',
        'id_area_destino',
        'rol',
        'motivo',
        'id_area_sugerida',
        'id_persona',
        'id_titular_al_turnar',
        'id_movimiento_corregido',
    ]
    movimientos = {
        str(f[0]): dict(zip(columnas, f, strict=True))
        for f in pg.execute(f'SELECT {", ".join(columnas)} FROM movimiento ORDER BY fecha_hora, fecha_registro')  # noqa: S608
    }
    otros_origenes = defaultdict(list)
    for id_mov, id_area in pg.execute('SELECT id_movimiento, id_area FROM movimiento_origen'):
        otros_origenes[str(id_mov)].append(id_area)
    estado_previo = {
        str(i): e
        for i, e in pg.execute("SELECT id_documento, estado_previo FROM documento WHERE estado = 'sin_efecto'")
    }

    expedientes = {e['_id']: e['tipo'] for e in db.expedientes.find({}, {'tipo': 1})}
    nodos, _, _ = grafo.execute_query('MATCH (d:Documento) RETURN d.id AS id, d.estado AS estado, d.tipo AS tipo')
    en_grafo = {n['id']: n for n in nodos}
    movs, _, _ = grafo.execute_query('MATCH (m:Movimiento) RETURN m.id AS id')
    movs_en_grafo = {m['id'] for m in movs}
    sustituciones, _, _ = grafo.execute_query(
        'MATCH (:Documento)-[:SUSTITUYE_A]->(d:Documento) RETURN DISTINCT d.id AS id'
    )
    sustituidos = {s['id'] for s in sustituciones}

    diferencias: dict[str, list[str]] = defaultdict(list)
    corregidas = 0
    with pg.transaction():
        for id_doc, d in documentos.items():
            if id_doc not in expedientes:
                diferencias['expediente_faltante'].append(id_doc)
                if not any(c['obligatorio'] for c in CAMPOS_TIPO.get(d['tipo'], [])):
                    ahora = datetime.now(UTC).isoformat()
                    _encolar(
                        pg,
                        'mongodb',
                        'expediente',
                        d['id_documento'],
                        {
                            'id_documento': id_doc,
                            '_id': id_doc,
                            'tipo': d['tipo'],
                            'datos_tipo': {},
                            'referencias_citadas': [],
                            'anexos': [],
                            'notas': [],
                            'creado_en': ahora,
                            'actualizado_en': ahora,
                        },
                    )
                    corregidas += 1
            elif expedientes[id_doc] != d['tipo']:
                diferencias['tipo_distinto_en_mongodb'].append(id_doc)
            nodo = en_grafo.get(id_doc)
            if nodo is None or nodo['estado'] != d['estado'] or nodo['tipo'] != d['tipo']:
                diferencias['documento_distinto_en_neo4j' if nodo else 'documento_faltante_en_neo4j'].append(id_doc)
                _encolar(pg, 'neo4j', 'documento', d['id_documento'], _evento_documento(d))
                corregidas += 1
        for id_mov, m in movimientos.items():
            if id_mov not in movs_en_grafo:
                diferencias['movimiento_faltante_en_neo4j'].append(id_mov)
                _encolar(pg, 'neo4j', 'movimiento', m['id_movimiento'], _evento_movimiento(m, otros_origenes[id_mov]))
                corregidas += 1
        # D-14: SUSTITUYE_A en Neo4j sin `sin_efecto` en PostgreSQL, o al revés.
        for id_doc in sustituidos:
            d = documentos.get(id_doc)
            if d and d['estado'] in ('en_tramite', 'concluido'):
                diferencias['sustitucion_a_medias'].append(id_doc)
                pg.execute(
                    "UPDATE documento SET estado_previo = estado, estado = 'sin_efecto' WHERE id_documento = %s",
                    (id_doc,),
                )
                _encolar(pg, 'neo4j', 'estado', d['id_documento'], {'id_documento': id_doc, 'estado': 'sin_efecto'})
                corregidas += 1
        for id_doc, previo in estado_previo.items():
            if id_doc not in sustituidos:
                diferencias['sin_efecto_sin_sustitucion'].append(id_doc)
                pg.execute(
                    'UPDATE documento SET estado = estado_previo, estado_previo = NULL WHERE id_documento = %s',
                    (id_doc,),
                )
                _encolar(pg, 'neo4j', 'estado', id_doc, {'id_documento': id_doc, 'estado': previo})
                corregidas += 1
    return {
        'diferencias': {clase: len(ids) for clase, ids in diferencias.items()},
        'detalle': dict(diferencias),
        'total': sum(len(ids) for ids in diferencias.values()),
        'corregidas': corregidas,
    }


def main(argumentos: list[str] | None = None) -> None:
    argparse.ArgumentParser(description=__doc__.splitlines()[0]).parse_args(argumentos)
    ajustes = cargar_ajustes()
    pg, cliente, grafo = conectar(ajustes)
    try:
        resultado = reconciliar(pg, cliente[ajustes.mongo_db], grafo)
    finally:
        grafo.close()
        cliente.close()
        pg.close()
    print(f'Diferencias: {resultado["total"]}; corregidas (reencoladas o ajustadas): {resultado["corregidas"]}')
    for clase, ids in resultado['detalle'].items():
        print(f'  {clase}: {len(ids)} · {", ".join(ids[:5])}{" …" if len(ids) > 5 else ""}')


if __name__ == '__main__':
    main()
