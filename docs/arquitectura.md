# Arquitectura de SIGEDOC

Actualizado: 2026-11-21 · Decisiones de origen: D-10 a D-16, D-29, D-36 a D-57 (grafo de conocimiento).

Está diseñado contra la guía del proyecto (`docs/guia/`); la sección 11 muestra dónde se cubre cada requisito y qué falta.

Este documento es vinculante para la implementación. Si algo aquí contradice al grafo (`docs/grafo-conocimiento/grafo.json`), manda el grafo y la contradicción se reporta.

## 1. Vista general

```
 Navegador
   │  HTTPS (en local, HTTP), cookie de sesión httpOnly
   ▼
 frontend/  React + Vite + TypeScript (SPA, solo archivos estáticos)
   │  REST /api/v1  (cliente generado del OpenAPI)
   ▼
 backend/   FastAPI ─ routers → servicios → repositorios ─┬─ PostgreSQL 17  (registro oficial, bitácora, folios, sesiones, outbox)
                                                         ├─ MongoDB 8.0    (expedientes)
                                                         └─ Neo4j 5.26     (recorrido, referencias, asuntos)
 outbox/    proceso aparte: lee el outbox de PostgreSQL y escribe en MongoDB y Neo4j (D-13, D-48)
```

Reglas de la vista:

1. La interfaz solo habla con la API. Nunca con una base (D-36, D-38).
2. Cada dato tiene una sola fuente de verdad (ver la tabla de la sección 5). Las réplicas se escriben solo desde el outbox.
3. Las tres bases, la API, el proceso del outbox y el frontend compilado se levantan con un solo `docker compose up` (D-41).

## 2. Estructura del repositorio (D-54, guía sección 10)

La organización sigue la que sugiere la guía (sección 10), con nombres en español donde no choca con ella. Equivalencias: `api/v1` = controladores; `servicios` = services; `repositorios/relacional|documental|grafo` = repositories/relational|document|graph.

```
saas_documents/
├── CLAUDE.md                     instrucciones que Claude Code lee al iniciar
├── README.md                     instalación, configuración, carga y ejecución (E-8)
├── docker-compose.yml
├── .env.example                  variables sin secretos reales
├── ai/handoff/                   comunicación revisor ↔ Claude Code
├── .claude/                      permisos y skills del proyecto
├── docs/
│   ├── LEEME.md                  índice: qué entregable vive dónde
│   ├── propuesta.md              E-1
│   ├── modelos/                  E-2 (conceptual, relacional, documental, grafo, diccionario)
│   ├── arquitectura.md           E-3 (este documento)
│   ├── decisiones-tecnologicas.md   E-3 (matriz de comparación del stack)
│   ├── operaciones/              E-5 (catalogo.json y docx; solo lectura para Claude Code)
│   ├── api/                      E-6 (openapi.json exportado del backend)
│   ├── pruebas/                  E-8 y evidencia de E-5 (matriz de pruebas, resultados, rendimiento)
│   ├── grafo-conocimiento/       FUENTE DE VERDAD (solo lectura para Claude Code)
│   └── guia/                     guía del profesor
├── database/                     E-4
│   ├── relational/   schema/ (001_*.sql…)  data/  queries/
│   ├── document/     validators/ ($jsonSchema por tipo e índices)  data/  queries/
│   └── graph/        schema/ (restricciones e índices .cypher)  data/  queries/  tests/
├── backend/
│   ├── pyproject.toml            uv; dependencias con versión fija en uv.lock
│   ├── app/
│   │   ├── main.py               crea la app, monta routers, CORS, manejadores de error
│   │   ├── config.py             pydantic-settings; lee .env
│   │   ├── api/v1/               controladores: un router por recurso; sin lógica de negocio
│   │   ├── servicios/            una función por operación O-xx
│   │   ├── repositorios/
│   │   │   ├── relacional/       PostgreSQL, patrones AR-xx
│   │   │   ├── documental/       MongoDB, patrones AD-xx
│   │   │   └── grafo/            Neo4j, patrones AG-xx
│   │   ├── dominio/              modelos Pydantic, enums (tipos, motivos, roles, estados), errores
│   │   ├── seguridad/            sesiones (D-49) y visibilidad (D-29)
│   │   └── infra/                pools y clientes de las tres bases, unidad de trabajo
│   ├── outbox/                   proceso del outbox (python -m outbox)
│   └── herramientas/             aplicar esquemas y validadores, reconciliar (O-40), carga y respaldo (O-41)
├── tests/                        raíz, como pide la guía; se ejecutan desde backend/ con `uv run pytest ../tests`
│   ├── unit/                     servicios con repositorios falsos
│   ├── integration/              repositorios y flujos contra las tres bases reales
│   └── e2e/                      flujos completos por API (y por navegador en T-14)
└── frontend/
    ├── package.json
    └── src/
        ├── api/                  cliente generado (no se edita a mano)
        └── paginas/  componentes/  hooks/  rutas/
```

