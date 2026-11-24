"""D-55. Aplica en orden los esquemas de las tres bases y, con --datos, carga la semilla (O-41).

Uso, desde backend/:

    uv run python -m herramientas.esquemas            # solo esquemas
    uv run python -m herramientas.esquemas --datos    # esquemas y semilla

Cada script de database/<base>/schema (o validators en MongoDB) se aplica una sola vez y queda en la tabla
esquema_version de PostgreSQL. La semilla se escribe en las tres bases de forma idempotente (ON CONFLICT DO NOTHING,
upsert con $setOnInsert y MERGE): correrla otra vez no duplica nada. No pasa por el outbox: es la carga de O-41.
"""

import argparse
import base64
import hashlib
import json
import re
import secrets
import uuid
from collections.abc import Iterable
from datetime import datetime
from pathlib import Path

import psycopg
from neo4j import Driver, GraphDatabase
from psycopg import sql
from psycopg.conninfo import make_conninfo
from pymongo import MongoClient
from pymongo.database import Database

from app.config import Ajustes, cargar_ajustes

DATABASE = Path(__file__).resolve().parents[2] / 'database'
# Contraseña de todos los usuarios de la semilla (solo desarrollo; está en el README).
CONTRASENA_DESARROLLO = 'sigedoc-dev'
# Para los ids de las relaciones RESPONDE_A que replican documento.id_responde_a.
ESPACIO_IDS = uuid.UUID('00000000-0000-4000-8000-000000000000')
REFERENCIAS = {'RESPONDE_A', 'DA_SEGUIMIENTO_A', 'EN_ALCANCE_A', 'SUSTITUYE_A'}


# ── Esquemas ───────────────────────────────────────────────────────────────────


def scripts(carpeta: Path, extension: str) -> list[tuple[int, str, Path]]:
    """(versión, nombre, ruta) de los archivos NNN_nombre.<extension>, en orden."""
    encontrados = []
    for ruta in carpeta.glob(f'*.{extension}'):
        coincide = re.match(r'(\d{3})_', ruta.name)
        if coincide:
            encontrados.append((int(coincide.group(1)), ruta.stem, ruta))
    return sorted(encontrados)


def aplicados(pg: psycopg.Connection, base: str) -> set[int]:
    if pg.execute("SELECT to_regclass('esquema_version')").fetchone()[0] is None:
        return set()
    return {v for (v,) in pg.execute('SELECT version FROM esquema_version WHERE base = %s', (base,))}


def registrar(pg: psycopg.Connection, base: str, version: int, nombre: str) -> None:
    pg.execute('INSERT INTO esquema_version (base, version, nombre) VALUES (%s, %s, %s)', (base, version, nombre))


def esquema_postgres(pg: psycopg.Connection) -> list[str]:
    nuevos = []
    hechos = aplicados(pg, 'postgres')
    for version, nombre, ruta in scripts(DATABASE / 'relational' / 'schema', 'sql'):
        if version in hechos:
            continue
        with pg.transaction():
            pg.execute(ruta.read_text(encoding='utf-8'))
            registrar(pg, 'postgres', version, nombre)
        nuevos.append(nombre)
    return nuevos


def esquema_mongo(pg: psycopg.Connection, db: Database) -> list[str]:
    nuevos = []
    hechos = aplicados(pg, 'mongodb')
    for version, nombre, ruta in scripts(DATABASE / 'document' / 'validators', 'json'):
        if version in hechos:
            continue
        spec = json.loads(ruta.read_text(encoding='utf-8'))
        coleccion = spec['coleccion']
        if 'validator' in spec:
            opciones = {k: spec[k] for k in ('validator', 'validationLevel', 'validationAction')}
            if coleccion in db.list_collection_names():
                db.command('collMod', coleccion, **opciones)
            else:
                db.create_collection(coleccion, **opciones)
        for indice in spec.get('indices', []):
            db[coleccion].create_index(
                list(indice['keys'].items()),
                name=indice['name'],
                partialFilterExpression=indice['partialFilterExpression'],
                collation=indice['collation'],
            )
        with pg.transaction():
            registrar(pg, 'mongodb', version, nombre)
        nuevos.append(nombre)
    return nuevos


