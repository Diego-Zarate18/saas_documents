# Reporte T-04: Las tres bases (E-4)

- Estado: completa

## Qué hice

1. **Esquemas y semilla.** Desde bases vacías (`docker compose down -v`), `uv run python -m herramientas.esquemas --datos` terminó con código 0:
   - Aplicó 4 scripts de PostgreSQL, 2 de MongoDB y 1 de Neo4j.
   - Cargó 238 filas, 44 expedientes y 563 nodos y relaciones.
   - La segunda corrida dio 0 scripts y 0 datos nuevos.
2. **`tests/integration/test_esquemas.py`.** Los cuatro casos pasan: folio repetido (`UniqueViolation`), UPDATE de `movimiento` (`RestrictViolation` del disparador), expediente inválido (código 121 de MongoDB) y `Documento.id` repetido (`ConstraintError`). Cada caso revierte lo que escribe.
3. **Calidad.** `uv run pytest ../tests` da 22 pruebas pasadas y `uv run ruff check . ../tests` no marca nada.
4. **Consultas de `queries/`.** Todas devuelven filas sobre la semilla:
   - PostgreSQL: bandeja de Oficialía con 24 filas (los 24 pendientes del Apéndice A), bitácora de OP-2026-0139, devoluciones y salidas con acuse.
   - MongoDB: búsqueda por `ente_auditor` sin acentos ni mayúsculas, búsqueda por `solicitante`, un expediente y conteo por tipo.
   - Neo4j: C1 (pasos y ramas por SIGUIENTE), C2, C3 y C5.
5. **Commit.** Un solo commit `T-04: …`, sin coautoría ni evidencias.

Lo que se creó:
- PostgreSQL: `database/relational/schema/001` a `004` con las 17 tablas, los CHECK, los índices parciales, las filas de los tres catálogos y los disparadores pedidos. Además, el folio es inmutable, como dice 02-relacional.
- MongoDB: `database/document/validators/001` (el `$jsonSchema` tal cual está en 03-documental) y `002` (los dos índices parciales con colación `es`).
- Neo4j: `database/graph/schema/001`.
- `backend/herramientas/esquemas.py`, el ejecutor.
- `database/semilla.mjs` y los archivos de `database/*/data/`.
- `database/*/queries/`.
- README y CLAUDE.md actualizados.

## Desviaciones y decisiones

- **De dónde sale la semilla.** `database/semilla.mjs` la genera desde `frontend/src/api/simulado/datos.ts` (Node 24 ejecuta TypeScript). Así las bases y el modo simulado tienen los mismos datos. Los totales coinciden con el Apéndice A: 13 áreas, 14 personas, 11 actores, 44 documentos (37 entradas y 7 salidas), 88 movimientos y 3 asuntos.
- **Huecos de la semilla del simulador** que el modelo no admite:
  - Los destinatarios de las salidas CO-2026-0048 y CO-2026-0049 son «Sistemas» y «Administración», que son áreas internas, pero una salida exige un actor externo. Les puse «Proveedor externo» y conservé el texto en `acuse.recibio`. «el OIC» quedó como Órgano Interno de Control.
  - OP-2026-0104 y OP-2026-0113 vienen marcados como externos con el nombre del área «Recursos Humanos»: quedan como emitidos por esa área.
  - OP-2026-0108 y OP-2026-0133 no tienen `ente_auditor`, y OP-2026-0103 y OP-2026-0107 no tienen `solicitante`, aunque el validador los exige. Uso el nombre del emisor.
  - A los anexos les faltan autor y fecha: uso quien registró el documento y la fecha del registro.
  - El `id_persona` del acuse y de la RESPONDE_A de una salida es el titular del área emisora.
- **Contraseñas.** Las guardo con `hashlib.scrypt` de la biblioteca estándar, en formato `scrypt$n$r$p$sal$hash`, porque Argon2 y bcrypt serían dependencias nuevas. La contraseña de desarrollo de la semilla es `sigedoc-dev` (está en el README). T-05 debe verificar con el mismo formato.
- **El registro vive solo en PostgreSQL.** `esquema_version` está en PostgreSQL y registra también las versiones de MongoDB y Neo4j. Un script de MongoDB o Neo4j se registra después de aplicarse; si falla a la mitad, se reintenta completo, y por eso esos scripts son idempotentes (`IF NOT EXISTS`, `collMod`).
- **SIGUIENTE.** Uso la consulta de 04-grafo con `p.fecha_hora < m.fecha_hora` en lugar de `<=`. Con `<=`, los movimientos de un mismo turno (que comparten fecha y hora) se encadenaban entre sí. Comprobado en OP-2026-0139: dos ramas, registro→CO→devolución y registro→FI.
- **Ejecutor con drivers síncronos.** Son las mismas bibliotecas (psycopg, PyMongo, neo4j); vive en `herramientas/`, fuera de las capas de la API.
- **Datos de más que tienen sentido.** El ejecutor llena `contador_folio` con el último consecutivo de cada área y año, para que T-05 continúe la numeración.

## Dudas

1. **Las pruebas de integración usan la base de desarrollo** y no `sigedoc_test` (arquitectura, sección 7). Son seguras porque cada caso se revierte; ¿se crean bases aisladas en T-05?
2. **OP-2026-0087 está `concluido` en la semilla sin movimiento de conclusión** (así viene del simulador). ¿Se agrega una conclusión a la semilla o se deja así?
