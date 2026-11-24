# Guía de implementación del backend de SIGEDOC

Documento de trabajo del revisor para quien implemente el backend (T-03 en adelante). No sustituye a `docs/arquitectura.md` ni al grafo de conocimiento: los resume, los ordena para implementar y agrega lo que la interfaz simulada ya dejó fijado. Si algo aquí contradice al grafo, manda el grafo y se reporta.

- Estado: **borrador 1**, escrito antes del inventario de la T-02c. Las secciones marcadas «se completa con la T-02c» se terminan cuando llegue `ai/handoff/borradores/contrato-api.md`.
- Última revisión: 2026-11-24.

## 1. Cómo usar esta guía

1. Antes de implementar una operación, lee su fila en `docs/operaciones/catalogo.json` y las reglas que cita (skill `consultar-grafo`; no leas `grafo.json` completo).
2. Abre su fila en el inventario (apéndice A): ahí está lo que el simulador hace hoy y los nombres de las pruebas del frontend que la cubren.
3. Implementa con la lista de verificación de la skill `implementar-operacion`.
4. Las pruebas de aceptación de cada operación salen del simulador: **el simulador es el contrato ejecutable** de la interfaz. Un comportamiento que la interfaz ya usa no se cambia en el backend sin reportarlo.

## 2. Fuentes de verdad, en orden

1. Grafo de conocimiento (`docs/grafo-conocimiento/grafo.json`) y catálogo de operaciones.
2. `docs/arquitectura.md` (capas, contrato, bases, pruebas).
3. Guía del profesor (`docs/guia/`): organización del repositorio, siete tipos de prueba, evidencia de ejecución.
4. El simulador del frontend (`frontend/src/api/simulado/`) y su inventario, para el detalle fino.

Los ids de operación del catálogo mandan sobre cualquier lista informal.

## 3. Estructura del repositorio y del backend

La de `docs/arquitectura.md` sección 2. Resumen para el backend:

```
backend/
├── pyproject.toml            uv; versiones fijas en uv.lock
└── app/
    ├── main.py               app, routers, CORS, manejadores de error
    ├── config.py             pydantic-settings; falla al iniciar si falta una variable
    ├── api/               un router por recurso; sin lógica de negocio
    ├── servicios/            una función por operación O-xx
    ├── repositorios/
    │   ├── relacional/       PostgreSQL (AR-xx)
    │   ├── documental/       MongoDB (AD-xx)
    │   └── grafo/            Neo4j (AG-xx)
    ├── dominio/              modelos Pydantic, enums, errores
    ├── seguridad/            sesiones (D-49) y visibilidad (D-29)
    └── infra/                pools y clientes, unidad de trabajo
```

Fuera de `backend/`: `database/` (esquemas, validadores, datos y consultas por base), `tests/` (`unit`, `integration`, `e2e`; se corre con `uv run pytest ../tests`), `docs/pruebas/` (evidencia), `docs/api/openapi.json` (exportado al final).

Crea una carpeta o un módulo solo cuando una tarea lo necesite.

## 4. Convenciones

| Tema | Regla |
| --- | --- |
| Capas | `api → servicios → repositorios → infra`; todos pueden usar `dominio`. Solo los repositorios usan drivers. Sin ORM. |
| Consultas | Siempre parametrizadas (SQL, Cypher y MongoDB). |
| Trazabilidad | Docstring de cada servicio empieza con `O-xx`; la de cada repositorio, con `AR-xx`, `AD-xx` o `AG-xx`. Pruebas: `test_o01_…`, `test_ar01_…`. |
| Nombres | Código y rutas sin acentos ni ñ, en español; JSON en `snake_case`. |
| Visibilidad | Toda función de repositorio que lea documentos recibe `ctx: ContextoUsuario` obligatorio y sin valor por defecto (D-29, DT-13). |
| IDs | UUID generado por el backend, el mismo en las tres bases (D-15). |
| Fechas | ISO 8601 con zona; en UTC en las bases; la interfaz las muestra en America/Mexico_City. |
| Paginación | `?pagina=&tamano=` (máximo 100); respuesta `{ "elementos": [], "total": n }`. |
| Errores | *Problem details* (RFC 9457) más `codigo`: `NO_AUTENTICADO`, `SIN_PERMISO`, `NO_ENCONTRADO`, `VALIDACION`, `DUPLICADO`, `ESTADO_INVALIDO`, `CONFLICTO`, `BASE_NO_DISPONIBLE`. |
| Seguridad | Sesión en cookie `httpOnly`, `SameSite=Lax`; en la base solo la huella SHA-256 (D-49). Contraseñas con hash. Sin secretos en git. |
| Dependencias | Solo las pedidas por la tarea. |

## 5. Escritura y lectura entre las tres bases

Resumen de `docs/arquitectura.md` secciones 3 y 5; léelas completas antes de T-08.

- **Escritura con fuente en PostgreSQL** (O-01, O-03, O-05, O-19 a O-26): una transacción escribe el registro oficial y encola en el `outbox` un registro por destino con el payload completo. La API no escribe en MongoDB ni en Neo4j en ese flujo. El proceso del outbox (O-39) entrega en orden con `FOR UPDATE SKIP LOCKED`, de forma idempotente (upsert por `_id` y `MERGE`).
- **Fuente en Neo4j** (O-07, O-08, O-18, O-27): se verifica en PostgreSQL y se escribe directo. `SUSTITUYE_A` escribe primero en Neo4j y luego cambia el estado en PostgreSQL; la reconciliación (O-40) detecta la mitad escrita (D-14).
- **Fuente en MongoDB** (O-09, O-17, O-28, O-29): se verifica visibilidad y estado en PostgreSQL y se escribe en MongoDB. El tipo nunca se actualiza (D-26).
- **Ficha (O-11, D-53):** PostgreSQL primero; MongoDB y Neo4j en paralelo con tiempo límite. Si una falla, la sección se marca no disponible; la ficha no falla.
- **La API valida el contenido por tipo con modelos Pydantic equivalentes al `$jsonSchema`** de MongoDB y una prueba compara ambos (la API acepta, MongoDB no debe rechazar).
- **Neo4j:** toda consulta parte de un `Documento`, un `Asunto` o de movimientos filtrados por fecha con índice, nunca de un `Area`; recorridos limitados a `*..6` (D-50).

## 6. Reglas que el simulador ya fija

Estas reglas ya tienen prueba en el frontend con el id de la regla en el nombre; el backend debe cumplirlas igual. Lista de referencia (el detalle por operación está en el inventario):

| Regla | Qué implica |
| --- | --- |
| D-21 | Folio consecutivo por área emisora y año, sin huecos ni repeticiones ni con registros simultáneos. Las salidas usan las siglas del área emisora (`CO-2026-0048`). |
| D-27, O-19 | Con número, emisor y año repetidos O-01 no crea nada: responde `DUPLICADO` con el existente y ofrece segunda recepción. Sin número o sin fecha se marca `posible_duplicado`. |
| D-29 | Cada área ve completo lo suyo; de otras áreas solo estado y responsable; oficialía y dirección ven el recorrido completo; el confidencial lo ven el titular del área y quien tiene movimiento sobre él. |
| D-33 | Un documento no registrado se identifica por número y emisor. |
| D-42, D-67 | El área tiene el documento pendiente hasta que hay un movimiento de salida desde ella, la conclusión o la cancelación. Un turno de oficialía o dirección sobre un pendiente de otra área no cierra el de esa área. |
| D-44 | Cinco roles (OF, DI, TI, PE, AD). Oficialía y dirección turnan cualquier documento; el titular hace turnos directos de lo que tiene pendiente, devuelve, returna y atrae; el personal atiende y concluye solo si su área es responsable. |
| D-58 | Oficialía registra el acuse; el área responsable concluye. |
| D-59 | Cinco formas de concluir: `con_respuesta`, `atencion_sin_oficio`, `enterado`, `no_procede`, `duplicado`; los requisitos de cada una están en O-05. |
| D-60, D-66 | Núcleo en PostgreSQL; campos propios por tipo en MongoDB con esquema versionado: `ente_auditor` y `puntos` (auditoría), `solicitante` (transparencia), `concepto` (material o pago). |
| D-65 | Siete tipos: `oficio`, `solicitud_material_pago`, `requerimiento_auditoria`, `solicitud_transparencia`, `memorandum`, `circular`, `informe`. |
| D-68 | Atraer deja una sola área responsable: dejan de tenerlo pendiente como responsable todas las demás. |
| D-69, D-70 | Neo4j: el Movimiento se une con `SOBRE` al Documento, `DESDE` y `HACIA` a las áreas y `REALIZADO_POR` a la Persona; `SIGUIENTE` se crea al replicar, desde el movimiento más reciente que llegó al área de origen (uno por cada origen en una atracción). Propiedades y caso límite en D-69 y D-70; ambos son supuesto hasta E-2. |
| D-71 | API sin versionado: prefijo `/api` y carpeta `api/`. |
| D-72 | `GET /catalogos` (O-31) devuelve también las listas cerradas: canales, roles de usuario, roles de turno, estados, tipos de relación y tipos de actor. Son fijas; no se administran. |
| RI-06 | Todo documento tiene emisor: un área activa o un actor externo activo. |
| RI-10 | Un solo responsable por grupo de turno. |
| D-47 | Jerarquía de áreas sin ciclos, validada con consulta recursiva dentro de la transacción; no se desactiva un área con pendientes ni con áreas activas que dependan de ella. |
| D-20 | Se desactiva, no se borra (áreas, actores, personas). Las siglas son fijas mientras el área tenga folios emitidos. |

### Lo que el simulador hace y el backend no debe copiar

Cuando el simulador y el grafo difieren, manda el grafo (D-57). Las diferencias que más importan son de visibilidad (D-29); el inventario las marca «Dudoso» en cada ficha:

- **Ficha con acceso restringido.** El simulador sigue mostrando número de emisor, emisor, fechas y canal. El backend devuelve solo estado y responsable a quien no tiene acceso completo (el mismo criterio que ya aplica el simulador al ocultar el número en O-30).
- **Asunto de un documento confidencial en la bandeja.** El simulador lo muestra a todo el personal del área. El backend lo muestra solo a quien tiene acceso al documento: el titular del área y quien tiene movimiento sobre él.
- **Listado y alcance de asuntos.** El simulador cuenta documentos y áreas que el usuario no ve. El backend cuenta y lista solo lo que la visibilidad permite (C5, O-27).

Otras decisiones dudosas del simulador, que el backend sigue **sin** copiar: aceptar áreas inactivas al turnar, devolver o registrar una salida; dejar al destino como responsable cuando devuelve un área de apoyo; no revisar el estado de los documentos al usar `sustituye_a`; no exigir que el documento esté en trámite en O-19; guardar el motivo de cancelación sin devolverlo; y permitir asuntos con el mismo nombre. Cada una se resuelve con la regla del grafo o del catálogo y se confirma en la tarea correspondiente.

## 7. Mapa de endpoints

Punto de partida: la tabla de `docs/arquitectura.md` sección 4. Lo que el simulador agrega o ajusta queda aquí hasta que el inventario lo confirme:

| Endpoint | Op. | Estado |
| --- | --- | --- |
| `GET /documentos/folio-siguiente` | lectura de V-03 | nuevo, a confirmar (T-15) |
| `GET /consultas/acuses` | tarjeta «Acuses» (D-58) | nuevo, a confirmar |
| `GET /consultas/posibles-duplicados` y `GET …/{id}/comparacion` | V-14 | nuevo, a confirmar |
| `GET /salidas` | V-13 | nuevo, a confirmar |
| `GET /asuntos` | V-11b y selector de V-11 | nuevo, a confirmar |

Ruta, método, cuerpo y errores definitivos por función: Apéndice A (T-02c). Los **ajustes** que conviene decidir: `DELETE /documentos/{id}/referencias/{tipo}?referencia=&emisor=` (un documento no registrado no tiene id), `POST /salidas/{id}/acuses` en lugar de `/documentos/{id}/acuses` y un solo `GET /consultas/selector-documentos` que incluye salidas.

## 8. Orden de implementación y qué reutilizar

> El plan vigente (T-04 a T-08, tareas agrupadas) está en `docs/arquitectura.md`, sección 10. Esta tabla queda como mapa de qué pruebas del simulador cubren cada grupo de operaciones.

| Tarea | Qué entrega | De dónde sacar los casos de aceptación |
| --- | --- | --- |
| T-03 | Esqueleto, tres bases en docker-compose, `/salud` | Hecha (`17d725a`) |
| T-04 a T-06 | Esquemas, validadores y restricciones de cada base, con datos y consultas | Datos de semilla del inventario; tablas de reglas de esta guía; `docs/modelos/` (E-2) |
| T-07 | Sesiones, roles y visibilidad (O-36 a O-38) | Usuarios de prueba del simulador; pruebas `d29_`, `d44_` |
| T-08 | O-01 y outbox O-39, concurrencia de folios | `o01_…`, `d21_…` |
| T-09 | Turnos, devoluciones, atracción y bandeja | `o03_…`, `o22_…`, `o23_…`, `o14_…`, `d42_`, `d67_`, `d68_` |
| T-10 | Ficha, recorrido y expediente | `o11_…`, `o09_…`, `o28_…`, `o29_…`, `d66_…` |
| T-11 | Conclusión, cancelación, corrección, duplicados, segunda recepción | `o05_…`, `d59_…`, `o24_…`, `o25_…`, `o26_…`, `o19_…` |
| T-12 | Referencias y asuntos; C2, C3, C5 | `o07_…`, `o08_…`, `o18_…`, `o27_…`, `c2_…`, `c3_…`, `c5_…` |
| T-13 | Búsqueda, catálogos, administración y salidas | `o30_…` a `o35_…`, `o20_…`, `o21_…`, `c4_…` |
| T-14 | Reconciliación y respaldo | Escenarios de consistencia (guía del profesor) |
| T-15 | Conectar la interfaz | Cliente generado del OpenAPI; `ApiSigedoc` de la T-02c; cambiar `VITE_API_MODO` a `real` |
| T-16 | Validación integral y evidencia | Matriz `docs/pruebas/matriz.md` |
| T-17 | Despliegue y documentación | README desde cero |

