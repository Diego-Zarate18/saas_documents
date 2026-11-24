"""Pool de conexiones a PostgreSQL con psycopg 3 y unidad de trabajo (D-40)."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from psycopg import AsyncConnection
from psycopg.conninfo import make_conninfo
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from app.config import Ajustes


def crear_pool(ajustes: Ajustes, max_size: int = 10) -> AsyncConnectionPool:
    """Crea el pool sin abrirlo. Al abrirlo con wait=False la API arranca aunque PostgreSQL no responda."""
    conninfo = make_conninfo(
        host=ajustes.postgres_host,
        port=ajustes.postgres_port,
        dbname=ajustes.postgres_db,
        user=ajustes.postgres_user,
        password=ajustes.postgres_password.get_secret_value(),
        connect_timeout=2,
        application_name='sigedoc-api',
    )
    return AsyncConnectionPool(
        conninfo,
        min_size=1,
        max_size=max_size,
        open=False,
        name='sigedoc',
        kwargs={'row_factory': dict_row},
        # Prueba la conexión al prestarla: tras un reinicio de PostgreSQL no se entrega una conexión rota.
        check=AsyncConnectionPool.check_connection,
    )


@asynccontextmanager
async def transaccion(pool: AsyncConnectionPool) -> AsyncIterator[AsyncConnection]:
    """Unidad de trabajo: una conexión y una transacción; confirma al salir o revierte ante una excepción."""
    async with pool.connection() as conexion, conexion.transaction():
        yield conexion


async def verificar(pool: AsyncConnectionPool) -> None:
    """Pide una conexión al pool y ejecuta SELECT 1."""
    async with pool.connection() as conexion:
        await conexion.execute('SELECT 1')
