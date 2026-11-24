"""T-06: ficha integrada, expediente, conclusión, corrección, duplicados y confidencialidad, por la API."""

import pytest
from apoyo_api import CO, FI, JU, OP, OP_0139, bandeja, entrar, id_por_folio, registrar, vaciar_outbox
from neo4j.exceptions import ServiceUnavailable

from app.config import cargar_ajustes
from app.infra import mongo, neo4j
from app.repositorios.grafo import consultas

pytestmark = [pytest.mark.integracion, pytest.mark.asyncio(loop_scope='module')]

EVIDENCIA_0087 = '00000000-0000-4000-8000-000000000742'
NOTA_0139 = '00000000-0000-4000-8000-000000000311'
ANEXO_0139 = '00000000-0000-4000-8000-000000000301'
SALIDA_VI = '00000000-0000-4000-8000-000000000507'


async def test_o11_ficha_integrada_y_degradada(api, monkeypatch):
    oficialia = await entrar(api, 'mflores')

    ficha = (await api.get(f'/api/documentos/{OP_0139}', headers=oficialia)).json()
    assert (ficha['acceso'], ficha['contenido_oculto'], ficha['secciones_no_disponibles']) == ('completo', False, [])
    assert ficha['registro']['folio'] == 'OP-2026-0139'
    assert ficha['ubicacion_actual'][0]['area'] == 'Oficialía de partes'
    assert ficha['expediente']['datos_tipo']['concepto'].startswith('Equipo de cómputo')  # MongoDB
    assert ficha['expediente']['notas'][0]['autor'] == 'Ing. Raúl Pérez'
    assert [m['tipo'] for m in ficha['recorrido']] == ['registro', 'turno', 'turno', 'devolucion']  # Neo4j
    # Las que salen y las que llegan (la salida CO-2026-0048 responde a este documento).
    assert {(r['referencia'], r['sentido']) for r in ficha['relaciones']} == {
        ('OP-2026-0087', 'sale'),
        ('SIS/0198/2026', 'sale'),
        ('CO-2026-0048', 'entra'),
    }
    assert [a['nombre'] for a in ficha['asuntos']] == ['Equipamiento de laboratorios 2026']

    # Neo4j no responde: la ficha devuelve lo demás y marca las secciones (D-53).
    async def caido(*_):
        raise ServiceUnavailable('Neo4j simulado como caído')

    monkeypatch.setattr(consultas, 'ficha', caido)
    respuesta = await api.get(f'/api/documentos/{OP_0139}', headers=oficialia)
    assert respuesta.status_code == 200
    degradada = respuesta.json()
    assert degradada['secciones_no_disponibles'] == ['recorrido', 'relaciones']
    assert (degradada['recorrido'], degradada['relaciones'], degradada['asuntos']) == (None, None, None)
    assert degradada['registro'] == ficha['registro']
    assert degradada['expediente'] == ficha['expediente']


async def test_o05_formas_y_requisitos(api, semilla):
    compras, oficialia = await entrar(api, 'rperez'), await entrar(api, 'mflores')
    d0121, d0123, d0133, d0126, d0152 = (
        id_por_folio(semilla, f)
        for f in ('OP-2026-0121', 'OP-2026-0123', 'OP-2026-0133', 'OP-2026-0126', 'OP-2026-0152')
    )

    async def concluir(id_documento, sesion=compras, **conclusion):
        return await api.post(f'/api/documentos/{id_documento}/conclusion', json=conclusion, headers=sesion)

    # Requisitos de cada forma (D-59).
    for conclusion, mensaje in (
        ({'forma': 'con_respuesta'}, 'Elige el documento de respuesta.'),
        ({'forma': 'con_respuesta', 'id_respuesta': d0121}, 'Elige otro documento registrado.'),
        ({'forma': 'duplicado', 'nota': 'Repetido'}, 'Elige el documento original.'),
        ({'forma': 'atencion_sin_oficio'}, 'Escribe la evidencia de la atención.'),
        ({'forma': 'no_procede'}, 'Escribe el motivo.'),
        ({'forma': 'cerrado'}, 'Elige la forma de conclusión del catálogo.'),
    ):
        respuesta = await concluir(d0121, **conclusion)
        assert (respuesta.status_code, respuesta.json()['title']) == (422, mensaje)
    # Oficialía no concluye (D-58).
    assert (await concluir(d0121, oficialia, forma='enterado')).status_code == 403

    # Las cinco formas.
    respuesta = await concluir(d0121, forma='con_respuesta', id_respuesta=SALIDA_VI)
    assert (respuesta.status_code, respuesta.json()['instruccion']) == (201, 'VI-2026-0001')
    evidencia = await concluir(d0123, forma='atencion_sin_oficio', nota='Se atendió por teléfono.')
    assert evidencia.status_code == 201
    assert (await concluir(d0126, forma='enterado')).status_code == 201
    assert (await concluir(d0152, forma='no_procede', nota='Fuera del presupuesto 2027.')).status_code == 201
    assert (await concluir(d0133, forma='duplicado', id_original=d0121, nota='Mismo asunto.')).status_code == 201
    # Concluido: sale de la bandeja y no se vuelve a concluir (RI-14).
    pendientes = await bandeja(api, compras, CO)
    assert not {d0121, d0123, d0133, d0126, d0152} & pendientes.keys()
    otra = await concluir(d0126, forma='enterado')
    assert (otra.status_code, otra.json()['codigo']) == (409, 'ESTADO_INVALIDO')

    # Réplicas: RESPONDE_A desde la salida, la evidencia ligada a la conclusión (D-19) y el estado.
    from app.main import app

    await vaciar_outbox(app)
    assert (
        str(semilla.execute('SELECT id_responde_a FROM documento WHERE id_documento = %s', (SALIDA_VI,)).fetchone()[0])
        == d0121
    )
    ajustes = cargar_ajustes()
    cliente, grafo = mongo.crear_cliente(ajustes), neo4j.crear_driver(ajustes)
    try:
        registros, _, _ = await grafo.execute_query(
            """MATCH (:Documento {id: $salida})-[:RESPONDE_A]->(d:Documento {id: $doc}) RETURN d.estado AS estado""",
            salida=SALIDA_VI,
            doc=d0121,
        )
        assert [r['estado'] for r in registros] == ['concluido']
        expediente = await cliente[ajustes.mongo_db].expedientes.find_one({'_id': d0123})
        assert [(n['tipo'], n['id_movimiento']) for n in expediente['notas']] == [
            ('evidencia_atencion', evidencia.json()['id'])
        ]
    finally:
        await grafo.close()
        await cliente.close()


