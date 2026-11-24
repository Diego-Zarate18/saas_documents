# Reporte T-05: Sesión, registro con outbox, turnos y bandeja

- Estado: completa

## Qué hice

1. `uv run pytest ../tests` da 29 pruebas pasadas (también con el servicio `outbox` de compose corriendo en paralelo). `uv run ruff check . ../tests` no marca nada.
2. Las siete pruebas pedidas están en `tests/integration/test_operaciones.py` y pasan todas. Pasan por la API (httpx asíncrono con el lifespan real) y recargan la semilla al empezar y al terminar.
   - `test_o36_credenciales_incorrectas_y_bloqueo`: mensaje genérico; tras 5 fallos la contraseña correcta ya no entra; la cookie es httpOnly; O-37 cierra la sesión.
   - `test_o01_folios_concurrentes_sin_huecos`: 20 POST simultáneos dan 20 consecutivos seguidos.
   - `test_o01_duplicado`: responde 409 `DUPLICADO` con `existente.folio = OP-2026-0139`, y el consecutivo no se consume.
   - `test_ri10_un_responsable_por_grupo`: la API rechaza 0 y 2 responsables, y la base rechaza un segundo responsable en el mismo grupo (`ux_responsable_por_grupo`).
   - `test_o23_atraccion_deja_un_responsable`: Compras y Finanzas quedan responsables a la vez (D-67). Servicios Generales atrae con origen CO y `otros_origenes` FI, ambas salen de su bandeja y SG queda responsable.
   - `test_o39_replica_documento_y_movimientos`: comprueba el nodo, SIGUIENTE de registro → turno a CO y a FI, y el expediente.
   - `test_o14_bandeja_refleja_el_turno`: el documento turnado aparece en Compras, sale de Oficialía, y Compras no ve otra bandeja (403).
3. Secuencia con `docker compose up -d --build` (las tres bases, `api` y `outbox`). Los cuerpos JSON van desde archivos UTF-8, porque Git Bash en Windows mandaba mal los acentos con `-d`.

   ```
   $ curl -c of.txt -X POST :8000/api/sesiones -d '{"correo":"mflores@institucion.gob.mx","contrasena":"sigedoc-dev"}'
   {"id_persona":"…0201","nombre":"Marta Flores","rol":"OF","id_area":"…0101","nombre_area":"Oficialía de partes"}
   $ curl -b of.txt -X POST :8000/api/documentos --data-binary @doc.json      # oficio de «Gobierno del estado»
   {"id":"63346a11-…","folio":"OP-2026-0153"}
   $ curl -b of.txt -X POST :8000/api/documentos/63346a11-…/turnos --data-binary @turno.json   # Compras, responsable
   {"id_grupo_turno":"82cd2a25-…","movimientos":[{"tipo":"turno","rol":"responsable","id_area_destino":"…0103",…}]}
   $ curl -c co.txt -X POST :8000/api/sesiones -d '{"correo":"rperez@…","contrasena":"sigedoc-dev"}'
   $ curl -b co.txt :8000/api/bandeja
   total 9
   OP-2026-0153 responsable 0 Turnado por Oficialía de partes | Invitación a la mesa de trabajo regional
   OP-2026-0152 responsable 4 Turnado por Oficialía de partes | Cotización de papelería 2027
   $ docker compose logs outbox  →  sigedoc.outbox: 4 eventos enviados
   Neo4j: registro→OP y turno→CO, unidos por SIGUIENTE; MongoDB: expediente 63346a11-… de tipo oficio
   ```

4. Un solo commit `T-05: …` sin coautoría.

Lo que se creó:
- Capas: `app/dominio`, `app/seguridad`, `app/repositorios/{relacional,documental,grafo}`, `app/servicios` y routers en `app/api`, más un manejador de problem details con `codigo`.
- Proceso del outbox: `backend/outbox/` y el servicio `outbox` en compose.
- Semilla: la conclusión de OP-2026-0087.

## Desviaciones y decisiones

- **Vista `pendiente` (script `005_vista_pendiente.sql`).** La regla de D-42 está escrita una sola vez y la usan la bandeja, la organización y los permisos de turnar, devolver y atraer. Es cálculo sobre la bitácora, no una tabla de estado.
- **OP-2026-0087.** Le agregué una conclusión de Compras con la forma `atencion_sin_oficio` (D-59) y su nota `evidencia_atencion` (D-19). Es una solicitud de equipamiento atendida sin oficio de respuesta, y ninguna salida la responde.
- **Bloqueo de cuenta.** Responde 401 `NO_AUTENTICADO` con «Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.». Las credenciales incorrectas siguen con el mensaje genérico.
- **Bandeja.** «Turnado por …» usa el nombre completo del área, porque la base no tiene el `nombre_corto` del simulador. La antigüedad se cuenta con el reloj real del servidor en America/Mexico_City, no con el `HOY` fijo del simulador.
- **Devolución.**
  - Si se manda un área sugerida con otro motivo, responde 422 «Solo se sugiere otra área cuando no es de su competencia.» (D-69).
  - La nota va en `instruccion`.
- **Atracción sin otra área responsable pendiente.** El origen es el área del último movimiento.
- **Concurrencia.** Turnar, devolver y atraer bloquean la fila del documento (`FOR UPDATE`) para escribir los movimientos de uno en uno. El folio se reserva con `UPDATE … RETURNING` sobre `contador_folio`, que bloquea la fila igual que `SELECT … FOR UPDATE`.
- **Outbox.**
  - Reintenta con espera de 2^intentos segundos y deja el evento en `error` al llegar a `OUTBOX_MAX_INTENTOS`.
  - Un evento no se toma mientras haya otro anterior del mismo documento y destino sin enviar (el orden importa para SIGUIENTE).
  - Los eventos llevan `datos.id_documento` para eso.
- **Código compartido.** `herramientas/esquemas.py` usa la misma consulta de SIGUIENTE (`app/repositorios/grafo/replica.py`) y el mismo scrypt (`app/seguridad/contrasenas.py`) que la API. Gana la opción `--reiniciar`: vacía las tres bases y recarga la semilla, y la usan las pruebas.
- **Configuración.** `config.py` lee `SESION_MINUTOS_INACTIVIDAD`, `OUTBOX_INTERVALO_MS` y `OUTBOX_MAX_INTENTOS`, con valores por omisión. El fixture de `tests/unit/test_config.py` les da un número.
- **Windows.** `python -m outbox` arranca con `SelectorEventLoop` por psycopg. Las filas de PostgreSQL ahora son diccionarios (`dict_row`), y por eso se ajustó una línea de `test_conectividad.py`.

## Dudas

1. ¿El conteo de pendientes y errores del outbox en `/api/salud` (arquitectura 3.2) va en T-06? El repositorio ya tiene `outbox.conteo`.
2. La bandeja muestra el `asunto` de un confidencial a quien vea el área. Así lo hace el simulador y el Apéndice A lo marca «Dudoso»; lo dejé igual.
