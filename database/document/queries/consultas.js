// Consultas representativas sobre la semilla (MongoDB). Uso, desde la raíz:
//   docker compose exec -T mongo sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" sigedoc' < database/document/queries/consultas.js
const es = { locale: 'es', strength: 1 }

// 1. Búsqueda por ente_auditor sin acentos ni mayúsculas (D-46, AD-07): usa ix_ente_auditor y devuelve ids.
printjson(db.expedientes.find({ tipo: 'requerimiento_auditoria', 'datos_tipo.ente_auditor': 'organo interno de control' }, { _id: 1, 'datos_tipo.ente_auditor': 1 }).collation(es).toArray())

// 2. Búsqueda por solicitante en solicitudes de transparencia (ix_solicitante).
printjson(db.expedientes.find({ tipo: 'solicitud_transparencia', 'datos_tipo.solicitante': 'CIUDADANO' }, { _id: 1 }).collation(es).toArray())

// 3. Expediente completo de OP-2026-0139 (AD-02): datos del tipo, anexos y notas.
printjson(db.expedientes.findOne({ _id: '00000000-0000-4000-8000-000000001004' }))

// 4. Expedientes por tipo, con anexos y notas.
printjson(db.expedientes.aggregate([
  { $group: { _id: '$tipo', expedientes: { $sum: 1 }, anexos: { $sum: { $size: '$anexos' } }, notas: { $sum: { $size: '$notas' } } } },
  { $sort: { expedientes: -1 } },
]).toArray())