## 3. Backend por capas (D-37, D-40, D-54)

| Capa | Hace | No hace |
| --- | --- | --- |
| `api/v1` | Valida la entrada con Pydantic, obtiene el contexto del usuario, llama a un servicio, traduce el resultado a HTTP | SQL, Cypher, consultas a MongoDB, reglas de negocio |
| `servicios` | Implementa una operación O-xx: permisos por rol, reglas (RI-xx), transacción, encolado en el outbox | Importar drivers; construir consultas |
| `repositorios` | Implementa un patrón AR/AD/AG con consultas parametrizadas | Decidir permisos; llamar a otro repositorio |
| `infra` | Pools (`psycopg_pool.AsyncConnectionPool`, `pymongo.AsyncMongoClient`, `neo4j.AsyncGraphDatabase`), unidad de trabajo de PostgreSQL | Lógica de dominio |

Dependencias permitidas: `api → servicios → repositorios → infra`, y todos pueden usar `dominio`. Nunca al revés.

Trazabilidad obligatoria: la docstring de cada función de servicio empieza con su id de operación (`"""O-01. Registrar documento…"""`); la de cada función de repositorio, con su id de patrón (`"""AR-01. …"""`). Las pruebas se llaman `test_o01_…`, `test_ar01_…`.

### 3.1 Escritura con fuente en PostgreSQL (O-01, O-03, O-05, O-19 a O-26)

1. El servicio abre una unidad de trabajo (una transacción de PostgreSQL).
2. Aplica reglas y escribe el registro oficial (folio AR-01, duplicado AR-02, bitácora AR-03).
3. En la misma transacción inserta en `outbox` un registro por destino (AR-04) con el payload completo que la réplica necesita.
4. Confirma y responde. La API no escribe en MongoDB ni en Neo4j en este flujo.

Consecuencia: el contenido del expediente viaja en el payload del outbox. Por eso **la API valida el contenido por tipo con modelos Pydantic equivalentes al `$jsonSchema` de MongoDB** antes de confirmar; una prueba compara ambos esquemas para que no diverjan. Si MongoDB rechaza después algo que la API aceptó, es un defecto, no un caso normal.

### 3.2 Proceso del outbox (O-39, D-13, D-48)

- Un solo proceso toma lotes en orden de `id` con `FOR UPDATE SKIP LOCKED` (AR-05).
- Entrega al menos una vez: cada escritura en el destino es idempotente (`MERGE` en Neo4j; upsert por `_id` en MongoDB). La réplica nunca borra `Asunto` ni referencias (D-25).
- Si un registro falla, reintenta con espera creciente y guarda `intentos` y `ultimo_error`. Al llegar al máximo lo marca `fallido` y deja en espera los registros posteriores **del mismo documento** (el orden importa para unir movimientos con `SIGUIENTE`); los de otros documentos siguen.
- `/api/v1/salud` informa cuántos registros pendientes y fallidos hay.

