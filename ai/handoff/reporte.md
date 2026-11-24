# Reporte T-06: Ficha, expediente y cierre del documento

- Estado: completa

## Qué hice

1. **Calidad.** `uv run pytest ../tests` da 35 pruebas pasadas (también con `api` y `outbox` de compose reconstruidos y corriendo). `uv run ruff check . ../tests` no marca nada.
2. **Las seis pruebas pedidas**, en `tests/integration/test_cierre.py`, pasan:
   - `test_o11_ficha_integrada_y_degradada`:
     - Con todo arriba, la ficha de OP-2026-0139 trae el expediente de MongoDB, el recorrido de cuatro pasos de Neo4j, las dos relaciones y el asunto.
     - Con Neo4j simulado como caído (la consulta del grafo lanza `ServiceUnavailable`), responde 200 con `secciones_no_disponibles = ['recorrido', 'relaciones']`, el mismo registro y el mismo expediente.
   - `test_o05_formas_y_requisitos`:
     - Rechaza cada requisito de D-59, y oficialía no concluye.
     - Las cinco formas concluyen: el documento sale de la bandeja y no se concluye dos veces.
     - Tras el outbox, la salida VI-2026-0001 queda con `id_responde_a` y `RESPONDE_A` en Neo4j, y la evidencia queda en MongoDB ligada al `id_movimiento` de la conclusión (D-19).
   - `test_o25_correccion_cambia_el_pendiente`: aplica las tres validaciones (RI-10 e igual al actual). Al corregir apoyo → conocimiento, Finanzas pierde el pendiente y Compras lo conserva.
   - `test_o26_mismo_documento_cancela_el_posterior`:
     - OP-2026-0141 aparece en la lista; su candidato es OP-2026-0140, con coincidencia de emisor y fecha.
     - Con «mismo» queda cancelado, con `duplicado_de` y el motivo «Duplicado de OP-2026-0140», sin la marca y con su movimiento conservado; sale de la lista y de la bandeja.
   - `test_o17_no_borra_evidencia`: la evidencia de OP-2026-0087 no se borra (409); un anexo ajeno no se quita (403); oficialía quita una nota general.
   - `test_d29_confidencial_oculto`:
     - En OP-2026-0109, oficialía ve el recorrido pero no el contenido, y no puede agregar notas. Quien lo registró sí lo ve. El personal de otra área tiene acceso restringido.
     - En la bandeja, Compras (titular y personal) ve la síntesis del confidencial de su área, y dirección viendo Compras o Jurídico ve `null`.
3. **Commit.** Un solo commit `T-06: …` sin coautoría.

Lo que se implementó:
- Ficha y recorrido: `GET /documentos/{id}` y `/recorrido`.
- Expediente: `GET`/`PATCH /documentos/{id}/expediente`, `POST …/anexos` y `…/notas`, y `DELETE …/{anexos|notas}/{id}`.
- Cierre: `POST /documentos/{id}/conclusion`, `/cancelacion`, `/recepciones` y `/resolucion-duplicado`.
- Correcciones: `POST /movimientos/{id}/correcciones`.
- Duplicados: `GET /consultas/posibles-duplicados` y `…/{id}/comparacion`.
- Vista `pendiente` con correcciones: script `006`.
- Visibilidad: función central `app/seguridad/visibilidad.py`, que usan la ficha, el expediente y la bandeja.

## Desviaciones y decisiones

- **Recorrido.** El orden y los ids salen de Neo4j (C1). Los detalles (nombres, instrucción, forma) se completan desde PostgreSQL, porque el nodo Movimiento no guarda `instruccion` ni `forma_conclusion`. Si Neo4j no responde, el recorrido, las relaciones y los asuntos quedan nulos y marcados (D-53). Un movimiento recién hecho aparece en el recorrido cuando el outbox lo replica.
- **Contenido oculto.** También oculta `asunto`, porque en PostgreSQL el asunto es la síntesis (D-43). El Apéndice A solo pedía ocultar `sintesis`, pero así el texto confidencial se filtraba por `asunto`.
- **Ficha restringida.** Sigue trayendo número, emisor, fechas y canal, como el simulador (el Apéndice A lo marca «Dudoso»).
- **RESPONDE_A de una conclusión con respuesta.** Se escribe por el outbox (evento `referencia`) en la misma transacción que la conclusión, aunque la respuesta sea un documento recibido (D-24 dice que el backend escribe las referencias directo en Neo4j). Así no queda una conclusión sin su referencia. Si la salida ya respondía a otro documento, `id_responde_a` se reemplaza (el Apéndice A lo marca «Dudoso»).
- **Otros eventos del outbox.** `estado` (Neo4j) y `nota` (MongoDB, con `$push` condicionado al id para que el reintento no la duplique). Un evento cuyo nodo o expediente aún no existe falla y se reintenta.
- **Conclusión.** Origen y destino son el área que concluye; la `instruccion` lleva el folio enlazado. Con `duplicado` también se guarda `duplicado_de`.
- **O-17.** `DELETE /documentos/{id}/expediente/{anexos|notas}/{id_elemento}`. Roles OF y PE; el no autor recibe 403 «Solo quita un anexo o una nota su autor u oficialía.». La evidencia recibe 409 `ESTADO_INVALIDO`, y además el `$pull` la excluye.
- **Mensajes nuevos.**
  - O-19: «La segunda recepción no puede ser anterior a la primera.» (422), por el CHECK de la tabla.
  - O-25: «Elige el rol corregido.» para un rol desconocido.
  - O-05: «Elige la forma de conclusión del catálogo.».
- **Expediente aún no creado.** Si el outbox no lo ha creado, las escrituras y la lectura del expediente responden 503 `BASE_NO_DISPONIBLE`.
- **Pruebas.** Las fixtures (`semilla`, `api`) pasaron a `tests/integration/conftest.py` y los ayudantes a `apoyo_api.py`. `test_operaciones.py` los usa sin cambiar lo que comprueba.

## Dudas

1. ¿La ficha restringida debe ocultar también número, emisor y fechas (D-29 dice «solo estado y responsable»)?
2. ¿Las relaciones de la ficha deben incluir también las entrantes (por ejemplo, la salida que responde a este documento)? Hoy solo muestra las salientes, como el simulador.
