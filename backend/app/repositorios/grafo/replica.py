"""AG-06. Réplica desde el outbox con MERGE: idempotente, nunca borra (D-25)."""

from datetime import datetime

from neo4j import AsyncDriver

# Regla de SIGUIENTE (04-grafo.md, D-70, D-103). Versión probada en T-04: el predecesor debe ser anterior (<) para
# que los movimientos de un mismo turno, que comparten fecha y hora, no se encadenen entre sí. La usan el outbox y la
# carga de la semilla (herramientas/esquemas.py).
SIGUIENTE = """
UNWIND $ids AS id
MATCH (m:Movimiento {id: id})-[:SOBRE]->(d:Documento)
WHERE m.tipo <> 'correccion'
MATCH (m)-[:DESDE]->(o:Area)
CALL (m, d, o) {
  MATCH (p:Movimiento)-[:SOBRE]->(d)
  WHERE p.id <> m.id AND p.tipo <> 'correccion' AND p.fecha_hora < m.fecha_hora
  OPTIONAL MATCH (p)-[h:HACIA]->(o)
  RETURN p ORDER BY h IS NOT NULL DESC, p.fecha_hora DESC
  LIMIT 1
}
MERGE (p)-[:SIGUIENTE]->(m)
"""

PROPIEDADES_MOVIMIENTO = (
    'tipo',
    'rol',
    'id_grupo_turno',
    'motivo',
    'id_area_sugerida',
    'id_titular_al_turnar',
    'id_corrige',
)


async def documento(driver: AsyncDriver, datos: dict) -> None:
    """AG-06. Nodo Documento y EMITIDO_POR si el emisor es interno."""
    await driver.execute_query(
        """MERGE (d:Documento {id: $id}) SET d.tipo = $tipo, d.estado = $estado, d.confidencial = $confidencial
           WITH d WHERE $id_area_emisora IS NOT NULL
           MATCH (a:Area {id: $id_area_emisora}) MERGE (d)-[:EMITIDO_POR]->(a)""",
        id=datos['id_documento'],
        tipo=datos['tipo'],
        estado=datos['estado'],
        confidencial=datos['confidencial'],
        id_area_emisora=datos.get('id_area_emisora'),
    )


async def movimiento(driver: AsyncDriver, datos: dict) -> None:
    """AG-06. Nodo Movimiento con SOBRE, HACIA, REALIZADO_POR, un DESDE por origen y SIGUIENTE."""
    propiedades = {c: datos[c] for c in PROPIEDADES_MOVIMIENTO if datos.get(c) is not None}
    propiedades['fecha_hora'] = datetime.fromisoformat(datos['fecha_hora'])
    await driver.execute_query(
        """MERGE (m:Movimiento {id: $id}) SET m += $propiedades
           WITH m
           MATCH (d:Documento {id: $id_documento}) MERGE (m)-[:SOBRE]->(d)
           WITH m MATCH (h:Area {id: $id_area_destino}) MERGE (m)-[:HACIA]->(h)
           WITH m MATCH (p:Persona {id: $id_persona}) MERGE (m)-[:REALIZADO_POR]->(p)
           WITH m
           UNWIND $origenes AS origen
           MATCH (o:Area {id: origen}) MERGE (m)-[:DESDE]->(o)""",
        id=datos['id_movimiento'],
        propiedades=propiedades,
        id_documento=datos['id_documento'],
        id_area_destino=datos['id_area_destino'],
        id_persona=datos['id_persona'],
        origenes=datos['origenes'],
    )
    await driver.execute_query(SIGUIENTE, ids=[datos['id_movimiento']])
