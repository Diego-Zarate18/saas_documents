"""Aplicación FastAPI de SIGEDOC: configuración, clientes de las tres bases, CORS y routers bajo /api (D-71).

Se arranca con `uv run uvicorn app.main:app` desde backend/. Sin una variable obligatoria no arranca
(ErrorConfiguracion). Si una base no responde al arrancar, arranca igual y /api/salud lo informa.
"""

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from functools import partial

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import bandeja, catalogos, consultas, documentos, errores, movimientos, salud, sesiones
from app.config import Ajustes, cargar_ajustes
from app.infra import mongo, neo4j, postgres

logging.basicConfig(level=logging.INFO, format='%(levelname)s:     %(name)s: %(message)s')
registro = logging.getLogger('sigedoc')


def crear_app(ajustes: Ajustes) -> FastAPI:
    """Crea la aplicación; los clientes se abren en el lifespan y se cierran al apagar."""

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        if isinstance(asyncio.get_running_loop(), getattr(asyncio, 'ProactorEventLoop', ())):
            # Sin esto, PostgreSQL aparecería como caído en /api/salud y el error de entorno parecería de la base.
            raise RuntimeError(
                'psycopg no funciona con ProactorEventLoop (Windows): arranca con '
                '`uv run uvicorn app.main:app --loop asyncio:SelectorEventLoop`.'
            )
        pool = postgres.crear_pool(ajustes)
        await pool.open(wait=False)
        cliente_mongo = mongo.crear_cliente(ajustes)
        driver_neo4j = neo4j.crear_driver(ajustes)
        app.state.ajustes = ajustes
        app.state.pool = pool
        app.state.documental = cliente_mongo[ajustes.mongo_db]
        app.state.grafo = driver_neo4j
        app.state.verificaciones = {
            'postgres': partial(postgres.verificar, pool),
            'mongo': partial(mongo.verificar, cliente_mongo),
            'neo4j': partial(neo4j.verificar, driver_neo4j),
        }
        # Registro de conexión (guía, sección 9): una línea por base al arrancar.
        estado = await salud.medir_bases(app.state.verificaciones)
        for nombre, base in estado.bases:
            registro.info('%s: %s (%d ms)', nombre, 'conectada' if base.ok else base.error, base.ms)
        try:
            yield
        finally:
            await driver_neo4j.close()
            await cliente_mongo.close()
            await pool.close()

    app = FastAPI(title='SIGEDOC', lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[ajustes.api_cors_origen],
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )
    errores.registrar(app)
    for modulo in (salud, sesiones, catalogos, documentos, movimientos, bandeja, consultas):
        app.include_router(modulo.router, prefix='/api')
    return app


app = crear_app(cargar_ajustes())