Cada tarea del backend porta a pruebas de API (`tests/e2e` o `tests/integration`) los casos del frontend que cubren su operación, con el mismo nombre de regla, y los extiende con los de integridad y concurrencia que el simulador no puede tener.

## 9. Pruebas y evidencia

- Los siete tipos de prueba de la guía y su calendario: `docs/arquitectura.md` sección 7.
- Visibilidad: toda consulta que lee documentos tiene prueba de que un usuario sin visibilidad no ve el contenido.
- Evidencia de ejecución en `docs/pruebas/` (comando, fecha, versiones, resultado). No basta con scripts.
- Calidad: `uv run ruff check`, `uv run ruff format --check`, `uv run pytest ../tests`.

## 10. Diferencias conocidas entre el simulador y la API real

Para que no sorprendan al conectar (T-15). La tabla completa, con la propuesta para cada una, está en el Apéndice A, «Diferencias simulador ↔ API real».

| Tema | Simulador | API real |
| --- | --- | --- |
| Reloj | `HOY` fijo (22 nov 2026) en movimientos; la recepción por omisión usa la hora real | Un solo reloj del servidor, en UTC |
| Zona horaria | −06:00 fijo en los campos de fecha | Conversión con America/Mexico_City |
| Vínculos de emisor y destinatario | Por nombre | Por id (RI-06) |
| Contraseñas | Cualquier no vacía | Hash, bloqueo temporal, sesión en PostgreSQL |
| Folio siguiente | Se calcula al abrir V-03 | Se reserva al guardar; el valor mostrado es solo una estimación |
| Búsqueda de documento | Espera de 250 ms en la interfaz | La API debe tolerar ráfagas y paginar |
| Periodos de V-06 y V-12 | Reloj real contra semilla de noviembre | Datos reales |

## 11. Decisiones abiertas que tocan al backend

- Lista de asuntos: el Figma no dibuja un índice; la API necesita `GET /asuntos`.
- Contenido por tipo en las salidas: O-20 lo recibe y V-13b aún no lo captura.
- V-15b «desde un paso del recorrido»: sin vista; sin impacto en la API.
- Reconciliar E-2 (`docs/modelos/`) con D-42 a D-72 antes de T-04; D-69 y D-70 son supuesto hasta entonces.

## 12. Entorno

- Windows con Docker Desktop; comandos para PowerShell o Git Bash, y dilo en el reporte si algo depende del sistema.
- Bases con puertos publicados solo en `127.0.0.1`; credenciales en `.env` (no versionado); `.env.example` sin secretos reales.
- Neo4j exige contraseña de al menos 8 caracteres.
- En T-03 la API puede usar credenciales de administrador (solo desarrollo); se corrige con usuarios de mínimo privilegio en T-04 a T-06.

## Apéndice A. Inventario del contrato

Lo que el simulador del frontend hace hoy, función por función (T-02c, commit `71a6dd1`). Es el contrato que el backend implementa y los casos de aceptación son las pruebas del frontend que cita cada ficha. Cada ficha tiene nueve campos: función y operación, método y ruta, entrada, salida, roles, visibilidad, reglas, errores y pruebas. **nuevo** = el mapa de `docs/arquitectura.md` sección 4 no lo tiene; **ajuste** = lo tiene con otra forma. Las rutas van sin el prefijo `/api` (D-71). Lo marcado «Dudoso» no se copia: ver la sección 6.

### Convenciones comunes

| Tema | Lo que hace el simulador | Lo que debe hacer la API |
| --- | --- | --- |
| Error | Toda función rechaza con `ErrorApi { codigo, titulo, detalle, estado_http, existente? }` (`tipos.ts`). El simulador nunca llena `detalle`. | Responde *problem details* (RFC 9457) con `codigo`; el cliente de T-15 lo convierte: `title` → `titulo`, `detail` → `detalle`, `status` → `estado_http`, `existente` igual. |
| Textos de error | `titulo` es el mensaje para el usuario, en español, y las vistas lo muestran tal cual (`mensajeDeError`). | `title` con el mismo texto que la ficha; las pruebas de vista comparan algunos textos. |
| Sesión | Toda función salvo `iniciarSesion`, `cerrarSesion` y `usuariosDePrueba` arranca con `contexto()`: sin sesión, o con la persona inactiva o sin rol, responde `NO_AUTENTICADO` 401 «Inicia sesión para continuar.». No se repite en cada ficha. | Cookie `httpOnly` y O-38 en cada petición (D-49). |
| Rol | `exigirRol`: `SIN_PERMISO` 403 «Tu rol no permite esta operación.». | Igual. |
| Documento inexistente | `NO_ENCONTRADO` 404 «El documento no existe.». | Igual. |
| Texto obligatorio | `exigirTexto`: recorta espacios; vacío → `VALIDACION` 422 con el mensaje de la ficha. | Igual, con Pydantic. |
| Contexto de visibilidad (D-29) | `areas_visibles`: oficialía (OF) y dirección (DI) todas; los demás, su área. `ve_recorrido_completo` solo OF y DI. **Acceso completo** si `ve_recorrido_completo` o si algún movimiento del documento tiene a su área como origen o destino; si no, **restringido** (solo estado y responsable). **Contenido oculto** si es confidencial y la persona no tiene movimiento en él (como autora o como titular al turnar) y no es titular (TI) de un área involucrada. | Función central de visibilidad (arquitectura 3.6); todo repositorio que lee documentos recibe `ctx`. |
| Pendiente (D-42, D-67, D-68) | `pendienteEn(doc, área)`: el documento está en trámite y el último movimiento que llegó al área como responsable o apoyo no tiene después una salida desde ella (como origen o como uno de `otros_origenes` de una atracción). Conocimiento nunca queda pendiente. Las correcciones (O-25) cambian el rol del movimiento corregido. | Regla de O-14 calculada en PostgreSQL. |
| Listados | `{ elementos, total }`. Solo `obtenerBandeja` y `buscar` paginan; los demás devuelven todo y `total = elementos.length`. | `?pagina=&tamano=` (máximo 100) en todo listado que pueda crecer. Ver «Diferencias». |
| Ids y fechas | `crypto.randomUUID()` en el simulador; fechas ISO 8601 con zona; `HOY` fijo en lo que fecha el servidor. | UUID del backend, el mismo en las tres bases (D-15); reloj del servidor en UTC. |
| Latencia | `VITE_API_LATENCIA_MS` (450 ms por omisión, 0 en pruebas). | — |

---

### Sesión

#### `usuariosDePrueba`

| Campo | Contenido |
| --- | --- |
| Función y operación | Constante, no función. Sin operación: ayuda del modo simulado para V-01 (D-63, «el inicio de sesión ofrece usuarios de prueba»). |
| Método y ruta | Ninguno. La API real no la expone; el cliente real exporta `[]`. |
| Entrada | — |
| Salida | `readonly string[]`: seis correos, uno o más por rol (`mflores`, `alopez`, `rperez`, `ediaz`, `jruiz`, `lgomez` `@institucion.gob.mx`). |
| Roles | Sin sesión. |
| Visibilidad | No aplica. |
| Reglas | D-63. |
| Errores | Ninguno. |
| Pruebas | `t02c_ningun_archivo_fuera_del_simulador_depende_de_la_semilla` (garantiza que V-01 no los tenga escritos). |

#### `iniciarSesion`

| Campo | Contenido |
| --- | --- |
| Función y operación | `iniciarSesion(credenciales)` · O-36 Iniciar sesión. |
| Método y ruta | `POST /sesiones` |
| Entrada | `Credenciales { correo: string, contrasena: string }`, ambos obligatorios (el formulario usa `required`). El correo se compara recortado y en minúsculas. |
| Salida | `Sesion { id_persona: Uuid, nombre: string, rol: Rol, id_area: Uuid \| null, nombre_area: string \| null }`. Guarda el id de la persona en `sessionStorage` (hace de cookie). |
| Roles | Cualquier persona activa con rol (OF, DI, TI, PE, AD). |
| Visibilidad | No aplica. |
| Reglas | O-36: mensaje genérico ante credenciales incorrectas. O-34: una persona dada de baja ya no entra. D-49 (cookie y sesión en base) solo en la API real. |
| Errores | `NO_AUTENTICADO` 401 «Correo o contraseña incorrectos.» si el correo no existe, la persona no tiene rol, está inactiva o la contraseña está vacía. **Diferencia:** acepta cualquier contraseña no vacía; no hay bloqueo temporal. |
| Pruebas | `o36_inicio_de_sesion_lleva_a_la_ruta_pedida`, `o36_credenciales_incorrectas_mensaje_generico`, `o36_sin_sesion_redirige_a_inicio_de_sesion`. |

#### `obtenerSesionActual`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerSesionActual()` · O-38 Validar sesión y calcular visibilidad. |
| Método y ruta | `GET /sesiones/actual` |
| Entrada | Ninguna (la sesión guardada). |
| Salida | `Sesion` (ver `iniciarSesion`). |
| Roles | Todos. |
| Visibilidad | Calcula el contexto (convenciones), pero no lo devuelve. |
| Reglas | O-38, D-29, D-44. |
| Errores | `NO_AUTENTICADO` 401 «Inicia sesión para continuar.». |
| Pruebas | `o36_sin_sesion_redirige_a_inicio_de_sesion`, `o11_esqueleto_de_la_sesion_y_de_la_ficha`, `d62_menu_%s_%s` (cinco roles), `d44_rol_%s_sin_permiso_en_%s`. |

#### `cerrarSesion`

| Campo | Contenido |
| --- | --- |
| Función y operación | `cerrarSesion()` · O-37 Cerrar sesión. |
| Método y ruta | `DELETE /sesiones/actual` |
| Entrada | Ninguna. |
| Salida | `void`. Borra la sesión guardada. |
| Roles | Todos; no exige sesión. |
| Visibilidad | No aplica. |
| Reglas | O-37, D-49 (en la API real, revoca en la base). |
| Errores | Ninguno; sin sesión no falla. |
| Pruebas | `o37_cerrar_sesion_vuelve_a_inicio_de_sesion`, `o03_boton_sin_icono_y_cerrar_sesion_pendientes`. |

---

### Catálogos y organización

#### `obtenerCatalogos`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerCatalogos()` · O-31 Consultar catálogos. |
| Método y ruta | `GET /catalogos` |
| Entrada | Ninguna. |
| Salida | `Catalogos { tipos_documento: TipoDocumento[], campos_tipo: Partial<Record<TipoDocumento, CampoTipo[]>>, actores_externos: { id, nombre, tipo }[], motivos_devolucion, formas_conclusion, canales, roles, roles_turno, estados_documento, tipos_relacion, tipos_actor }`. `CampoTipo { clave, etiqueta, forma: 'texto' \| 'lista', obligatorio }`. Las listas vienen en el orden en que se muestran. |
| Roles | Todos (OF, DI, TI, PE, AD). |
| Visibilidad | No aplica. Solo actores **activos** (para captura). |
| Reglas | O-31: solo elementos activos para captura. D-65: siete tipos. D-66: campos propios de tres tipos (`ente_auditor` obligatorio y `puntos` en auditoría; `solicitante` obligatorio en transparencia; `concepto` opcional en material o pago). D-32: cinco motivos. D-59: cinco formas. D-05: cuatro relaciones. D-44: cinco roles. RI-06: actores activos. |
| Errores | Solo `NO_AUTENTICADO`. |
| Pruebas | `d65_catalogo_con_los_siete_tipos`, `d66_solo_tres_tipos_tienen_campos_propios`, `d66_el_bloque_de_datos_del_tipo_solo_aparece_en_los_tres_tipos`, `o35_crear_y_usar_en_el_catalogo_y_nombre_unico`, `o35_v19_crea_un_actor_y_se_ofrece_al_registrar`, y todas las pruebas de los modales que eligen una opción (`o22_…`, `o05_…`, `o07_…`, `o03_…`). |

**T-02c amplió O-31.** El catálogo del grafo nombra áreas, tipos, motivos, formas y actores. Para que ninguna lista viva en una página agregué canales, roles, roles de turno, estados, tipos de relación y tipos de actor (ver «Dudas» del reporte).

#### `obtenerAreas`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerAreas()` · O-32 reducido a los selectores. |
| Método y ruta | `GET /areas?activas=true` (**ajuste**: el mapa pone `/areas` con O-33; aquí es lectura). |
| Entrada | Ninguna. |
| Salida | `Listado<Area>`; `Area { id, nombre, siglas, id_titular: Uuid \| null, nombre_titular: string \| null }`. Solo áreas activas, en el orden de la semilla. |
| Roles | Todos. |
| Visibilidad | No aplica (estructura pública dentro del sistema). |
| Reglas | O-32, D-08 (solo estado actual), D-31 (área vacante: titular nulo). |
| Errores | Solo `NO_AUTENTICADO`. |
| Pruebas | `o32_estructura_actual_para_todos_los_roles`, `o33_d42_no_se_desactiva_con_pendientes`, `o03_flujo_oficialia_turnar_bandeja_de_compras`. |

#### `obtenerOrganizacion`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerOrganizacion()` · O-32 Consultar estructura organizacional. |
| Método y ruta | `GET /organizacion` |
| Entrada | Ninguna. |
| Salida | `Listado<AreaOrganizacion>`: `Area` más `id_padre: Uuid \| null`, `activa: boolean`, `personas: { id, nombre, rol: Rol \| null }[]` (solo activas), `pendientes: number` (documentos pendientes en el área, D-42), `con_folios: boolean` (hay folios o salidas con sus siglas). Incluye áreas inactivas. |
| Roles | Todos. |
| Visibilidad | No aplica. |
| Reglas | O-32, D-08, D-52 (fuente PostgreSQL), D-61 (`con_folios`), D-42 (`pendientes`). |
| Errores | Solo `NO_AUTENTICADO`. |
| Pruebas | `o32_estructura_actual_para_todos_los_roles`, `o32_v16_estructura_vigente_con_vacante_y_personas_adscritas`, `t02c_v16_siglas_de_todos_los_niveles_en_una_columna_fija`, `o34_baja_de_un_titular_deja_el_area_vacante_y_conserva_sus_movimientos`. |

#### `guardarArea`

