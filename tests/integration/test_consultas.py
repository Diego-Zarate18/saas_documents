"""T-07: referencias, hilo de un asunto, rebotes, búsqueda, áreas sin ciclos y acuses, por la API."""

import pytest
from apoyo_api import CO, JU, OP, OP_0139, entrar, id_por_folio, nuevo, vaciar_outbox

pytestmark = [pytest.mark.integracion, pytest.mark.asyncio(loop_scope='module')]

DG = '00000000-0000-4000-8000-000000000102'
RH = '00000000-0000-4000-8000-000000000108'
UT = '00000000-0000-4000-8000-000000000110'
LABORATORIOS = '00000000-0000-4000-8000-000000000401'


def estado(semilla, id_documento: str) -> tuple:
    return semilla.execute(
        'SELECT estado, estado_previo FROM documento WHERE id_documento = %s', (id_documento,)
    ).fetchone()


async def test_o07_no_registrado_y_sustitucion_reversible(api, semilla):
    oficialia = await entrar(api, 'mflores')
    d0137 = id_por_folio(semilla, 'OP-2026-0137')

    async def relacionar(origen, tipo, destino):
        return await api.post(
            f'/api/documentos/{origen}/referencias', json={'tipo': tipo, 'destino': destino}, headers=oficialia
        )

    # No registrado: se identifica por número y emisor, sin espacios de más (D-33), y el mismo par se reutiliza.
    assert (await relacionar(OP_0139, 'en_alcance_a', {'numero': 'MEMO-7', 'emisor': '  Sistemas '})).status_code == 204
    repetida = await relacionar(OP_0139, 'en_alcance_a', {'numero': 'MEMO-7', 'emisor': 'Sistemas'})
    assert (repetida.status_code, repetida.json()['title']) == (409, 'Esa relación ya existe.')
    assert (await relacionar(d0137, 'en_alcance_a', {'numero': 'MEMO-7', 'emisor': 'Sistemas'})).status_code == 204
    from app.main import app

    nodos, _, _ = await app.state.grafo.execute_query(
        "MATCH (x:DocumentoNoRegistrado {numero: 'MEMO-7'}) RETURN count(x) AS n"
    )
    assert nodos[0]['n'] == 1
    for destino, mensaje in (
        ({'numero': 'MEMO-7', 'emisor': 'Sistemas'}, '«Sustituye a» solo se usa entre documentos registrados.'),
        ({'id_documento': OP_0139}, 'Un documento no se relaciona consigo mismo.'),
    ):
        respuesta = await relacionar(OP_0139, 'sustituye_a', destino)
        assert (respuesta.status_code, respuesta.json()['title']) == (422, mensaje)

    # SUSTITUYE_A deja al otro sin efecto con su estado anterior y quitarla lo devuelve (D-14).
    assert (await relacionar(OP_0139, 'sustituye_a', {'id_documento': d0137})).status_code == 204
    assert estado(semilla, d0137) == ('sin_efecto', 'en_tramite')
    ficha = (await api.get(f'/api/documentos/{d0137}', headers=oficialia)).json()
    assert ('sustituye_a', 'OP-2026-0139', 'entra') in {
        (r['tipo'], r['referencia'], r['sentido']) for r in ficha['relaciones']
    }

    quitar = await api.delete(
        f'/api/documentos/{OP_0139}/referencias/sustituye_a', params={'referencia': 'OP-2026-0137'}, headers=oficialia
    )
    assert quitar.status_code == 204
    assert estado(semilla, d0137) == ('en_tramite', None)
    ruta = f'/api/documentos/{OP_0139}/referencias/en_alcance_a'
    no_registrada = {'referencia': 'MEMO-7', 'emisor': 'Sistemas'}
    assert (await api.delete(ruta, params=no_registrada, headers=oficialia)).status_code == 204
    otra_vez = await api.delete(ruta, params=no_registrada, headers=oficialia)
    assert (otra_vez.status_code, otra_vez.json()['title']) == (404, 'La relación no existe.')


