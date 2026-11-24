# T-03: Esqueleto del backend y entorno

- Asignada: 2026-11-24
- Depende de: T-02c (commit `e8483e7`, integrada en `develop`)
- Fuentes:
  - `docs/arquitectura.md`: secciones 1 (vista general), 2 (estructura), 3 (capas), 6 (configuración), 7 (pruebas) y 9 (despliegue).
  - `docs/guia-implementacion-backend.md`: secciones 3, 4 y 12.
  - `docs/traspaso-backend.md`: sección 4, punto 3 (los tres ajustes de esta tarea).
  - Grafo (skill `consultar-grafo`): D-36 a D-41, D-54, D-55, D-56, D-57 y D-71.
  - Guía del profesor (`docs/guia/`): secciones 7.8 (variables de entorno de ejemplo sin credenciales), 9 (prueba de conectividad con configuración segura) y 10 (organización del repositorio).
  - `ai/handoff/historial/T-02c-reporte.md`: estado del frontend y la prueba intermitente.

## Objetivo

Dejar el proyecto listo para empezar el backend, sin lógica de negocio:

1. Las tres bases levantadas con docker-compose y sanas.
2. Un backend FastAPI que abre una conexión con cada base y lo demuestra en `GET /api/salud`.
3. El frontend existente con el proxy de Vite hacia la API y, en modo `real`, un indicador de salud.
4. Las herramientas de calidad y las pruebas del backend funcionando, con evidencia.
5. La prueba intermitente del frontend corregida.

## Forma de trabajo

### Skills

| Skill | Uso |
| --- | --- |
| `handoff` | Protocolo, cierre y reporte |
| `consultar-grafo` | Decisiones citadas; no leas `grafo.json` completo |
| `ponytail` | Nivel por fase (tabla siguiente) y `/ponytail-review` al final |

No uses `impeccable` ni `accesslint`: esta tarea no cambia las vistas del maquetado.

### Fases y nivel de ponytail

Al empezar cada fase escribe `Fase N · Ponytail → X` y espera a que Diego confirme el cambio.

| Fase | Contenido | Ponytail |
| --- | --- | --- |
| 0. Preparación | Leer esta asignación y las fuentes; comprobar Node 24, Python 3.13, uv y Docker Desktop | **off** |
| 1. Prueba intermitente | Parte 0 | **full** |
| 2. Bases y backend | Partes A y B | **full** |
| 3. Frontend | Parte C | **full** |
| 4. Cierre | README, CLAUDE.md, criterios, evidencia, reporte; `/ponytail-review` al final | **off** (full solo para `/ponytail-review`) |

### Dudas

Si una duda no te impide avanzar, toma la opción más conservadora, sigue y anótala en «Dudas y huecos propuestos». Detente solo si no puedes avanzar sin respuesta.

## Alcance

### Parte 0. Prueba intermitente del frontend

La prueba `o27_o08_v11b_crea_un_asunto_y_el_documento_queda_asignado` (`frontend/src/paginas/consulta.test.tsx`) falla a veces con carga: con latencia 0, la espera de `aria-busy="true"` no alcanza a ver el estado pendiente.

- Prefiere **controlar la promesa desde la prueba** (que el estado ocupado sea observable sin depender del tiempo) sin cambiar el simulador ni el código de la vista.
- Si eso no es posible sin tocar el simulador o la vista, quita esa aserción y anota en el reporte qué otra prueba cubre el estado ocupado, o que ninguna lo cubre.
- No subas tiempos de espera ni agregues reintentos.

### Parte A. docker-compose y configuración

1. **`docker-compose.yml`** en la raíz:
   - Servicios `postgres` (`postgres:17`), `mongo` (`mongo:8.0`) y `neo4j` (`neo4j:5.26-community`). Fija la etiqueta exacta del parche vigente que descargues (por ejemplo `postgres:17.x`) y anótala en el reporte.
   - Volúmenes con nombre, `healthcheck` en cada base y puertos publicados solo en `127.0.0.1`.
   - Credenciales y parámetros tomados de `.env`; ningún secreto escrito en el compose.
   - Neo4j con memoria acotada para una laptop: heap y page cache pequeños, configurables por variable.
   - Servicio `api` construido desde `backend/Dockerfile`, que espera a que las tres bases estén sanas (`depends_on` con `condition: service_healthy`). Los servicios `outbox` y `web` llegan en T-08 y T-17: no los crees.