async def test_o25_correccion_cambia_el_pendiente(api):
    oficialia, direccion = await entrar(api, 'mflores'), await entrar(api, 'alopez')
    documento = await registrar(api, oficialia, 'Para corregir el rol')
    turno = await api.post(
        f'/api/documentos/{documento["id"]}/turnos',
        json={'destinos': [{'id_area': CO, 'rol': 'responsable'}, {'id_area': FI, 'rol': 'apoyo'}]},
        headers=oficialia,
    )
    a_compras, a_finanzas = (m['id'] for m in turno.json()['movimientos'])
    assert (await bandeja(api, direccion, FI))[documento['id']]['rol'] == 'apoyo'

    async def corregir(id_movimiento, rol):
        return await api.post(
            f'/api/movimientos/{id_movimiento}/correcciones',
            json={'rol': rol, 'motivo': 'Error al turnar'},
            headers=oficialia,
        )

    for id_movimiento, rol, mensaje in (
        (a_compras, 'apoyo', 'Falta un responsable en el grupo.'),
        (a_finanzas, 'responsable', 'Solo puede haber un responsable en el grupo.'),
        (a_finanzas, 'apoyo', 'El valor corregido es igual al actual.'),
    ):
        respuesta = await corregir(id_movimiento, rol)
        assert (respuesta.status_code, respuesta.json()['title']) == (422, mensaje)

    correccion = await corregir(a_finanzas, 'conocimiento')

    assert correccion.status_code == 201
    assert (correccion.json()['tipo'], correccion.json()['id_corrige']) == ('correccion', a_finanzas)
    # Conocimiento no queda pendiente: Finanzas lo pierde y Compras lo conserva (D-42 con el rol corregido).
    assert documento['id'] not in await bandeja(api, direccion, FI)
    assert documento['id'] in await bandeja(api, direccion, CO)


