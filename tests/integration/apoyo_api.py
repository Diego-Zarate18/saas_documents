"""Ayudantes de las pruebas de integración que pasan por la API."""

import asyncio

import httpx
import psycopg

from app.config import cargar_ajustes
from app.infra import mongo, neo4j
from herramientas import esquemas
from outbox.procesador import procesar_todo

CONTRASENA = esquemas.CONTRASENA_DESARROLLO
OP, DG, CO, FI, SG, JU = (f'00000000-0000-4000-8000-000000000{n}' for n in (101, 102, 103, 104, 109, 106))
OP_0139 = '00000000-0000-4000-8000-000000001004'


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


def id_por_folio(pg: psycopg.Connection, folio: str) -> str:
    return str(pg.execute('SELECT id_documento FROM folio WHERE folio = %s', (folio,)).fetchone()[0])


async def vaciar_outbox(app) -> None:
    """Procesa el outbox hasta que no quede nada pendiente (el servicio outbox de compose también puede tomar
    eventos: SKIP LOCKED evita que dos procesos entreguen el mismo)."""
    ajustes = cargar_ajustes()
    cliente, grafo = mongo.crear_cliente(ajustes), neo4j.crear_driver(ajustes)
    try:
        for _ in range(100):
            await procesar_todo(app.state.pool, cliente[ajustes.mongo_db], grafo, ajustes.outbox_max_intentos)
            async with app.state.pool.connection() as con:
                cursor = await con.execute("SELECT count(*) AS faltan FROM outbox WHERE estado = 'pendiente'")
                if (await cursor.fetchone())['faltan'] == 0:
                    return
            await asyncio.sleep(0.1)
        raise AssertionError('El outbox no se vació')
    finally:
        await grafo.close()
        await cliente.close()
