# Reporte T-03: Esqueleto del backend y entorno

- Estado: parcial. Se cumplen los criterios 1 a 8 y el 10. El 9 (`/ponytail-review`) no se hizo: el plugin no está en esta sesión y Diego pidió omitirlo. Ver «Desviaciones».
- Fecha: 2026-11-24

## Qué hice

La evidencia completa está en `docs/pruebas/T-03-conectividad.md`, con las salidas en `docs/pruebas/T-03-verificacion/` y las capturas en `docs/pruebas/T-03-capturas/`.

**Preparación (Fase 0).** La rama parte de `develop` en `6ecd69f`.
- Faltaban uv y Python 3.13. Con la autorización de Diego:
  - uv 0.13.9 ya estaba instalado; la sesión no lo veía porque su PATH era anterior a la instalación.
  - `uv python install 3.13` instaló 3.13.18.
  - Node pasó de 24.12.0 a 24.22.3 con winget, porque jsdom 31 pide 24.15 o mayor.
- ponytail no está disponible. Diego decidió seguir sin él.

**Parte 0 · Prueba intermitente.**
- La prueba `o27_o08_v11b_…` ahora retiene la escritura desde la prueba. `vi.mock('../api')` envuelve `crearAsunto` con `retenida(…)`, y `conEscrituraRetenida(…)` mantiene pendiente la promesa mientras se comprueba `aria-busy="true"` y la suelta al final. No se tocaron el simulador ni la vista, ni se subieron tiempos de espera o reintentos.
- En la primera tanda de cinco corridas fallaron otras dos pruebas por la misma causa: `o22_motivo_obligatorio_boton_pendiente_…` y `o28_hojas_invalidas_…_boton_pendiente_…` (`modales.test.tsx`). Recibieron el mismo arreglo, porque el criterio 7 exige cinco corridas en verde.
- Los ayudantes viven en `src/pruebas/retener.ts`, que no importa `../api`: así se pueden usar dentro de la fábrica de `vi.mock`.

**Parte A · docker-compose y `.env.example`.**
- Imágenes fijadas: `postgres:17.12`, `mongo:8.0.38` y `neo4j:5.26.34-community`. La de Neo4j es el mismo build (5.26.34) que `5.26-community`.
- Volúmenes con nombre y `healthcheck` en cada base: cada 2 s mientras arranca y cada 30 s después.
- Puertos solo en `127.0.0.1`. Todo valor sale de `.env`, con `${VAR:?…}` para que falle si falta.
- Neo4j con heap y page cache configurables (512 MB y 256 MB).
- Servicio `api` con `depends_on: service_healthy` en las tres bases.
- `.env.example` incluye todas las variables de la sección 6 más las del compose.

**Parte B · Backend.**
- Proyecto `backend/` con uv y Python 3.13. Solo las dependencias pedidas, con versiones fijas en `uv.lock`.
- Estructura mínima: `app/main.py`, `app/config.py`, `app/infra/{postgres,mongo,neo4j}.py` y `app/api/salud.py`.
- `config.py` usa pydantic-settings. Sin una variable, o con ella vacía, lanza `ErrorConfiguracion` con solo los nombres. Usa `from None` para que la traza no arrastre el `ValidationError`, que sí mostraría los valores.
- Lifespan:
  - Abre `AsyncConnectionPool` (con `wait=False`), `AsyncMongoClient` y `AsyncGraphDatabase.driver`, y los cierra al apagar.
  - Escribe una línea de registro por base al arrancar (el «registro de conexión» de la guía, sección 9).
  - Si una base no responde, la API arranca igual.
- CORS limitado a `API_CORS_ORIGEN`.
- `GET /api/salud`:
  - Consulta las tres bases en paralelo con un límite de 2 s por base.
  - Responde 200 con `ok` o 503 con `degradado`.
  - `error` solo puede ser «sin conexión» o «tiempo agotado». El registro anota únicamente el tipo de la excepción.
- `backend/Dockerfile` de producción:
  - `python:3.13.18-slim`.
  - uv se monta solo para instalar y no queda en la imagen.
  - Sin el grupo dev, con bytecode precompilado y usuario `sigedoc`.
- Pruebas: 14 unitarias en `tests/unit/` (salud con bases simuladas y config) y 4 de integración en `tests/integration/`, marcadas con `integracion`.

**Parte C · Frontend.**
- Proxy de Vite: `/api` → `http://127.0.0.1:8000`.
- En modo `real`, `AvisoApiReal` muestra bajo el aviso de siempre una línea por base, o «No se pudo consultar el estado de la API».
  - La llamada está en `src/api/salud.ts`, fuera de `ApiSigedoc` y del simulador, y no se exporta desde `index.ts`.
  - Usa React Query, como el resto de las lecturas. Por eso `QueryClientProvider` ahora envuelve las dos ramas de `main.tsx`; el modo simulado no cambia en nada más.