def esquema_neo4j(pg: psycopg.Connection, grafo: Driver) -> list[str]:
    nuevos = []
    hechos = aplicados(pg, 'neo4j')
    for version, nombre, ruta in scripts(DATABASE / 'graph' / 'schema', 'cypher'):
        if version in hechos:
            continue
        texto = '\n'.join(
            linea for linea in ruta.read_text(encoding='utf-8').splitlines() if not linea.startswith('//')
        )
        for sentencia in filter(None, (s.strip() for s in texto.split(';'))):
            grafo.execute_query(sentencia)
        with pg.transaction():
            registrar(pg, 'neo4j', version, nombre)
        nuevos.append(nombre)
    return nuevos


# ── Semilla ────────────────────────────────────────────────────────────────────


def hash_contrasena(contrasena: str) -> str:
    """scrypt de la biblioteca estándar (adaptativo, sin dependencias): scrypt$n$r$p$sal$hash."""
    n, r, p = 2**14, 8, 1
    sal = secrets.token_bytes(16)
    clave = hashlib.scrypt(contrasena.encode(), salt=sal, n=n, r=r, p=p)
    return f'scrypt${n}${r}${p}${base64.b64encode(sal).decode()}${base64.b64encode(clave).decode()}'


def insertar(pg: psycopg.Connection, tabla: str, filas: list[dict]) -> int:
    """INSERT … ON CONFLICT; devuelve las filas nuevas. Tabla y columnas salen de los archivos de la semilla."""
    if not filas:
        return 0
    columnas = list(filas[0])
    consulta = sql.SQL('INSERT INTO {} ({}) VALUES ({}) ON CONFLICT DO NOTHING').format(
        sql.Identifier(tabla),
        sql.SQL(', ').join(map(sql.Identifier, columnas)),
        sql.SQL(', ').join(sql.Placeholder(c) for c in columnas),
    )
    nuevas = 0
    with pg.cursor() as cursor:
        for fila in filas:
            cursor.execute(consulta, fila)
            nuevas += cursor.rowcount
    return nuevas


def datos_postgres(pg: psycopg.Connection, semilla: dict) -> int:
    usuarios = [{**u, 'hash_contrasena': hash_contrasena(CONTRASENA_DESARROLLO)} for u in semilla['usuarios']]
    contadores: dict[tuple[str, int], int] = {}
    for f in semilla['folios']:
        clave = (f['id_area'], f['anio'])
        contadores[clave] = max(contadores.get(clave, 0), f['consecutivo'])
    nuevas = 0
    with pg.transaction():  # area ↔ persona se validan al confirmar (FK diferidas)
        for tabla, filas in (
            ('area', semilla['areas']),
            ('persona', semilla['personas']),
            ('usuario', usuarios),
            ('actor_externo', semilla['actores']),
            ('documento', semilla['documentos']),
            ('folio', semilla['folios']),
            ('movimiento', semilla['movimientos']),
            ('movimiento_origen', semilla['movimiento_origen']),
            ('acuse', semilla['acuses']),
        ):
            nuevas += insertar(pg, tabla, filas)
        nuevas += insertar(
            pg,
            'contador_folio',
            [{'id_area': a, 'anio': anio, 'ultimo': u} for (a, anio), u in contadores.items()],
        )
    return nuevas


def _fecha(texto: str) -> datetime:
    return datetime.fromisoformat(texto)


def datos_mongo(db: Database, expedientes: list[dict]) -> int:
    nuevos = 0
    for e in expedientes:
        documento = {
            **e,
            'anexos': [{**a, 'fecha_hora': _fecha(a['fecha_hora'])} for a in e['anexos']],
            'notas': [{**n, 'fecha_hora': _fecha(n['fecha_hora'])} for n in e['notas']],
            'creado_en': _fecha(e['creado_en']),
            'actualizado_en': _fecha(e['actualizado_en']),
        }
        resultado = db.expedientes.update_one({'_id': e['_id']}, {'$setOnInsert': documento}, upsert=True)
        nuevos += resultado.upserted_id is not None
    return nuevos


def _sin_nulos(fila: dict, campos: Iterable[str]) -> dict:
    return {c: fila[c] for c in campos if fila.get(c) is not None}


