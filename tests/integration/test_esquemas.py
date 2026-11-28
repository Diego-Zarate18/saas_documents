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


def test_cardinalidad_grafo(bases):
    """Parte B (E-4): verifica cardinalidades sobre la semilla en Neo4j 5.26 Community."""
    pg, db, grafo = bases
    esquemas.vaciar_datos(pg, db, grafo)
    esquemas.cargar_semilla(pg, db, grafo)

    reglas = {
        'SOBRE distinto de 1 por Movimiento': (
            'MATCH (m:Movimiento) WHERE COUNT { (m)-[:SOBRE]->(:Documento) } <> 1 RETURN count(m) AS violaciones'
        ),
        'HACIA distinto de 1 por Movimiento': (
            'MATCH (m:Movimiento) WHERE COUNT { (m)-[:HACIA]->(:Area) } <> 1 RETURN count(m) AS violaciones'
        ),
        'REALIZADO_POR distinto de 1 por Movimiento': (
            'MATCH (m:Movimiento) WHERE COUNT { (m)-[:REALIZADO_POR]->(:Persona) } <> 1 RETURN count(m) AS violaciones'
        ),
        'EMITIDO_POR mayor a 1 por Documento': (
            'MATCH (d:Documento) WHERE COUNT { (d)-[:EMITIDO_POR]->(:Area) } > 1 RETURN count(d) AS violaciones'
        ),
        'DESDE presente en Movimiento registro': (
            "MATCH (m:Movimiento {tipo: 'registro'}) WHERE EXISTS { (m)-[:DESDE]->(:Area) } "
            'RETURN count(m) AS violaciones'
        ),
        'SIGUIENTE entrante en Movimiento registro': (
            "MATCH (m:Movimiento {tipo: 'registro'}) WHERE EXISTS { (:Movimiento)-[:SIGUIENTE]->(m) } "
            'RETURN count(m) AS violaciones'
        ),
        'SIGUIENTE une movimientos de documentos distintos': (
            'MATCH (m1:Movimiento)-[:SIGUIENTE]->(m2:Movimiento) '
            'MATCH (m1)-[:SOBRE]->(d1:Documento), (m2)-[:SOBRE]->(d2:Documento) '
            'WHERE d1.id <> d2.id RETURN count(m1) AS violaciones'
        ),
        'SUSTITUYE_A hacia nodo que no es Documento': (
            'MATCH (:Documento)-[r:SUSTITUYE_A]->(destino) WHERE NOT destino:Documento RETURN count(r) AS violaciones'
        ),
        'Referencia de un documento consigo mismo': (
            'MATCH (d:Documento)-[r:RESPONDE_A|DA_SEGUIMIENTO_A|EN_ALCANCE_A|SUSTITUYE_A]->(d) '
            'RETURN count(r) AS violaciones'
        ),
    }

    for nombre, cypher in reglas.items():
        reg, _, _ = grafo.execute_query(cypher)
        assert reg[0]['violaciones'] == 0, f'Violación en {nombre}: {reg[0]["violaciones"]}'

    # Caso positivo de ramas (1:N): OP-2026-0139 tiene un registro seguido de 2 turnos (ramas) en SIGUIENTE.
    ramas, _, _ = grafo.execute_query(
        """MATCH (d:Documento {id: $id})<-[:SOBRE]-(r:Movimiento {tipo: 'registro'})-[:SIGUIENTE]->(t:Movimiento)
           RETURN count(t) AS n""",
        id='00000000-0000-4000-8000-000000001004',
    )
    assert ramas[0]['n'] == 2


@pytest.mark.asyncio
async def test_cardinalidad_ramas_atraccion(bases):
    """Parte B (E-4): verifica que un turno a dos áreas abre ramas (1:N) y una atracción las reúne (N:1)."""
    import httpx
    from apoyo_api import CO, FI, OP_0139, SG, entrar, vaciar_outbox

    from app.main import app

    pg, db, grafo = bases
    esquemas.vaciar_datos(pg, db, grafo)
    esquemas.cargar_semilla(pg, db, grafo)

    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://prueba') as api,
    ):
        oficialia, direccion, servicios = [await entrar(api, u) for u in ('mflores', 'alopez', 'pmena')]
        assert (
            await api.post(
                f'/api/documentos/{OP_0139}/turnos',
                json={'destinos': [{'id_area': CO, 'rol': 'responsable'}, {'id_area': SG, 'rol': 'conocimiento'}]},
                headers=oficialia,
            )
        ).status_code == 201
        assert (
            await api.post(
                f'/api/documentos/{OP_0139}/turnos',
                json={'destinos': [{'id_area': FI, 'rol': 'responsable'}]},
                headers=direccion,
            )
        ).status_code == 201
        atr = await api.post(
            f'/api/documentos/{OP_0139}/atracciones',
            json={'justificacion': 'Reunir ramas para cardinalidad N:1'},
            headers=servicios,
        )
        assert atr.status_code == 201
        await vaciar_outbox(app)

        # El movimiento de atracción reúne 2 predecesores por SIGUIENTE (desde CO y desde FI).
        predecesores, _, _ = await app.state.grafo.execute_query(
            'MATCH (p:Movimiento)-[:SIGUIENTE]->(m:Movimiento {id: $id}) RETURN count(p) AS n',
            id=atr.json()['id'],
        )
        assert predecesores[0]['n'] == 2

    esquemas.vaciar_datos(pg, db, grafo)
    esquemas.cargar_semilla(pg, db, grafo)
