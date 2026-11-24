"""AG-01 a AG-05. Consultas del grafo, siempre ancladas en un Documento, un Asunto o movimientos por fecha (D-50)."""

from datetime import datetime

from neo4j import AsyncDriver

RELACIONES = 'RESPONDE_A|DA_SEGUIMIENTO_A|EN_ALCANCE_A|SUSTITUYE_A'


async def ficha(driver: AsyncDriver, id_documento: str) -> dict:
    """AG-01 y AG-05. Ids del recorrido en orden, referencias en ambos sentidos y asuntos del documento."""
    movimientos, _, _ = await driver.execute_query(
        """MATCH (:Documento {id: $id})<-[:SOBRE]-(m:Movimiento)
           RETURN m.id AS id ORDER BY m.fecha_hora, m.id""",
        id=id_documento,
    )
    referencias, _, _ = await driver.execute_query(
        f"""MATCH (d:Documento {{id: $id}})-[r:{RELACIONES}]-(x)
            RETURN type(r) AS tipo, startNode(r) = d AS sale, x.id AS id_documento, x.numero AS numero,
                   x.emisor AS emisor
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


async def hilo(driver: AsyncDriver, id_asunto: str) -> dict:
    """AG-02 (C2). Documentos del asunto y lo que llega a ellos por las cuatro referencias, en ambos sentidos y hasta
    6 saltos (D-50). Cada nodo queda con su camino más corto y la relación con el nodo anterior de ese camino."""
    raices, _, _ = await driver.execute_query(
        'MATCH (:Asunto {id: $id})<-[:PERTENECE_A]-(d:Documento) RETURN d.id AS id', id=id_asunto
    )
    alcanzados, _, _ = await driver.execute_query(
        f"""MATCH (:Asunto {{id: $id}})<-[:PERTENECE_A]-(raiz:Documento)
            WITH collect(raiz) AS raices
            UNWIND raices AS raiz
            MATCH camino = (raiz)-[:{RELACIONES}*1..6]-(x)
            WHERE NOT x IN raices
            WITH x, camino ORDER BY length(camino)
            WITH x, head(collect(camino)) AS corto
            WITH x, corto, last(relationships(corto)) AS r
            RETURN x.id AS id, x.numero AS numero, x.emisor AS emisor, x:DocumentoNoRegistrado AS no_registrado,
                   length(corto) AS profundidad, type(r) AS tipo, startNode(r) = x AS entra""",
        id=id_asunto,
    )
    return {'raices': [r['id'] for r in raices], 'alcanzados': [r.data() for r in alcanzados]}


async def alcance(driver: AsyncDriver, id_asunto: str) -> list[dict]:
    """AG-04 (C5). Por documento del asunto: áreas por las que pasó (origen o destino) y personas de sus
    movimientos (autores y titulares al turnar)."""
    filas, _, _ = await driver.execute_query(
        """MATCH (:Asunto {id: $id})<-[:PERTENECE_A]-(d:Documento)<-[:SOBRE]-(m:Movimiento)
           OPTIONAL MATCH (m)-[:DESDE|HACIA]->(a:Area)
           OPTIONAL MATCH (m)-[:REALIZADO_POR]->(p:Persona)
           RETURN d.id AS id_documento, collect(DISTINCT a.id) AS areas,
                  collect(DISTINCT p.id) + collect(DISTINCT m.id_titular_al_turnar) AS personas""",
        id=id_asunto,
    )
    return [f.data() for f in filas]


async def movimientos_del_periodo(driver: AsyncDriver, desde: datetime, hasta: datetime) -> list[dict]:
    """AG-03 (C3). Movimientos de documentos en trámite en el periodo, anclados en el índice de fecha (D-50)."""
    filas, _, _ = await driver.execute_query(
        """MATCH (m:Movimiento)
           WHERE m.fecha_hora >= $desde AND m.fecha_hora < $hasta AND m.tipo <> 'correccion'
           MATCH (m)-[:SOBRE]->(d:Documento {estado: 'en_tramite'}), (m)-[:HACIA]->(h:Area)
           OPTIONAL MATCH (m)-[:DESDE]->(o:Area)
           RETURN d.id AS id_documento, m.tipo AS tipo, m.rol AS rol, m.motivo AS motivo,
                  m.id_area_sugerida AS id_area_sugerida, h.id AS hacia, collect(o.id) AS desde""",
        desde=desde,
        hasta=hasta,
    )
    return [f.data() for f in filas]