| Campo | Contenido |
| --- | --- |
| Función y operación | `guardarArea(datos, id?)` · O-33 Gestionar áreas (crear sin `id`, actualizar con él). |
| Método y ruta | `POST /areas` · `PATCH /areas/{id}` |
| Entrada | `DatosArea { siglas: string, nombre: string, id_padre: Uuid \| null, id_titular: Uuid \| null }`. Siglas y nombre obligatorios; las siglas se pasan a mayúsculas y deben ser 2 a 5 letras A-Z. `id_padre` obligatorio salvo para la raíz actual. `id_titular` opcional. Validación en línea en V-17: siglas y nombre vacíos. |
| Salida | `Area`. |
| Roles | AD. |
| Visibilidad | No aplica. |
| Reglas | D-47 y AR-09: sin ciclos (se sube desde el padre propuesto). D-61: siglas fijas si el área tiene folios. O-33: titular adscrito al área. D-20: no se borra. |
| Errores | `VALIDACION` 422: «Escribe las siglas.», «Escribe el nombre del área.», «Las siglas son de 2 a 5 letras, sin acentos.», «Elige el área de la que depende.», «El área de la que depende no existe o está inactiva.», «No puede depender de un área que depende de ella.», «El titular debe estar adscrito al área.» (también al crear con titular, porque nadie está adscrito aún). `CONFLICTO` 409: «Ya existe un área con esas siglas.», «Las siglas no cambian: el área ya tiene folios emitidos (D-61).». `NO_ENCONTRADO` 404 «El área no existe.». **Diferencia:** renombrar un área cambia el emisor de sus documentos porque la semilla los liga por nombre (`shortcut:`). |
| Pruebas | `o33_d47_sin_ciclos_y_d61_siglas_fijas_con_folios`, `o33_d42_no_se_desactiva_con_pendientes`, `o33_v17_crea_un_area_y_rechaza_un_ciclo_en_linea`, `o33_v17_siglas_fijas_con_folios_y_no_se_desactiva_con_pendientes`. |

#### `desactivarArea`

| Campo | Contenido |
| --- | --- |
| Función y operación | `desactivarArea(id)` · O-33 Gestionar áreas (desactivar). |
| Método y ruta | `POST /areas/{id}/desactivacion` (**nuevo**: el mapa solo dice `/areas`). |
| Entrada | `id: Uuid`. |
| Salida | `void`. El área queda `activa: false`. |
| Roles | AD. |
| Visibilidad | No aplica. |
| Reglas | D-20: se desactiva, no se borra. O-33 y D-42: no con documentos pendientes. Revisión de T-02b: no con áreas activas que dependan de ella. |
| Errores | `NO_ENCONTRADO` 404 «El área no existe.». `CONFLICTO` 409 «No se puede desactivar: tiene N documentos pendientes. Turna o concluye esos documentos primero.» y «No se puede desactivar: tiene áreas activas que dependen de ella.». |
| Pruebas | `o33_d42_no_se_desactiva_con_pendientes`, `o33_v17_siglas_fijas_con_folios_y_no_se_desactiva_con_pendientes`. |

#### `obtenerPersonas`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerPersonas()` · O-34 Gestionar personas y usuarios (lectura). |
| Método y ruta | `GET /personas` |
| Entrada | Ninguna. |
| Salida | `Listado<Persona>`; `Persona { id, nombre, correo: string \| null, id_area: Uuid \| null, nombre_area: string \| null, rol: Rol \| null, activa: boolean }`. Incluye las dadas de baja. |
| Roles | AD. |
| Visibilidad | No aplica. |
| Reglas | O-34. |
| Errores | `SIN_PERMISO` 403 para los demás roles. |
| Pruebas | `o34_correo_unico`, `o34_baja_de_un_titular_deja_el_area_vacante_y_conserva_sus_movimientos`, `o34_v18_correo_repetido_en_el_campo_y_alta`, `o34_v18_baja_de_un_titular_deja_el_area_vacante`. |

#### `guardarPersona`

| Campo | Contenido |
| --- | --- |
| Función y operación | `guardarPersona(datos, id?)` · O-34 Gestionar personas y usuarios (alta y edición). |
| Método y ruta | `POST /personas` · `PATCH /personas/{id}` |
| Entrada | `DatosPersona { nombre: string, correo: string, id_area: Uuid, rol: Rol }`, todos obligatorios. Correo en minúsculas y con forma `x@y.z`. `id_area` de un área activa. `rol` de `Catalogos.roles`. |
| Salida | `Persona`. |
| Roles | AD. |
| Visibilidad | No aplica. |
| Reglas | O-34: correo único; si un titular cambia de área, la suya queda vacante. D-49: contraseña con hash (no simulada). |
| Errores | `VALIDACION` 422: «Escribe el nombre completo.», «Escribe el correo.», «Escribe un correo válido.», «Elige el área de adscripción.», «Elige el rol.». `CONFLICTO` 409 «Ya existe un usuario con este correo.» (V-18 lo muestra en el campo). `NO_ENCONTRADO` 404 «La persona no existe.». `ESTADO_INVALIDO` 409 «La persona está dada de baja.». |
| Pruebas | `o34_correo_unico`, `o34_v18_correo_repetido_en_el_campo_y_alta`. |

#### `darDeBajaPersona`

| Campo | Contenido |
| --- | --- |
| Función y operación | `darDeBajaPersona(id)` · O-34 Gestionar personas y usuarios (baja lógica). |
| Método y ruta | `POST /personas/{id}/baja` (**nuevo**: el mapa solo dice `/personas`). |
| Entrada | `id: Uuid`. |
| Salida | `void`. La persona queda `activa: false`; si era titular, el área queda vacante. |
| Roles | AD. |
| Visibilidad | No aplica. |
| Reglas | O-34: baja lógica que conserva sus movimientos; el área queda vacante. D-20. |
| Errores | `NO_ENCONTRADO` 404 «La persona no existe.». `VALIDACION` 422 «No puedes darte de baja a ti mismo.». |
| Pruebas | `o34_baja_de_un_titular_deja_el_area_vacante_y_conserva_sus_movimientos`, `o34_v18_baja_de_un_titular_deja_el_area_vacante`. |

#### `obtenerActores`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerActores()` · O-35 Gestionar actores externos (lectura). |
| Método y ruta | `GET /actores-externos` |
| Entrada | Ninguna. |
| Salida | `Listado<ActorExterno>`; `ActorExterno { id, nombre, tipo: TipoActor, correo: string \| null, telefono: string \| null, activo: boolean, documentos: number }`. `documentos` cuenta las entradas que emitió y las salidas que recibió. Incluye los inactivos. |
| Roles | OF, AD. |
| Visibilidad | No aplica. |
| Reglas | O-35, RI-06. |
| Errores | `SIN_PERMISO` 403 para los demás roles. |
| Pruebas | `o35_crear_y_usar_en_el_catalogo_y_nombre_unico`, `o35_actor_con_documentos_se_desactiva_no_se_borra`, `o35_v19_crea_un_actor_y_se_ofrece_al_registrar`, `o35_v19_actor_con_documentos_se_desactiva_no_se_borra`. |

#### `guardarActor`

| Campo | Contenido |
| --- | --- |
| Función y operación | `guardarActor(datos, id?)` · O-35 Gestionar actores externos (alta y edición). |
| Método y ruta | `POST /actores-externos` · `PATCH /actores-externos/{id}` |
| Entrada | `DatosActor { nombre: string, tipo: TipoActor, correo: string \| null, telefono: string \| null }`. Nombre obligatorio; tipo de `Catalogos.tipos_actor`; correo y teléfono opcionales (vacíos → `null`, sin validar la forma). |
| Salida | `ActorExterno`. |
| Roles | OF, AD. |
| Visibilidad | No aplica. |
| Reglas | O-35. Nombre único sin distinguir mayúsculas (decisión de T-02b). RI-06: lo que se ofrece al registrar. |
| Errores | `VALIDACION` 422 «Escribe el nombre del actor.», «Elige el tipo de actor.». `CONFLICTO` 409 «Ya existe un actor con ese nombre.». `NO_ENCONTRADO` 404 «El actor no existe.». **Diferencia:** renombrar cambia emisor y destinatario de documentos y salidas porque se ligan por nombre. |
| Pruebas | `o35_crear_y_usar_en_el_catalogo_y_nombre_unico`, `o35_v19_crea_un_actor_y_se_ofrece_al_registrar`. |

#### `desactivarActor`

| Campo | Contenido |
| --- | --- |
| Función y operación | `desactivarActor(id)` · O-35 Gestionar actores externos (desactivar). |
| Método y ruta | `POST /actores-externos/{id}/desactivacion` (**nuevo**). |
| Entrada | `id: Uuid`. |
| Salida | `void`. El actor queda `activo: false`, deja de salir en `Catalogos.actores_externos` y conserva sus documentos. |
| Roles | OF, AD. |
| Visibilidad | No aplica. |
| Reglas | O-35: no se elimina si ya tiene documentos; D-20. |
| Errores | `NO_ENCONTRADO` 404 «El actor no existe.». **Dudoso:** desactiva aunque ya esté inactivo, sin error. |
| Pruebas | `o35_actor_con_documentos_se_desactiva_no_se_borra`, `o35_v19_actor_con_documentos_se_desactiva_no_se_borra`. |

---

### Consultas

#### `obtenerBandeja`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerBandeja(filtros?)` · O-14 Pendientes por área y responsable (implementa C4, D-51). |
| Método y ruta | `GET /bandeja?id_area=&tipo=&antiguedad_minima=&pagina=&tamano=` |
| Entrada | `FiltrosBandeja { id_area?: Uuid, tipo?: TipoDocumento, antiguedad_minima?: number, pagina?: number, tamano?: number }`, todos opcionales. Sin `id_area` usa el área del usuario. `tamano` por omisión 100 y máximo 100; `pagina` desde 1. |
| Salida | `Listado<PendienteBandeja>`; `PendienteBandeja { id_documento, folio, asunto, tipo, emisor, rol: 'responsable' \| 'apoyo', antiguedad_dias: number, titular_al_turnar: string \| null, titular_ya_no_adscrito: boolean, ultimo_movimiento: { tipo: TipoMovimiento, descripcion: string }, posible_duplicado: boolean, confidencial: boolean }`. Orden: menor antigüedad primero y, a igual antigüedad, folio descendente. `total` cuenta todos los filtrados. `descripcion` es «Registro en ventanilla \| por correo», «Devuelto por <área corta> · <motivo>», «Atraído por <área corta>» o «Turnado por <área corta>». |
| Roles | OF, DI (cualquier área), TI, PE (solo la suya). AD no. |
| Visibilidad | `id_area` debe estar en `areas_visibles`. La fila trae `asunto` aunque el documento sea confidencial: la bandeja es del área, y la vista lo marca con `confidencial`. |
| Reglas | D-42 (pendiente), D-67 (un turno de OF o DI no cierra el pendiente de otra área), D-68, D-07 (días naturales en America/Mexico_City contra `HOY`), D-31 (titular al turnar), O-14 (conocimiento no queda pendiente). |
| Errores | `SIN_PERMISO` 403 «No puedes ver la bandeja de esa área.» si el área no es visible o el usuario no tiene área; `SIN_PERMISO` 403 por rol (AD). |
| Pruebas | `o14_oficialia_coincide_con_los_indicadores_del_figma` (24 en oficialía), `o14_titular_ya_no_adscrito`, `o14_conocimiento_no_queda_pendiente`, `o14_filtros_tipo_y_antiguedad`, `d29_titular_y_personal_solo_ven_la_bandeja_de_su_area`, `o03_turnar_mueve_el_documento_a_la_bandeja_de_compras`, `d67_turno_de_oficialia_o_direccion_sobre_un_pendiente_de_otra_area_no_lo_cierra`, `o24_cancelado_no_se_borra_y_sale_de_todas_las_bandejas`, `o14_filtro_tipo_fila_resaltada_y_recorrido_son_el_mismo_documento`, `o14_esqueleto_de_la_bandeja_aria_busy_un_status_y_formas_ocultas`, `o14_cambiar_un_filtro_no_vuelve_a_esqueletizar_rebotes`, `o14_area_sin_pendientes_no_deja_la_columna_en_esqueleto`. |

**Dudoso:** la bandeja muestra el `asunto` de un confidencial a cualquiera que vea el área, también al personal que no ve su contenido en la ficha.

#### `obtenerFicha`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerFicha(id)` · O-11 Ficha completa de un documento. |
| Método y ruta | `GET /documentos/{id}` |
| Entrada | `id: Uuid` de un documento recibido (no de una salida). |
| Salida | `Ficha { acceso: 'completo' \| 'restringido', contenido_oculto: boolean, registro: RegistroDocumento, ubicacion_actual: UbicacionActual[], expediente: Expediente \| null, recorrido: Movimiento[] \| null, relaciones: Relacion[] \| null, asuntos: { id, nombre }[] \| null, secciones_no_disponibles: ('expediente' \| 'recorrido' \| 'relaciones')[] }`. `RegistroDocumento`: folio, tipo, estado, confidencial, posible_duplicado, extemporaneo, numero_emisor, emisor, tipo_emisor, fecha_documento, canal, fecha_recepcion, segunda_recepcion, fecha_oficial, origen_fecha_oficial (`'sello'` o `'correo'`), asunto y sintesis. `UbicacionActual { area, rol, desde, antiguedad_dias, llegada }`, una por área con el documento pendiente. `Expediente { datos_tipo, anexos, notas }`. `Relacion { tipo, id_documento \| null, referencia, descripcion, estado }`. `Movimiento`: ver `turnar`. |
| Roles | OF, DI, TI, PE. AD no. |
| Visibilidad | **Restringido** (otra área): `asunto`, `sintesis`, `expediente`, `recorrido`, `relaciones` y `asuntos` nulos. **Contenido oculto** (confidencial ajeno): `sintesis`, `expediente`, `relaciones` y `asuntos` nulos; el recorrido sí se ve. `ubicacion_actual` siempre. |
| Reglas | D-29, D-53 (`secciones_no_disponibles`; el simulador siempre la deja vacía), D-66 (`datos_tipo` limpios), D-28 (fecha oficial y segunda recepción), D-42 (ubicación). |
| Errores | `NO_ENCONTRADO` 404 «El documento no existe.». `SIN_PERMISO` 403 por rol. |
| Pruebas | `d29_personal_no_ve_contenido_confidencial_ajeno`, `d29_titular_si_ve_contenido_confidencial_de_su_area`, `d29_documento_de_otra_area_solo_estado_y_responsable`, `d29_oficialia_ve_el_recorrido_de_todo`, `d29_confidencial_visible_solo_al_titular_y_a_quien_tiene_movimiento`, `d44_administrador_no_lee_documentos`, `d66_la_ficha_devuelve_los_datos_del_tipo_limpios`, `o11_esqueleto_de_la_sesion_y_de_la_ficha`, `o11_acciones_%s` (siete casos), `d29_personal_ve_aviso_de_contenido_confidencial`, y las de cada escritura que leen la ficha después (`o01_…`, `o19_…`, `o22_…`, `o23_…`, `o05_…`, `o07_…`, `o24_…`, `o25_…`, `o26_…`, `o28_o29_…`). |

