"""AG-01, AG-05. Lo que la ficha lee del grafo: recorrido (C1), referencias y asuntos, anclado en el Documento."""

from neo4j import AsyncDriver


async def ficha(driver: AsyncDriver, id_documento: str) -> dict:
    """AG-01. Ids del recorrido en orden, referencias salientes y asuntos del documento."""
    movimientos, _, _ = await driver.execute_query(
        """MATCH (:Documento {id: $id})<-[:SOBRE]-(m:Movimiento)
           RETURN m.id AS id ORDER BY m.fecha_hora, m.id""",
        id=id_documento,
    )
    referencias, _, _ = await driver.execute_query(
        """MATCH (:Documento {id: $id})-[r:RESPONDE_A|DA_SEGUIMIENTO_A|EN_ALCANCE_A|SUSTITUYE_A]->(x)
           RETURN type(r) AS tipo, x.id AS id_documento, x.numero AS numero, x.emisor AS emisor
           ORDER BY r.fecha_hora""",
        id=id_documento,
    )
    asuntos, _, _ = await driver.execute_query(
        """MATCH (:Documento {id: $id})-[r:PERTENECE_A]->(s:Asunto)
           RETURN s.id AS id, s.nombre AS nombre ORDER BY r.fecha_hora""",
        id=id_documento,
    )
    return {
        'movimientos': [r['id'] for r in movimientos],
        'referencias': [r.data() for r in referencias],
        'asuntos': [r.data() for r in asuntos],
    }
