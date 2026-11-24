// E-2.4: restricciones de unicidad e índices (D-55). En Community no hay restricciones de existencia.
CREATE CONSTRAINT documento_id IF NOT EXISTS FOR (n:Documento) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT movimiento_id IF NOT EXISTS FOR (n:Movimiento) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT area_id IF NOT EXISTS FOR (n:Area) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT persona_id IF NOT EXISTS FOR (n:Persona) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT asunto_id IF NOT EXISTS FOR (n:Asunto) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT no_registrado_numero_emisor IF NOT EXISTS
  FOR (n:DocumentoNoRegistrado) REQUIRE (n.numero, n.emisor) IS UNIQUE;
CREATE INDEX movimiento_fecha IF NOT EXISTS FOR (m:Movimiento) ON (m.fecha_hora);
CREATE INDEX referencia_id IF NOT EXISTS FOR ()-[r:RESPONDE_A]-() ON (r.id);
CREATE INDEX da_seguimiento_id IF NOT EXISTS FOR ()-[r:DA_SEGUIMIENTO_A]-() ON (r.id);
CREATE INDEX en_alcance_id IF NOT EXISTS FOR ()-[r:EN_ALCANCE_A]-() ON (r.id);
CREATE INDEX sustituye_id IF NOT EXISTS FOR ()-[r:SUSTITUYE_A]-() ON (r.id);
CREATE INDEX pertenece_id IF NOT EXISTS FOR ()-[r:PERTENECE_A]-() ON (r.id);