- Cuatro pruebas nuevas: `ok`, `degradado`, sin respuesta y respuesta que no es de salud.

**Parte D.**
- `README.md`: requisitos, `.env`, bases, backend (local y en contenedor), pruebas del backend y modo real.
- `CLAUDE.md`: en «Comandos», la línea de T-03 se sustituyó por los comandos reales. El resto del archivo no cambió.

**Criterios.**

1. Las tres bases `healthy`.
2. Código 0 en todos los comandos; 18 pruebas pasadas.
3. 200 y `ok`.
4. Con Neo4j detenida: 503, `degradado` y solo `neo4j.ok = false`. Al levantarla vuelve a 200 sin reiniciar la API, y no aparece ninguna credencial.
5. La API en contenedor responde 200 y `ok`.
6. Sin `API_CORS_ORIGEN`, la API no arranca y el mensaje la nombra sin mostrar valores.
7. Sin errores ni advertencias; 175 pruebas (antes 171), cinco corridas en verde.
8. Dos capturas del modo real (bases bien y Neo4j detenida) y el modo simulado funciona igual.
9. No se hizo (ver «Desviaciones»).
10. Un solo commit, sin push.

## Archivos

Creados:
- `docker-compose.yml`, `.env.example`: bases y API.
- `backend/pyproject.toml`, `backend/uv.lock`, `backend/.python-version`: proyecto uv y versiones fijas.
- `backend/Dockerfile`, `backend/.dockerignore`: imagen de producción.
- `backend/app/__init__.py`, `backend/app/main.py`: app, lifespan, CORS y router bajo `/api`.
- `backend/app/config.py`: configuración y error sin valores.
- `backend/app/infra/__init__.py`, `postgres.py`, `mongo.py`, `neo4j.py`: un cliente y una verificación por base.
- `backend/app/api/__init__.py`, `backend/app/api/salud.py`: `GET /api/salud`.
- `tests/pytest.ini`, `tests/conftest.py`: configuración de pytest y bucle Selector en Windows.
- `tests/unit/test_salud.py`, `tests/unit/test_config.py`: pruebas unitarias.
- `tests/integration/test_conectividad.py`: conectividad real y salud de extremo a extremo.
- `frontend/src/api/salud.ts`: llamada a `/api/salud`.
- `frontend/src/componentes/compuestos/AvisoApiReal.tsx` y `.test.tsx`: aviso del modo real y sus pruebas.
- `frontend/src/pruebas/retener.ts`: `retenida` y `conEscrituraRetenida`.
- `docs/pruebas/T-03-conectividad.md`, `docs/pruebas/T-03-verificacion/` (salidas y los scripts `verificar-backend.sh`, `salud-interfaz.mjs`, `modo-simulado.mjs`), `docs/pruebas/T-03-capturas/`: evidencia.
- `ai/handoff/historial/T-03-asignacion.md` y `T-03-reporte.md`.

Modificados:
- `frontend/vite.config.ts`: proxy.
- `frontend/src/main.tsx`: `AvisoApiReal` y `QueryClientProvider` en las dos ramas.
- `frontend/src/paginas/consulta.test.tsx`, `modales.test.tsx`: Parte 0.
- `frontend/package-lock.json`: regenerado (ver «Decisiones»).
- `README.md`, `CLAUDE.md`.

## Evidencia

| Criterio | Comando | Resultado | Salida |
| --- | --- | --- | --- |
| 1 | `docker compose up -d postgres mongo neo4j`; `docker compose ps` | Las tres `(healthy)`. Etiquetas `postgres:17.12`, `mongo:8.0.38`, `neo4j:5.26.34-community` | `criterio1-bases.txt` |
| 2 | `uv sync`, `uv run ruff check`, `uv run ruff format --check`, `uv run pytest ../tests` | Código 0 en todos; `18 passed` | `criterio2-backend.txt` |
| 3 | `uv run uvicorn app.main:app --loop asyncio:SelectorEventLoop`; `GET /api/salud` | `HTTP 200`, `estado: ok`; registro «postgres/mongo/neo4j: conectada» | `criterio3-salud-local.txt` |
| 4 | `docker compose stop neo4j` / `start neo4j` | `HTTP 503`, `degradado`, solo `neo4j` con «tiempo agotado». Después `HTTP 200` sin reiniciar. Búsqueda de credenciales: «ninguno» | `criterio4-neo4j-detenida.txt` |
| 5 | `docker compose up -d --build api` | `HTTP 200`, `ok`; imagen de 277 MB, sin uv ni pytest, usuario sin privilegios | `criterio5-api-contenedor.txt` |
| 6 | `.env` sin `API_CORS_ORIGEN` | Código 1: `Configuración incompleta: faltan o están vacías API_CORS_ORIGEN.`; ningún valor de `.env` en la salida | `criterio6-variable-faltante.txt` |
| 7 | `npm ci`, `lint`, `typecheck`, `npm test` ×5, `build` | Código 0 en todos; `175 passed` cinco veces; build sin avisos | `criterio7-frontend.txt`, `npm-test-1..5.txt` |
| 8 | Modo real con el backend; Neo4j detenida; modo simulado | «PostgreSQL: ok / MongoDB: ok / Neo4j: ok» y «Neo4j: tiempo agotado»; bandeja con 5 filas en modo simulado | `salud-interfaz.md`, `modo-simulado.md`, `T-03-capturas/*.png` |
| 9 | `/ponytail-review` | No se hizo; en su lugar `/simplify` | — |
| 10 | `git log -1 --format=%B`, `git status`, `git ls-files` | Un commit `T-03: …` sin coautoría; sin `.env`, `node_modules`, `.venv` ni `dist` | (al cerrar) |

