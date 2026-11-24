# Reporte T-09: Cierre: consistencia, respaldo, despliegue y evidencia medida

- Estado: completa

## Qué hice

1. **Desde cero.** Probé el despliegue en una copia limpia del repositorio (archivos versionados, sin `.env`, `.venv` ni `node_modules`), con otro nombre de proyecto de compose para tener volúmenes vacíos.
   - Seguí los comandos del README: `Copy-Item .env.example .env`, `docker compose up -d --build`, `uv sync` y `uv run python -m herramientas.esquemas --datos`.
   - Levantaron las bases (`healthy`), `api`, `outbox` y `web`, y se aplicaron los 7 scripts de PostgreSQL, 2 de MongoDB y 1 de Neo4j, con la semilla.
   - En <http://localhost:8080> (Nginx) inicié sesión con los cinco roles y abrí sus pantallas sin errores; oficialía ve sus 24 pendientes.
   - Después borré ese despliegue de prueba con sus volúmenes.
2. **Evidencia.** `docs/pruebas/evidencia.md` lo generó `uv run python -m herramientas.medir`, con todas las filas medidas en la última ejecución:
   - Conectividad: 200 `ok`.
   - Funcional: 41/41 en pytest y 10/10 en `npm test`.
   - Integridad: 20 registros simultáneos con 0 huecos y 0 repetidos; los 4 rechazos.
   - Integración: 20/20 documentos replicados; réplica con mediana 1017 ms (dominada por el intervalo de 1000 ms del outbox) y máximo 1070 ms; 140 eventos enviados y 0 fallidos.
   - Consistencia: 2 diferencias detectadas y corregidas; la segunda pasada da 0.
   - Errores: con Neo4j caído, la ficha marca recorrido y relaciones; al reanudar se entregan 3/3 eventos y no se pierde ninguno.
   - Rendimiento con 1200 documentos generados: p50 de 16 a 46 ms y p95 hasta 63 ms en las cinco consultas.
   - Comparación de C1: Cypher en 4 líneas, p50 6 ms; SQL en 17 líneas, p50 2 ms; mismo resultado en 50/50.
3. **Calidad.** `npm run lint`, `typecheck`, `test` y `build` en verde; `uv run ruff check . ../tests` sin observaciones; pytest 41/41 (dentro de la medición). Un solo commit `T-09: …` sin coautoría.

Lo que se creó:
- `herramientas/reconciliar.py` (O-40).
- `herramientas/respaldo.py` (O-41). Probé el respaldo, el borrado de los expedientes y la restauración: vuelven los 44.
- Servicio `web`: `frontend/Dockerfile` y `nginx.conf`, con `/api` hacia `api`.
- `herramientas/openapi.py`, que genera `docs/api/openapi.json` (53 operaciones).
- `herramientas/medir.py`.
- `docs/pruebas/` queda con `LEEME.md` (actualizado) y `evidencia.md`.
- README con la puesta en marcha desde cero y la operación; CLAUDE.md con los comandos nuevos.

## Desviaciones y decisiones

- **Errores que encontró la medición, ya corregidos:**
  - La bandeja tardaba unos 700 ms (p50) con el volumen generado. La vista `pendiente` buscaba la corrección de cada turno sin índice. Se agregó `007_indice_correcciones.sql`: la vista bajó de 353 ms a 8 ms y la bandeja a 46 ms.
  - Con Neo4j caído, el outbox también retrasaba el expediente de MongoDB, porque se quedaba reintentando el evento a Neo4j. Ahora el driver deja de reintentar a los 2 s (`max_transaction_retry_time`) y, cuando un destino falla, sus demás eventos del lote esperan a la siguiente vuelta mientras los del otro destino siguen. El expediente llega aunque Neo4j esté caído.
  - Nginx resolvía la IP de `api` solo al arrancar; ahora usa el DNS de Docker en cada petición (si se recrea `api`, `web` sigue funcionando).
- **Comparación.** El `WITH RECURSIVE` reconstruye la regla de SIGUIENTE sobre la bitácora (mismo origen que la llegada anterior, sin otra llegada intermedia). Se compara como conjunto de (paso, movimiento), porque los turnos de un mismo grupo empatan en el mismo paso y cada base los devuelve en otro orden. En SQL es más rápido (2 ms frente a 6 ms), pero son 17 líneas contra 4 y la regla vive dentro de la consulta.
- **Volumen.** Se carga directo en las tres bases con las funciones de la semilla (como O-41, sin outbox): 1200 documentos y 2977 movimientos en 4 semanas. Además, 40 de ellos se encadenan en el asunto «Laboratorios», para que el hilo C2 tenga 42 documentos.
- **Reconciliación.** Un expediente faltante de un tipo con campos obligatorios (auditoría o transparencia) se reporta pero no se reencola, porque sus datos del tipo no viven en PostgreSQL. Un tipo distinto entre bases solo se reporta (D-26).
- **Respaldo de Neo4j.** `neo4j-admin database dump` exige en Community la base detenida: el respaldo detiene el contenedor unos segundos y usa uno de un solo uso sobre el mismo volumen.
- **Variable nueva.** `WEB_PORT` (8080) en `.env.example`.

## Dudas

Ninguna.