### 3.3 Escritura con fuente en Neo4j (O-07, O-08, O-18, O-27)

El servicio verifica en PostgreSQL que el documento exista y sea visible, y escribe directo en Neo4j. Excepción: `SUSTITUYE_A` escribe primero en Neo4j y después cambia el estado en PostgreSQL; si falla a medias, lo detecta la reconciliación (D-14, O-40).

### 3.4 Escritura con fuente en MongoDB (O-09, O-17, O-28, O-29)

El servicio verifica visibilidad y estado en PostgreSQL y escribe en MongoDB. El tipo de documento nunca se actualiza (D-26).

### 3.5 Lectura integrada: ficha completa (O-11, D-53)

PostgreSQL primero (existencia, visibilidad, registro, folios y ubicación vigente). Después MongoDB y Neo4j en paralelo con `asyncio.gather` y un tiempo límite por base. Si una no responde, la ficha devuelve lo disponible y marca la sección faltante (`"expediente": {"disponible": false, "motivo": "…"}`).

### 3.6 Sesión y visibilidad (D-29, D-44, D-49, O-36 a O-38)

- Sesión: código aleatorio en cookie `httpOnly`, `SameSite=Lax`; en la base solo su huella SHA-256; caduca por inactividad. Cerrar sesión la revoca.
- Una dependencia de FastAPI construye `ContextoUsuario(id_persona, rol, id_area, areas_visibles, ve_recorrido_completo)` una vez por petición.
- Toda función de repositorio que lea documentos recibe `ctx: ContextoUsuario` como argumento obligatorio, sin valor por defecto. Ningún motor impone la visibilidad (DT-13): por eso cada consulta que lee documentos tiene pruebas de visibilidad (D-56).

### 3.7 Grafo: límites de consulta (D-50)

Toda consulta Cypher parte de un `Documento`, un `Asunto` o de movimientos filtrados por fecha con índice, nunca de un `Area`. Los recorridos variables se limitan a `*..6`.

## 4. Contrato de la API (D-39)

- Prefijo `/api/v1`. JSON en `snake_case`. Fechas en ISO 8601 con zona horaria; se guardan en UTC y la interfaz las muestra en America/Mexico_City.
- Errores con el formato *problem details* (RFC 9457) más un campo `codigo` estable: `NO_AUTENTICADO`, `SIN_PERMISO`, `NO_ENCONTRADO`, `VALIDACION`, `DUPLICADO`, `ESTADO_INVALIDO`, `CONFLICTO`, `BASE_NO_DISPONIBLE`.
- Listados paginados con `?pagina=&tamano=` (máximo 100) y respuesta `{ "elementos": [], "total": n }`.
- IDs: UUID generado por el backend, el mismo en las tres bases (D-15).
- El OpenAPI de FastAPI es el contrato: el frontend genera su cliente con `openapi-typescript` y `openapi-fetch`.

Mapa propuesto (se ajusta al implementar cada tarea; un cambio se reporta):

