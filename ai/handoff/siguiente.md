# T-04: Las tres bases (E-4)

- Asignada: 2026-11-24
- Depende de: T-03 (`17d725a`)
- Entrega: el proyecto se entrega el miércoles 25. Prioriza que funcione; nada de pruebas ni documentos de más (README del handoff, «Ahorro de archivos y de tiempo»).

## Fuentes

- `docs/modelos/02-relacional.md`, `03-documental.md` y `04-grafo.md`: tablas, validador, restricciones e índices exactos. Es lo que se implementa.
- `docs/arquitectura.md`, sección 2: carpetas `database/` y `backend/herramientas/`.
- `docs/guia-implementacion-backend.md`, Apéndice A, «Datos de semilla que el backend debe reproducir».

## Alcance

1. **PostgreSQL**: scripts numerados en `database/relational/schema/` (`001_…sql`, …) con las 17 tablas, los CHECK, índices, índices parciales y disparadores de `02-relacional.md` (bitácora inmutable, tipo inmutable, siglas con folios, acuse solo de salida, `movimiento_origen` solo de atracción). Filas de los tres catálogos.
2. **MongoDB**: `database/document/validators/` con el `$jsonSchema` de `03-documental.md` y los dos índices parciales.
3. **Neo4j**: `database/graph/schema/` con las restricciones e índices de `04-grafo.md`.
4. **Ejecutor**: `python -m herramientas.esquemas` (desde `backend/`) aplica en orden lo que falte de las tres bases y lo registra en `esquema_version`; un script ya aplicado no se vuelve a aplicar. Opción `--datos` para cargar la semilla.
5. **Semilla**: `database/*/data/` con los datos del Apéndice A (áreas, personas y usuarios con contraseña de desarrollo, actores, documentos, movimientos, salidas, acuses, expedientes, asuntos y referencias). La carga escribe las tres bases de forma consistente (es la carga de O-41, no pasa por el outbox) y crea SIGUIENTE con la regla de `04-grafo.md`.
6. **Consultas representativas**: un archivo por base en `database/*/queries/` con 3 a 5 consultas cada uno (bandeja de D-42, recorrido C1, hilo C2, búsqueda por `ente_auditor`).
7. `README.md` y la sección «Comandos» de `CLAUDE.md`: cómo aplicar esquemas y cargar datos.

## Fuera de alcance

Repositorios, servicios, endpoints, outbox y sesiones (T-05). Destinatarios internos: la tabla `documento_destinatario` se crea vacía (HU-DEST).

## Criterios de aceptación

1. Con las bases vacías, `uv run python -m herramientas.esquemas --datos` termina sin errores; corrido otra vez no aplica nada nuevo ni duplica datos.
2. Una sola prueba de integración, `tests/integration/test_esquemas.py`, con cuatro casos: folio repetido rechazado, UPDATE de `movimiento` rechazado, expediente inválido rechazado por MongoDB y `Documento.id` repetido rechazado por Neo4j.
3. `uv run pytest ../tests` y `uv run ruff check . ../tests` en verde.
4. Las consultas de `queries/` corren sobre la semilla y devuelven filas.
5. Un solo commit `T-04: …` sin coautoría. Sin capturas ni carpetas de evidencia.
