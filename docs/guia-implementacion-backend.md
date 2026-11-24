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
    ├── api/v1/               un router por recurso; sin lógica de negocio
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
| RI-06 | Todo documento tiene emisor: un área activa o un actor externo activo. |
| RI-10 | Un solo responsable por grupo de turno. |
| D-47 | Jerarquía de áreas sin ciclos, validada con consulta recursiva dentro de la transacción; no se desactiva un área con pendientes ni con áreas activas que dependan de ella. |
| D-20 | Se desactiva, no se borra (áreas, actores, personas). Las siglas son fijas mientras el área tenga folios emitidos. |

## 7. Mapa de endpoints

Punto de partida: la tabla de `docs/arquitectura.md` sección 4. Lo que el simulador agrega o ajusta queda aquí hasta que el inventario lo confirme:

| Endpoint | Op. | Estado |
| --- | --- | --- |
| `GET /documentos/folio-siguiente` | lectura de V-03 | nuevo, a confirmar (T-15) |
| `GET /consultas/acuses` | tarjeta «Acuses» (D-58) | nuevo, a confirmar |
| `GET /consultas/posibles-duplicados` y `GET …/{id}/comparacion` | V-14 | nuevo, a confirmar |
| `GET /salidas` | V-13 | nuevo, a confirmar |
| `GET /asuntos` | V-11b y selector de V-11 | nuevo, a confirmar |

Se completa con la T-02c: ruta, método, cuerpo y errores definitivos por función.

## 8. Orden de implementación y qué reutilizar

| Tarea | Qué entrega | De dónde sacar los casos de aceptación |
| --- | --- | --- |
| T-03 | Esqueleto, tres bases en docker-compose, `/salud` | Borrador `ai/handoff/borradores/T-03-esqueleto-backend.md` |
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

Para que no sorprendan al conectar (T-15). Se completa con la T-02c.

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
- Reconciliar E-2 (`docs/modelos/`) con D-42 a D-68 antes de T-04.

## 12. Entorno

- Windows con Docker Desktop; comandos para PowerShell o Git Bash, y dilo en el reporte si algo depende del sistema.
- Bases con puertos publicados solo en `127.0.0.1`; credenciales en `.env` (no versionado); `.env.example` sin secretos reales.
- Neo4j exige contraseña de al menos 8 caracteres.
- En T-03 la API puede usar credenciales de administrador (solo desarrollo); se corrige con usuarios de mínimo privilegio en T-04 a T-06.

## Apéndice A. Inventario del contrato

Se pega aquí, ya revisado, el contenido de `ai/handoff/borradores/contrato-api.md` (T-02c): una ficha por función de `src/api/index.ts`. Pendiente.