| Endpoint | Op. |
| --- | --- |
| `POST /sesiones` · `GET /sesiones/actual` · `DELETE /sesiones/actual` | O-36, O-38, O-37 |
| `POST /documentos` (409 `DUPLICADO` con el existente) | O-01 |
| `GET /documentos` (filtros y paginación) | O-30 |
| `GET /documentos/{id}` (ficha) · `GET /documentos/{id}/recorrido` | O-11 · C1 |
| `POST /documentos/{id}/recepciones` | O-19 |
| `POST /documentos/{id}/turnos` · `/devoluciones` · `/atracciones` | O-03 · O-22 · O-23 |
| `POST /documentos/{id}/conclusion` · `/cancelacion` · `/resolucion-duplicado` | O-05 · O-24 · O-26 |
| `POST /movimientos/{id}/correcciones` | O-25 |
| `POST /salidas` · `POST /documentos/{id}/acuses` | O-20 · O-21 |
| `GET /documentos/{id}/expediente` · `PATCH /documentos/{id}/expediente` | O-09 |
| `POST /documentos/{id}/expediente/anexos` · `/notas` · `DELETE …/{id_elemento}` | O-28 · O-29 · O-17 |
| `POST /documentos/{id}/referencias` · `DELETE /documentos/{id}/referencias/{tipo}/{id_destino}` | O-07 · O-18 |
| `POST /asuntos` · `POST /asuntos/{id}/documentos` · `DELETE /asuntos/{id}/documentos/{id_doc}` | O-27 · O-08 · O-18 |
| `GET /asuntos/{id}/hilo` · `GET /asuntos/{id}/alcance` | C2 · C5 |
| `GET /bandeja` · `GET /consultas/pendientes-por-responsable` · `GET /consultas/rebotes` | O-14 · C4 · C3 |
| `GET /catalogos` · `GET /organizacion` | O-31 · O-32 |
| `/areas` · `/personas` · `/usuarios` · `/actores-externos` | O-33 · O-34 · O-35 |
| `GET /salud` (sin sesión; estado de las tres bases y del outbox) | — |

O-39, O-40 y O-41 no son endpoints: son el proceso del outbox y comandos de `herramientas/`.

## 5. Bases de datos

| Dato | Fuente de verdad | Réplica |
| --- | --- | --- |
| Documento (registro oficial), folios, acuses | PostgreSQL | Neo4j (id, tipo, estado, confidencial); MongoDB (id, tipo) |
| Movimientos (bitácora) | PostgreSQL | Neo4j (completa) |
| Áreas, personas, usuarios, roles, sesiones, actores externos | PostgreSQL | Neo4j: Área (id, siglas) y Persona (id, nombre) |
| Expediente: contenido por tipo, anexos y notas | MongoDB | — |
| Asuntos, referencias entre documentos, documentos no registrados | Neo4j | — (respaldo con `neo4j-admin database dump`, D-25) |

Esquemas (D-55): scripts numerados en `database/*/schema` (y `validators` en MongoDB) aplicados en orden por `python -m herramientas.esquemas`, que registra lo aplicado (en PostgreSQL, tabla `esquema_version`); también carga `data/` y es reproducible desde cero (guía 7.4). Un script aplicado no se edita: se agrega otro. El modelo de datos detallado (tablas, columnas, colecciones, etiquetas y relaciones) está en el entregable E-2 (`docs/modelos/`).

Matriz de propiedad de datos (guía 5.2):

| Decisión | Respuesta |
| --- | --- |
| Fuente de verdad | La tabla anterior. Un dato se modifica oficialmente en una sola base. |
| Replicación | Neo4j recibe de Documento: id, tipo, estado y confidencial; de Movimiento: todo; de Área: id y siglas; de Persona: id y nombre. MongoDB recibe de Documento: id y tipo. Se replica para recorrer (Neo4j) y para validar y buscar el expediente por tipo (MongoDB). |
| Sincronización | Outbox transaccional en PostgreSQL y un proceso que entrega en orden, con escrituras idempotentes (secciones 3.1 y 3.2). |
| Consistencia | Reintento con espera creciente y estado `fallido` visible en `/salud`; reconciliación O-40 entre las tres bases; `SUSTITUYE_A` verificado por reconciliación (D-14); tipo inmutable verificado por reconciliación (D-26). Una operación no se reporta como lograda si queda un registro del outbox sin entregar: la respuesta indica que la réplica está pendiente. |

## 6. Configuración

Todo sale de variables de entorno (`.env`, nunca en git). `.env.example` lista al menos:

```
POSTGRES_HOST POSTGRES_PORT POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD
MONGO_URI MONGO_DB
NEO4J_URI NEO4J_USER NEO4J_PASSWORD
API_CORS_ORIGEN SESION_MINUTOS_INACTIVIDAD
OUTBOX_INTERVALO_MS OUTBOX_MAX_INTENTOS
```

