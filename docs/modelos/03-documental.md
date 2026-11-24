# E-2.3 Modelo documental (MongoDB 8.0)

Fuentes: D-16, D-19, D-20, D-26, D-46, D-60, D-65, D-66, D-104; patrones AD-01 a AD-08; operaciones O-09, O-17, O-28, O-29.

## Colección `expedientes`

Un documento JSON por cada documento oficial, entradas y salidas. `_id` es el mismo UUID que `documento.id_documento` (D-16), así que la relación es 1:1 sin tabla de equivalencias. El expediente lo crea el outbox después de confirmar el registro en PostgreSQL (AD-01, upsert por `_id`).

| Campo | Tipo BSON | Obligatorio | Descripción |
|---|---|---|---|
| `_id` | string (UUID) | sí | Igual a `id_documento` |
| `tipo` | string | sí | Copia inmutable del tipo (D-26); elige la rama del validador |
| `datos_tipo` | object | sí | Campos propios del tipo (tabla siguiente); `{}` en los tipos sin campos |
| `referencias_citadas` | array de string | sí (puede ser `[]`) | Texto de las referencias que cita el documento; solo informativo, las relaciones viven en Neo4j (AD-01) |
| `anexos` | array de object | sí (puede ser `[]`) | Datos descriptivos, sin archivo (DT-03) |
| `notas` | array de object | sí (puede ser `[]`) | Notas generales y evidencias de atención |
| `creado_en` | date | sí | |
| `actualizado_en` | date | sí | |

### Campos propios por tipo (D-66)

| Tipo | `datos_tipo` | Búsqueda |
|---|---|---|
| requerimiento_auditoria | `ente_auditor` string, obligatorio; `puntos` array de string, opcional | Índice parcial en `ente_auditor` (D-46) |
| solicitud_transparencia | `solicitante` string, obligatorio | Índice parcial en `solicitante` (D-46) |
| solicitud_material_pago | `concepto` string, opcional | — |
| oficio, memorandum, circular, informe | sin campos | — |

No hay montos, fechas ni estados por tipo (D-66).

### Elementos anidados (D-104)

| Arreglo | Campos |
|---|---|
| `anexos` | `id` (UUID), `titulo` (la descripción de O-28), `hojas` (int ≥ 1), `ubicacion` (dónde está físicamente), `id_persona` (autor), `fecha_hora` (date); todos obligatorios |
| `notas` | `id` (UUID), `tipo` (`general` o `evidencia_atencion`), `texto`, `id_persona` (autor), `id_area` (área del autor), `fecha_hora` (date), obligatorios; `id_movimiento` (UUID), obligatorio en `evidencia_atencion` (D-19) |

Autor, área y fecha los pone el servidor (O-29).

## Validador

`validationLevel: "strict"`, `validationAction: "error"`. Se aplica con `collMod` desde `database/document/validators/` (D-55).

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["_id", "tipo", "datos_tipo", "referencias_citadas", "anexos", "notas", "creado_en", "actualizado_en"],
    "additionalProperties": false,
    "properties": {
      "_id": { "bsonType": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" },
      "tipo": { "enum": ["oficio", "solicitud_material_pago", "requerimiento_auditoria", "solicitud_transparencia", "memorandum", "circular", "informe"] },
      "datos_tipo": { "bsonType": "object" },
      "referencias_citadas": { "bsonType": "array", "items": { "bsonType": "string", "minLength": 1 } },
      "anexos": {
        "bsonType": "array",
        "items": {
          "bsonType": "object",
          "required": ["id", "titulo", "hojas", "ubicacion", "id_persona", "fecha_hora"],
          "additionalProperties": false,
          "properties": {
            "id": { "bsonType": "string" }, "titulo": { "bsonType": "string", "minLength": 1 },
            "hojas": { "bsonType": "int", "minimum": 1 }, "ubicacion": { "bsonType": "string", "minLength": 1 },
            "id_persona": { "bsonType": "string" }, "fecha_hora": { "bsonType": "date" }
          }
        }
      },
      "notas": {
        "bsonType": "array",
        "items": {
          "bsonType": "object",
          "required": ["id", "tipo", "texto", "id_persona", "id_area", "fecha_hora"],
          "additionalProperties": false,
          "properties": {
            "id": { "bsonType": "string" }, "tipo": { "enum": ["general", "evidencia_atencion"] },
            "texto": { "bsonType": "string", "minLength": 1 }, "id_persona": { "bsonType": "string" },
            "id_area": { "bsonType": "string" }, "fecha_hora": { "bsonType": "date" },
            "id_movimiento": { "bsonType": "string" }
          },
          "oneOf": [
            { "properties": { "tipo": { "enum": ["general"] } } },
            { "properties": { "tipo": { "enum": ["evidencia_atencion"] } }, "required": ["id_movimiento"] }
          ]
        }
      },
      "creado_en": { "bsonType": "date" },
      "actualizado_en": { "bsonType": "date" }
    },
    "oneOf": [
      { "properties": { "tipo": { "enum": ["requerimiento_auditoria"] },
          "datos_tipo": { "bsonType": "object", "required": ["ente_auditor"], "additionalProperties": false,
            "properties": { "ente_auditor": { "bsonType": "string", "minLength": 1 },
                            "puntos": { "bsonType": "array", "items": { "bsonType": "string", "minLength": 1 } } } } } },
      { "properties": { "tipo": { "enum": ["solicitud_transparencia"] },
          "datos_tipo": { "bsonType": "object", "required": ["solicitante"], "additionalProperties": false,
            "properties": { "solicitante": { "bsonType": "string", "minLength": 1 } } } } },
      { "properties": { "tipo": { "enum": ["solicitud_material_pago"] },
          "datos_tipo": { "bsonType": "object", "additionalProperties": false,
            "properties": { "concepto": { "bsonType": "string", "minLength": 1 } } } } },
      { "properties": { "tipo": { "enum": ["oficio", "memorandum", "circular", "informe"] },
          "datos_tipo": { "bsonType": "object", "additionalProperties": false, "properties": {} } } }
    ]
  }
}
```

Con `oneOf` cada expediente debe cumplir exactamente una rama: un requerimiento de auditoría sin `ente_auditor` o un oficio con campos propios se rechazan.

## Índices

```js
db.expedientes.createIndex({ "datos_tipo.ente_auditor": 1 },
  { name: "ix_ente_auditor", partialFilterExpression: { tipo: "requerimiento_auditoria" }, collation: { locale: "es", strength: 1 } })