# Regla de SIGUIENTE (04-grafo.md, D-70, D-103). Versión probada: el predecesor debe ser anterior (<) para que los
# movimientos de un mismo turno, que comparten fecha y hora, no se encadenen entre sí.
SIGUIENTE = """
UNWIND $ids AS id
MATCH (m:Movimiento {id: id})-[:SOBRE]->(d:Documento)
WHERE m.tipo <> 'correccion'
MATCH (m)-[:DESDE]->(o:Area)
CALL (m, d, o) {
  MATCH (p:Movimiento)-[:SOBRE]->(d)
  WHERE p.id <> m.id AND p.tipo <> 'correccion' AND p.fecha_hora < m.fecha_hora
  OPTIONAL MATCH (p)-[h:HACIA]->(o)
  RETURN p ORDER BY h IS NOT NULL DESC, p.fecha_hora DESC
  LIMIT 1
}
MERGE (p)-[:SIGUIENTE]->(m)
"""


def datos_neo4j(grafo: Driver, semilla: dict, propios: dict) -> int:
    """Réplicas de PostgreSQL (lo que haría el outbox, AG-06) y lo que solo vive en el grafo (D-24)."""
    titular = {a['id_area']: a['id_titular'] for a in semilla['areas']}
    documentos = semilla['documentos']
    movimientos = [
        {
            'id': m['id_movimiento'],
            'id_documento': m['id_documento'],
            'id_area_destino': m['id_area_destino'],
            'id_persona': m['id_persona'],
            'origenes': [m['id_area_origen']] if m['id_area_origen'] else [],
            'props': {
                **_sin_nulos(
                    m, ('tipo', 'rol', 'id_grupo_turno', 'motivo', 'id_area_sugerida', 'id_titular_al_turnar')
                ),
                **({'id_corrige': m['id_movimiento_corregido']} if m['id_movimiento_corregido'] else {}),
                'fecha_hora': _fecha(m['fecha_hora']),
            },
        }
        for m in semilla['movimientos']
    ]
    extra = {}
    for o in semilla['movimiento_origen']:
        extra.setdefault(o['id_movimiento'], []).append(o['id_area'])
    for m in movimientos:
        m['origenes'] += extra.get(m['id'], [])
    respuestas = [
        {
            'id': str(uuid.uuid5(ESPACIO_IDS, f'responde_a:{d["id_documento"]}')),
            'de': d['id_documento'],
            'a': d['id_responde_a'],
            'props': _sin_nulos(
                {'id_persona': titular[d['id_area_emisora']], 'fecha_hora': _fecha(d['fecha_registro'])},
                ('id_persona', 'fecha_hora'),
            ),
        }
        for d in documentos
        if d['id_responde_a']
    ]
    sentencias: list[tuple[str, dict]] = [
        ('UNWIND $f AS f MERGE (a:Area {id: f.id_area}) SET a.siglas = f.siglas', {'f': semilla['areas']}),
        ('UNWIND $f AS f MERGE (p:Persona {id: f.id_persona}) SET p.nombre = f.nombre', {'f': semilla['personas']}),
        (
            'UNWIND $f AS f MERGE (d:Documento {id: f.id_documento}) '
            'SET d.tipo = f.tipo, d.estado = f.estado, d.confidencial = f.confidencial '
            'WITH d, f WHERE f.id_area_emisora IS NOT NULL '
            'MATCH (a:Area {id: f.id_area_emisora}) MERGE (d)-[:EMITIDO_POR]->(a)',
            {'f': documentos},
        ),
        (
            'UNWIND $f AS f MATCH (d:Documento {id: f.de}), (o:Documento {id: f.a}) '
            'MERGE (d)-[r:RESPONDE_A {id: f.id}]->(o) SET r += f.props',
            {'f': respuestas},
        ),
        (
            'UNWIND $f AS f MERGE (m:Movimiento {id: f.id}) SET m += f.props '
            'WITH m, f MATCH (d:Documento {id: f.id_documento}), (h:Area {id: f.id_area_destino}), '
            '(p:Persona {id: f.id_persona}) '
            'MERGE (m)-[:SOBRE]->(d) MERGE (m)-[:HACIA]->(h) MERGE (m)-[:REALIZADO_POR]->(p) '
            'WITH m, f UNWIND f.origenes AS origen MATCH (o:Area {id: origen}) MERGE (m)-[:DESDE]->(o)',
            {'f': movimientos},
        ),
        (SIGUIENTE, {'ids': [m['id'] for m in movimientos]}),
        (
            'UNWIND $f AS f MERGE (s:Asunto {id: f.id}) '
            'SET s.nombre = f.nombre, s.descripcion = f.descripcion, s.id_persona = f.id_persona, '
            's.fecha_hora = f.fecha_hora',
            {'f': [{**a, 'fecha_hora': _fecha(a['fecha_hora'])} for a in propios['asuntos']]},
        ),
        (
            'UNWIND $f AS f MATCH (d:Documento {id: f.id_documento}), (s:Asunto {id: f.id_asunto}) '
            'MERGE (d)-[r:PERTENECE_A {id: f.id}]->(s) SET r.id_persona = f.id_persona, r.fecha_hora = f.fecha_hora',
            {'f': [{**p, 'fecha_hora': _fecha(p['fecha_hora'])} for p in propios['pertenece_a']]},
        ),
    ]
    for tipo in sorted({r['tipo'] for r in propios['referencias']}):
        if tipo not in REFERENCIAS:
            raise ValueError(f'Tipo de referencia desconocido: {tipo}')
        filas = [{**r, 'fecha_hora': _fecha(r['fecha_hora'])} for r in propios['referencias'] if r['tipo'] == tipo]
        # El tipo de relación no se puede parametrizar en Cypher: sale del conjunto cerrado REFERENCIAS.
        sentencias.append(
            (
                'UNWIND $f AS f MATCH (d:Documento {id: f.id_origen}) '
                'CALL (f) { '
                '  OPTIONAL MATCH (x:Documento {id: f.id_destino}) WITH x WHERE x IS NOT NULL RETURN x AS destino '
                '  UNION '
                '  WITH f WHERE f.no_registrado IS NOT NULL '
                '  MERGE (x:DocumentoNoRegistrado {numero: f.no_registrado.numero, emisor: f.no_registrado.emisor}) '
                '  RETURN x AS destino '
                '} '
                f'MERGE (d)-[r:{tipo} {{id: f.id}}]->(destino) '
                'SET r.id_persona = f.id_persona, r.fecha_hora = f.fecha_hora',
                {'f': filas},
            )
        )
    creados = 0
    for consulta, parametros in sentencias:
        contadores = grafo.execute_query(consulta, parametros).summary.counters
        creados += contadores.nodes_created + contadores.relationships_created
    return creados