Las bases publican sus puertos solo en `127.0.0.1`.

## 7. Pruebas (D-56, guía sección 9)

Ubicación: `tests/unit`, `tests/integration` y `tests/e2e`; consultas y pruebas propias de cada base en `database/*/queries` y `database/graph/tests`. Los resultados y la evidencia de ejecución se guardan en `docs/pruebas/` (guía 12: no basta con scripts sin evidencia de ejecución).

| Tipo de la guía | Cómo se cubre | Cuándo |
| --- | --- | --- |
| Conectividad | `/salud` y una prueba automatizada que se conecta a las tres bases con la configuración del `.env` | T-01 |
| Funcional | Por operación: un caso normal, uno límite y uno de error (núcleo: O-01, O-03, O-05, O-07, O-08, O-09, O-11, O-14, O-22, O-30, O-38, O-39) | con cada tarea |
| Integridad | PostgreSQL: duplicado de folio, UPDATE y DELETE de la bitácora bloqueados, segundo responsable en un grupo de turno (RI-10), documento sin emisor (RI-06). MongoDB: documentos válidos e inválidos por tipo. Neo4j: restricciones de unicidad, dirección y cardinalidad de relaciones. Consultas de validación guardadas en `queries/` | T-02 a T-04 |
| Integración | Extremo a extremo: registrar → outbox → réplicas → ficha O-11 con las tres bases | T-14 |
| Consistencia | Escenario: se detiene el destino, se escribe, se reanuda y se verifica; escenario de contradicción inducida detectada por O-40 | T-12 y T-14 |
| Errores | Base caída, dato inválido y escritura parcial (el outbox en `fallido`); la API responde con `BASE_NO_DISPONIBLE` o con la réplica marcada pendiente, nunca con éxito completo falso | con cada tarea y T-14 |
| Concurrencia | Registros simultáneos en la misma área y año: folios consecutivos sin huecos ni repetidos (D-21); dos usuarios turnando el mismo documento | T-06 y T-14 |
| Rendimiento | Flujos prioritarios (O-01, O-14, O-30, O-11, C1) con volumen de semilla de temporada alta (unos 300 documentos por semana, D-35) y entorno descrito | T-14 |
| Visibilidad | Toda consulta que lee documentos: un usuario sin visibilidad no ve el contenido (DT-13) | con cada tarea |

Calidad: `uv run ruff check`, `uv run ruff format --check`, `uv run pytest ../tests`; en el frontend, `npm run lint` y `npm run build`. Las pruebas de integración usan bases de prueba aisladas (`sigedoc_test`) que se limpian entre pruebas. La matriz de pruebas (qué se probó, cómo y con qué resultado) vive en `docs/pruebas/matriz.md`.

## 8. Frontend (D-38)

SPA con React, Vite y TypeScript estricto. Estado del servidor con TanStack Query; rutas con React Router. La biblioteca de componentes y el sistema visual se eligen después del maquetado en Figma; hasta entonces no se instala ninguna. En desarrollo, Vite reenvía `/api` al backend, así la cookie es del mismo origen.

## 9. Despliegue (D-41)

`docker-compose.yml` con los servicios `postgres`, `mongo`, `neo4j`, `api`, `outbox` y `web` (Nginx con el frontend compilado y reenvío de `/api`). Volúmenes con nombre para los datos y verificación de salud por servicio. Para desarrollar, basta levantar las tres bases y correr la API y Vite en local.

## 10. Plan de tareas para Claude Code

Una tarea a la vez; cada una deja pruebas en verde, evidencia y un commit. El detalle llega en `ai/handoff/siguiente.md`.

