# SIGEDOC

Sistema de Seguimiento de Documentos entre Departamentos. Proyecto final de bases de datos: PostgreSQL, MongoDB y Neo4j integradas en una aplicación web.

- Contexto, decisiones y alcance: [`docs/grafo-conocimiento/`](docs/grafo-conocimiento/README.md) (abre `grafo.html` en el navegador).
- Arquitectura: [`docs/arquitectura.md`](docs/arquitectura.md).
- Operaciones y patrones de acceso: [`docs/operaciones/`](docs/operaciones/).
- Método de trabajo con Claude Code: [`ai/handoff/README.md`](ai/handoff/README.md).

Las instrucciones se agregan con cada tarea: la interfaz en T-01 y las bases y el backend en T-03.

## Requisitos

Todos los comandos son para PowerShell en Windows 10 u 11.

| Herramienta | Versión | Comprobar |
| --- | --- | --- |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | con Docker Compose v2 | `docker compose version` |
| [uv](https://docs.astral.sh/uv/) y Python 3.13 | uv instala Python 3.13 si falta: `uv python install 3.13` | `uv --version` |
| [Node.js 24 LTS](https://nodejs.org/) | 24.15 o mayor (lo exigen jsdom y w3c-xmlserializer) | `node --version` |

## Configuración: `.env`

Las bases y el backend leen el mismo `.env` de la raíz, que no se versiona. Créalo desde el ejemplo y cambia las tres contraseñas (Neo4j pide al menos 8 caracteres):

```powershell
Copy-Item .env.example .env
notepad .env
```

`.env.example` publica PostgreSQL en el puerto 5433 y MongoDB en el 27018 para no chocar con instalaciones locales de Windows. Si cambias un puerto, cambia también la URI que lo usa (`MONGO_PORT` con `MONGO_URI`, `NEO4J_BOLT_PORT` con `NEO4J_URI`). Todos los puertos se publican solo en `127.0.0.1`.

## Bases de datos (docker-compose)

```powershell
docker compose up -d postgres mongo neo4j   # PostgreSQL 17.12, MongoDB 8.0.38 y Neo4j 5.26.34 Community
docker compose ps                           # las tres deben quedar en (healthy)
docker compose stop                         # detiene todo sin borrar datos
docker compose down -v                      # borra contenedores y volúmenes (pierdes los datos)
```

Neo4j Browser queda en <http://localhost:7474> (usuario `neo4j` y la contraseña de `.env`).

### Esquemas y datos de prueba

Con las bases arriba, desde `backend/`:

```powershell
uv run python -m herramientas.esquemas           # aplica lo que falte de los esquemas de las tres bases
uv run python -m herramientas.esquemas --datos   # además carga la semilla (la misma que usa el modo simulado)
```

- Los scripts están en `database/relational/schema/`, `database/document/validators/` y `database/graph/schema/`. Cada uno se aplica una sola vez y queda registrado en la tabla `esquema_version` de PostgreSQL. Un script aplicado no se edita: los cambios van en uno nuevo.
- La semilla (`database/*/data/`) se escribe en las tres bases a la vez; correrla otra vez no duplica nada. Todos los usuarios de la semilla entran con la contraseña de desarrollo `sigedoc-dev`.
- La semilla se genera de `frontend/src/api/simulado/datos.ts` con `node database/semilla.mjs`, desde la raíz.
- Para empezar de cero: `docker compose down -v` (borra los volúmenes) y `docker compose up -d postgres mongo neo4j`.
- `database/*/queries/` tiene consultas de ejemplo para cada base; cada archivo dice cómo correrlo.

## Backend (API)

Desde `backend/`:

```powershell
cd backend
uv sync                                                            # crea .venv con las versiones fijas de uv.lock
uv run uvicorn app.main:app --loop asyncio:SelectorEventLoop       # API en http://127.0.0.1:8000
```

- `--loop asyncio:SelectorEventLoop` solo hace falta en Windows: ahí uvicorn usa `ProactorEventLoop`, con el que psycopg no funciona en modo asíncrono. Sin la opción, la API no arranca y el mensaje dice cuál falta. En Linux, macOS y el contenedor no se necesita.
- `GET http://127.0.0.1:8000/api/salud` informa la conexión con cada base: 200 con `"estado": "ok"` si las tres responden y 503 con `"estado": "degradado"` si alguna falla. La documentación interactiva está en <http://127.0.0.1:8000/docs>.
- Si falta una variable obligatoria en `.env`, la API no arranca y dice cuál falta.

La API también corre en Docker (imagen de producción, sin dependencias de desarrollo), después de las bases:

```powershell
docker compose up -d --build api            # misma dirección: http://127.0.0.1:8000
```

### Calidad y pruebas del backend

Las pruebas viven en `tests/` de la raíz (guía, sección 10) y se ejecutan desde `backend/`:

```powershell
uv run ruff check . ../tests            # reglas de estilo y errores, también en las pruebas
uv run ruff format --check . ../tests   # formato
uv run pytest ../tests                  # todas: unitarias y de integración
uv run pytest ../tests -m "not integracion"   # solo unitarias (no necesitan las bases)
uv run pytest ../tests -m integracion   # solo integración: necesitan las tres bases levantadas y el .env
```

## Interfaz (modo simulado)

La interfaz vive en [`frontend/`](frontend/) (React, Vite y TypeScript). Hasta T-15 no se conecta a la API: lee datos simulados de `frontend/src/api/simulado/` que siguen el contrato de la API (D-63). Los datos viven en la memoria de la pestaña; al recargar la página vuelven a su estado inicial.

### Requisitos

- Windows 10 u 11.
- [Node.js 24 LTS](https://nodejs.org/) (incluye npm). Comprueba la versión en PowerShell con `node --version`; debe ser 24.15 o mayor.

### Instalación y ejecución (PowerShell)

```powershell
cd frontend
npm ci
npm run dev
```

Abre <http://localhost:5173> y entra con cualquiera de los usuarios de prueba. En modo simulado cualquier contraseña no vacía es válida; el campo de correo los sugiere al escribir.

| Rol | Usuario | Correo | Área |
| --- | --- | --- | --- |
| Oficialía de partes | Marta Flores | `mflores@institucion.gob.mx` | Oficialía de partes |
| Dirección | Lic. Ana López | `alopez@institucion.gob.mx` | Dirección General |
| Titular de área | Ing. Raúl Pérez | `rperez@institucion.gob.mx` | Compras |
| Titular de área | C.P. Elena Díaz | `ediaz@institucion.gob.mx` | Finanzas |
| Personal del área | Jorge Ruiz | `jruiz@institucion.gob.mx` | Compras |
| Administrador | Mtro. Luis Gómez | `lgomez@institucion.gob.mx` | Administración |

### Otros comandos

| Comando | Qué hace |
| --- | --- |
| `npm run lint` | oxlint con las reglas de React, hooks y accesibilidad (jsx-a11y); falla ante cualquier aviso |
| `npm run typecheck` | Revisión de tipos con TypeScript estricto |
| `npm test` | Pruebas con Vitest y Testing Library |
| `npm run build` | Compila a `frontend/dist/` |
| `npm run preview` | Sirve la versión compilada en <http://localhost:4173> |

`VITE_API_MODO` elige la fuente de datos (ver `frontend/.env.example`). `simulado` es el valor por omisión. Con `real` las vistas aún no se muestran (llegan en T-15): la página dice «La API real aún no está disponible» y, debajo, el estado de cada base según `GET /api/salud`. En desarrollo, Vite reenvía `/api` a `http://127.0.0.1:8000`, así que el backend debe estar levantado:

```powershell
$env:VITE_API_MODO = 'real'; npm run dev; Remove-Item Env:VITE_API_MODO
```

`VITE_API_LATENCIA_MS` fija la latencia de la fuente simulada en milisegundos (450 por omisión) para que se vean los esqueletos de carga; en las pruebas siempre es 0. Para cambiarla, crea `frontend/.env.local` con, por ejemplo, `VITE_API_LATENCIA_MS=1500` y reinicia `npm run dev`.
