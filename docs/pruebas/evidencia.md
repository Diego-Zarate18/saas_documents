# Evidencia de ejecución

Generado por `uv run python -m herramientas.medir` (desde `backend/`) contra el despliegue de `docker compose up -d --build`. Cada resultado sale de esta ejecución; nada es estimado. La semilla se recarga al empezar y al terminar.

## Entorno

- Fecha: 2026-11-24T12:23:14-06:00
- Sistema: Windows-11-10.0.26300-SP0
- CPU: 13th Gen Intel(R) Core(TM) i7-13620H (16 hilos)
- RAM: 15.6 GB
- Docker: 29.1.3
- PostgreSQL 17.12 · MongoDB 8.0.38 · Neo4j 5.26.34 (contenedores de docker-compose)
- Python 3.13.18 · Node v24.22.3
- API: http://127.0.0.1:8000/api (contenedor `api`); outbox: contenedor `outbox`, intervalo 1000 ms
- Volumen para rendimiento y comparación: 1200 documentos y 2977 movimientos generados (4 semanas de temporada alta, D-35) más la semilla, cargados en las tres bases en 19.5 s.

## Resultados

| Tipo de prueba (guía, sección 9) | Escenario | Resultado medido |
| --- | --- | --- |
| Conectividad | `GET /api/salud` con las tres bases | HTTP 200, `ok`: postgres ok 4 ms, mongo ok 2 ms, neo4j ok 15 ms |
| Funcional | `uv run pytest ../tests` (unitarias e integración) | 41 pasadas de 41 |
| Funcional | `npm test` (componentes y reglas de la interfaz) | 10 pasadas de 10 |
| Integridad | 20 registros simultáneos en oficialía (D-21) | 20 registrados, 153–172: 0 huecos, 0 repetidos |
| Integridad | Folio repetido, UPDATE de movimiento, expediente inválido, id repetido en Neo4j | folio repetido → `folio_id_documento_key`; UPDATE de movimiento → disparador `movimiento_inmutable`; expediente sin `ente_auditor` → código 121 de MongoDB; `Documento.id` repetido → restricción `documento_id` de Neo4j (4 de 4 rechazados) |
| Integración | Registrar → turnar → outbox → ficha con las tres bases (20 documentos) | 20/20 replicados; réplica mediana 1017 ms, máximo 1070 ms; outbox: 140 enviados, 0 fallidos, 0 pendientes |
| Consistencia | Estado cambiado a mano en Neo4j y expediente borrado en MongoDB; `herramientas.reconciliar` | 2 diferencias detectadas (expediente_faltante: 1, documento_distinto_en_neo4j: 1); 2 reencoladas y entregadas; segunda pasada: 0 diferencias |
| Errores | Neo4j detenido: registrar y abrir la ficha; reanudar | registro HTTP 201; ficha HTTP 200 con `secciones_no_disponibles = ['recorrido', 'relaciones']`; 2 eventos a Neo4j pendientes durante la caída; al reanudar, 3/3 enviados en 4 s; 0 perdidos |
| Rendimiento | Bandeja de oficialía (`GET /api/bandeja`, 100 por página), 50 peticiones | p50 46 ms, p95 53 ms, 0 con error |
| Rendimiento | Ficha integrada (`GET /api/documentos/{id}`), 50 peticiones | p50 34 ms, p95 63 ms, 0 con error |
| Rendimiento | Recorrido C1 (`GET /api/documentos/{id}/recorrido`), 50 peticiones | p50 27 ms, p95 43 ms, 0 con error |
| Rendimiento | Búsqueda O-30 por texto (`GET /api/documentos?texto=`), 50 peticiones | p50 16 ms, p95 21 ms, 0 con error |
| Rendimiento | Hilo C2 de un asunto con 42 documentos (`GET /api/asuntos/{id}/hilo`), 50 peticiones | p50 37 ms, p95 50 ms, 0 con error |
| Comparación | Recorrido C1 de 50 documentos: Cypher sobre SIGUIENTE frente a `WITH RECURSIVE` sobre la bitácora | Cypher: 4 líneas, p50 6 ms; SQL: 17 líneas, p50 2 ms; mismo resultado en 50/50 |
