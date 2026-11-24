"""Cliente de MongoDB con la API asíncrona de PyMongo (D-40)."""

from pymongo import AsyncMongoClient

from app.config import Ajustes


def crear_cliente(ajustes: Ajustes) -> AsyncMongoClient:
    """Crea el cliente; se conecta en la primera operación, así que la API arranca aunque MongoDB no responda."""
    return AsyncMongoClient(
        ajustes.mongo_uri.get_secret_value(),
        username=ajustes.mongo_user,
        password=ajustes.mongo_password.get_secret_value(),
        appname='sigedoc-api',
        tz_aware=True,
        serverSelectionTimeoutMS=2000,
        connectTimeoutMS=2000,
    )


async def verificar(cliente: AsyncMongoClient) -> None:
    """Ejecuta el comando ping."""
    await cliente.admin.command('ping')