db.expedientes.createIndex({ "datos_tipo.solicitante": 1 },
  { name: "ix_solicitante", partialFilterExpression: { tipo: "solicitud_transparencia" }, collation: { locale: "es", strength: 1 } })
```

La colación sin acentos ni mayúsculas permite buscar «auditoria superior» y encontrar «Auditoría Superior». La búsqueda devuelve ids y la visibilidad se filtra en PostgreSQL (D-46, AD-07). `_id` tiene su índice propio; no hacen falta más (D-66).

## Operaciones

| Operación | Patrón | Instrucción |
|---|---|---|
| O-01, O-20 Crear expediente | AD-01 | `updateOne({_id}, {$setOnInsert: {...}}, {upsert: true})` desde el outbox: repetirlo no duplica |
| O-09, O-11 Leer | AD-02 | `findOne({_id})` |
| O-09 Actualizar contenido | AD-03 | `updateOne({_id, tipo}, {$set: {"datos_tipo.<campo>": v, actualizado_en}})`; nunca `$set` de `tipo` (D-26); los cancelados son de solo lectura (servicio) |
| O-28 Agregar anexo | AD-04 | `$push: {anexos: {...}}` |
| O-29 Agregar nota; O-05 evidencia | AD-05 | `$push: {notas: {...}}`; la evidencia llega por el outbox con el `id_movimiento` de la conclusión (D-19), con `$push` condicionado a que ese `id` no exista para que el reintento no la duplique |
| O-17 Quitar anexo o nota | AD-06 | `$pull: {anexos: {id}}` o `$pull: {notas: {id, tipo: {$ne: "evidencia_atencion"}}}` |
| O-30 Buscar por campo del tipo | AD-07 | `find({tipo, "datos_tipo.<campo>": valor}, {_id: 1}).collation(...)` |
| O-40 Reconciliar | AD-08 | `find({_id: {$in: ids}}, {tipo: 1})` |

## Ejemplos

```json
{
  "_id": "00000000-0000-4000-8000-000000000133",
  "tipo": "requerimiento_auditoria",
  "datos_tipo": { "ente_auditor": "Auditoría Superior de la Federación", "puntos": ["Contratos de limpieza 2025", "Pagos a proveedores"] },
  "referencias_citadas": ["Oficio ASF/DGAF/1290/2026"],
  "anexos": [{ "id": "0f4c…", "titulo": "Relación de contratos", "hojas": 4, "ubicacion": "Carpeta del expediente", "id_persona": "…0201", "fecha_hora": { "$date": "2026-11-18T10:05:00-06:00" } }],
  "notas": [],
  "creado_en": { "$date": "2026-11-18T10:00:00-06:00" },
  "actualizado_en": { "$date": "2026-11-18T10:05:00-06:00" }
}
```

```json
{
  "_id": "00000000-0000-4000-8000-000000000140",
  "tipo": "solicitud_transparencia",
  "datos_tipo": { "solicitante": "Ciudadano" },
  "referencias_citadas": [],
  "anexos": [],
  "notas": [{ "id": "8a1e…", "tipo": "evidencia_atencion", "texto": "Se entregó la información por la Plataforma Nacional.", "id_persona": "…0209", "id_area": "…", "fecha_hora": { "$date": "2026-11-24T12:00:00-06:00" }, "id_movimiento": "c93b…" }],
  "creado_en": { "$date": "2026-11-21T08:30:00-06:00" },
  "actualizado_en": { "$date": "2026-11-24T12:00:00-06:00" }
}
```

Los ids abreviados con `…` son ilustrativos; los datos de prueba completos los define T-04.
