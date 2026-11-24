# T-07: Referencias, asuntos, consultas, búsqueda, administración y salidas

- Asignada: 2026-11-24
- Depende de: T-06 (`8246571`)
- Entrega: miércoles 25. Solo las pruebas que se piden aquí. Con esta tarea el backend queda completo.

## Fuentes

- `docs/guia-implementacion-backend.md`, Apéndice A, para cada función de abajo (D-106).
- `docs/modelos/` y el catálogo: O-07, O-08, O-18, O-20, O-21, O-27, O-30 a O-35; consultas C2, C3, C5; patrones AG-02 a AG-05, AG-07 a AG-09, AD-07; decisiones D-14, D-29, D-30, D-32, D-33, D-46, D-47, D-50, D-58, D-61, D-101.

## Alcance

1. **Ajustes a la ficha** (respuesta a las dudas de T-06):
   - Con acceso restringido, el registro trae solo folio, tipo, estado y ubicación actual; número, emisor, fechas y canal van en `null` (D-29, igual que O-30).
   - Las relaciones incluyen las que llegan al documento, no solo las que salen (AG-05), con su sentido.
2. **Referencias** (O-07, O-18): crear y quitar las cuatro relaciones, con DocumentoNoRegistrado por número y emisor (D-33). SUSTITUYE_A solo entre registrados: escribe en Neo4j y deja al otro `sin_efecto` con `estado_previo` en PostgreSQL; quitarla lo devuelve (D-14).
3. **Asuntos** (O-27, O-08, O-18): crear (con `id_documento` opcional), listar (`GET /asuntos`), asignar y sacar documentos.
4. **Consultas de grafo**: C2 hilo (`/asuntos/{id}/hilo`, hasta 6 saltos), C5 alcance y C3 rebotes, con la regla de D-32 y anclas de D-50.
5. **Búsqueda** (O-30): `GET /documentos` con todos los filtros, paginada; el filtro por campo del tipo consulta MongoDB y filtra la visibilidad en PostgreSQL (D-46). `GET /consultas/selector-documentos`.
6. **Administración** (O-32 a O-35): áreas (sin ciclos con consulta recursiva, D-47; siglas inmutables con folios, D-61; no desactivar con pendientes), personas y usuarios (baja lógica; si era titular, el área queda vacante) y actores externos. Cada cambio de área o persona encola su réplica a Neo4j.
7. **Salidas y acuses** (O-20, O-21): `POST /salidas`, `GET /salidas`, `POST /salidas/{id}/acuses`, `GET /consultas/acuses` (D-58, D-101).

## Fuera de alcance

Conectar el frontend, reconciliación, respaldo y evidencia (T-08).

## Criterios de aceptación

1. `uv run pytest ../tests` y `uv run ruff check . ../tests` en verde.
2. Pruebas nuevas, solo estas: `test_o07_no_registrado_y_sustitucion_reversible`, `test_c2_hilo_de_un_asunto`, `test_c3_rebotes`, `test_o30_busqueda_por_campo_del_tipo_con_visibilidad`, `test_o33_area_sin_ciclos` y `test_o21_acuse_aparece_al_area_responsable`.
3. Toda función del Apéndice A, salvo `usuariosPrueba`, tiene su endpoint. Anota en el reporte cualquier función que no tenga endpoint y por qué.
4. Un solo commit `T-07: …` sin coautoría.