| Tarea | Contenido | Depende de |
| --- | --- | --- |
| T-01 | Esqueleto: docker-compose con las tres bases, backend con configuración, pools y `/salud`, frontend vacío, herramientas de calidad, prueba de conectividad | — |
| T-02 | PostgreSQL (E-4): esquema, ejecutor de esquemas, datos de prueba, consultas representativas y pruebas de integridad y transacciones | T-01, E-2 en `docs/modelos/` |
| T-03 | MongoDB (E-4): validadores `$jsonSchema` por tipo, índices, carga, consultas y pruebas de documentos válidos e inválidos | T-02 |
| T-04 | Neo4j (E-4): restricciones, índices, carga, consultas y pruebas de humo, integridad y cardinalidad | T-02 |
| T-05 | Sesiones, roles y visibilidad (O-36 a O-38) | T-02 |
| T-06 | Registro O-01 y proceso del outbox O-39 (primer flujo completo) y prueba de concurrencia de folios | T-03, T-04, T-05 |
| T-07 | Turnos, devoluciones, atracción y bandeja (O-03, O-22, O-23, O-14) | T-06 |
| T-08 | Ficha O-11, recorrido C1 y expediente (O-09, O-17, O-28, O-29) | T-07 |
| T-09 | Conclusión, cancelación, corrección, duplicados y segunda recepción (O-05, O-24, O-25, O-26, O-19) | T-07 |
| T-10 | Referencias y asuntos (O-07, O-08, O-18, O-27) y consultas C2, C3, C5 | T-08 |
| T-11 | Búsqueda, catálogos, organización, administración y salidas (O-30 a O-35, O-20, O-21), C4 | T-09 |
| T-12 | Reconciliación O-40, respaldo y carga O-41, con escenarios de consistencia | T-10 |
| T-13 | Vistas del frontend según el maquetado | maquetado aprobado, T-05 |
| T-14 | Validación integral: extremo a extremo, consistencia, errores, rendimiento, matriz de pruebas, evidencia del catálogo E-5 y exportación de `docs/api/openapi.json` | T-11, T-12, T-13 |
| T-15 | Despliegue y documentación: servicio `web`, compose completo, README de instalación y ejecución desde cero | T-14 |

## 11. Trazabilidad con la guía

| Guía | Requisito | Dónde se cubre | Estado |
| --- | --- | --- | --- |
| 2.4, 8 | Interfaz → API → servicios → repositorios → tres bases; sin acceso directo | Secciones 1 y 3; regla 2 del handoff | Diseñado |
| 5.2 | Fuente de verdad, replicación, sincronización, consistencia | Sección 5 (matriz) y 3.1 a 3.4 | Diseñado; evidencia en T-12 y T-14 |
| 7.1 | E-1 Propuesta | `docs/propuesta.md` | De Diego (en revisión) |
| 7.2 | E-2 Modelado de datos | `docs/modelos/` | De Diego (en revisión); debe reconciliarse con D-42 a D-57 antes de T-02 |
| 7.3 | E-3 Arquitectura y stack | Este documento y `decisiones-tecnologicas.md` | Redactado; falta la figura del diagrama |
| 7.4 | E-4 Tres bases: scripts, carga, consultas y pruebas | `database/` | T-02 a T-04 |
| 7.5 | E-5 Catálogo con casos y evidencia | `docs/operaciones/` y `docs/pruebas/` | Catálogo hecho; casos y evidencia en T-14 |
| 7.6 | E-6 Backend y API, contrato documentado | `backend/app` y `docs/api/openapi.json` | T-05 a T-11; exportación en T-14 |
| 7.7 | E-7 Interfaz y flujo integrado (O-11) | `frontend/` | T-13 |
| 7.8 | E-8 Pruebas, rendimiento, instalación | `tests/`, `docs/pruebas/`, `README.md`, `.env.example` | T-01 a T-15 |
| 9 | Siete tipos de prueba de integración | Sección 7 | Planeado |
| 10 | Organización del repositorio | Sección 2 | Adaptada con equivalencias |
| 12 | Evitar scripts sin evidencia de ejecución y documentación al final | Cada tarea exige evidencia en el reporte; T-15 solo cierra | Método |