**Dudoso:** con acceso restringido la ficha sigue trayendo `numero_emisor`, `emisor`, `tipo_emisor`, fechas y canal. D-29 dice «solo estado y responsable», y O-30 sí oculta el número en ese caso.

#### `obtenerRecorrido`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerRecorrido(id)` · C1 Recorrido de un documento (vista previa de la bandeja, V-02). |
| Método y ruta | `GET /documentos/{id}/recorrido` |
| Entrada | `id: Uuid`. |
| Salida | `Movimiento[]` en orden de inserción, con las correcciones como movimientos propios. No es un `Listado`: el recorrido de un documento es acotado y no se pagina (ver «Diferencias»). |
| Roles | OF, DI, TI, PE. |
| Visibilidad | Con acceso restringido, `SIN_PERMISO`. Un confidencial ajeno sí devuelve el recorrido, como la ficha. |
| Reglas | C1, D-29, D-68 (`area_origen` nombra a todas las áreas de origen de una atracción: «Compras y Jurídico»). |
| Errores | `NO_ENCONTRADO` 404. `SIN_PERMISO` 403 «No puedes ver el recorrido de este documento.». |
| Pruebas | `o14_filtro_tipo_fila_resaltada_y_recorrido_son_el_mismo_documento`. **Hueco:** el simulador no tiene una prueba directa de esta función; el backend debería agregar una de visibilidad (`c1_d29_…`). |

#### `obtenerRebotes`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerRebotes(filtros?)` · C3 Rebotes entre áreas. |
| Método y ruta | `GET /consultas/rebotes?periodo=&id_area=` |
| Entrada | `FiltrosRebotes { periodo?: string /* AAAA-MM */, id_area?: Uuid }`. Sin periodo, el mes de `HOY`. |
| Salida | `Listado<Rebote>`; `Rebote { id_documento, folio, asunto: string \| null, reglas: ('no_competencia_sin_area' \| 'tres_devoluciones' \| 'tres_areas')[], areas: number, ubicacion: string \| null }`. Orden: folio descendente. |
| Roles | OF, DI. |
| Visibilidad | `asunto` nulo si el contenido no se ve (confidencial ajeno). |
| Reglas | C3 y D-32. Se evalúan los movimientos efectivos del periodo de los documentos **en trámite**, con tres reglas: «no competencia» sin área sugerida; tres o más devoluciones; tres o más áreas responsables distintas, sin contar oficialía ni el registro (HU-F1). Con `id_area`, solo cuentan los documentos con un movimiento del periodo desde o hacia esa área. D-50: la consulta parte de los movimientos del periodo, nunca de un área. «Sin motivo» no ocurre porque O-22 exige motivo. |
| Errores | `VALIDACION` 422 «El periodo es un mes AAAA-MM.». `SIN_PERMISO` 403 por rol. |
| Pruebas | `c3_los_tres_casos_de_rebote`, `c3_devolucion_con_motivo_y_returno_con_area_no_son_rebote`, `c3_d44_solo_oficialia_y_direccion_y_confidencial_sin_contenido`, `c3_v12_lista_las_reglas_y_el_detalle_del_elegido`. |

#### `obtenerPosiblesDuplicados`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerPosiblesDuplicados()` · O-26 (documentos que esperan revisión: V-14 y la tarjeta de V-02). |
| Método y ruta | `GET /consultas/posibles-duplicados` (**nuevo**). |
| Entrada | Ninguna. |
| Salida | `Listado<ResumenDocumento>`; `ResumenDocumento { id, folio, asunto, falta: 'numero' \| 'fecha' }`. Documentos con `posible_duplicado` y en trámite, folio descendente. `falta` es `'fecha'` si trae número y `'numero'` si no. |
| Roles | OF. |
| Visibilidad | Oficialía ve todo. |
| Reglas | D-27 (sin número o sin fecha se marca), O-26. |
| Errores | `SIN_PERMISO` 403 por rol. |
| Pruebas | `o26_son_el_mismo_cancela_el_posterior_con_duplicado_de_y_conserva_movimientos`, `o26_d44_solo_oficialia_y_el_original_es_anterior`, `o26_v14_son_el_mismo_cancela_el_marcado_y_sale_de_la_lista`. |

#### `obtenerComparacionDuplicado`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerComparacionDuplicado(id)` · O-26 (comparación de V-14). |
| Método y ruta | `GET /consultas/posibles-duplicados/{id}/comparacion` (**nuevo**). |
| Entrada | `id: Uuid` de un documento marcado. |
| Salida | `ComparacionDuplicado { posterior: DocumentoComparado, candidato: DocumentoComparado \| null, coincidencias: ('numero_emisor' \| 'emisor' \| 'fecha_documento' \| 'sintesis')[] }`; `DocumentoComparado { id, folio, numero_emisor, emisor, fecha_documento, canal, fecha_recepcion, sintesis, estado, ubicacion }`. |
| Roles | OF. |
| Visibilidad | Oficialía ve todo. |
| Reglas | Candidato (decisión de T-02b): el último documento no cancelado del mismo emisor registrado antes (por fecha de recepción y folio), con el mismo número si el marcado lo trae o con la misma fecha del documento. La síntesis cuenta como coincidencia si ambas comparten al menos la mitad de las palabras de 4 letras o más, sin acentos. Sin candidato, `coincidencias` queda vacía. |
| Errores | `NO_ENCONTRADO` 404. `ESTADO_INVALIDO` 409 «El documento ya no espera revisión.» si no está marcado o no está en trámite. |
| Pruebas | `o26_comparacion_con_el_candidato_del_mismo_emisor_y_fecha`, `o26_son_distintos_solo_retira_la_marca`, `o26_d44_solo_oficialia_y_el_original_es_anterior`, `o26_v14_son_el_mismo_cancela_el_marcado_y_sale_de_la_lista`. |

#### `obtenerAcuses`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerAcuses()` · D-58, tarjeta «Acuses» de V-02. Sin operación propia; deriva de O-21. |
| Método y ruta | `GET /consultas/acuses` (**nuevo**). |
| Entrada | Ninguna. |
| Salida | `Listado<Acuse>`; `Acuse { id_salida, folio_salida, id_documento, folio_documento, acusado_por }`. Salidas con acuse cuyo documento de origen está pendiente en el área del usuario como responsable. |
| Roles | TI, PE. |
| Visibilidad | Solo lo pendiente en su área. |
| Reglas | D-58 (oficialía registra el acuse; el área responsable concluye), O-21 («informa al titular del área responsable»), D-42. |
| Errores | `SIN_PERMISO` 403 por rol. |
| Pruebas | `o20_o21_d58_oficialia_registra_el_acuse_y_el_area_responsable_concluye`, `o03_turnar_mueve_el_documento_a_la_bandeja_de_compras`. |

#### `obtenerFolioSiguiente`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerFolioSiguiente()` · vista previa del folio en V-03 (D-21). |
| Método y ruta | `GET /documentos/folio-siguiente` (**nuevo**). |
| Entrada | Ninguna. |
| Salida | `string`: `<siglas del área del usuario>-<año de HOY>-<consecutivo de 4 dígitos>`. El consecutivo es el mayor usado entre documentos y salidas con ese prefijo, más uno. |
| Roles | OF. |
| Visibilidad | No aplica. |
| Reglas | D-21 (consecutivo por área emisora y año, sin huecos). |
| Errores | `SIN_PERMISO` 403 por rol. **Diferencia:** es una estimación; el folio definitivo se reserva al guardar (O-01). |
| Pruebas | `o01_folio_consecutivo_sin_huecos_aunque_falle_un_registro`, `o01_d27_duplicado_detectado_no_crea_nada_y_devuelve_el_existente`, `o01_validacion_en_linea_y_registro_navega_a_la_ficha`. |

#### `buscarDocumentos`

| Campo | Contenido |
| --- | --- |
| Función y operación | `buscarDocumentos(texto)` · O-30 reducido a los selectores de documento (V-09, V-10, V-11 y V-13b). |
| Método y ruta | `GET /consultas/selector-documentos?texto=` (**nuevo**: no filtra como O-30 e incluye salidas). |
| Entrada | `texto: string`. Si está vacío o solo tiene espacios, devuelve una lista vacía. La interfaz espera 250 ms después de la última tecla. |
| Salida | `Listado<DocumentoEncontrado>`; `DocumentoEncontrado { id, folio, asunto, fecha, salida: boolean }`. Primero las salidas y luego los documentos; como máximo 8 (`total` también es como máximo 8). Coincide si el folio o el asunto (la síntesis, en las salidas) contienen el texto, sin distinguir mayúsculas. |
| Roles | OF, DI, TI, PE. |
| Visibilidad | Documentos con acceso completo y contenido visible. Salidas: OF y DI ven todas; los demás, las emitidas por su área. |
| Reglas | O-30, D-29. |
| Errores | `SIN_PERMISO` 403 por rol. |
| Pruebas | `o30_busca_documentos_y_salidas_visibles`, `o30_consulta_250_ms_despues_de_la_ultima_tecla`, `o30_intro_durante_la_espera_no_elige_un_resultado_viejo`, `o30_flechas_e_intro_eligen_escribir_busca_de_nuevo_y_esc_solo_cierra_la_lista`, `o08_asignar_documento_desde_v11_con_error_en_linea`. |

#### `buscar`

| Campo | Contenido |
| --- | --- |
| Función y operación | `buscar(filtros?)` · O-30 Buscar documentos (V-06). |
| Método y ruta | `GET /documentos?texto=&folio=&numero=&emisor=&tipo=&estado=&desde=&hasta=&campo_tipo=&valor_campo=&pagina=&tamano=` |
| Entrada | `FiltrosBusqueda { texto?, folio?, numero?, emisor?, tipo?, estado?, desde?: Fecha, hasta?: Fecha, campo_tipo?: { clave: 'ente_auditor' \| 'solicitante', valor: string }, pagina?, tamano? }`, todos opcionales. `folio`, `numero`, `texto` y `campo_tipo.valor` buscan texto contenido, sin distinguir mayúsculas; `emisor`, `tipo` y `estado` piden igualdad; `desde` y `hasta` comparan el día de recepción en America/Mexico_City, inclusive. `pagina` empieza en 1; `tamano` es 20 por omisión y va de 1 a 100. |
| Salida | `Listado<ResultadoBusqueda>`; `ResultadoBusqueda { id, folio, numero_emisor: string \| null, sintesis: string \| null, tipo, estado, area_responsable: string \| null, visibilidad: 'completa' \| 'restringida' \| 'confidencial' }`. Orden: recepción más reciente primero y luego folio descendente. Solo documentos recibidos (no salidas). |
| Roles | OF, DI, TI, PE. |
| Visibilidad | Aparecen todos los documentos. Con `restringida` no traen número ni síntesis; con `confidencial` traen el número pero no la síntesis. Los filtros por `numero`, `texto` y `campo_tipo` no se aplican a lo que el usuario no ve: esos documentos no coinciden, para no revelar su contenido. |
| Reglas | O-30 (paginación obligatoria), D-29, D-46 y AD-07 (solo los dos campos con índice parcial). |
| Errores | `VALIDACION` 422 «Solo se busca por ente auditor o solicitante (D-46).». `SIN_PERMISO` 403 por rol. |
| Pruebas | `o30_paginacion_obligatoria`, `o30_d29_fuera_de_la_visibilidad_solo_estado_y_responsable`, `o30_d29_confidencial_de_otra_area_para_oficialia`, `o30_d46_campo_propio_solo_en_los_dos_tipos_con_indice`, `o30_filtros_por_tipo_estado_emisor_y_fechas`, `o30_v06_busca_por_sintesis_pagina_y_oculta_lo_confidencial_ajeno`, `o30_v06_campo_propio_solo_con_los_dos_tipos_y_chip_que_se_quita`, `o30_paginador_muestra_extremos_y_vecinas_con_saltos`. |

#### `obtenerSalidas`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerSalidas(acuse?)` · listado de V-13 sobre O-20 y O-21. |
| Método y ruta | `GET /salidas?acuse=con\|sin` (**nuevo**). |
| Entrada | `acuse: 'con' \| 'sin' \| null` (nulo: todas). |
| Salida | `Listado<Salida>`; `Salida { id, folio, sintesis, destinatario, id_responde_a: Uuid \| null, folio_responde_a: string \| null, area_emisora: string, fecha_hora, acuse: { fecha_hora, recibio } \| null }`. Orden: más reciente primero y luego folio descendente. |
| Roles | OF. |
| Visibilidad | Oficialía ve todo. |
| Reglas | O-20, O-21, D-21 (folio con las siglas del área emisora). |
| Errores | `SIN_PERMISO` 403 por rol. |
| Pruebas | `o20_o21_listado_con_responde_a_y_filtro_de_acuse`, `o21_v13_lista_las_salidas_y_registra_el_acuse_de_la_elegida`. |

