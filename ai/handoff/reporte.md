# Reporte T-07: Referencias, asuntos, consultas, búsqueda, administración y salidas

- Estado: completa

## Qué hice

1. **Calidad.** `uv run pytest ../tests` da 41 pruebas pasadas (con `api` y `outbox` de compose reconstruidos y corriendo, sin fallos en el outbox). `uv run ruff check . ../tests` no marca nada.
2. **Las seis pruebas pedidas**, en `tests/integration/test_consultas.py`, pasan:
   - `test_o07_no_registrado_y_sustitucion_reversible`:
     - Un no registrado con espacios de más se reutiliza: hay un solo nodo para el mismo número y emisor, y repetir la relación da 409.
     - `sustituye_a` con un no registrado o consigo mismo da 422.
     - SUSTITUYE_A deja OP-2026-0137 en `sin_efecto` con `estado_previo = en_tramite`; su ficha la muestra con sentido `entra`, y quitarla lo devuelve a `en_tramite`.
     - Quitar dos veces el no registrado da 404.
   - `test_c2_hilo_de_un_asunto`:
     - El asunto «Laboratorios» da sus dos documentos (profundidad 0, por folio), la salida CO-2026-0048 (`responde_a`/`entra`, sin `id_documento`) y el no registrado SIS/0198/2026 (`en_alcance_a`/`sale`).
     - Servicios Generales ve los estados, pero no las descripciones.
     - Un asunto nuevo con documento aparece en `GET /asuntos` y en su hilo.
   - `test_c3_rebotes`:
     - Noviembre 2026 da 0131 `tres_devoluciones`, 0118 y 0129 `no_competencia_sin_area` (0129, confidencial, sin asunto para dirección) y 0097 `tres_areas` con 4 áreas.
     - Con `id_area` de Recursos Humanos queda solo 0131; con un periodo inválido, 422; personal, 403.
   - `test_o30_busqueda_por_campo_del_tipo_con_visibilidad`:
     - «interno de control» encuentra 0143, 0133 y 0108 para oficialía, pero no el requerimiento confidencial que registró Carmen (ella sí lo encuentra). El personal de Compras solo encuentra 0133.
     - Por folio, un documento de otra área sale `restringida` sin número ni síntesis.
     - El filtro de texto no coincide con un confidencial ajeno.
   - `test_o33_area_sin_ciclos`:
     - Tres ciclos rechazados: la raíz bajo una de sus hijas, Jurídico bajo Transparencia y Compras bajo su propia hija nueva.
     - Las siglas de un área con folios no cambian (409).
     - No se desactiva un área con pendientes ni con hijas activas; sí una vacía. Oficialía no administra áreas.
   - `test_o21_acuse_aparece_al_area_responsable`:
     - La salida de Compras recibe CO-2026-0050, en la misma secuencia que sus documentos.
     - Con el acuse, OP-2026-0121 aparece en `GET /consultas/acuses` del titular y del personal de Compras, y no en el de Finanzas.
     - Un segundo acuse da 409; el acuse de un documento recibido da 404.
3. **Endpoints.** Las 46 funciones del Apéndice A, salvo `usuariosDePrueba` (es una constante del modo simulado y la API real exporta `[]`), tienen su endpoint, con la ruta del Apéndice. Lo comprobé contra el OpenAPI generado.
4. **Commit.** Un solo commit `T-07: …` sin coautoría.

Lo que se implementó:
- Ajustes a la ficha: la restringida trae solo folio, tipo, estado y ubicación; las relaciones van en ambos sentidos, con `sentido`.
- Referencias: `POST /documentos/{id}/referencias` y `DELETE …/referencias/{tipo}?referencia=&emisor=`.
- Asuntos: `/asuntos` (listar, crear, asignar, sacar, hilo, alcance).
- Consultas: `/consultas/rebotes`, `/consultas/selector-documentos` y `/consultas/acuses`.
- Búsqueda: `GET /documentos`.
- Administración: `/areas` (POST, PATCH, desactivación), `/personas` (GET, POST, PATCH, baja) y `/actores-externos` (GET, POST, PATCH, desactivación).
- Salidas: `/salidas` (GET, POST y acuses).
- Réplica de áreas y personas por el outbox.

## Desviaciones y decisiones

- **Windows y Neo4j.** El driver de Neo4j se cae (access violation) al serializar un `datetime` con zona `ZoneInfo`. Los límites del periodo de C3 se mandan en UTC.
- **Campo del tipo (O-30).** Se busca con «contiene» y sin distinguir mayúsculas (`$regex` con `i`, escapado), como pide el Apéndice A. Ese tipo de consulta no aprovecha el índice parcial con colación (D-46), que sirve para igualdad; los acentos deben coincidir. La visibilidad se filtra después en PostgreSQL.
- **Rebotes (C3).** Se anclan en el índice de fecha de los movimientos (D-50). Las correcciones no se cuentan como movimientos y tampoco cambian el rol de los turnos que corrigen. «Oficialía» son las áreas de las personas con rol OF.
- **Hilo (C2).**
  - Cada nodo queda con su camino más corto, y la relación es la última de ese camino.
  - El orden es: los del asunto por folio y luego por profundidad y referencia (anchura, en lugar del preorden exacto).
  - Una salida trae `id_documento` nulo, como pide el contrato.
- **SUSTITUYE_A.** Si el documento sustituido ya no está vigente (cancelado o sin efecto), responde 422 «El documento sustituido ya no está vigente.». Es nuevo: el Apéndice A lo marcaba «Dudoso».
- **Grafo atrasado.** Una referencia o asunto sobre un documento que el outbox aún no replica responde 503 `BASE_NO_DISPONIBLE`.
- **Salidas.**
  - Un tipo con campos obligatorios (requerimiento de auditoría, solicitud de transparencia) da 422 «Ese tipo de documento no se usa en una salida.», porque el expediente de una salida no lleva campos del tipo y el validador de MongoDB los exige.
  - El RESPONDE_A de una salida viaja por el outbox detrás del nodo de la salida.
- **Personas.**
  - Una cuenta nueva recibe la contraseña inicial de desarrollo (`sigedoc-dev`, con hash): el contrato no trae contraseña y no hay flujo de cambio.
  - La baja revoca sus sesiones.
- **Paginación.** `GET /asuntos`, `/salidas` y `/consultas/posibles-duplicados` aceptan `pagina` y `tamano` (D-106).

## Dudas

1. ¿Se agrega un flujo de cambio de contraseña para las cuentas que crea el administrador, o basta con la inicial de desarrollo para la entrega?
