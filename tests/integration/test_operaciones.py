"""T-05: sesión, registro con outbox, turnos, atracción y bandeja por la API, contra las tres bases.

Necesita las bases levantadas. Recarga la semilla al empezar y al terminar (O-41), porque la bitácora no se borra.
"""

import asyncio
import uuid

import psycopg
import pytest
from apoyo_api import (
    CO,
    CONTRASENA,
    FI,
    OP,
    OP_0139,
    SG,
    bandeja,
    entrar,
    id_por_folio,
    nuevo,
    registrar,
    vaciar_outbox,
)

from app.config import cargar_ajustes
from app.infra import mongo, neo4j

pytestmark = [pytest.mark.integracion, pytest.mark.asyncio(loop_scope='module')]


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


async def test_ri10_un_responsable_por_grupo(api, semilla):
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
    with pytest.raises(psycopg.errors.UniqueViolation), semilla.transaction():
        semilla.execute(
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

    await vaciar_outbox(app)
    ajustes = cargar_ajustes()
    cliente, grafo = mongo.crear_cliente(ajustes), neo4j.crear_driver(ajustes)
    try:
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


async def test_o22_devolver_y_returnar(api, semilla):
    oficialia, direccion, compras, finanzas = [await entrar(api, u) for u in ('mflores', 'alopez', 'rperez', 'ediaz')]
    documento = await registrar(api, oficialia, 'Para devolución y returno O-22')
    doc_id = documento['id']
    assert (
        await api.post(
            f'/api/documentos/{doc_id}/turnos',
            json={'destinos': [{'id_area': CO, 'rol': 'responsable'}]},
            headers=oficialia,
        )
    ).status_code == 201

    # Normal: devolver con motivo del catálogo regresa a Oficialía y sale de Compras.
    dev = await api.post(
        f'/api/documentos/{doc_id}/devoluciones',
        json={'motivo': 'falta_informacion', 'nota': 'Falta anexo técnico'},
        headers=compras,
    )
    assert dev.status_code == 201
    assert doc_id not in await bandeja(api, compras, CO)
    assert doc_id in await bandeja(api, oficialia, OP)

    # Error: sin motivo se rechaza; sugerir área con motivo distinto a no_competencia se rechaza.
    assert (
        await api.post(
            f'/api/documentos/{doc_id}/turnos',
            json={'destinos': [{'id_area': CO, 'rol': 'responsable'}]},
            headers=oficialia,
        )
    ).status_code == 201
    sin_motivo = await api.post(f'/api/documentos/{doc_id}/devoluciones', json={'motivo': ''}, headers=compras)
    assert (sin_motivo.status_code, sin_motivo.json()['title']) == (422, 'Elige el motivo del catálogo.')
    otro_motivo = await api.post(
        f'/api/documentos/{doc_id}/devoluciones',
        json={'motivo': 'falta_firma', 'id_area_sugerida': FI},
        headers=compras,
    )
    assert (otro_motivo.status_code, otro_motivo.json()['title']) == (
        422,
        'Solo se sugiere otra área cuando no es de su competencia.',
    )

    # Límite: no_competencia CON área sugerida returna directo a Finanzas.
    returno = await api.post(
        f'/api/documentos/{doc_id}/devoluciones',
        json={'motivo': 'no_competencia', 'id_area_sugerida': FI, 'nota': 'Corresponde a Finanzas'},
        headers=compras,
    )
    assert returno.status_code == 201
    assert doc_id not in await bandeja(api, compras, CO)
    assert doc_id in await bandeja(api, finanzas, FI)

    # no_competencia SIN área sugerida se acepta, vuelve a Oficialía y aparece en C3 como rebote.
    rebote = await api.post(
        f'/api/documentos/{doc_id}/devoluciones',
        json={'motivo': 'no_competencia'},
        headers=finanzas,
    )
    assert rebote.status_code == 201
    from app.main import app

    await vaciar_outbox(app)
    rebotes = (await api.get('/api/consultas/rebotes', params={'periodo': '2026-11'}, headers=direccion)).json()[
        'elementos'
    ]
    por_id = {r['id_documento']: r for r in rebotes}
    assert 'no_competencia_sin_area' in por_id[doc_id]['reglas']


async def test_o08_asignar_documento_a_asunto(api, semilla):
    oficialia, compras, sg_pe = await entrar(api, 'mflores'), await entrar(api, 'rperez'), await entrar(api, 'pmena')
    asunto_1 = '00000000-0000-4000-8000-000000000401'
    doc = await registrar(api, oficialia, 'Documento para asignar a múltiples asuntos')
    assert (
        await api.post(
            f'/api/documentos/{doc["id"]}/turnos',
            json={'destinos': [{'id_area': CO, 'rol': 'responsable'}]},
            headers=oficialia,
        )
    ).status_code == 201
    from app.main import app

    await vaciar_outbox(app)

    # Normal: asignar documento a asunto existente aparece en su hilo C2.
    r1 = await api.post(f'/api/asuntos/{asunto_1}/documentos', json={'id_documento': doc['id']}, headers=compras)
    assert r1.status_code == 204
    hilo_1 = (await api.get(f'/api/asuntos/{asunto_1}/hilo', headers=compras)).json()
    assert doc['id'] in {n['id_documento'] for n in hilo_1['nodos']}

    # Límite: el mismo documento puede pertenecer a dos asuntos distintos.
    asunto_2 = (
        await api.post(
            '/api/asuntos',
            json={'nombre': 'Segundo asunto O-08', 'descripcion': 'Prueba D-30'},
            headers=compras,
        )
    ).json()['id']
    r2 = await api.post(f'/api/asuntos/{asunto_2}/documentos', json={'id_documento': doc['id']}, headers=compras)
    assert r2.status_code == 204
    hilo_2 = (await api.get(f'/api/asuntos/{asunto_2}/hilo', headers=compras)).json()
    assert doc['id'] in {n['id_documento'] for n in hilo_2['nodos']}

    # Error: asignación repetida, asunto inexistente y documento sin visibilidad.
    repetida = await api.post(f'/api/asuntos/{asunto_1}/documentos', json={'id_documento': doc['id']}, headers=compras)
    assert (repetida.status_code, repetida.json()['codigo']) == (409, 'CONFLICTO')
    no_existe = await api.post(
        f'/api/asuntos/{uuid.uuid4()}/documentos', json={'id_documento': doc['id']}, headers=compras
    )
    assert no_existe.status_code == 404
    d0109 = id_por_folio(semilla, 'OP-2026-0109')
    sin_vis = await api.post(f'/api/asuntos/{asunto_1}/documentos', json={'id_documento': d0109}, headers=sg_pe)
    assert sin_vis.status_code == 403


async def test_o09_actualizar_expediente(api):
    oficialia = await entrar(api, 'mflores')
    aud = (
        await api.post(
            '/api/documentos',
            json=nuevo(
                'Auditoría para O-09',
                tipo='requerimiento_auditoria',
                datos_tipo={'ente_auditor': 'ASF', 'puntos': ['Punto 1']},
            ),
            headers=oficialia,
        )
    ).json()
    from app.main import app

    await vaciar_outbox(app)

    # Normal: actualizar campos propios del tipo se refleja en GET .../expediente.
    act = await api.patch(
        f'/api/documentos/{aud["id"]}/expediente',
        json={'datos_tipo': {'ente_auditor': 'OIC Actualizado', 'puntos': ['Punto A', 'Punto B']}},
        headers=oficialia,
    )
    assert act.status_code == 200
    exp = (await api.get(f'/api/documentos/{aud["id"]}/expediente', headers=oficialia)).json()
    assert exp['datos_tipo'] == {'ente_auditor': 'OIC Actualizado', 'puntos': ['Punto A', 'Punto B']}

    # Error: quitar campo obligatorio del tipo se rechaza; enviar 'tipo' distinto no modifica el tipo en MongoDB (D-26).
    sin_req = await api.patch(f'/api/documentos/{aud["id"]}/expediente', json={'datos_tipo': {}}, headers=oficialia)
    assert (sin_req.status_code, sin_req.json()['codigo']) == (422, 'VALIDACION')
    cambio_tipo = await api.patch(
        f'/api/documentos/{aud["id"]}/expediente',
        json={'tipo': 'oficio', 'datos_tipo': {'ente_auditor': 'OIC Intacto'}},
        headers=oficialia,
    )
    assert cambio_tipo.status_code == 200
    ficha = (await api.get(f'/api/documentos/{aud["id"]}', headers=oficialia)).json()
    assert ficha['registro']['tipo'] == 'requerimiento_auditoria'

    # Límite: documento cancelado es de solo lectura.
    assert (
        await api.post(f'/api/documentos/{aud["id"]}/cancelacion', json={'motivo': 'Prueba O-09'}, headers=oficialia)
    ).status_code == 204
    sobre_cancelado = await api.patch(
        f'/api/documentos/{aud["id"]}/expediente',
        json={'datos_tipo': {'ente_auditor': 'No debe'}},
        headers=oficialia,
    )
    assert (sobre_cancelado.status_code, sobre_cancelado.json()['codigo']) == (409, 'ESTADO_INVALIDO')


async def test_o39_error_destino_inalcanzable_detiene_mismo_doc(api, semilla, monkeypatch):
    from app.main import app
    from outbox import procesador

    await vaciar_outbox(app)
    oficialia = await entrar(api, 'mflores')
    doc1 = await registrar(api, oficialia, 'Doc 1 con fallo en Neo4j')
    assert (
        await api.post(
            f'/api/documentos/{doc1["id"]}/turnos',
            json={'destinos': [{'id_area': CO, 'rol': 'responsable'}]},
            headers=oficialia,
        )
    ).status_code == 201
    doc2 = await registrar(api, oficialia, 'Doc 2 debe entregarse')

    real_entregar = procesador.entregar

    async def entregar_con_fallo(evento, db, grafo):
        if evento['destino'] == 'neo4j' and evento['datos'].get('id_documento') == doc1['id']:
            raise ConnectionError('Neo4j simulado inalcanzable para doc1')
        await real_entregar(evento, db, grafo)

    monkeypatch.setattr(procesador, 'entregar', entregar_con_fallo)
    ajustes = cargar_ajustes()
    cliente, grafo = mongo.crear_cliente(ajustes), neo4j.crear_driver(ajustes)
    try:
        # max_intentos=1: doc1 queda en 'error' (deteniendo su movimiento) y doc2 avanza hasta enviarse.
        await procesador.procesar_todo(app.state.pool, cliente[ajustes.mongo_db], grafo, max_intentos=1)
    finally:
        await grafo.close()
        await cliente.close()

    filas = semilla.execute(
        """SELECT tipo_evento, destino, estado, intentos, ultimo_error
           FROM outbox WHERE datos->>'id_documento' = %s ORDER BY id""",
        (doc1['id'],),
    ).fetchall()
    neo_doc1 = [f for f in filas if f[1] == 'neo4j']
    assert neo_doc1[0][0] == 'documento' and neo_doc1[0][2] == 'error' and neo_doc1[0][3] == 1
    assert 'ConnectionError' in neo_doc1[0][4]
    # El movimiento posterior del mismo documento en neo4j queda detenido en 'pendiente'.
    assert neo_doc1[1][0] == 'movimiento' and neo_doc1[1][2] == 'pendiente'

    # Mientras tanto, los eventos de doc2 sí se entregan correctamente.
    estados_doc2 = semilla.execute(
        "SELECT estado FROM outbox WHERE datos->>'id_documento' = %s", (doc2['id'],)
    ).fetchall()
    assert all(e[0] == 'enviado' for e in estados_doc2)
