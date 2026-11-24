"""Conectividad con las tres bases reales usando la configuración del .env (guía, sección 9).

Necesita `docker compose up -d postgres mongo neo4j`. Solo lee: no crea ni borra datos.
Aparte: `uv run pytest ../tests -m integracion`.
"""

import pytest
from fastapi.testclient import TestClient

from app.config import Ajustes, cargar_ajustes
from app.infra import mongo, neo4j, postgres

pytestmark = pytest.mark.integracion


@pytest.fixture(scope='module')
def ajustes() -> Ajustes:
    return cargar_ajustes()


@pytest.mark.asyncio
async def test_conectividad_postgres(ajustes):
    pool = postgres.crear_pool(ajustes)
    await pool.open(wait=True, timeout=10)
    try:
        await postgres.verificar(pool)
        async with pool.connection() as conexion:
            cursor = await conexion.execute('SHOW server_version')
            (version,) = await cursor.fetchone()
        assert version.startswith('17.')
    finally:
        await pool.close()


@pytest.mark.asyncio
async def test_conectividad_mongo(ajustes):
    cliente = mongo.crear_cliente(ajustes)
    try:
        await mongo.verificar(cliente)
        info = await cliente.server_info()
        assert info['version'].startswith('8.0.')
    finally:
        await cliente.close()


@pytest.mark.asyncio
async def test_conectividad_neo4j(ajustes):
    driver = neo4j.crear_driver(ajustes)
    try:
        await neo4j.verificar(driver)
        info = await driver.get_server_info()
        assert info.agent.startswith('Neo4j/5.26')
    finally:
        await driver.close()


def test_salud_de_extremo_a_extremo_con_las_tres_bases():
    """La aplicación completa (lifespan con los tres clientes reales) responde 200 y ok."""
    from app.main import app  # importarla lee el .env: solo en las pruebas de integración

    with TestClient(app) as cliente:
        respuesta = cliente.get('/api/salud')
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo['estado'] == 'ok'
    assert all(base['ok'] for base in cuerpo['bases'].values())