async def test_c2_hilo_de_un_asunto(api, semilla):
    oficialia, servicios, compras = (
        await entrar(api, 'mflores'),
        await entrar(api, 'pmena'),
        await entrar(api, 'rperez'),
    )

    hilo = (await api.get(f'/api/asuntos/{LABORATORIOS}/hilo', headers=oficialia)).json()

    assert hilo['asunto']['nombre'] == 'Equipamiento de laboratorios 2026'
    nodos = {n['referencia']: n for n in hilo['nodos']}
    assert [n['referencia'] for n in hilo['nodos'][:2]] == ['OP-2026-0087', 'OP-2026-0139']
    assert all(nodos[f]['pertenece'] and nodos[f]['profundidad'] == 0 for f in ('OP-2026-0087', 'OP-2026-0139'))
    # La salida que responde llega al documento: entra, a un salto, y no abre ficha.
    salida = nodos['CO-2026-0048']
    assert (salida['relacion'], salida['profundidad'], salida['id_documento']) == (
        {'tipo': 'responde_a', 'sentido': 'entra'},
        1,
        None,
    )
    # El no registrado: número como referencia y emisor como descripción (D-33).
    no_registrado = nodos['SIS/0198/2026']
    assert (no_registrado['registrado'], no_registrado['descripcion']) == (False, 'Sistemas')
    assert no_registrado['relacion'] == {'tipo': 'en_alcance_a', 'sentido': 'sale'}

    # Sin visibilidad (Servicios Generales no participó): estado sí, descripción no (D-29).
    ajenos = {
        n['referencia']: n
        for n in (await api.get(f'/api/asuntos/{LABORATORIOS}/hilo', headers=servicios)).json()['nodos']
    }
    assert (ajenos['OP-2026-0139']['descripcion'], ajenos['OP-2026-0139']['estado']) == (None, 'en_tramite')
    assert ajenos['CO-2026-0048']['descripcion'] is None
    assert (
        await api.get('/api/asuntos/00000000-0000-4000-8000-000000000499/hilo', headers=oficialia)
    ).status_code == 404

    # Un asunto nuevo con documento (O-27 y O-08) aparece en la lista y en su hilo.
    d0152 = id_por_folio(semilla, 'OP-2026-0152')
    creado = await api.post(
        '/api/asuntos',
        json={'nombre': 'Papelería 2027', 'descripcion': 'Compras de papelería.', 'id_documento': d0152},
        headers=compras,
    )
    assert creado.status_code == 201
    assert (creado.json()['documentos'], creado.json()['areas']) == (1, ['Compras'])
    lista = (await api.get('/api/asuntos', params={'texto': 'papelería'}, headers=compras)).json()
    assert [a['nombre'] for a in lista['elementos']] == ['Papelería 2027']
    hilo_nuevo = (await api.get(f'/api/asuntos/{creado.json()["id"]}/hilo', headers=compras)).json()
    assert [n['referencia'] for n in hilo_nuevo['nodos'] if n['pertenece']] == ['OP-2026-0152']


async def test_c3_rebotes(api, semilla):
    direccion, personal = await entrar(api, 'alopez'), await entrar(api, 'jruiz')

    rebotes = (await api.get('/api/consultas/rebotes', params={'periodo': '2026-11'}, headers=direccion)).json()

    por_folio = {r['folio']: r for r in rebotes['elementos']}
    assert por_folio['OP-2026-0131']['reglas'] == ['tres_devoluciones']
    assert por_folio['OP-2026-0118']['reglas'] == ['no_competencia_sin_area']
    assert por_folio['OP-2026-0097']['reglas'] == ['tres_areas']
    assert por_folio['OP-2026-0097']['areas'] == 4
    # OP-2026-0129 es confidencial y dirección no tiene movimientos en él: sin asunto (D-29).
    assert por_folio['OP-2026-0129']['reglas'] == ['no_competencia_sin_area']
    assert por_folio['OP-2026-0129']['asunto'] is None
    assert [r['folio'] for r in rebotes['elementos']] == sorted(por_folio, reverse=True)

    # Con área: solo los documentos con un movimiento del periodo desde o hacia ella.
    de_rh = await api.get('/api/consultas/rebotes', params={'periodo': '2026-11', 'id_area': RH}, headers=direccion)
    assert [r['folio'] for r in de_rh.json()['elementos']] == ['OP-2026-0131']
    mal = await api.get('/api/consultas/rebotes', params={'periodo': '2026-13'}, headers=direccion)
    assert (mal.status_code, mal.json()['title']) == (422, 'El periodo es un mes AAAA-MM.')
    assert (await api.get('/api/consultas/rebotes', headers=personal)).status_code == 403


