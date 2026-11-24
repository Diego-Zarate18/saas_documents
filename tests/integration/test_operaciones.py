"""T-05: sesión, registro con outbox, turnos, atracción y bandeja por la API, contra las tres bases.

Necesita las bases levantadas. Recarga la semilla al empezar y al terminar (O-41), porque la bitácora no se borra.
"""

import asyncio
import uuid

import httpx
import psycopg
import pytest
import pytest_asyncio

from app.config import cargar_ajustes
from app.infra import mongo, neo4j
from herramientas import esquemas
from outbox.procesador import procesar_todo

pytestmark = [pytest.mark.integracion, pytest.mark.asyncio(loop_scope='module')]

CONTRASENA = esquemas.CONTRASENA_DESARROLLO
OP, DG, CO, FI, SG = (f'00000000-0000-4000-8000-000000000{n}' for n in (101, 102, 103, 104, 109))
OP_0139 = '00000000-0000-4000-8000-000000001004'


@pytest.fixture(scope='module')
def bases():
    ajustes = cargar_ajustes()
    pg, cliente, grafo = esquemas.conectar(ajustes)
    db = cliente[ajustes.mongo_db]

    def recargar():
        esquemas.esquema_postgres(pg)
        esquemas.vaciar_datos(pg, db, grafo)
        esquemas.cargar_semilla(pg, db, grafo)

    recargar()
    yield pg
    recargar()
    grafo.close()
    cliente.close()
    pg.close()


@pytest_asyncio.fixture(scope='module', loop_scope='module')
async def api(bases):
    from app.main import app  # importarla lee el .env

    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://prueba') as cliente,
    ):
        yield cliente


async def entrar(api: httpx.AsyncClient, usuario: str) -> dict:
    """Inicia sesión y devuelve la cabecera con la cookie (el cliente no la guarda: cada prueba usa varias)."""
    respuesta = await api.post(
        '/api/sesiones', json={'correo': f'{usuario}@institucion.gob.mx', 'contrasena': CONTRASENA}
    )
    assert respuesta.status_code == 201, respuesta.text
    api.cookies.clear()
    return {'Cookie': f'sigedoc_sesion={respuesta.cookies["sigedoc_sesion"]}'}


def nuevo(sintesis: str, **extra) -> dict:
    return {
        'tipo': 'oficio',
        'numero_emisor': None,
        'tipo_emisor': 'externo',
        'emisor': 'Ciudadano',
        'fecha_documento': None,
        'canal': 'papel',
        'fecha_recepcion': '2026-11-24T10:00:00-06:00',
        'sintesis': sintesis,
        'confidencial': False,
        'extemporaneo': False,
        'datos_tipo': {},
        **extra,
    }


async def registrar(api: httpx.AsyncClient, oficialia: dict, sintesis: str) -> dict:
    respuesta = await api.post('/api/documentos', json=nuevo(sintesis), headers=oficialia)
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()


async def bandeja(api: httpx.AsyncClient, sesion: dict, id_area: str) -> dict:
    respuesta = await api.get('/api/bandeja', params={'id_area': id_area}, headers=sesion)
    assert respuesta.status_code == 200, respuesta.text
    return {fila['id_documento']: fila for fila in respuesta.json()['elementos']}


async def test_o36_credenciales_incorrectas_y_bloqueo(api):
    sin_sesion = await api.get('/api/sesiones/actual')
    assert (sin_sesion.status_code, sin_sesion.json()['codigo']) == (401, 'NO_AUTENTICADO')

    desconocido = await api.post('/api/sesiones', json={'correo': 'nadie@institucion.gob.mx', 'contrasena': 'x'})
    assert (desconocido.status_code, desconocido.json()['title']) == (401, 'Correo o contraseña incorrectos.')

    # Cinco intentos fallidos seguidos bloquean la cuenta 15 minutos (D-107): la contraseña correcta ya no entra.
    for _ in range(5):
        fallo = await api.post('/api/sesiones', json={'correo': 'JRuiz@institucion.gob.mx ', 'contrasena': 'mala'})
        assert fallo.json()['title'] == 'Correo o contraseña incorrectos.'
    bloqueada = await api.post('/api/sesiones', json={'correo': 'jruiz@institucion.gob.mx', 'contrasena': CONTRASENA})
    assert bloqueada.status_code == 401
    assert bloqueada.json()['title'].startswith('Demasiados intentos fallidos')

    # Otra cuenta entra, la cookie es httpOnly y la sesión vale hasta cerrarla (O-37).
    respuesta = await api.post('/api/sesiones', json={'correo': 'opaz@institucion.gob.mx', 'contrasena': CONTRASENA})
    assert respuesta.status_code == 201
    assert 'httponly' in respuesta.headers['set-cookie'].lower()
    assert (await api.get('/api/sesiones/actual')).json()['rol'] == 'PE'
    assert (await api.delete('/api/sesiones/actual')).status_code == 204
    api.cookies.clear()