#### `obtenerAsuntos`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerAsuntos(texto?)` · lista de asuntos para V-11 y V-11b (sin operación en el catálogo). |
| Método y ruta | `GET /asuntos?texto=` (**nuevo**; ver la decisión abierta en la sección 11 de la guía). |
| Entrada | `texto: string` (por omisión `''`): asuntos cuyo nombre contiene el texto, sin distinguir mayúsculas. |
| Salida | `Listado<Asunto>`; `Asunto { id, nombre, descripcion, creador: string, fecha, documentos: number, areas: string[] }`. `areas` son las áreas responsables hoy de sus documentos. Orden: el de la semilla. |
| Roles | OF, DI, TI, PE. |
| Visibilidad | Ninguna: todos los asuntos con nombre, descripción y conteos. |
| Reglas | D-25, D-30. |
| Errores | `SIN_PERMISO` 403 por rol (AD). |
| Pruebas | `o08_o27_d44_permisos_por_rol`, `o08_asignar_a_un_asunto_abre_v11b_con_los_asuntos_a_los_que_ya_pertenece`, `o08_v11b_una_busqueda_nueva_quita_el_asunto_elegido`, `d62_v11c_direccion_solo_consulta`. |

**Dudoso:** `documentos` y `areas` también cuentan documentos que el usuario no ve, así que un asunto con un confidencial revela qué área lo tiene.

#### `obtenerHiloAsunto`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerHiloAsunto(id)` · C2 Hilo de un asunto (AG-02). |
| Método y ruta | `GET /asuntos/{id}/hilo` |
| Entrada | `id: Uuid` del asunto. |
| Salida | `HiloAsunto { asunto: Asunto, nodos: NodoHilo[] }`; `NodoHilo { id_documento: Uuid \| null, referencia, descripcion: string \| null, estado: EstadoDocumento \| null, registrado: boolean, pertenece: boolean, relacion: { tipo, sentido: 'entra' \| 'sale' } \| null, profundidad: number }`. Primero van los documentos del asunto (`pertenece`, profundidad 0, por folio); después, en preorden, lo que llega por las cuatro relaciones en ambos sentidos y por las salidas que responden (RESPONDE_A). El recorrido es por anchura, así cada nodo queda con su menor profundidad. |
| Roles | OF, DI, TI, PE. |
| Visibilidad | Un documento sin contenido visible trae `descripcion` nula, pero sí `estado`. En una salida, solo OF, DI o el área emisora reciben `descripcion`. En un no registrado, `referencia` es el número y `descripcion` el emisor. |
| Reglas | C2, D-50 (hasta 6 saltos), D-33 (el no registrado se identifica por número y emisor), D-29, HU-F1 (parte del asunto, nunca de un área). |
| Errores | `NO_ENCONTRADO` 404 «El asunto no existe.». `SIN_PERMISO` 403 por rol. |
| Pruebas | `c2_hilo_con_relaciones_en_ambos_sentidos_y_no_registrados`, `c2_d50_hasta_6_saltos`, `c2_c5_d29_sin_visibilidad_solo_area_sin_contenido_ni_personas`, `c2_v11_hilo_con_no_registrado_y_o18_sacar`. |

#### `obtenerAlcanceAsunto`

| Campo | Contenido |
| --- | --- |
| Función y operación | `obtenerAlcanceAsunto(id)` · C5 Alcance de un asunto (AG-04). |
| Método y ruta | `GET /asuntos/{id}/alcance` |
| Entrada | `id: Uuid` del asunto. |
| Salida | `AlcanceAsunto { areas: { area: string, documentos: number }[], personas: string[] }`. Por área, cuántos documentos del asunto pasaron por ella (como origen, destino u otro origen), de más a menos y luego por nombre. Las personas son los autores de movimientos y los titulares al turnar. |
| Roles | OF, DI, TI, PE. |
| Visibilidad | Los documentos que no ve cuentan en `areas`, pero sus personas no se incluyen. |
| Reglas | C5, D-29. |
| Errores | `NO_ENCONTRADO` 404 «El asunto no existe.». `SIN_PERMISO` 403 por rol. |
| Pruebas | `c5_alcance_areas_y_personas_con_contacto`, `c2_c5_d29_sin_visibilidad_solo_area_sin_contenido_ni_personas`. |

---

### Escrituras

`Movimiento`, que devuelven varias escrituras: `{ id, tipo: 'registro' | 'turno' | 'devolucion' | 'atraccion' | 'conclusion' | 'correccion', id_corrige: Uuid | null, id_grupo_turno: Uuid | null, area_origen: string | null, area_destino: string, rol: RolTurno, instruccion: string | null, motivo: MotivoDevolucion | null, forma_conclusion: FormaConclusion | null, persona: string, titular_al_turnar: string | null, fecha_hora }`. Las áreas y las personas van **por nombre**. `fecha_hora` es `HOY`. Todo movimiento se inserta y ninguno se edita (AR-03, RF-15).

#### `registrarDocumento`

| Campo | Contenido |
| --- | --- |
| Función y operación | `registrarDocumento(datos)` · O-01 Registrar documento recibido y asignar folio. |
| Método y ruta | `POST /documentos` |
| Entrada | `NuevoDocumento { tipo: TipoDocumento, numero_emisor: string \| null, tipo_emisor: 'area' \| 'externo', emisor: string, fecha_documento: Fecha \| null, canal: Canal, fecha_recepcion: FechaHora, sintesis: string, confidencial: boolean, extemporaneo: boolean, datos_tipo: DatosTipo }`. Obligatorios: tipo (del catálogo), emisor (nombre de un área activa o de un actor activo, según `tipo_emisor`), síntesis y una fecha de recepción válida; los campos obligatorios del tipo (`validarDatosTipo` de `reglas.ts`, que V-03 también usa en línea). Opcionales: número y fecha del documento. |
| Salida | `DocumentoRegistrado { id, folio }`. Además: estado `en_tramite`; `asunto = sintesis`; `posible_duplicado` si falta el número o la fecha; `fecha_oficial` = día de la recepción en America/Mexico_City; `origen_fecha_oficial` `'sello'` en papel y `'correo'` en correo; `datos_tipo` limpios (solo los campos del tipo, recortados y sin puntos vacíos). Inserta un movimiento `registro` hacia el área del usuario como responsable. |
| Roles | OF. |
| Visibilidad | No aplica; el documento nuevo queda en oficialía. |
| Reglas | D-21 y D-34 (folio consecutivo por área y año), D-27 (duplicado por número, emisor y año de la fecha del documento), D-28, D-66 (campos por tipo), RI-06 (emisor de catálogo), D-43 (síntesis), D-29 (`confidencial`), D-44. |
| Errores | `VALIDACION` 422: «Elige un tipo de documento del catálogo.», «Escribe el emisor del documento.», «Elige si el emisor es un área interna o un actor externo.», «Elige un área interna del catálogo.», «Elige un actor externo activo del catálogo.», «Escribe la síntesis del documento.», «Escribe la fecha y hora de recepción.», «Escribe el campo «<etiqueta>».». `DUPLICADO` 409 «Ya existe este documento: mismo número, mismo emisor y mismo año del documento.» con `existente { id, folio, numero_emisor, emisor, canal, fecha_recepcion }`: no crea nada y V-03 ofrece la segunda recepción. `SIN_PERMISO` 403 por rol. |
| Pruebas | `o01_folio_consecutivo_sin_huecos_aunque_falle_un_registro`, `o01_d27_duplicado_detectado_no_crea_nada_y_devuelve_el_existente`, `o01_sin_numero_o_sin_fecha_queda_como_posible_duplicado`, `o01_extemporaneo_guarda_la_fecha_real_y_queda_pendiente_en_oficialia`, `o01_ri06_el_emisor_es_un_area_o_un_actor_activo_del_catalogo`, `o01_d44_solo_oficialia_registra`, `d66_campos_obligatorios_por_tipo`, `d66_la_ficha_devuelve_los_datos_del_tipo_limpios`, `o01_validacion_en_linea_y_registro_navega_a_la_ficha`, `o01_o19_duplicado_detectado_ofrece_segunda_recepcion`, `d66_el_bloque_de_datos_del_tipo_solo_aparece_en_los_tres_tipos`. |

#### `registrarSegundaRecepcion`

| Campo | Contenido |
| --- | --- |
| Función y operación | `registrarSegundaRecepcion(id, canal, fechaRecepcion)` · O-19 Registrar segunda recepción. |
| Método y ruta | `POST /documentos/{id}/recepciones` con cuerpo `{ canal, fecha_recepcion }`. |
| Entrada | `id: Uuid`, `canal: Canal` (el que aún no se registró), `fechaRecepcion: FechaHora` válida. |
| Salida | `void`. Guarda `segunda_recepcion { canal, fecha_recepcion }`; si es papel, `fecha_oficial` pasa al día de esa recepción y `origen_fecha_oficial` a `'sello'`. El folio no cambia. |
| Roles | OF. |
| Visibilidad | Oficialía ve todo. |
| Reglas | D-28 (el sello en papel fija la fecha oficial; el folio no cambia), O-19 (un segundo registro por el mismo canal se rechaza). |
| Errores | `NO_ENCONTRADO` 404. `CONFLICTO` 409 «Ya hay una recepción registrada por ese canal.» si el canal es el de la primera o ya hay segunda. `VALIDACION` 422 «Escribe la fecha y hora de recepción.». **Dudoso:** no exige que el documento esté en trámite. |
| Pruebas | `o19_duplicado_detectado_y_segunda_recepcion_en_papel_fija_la_fecha_oficial`, `o19_correo_no_cambia_la_fecha_oficial_y_el_mismo_canal_se_rechaza`, `o01_o19_duplicado_detectado_ofrece_segunda_recepcion`, `o19_modal_atrapa_el_foco_esc_cierra_y_devuelve_el_foco`. |

#### `cancelarDocumento`

| Campo | Contenido |
| --- | --- |
| Función y operación | `cancelarDocumento(id, motivo)` · O-24 Cancelar documento. |
| Método y ruta | `POST /documentos/{id}/cancelacion` con cuerpo `{ motivo }`. |
| Entrada | `id: Uuid`, `motivo: string` obligatorio. |
| Salida | `void`. Estado `cancelado` y `motivo_cancelacion` guardado; deja de estar pendiente en todas las áreas. |
| Roles | OF. |
| Visibilidad | Oficialía ve todo. |
| Reglas | D-20 (nunca se borra), D-42 (sale de todas las bandejas), O-24. Un cancelado es de solo lectura para O-28 y O-29. |
| Errores | `NO_ENCONTRADO` 404. `ESTADO_INVALIDO` 409 «El documento ya no está en trámite.». `VALIDACION` 422 «Escribe el motivo de la cancelación.». |
| Pruebas | `o24_cancelado_no_se_borra_y_sale_de_todas_las_bandejas`, `o24_modal_atrapa_el_foco_esc_cierra_y_devuelve_el_foco`. |

**Dudoso:** el motivo de cancelación se guarda, pero ni la ficha ni ningún listado lo devuelven.

#### `corregirMovimiento`

| Campo | Contenido |
| --- | --- |
| Función y operación | `corregirMovimiento(idMovimiento, correccion)` · O-25 Corregir un movimiento. |
| Método y ruta | `POST /movimientos/{id}/correcciones` |
| Entrada | `idMovimiento: Uuid` de un movimiento `turno`; `Correccion { rol: RolTurno, motivo: string }`, ambos obligatorios. V-15b solo ofrece los roles que respetan RI-10. |
| Salida | `Movimiento` de tipo `correccion` con `id_corrige` = el original, el mismo `id_grupo_turno`, origen, destino y titular al turnar, el `rol` nuevo y el motivo en `instruccion`. El original queda intacto; los pendientes se recalculan con el rol corregido. |
| Roles | OF. |
| Visibilidad | Oficialía ve todo. |
| Reglas | RF-15 y HU-H3 (la bitácora no se edita), RI-10 (el grupo sigue con un solo responsable: `validarGrupoTurno`), D-42. |
| Errores | `NO_ENCONTRADO` 404 «El movimiento no existe.». `VALIDACION` 422: «Solo se corrige el rol de un turno.», «Escribe el motivo de la corrección.», «El valor corregido es igual al actual.» y los de RI-10 («Falta un responsable en el grupo.», «Solo puede haber un responsable en el grupo.»). `ESTADO_INVALIDO` 409 «El documento ya no está en trámite.». |
| Pruebas | `o25_corregir_el_rol_inserta_un_movimiento_y_cambia_los_pendientes`, `o22_o25_regresa_a_usa_los_roles_corregidos_como_el_servidor`, `o25_modal_atrapa_el_foco_esc_cierra_y_devuelve_el_foco`. |

#### `turnar`

| Campo | Contenido |
| --- | --- |
| Función y operación | `turnar(idDocumento, destinos)` · O-03 Turnar a una o varias áreas. |
| Método y ruta | `POST /documentos/{id}/turnos` con cuerpo `{ destinos: DestinoTurno[] }`. |
| Entrada | `DestinoTurno { id_area: Uuid, rol: RolTurno, instruccion: string }` (la instrucción es opcional; vacía queda `null`). El grupo se valida con `validarGrupoTurno` (`reglas.ts`), que V-05 también usa para deshabilitar «Turnar». |
| Salida | `ResultadoTurno { id_grupo_turno: Uuid, movimientos: Movimiento[] }`: un movimiento `turno` por destino con el mismo grupo. El origen es el área de quien turna; `titular_al_turnar` es el titular del área destino en ese momento (nulo si está vacante). |
| Roles | OF y DI turnan cualquier documento en trámite; TI solo lo que tiene pendiente en su área. |
| Visibilidad | OF y DI ven todo; TI necesita el pendiente en su área. |
| Reglas | RI-10 (un solo responsable por grupo), D-18 (grupo simultáneo), D-31 (titular al turnar), D-44, D-42 y D-67 (el turno de OF o DI no cierra el pendiente de otra área, porque el origen es oficialía o dirección). |
| Errores | `ESTADO_INVALIDO` 409 «No se turnan documentos concluidos ni cancelados.». `SIN_PERMISO` 403 «El titular solo turna lo que tiene pendiente en su área.». `VALIDACION` 422: «Agrega al menos un área.», «Elige el área de cada fila.», «Cada área puede aparecer una sola vez.», «Falta un responsable en el grupo.», «Solo puede haber un responsable en el grupo.», «Un área destino no existe.». `NO_ENCONTRADO` 404. |
| Pruebas | `o03_servidor_rechaza_grupo_sin_un_solo_responsable`, `o03_ri10_validar_grupo_%#` (casos de `validarGrupoTurno`), `o03_permisos_d44`, `o03_turnar_mueve_el_documento_a_la_bandeja_de_compras`, `d67_turno_de_oficialia_o_direccion_sobre_un_pendiente_de_otra_area_no_lo_cierra`, `o03_ri10_boton_deshabilitado_sin_un_solo_responsable`, `o03_flujo_oficialia_turnar_bandeja_de_compras`, `o03_modal_atrapa_el_foco_y_esc_lo_devuelve_al_boton`, `o03_modal_anima_con_data_state_y_cierra_tras_la_salida`, `o03_cancelar_cierra_y_devuelve_el_foco`, `o03_boton_pendiente_spinner_aria_busy_deshabilitado_y_mismo_texto`. |

