# T-05: Sesión, registro con outbox, turnos y bandeja

- Asignada: 2026-11-24
- Depende de: T-04 (`e3a0fdd`)
- Entrega: miércoles 25. Prioriza que funcione; pruebas y documentos solo los que se piden aquí.

## Fuentes

- `docs/guia-implementacion-backend.md`, Apéndice A: ruta, cuerpo, salida, errores y reglas de cada función. **Las rutas son las del Apéndice A, incluidos los marcados «ajuste» y «nuevo»** (D-106).
- `docs/arquitectura.md`, secciones 3 (capas y flujos), 4 (errores RFC 9457 con `codigo`, paginación `{elementos,total}`) y 6 (variables).
- `docs/modelos/02-relacional.md` y `04-grafo.md` (réplica y regla de SIGUIENTE).
- Catálogo: O-01, O-03, O-14, O-22, O-23, O-31, O-32, O-36 a O-39; decisiones D-21, D-27, D-29, D-31, D-42, D-44, D-49, D-67, D-68, D-106, D-107.

## Alcance

1. **Capas** según la arquitectura: `app/dominio/` (enums y modelos Pydantic), `app/seguridad/` (sesión y visibilidad), `app/repositorios/{relacional,documental,grafo}/`, `app/servicios/`, `app/api/` (un router por recurso, prefijo `/api`), manejador de errores con `codigo`.
2. **Sesión** (O-36, O-37, O-38): `POST /sesiones`, `GET /sesiones/actual`, `DELETE /sesiones/actual`. Cookie httpOnly, huella SHA-256 en `sesion`, caducidad por inactividad, bloqueo de 15 minutos tras 5 intentos fallidos (D-107); las contraseñas se comprueban con el mismo scrypt de la semilla. Dependencia `ContextoUsuario` con rol, área y áreas visibles (D-29) para todos los endpoints.
3. **Catálogos y áreas** (O-31, O-32 de lectura): `GET /catalogos`, `GET /areas?activas=true`, `GET /organizacion`.
4. **Registro** (O-01): `POST /documentos` y `GET /documentos/folio-siguiente`. Una transacción: folio con contador bloqueado (D-21), duplicado por índice parcial (D-27, error `DUPLICADO` con el existente), movimiento `registro` y eventos de outbox para MongoDB (expediente) y Neo4j (nodo y movimiento).
5. **Outbox** (O-39): `backend/outbox/`, `python -m outbox`. Un proceso, orden por id, `SKIP LOCKED`, reintentos con espera creciente hasta `OUTBOX_MAX_INTENTOS`, upsert en MongoDB y `MERGE` en Neo4j con la regla de SIGUIENTE. Servicio `outbox` en `docker-compose.yml`.
6. **Recorrido** (O-03, O-22, O-23): `POST /documentos/{id}/turnos`, `/devoluciones`, `/atracciones`, con las reglas y permisos del Apéndice A, RI-10 y D-67, D-68 (atracción con `movimiento_origen`). Cada movimiento encola su réplica. Diferencias con el simulador: área sugerida solo con `no_competencia` y la nota de la devolución en `instruccion` (`05-diccionario-y-reglas.md`).
7. **Bandeja** (O-14): `GET /bandeja` con la regla de D-42 calculada en PostgreSQL (AR-06), paginada.
8. **Semilla**: agrega a OP-2026-0087 su movimiento `conclusion` (por el área que lo tenía como responsable, con la forma de D-59 que corresponda a su contenido; anota cuál en el reporte) para que cumpla RI-14. El outbox usa la misma consulta de SIGUIENTE que `herramientas/esquemas.py` (con `<`).

## Fuera de alcance

Una base de pruebas aparte: las pruebas de integración siguen contra la base de desarrollo y deshacen lo que escriben o recargan la semilla.

Ficha, expediente, conclusión y demás operaciones (T-06 y T-07). Conectar el frontend (T-08).

## Criterios de aceptación

1. `uv run pytest ../tests` y `uv run ruff check . ../tests` en verde.
2. Pruebas nuevas, solo estas: `test_o36_credenciales_incorrectas_y_bloqueo`, `test_o01_folios_concurrentes_sin_huecos` (20 registros simultáneos en la misma área), `test_o01_duplicado`, `test_ri10_un_responsable_por_grupo`, `test_o23_atraccion_deja_un_responsable`, `test_o39_replica_documento_y_movimientos` (registrar, turnar a dos áreas, correr el outbox y comprobar el nodo, SIGUIENTE y el expediente) y `test_o14_bandeja_refleja_el_turno`.
3. Con `docker compose up -d`, una secuencia con `curl` o `httpie` en el reporte: iniciar sesión como oficialía, registrar, turnar y ver la bandeja del área destino.
4. Un solo commit `T-05: …` sin coautoría.