2. **`.env.example`** con todas las variables de la sección 6 de la arquitectura, más las que necesiten el compose y la memoria de Neo4j, con valores de desarrollo evidentes y no reales. Crea tu `.env` local a partir de él; no se versiona (ya está en `.gitignore`).

### Parte B. Backend

1. **`backend/` con uv y Python 3.13.**
   - Dependencias: `fastapi`, `uvicorn[standard]`, `pydantic-settings`, `psycopg[binary,pool]`, `pymongo`, `neo4j`. Desarrollo: `pytest`, `pytest-asyncio`, `httpx`, `ruff`. Ninguna otra.
   - Versiones fijas en `uv.lock`.
2. **Estructura** de la sección 2 de la arquitectura, creando solo lo que esta tarea usa: `app/main.py`, `app/config.py`, `app/infra/` (un módulo por base) y `app/api/salud.py`. Las demás carpetas se crean cuando una tarea las necesite.
3. **`config.py`** con pydantic-settings: la aplicación no arranca si falta una variable obligatoria, y el mensaje dice cuál falta sin mostrar valores.
4. **Clientes de las tres bases** abiertos en el `lifespan` de FastAPI y cerrados al apagar: `AsyncConnectionPool` de psycopg, `AsyncMongoClient` de PyMongo y `AsyncGraphDatabase.driver` de Neo4j. Si una base no está disponible al arrancar, la API arranca igual y `/api/salud` lo informa.
5. **CORS** limitado a `API_CORS_ORIGEN`.
6. **`GET /api/salud`**, sin sesión (prefijo `/api`, sin versión, D-71):
   - Consulta las tres bases en paralelo, con un tiempo límite corto por base.
   - Responde `{"estado": "ok" | "degradado", "bases": {"postgres": {"ok": bool, "ms": int, "error": str | null}, "mongo": {…}, "neo4j": {…}}}`.
   - Código 200 si las tres responden y 503 si alguna falla.
   - `error` es un texto breve (por ejemplo «sin conexión» o «tiempo agotado»). Nunca incluye credenciales, cadenas de conexión ni la traza.
   - El conteo de pendientes del outbox (arquitectura, sección 3.2) llega en T-08, cuando exista la tabla.
7. **`backend/Dockerfile`** de producción, sin dependencias de desarrollo, que corre uvicorn.
8. **Calidad y pruebas.** Configuración de ruff y pytest en `pyproject.toml`. Las pruebas viven en `tests/` de la raíz del repositorio (guía del profesor, sección 10), no dentro de `backend/`, y se ejecutan desde `backend/` con `uv run pytest ../tests`:
   - `tests/unit/`: salud con las bases simuladas (todas bien, una caída, una que excede el tiempo) y una prueba de que `error` no contiene credenciales ni cadenas de conexión.
   - `tests/integration/`: conectividad con las tres bases reales usando la configuración de `.env`, y salud de extremo a extremo. Márcalas para poder correrlas aparte (por ejemplo `-m integracion`).

### Parte C. Frontend

El frontend ya existe: no crees un proyecto nuevo ni cambies las vistas.

1. **Proxy de Vite** en `vite.config.ts`: `/api` → `http://127.0.0.1:8000`.
2. **Indicador de salud solo en modo `real`.** Hoy, con `VITE_API_MODO=real`, `main.tsx` muestra «La API real aún no está disponible». Agrega debajo de ese mensaje el estado de `GET /api/salud`: una línea por base con «ok» o el texto de `error`, en texto simple, con los estilos que ya usa ese aviso.
   - La llamada va en un módulo propio de `src/api/` (por ejemplo `salud.ts`), fuera de `ApiSigedoc` y del simulador; no la exportes desde `index.ts`.
   - Si la API no responde, muestra «No se pudo consultar el estado de la API».
   - El modo `simulado` no cambia en nada.
   - Pruebas: el indicador con una respuesta `ok`, con una `degradado` y sin respuesta (con `fetch` simulado).
3. **Node 24** es obligatorio (`engines` ya lo exige). Comprueba `node -v` antes de `npm ci`; con Node 22 y npm 10, `npm ci` rechazó el lock en la revisión de T-02c.

### Parte D. Documentación del entorno

