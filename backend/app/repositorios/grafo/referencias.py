"""AG-07 y AG-09. Referencias entre documentos, fuente en Neo4j (D-24); el no registrado se identifica por número y
emisor (D-33). El tipo de relación sale siempre del conjunto cerrado REFERENCIAS (no se puede parametrizar)."""

from neo4j import AsyncDriver

from app.repositorios.grafo.replica import REFERENCIAS


def _tipo(tipo: str) -> str:
    if tipo not in REFERENCIAS:
        raise ValueError(tipo)
    return tipo


def _destino(id_destino: str | None) -> str:
    """Patrón del destino: un Documento por id o un DocumentoNoRegistrado por número y emisor."""
    if id_destino:
        return '(x:Documento {id: $id_destino})'
    return '(x:DocumentoNoRegistrado {numero: $numero, emisor: $emisor})'


async def existe(
    driver: AsyncDriver, id_origen: str, tipo: str, id_destino: str | None, numero: str | None, emisor: str | None
) -> bool:
    """AG-07. La misma relación ya está."""
    registros, _, _ = await driver.execute_query(
        f'MATCH (:Documento {{id: $origen}})-[:{_tipo(tipo)}]->{_destino(id_destino)} RETURN count(*) > 0 AS hay',
        origen=id_origen,
        id_destino=id_destino,
        numero=numero,
        emisor=emisor,
    )
    return registros[0]['hay']


async def crear(
    driver: AsyncDriver,
    id_origen: str,
    tipo: str,
    id_destino: str | None,
    numero: str | None,
    emisor: str | None,
    propiedades: dict,
) -> bool:
    """AG-07. Crea la relación (y el no registrado si hace falta, reutilizando el mismo número y emisor). Falso si
    un documento registrado aún no está en el grafo."""
    destino = (
        'MATCH (x:Documento {id: $id_destino})'
        if id_destino
        else ('MERGE (x:DocumentoNoRegistrado {numero: $numero, emisor: $emisor})')
    )
    registros, _, _ = await driver.execute_query(
        f"""MATCH (o:Documento {{id: $origen}})
            {destino}
            MERGE (o)-[r:{_tipo(tipo)} {{id: $id}}]->(x)
            SET r.id_persona = $id_persona, r.fecha_hora = $fecha_hora
            RETURN r.id AS id""",
        origen=id_origen,
        id_destino=id_destino,
        numero=numero,
        emisor=emisor,
        **propiedades,
    )
    return bool(registros)


async def quitar(
    driver: AsyncDriver, id_origen: str, tipo: str, id_destino: str | None, numero: str | None, emisor: str | None
) -> bool:
    """AG-09. Borra la relación; el nodo no registrado se conserva (D-25)."""
    registros, _, _ = await driver.execute_query(
        f"""MATCH (:Documento {{id: $origen}})-[r:{_tipo(tipo)}]->{_destino(id_destino)}
            DELETE r RETURN count(r) AS borradas""",
        origen=id_origen,
        id_destino=id_destino,
        numero=numero,
        emisor=emisor,
    )
    return registros[0]['borradas'] > 0
