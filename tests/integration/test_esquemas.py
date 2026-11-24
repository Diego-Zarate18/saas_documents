"""Integridad de los esquemas de T-04 en las tres bases (guía, sección 9: integridad).

Necesita las bases levantadas. Aplica los esquemas que falten (idempotente) y cada caso deshace lo que escribe.
"""

import uuid
from datetime import UTC, datetime

import psycopg
import pytest
from neo4j.exceptions import ConstraintError
from pymongo.errors import WriteError

from app.config import cargar_ajustes
from herramientas import esquemas

pytestmark = pytest.mark.integracion


@pytest.fixture(scope='module')
def bases():
    ajustes = cargar_ajustes()
    pg, mongo, grafo = esquemas.conectar(ajustes)
    db = mongo[ajustes.mongo_db]
    esquemas.esquema_postgres(pg)
    esquemas.esquema_mongo(pg, db)
    esquemas.esquema_neo4j(pg, grafo)
    yield pg, db, grafo
    grafo.close()
    mongo.close()
    pg.close()


class Deshacer(Exception):
    """Se lanza al final de un caso para revertir su transacción."""


def documento_con_movimiento(pg: psycopg.Connection) -> dict:
    """Área, persona, documento de entrada, folio y registro nuevos (dentro de la transacción en curso)."""
    ids = {k: str(uuid.uuid4()) for k in ('area', 'persona', 'documento', 'movimiento')}
    siglas = 'T' + uuid.uuid4().hex[:6].upper()
    pg.execute('INSERT INTO area (id_area, siglas, nombre) VALUES (%s, %s, %s)', (ids['area'], siglas, 'Prueba'))
    pg.execute(
        'INSERT INTO persona (id_persona, nombre, id_area) VALUES (%s, %s, %s)', (ids['persona'], 'Prueba', ids['area'])
    )
    pg.execute(
        """INSERT INTO documento (id_documento, sentido, tipo, id_area_emisora, sintesis, canal_inicial,
                                  fecha_recepcion_inicial, fecha_recepcion_oficial)
           VALUES (%s, 'entrada', 'oficio', %s, 'Prueba', 'papel', now(), current_date)""",
        (ids['documento'], ids['area']),
    )
    ids['folio'] = f'{siglas}-2026-0001'
    pg.execute(
        'INSERT INTO folio (folio, id_documento, id_area, anio, consecutivo) VALUES (%s, %s, %s, 2026, 1)',
        (ids['folio'], ids['documento'], ids['area']),
    )
    pg.execute(
        """INSERT INTO movimiento (id_movimiento, id_documento, tipo, id_area_destino, rol, id_persona)
           VALUES (%s, %s, 'registro', %s, 'responsable', %s)""",
        (ids['movimiento'], ids['documento'], ids['area'], ids['persona']),
    )
    return ids


def test_integridad_postgres_folio_repetido_rechazado(bases):
    pg, _, _ = bases
    with pytest.raises(Deshacer), pg.transaction():
        ids = documento_con_movimiento(pg)
        with pytest.raises(psycopg.errors.UniqueViolation), pg.transaction():
            pg.execute(
                'INSERT INTO folio (folio, id_documento, id_area, anio, consecutivo) VALUES (%s, %s, %s, 2026, 2)',
                (ids['folio'], ids['documento'], ids['area']),
            )
        raise Deshacer


def test_integridad_postgres_update_de_movimiento_rechazado(bases):
    pg, _, _ = bases
    with pytest.raises(Deshacer), pg.transaction():
        ids = documento_con_movimiento(pg)
        with pytest.raises(psycopg.errors.RestrictViolation, match='solo inserción'), pg.transaction():
            pg.execute("UPDATE movimiento SET rol = 'apoyo' WHERE id_movimiento = %s", (ids['movimiento'],))
        raise Deshacer


def test_integridad_mongo_expediente_invalido_rechazado(bases):
    _, db, _ = bases
    ahora = datetime.now(UTC)
    invalido = {
        '_id': str(uuid.uuid4()),
        'tipo': 'requerimiento_auditoria',
        'datos_tipo': {},  # falta ente_auditor, obligatorio en este tipo (D-66)
        'referencias_citadas': [],
        'anexos': [],
        'notas': [],
        'creado_en': ahora,
        'actualizado_en': ahora,
    }
    with pytest.raises(WriteError) as error:
        db.expedientes.insert_one(invalido)
    assert error.value.code == 121  # DocumentValidationFailure
    assert db.expedientes.count_documents({'_id': invalido['_id']}) == 0


def test_integridad_neo4j_documento_id_repetido_rechazado(bases):
    _, _, grafo = bases
    id_documento = str(uuid.uuid4())
    # Sin commit: la transacción se revierte al salir.
    with grafo.session() as sesion, pytest.raises(ConstraintError), sesion.begin_transaction() as tx:
        tx.run('CREATE (:Documento {id: $id})', id=id_documento)
        tx.run('CREATE (:Documento {id: $id})', id=id_documento).consume()
    registros, _, _ = grafo.execute_query('MATCH (d:Documento {id: $id}) RETURN d', id=id_documento)
    assert registros == []