1. **`README.md`** de la raíz: requisitos (Docker Desktop, Python 3.13 con uv, Node 24), cómo crear `.env`, cómo levantar las bases, el backend y el frontend en Windows (PowerShell) y cómo correr las pruebas del backend, incluidas las de integración aparte. Conserva lo que ya tenga y que siga siendo cierto.
2. **`CLAUDE.md`**: en la sección «Comandos», sustituye «Backend y bases: los define T-03» por los comandos reales del backend y de docker-compose. No cambies el resto del archivo.

## Fuera de alcance

- Esquemas, tablas, colecciones, validadores, restricciones e índices de las bases (T-04 a T-06).
- Usuarios de aplicación con permisos mínimos en las bases (T-04 a T-06).
- Sesiones, roles y visibilidad (T-07); outbox y su proceso (T-08); cualquier operación O-xx.
- Servicio `web` con Nginx (T-17); cliente generado del OpenAPI y conexión de las vistas a la API (T-15).
- Cambios en vistas, componentes, simulador o `ApiSigedoc`; dependencias nuevas en el frontend.
- Integración continua.
- Modificar `docs/` (salvo la evidencia en `docs/pruebas/`) ni los archivos protegidos del handoff. Lo que debería cambiar ahí va en «Dudas y huecos propuestos».

## Criterios de aceptación

Ejecuta cada uno y resume el resultado en el reporte. Evidencia en `docs/pruebas/T-03-conectividad.md` (comando, fecha, versión de cada base y de cada herramienta, resultado) y salidas completas en `docs/pruebas/T-03-verificacion/`.

1. `docker compose up -d postgres mongo neo4j` y luego `docker compose ps`: las tres en estado `healthy`. Anota la etiqueta exacta de cada imagen.
2. En `backend/`: `uv sync`, `uv run ruff check`, `uv run ruff format --check` y `uv run pytest ../tests` en verde, incluidas las pruebas de integración.
3. Con el backend en local (`uv run uvicorn app.main:app`), `GET http://127.0.0.1:8000/api/salud` devuelve 200 y `estado: ok` con las tres bases.
4. Con `docker compose stop neo4j`, el mismo endpoint devuelve 503, `estado: degradado` y solo `neo4j.ok = false`, sin credenciales en la respuesta. Vuelve a levantarla y comprueba que regresa a `ok` sin reiniciar la API.
5. `docker compose up -d --build api`: el contenedor arranca y `/api/salud` responde `ok` desde él.
6. Sin una variable obligatoria en `.env`, la API no arranca y el mensaje nombra la variable sin mostrar valores.
7. En `frontend/`, con Node 24: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`, sin errores ni advertencias. El número de pruebas no baja de las 171 de T-02c. `npm test` corre **cinco veces seguidas** en verde (Parte 0).
8. Con `VITE_API_MODO=real`, `npm run dev` y el backend arriba, el aviso muestra las tres bases en `ok`; con Neo4j detenida, muestra su error. Una captura de cada caso en `docs/pruebas/T-03-capturas/`. Con el modo por omisión, la aplicación funciona igual que en T-02c.
9. `/ponytail-review` hecho y lo «must fix» corregido.
10. Un solo commit `T-03: …` sin líneas de coautoría (`git log -1 --format=%B`). `git status` limpio; `git ls-files` sin `.env`, `node_modules`, `.venv` ni `dist`. Sin push.

## Notas del revisor

- Diego trabaja en Windows con Docker Desktop y usa Claude Code desde la aplicación de escritorio: comandos para PowerShell. Si algo depende del sistema operativo, dilo en el reporte.
- La sesión puede abrir en un worktree. **Antes de empezar, comprueba que parte de `develop`** (`git log -1` debe mostrar el commit de esta asignación o uno posterior) y que `ai/handoff/` existe. Si no, dilo y no empieces.
- Neo4j exige una contraseña de al menos 8 caracteres en `NEO4J_AUTH`.
- En esta tarea la API puede usar las credenciales de administrador de cada base porque solo es desarrollo. Anótalo como deuda en el reporte; se corrige en T-04 a T-06.
- Si una versión de imagen o de biblioteca no existe o tiene un problema conocido, no cambies de versión mayor por tu cuenta: repórtalo.
- El borrador `ai/handoff/borradores/T-03-esqueleto-backend.md` queda solo como antecedente; manda esta asignación.
