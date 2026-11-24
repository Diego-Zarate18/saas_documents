"""AG-07 a AG-09. Asuntos y la pertenencia de documentos (D-24, D-30); el nodo Asunto nunca se borra (D-25)."""

from neo4j import AsyncDriver

DATOS_ASUNTO = """s.id AS id, s.nombre AS nombre, s.descripcion AS descripcion, s.id_persona AS id_persona,
                  s.fecha_hora AS fecha, [(d:Documento)-[:PERTENECE_A]->(s) | d.id] AS documentos"""


async def listar(driver: AsyncDriver, texto: str) -> list[dict]:
    """AG-07. Asuntos cuyo nombre contiene el texto, sin distinguir mayúsculas, con sus documentos."""
    filas, _, _ = await driver.execute_query(
        f"""MATCH (s:Asunto) WHERE toLower(s.nombre) CONTAINS toLower($texto)
            RETURN {DATOS_ASUNTO} ORDER BY s.fecha_hora, s.id""",
        texto=texto,
    )
    return [f.data() for f in filas]


async def obtener(driver: AsyncDriver, id_asunto: str) -> dict | None:
    filas, _, _ = await driver.execute_query(f'MATCH (s:Asunto {{id: $id}}) RETURN {DATOS_ASUNTO}', id=id_asunto)
    return filas[0].data() if filas else None


async def crear(driver: AsyncDriver, asunto: dict) -> None:
    """AG-07. O-27: crea el nodo Asunto."""
    await driver.execute_query(
        """CREATE (:Asunto {id: $id, nombre: $nombre, descripcion: $descripcion, id_persona: $id_persona,
                            fecha_hora: $fecha_hora})""",
        **asunto,
    )


async def pertenece(driver: AsyncDriver, id_documento: str, id_asunto: str) -> bool:
    filas, _, _ = await driver.execute_query(
        'MATCH (:Documento {id: $doc})-[r:PERTENECE_A]->(:Asunto {id: $asunto}) RETURN count(r) > 0 AS hay',
        doc=id_documento,
        asunto=id_asunto,
    )
    return filas[0]['hay']


async def asignar(driver: AsyncDriver, id_documento: str, id_asunto: str, propiedades: dict) -> bool:
    """AG-08. O-08: MERGE de PERTENECE_A. Falso si el documento aún no está en el grafo."""
    filas, _, _ = await driver.execute_query(
        """MATCH (d:Documento {id: $doc}), (s:Asunto {id: $asunto})
           MERGE (d)-[r:PERTENECE_A]->(s)
           ON CREATE SET r.id = $id, r.id_persona = $id_persona, r.fecha_hora = $fecha_hora
           RETURN r.id AS id""",
        doc=id_documento,
        asunto=id_asunto,
        **propiedades,
    )
    return bool(filas)


async def sacar(driver: AsyncDriver, id_documento: str, id_asunto: str) -> bool:
    """AG-09. O-18: borra la pertenencia, nunca el asunto."""
    filas, _, _ = await driver.execute_query(
        """MATCH (:Documento {id: $doc})-[r:PERTENECE_A]->(:Asunto {id: $asunto})
           DELETE r RETURN count(r) AS borradas""",
        doc=id_documento,
        asunto=id_asunto,
    )
    return filas[0]['borradas'] > 0