async def test_o26_mismo_documento_cancela_el_posterior(api, semilla):
    oficialia = await entrar(api, 'mflores')
    posterior, original = id_por_folio(semilla, 'OP-2026-0141'), id_por_folio(semilla, 'OP-2026-0140')
    lista = (await api.get('/api/consultas/posibles-duplicados', headers=oficialia)).json()['elementos']
    assert {'id': posterior, 'folio': 'OP-2026-0141', 'falta': 'numero'}.items() <= {
        k: v for e in lista if e['id'] == posterior for k, v in e.items()
    }.items()

    comparacion = (
        await api.get(f'/api/consultas/posibles-duplicados/{posterior}/comparacion', headers=oficialia)
    ).json()
    assert comparacion['candidato']['folio'] == 'OP-2026-0140'
    assert {'emisor', 'fecha_documento'} <= set(comparacion['coincidencias'])

    respuesta = await api.post(
        f'/api/documentos/{posterior}/resolucion-duplicado',
        json={'id_otro': original, 'decision': 'mismo'},
        headers=oficialia,
    )

    assert respuesta.status_code == 204
    estado, duplicado_de, motivo, marcado = semilla.execute(
        'SELECT estado, duplicado_de, motivo_cancelacion, posible_duplicado FROM documento WHERE id_documento = %s',
        (posterior,),
    ).fetchone()
    assert (estado, str(duplicado_de), motivo, marcado) == ('cancelado', original, 'Duplicado de OP-2026-0140', False)
    # Sus movimientos se conservan (D-20), sale de la lista y de la bandeja, y ya no espera revisión.
    movimientos = semilla.execute('SELECT count(*) FROM movimiento WHERE id_documento = %s', (posterior,)).fetchone()
    assert movimientos == (1,)
    lista = (await api.get('/api/consultas/posibles-duplicados', headers=oficialia)).json()['elementos']
    assert posterior not in {e['id'] for e in lista}
    assert posterior not in await bandeja(api, oficialia, OP)
    otra = await api.post(
        f'/api/documentos/{posterior}/resolucion-duplicado', json={'decision': 'distintos'}, headers=oficialia
    )
    assert (otra.status_code, otra.json()['title']) == (409, 'El documento ya no espera revisión.')


async def test_o17_no_borra_evidencia(api, semilla):
    oficialia, personal = await entrar(api, 'mflores'), await entrar(api, 'jruiz')
    d0087 = id_por_folio(semilla, 'OP-2026-0087')

    evidencia = await api.delete(f'/api/documentos/{d0087}/expediente/notas/{EVIDENCIA_0087}', headers=oficialia)
    assert (evidencia.status_code, evidencia.json()['title']) == (
        409,
        'La evidencia de atención de una conclusión no se elimina.',
    )
    # Solo su autor u oficialía: el anexo de OP-2026-0139 lo capturó oficialía, no Jorge.
    ajeno = await api.delete(f'/api/documentos/{OP_0139}/expediente/anexos/{ANEXO_0139}', headers=personal)
    assert ajeno.status_code == 403
    general = await api.delete(f'/api/documentos/{OP_0139}/expediente/notas/{NOTA_0139}', headers=oficialia)
    assert general.status_code == 204

    expediente = (await api.get(f'/api/documentos/{d0087}/expediente', headers=oficialia)).json()
    assert [n['id'] for n in expediente['notas']] == [EVIDENCIA_0087]
    expediente = (await api.get(f'/api/documentos/{OP_0139}/expediente', headers=oficialia)).json()
    assert expediente['notas'] == []
    assert ANEXO_0139 in {a['id'] for a in expediente['anexos']}


async def test_d29_confidencial_oculto(api, semilla):
    oficialia, registro, personal, direccion, compras = [
        await entrar(api, u) for u in ('mflores', 'cruiz', 'jruiz', 'alopez', 'rperez')
    ]
    d0109, d0124 = id_por_folio(semilla, 'OP-2026-0109'), id_por_folio(semilla, 'OP-2026-0124')

    # Oficialía ve todo el recorrido, pero no el contenido de un confidencial en el que no tiene movimiento.
    ficha = (await api.get(f'/api/documentos/{d0109}', headers=oficialia)).json()
    assert (ficha['acceso'], ficha['contenido_oculto']) == ('completo', True)
    # El asunto es la síntesis (D-43): se ocultan los dos.
    assert (ficha['registro']['sintesis'], ficha['registro']['asunto']) == (None, None)
    assert ficha['registro']['folio'] == 'OP-2026-0109'
    assert (ficha['expediente'], ficha['relaciones'], ficha['asuntos']) == (None, None, None)
    assert ficha['recorrido'] is not None
    nota = await api.post(f'/api/documentos/{d0109}/expediente/notas', json={'texto': 'Hola'}, headers=oficialia)
    assert (nota.status_code, nota.json()['title']) == (
        403,
        'No tienes visibilidad sobre el contenido de este documento.',
    )
    # Quien lo registró y turnó sí lo ve.
    ficha = (await api.get(f'/api/documentos/{d0109}', headers=registro)).json()
    assert ficha['registro']['sintesis'].startswith('Denuncia anónima')
    # Personal de un área sin movimientos en él: solo estado y responsable.
    ficha = (await api.get(f'/api/documentos/{d0109}', headers=personal)).json()
    assert (ficha['acceso'], ficha['registro']['asunto']) == ('restringido', None)

    # Bandeja: en la de su propia área se ve; dirección viendo otra área ve null.
    assert (await bandeja(api, compras, CO))[d0124]['asunto'] == 'Inconformidad de proveedor en licitación'
    assert (await bandeja(api, personal, CO))[d0124]['asunto'] == 'Inconformidad de proveedor en licitación'
    assert (await bandeja(api, direccion, CO))[d0124]['asunto'] is None
    assert (await bandeja(api, direccion, JU))[d0109]['asunto'] is None