**Dudoso:** acepta como destino un área inactiva (solo comprueba que exista) y también la propia área de quien turna.

#### `devolver`

| Campo | Contenido |
| --- | --- |
| Función y operación | `devolver(id, devolucion)` · O-22 Devolver o returnar con motivo. |
| Método y ruta | `POST /documentos/{id}/devoluciones` |
| Entrada | `Devolucion { motivo: MotivoDevolucion, id_area_sugerida: Uuid \| null, nota: string }`. El motivo es obligatorio y del catálogo. Sin área sugerida, **devuelve** al área de origen del movimiento con el que lo recibió; con ella, **returna** a esa área. La nota es opcional. |
| Salida | `Movimiento` de tipo `devolucion` desde el área del usuario hacia el destino, como responsable, con `motivo`. Guarda internamente `con_area_sugerida` (lo usa C3). Si hay nota, va al expediente como nota general. |
| Roles | TI, con el documento pendiente en su área (como responsable o apoyo). |
| Visibilidad | Implícita: lo tiene pendiente. |
| Reglas | D-32 (motivo obligatorio; «no competencia» sin área sugerida cuenta como rebote en C3), D-44, D-42. |
| Errores | `ESTADO_INVALIDO` 409 «El documento ya no está en trámite.». `SIN_PERMISO` 403 «Solo devuelve el titular del área que tiene el documento pendiente.». `VALIDACION` 422 «Elige el motivo del catálogo.», «Elige otra área para returnarlo.» (el destino no existe, es la propia área o no hay origen). |
| Pruebas | `o22_devolver_regresa_al_area_que_lo_envio_con_motivo_y_nota`, `o22_returnar_lo_manda_al_area_sugerida_como_responsable_con_su_titular`, `o22_d44_solo_el_titular_con_el_pendiente_y_motivo_del_catalogo`, `c3_devolucion_con_motivo_y_returno_con_area_no_son_rebote`, `o22_motivo_obligatorio_boton_pendiente_y_la_ficha_se_refresca`, `o22_returnar_avisa_rebote_sin_area_y_titular_con_area`, `o22_o25_regresa_a_usa_los_roles_corregidos_como_el_servidor`, `o22_modal_atrapa_el_foco_esc_cierra_y_devuelve_el_foco`. |

**Dudoso:** un área de apoyo que devuelve deja el documento como **responsable** en el destino. Además, el destino puede ser un área inactiva.

#### `atraer`

| Campo | Contenido |
| --- | --- |
| Función y operación | `atraer(id, justificacion)` · O-23 Atraer documento. |
| Método y ruta | `POST /documentos/{id}/atracciones` con cuerpo `{ justificacion }`. |
| Entrada | `id: Uuid`, `justificacion: string` obligatoria. |
| Salida | `Movimiento` de tipo `atraccion` hacia el área del usuario, como responsable, con la justificación en `instruccion`. Si había otras áreas responsables, la primera es el origen y las demás van en `otros_origenes` (interno; `area_origen` las nombra todas). Esas áreas dejan de tenerlo pendiente; apoyo y conocimiento no cambian. |
| Roles | TI. |
| Visibilidad | Requiere que su área tenga algún movimiento en el documento (`involucraArea`), aunque sea de conocimiento. |
| Reglas | D-68 (una sola área responsable), D-29 (visibilidad), D-44. |
| Errores | `ESTADO_INVALIDO` 409 «El documento ya no está en trámite.» y «Tu área ya es la responsable.». `SIN_PERMISO` 403 «Tu área no tiene visibilidad sobre el documento.». `VALIDACION` 422 «Escribe la justificación.». |
| Pruebas | `o23_el_area_que_atrae_queda_responsable_y_la_anterior_deja_de_tenerlo`, `o23_d29_sin_visibilidad_no_se_atrae`, `d68_atraer_con_dos_responsables_saca_a_ambas_y_no_toca_apoyo_ni_conocimiento`, `o23_modal_atrapa_el_foco_esc_cierra_y_devuelve_el_foco`, `o11_acciones_%s` (casos «TI apoyo» y «TI conocimiento»). |

#### `concluir`

| Campo | Contenido |
| --- | --- |
| Función y operación | `concluir(id, conclusion)` · O-05 Concluir documento. |
| Método y ruta | `POST /documentos/{id}/conclusion` |
| Entrada | `Conclusion { forma: FormaConclusion, id_respuesta: Uuid \| null, id_original: Uuid \| null, nota: string }`. Requisitos por forma (`validarConclusion` en `reglas.ts`, el mismo que usa V-09): `con_respuesta` exige `id_respuesta` (documento registrado o salida); `duplicado` exige `id_original`; `atencion_sin_oficio`, `no_procede` y `duplicado` exigen nota; `enterado` no pide nada. |
| Salida | `Movimiento` de tipo `conclusion` en el área del usuario, con `forma_conclusion` y el folio del documento enlazado en `instruccion`. Estado `concluido`. `con_respuesta` crea RESPONDE_A **desde la respuesta** hacia este documento: en una salida, `id_responde_a`; en un documento, una relación. La nota va al expediente (`evidencia_atencion` con `atencion_sin_oficio`; `general` en las demás). |
| Roles | TI y PE del área responsable que tiene el documento pendiente. |
| Visibilidad | Implícita: lo tiene pendiente como responsable. |
| Reglas | D-59 (cinco formas y sus requisitos), RI-14 (conclusión explícita), D-19 (evidencia de la atención), D-44, D-58 (oficialía no concluye aunque registre el acuse), D-05 (sentido de RESPONDE_A). |
| Errores | `ESTADO_INVALIDO` 409 «El documento ya no está en trámite.». `SIN_PERMISO` 403 «Solo lo concluye el área responsable que lo tiene pendiente.». `VALIDACION` 422: «Elige el documento de respuesta.», «Elige el documento original.», «Escribe la evidencia de la atención.», «Escribe el motivo.», «Elige otro documento registrado.» (el enlazado no existe o es el mismo). |
| Pruebas | `o05_d59_concluir_con_forma_%s` (cinco formas), `o05_d59_respuesta_crea_responde_a_y_sin_oficio_deja_la_evidencia`, `o05_d59_requisitos_de_cada_forma`, `o05_d44_concluye_titular_o_personal_del_area_responsable`, `o20_o21_d58_oficialia_registra_el_acuse_y_el_area_responsable_concluye`, `d68_atraer_con_dos_responsables_saca_a_ambas_y_no_toca_apoyo_ni_conocimiento`, `o05_d59_sin_evidencia_el_boton_queda_deshabilitado_y_el_campo_muestra_el_error`, `o05_modal_atrapa_el_foco_esc_cierra_y_devuelve_el_foco`. |

**Dudoso:**
- `duplicado` acepta una salida como original.
- `con_respuesta` sobre una salida que ya respondía a otro documento reemplaza su `id_responde_a`, sin avisar.

#### `relacionar`

| Campo | Contenido |
| --- | --- |
| Función y operación | `relacionar(id, tipo, destino)` · O-07 Relacionar documentos. |
| Método y ruta | `POST /documentos/{id}/referencias` con cuerpo `{ tipo, destino }`. |
| Entrada | `tipo: TipoRelacion`. `destino: { id_documento: Uuid }` (registrado) o `{ numero: string, emisor: string }` (no registrado, ambos obligatorios). |
| Salida | `void`. Agrega la relación al documento de origen: `Relacion { tipo, id_documento, referencia (folio o número), descripcion (asunto o emisor), estado }`. Con `sustituye_a`, el otro queda `sin_efecto`. |
| Roles | OF, TI, PE (DI no). |
| Visibilidad | Exige ver el contenido del documento de origen (acceso completo y no confidencial ajeno). No revisa la visibilidad del destino. |
| Reglas | D-05 (cuatro relaciones), D-33 (el no registrado se identifica por número y emisor; el mismo par se reutiliza), D-14 (SUSTITUYE_A solo entre registrados y deja al otro sin efecto), D-29, D-44. |
| Errores | `SIN_PERMISO` 403 «No tienes visibilidad sobre el contenido de este documento.» y por rol. `VALIDACION` 422: «Un documento no se relaciona consigo mismo.», ««Sustituye a» solo se usa entre documentos registrados.», «Escribe el número del documento.», «Escribe el emisor del documento.». `CONFLICTO` 409 «Esa relación ya existe.». `NO_ENCONTRADO` 404 (origen o destino). |
| Pruebas | `o07_registrado_no_registrado_y_quitar`, `o07_o18_d33_no_registrado_se_identifica_por_numero_y_emisor`, `o07_sustituye_a_deja_al_otro_sin_efecto_y_quitarla_lo_devuelve`, `o07_d44_direccion_no_relaciona`, `o07_error_del_servidor_en_linea`, `o07_modal_atrapa_el_foco_esc_cierra_y_devuelve_el_foco`. |

**Dudoso:** no revisa el estado de ninguno de los dos documentos. Así, un concluido o cancelado puede quedar `sin_efecto` por `sustituye_a`, y se pueden relacionar documentos cancelados.

#### `quitarRelacion`

| Campo | Contenido |
| --- | --- |
| Función y operación | `quitarRelacion(id, tipo, referencia, emisor)` · O-18 Quitar referencia (parte de referencias). |
| Método y ruta | `DELETE /documentos/{id}/referencias/{tipo}?referencia=&emisor=` (**ajuste**: el mapa usa `/{tipo}/{id_destino}`, pero el no registrado no tiene id; se identifica por número y emisor, D-33). |
| Entrada | `tipo: TipoRelacion`, `referencia: string` (folio del registrado o número del no registrado), `emisor: string \| null` (obligatorio para distinguir un no registrado). |
| Salida | `void`. Quita la relación; si era `sustituye_a`, el otro vuelve a `en_tramite`. |
| Roles | OF, TI, PE. |
| Visibilidad | Exige ver el contenido del documento de origen. |
| Reglas | D-20 (solo capturas por error), D-33, D-14 (quitar SUSTITUYE_A devuelve el estado anterior). |
| Errores | `NO_ENCONTRADO` 404 «La relación no existe.». `SIN_PERMISO` 403 (visibilidad o rol). **Diferencia:** devuelve `en_tramite` sin guardar el estado anterior (`shortcut:`); el servicio real lo lee de la reconciliación (D-14). |
| Pruebas | `o07_registrado_no_registrado_y_quitar`, `o07_o18_d33_no_registrado_se_identifica_por_numero_y_emisor`, `o07_sustituye_a_deja_al_otro_sin_efecto_y_quitarla_lo_devuelve`. |

#### `registrarSalida`

| Campo | Contenido |
| --- | --- |
| Función y operación | `registrarSalida(salida)` · O-20 Registrar salida externa. |
| Método y ruta | `POST /salidas` |
| Entrada | `NuevaSalida { tipo: TipoDocumento, numero: string, id_area_emisora: Uuid, destinatario: string, sintesis: string, id_responde_a: Uuid \| null }`. Obligatorios: tipo del catálogo, número, área emisora que exista, destinatario (nombre de un actor externo activo) y síntesis. `id_responde_a` es opcional y debe ser un documento registrado. |
| Salida | `DocumentoRegistrado { id, folio }`. El folio lleva las siglas del área emisora (`UT-2026-0001`), en la misma secuencia que los documentos de esa área. La fecha es `HOY` y no tiene acuse. Si responde a un documento, crea RESPONDE_A (C2 la recorre). |
| Roles | OF. |
| Visibilidad | No aplica. |
| Reglas | O-20 (emisor interno, destinatario externo, RESPONDE_A), RI-06, D-21 (siglas del área emisora). |
| Errores | `VALIDACION` 422: «Elige un tipo de documento del catálogo.», «Elige el área emisora.», «Escribe el número del documento.», «Elige el destinatario externo.», «Elige un actor externo activo del catálogo.», «Escribe la síntesis.». `NO_ENCONTRADO` 404 «El documento no existe.» si `id_responde_a` no existe. **Dudoso:** acepta como emisora un área inactiva. |
| Pruebas | `o20_o21_d58_oficialia_registra_el_acuse_y_el_area_responsable_concluye`, `o01_ri06_el_emisor_es_un_area_o_un_actor_activo_del_catalogo` (destinatario), `o20_o21_listado_con_responde_a_y_filtro_de_acuse`, `o20_modal_atrapa_el_foco_esc_cierra_y_devuelve_el_foco`. |

#### `registrarAcuse`

| Campo | Contenido |
| --- | --- |
| Función y operación | `registrarAcuse(idSalida, fechaHora, recibio)` · O-21 Registrar acuse de salida. |
| Método y ruta | `POST /salidas/{id}/acuses` (**ajuste**: el mapa dice `POST /documentos/{id}/acuses`; en el simulador, salidas y documentos recibidos son colecciones distintas). |
| Entrada | `idSalida: Uuid`, `fechaHora: FechaHora` válida, `recibio: string` obligatorio. |
| Salida | `void`. Guarda `acuse { fecha_hora, recibio }`. Si la salida responde a un documento pendiente, ese documento aparece en `obtenerAcuses` del área responsable. |
| Roles | OF. |
| Visibilidad | No aplica. |
| Reglas | O-21 (solo documentos de salida), D-58. |
| Errores | `NO_ENCONTRADO` 404 «Solo se registra el acuse de un documento de salida.» (también con el id de un documento recibido). `CONFLICTO` 409 «La salida ya tiene acuse.». `VALIDACION` 422 «Escribe la fecha y hora del acuse.», «Escribe quién recibió.». |
| Pruebas | `o20_o21_d58_oficialia_registra_el_acuse_y_el_area_responsable_concluye`, `o21_solo_documentos_de_salida`, `o21_v13_lista_las_salidas_y_registra_el_acuse_de_la_elegida`. |