def leer(ruta: str) -> dict | list:
    return json.loads((DATABASE / ruta).read_text(encoding='utf-8'))


# ── Entrada ────────────────────────────────────────────────────────────────────


def conectar(ajustes: Ajustes) -> tuple[psycopg.Connection, MongoClient, Driver]:
    pg = psycopg.connect(
        make_conninfo(
            host=ajustes.postgres_host,
            port=ajustes.postgres_port,
            dbname=ajustes.postgres_db,
            user=ajustes.postgres_user,
            password=ajustes.postgres_password.get_secret_value(),
        ),
        autocommit=True,
    )
    mongo = MongoClient(
        ajustes.mongo_uri.get_secret_value(),
        username=ajustes.mongo_user,
        password=ajustes.mongo_password.get_secret_value(),
        tz_aware=True,
    )
    grafo = GraphDatabase.driver(
        ajustes.neo4j_uri, auth=(ajustes.neo4j_user, ajustes.neo4j_password.get_secret_value())
    )
    return pg, mongo, grafo


def main(argumentos: list[str] | None = None) -> None:
    analizador = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    analizador.add_argument('--datos', action='store_true', help='cargar también la semilla de database/*/data')
    opciones = analizador.parse_args(argumentos)

    ajustes = cargar_ajustes()
    pg, mongo, grafo = conectar(ajustes)
    db = mongo[ajustes.mongo_db]
    try:
        for base, nuevos in (
            ('PostgreSQL', esquema_postgres(pg)),
            ('MongoDB', esquema_mongo(pg, db)),
            ('Neo4j', esquema_neo4j(pg, grafo)),
        ):
            print(f'{base}: {len(nuevos)} scripts nuevos{": " + ", ".join(nuevos) if nuevos else ""}')
        if opciones.datos:
            semilla = leer('relational/data/semilla.json')
            print(f'Semilla en PostgreSQL: {datos_postgres(pg, semilla)} filas nuevas')
            print(f'Semilla en MongoDB: {datos_mongo(db, leer("document/data/expedientes.json"))} expedientes nuevos')
            nuevos = datos_neo4j(grafo, semilla, leer('graph/data/grafo.json'))
            print(f'Semilla en Neo4j: {nuevos} nodos y relaciones nuevos')
    finally:
        grafo.close()
        mongo.close()
        pg.close()


if __name__ == '__main__':
    main()
