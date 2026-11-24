# SIGEDOC

Sistema de Seguimiento de Documentos entre Departamentos. Proyecto final de bases de datos: una aplicación web que integra PostgreSQL (registro oficial), MongoDB (expedientes) y Neo4j (recorridos, referencias y asuntos).

## Antes de cualquier cosa

1. Lee `ai/handoff/README.md`: tu rol, las reglas obligatorias y el protocolo.
2. Lee `ai/handoff/siguiente.md`: tu tarea actual. No trabajes en nada que no esté ahí.
3. Consulta `docs/arquitectura.md` y el grafo (skill `consultar-grafo`) para lo que la tarea cite.
4. Este proyecto se evalúa con la guía del profesor (`docs/guia/`): organización del repositorio, siete tipos de prueba de integración y evidencia de ejecución. Si una tarea parece contradecirla, repórtalo.

## Stack

- Backend: Python 3.13, FastAPI, psycopg 3, PyMongo (API asíncrona), driver oficial de Neo4j; sin ORM. Gestor: uv.
- Frontend: React, Vite y TypeScript; cliente generado del OpenAPI. Gestor: npm (Node 24 LTS).
- Bases: PostgreSQL 17, MongoDB 8.0, Neo4j 5.26 Community, todo con docker-compose.

## Comandos

Interfaz, desde `frontend/` (Node 24 LTS, npm):

```powershell
npm ci              # instala las dependencias exactas de package-lock.json
npm run dev         # http://localhost:5173 contra la API (proxy /api → 127.0.0.1:8000); usuarios de la semilla, contraseña sigedoc-dev
npm run lint        # oxlint con reglas de React, hooks y jsx-a11y; falla ante cualquier aviso
npm run typecheck   # tsc -b, TypeScript estricto
npm test            # Vitest y Testing Library (vitest run)
npm run build       # tsc -b y vite build a frontend/dist/
npm run preview     # sirve la versión compilada
```

Bases, desde la raíz (Docker Desktop; credenciales en `.env`, copia de `.env.example`):

```powershell
docker compose up -d postgres mongo neo4j   # PostgreSQL 17.12, MongoDB 8.0.38, Neo4j 5.26.34; puertos solo en 127.0.0.1
docker compose ps                           # las tres en (healthy)
docker compose up -d --build api            # la API en contenedor, http://127.0.0.1:8000
```

Backend, desde `backend/` (Python 3.13 con uv):

```powershell
uv sync                                                        # dependencias exactas de uv.lock
uv run python -m herramientas.esquemas --datos                 # esquemas de las tres bases y semilla (idempotente)
uv run python -m herramientas.esquemas --reiniciar             # vacía los datos y recarga la semilla
uv run python -m outbox                                        # proceso del outbox (O-39) en local
uv run uvicorn app.main:app --loop asyncio:SelectorEventLoop   # API en http://127.0.0.1:8000; --loop solo en Windows (psycopg)
uv run ruff check . ../tests                                   # lint (app y pruebas)
uv run ruff format --check . ../tests                          # formato
uv run pytest ../tests                                         # unitarias e integración (config en tests/pytest.ini)
uv run pytest ../tests -m integracion                          # solo integración: requiere las tres bases arriba
```

## Recordatorios que no se negocian

- No modificas `docs/` ni `ai/handoff/README.md` ni `ai/handoff/siguiente.md`.
- Capas: api → servicios → repositorios → infra. Solo los repositorios usan drivers.
- Consultas siempre parametrizadas. Toda lectura de documentos recibe el contexto del usuario.
- Sin push, sin secretos en git, sin dependencias no pedidas.
