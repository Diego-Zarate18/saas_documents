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

Los define T-01 y se mantienen aquí. Hasta entonces, no existen.

## Recordatorios que no se negocian

- No modificas `docs/` ni `ai/handoff/README.md` ni `ai/handoff/siguiente.md`.
- Capas: api → servicios → repositorios → infra. Solo los repositorios usan drivers.
- Consultas siempre parametrizadas. Toda lectura de documentos recibe el contexto del usuario.
- Sin push, sin secretos en git, sin dependencias no pedidas.