async def test_o30_busqueda_por_campo_del_tipo_con_visibilidad(api, semilla):
    oficialia, registro, personal = await entrar(api, 'mflores'), await entrar(api, 'cruiz'), await entrar(api, 'jruiz')
    # Un requerimiento confidencial que registra Carmen: Marta no tiene movimientos en él.
    confidencial = await api.post(
        '/api/documentos',
        json=nuevo(
            'Auditoría reservada de nómina',
            tipo='requerimiento_auditoria',
            confidencial=True,
            emisor='Órgano Interno de Control',
            datos_tipo={'ente_auditor': 'Órgano Interno de Control'},
        ),
        headers=registro,
    )
    assert confidencial.status_code == 201
    from app.main import app

    await vaciar_outbox(app)  # el expediente llega a MongoDB por el outbox

    async def buscar(sesion, **filtros):
        respuesta = await api.get('/api/documentos', params=filtros, headers=sesion)
        assert respuesta.status_code == 200, respuesta.text
        return {r['folio']: r for r in respuesta.json()['elementos']}

    por_ente = {'campo_tipo': 'ente_auditor', 'valor_campo': 'interno de control'}
    vistos = await buscar(oficialia, **por_ente)
    assert {'OP-2026-0143', 'OP-2026-0133', 'OP-2026-0108'} <= vistos.keys()
    assert confidencial.json()['folio'] not in vistos  # D-46: la visibilidad se filtra en PostgreSQL
    assert confidencial.json()['folio'] in await buscar(registro, **por_ente)
    # Personal de Compras: solo lo de su área; lo demás ni coincide.
    assert set(await buscar(personal, **por_ente)) == {'OP-2026-0133'}

    # Sin filtro de contenido el documento de otra área sí aparece, pero restringido.
    restringido = (await buscar(personal, folio='OP-2026-0143'))['OP-2026-0143']
    assert (restringido['visibilidad'], restringido['numero_emisor'], restringido['sintesis']) == (
        'restringida',
        None,
        None,
    )
    assert 'OP-2026-0109' not in await buscar(oficialia, texto='adjudicación')
    assert 'OP-2026-0109' in await buscar(registro, texto='adjudicación')
    mal = await api.get('/api/documentos', params={'campo_tipo': 'concepto', 'valor_campo': 'x'}, headers=oficialia)
    assert (mal.status_code, mal.json()['title']) == (422, 'Solo se busca por ente auditor o solicitante (D-46).')