## Decisiones que tomé

- **Credenciales de MongoDB aparte de la URI.** Se usan `MONGO_USER` y `MONGO_PASSWORD`, y la URI no lleva credenciales. Así el secreto no se duplica en `.env` y la URI no es un secreto. Igual sigue tratándose como `SecretStr` por si alguien la escribe con credenciales.
- **Puertos por variable.** `.env.example` usa 5433 (PostgreSQL) y 27018 (MongoDB). En esta máquina hay un `postgres.exe` y un `mongod.exe` nativos ocupando 5432 y 27017, y no los toqué. Se agregaron `MONGO_PORT`, `NEO4J_HTTP_PORT`, `NEO4J_BOLT_PORT` y `API_PORT`.
- **La verificación de salud vive en `infra/`.** `api/salud.py` llama a `postgres.verificar`, `mongo.verificar` y `neo4j.verificar` directamente, sin servicio ni repositorio. La tarea solo pide `infra/` y `api/salud.py`, y un `SELECT 1` o un `ping` no son lógica de dominio.
- **Windows y psycopg.** En Windows uvicorn usa `ProactorEventLoop`, con el que psycopg no funciona. El comando local es `uv run uvicorn app.main:app --loop asyncio:SelectorEventLoop`. Si se arranca sin la opción, el lifespan falla con un mensaje que la nombra; así no parece que PostgreSQL esté caído. En las pruebas, `tests/conftest.py` fija la política del bucle. En Linux y en el contenedor no hace falta.
- **`frontend/package-lock.json` regenerado.** Con el lock de T-02c, `npm ci` fallaba con npm 11.7 y 11.19 (`Missing: @emnapi/core@2.0.0-beta.2`): faltaban dos dependencias opcionales de wasm32 y tenía el nombre viejo `frontend`. El lock regenerado no cambia la versión de ningún paquete instalado; lo comprobé con un diff de `version`, `resolved` e `integrity`.
- **`check` en el pool de PostgreSQL.** Cada préstamo verifica la conexión, para que /api/salud no reciba una conexión rota tras un reinicio. Cuesta un viaje extra por préstamo (ver «Deuda»).
- **Healthchecks** cada 2 s durante el arranque y cada 30 s después: `mongosh` levanta un proceso de Node en cada chequeo.

## Desviaciones

- **Criterio 9 y niveles de ponytail.** El plugin no está en esta sesión (VS Code). Diego pidió primero seguir sin él y al final omitirlo. En su lugar corrí `/simplify` con cuatro revisiones: reutilización, simplificación, eficiencia y altitud. Apliqué:
  - React Query en el aviso.
  - `retenida` compartida en lugar de tres envolturas copiadas.
  - `BASES` derivado del modelo `Bases` y alias `ErrorBase`.
  - Sin la dependencia `Depends` que nadie sobrescribía.
  - Tipo literal del error en el frontend.
  - Imagen sin uv, sin caché y con bytecode precompilado.
  - Healthchecks más espaciados.
  - Error claro con `ProactorEventLoop`.
  - Limpieza de `tests/pytest.ini` y nota sobre Python 3.14 en `conftest.py`.

  Omití, con su razón:
  - `uvicorn[standard]` solo en dev: la tarea lo pide así.
  - Quitar del ejemplo las variables de sesión y outbox: la tarea pide todas las de la sección 6.
  - `MONGO_HOST`/`NEO4J_HOST` en lugar de las URIs: la arquitectura fija `MONGO_URI` y `NEO4J_URI`.
  - Una compuerta global para todas las escrituras en `preparar.ts`: ver «Dudas».
  - Quitar `check` del pool: ver «Deuda».
