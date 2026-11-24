# T-09: Cierre: consistencia, respaldo, despliegue y evidencia medida

- Asignada: 2026-11-24
- Depende de: T-08 (`efc7958`)
- Entrega: miércoles 25. Esta tarea produce los números del póster y la evidencia que pide la guía (secciones 9 y 12).

## Alcance

1. **Reconciliación** (O-40): `python -m herramientas.reconciliar` compara existencia, estado y tipo entre las tres bases y las sustituciones a medias (D-14, D-26), reporta diferencias y reencola en el outbox lo que falte.
2. **Respaldo y carga** (O-41): `python -m herramientas.respaldo` con `pg_dump`, `mongodump` y `neo4j-admin database dump` a `respaldos/` (ignorada por git), y restauración.
3. **Despliegue**: servicio `web` en `docker-compose.yml` (frontend compilado servido como estático, con `/api` hacia la API). `docker compose up -d --build` levanta todo desde cero; `README.md` explica instalación, configuración, carga de datos y ejecución.
4. **OpenAPI**: exportar a `docs/api/openapi.json`.
5. **Medición**: `python -m herramientas.medir` ejecuta los escenarios de abajo contra las bases levantadas y escribe `docs/pruebas/evidencia.md` con fecha, entorno (CPU, RAM, sistema, versiones) y una tabla «tipo de prueba · escenario · resultado medido». Volumen: genera 4 semanas de temporada alta (unos 1200 documentos con sus movimientos, D-35) antes de medir rendimiento, y recarga la semilla al final.

| Tipo (guía, sección 9) | Escenario | Resultado que se registra |
|---|---|---|
| Conectividad | `/api/salud` con las tres bases | Estado y ms por base |
| Funcional | Las pruebas de `pytest` y de `npm test` | Pasadas / total de cada una |
| Integridad | 20 registros simultáneos; folio repetido; UPDATE de movimiento; expediente inválido; id repetido en Neo4j | Huecos y repetidos (0); rechazos |
| Integración | Registrar → turnar → outbox → ficha con las tres bases | Tiempo de réplica (mediana y máximo, ms); eventos enviados y fallidos |
| Consistencia | Contradicción inducida (cambiar a mano el estado en Neo4j y borrar un expediente) y reconciliar | Diferencias detectadas y corregidas |
| Errores | Neo4j detenido: registrar y abrir la ficha; reanudar | La ficha responde con la sección marcada; eventos pendientes y luego enviados, 0 perdidos |
| Rendimiento | 50 peticiones de bandeja, ficha, recorrido C1, búsqueda e hilo C2 con el volumen generado | p50 y p95 en ms |
| Comparación | Recorrido C1 en Cypher frente al mismo recorrido con `WITH RECURSIVE` en PostgreSQL sobre la bitácora | Líneas de cada consulta y p50 en ms |

6. `docs/pruebas/`: borrar los `T-xx-*.md` de tareas anteriores; queda solo `LEEME.md` y `evidencia.md`.

## Fuera de alcance

Cambio de contraseña y nuevas pantallas. Si la medición descubre un error, se corrige y se anota en el reporte.

## Criterios de aceptación

1. Desde un clon limpio, `docker compose up -d --build` y los comandos del README dejan la aplicación usable en el navegador.
2. `docs/pruebas/evidencia.md` generado por `herramientas.medir`, con todas las filas llenas por la ejecución.
3. Pruebas y lint en verde. Un solo commit `T-09: …` sin coautoría.