async def test_o01_folios_concurrentes_sin_huecos(api):
    oficialia = await entrar(api, 'mflores')
    siguiente = (await api.get('/api/documentos/folio-siguiente', headers=oficialia)).json()
    primero = int(siguiente.rsplit('-', 1)[1])

    respuestas = await asyncio.gather(
        *(api.post('/api/documentos', json=nuevo(f'Concurrente {i}'), headers=oficialia) for i in range(20))
    )

    assert [r.status_code for r in respuestas] == [201] * 20
    consecutivos = sorted(int(r.json()['folio'].rsplit('-', 1)[1]) for r in respuestas)
    assert consecutivos == list(range(primero, primero + 20))


async def test_o01_duplicado(api):
    oficialia = await entrar(api, 'mflores')
    antes = (await api.get('/api/documentos/folio-siguiente', headers=oficialia)).json()
    # Mismo número, emisor y año que OP-2026-0139 (D-27).
    duplicado = nuevo(
        'Otra vez la requisición',
        numero_emisor='SIS/0231/2026',
        tipo_emisor='area',
        emisor='Sistemas',
        fecha_documento='2026-11-17',
        tipo='solicitud_material_pago',
    )

    respuesta = await api.post('/api/documentos', json=duplicado, headers=oficialia)

    assert respuesta.status_code == 409
    cuerpo = respuesta.json()
    assert cuerpo['codigo'] == 'DUPLICADO'
    assert cuerpo['existente']['folio'] == 'OP-2026-0139'
    # No se crea nada: el consecutivo no se consume.
    assert (await api.get('/api/documentos/folio-siguiente', headers=oficialia)).json() == antes


async def test_ri10_un_responsable_por_grupo(api, bases):
    oficialia = await entrar(api, 'mflores')
    documento = await registrar(api, oficialia, 'Grupo de turno')
    ruta = f'/api/documentos/{documento["id"]}/turnos'

    dos = await api.post(
        ruta,
        json={'destinos': [{'id_area': CO, 'rol': 'responsable'}, {'id_area': FI, 'rol': 'responsable'}]},
        headers=oficialia,
    )
    ninguno = await api.post(ruta, json={'destinos': [{'id_area': CO, 'rol': 'apoyo'}]}, headers=oficialia)
    assert (dos.status_code, dos.json()['title']) == (422, 'Solo puede haber un responsable en el grupo.')
    assert (ninguno.status_code, ninguno.json()['title']) == (422, 'Falta un responsable en el grupo.')

    turno = await api.post(
        ruta,
        json={'destinos': [{'id_area': CO, 'rol': 'responsable'}, {'id_area': FI, 'rol': 'apoyo'}]},
        headers=oficialia,
    )
    assert turno.status_code == 201
    # La base también lo impide (ux_responsable_por_grupo): un segundo responsable en el mismo grupo.
    movimiento = turno.json()['movimientos'][0]
    with pytest.raises(psycopg.errors.UniqueViolation), bases.transaction():
        bases.execute(
            """INSERT INTO movimiento (id_movimiento, id_documento, tipo, id_grupo_turno, id_area_origen,
                                       id_area_destino, rol, id_persona)
               VALUES (%s, %s, 'turno', %s, %s, %s, 'responsable', %s)""",
            (uuid.uuid4(), documento['id'], turno.json()['id_grupo_turno'], OP, SG, movimiento['id_persona']),
        )