- **La configuración de pytest está en `tests/pytest.ini` y no en `backend/pyproject.toml`.** Con `uv run pytest ../tests`, pytest busca su configuración desde `tests/` hacia arriba, nunca en el directorio actual, y `backend/` es hermano de `tests/`. La de ruff sí está en `backend/pyproject.toml`.
- **ruff no descubre `../tests` solo.** `uv run ruff check` revisa únicamente `backend/`. Documenté `uv run ruff check . ../tests` y `uv run ruff format --check . ../tests`, que usan la misma configuración; la evidencia incluye las dos formas.
- **Comando de uvicorn en Windows.** El criterio 3 dice `uv run uvicorn app.main:app`. En Windows lleva además `--loop asyncio:SelectorEventLoop` (ver «Decisiones»).
- **Parte 0 tocó tres pruebas, no una.** Las otras dos tenían el mismo defecto y fallaron en la primera tanda de cinco corridas.
- **Sin confirmación de nivel en cada fase.** Sin ponytail no había nivel que cambiar; solo anuncié cada fase.

## Dudas y huecos propuestos

1. **httpx frente a httpx2.** Starlette 1.10 declara obsoleto `httpx` en su `TestClient` y pide `httpx2`. Como la tarea fija `httpx`, `tests/pytest.ini` ignora solo esa advertencia (todas las demás son error).
   - HU-propuesto: cambiar `httpx` por `httpx2` en el grupo dev.
   - Afecta a todas las pruebas que usen `TestClient`.
   - Opciones: (a) cambiar ya, una dependencia nueva que hay que aprobar; (b) dejar el filtro hasta que Starlette quite el soporte.
2. **Compuerta de escrituras en las pruebas del frontend.** Cada prueba que quiera ver un botón pendiente debe envolver su escritura con `retenida` en su propio `vi.mock('../api')`.
   - HU-propuesto: una compuerta global en `src/pruebas/preparar.ts` que envuelva todas las escrituras de `ApiSigedoc`.
   - Afecta a las pruebas de estado pendiente futuras (T-15 y las vistas que falten).
   - Opciones: (a) la compuerta global, que choca con los archivos que ya tienen su propio `vi.mock('../api')`; (b) dejar `retenida` por archivo, como ahora.
3. **`/api/salud` en la arquitectura.** La sección 3.2 dice que `/api/salud` informará los pendientes y fallidos del outbox. Hoy solo informa las bases. Queda para T-08, como pide la tarea.
4. **Cambios ajenos en el árbol.** Mientras trabajaba aparecieron cambios sin commit en `docs/grafo-conocimiento/` (README, `grafo.json`, `grafo.cypher`, `grafo.html`) y en `docs/modelos/` (`LEEME.md` y `01` a `05`, es decir E-2), hechos entre las 06:27 y las 06:33. No son míos: no los toqué ni los incluí en el commit. Siguen sin commit, igual que `ai/handoff/siguiente.md`.

## Deuda detectada

- **Credenciales de administrador.** La API usa el superusuario de PostgreSQL, el root de MongoDB y el usuario `neo4j`, como permite la tarea para desarrollo. Se corrige con usuarios de mínimo privilegio en T-04 a T-06.
- **`check=AsyncConnectionPool.check_connection`** agrega un viaje a PostgreSQL por cada préstamo del pool. Cuando lleguen los repositorios (T-04+), conviene revisarlo, por ejemplo con `max_idle` y `max_lifetime` o un `pool.check()` periódico.
- **`asyncio.set_event_loop_policy`** está obsoleta desde Python 3.14. Con `filterwarnings = error`, subir `requires-python` rompería las pruebas en Windows hasta cambiarla por un `loop_factory` (anotado en `tests/conftest.py`).
- **Pruebas de integración contra la base de desarrollo.** La arquitectura (sección 7) pide bases aisladas `sigedoc_test`. Las de T-03 solo leen (`SELECT 1`, `ping`, versión), así que todavía no hacen falta. Deben llegar con T-04, cuando haya datos.
- **Límite de 2 s en tres lugares.** `TIEMPO_LIMITE_S` en `salud.py` y los tiempos de conexión de cada cliente en `infra/` son independientes. Si se ajusta uno, hay que revisar los otros.
- **Entorno de esta máquina.** Hay una copia global de npm 11.7.0 en `AppData\Roaming\npm` que tapa al npm 11.19.1 que trae Node 24.22.3. Con el lock regenerado, los dos funcionan.

## Siguiente paso sugerido

Decidir httpx2 (duda 1) y entregar E-2 para asignar T-04, el esquema de PostgreSQL con usuarios de mínimo privilegio y bases de prueba aisladas.
