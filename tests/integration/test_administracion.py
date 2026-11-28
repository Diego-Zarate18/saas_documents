"""Pruebas de prioridad baja: catálogos (O-31), estructura organizacional (O-32) y administración (O-34, O-35)."""

import uuid

import pytest
from apoyo_api import CO, CONTRASENA, OP, entrar, nuevo, vaciar_outbox

pytestmark = [pytest.mark.integracion, pytest.mark.asyncio(loop_scope='module')]


async def test_o31_catalogos_activos_e_inactivos(api, semilla):
    oficialia, personal = await entrar(api, 'mflores'), await entrar(api, 'jruiz')

    # Normal: devuelve elementos activos del catálogo y listas cerradas.
    antes = (await api.get('/api/catalogos', headers=personal)).json()
    assert 'oficio' in antes['tipos_documento']
    assert 'falta_informacion' in antes['motivos_devolucion']
    assert 'con_respuesta' in antes['formas_conclusion']

    # Límite: desactivar un actor con documentos lo oculta de /api/catalogos pero sigue visible en documentos antiguos.
    actor = (
        await api.post(
            '/api/actores-externos',
            json={'nombre': 'Proveedor Histórico O-31', 'tipo': 'proveedor'},
            headers=oficialia,
        )
    ).json()
    doc = (
        await api.post(
            '/api/documentos',
            json=nuevo('Doc con actor histórico', emisor='Proveedor Histórico O-31'),
            headers=oficialia,
        )
    ).json()
    assert (await api.post(f'/api/actores-externos/{actor["id"]}/desactivacion', headers=oficialia)).status_code == 204
    despues = (await api.get('/api/catalogos', headers=personal)).json()
    assert actor['id'] not in {a['id'] for a in despues['actores_externos']}
    ficha = (await api.get(f'/api/documentos/{doc["id"]}', headers=oficialia)).json()
    assert ficha['registro']['emisor'] == 'Proveedor Histórico O-31'

    # Error: sin sesión (la ruta no recibe parámetro de nombre de catálogo; devuelve todos en un solo objeto).
    assert (await api.get('/api/catalogos')).status_code == 401


async def test_o32_estructura_organizacional(api):
    admin, personal = await entrar(api, 'lgomez'), await entrar(api, 'jruiz')

    # Normal: árbol de áreas con titular y personas adscritas.
    org = (await api.get('/api/organizacion', headers=personal)).json()
    por_siglas = {a['siglas']: a for a in org['elementos']}
    assert por_siglas['CO']['nombre_titular'] == 'Ing. Raúl Pérez'
    assert len(por_siglas['CO']['personas']) >= 1

    # Límite: área vacante (sin titular).
    vacante = (
        await api.post(
            '/api/areas',
            json={'siglas': 'VAC', 'nombre': 'Área Vacante O-32', 'id_padre': CO, 'id_titular': None},
            headers=admin,
        )
    ).json()
    org_2 = {a['siglas']: a for a in (await api.get('/api/organizacion', headers=personal)).json()['elementos']}
    assert (org_2[vacante['siglas']]['id_titular'], org_2[vacante['siglas']]['nombre_titular']) == (None, None)

    # Error: sin sesión (GET /api/organizacion no acepta id de área en la ruta).
    assert (await api.get('/api/organizacion')).status_code == 401


async def test_o34_personas_y_usuarios(api, semilla):
    admin, oficialia = await entrar(api, 'lgomez'), await entrar(api, 'mflores')

    # Normal: alta de persona con usuario (inicia sesión con contraseña inicial).
    alta = await api.post(
        '/api/personas',
        json={
            'nombre': 'Lic. Sofía Navarro',
            'correo': 'snavarro@institucion.gob.mx',
            'id_area': OP,
            'rol': 'PE',
        },
        headers=admin,
    )
    assert alta.status_code == 201
    login = await api.post('/api/sesiones', json={'correo': 'snavarro@institucion.gob.mx', 'contrasena': CONTRASENA})
    assert login.status_code == 201
    api.cookies.clear()

    # Error: correo repetido sin distinguir mayúsculas.
    rep = await api.post(
        '/api/personas',
        json={'nombre': 'Otra', 'correo': 'SNavarro@INSTITUCION.gob.mx', 'id_area': OP, 'rol': 'PE'},
        headers=admin,
    )
    assert (rep.status_code, rep.json()['codigo']) == (409, 'CONFLICTO')

    # Límite: baja lógica de un titular deja el área vacante y conserva sus movimientos.
    rperez_id = '00000000-0000-4000-8000-000000000203'
    movs_antes = semilla.execute('SELECT count(*) FROM movimiento WHERE id_persona = %s', (rperez_id,)).fetchone()[0]
    baja = await api.post(f'/api/personas/{rperez_id}/baja', headers=admin)
    assert baja.status_code == 204
    movs_despues = semilla.execute('SELECT count(*) FROM movimiento WHERE id_persona = %s', (rperez_id,)).fetchone()[0]
    assert movs_despues == movs_antes
    areas = {a['id']: a for a in (await api.get('/api/areas', headers=oficialia)).json()['elementos']}
    assert areas[CO]['id_titular'] is None


async def test_o35_actores_externos(api):
    oficialia = await entrar(api, 'mflores')

    # Normal: alta de actor externo.
    alta = await api.post(
        '/api/actores-externos',
        json={'nombre': 'Municipio Norte O-35', 'tipo': 'municipio', 'correo': 'contacto@muni.gob.mx'},
        headers=oficialia,
    )
    assert alta.status_code == 201
    actor_id = alta.json()['id']

    # Límite: desactivar un actor con documentos lo desactiva pero no lo borra.
    await api.post(
        '/api/documentos',
        json=nuevo('Doc de Municipio Norte', emisor='Municipio Norte O-35'),
        headers=oficialia,
    )
    assert (await api.post(f'/api/actores-externos/{actor_id}/desactivacion', headers=oficialia)).status_code == 204
    lista = {a['id']: a for a in (await api.get('/api/actores-externos', headers=oficialia)).json()['elementos']}
    assert lista[actor_id]['activo'] is False and lista[actor_id]['documentos'] == 1

    # Error: tipo de actor no válido.
    mal_tipo = await api.post(
        '/api/actores-externos',
        json={'nombre': 'Actor Inválido', 'tipo': 'empresa_fantasma'},
        headers=oficialia,
    )
    assert (mal_tipo.status_code, mal_tipo.json()['codigo']) == (422, 'VALIDACION')
    assert (await api.post(f'/api/actores-externos/{uuid.uuid4()}/desactivacion', headers=oficialia)).status_code == 404
    from app.main import app

    await vaciar_outbox(app)
