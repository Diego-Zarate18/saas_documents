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

REFERENCIAS = {'RESPONDE_A', 'DA_SEGUIMIENTO_A', 'EN_ALCANCE_A', 'SUSTITUYE_A'}

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


async def estado(driver: AsyncDriver, datos: dict) -> None:
    """AG-06. Cambio de estado del documento (O-05, O-24, O-26)."""
    resultado = await driver.execute_query(
        'MATCH (d:Documento {id: $id}) SET d.estado = $estado RETURN d.id',
        id=datos['id_documento'],
        estado=datos['estado'],
    )
    if not resultado.records:
        raise LookupError('El documento aún no está en el grafo')


async def referencia(driver: AsyncDriver, datos: dict) -> None:
    """AG-06. RESPONDE_A de una conclusión con respuesta (O-05): de la respuesta hacia el documento (D-05)."""
    if datos['tipo'] not in REFERENCIAS:
        raise ValueError(datos['tipo'])
    # El tipo de relación no se puede parametrizar en Cypher: sale del conjunto cerrado REFERENCIAS.
    resultado = await driver.execute_query(
        'MATCH (o:Documento {id: $origen}), (d:Documento {id: $destino}) '
        f'MERGE (o)-[r:{datos["tipo"]} {{id: $id}}]->(d) '
        'SET r.id_persona = $id_persona, r.fecha_hora = datetime($fecha_hora) RETURN r.id',
        origen=datos['id_origen'],
        destino=datos['id_destino'],
        id=datos['id'],
        id_persona=datos['id_persona'],
        fecha_hora=datos['fecha_hora'],
    )
    if not resultado.records:
        raise LookupError('Un documento de la referencia aún no está en el grafo')
