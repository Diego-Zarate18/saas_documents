// Consultas representativas sobre la semilla (Neo4j). Uso, desde la raíz:
//   docker compose exec -T neo4j sh -c 'cypher-shell -u neo4j -p "${NEO4J_AUTH#*/}"' < database/graph/queries/consultas.cypher
// Anclas (D-50): un Documento, un Asunto o movimientos por fecha; nunca un Area.

// 1. C1 Recorrido de OP-2026-0139 (AG-01): cada paso con su origen, destino, quién y el paso anterior (SIGUIENTE).
MATCH (d:Documento {id: '00000000-0000-4000-8000-000000001004'})<-[:SOBRE]-(m:Movimiento)-[:HACIA]->(h:Area)
MATCH (m)-[:REALIZADO_POR]->(p:Persona)
OPTIONAL MATCH (m)-[:DESDE]->(o:Area)
OPTIONAL MATCH (prev:Movimiento)-[:SIGUIENTE]->(m)
RETURN m.fecha_hora AS fecha, m.tipo AS tipo, collect(DISTINCT o.siglas) AS desde, h.siglas AS hacia, m.rol AS rol,
       p.nombre AS realizo, collect(DISTINCT prev.tipo) AS despues_de
ORDER BY fecha, hacia;

// 2. C1 Ramas: caminos por SIGUIENTE desde el registro de OP-2026-0139 hasta cada último paso.
MATCH (d:Documento {id: '00000000-0000-4000-8000-000000001004'})<-[:SOBRE]-(r:Movimiento {tipo: 'registro'})
MATCH camino = (r)-[:SIGUIENTE*0..]->(ultimo:Movimiento)
WHERE NOT (ultimo)-[:SIGUIENTE]->()
RETURN [n IN nodes(camino) | n.tipo + '→' + [(n)-[:HACIA]->(a) | a.siglas][0]] AS rama;

// 3. C2 Hilo del asunto «Equipamiento de laboratorios 2026» (AG-02): sus documentos y las referencias entre ellos
//    en ambos sentidos, hasta 6 saltos, incluidos los no registrados.
MATCH (s:Asunto {id: '00000000-0000-4000-8000-000000000401'})<-[:PERTENECE_A]-(d:Documento)
OPTIONAL MATCH ruta = (d)-[:RESPONDE_A|DA_SEGUIMIENTO_A|EN_ALCANCE_A|SUSTITUYE_A*1..6]-(otro)
RETURN s.nombre AS asunto, d.id AS documento, d.estado AS estado,
       [r IN relationships(ruta) | type(r)] AS referencias,
       coalesce(otro.id, otro.numero + ' (' + otro.emisor + ', no registrado)') AS relacionado;

// 4. C3 Rebotes (AG-03): devoluciones por documento en noviembre, anclado en el índice de fecha.
MATCH (m:Movimiento {tipo: 'devolucion'})
WHERE m.fecha_hora >= datetime('2026-11-01T00:00:00-06:00')
MATCH (m)-[:SOBRE]->(d:Documento), (m)-[:DESDE]->(o:Area)
RETURN d.id AS documento, count(m) AS devoluciones, collect(DISTINCT o.siglas) AS desde,
       any(x IN collect(m.motivo) WHERE x = 'no_competencia') AS no_competencia
ORDER BY devoluciones DESC;

// 5. C5 Alcance del asunto «Auditoría ASF 2025» (AG-04): áreas y personas que intervinieron en sus documentos.
MATCH (s:Asunto {id: '00000000-0000-4000-8000-000000000403'})<-[:PERTENECE_A]-(d:Documento)<-[:SOBRE]-(m:Movimiento)
MATCH (m)-[:HACIA]->(a:Area), (m)-[:REALIZADO_POR]->(p:Persona)
RETURN s.nombre AS asunto, collect(DISTINCT a.siglas) AS areas, collect(DISTINCT p.nombre) AS personas,
       count(DISTINCT d) AS documentos;
