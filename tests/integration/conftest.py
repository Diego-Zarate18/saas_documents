"""Fixtures de las pruebas de integración que pasan por la API (necesitan las tres bases levantadas)."""

import httpx
import pytest
import pytest_asyncio

from app.config import cargar_ajustes
from herramientas import esquemas


@pytest.fixture(scope='module')
def semilla():
    """Conexión síncrona a PostgreSQL con la semilla recargada al empezar y al terminar el módulo (O-41): la bitácora
    no se borra, así que cada módulo deja las bases como las encontró."""
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
async def api(semilla):
    """Cliente HTTP contra la aplicación completa, con su lifespan (los tres clientes reales)."""
    from app.main import app  # importarla lee el .env

    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://prueba') as cliente,
    ):
        yield cliente