async def test_o33_area_sin_ciclos(api):
    administrador, oficialia = await entrar(api, 'lgomez'), await entrar(api, 'mflores')
    ana, raul = '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000203'

    async def guardar(id_area, siglas, nombre, id_padre, id_titular=None):
        ruta = f'/api/areas/{id_area}' if id_area else '/api/areas'
        datos = {'siglas': siglas, 'nombre': nombre, 'id_padre': id_padre, 'id_titular': id_titular}
        return await (api.patch if id_area else api.post)(ruta, json=datos, headers=administrador)

    ciclo = 'No puede depender de un área que depende de ella.'
    for respuesta in (
        await guardar(DG, 'DG', 'Dirección General', CO, ana),  # la raíz bajo una de sus hijas
        await guardar(JU, 'JU', 'Jurídico', UT),  # Transparencia depende de Jurídico
    ):
        assert (respuesta.status_code, respuesta.json()['title']) == (422, ciclo)

    nueva = await guardar(None, 'pr', 'Proyectos', CO)
    assert (nueva.status_code, nueva.json()['siglas']) == (201, 'PR')
    nieta = await guardar(CO, 'CO', 'Compras', nueva.json()['id'], raul)  # Compras bajo su propia hija
    assert (nieta.status_code, nieta.json()['title']) == (422, ciclo)

    siglas = await guardar(OP, 'OF', 'Oficialía de partes', DG)
    assert (siglas.status_code, siglas.json()['title']) == (
        409,
        'Las siglas no cambian: el área ya tiene folios emitidos (D-61).',
    )
    con_pendientes = await api.post(f'/api/areas/{CO}/desactivacion', headers=administrador)
    assert (con_pendientes.status_code, con_pendientes.json()['codigo']) == (409, 'CONFLICTO')
    hija = await guardar(None, 'PRH', 'Proyectos de hardware', nueva.json()['id'])
    con_hija = await api.post(f'/api/areas/{nueva.json()["id"]}/desactivacion', headers=administrador)
    assert (con_hija.status_code, con_hija.json()['title']) == (
        409,
        'No se puede desactivar: tiene áreas activas que dependen de ella.',
    )
    assert (await api.post(f'/api/areas/{hija.json()["id"]}/desactivacion', headers=administrador)).status_code == 204
    assert (await api.post(f'/api/areas/{nueva.json()["id"]}/desactivacion', headers=administrador)).status_code == 204
    assert (await api.post('/api/areas', json={'siglas': 'XX', 'nombre': 'X'}, headers=oficialia)).status_code == 403


async def test_o21_acuse_aparece_al_area_responsable(api, semilla):
    oficialia, compras, personal, finanzas = [await entrar(api, u) for u in ('mflores', 'rperez', 'jruiz', 'ediaz')]
    d0121 = id_por_folio(semilla, 'OP-2026-0121')

    salida = await api.post(
        '/api/salidas',
        json={
            'tipo': 'oficio',
            'numero': 'CO/0050/2026',
            'id_area_emisora': CO,
            'destinatario': 'Proveedor externo',
            'sintesis': 'Respuesta a la requisición de mobiliario',
            'id_responde_a': d0121,
        },
        headers=oficialia,
    )
    assert (salida.status_code, salida.json()['folio']) == (201, 'CO-2026-0050')  # misma secuencia que el área (D-21)
    acuses = (await api.get('/api/consultas/acuses', headers=compras)).json()['elementos']
    assert d0121 not in {a['id_documento'] for a in acuses}

    ruta = f'/api/salidas/{salida.json()["id"]}/acuses'
    acuse = {'fecha_hora': '2026-11-24T13:00:00-06:00', 'recibio': 'Recepción del proveedor'}
    assert (await api.post(ruta, json=acuse, headers=oficialia)).status_code == 204
    otra = await api.post(ruta, json=acuse, headers=oficialia)
    assert (otra.status_code, otra.json()['title']) == (409, 'La salida ya tiene acuse.')
    entrada = await api.post(f'/api/salidas/{d0121}/acuses', json=acuse, headers=oficialia)
    assert (entrada.status_code, entrada.json()['title']) == (
        404,
        'Solo se registra el acuse de un documento de salida.',
    )

    # D-58: el área responsable del documento ve el acuse (titular y personal); otra área no.
    esperado = {
        'id_salida': salida.json()['id'],
        'folio_salida': 'CO-2026-0050',
        'id_documento': d0121,
        'folio_documento': 'OP-2026-0121',
        'acusado_por': 'Recepción del proveedor',
    }
    assert esperado in (await api.get('/api/consultas/acuses', headers=compras)).json()['elementos']
    assert esperado in (await api.get('/api/consultas/acuses', headers=personal)).json()['elementos']
    assert esperado not in (await api.get('/api/consultas/acuses', headers=finanzas)).json()['elementos']
    con_acuse = (await api.get('/api/salidas', params={'acuse': 'con'}, headers=oficialia)).json()['elementos']
    assert 'CO-2026-0050' in {s['folio'] for s in con_acuse}