**Dudoso:** el catálogo dice «un acuse por destinatario». El simulador permite uno por salida y cada salida tiene un solo destinatario: equivalen mientras eso siga así.

#### `agregarAnexo`

| Campo | Contenido |
| --- | --- |
| Función y operación | `agregarAnexo(id, anexo)` · O-28 Agregar anexo. |
| Método y ruta | `POST /documentos/{id}/expediente/anexos` |
| Entrada | `NuevoAnexo { titulo: string, hojas: number, ubicacion: string }`. Título y ubicación obligatorios; hojas entero de 1 o más (V-04 lo valida en línea). |
| Salida | `void`. El anexo (`{ id, titulo, hojas, ubicacion }`) queda en el expediente. |
| Roles | OF, PE (TI no, según el catálogo). |
| Visibilidad | Exige ver el contenido. |
| Reglas | O-28, DT-03 (solo datos descriptivos, sin archivo), D-29, O-09 (un cancelado es de solo lectura). |
| Errores | `SIN_PERMISO` 403 (visibilidad o rol). `ESTADO_INVALIDO` 409 «Un documento cancelado es de solo lectura.». `VALIDACION` 422 «El número de hojas debe ser 1 o más.», «Escribe la descripción del anexo.», «Escribe la ubicación física.». `NO_ENCONTRADO` 404. |
| Pruebas | `o28_o29_agregar_anexo_y_nota_con_permisos`, `o28_hojas_invalidas_en_linea_boton_pendiente_y_el_anexo_aparece`, `o28_modal_atrapa_el_foco_esc_cierra_y_devuelve_el_foco`. |

#### `agregarNota`

| Campo | Contenido |
| --- | --- |
| Función y operación | `agregarNota(id, texto)` · O-29 Agregar nota. |
| Método y ruta | `POST /documentos/{id}/expediente/notas` |
| Entrada | `texto: string` obligatorio. |
| Salida | `void`. La nota (`{ id, tipo: 'general', area, autor, fecha_hora, texto }`) queda en el expediente; el servidor pone autor, área y fecha. |
| Roles | OF, DI, TI, PE. |
| Visibilidad | Exige ver el contenido. |
| Reglas | O-29 (autor y fecha los pone el servidor; requiere visibilidad), D-29, O-09. |
| Errores | `SIN_PERMISO` 403 «No tienes visibilidad sobre el contenido de este documento.». `ESTADO_INVALIDO` 409 «Un documento cancelado es de solo lectura.». `VALIDACION` 422 «Escribe la nota.». `NO_ENCONTRADO` 404. |
| Pruebas | `o28_o29_agregar_anexo_y_nota_con_permisos`, `d29_confidencial_visible_solo_al_titular_y_a_quien_tiene_movimiento`, `o24_cancelado_no_se_borra_y_sale_de_todas_las_bandejas`, `o29_nota_vacia_en_linea_y_la_nota_aparece_con_su_autor`, `o29_modal_atrapa_el_foco_esc_cierra_y_devuelve_el_foco`. |

#### `asignarAsunto`

| Campo | Contenido |
| --- | --- |
| Función y operación | `asignarAsunto(idDocumento, idAsunto)` · O-08 Asignar documento a un asunto. |
| Método y ruta | `POST /asuntos/{id}/documentos` con cuerpo `{ id_documento }`. |
| Entrada | `idDocumento: Uuid`, `idAsunto: Uuid`. |
| Salida | `void`. El documento queda en el asunto; puede estar en varios. |
| Roles | TI, PE. |
| Visibilidad | Exige ver el contenido del documento. |
| Reglas | D-30 (en cualquier momento, no en ventanilla), AG-08 (MERGE de PERTENECE_A), D-29, D-44. |
| Errores | `NO_ENCONTRADO` 404 «El documento no existe.» o «El asunto no existe.» (se revisan **antes** que el rol). `SIN_PERMISO` 403 (rol o visibilidad). `CONFLICTO` 409 «El documento ya pertenece a ese asunto.». |
| Pruebas | `o27_o08_crear_con_documento_lo_asigna_y_o18_lo_saca`, `o08_o27_d44_permisos_por_rol`, `o08_asignar_documento_desde_v11_con_error_en_linea`, `o08_asignar_a_un_asunto_abre_v11b_con_los_asuntos_a_los_que_ya_pertenece`, `o08_modal_atrapa_el_foco_esc_cierra_y_devuelve_el_foco` (dos casos). |

#### `crearAsunto`

| Campo | Contenido |
| --- | --- |
| Función y operación | `crearAsunto(asunto, idDocumento?)` · O-27 Crear asunto (y O-08 si trae documento). |
| Método y ruta | `POST /asuntos` con cuerpo `{ nombre, descripcion, id_documento? }` (**nuevo** el campo `id_documento`). |
| Entrada | `NuevoAsunto { nombre: string, descripcion: string }`, ambos obligatorios. `idDocumento: Uuid \| null` opcional. |
| Salida | `Asunto`, con el usuario como creador y `HOY` como fecha. Con documento, el documento ya queda asignado. |
| Roles | OF, TI, PE. Con documento, solo TI y PE (exige O-08). |
| Visibilidad | Con documento, exige ver su contenido; se valida **antes** de crear, para no dejar un asunto a medias. |
| Reglas | D-25 (id único), O-27, O-08, D-30, D-29. |
| Errores | `VALIDACION` 422 «Escribe el nombre del asunto.», «Escribe la descripción del asunto.». `SIN_PERMISO` 403 (rol o visibilidad). `NO_ENCONTRADO` 404 (documento). **Dudoso:** el nombre no es único; dos asuntos pueden llamarse igual. |
| Pruebas | `o27_o08_crear_con_documento_lo_asigna_y_o18_lo_saca`, `o08_o27_d44_permisos_por_rol`, `o27_o08_v11b_crea_un_asunto_y_el_documento_queda_asignado`, `c2_d50_hasta_6_saltos`. |

#### `sacarDeAsunto`

| Campo | Contenido |
| --- | --- |
| Función y operación | `sacarDeAsunto(idDocumento, idAsunto)` · O-18 Quitar referencia o sacar de un asunto (parte de asuntos). |
| Método y ruta | `DELETE /asuntos/{id}/documentos/{id_doc}` |
| Entrada | `idDocumento: Uuid`, `idAsunto: Uuid`. |
| Salida | `void`. Borra la pertenencia, nunca el asunto. |
| Roles | OF, TI, PE. |
| Visibilidad | Exige ver el contenido del documento. |
| Reglas | AG-09, D-20 (solo capturas por error; el nodo no se borra), D-29. |
| Errores | `NO_ENCONTRADO` 404 «El documento no pertenece a ese asunto.» (y si el documento no existe). `SIN_PERMISO` 403. **Dudoso:** no comprueba que el asunto exista; un id inexistente da «no pertenece». |
| Pruebas | `o27_o08_crear_con_documento_lo_asigna_y_o18_lo_saca`, `o08_o27_d44_permisos_por_rol`, `c2_v11_hilo_con_no_registrado_y_o18_sacar`. |

#### `resolverDuplicado`

| Campo | Contenido |
| --- | --- |
| Función y operación | `resolverDuplicado(idPosterior, idOtro, decision)` · O-26 Resolver posible duplicado. |
| Método y ruta | `POST /documentos/{id}/resolucion-duplicado` con cuerpo `{ id_otro, decision }`. |
| Entrada | `idPosterior: Uuid` (el marcado), `idOtro: Uuid \| null` (el candidato; obligatorio con `mismo`), `decision: 'mismo' \| 'distintos'`. |
| Salida | `void`. `mismo`: el posterior pasa a `cancelado` con `duplicado_de` = el otro y motivo «Duplicado de <folio>»; sus movimientos se conservan. `distintos`: solo se retira la marca. En los dos casos `posible_duplicado` queda en falso. |
| Roles | OF. |
| Visibilidad | Oficialía ve todo. |
| Reglas | O-26, D-27, D-20 (los movimientos se conservan). Si viene `id_otro`, debe ser un documento registrado antes que el marcado. |
| Errores | `NO_ENCONTRADO` 404 (posterior u otro; con `mismo` sin `id_otro`, «El documento no existe.»). `ESTADO_INVALIDO` 409 «El documento ya no espera revisión.». `VALIDACION` 422: «Elige «son el mismo» o «son distintos».», «Compara con un documento registrado antes.», «El original está cancelado.». |
| Pruebas | `o26_son_el_mismo_cancela_el_posterior_con_duplicado_de_y_conserva_movimientos`, `o26_son_distintos_solo_retira_la_marca`, `o26_d44_solo_oficialia_y_el_original_es_anterior`, `o26_v14_son_el_mismo_cancela_el_marcado_y_sale_de_la_lista`. |

---

### Operaciones del catálogo sin función en la interfaz

| Operación | Situación |
| --- | --- |
| O-09 Consultar y actualizar contenido del expediente | La lectura va dentro de la ficha (O-11). No hay `PATCH /documentos/{id}/expediente`: ninguna vista edita `datos_tipo` después del registro. |
| O-17 Eliminar anexo o nota | Sin función ni vista. El mapa tiene `DELETE …/{id_elemento}`. |
| O-39, O-40, O-41 | Procesos y comandos, no endpoints (arquitectura, sección 4). |
| `GET /salud` | Sin función: lo usa el despliegue, no la interfaz. |

### Diferencias simulador ↔ API real

| Tema | Simulador | API real | Propuesta |
| --- | --- | --- | --- |
| Reloj | `HOY` fijo (`2026-11-22T12:00:00-06:00`) en movimientos, notas, salidas, asuntos, antigüedad (D-07) y folio. Las fechas de recepción y de acuse las manda la interfaz. | Un solo reloj del servidor, en UTC. | Las pruebas de aceptación del backend fijan el reloj (inyectar «ahora» en los servicios) para reproducir las antigüedades del Figma. |
| Periodos de V-06 y V-12 | La interfaz calcula «este mes» con el reloj real, pero la semilla usa noviembre de 2026. | Datos reales. | Desaparece en T-15. Mientras tanto, en otro mes V-12 abre vacío hasta que se elige noviembre. |
| Zona horaria | La interfaz manda `fecha_recepcion` con `-06:00` fijo; el simulador calcula días con `America/Mexico_City`. | Guarda en UTC y convierte con `America/Mexico_City`. | El backend acepta cualquier desfase ISO 8601 y responde en UTC con `Z`; la interfaz ya formatea con `Intl` en la zona correcta. |
| Vínculos | Emisor, destinatario, áreas y personas de los movimientos se guardan y devuelven **por nombre**. Renombrar un área o un actor reescribe los documentos (`shortcut:`). | Por id (RI-06). | En el contrato, `emisor` y `destinatario` siguen siendo texto para mostrar, y se agregan `id_emisor` y `id_destinatario` (o `id_actor`/`id_area`) en la entrada y en la salida. Los selectores de V-03, V-10 y V-13b ya eligen del catálogo, que trae los ids. |
| Contraseña y sesión | Cualquier contraseña no vacía; sin bloqueo. La sesión es el id de la persona en `sessionStorage` y no caduca. | Hash, bloqueo temporal, cookie `httpOnly` y sesión en PostgreSQL que caduca (D-49). | Sin cambio de contrato; las pruebas `o36_…` siguen valiendo con contraseñas de la semilla. |
| Usuarios de prueba | `usuariosDePrueba` en `ApiSigedoc`. | `[]`. | Si el revisor quiere conservarlos en desarrollo, que salgan de la semilla del backend por una variable de entorno, no del código de la interfaz. |
| Folio siguiente | Se calcula al abrir V-03. | Se reserva al guardar (D-21, D-34). | El endpoint queda como estimación; al guardar, V-03 lleva a la ficha, que muestra el folio que asignó O-01. |
| Concurrencia | Un solo hilo: no hay registros simultáneos. | Contador bloqueado por área y año. | Prueba de concurrencia de folios en T-08 (no existe en el frontend). |
| Réplicas y outbox | Una sola memoria: todo se ve al instante. | MongoDB y Neo4j se actualizan por el outbox (D-13); la ficha puede marcar secciones no disponibles (D-53). | Las pruebas de vista que leen justo después de escribir dependen de que O-11 lea de PostgreSQL lo que acaba de cambiar. Revisar qué secciones pueden llegar atrasadas. |
| `secciones_no_disponibles` | Siempre `[]`. | Las secciones de MongoDB o Neo4j que no respondieron. | La interfaz ya las dibuja (T-01b). |
| Quitar SUSTITUYE_A | Devuelve `en_tramite`, sin el estado anterior. | Estado anterior por la reconciliación (D-14). | Guardar el estado anterior en la relación. |
| Paginación | Solo `obtenerBandeja` y `buscar` aceptan `pagina` y `tamano`. Los demás listados devuelven todo; `buscarDocumentos` corta en 8. | Todo listado con `?pagina=&tamano=` (máximo 100). | Agregar `pagina` y `tamano` opcionales a los listados que crecen: salidas, asuntos, rebotes, posibles duplicados, personas y actores. La interfaz pide la primera página hasta que tenga paginador. El recorrido (C1) no se pagina. |
| Errores | Lanza `ErrorApi` ya armado; `detalle` siempre nulo. | *Problem details* (RFC 9457). | El cliente de T-15 convierte la respuesta a `ErrorApi`; un fallo de red o un 5xx sin cuerpo llega como `Error` y la vista muestra «No se pudo …». |
| Ids | `crypto.randomUUID()` en el navegador; los de la semilla son deterministas. | UUID del backend, el mismo en las tres bases (D-15). | La semilla del backend reutiliza los ids de abajo para que las pruebas que los citan sigan valiendo. |
| Catálogos | O-31 amplió sus listas cerradas (canales, roles, roles de turno, estados, tipos de relación y tipos de actor). | Lo que diga el grafo. | Ver el hueco propuesto en el reporte de la T-02c. |
| Búsqueda | La interfaz espera 250 ms después de la última tecla. | Debe tolerar ráfagas y paginar. | Sin cambio. |
| Estado | La semilla vive en memoria: recargar la página la restaura (la sesión se conserva en `sessionStorage`). | Persistente. | Cada archivo de pruebas del frontend carga la semilla de nuevo; el backend necesita su propia carga de datos de prueba (O-41). |
| Latencia | `VITE_API_LATENCIA_MS`, 450 ms por omisión. | Real. | Sin cambio. |

