# T-03: Esqueleto del proyecto y entorno

> **Borrador del revisor, no asignado.** Era la T-01 original; pasó a T-03 por D-63 (interfaz primero). Antes de asignarlo se ajusta el punto 4: el frontend ya existe desde T-01, así que solo se agrega el proxy de Vite y el indicador de salud.

- Asignada: 2026-11-21
- Depende de: nada
- Fuentes: `docs/arquitectura.md` (secciones 1, 2, 3, 6, 7, 8 y 9); grafo: D-36 a D-41, D-49, D-54 a D-57; guía del profesor en `docs/guia/` (secciones 7.8 y 9: conectividad con configuración segura, variables de entorno de ejemplo sin credenciales)

## Objetivo

Dejar un proyecto que arranca: las tres bases levantadas con docker-compose, un backend FastAPI que se conecta a las tres y lo demuestra en `/api/salud`, un frontend vacío que consume ese endpoint por el proxy de Vite, y las herramientas de calidad funcionando. Sin lógica de negocio.

## Alcance

1. **docker-compose.yml** en la raíz:
   - `postgres` (`postgres:17`), `mongo` (`mongo:8.0`), `neo4j` (`neo4j:5.26-community`). Fija la etiqueta exacta del parche vigente que descargues (por ejemplo `postgres:17.x`) y anótala en el reporte.
   - Volúmenes con nombre, verificación de salud (`healthcheck`) en cada base y puertos publicados solo en `127.0.0.1`.
   - Credenciales tomadas de `.env`; ningún secreto escrito en el compose.
   - Neo4j con memoria acotada para una laptop (heap y page cache pequeños, configurables por variable).
   - Servicio `api` construido desde `backend/Dockerfile`, que espera a que las tres bases estén sanas. Los servicios `outbox` y `web` llegan en T-08 y T-17; no los crees.
2. **.env.example** con todas las variables de la sección 6 de la arquitectura y valores de desarrollo evidentes (no reales). Crea también tu `.env` local a partir de él; no se versiona.
3. **backend/** con uv y Python 3.13:
   - Dependencias: `fastapi`, `uvicorn[standard]`, `pydantic-settings`, `psycopg[binary,pool]`, `pymongo`, `neo4j`. Desarrollo: `pytest`, `pytest-asyncio`, `httpx`, `ruff`. Ninguna otra.
   - Estructura de la sección 2 de la arquitectura, creando solo lo que esta tarea usa: `app/main.py`, `app/config.py`, `app/infra/` (un módulo por base) y `app/api/salud.py`. Las demás carpetas se crean cuando una tarea las necesite.
   - `config.py` con pydantic-settings; falla al iniciar si falta una variable obligatoria.
   - Los clientes de las tres bases se abren en el `lifespan` de FastAPI y se cierran al apagar: `AsyncConnectionPool` de psycopg, `AsyncMongoClient` de PyMongo y `AsyncGraphDatabase.driver` de Neo4j.
   - CORS limitado a `API_CORS_ORIGEN`.
   - `GET /api/salud`, sin sesión: consulta las tres bases en paralelo con un tiempo límite corto por base y responde `{"estado": "ok" | "degradado", "bases": {"postgres": {"ok": bool, "ms": int, "error": str | null}, "mongo": {…}, "neo4j": {…}}}`. Código 200 si las tres responden, 503 si alguna falla. Nunca expone credenciales ni cadenas de conexión en `error`.
   - `backend/Dockerfile` para producción (sin dependencias de desarrollo) que corre uvicorn.
   - Configuración de ruff y pytest en `pyproject.toml`. Las pruebas viven en `tests/` de la raíz del repositorio (como pide la guía), no dentro de `backend/`: `tests/unit/` (salud con las bases simuladas: todas bien, una caída) y `tests/integration/` (conectividad y salud contra las bases reales, marcada para poder correrla aparte). Configura pytest para que se ejecuten desde `backend/` con `uv run pytest ../tests`.
4. **frontend/** con la plantilla `react-ts` de Vite:
   - TypeScript estricto, `engines.node >= 24`.
   - Proxy de Vite: `/api` → `http://127.0.0.1:8000`.
   - Una sola página que llama a `/api/salud` y muestra el estado de cada base en texto plano. Sin biblioteca de componentes, sin router y sin TanStack Query todavía.
   - `npm run lint` y `npm run build` funcionando.
5. **README.md** de la raíz: requisitos, cómo levantar las bases, el backend y el frontend en Windows, y cómo correr las pruebas.
6. **CLAUDE.md**: llena solo la sección «Comandos» con los comandos reales que quedaron. No cambies el resto.

## Fuera de alcance

Esquemas, tablas, colecciones o restricciones de las bases (T-04 a T-06); usuarios de aplicación con permisos mínimos en las bases (T-04 a T-06); sesiones y roles (T-07); outbox; cualquier operación O-xx; servicio `web` con Nginx; biblioteca de UI; integración continua.

## Criterios de aceptación

Ejecuta cada uno y pon su resultado resumido en el reporte.

1. `docker compose up -d postgres mongo neo4j` y luego `docker compose ps`: las tres en estado `healthy`.
2. En `backend/`: `uv sync`, `uv run ruff check`, `uv run ruff format --check` y `uv run pytest ../tests` en verde, incluidas las pruebas de integración. Guarda en `docs/pruebas/` el registro de esa ejecución (`T-03-conectividad.md`: comando, fecha, versión de cada base y resultado).
3. Con el backend en local (`uv run uvicorn app.main:app`), `GET http://127.0.0.1:8000/api/salud` devuelve 200 y `estado: ok` con las tres bases.
4. Con `docker compose stop neo4j`, el mismo endpoint devuelve 503, `estado: degradado` y solo `neo4j.ok = false`. Vuelve a levantarla después.
5. `docker compose up -d --build api`: el contenedor arranca y `/api/salud` responde `ok` desde él.
6. En `frontend/`: `npm ci`, `npm run lint` y `npm run build` sin errores; con `npm run dev` y el backend arriba, la página muestra las tres bases en `ok`.
7. `git status` limpio después del commit y `git ls-files` no incluye `.env` ni `node_modules` ni `.venv`.

## Notas del revisor

- Diego trabaja en Windows con Docker Desktop. Usa comandos que funcionen en PowerShell o Git Bash, y avisa en el reporte si algo depende del sistema operativo.
- Neo4j exige una contraseña de al menos 8 caracteres en `NEO4J_AUTH`.
- En T-03 la API puede usar las credenciales de administrador de cada base porque solo es desarrollo; déjalo anotado como deuda en el reporte, se corrige en T-04 a T-06.
- Si una versión de imagen o de biblioteca no existe o tiene un problema conocido, no cambies de versión mayor por tu cuenta: repórtalo.
