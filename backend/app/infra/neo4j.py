"""Driver asíncrono oficial de Neo4j (D-40)."""

from neo4j import AsyncDriver, AsyncGraphDatabase

from app.config import Ajustes


def crear_driver(ajustes: Ajustes) -> AsyncDriver:
    """Crea el driver; se conecta en la primera operación, así que la API arranca aunque Neo4j no responda."""
    return AsyncGraphDatabase.driver(
        ajustes.neo4j_uri,
        auth=(ajustes.neo4j_user, ajustes.neo4j_password.get_secret_value()),
        connection_timeout=2.0,
        # Sin avisos informativos (propiedades opcionales que aún no existen en ningún nodo, D-69).
        notifications_min_severity='OFF',
    )


async def verificar(driver: AsyncDriver) -> None:
    """Abre una sesión y comprueba que el servidor responde."""
    await driver.verify_connectivity()