### Datos de semilla que el backend debe reproducir

Generado con `node docs/pruebas/T-02c-verificacion/semilla.mjs` a partir de `datos.ts`. Las pruebas citan sobre todo folios (`OP-2026-0139`, `OP-2026-0152`, `OP-2026-0148`, `OP-2026-0124`, `OP-2026-0097`, `OP-2026-0141`…), correos y los totales de las bandejas: 24 pendientes en oficialía y 9 en Compras.

Reloj fijo de la semilla: `HOY = 2026-11-22T12:00:00-06:00`. Los UUID son deterministas: `00000000-0000-4000-8000-<n en 12 dígitos>`.

#### Áreas

| id | siglas | nombre | depende de | titular | activa |
| --- | --- | --- | --- | --- | --- |
| 00000000-0000-4000-8000-000000000101 | OP | Oficialía de partes | DG | — | sí |
| 00000000-0000-4000-8000-000000000102 | DG | Dirección General | — | Lic. Ana López | sí |
| 00000000-0000-4000-8000-000000000103 | CO | Compras | DG | Ing. Raúl Pérez | sí |
| 00000000-0000-4000-8000-000000000104 | FI | Finanzas | DG | C.P. Elena Díaz | sí |
| 00000000-0000-4000-8000-000000000105 | SIS | Sistemas | DG | — | sí |
| 00000000-0000-4000-8000-000000000106 | JU | Jurídico | DG | — | sí |
| 00000000-0000-4000-8000-000000000107 | AD | Administración | DG | Mtro. Luis Gómez | sí |
| 00000000-0000-4000-8000-000000000108 | RH | Recursos Humanos | DG | — | sí |
| 00000000-0000-4000-8000-000000000109 | SG | Servicios Generales | DG | Arq. Pedro Mena | sí |
| 00000000-0000-4000-8000-000000000110 | UT | Unidad de Transparencia | JU | Mtra. Laura Ortiz | sí |
| 00000000-0000-4000-8000-000000000111 | VI | Vinculación | DG | — | sí |
| 00000000-0000-4000-8000-000000000112 | CI | Contraloría interna | DG | C.P. Hugo Ramos | sí |
| 00000000-0000-4000-8000-000000000113 | AR | Archivo de concentración | DG | — | no |

#### Personas y usuarios

Todas entran con cualquier contraseña no vacía. Las marcadas en V-01 se sugieren en el inicio de sesión.

| id | nombre | correo | rol | área | activa | V-01 |
| --- | --- | --- | --- | --- | --- | --- |
| 00000000-0000-4000-8000-000000000201 | Marta Flores | mflores@institucion.gob.mx | OF | OP | sí | sí |
| 00000000-0000-4000-8000-000000000202 | Lic. Ana López | alopez@institucion.gob.mx | DI | DG | sí | sí |
| 00000000-0000-4000-8000-000000000203 | Ing. Raúl Pérez | rperez@institucion.gob.mx | TI | CO | sí | sí |
| 00000000-0000-4000-8000-000000000204 | C.P. Elena Díaz | ediaz@institucion.gob.mx | TI | FI | sí | sí |
| 00000000-0000-4000-8000-000000000205 | Jorge Ruiz | jruiz@institucion.gob.mx | PE | CO | sí | sí |
| 00000000-0000-4000-8000-000000000206 | Mtro. Luis Gómez | lgomez@institucion.gob.mx | AD | AD | sí | sí |
| 00000000-0000-4000-8000-000000000207 | Lic. Sergio Ruiz | — | — | — | no |  |
| 00000000-0000-4000-8000-000000000208 | Arq. Pedro Mena | pmena@institucion.gob.mx | TI | SG | sí |  |
| 00000000-0000-4000-8000-000000000209 | Mtra. Laura Ortiz | lortiz@institucion.gob.mx | TI | UT | sí |  |
| 00000000-0000-4000-8000-000000000210 | C.P. Hugo Ramos | hramos@institucion.gob.mx | TI | CI | sí |  |
| 00000000-0000-4000-8000-000000000211 | Lic. Irma Vela | ivela@institucion.gob.mx | PE | VI | sí |  |
| 00000000-0000-4000-8000-000000000212 | Ing. Óscar Paz | opaz@institucion.gob.mx | PE | VI | sí |  |
| 00000000-0000-4000-8000-000000000214 | Lic. Carmen Ruiz | cruiz@institucion.gob.mx | OF | OP | sí |  |
| 00000000-0000-4000-8000-000000000213 | Lic. Pablo Rangel | prangel@institucion.gob.mx | TI | VI | no |  |

#### Actores externos

| id | nombre | tipo | activo |
| --- | --- | --- | --- |
| 00000000-0000-4000-8000-000000000601 | Auditoría Superior de la Federación | institucion | sí |
| 00000000-0000-4000-8000-000000000602 | Municipio de Tuxtla · Sec. de Economía | municipio | sí |
| 00000000-0000-4000-8000-000000000603 | Dell México, S.A. de C.V. | proveedor | sí |
| 00000000-0000-4000-8000-000000000604 | Juan Hernández Gómez | ciudadano | sí |
| 00000000-0000-4000-8000-000000000605 | Mobiliario del Sur | proveedor | sí |
| 00000000-0000-4000-8000-000000000606 | Papelería Central | proveedor | no |
| 00000000-0000-4000-8000-000000000607 | Órgano Interno de Control | institucion | sí |
| 00000000-0000-4000-8000-000000000608 | Universidad Tecnológica | institucion | sí |
| 00000000-0000-4000-8000-000000000609 | Gobierno del estado | institucion | sí |
| 00000000-0000-4000-8000-000000000610 | Proveedor externo | proveedor | sí |
| 00000000-0000-4000-8000-000000000611 | Ciudadano | ciudadano | sí |

#### Documentos recibidos

Responsable y pendientes se calculan de los movimientos (D-42); aquí van el estado y el último movimiento.

| id | folio | tipo | estado | emisor | número | canal | conf. | pos. dup. | movs. | último movimiento |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 00000000-0000-4000-8000-000000001000 | OP-2026-0087 | oficio | concluido | Sistemas | — | papel |  |  | 2 | turno OP→CO (responsable) |
| 00000000-0000-4000-8000-000000001049 | OP-2026-0097 | oficio | en_tramite | Universidad Tecnológica | — | papel |  |  | 5 | turno FI→DG (responsable) |
| 00000000-0000-4000-8000-000000001078 | OP-2026-0101 | oficio | en_tramite | Ciudadano | — | papel |  | sí | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001082 | OP-2026-0102 | oficio | en_tramite | Proveedor externo | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001080 | OP-2026-0103 | solicitud_transparencia | en_tramite | Ciudadano | — | papel |  | sí | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001086 | OP-2026-0104 | solicitud_material_pago | en_tramite | Recursos Humanos | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001084 | OP-2026-0105 | solicitud_material_pago | en_tramite | Proveedor externo | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001088 | OP-2026-0106 | oficio | en_tramite | Proveedor externo | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001090 | OP-2026-0107 | solicitud_transparencia | en_tramite | Ciudadano | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001092 | OP-2026-0108 | requerimiento_auditoria | en_tramite | Órgano Interno de Control | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001070 | OP-2026-0109 | oficio | en_tramite | Ciudadano | DEN-0045 | papel | sí |  | 2 | turno OP→JU (responsable) |
| 00000000-0000-4000-8000-000000001094 | OP-2026-0110 | oficio | en_tramite | Gobierno del estado | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001096 | OP-2026-0111 | solicitud_material_pago | en_tramite | Proveedor externo | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001098 | OP-2026-0112 | oficio | en_tramite | Ciudadano | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001100 | OP-2026-0113 | solicitud_material_pago | en_tramite | Recursos Humanos | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001102 | OP-2026-0114 | oficio | en_tramite | Dirección General | — | papel |  |  | 4 | turno DG→OP (apoyo) |
| 00000000-0000-4000-8000-000000001109 | OP-2026-0115 | oficio | en_tramite | Dirección General | — | papel |  |  | 4 | turno DG→OP (apoyo) |
| 00000000-0000-4000-8000-000000001116 | OP-2026-0116 | oficio | en_tramite | Dirección General | — | papel |  |  | 4 | turno DG→OP (apoyo) |
| 00000000-0000-4000-8000-000000001123 | OP-2026-0117 | oficio | en_tramite | Dirección General | — | papel |  |  | 4 | turno DG→OP (apoyo) |
| 00000000-0000-4000-8000-000000001044 | OP-2026-0118 | oficio | en_tramite | Recursos Humanos | — | papel |  |  | 3 | devolucion AD→OP (responsable) |
| 00000000-0000-4000-8000-000000001130 | OP-2026-0119 | oficio | en_tramite | Dirección General | — | papel |  |  | 4 | turno DG→OP (apoyo) |
| 00000000-0000-4000-8000-000000001137 | OP-2026-0121 | solicitud_material_pago | en_tramite | Proveedor externo | — | papel |  |  | 2 | turno OP→CO (responsable) |
| 00000000-0000-4000-8000-000000001141 | OP-2026-0123 | solicitud_material_pago | en_tramite | Proveedor externo | — | papel |  |  | 2 | turno OP→CO (responsable) |
| 00000000-0000-4000-8000-000000001145 | OP-2026-0124 | solicitud_material_pago | en_tramite | Proveedor externo | — | papel | sí |  | 2 | turno OP→CO (responsable) |
| 00000000-0000-4000-8000-000000001149 | OP-2026-0126 | solicitud_material_pago | en_tramite | Proveedor externo | — | papel |  |  | 2 | turno OP→CO (responsable) |
| 00000000-0000-4000-8000-000000001153 | OP-2026-0127 | solicitud_material_pago | en_tramite | Sistemas | — | papel |  |  | 2 | turno OP→FI (responsable) |
| 00000000-0000-4000-8000-000000001157 | OP-2026-0128 | solicitud_material_pago | en_tramite | Sistemas | — | papel |  |  | 2 | turno OP→FI (responsable) |
| 00000000-0000-4000-8000-000000001022 | OP-2026-0129 | oficio | en_tramite | Ciudadano | — | papel | sí |  | 3 | devolucion JU→OP (responsable) |
| 00000000-0000-4000-8000-000000001059 | OP-2026-0131 | oficio | en_tramite | Ciudadano | — | papel |  |  | 7 | devolucion FI→OP (responsable) |
| 00000000-0000-4000-8000-000000001038 | OP-2026-0133 | requerimiento_auditoria | en_tramite | Órgano Interno de Control | — | papel |  |  | 3 | turno DG→CO (responsable) |
| 00000000-0000-4000-8000-000000001014 | OP-2026-0137 | oficio | en_tramite | Dirección General | — | papel |  |  | 5 | turno DG→CO (apoyo) |
| 00000000-0000-4000-8000-000000001004 | OP-2026-0139 | solicitud_material_pago | en_tramite | Sistemas | SIS/0231/2026 | papel |  |  | 4 | devolucion CO→OP (responsable) |
| 00000000-0000-4000-8000-000000001074 | OP-2026-0140 | solicitud_transparencia | en_tramite | Ciudadano | SAI-0233 | papel |  |  | 2 | turno OP→UT (responsable) |
| 00000000-0000-4000-8000-000000001012 | OP-2026-0141 | solicitud_transparencia | en_tramite | Ciudadano | — | correo |  | sí | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001010 | OP-2026-0143 | requerimiento_auditoria | en_tramite | Órgano Interno de Control | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001031 | OP-2026-0148 | oficio | en_tramite | Finanzas | — | papel |  |  | 4 | turno FI→CO (apoyo) |
| 00000000-0000-4000-8000-000000001027 | OP-2026-0152 | solicitud_material_pago | en_tramite | Administración | — | papel |  |  | 2 | turno OP→CO (responsable) |

#### Salidas externas

| id | folio | área emisora | destinatario | responde a | acuse |
| --- | --- | --- | --- | --- | --- |
| 00000000-0000-4000-8000-000000000501 | CO-2026-0048 | CO | Sistemas | OP-2026-0139 | Sistemas |
| 00000000-0000-4000-8000-000000000502 | CO-2026-0049 | CO | Administración | OP-2026-0152 | Administración |
| 00000000-0000-4000-8000-000000000503 | CO-2026-0046 | CO | el OIC | OP-2026-0133 | el OIC |
| 00000000-0000-4000-8000-000000000504 | UT-2026-0001 | UT | Ciudadano | OP-2026-0140 |  |
| 00000000-0000-4000-8000-000000000505 | SG-2026-0001 | SG | Mobiliario del Sur | — | Mobiliario del Sur |
| 00000000-0000-4000-8000-000000000506 | CI-2026-0001 | CI | Auditoría Superior de la Federación | — | Auditoría Superior de la Federación |
| 00000000-0000-4000-8000-000000000507 | VI-2026-0001 | VI | Municipio de Tuxtla · Sec. de Economía | — |  |

#### Asuntos

| id | nombre | creador | documentos |
| --- | --- | --- | --- |
| 00000000-0000-4000-8000-000000000401 | Equipamiento de laboratorios 2026 | Ing. Raúl Pérez | OP-2026-0087, OP-2026-0139 |
| 00000000-0000-4000-8000-000000000402 | Presupuesto de inversión 2026 | C.P. Elena Díaz | OP-2026-0148, OP-2026-0127 |
| 00000000-0000-4000-8000-000000000403 | Auditoría ASF 2025 · cuenta pública | Ing. Raúl Pérez | OP-2026-0143, OP-2026-0133 |

Totales: 13 áreas, 14 personas, 11 actores, 37 documentos, 88 movimientos, 7 salidas, 3 asuntos.