async def test_o23_atraccion_deja_un_responsable(api):
    oficialia, direccion, servicios = [await entrar(api, u) for u in ('mflores', 'alopez', 'pmena')]
    # Dos responsables a la vez (D-67): oficialía turna a Compras y dirección, después, a Finanzas.
    primero = {'destinos': [{'id_area': CO, 'rol': 'responsable'}, {'id_area': SG, 'rol': 'conocimiento'}]}
    assert (await api.post(f'/api/documentos/{OP_0139}/turnos', json=primero, headers=oficialia)).status_code == 201
    segundo = {'destinos': [{'id_area': FI, 'rol': 'responsable'}]}
    assert (await api.post(f'/api/documentos/{OP_0139}/turnos', json=segundo, headers=direccion)).status_code == 201
    assert OP_0139 in await bandeja(api, direccion, CO)
    assert OP_0139 in await bandeja(api, direccion, FI)

    # Servicios Generales, que lo tiene de conocimiento, lo atrae (D-68).
    respuesta = await api.post(
        f'/api/documentos/{OP_0139}/atracciones', json={'justificacion': 'Lo atiende el área'}, headers=servicios
    )

    assert respuesta.status_code == 201, respuesta.text
    atraccion = respuesta.json()
    assert (atraccion['id_area_origen'], atraccion['otros_origenes']) == (CO, [FI])
    assert OP_0139 not in await bandeja(api, direccion, CO)
    assert OP_0139 not in await bandeja(api, direccion, FI)
    assert (await bandeja(api, direccion, SG))[OP_0139]['rol'] == 'responsable'


async def test_o39_replica_documento_y_movimientos(api):
    oficialia = await entrar(api, 'mflores')
    documento = await registrar(api, oficialia, 'Para replicar')
    destinos = {'destinos': [{'id_area': CO, 'rol': 'responsable'}, {'id_area': FI, 'rol': 'apoyo'}]}
    assert (await api.post(f'/api/documentos/{documento["id"]}/turnos', json=destinos, headers=oficialia)).is_success

    from app.main import app

    ajustes = cargar_ajustes()
    cliente, grafo = mongo.crear_cliente(ajustes), neo4j.crear_driver(ajustes)
    try:
        # Procesa hasta que los eventos del documento estén enviados (el servicio outbox de compose también puede
        # tomarlos: SKIP LOCKED evita que dos procesos entreguen el mismo).
        for _ in range(100):
            await procesar_todo(app.state.pool, cliente[ajustes.mongo_db], grafo, ajustes.outbox_max_intentos)
            async with app.state.pool.connection() as con:
                cursor = await con.execute(
                    "SELECT count(*) FILTER (WHERE estado <> 'enviado') AS faltan, count(*) AS eventos FROM outbox "
                    "WHERE datos->>'id_documento' = %s",
                    (documento['id'],),
                )
                cuenta = await cursor.fetchone()
            if cuenta['faltan'] == 0:
                break
            await asyncio.sleep(0.1)
        assert cuenta == {'faltan': 0, 'eventos': 5}  # expediente, documento y tres movimientos

        registros, _, _ = await grafo.execute_query(
            """MATCH (d:Documento {id: $id})<-[:SOBRE]-(r:Movimiento {tipo: 'registro'})-[:HACIA]->(:Area {id: $op})
               OPTIONAL MATCH (r)-[:SIGUIENTE]->(t:Movimiento {tipo: 'turno'})-[:HACIA]->(a:Area)
               RETURN d.estado AS estado, collect(a.id) AS destinos""",
            id=documento['id'],
            op=OP,
        )
        assert registros[0]['estado'] == 'en_tramite'
        assert sorted(registros[0]['destinos']) == sorted([CO, FI])

        expediente = await cliente[ajustes.mongo_db].expedientes.find_one({'_id': documento['id']})
        assert expediente['tipo'] == 'oficio'
        assert expediente['notas'] == []
    finally:
        await grafo.close()
        await cliente.close()


async def test_o14_bandeja_refleja_el_turno(api):
    oficialia, compras = await entrar(api, 'mflores'), await entrar(api, 'rperez')
    documento = await registrar(api, oficialia, 'Para la bandeja de Compras')
    assert documento['id'] in await bandeja(api, oficialia, OP)
    assert documento['id'] not in await bandeja(api, compras, CO)

    turno = {'destinos': [{'id_area': CO, 'rol': 'responsable', 'instruccion': 'Atender'}]}
    assert (await api.post(f'/api/documentos/{documento["id"]}/turnos', json=turno, headers=oficialia)).is_success

    fila = (await bandeja(api, compras, CO))[documento['id']]
    assert (fila['folio'], fila['rol']) == (documento['folio'], 'responsable')
    assert fila['ultimo_movimiento'] == {'tipo': 'turno', 'descripcion': 'Turnado por Oficialía de partes'}
    assert fila['titular_al_turnar'] == 'Ing. Raúl Pérez'
    assert documento['id'] not in await bandeja(api, oficialia, OP)
    # Compras no ve la bandeja de otra área (D-29).
    ajena = await api.get('/api/bandeja', params={'id_area': OP}, headers=compras)
    assert (ajena.status_code, ajena.json()['codigo']) == (403, 'SIN_PERMISO')
