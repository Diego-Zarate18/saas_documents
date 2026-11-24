# Traspaso del backend

Documento para quien lleva el backend de SIGEDOC. Explica en qué punto está el proyecto, cómo se reparte el trabajo y qué copiar en cada chat para empezar. Lo escribe el revisor del frontend al cerrar la fase de interfaz.

## 1. Estado al traspasar

- **Interfaz terminada con datos simulados.** Las 19 vistas (V-01 a V-19) están programadas y validadas visualmente (T-01, T-01b, T-02a, T-02b, T-02c). Solo habla con el simulador, a través de la interfaz `ApiSigedoc` (`frontend/src/api/contrato.ts`).
- **Contrato de la API.** El simulador es el contrato ejecutable. Su inventario función por función está en el Apéndice A de `docs/guia-implementacion-backend.md`, con los nombres de las pruebas del frontend que sirven de casos de aceptación.
- **Grafo de conocimiento al día** hasta D-72 (`docs/grafo-conocimiento/`). Prefijo de la API: `/api`, sin versión (D-71).
- **Todavía no existe E-2** (`docs/modelos/`): el modelo de datos detallado. T-04 no puede empezar sin él (ver sección 4).
- **T-03** está como borrador en `ai/handoff/borradores/T-03-esqueleto-backend.md`; no está asignada.

## 2. Cómo se reparte el trabajo

| Corriente | Quién | Qué hace |
| --- | --- | --- |
| Frontend | Diego, con su chat director | Cierra detalles de diseño en el Figma y retoma la interfaz en T-15 (conectarla a la API real) |
| Backend | El compañero, con su propio chat director y su Claude Code | T-03 a T-14, T-16 y T-17 |

Cada corriente trabaja igual que se trabajó hasta ahora (D-57):

- El **chat director** (Claude en claude.ai) define alcance, escribe la asignación en `ai/handoff/siguiente.md`, edita `docs/` y revisa el resultado.
- **Claude Code** implementa solo lo asignado y escribe `ai/handoff/reporte.md`.
- La persona lleva los archivos de un lado a otro, hace los commits que se piden y tiene la última palabra.

**Una tarea a la vez.** `siguiente.md` y `reporte.md` pertenecen a la corriente que tiene la tarea activa. Desde este traspaso son del backend. El frontend los usa de nuevo en T-15: antes de eso, las dos personas acuerdan el cambio de turno (el backend cierra y archiva su tarea y deja los dos archivos vacíos de pendientes).

## 3. Convivencia en el repositorio

1. Rama compartida: `develop`. Antes de editar `docs/`, `git pull --rebase`. Cambios de `docs/` en commits pequeños `docs: …`.
2. Grafo y catálogo (`docs/grafo-conocimiento/`, `docs/operaciones/catalogo.json`): quien cambie un nodo ejecuta `python generar.py grafo.json .` y `python verificar.py grafo.json` (0 errores y 0 avisos) antes de commit. `verificar.py` detecta ids duplicados; si dos personas crearon el mismo id, renombra el que llegó después.
3. Ids de decisiones nuevas: la corriente frontend usa D-73 a D-99 y la del backend usa D-100 en adelante.
4. Lo que el backend decide sin confirmación del equipo se registra como decisión con `supuesto: true`, igual que D-66 a D-70. Se confirma o se reemplaza cuando se entregue E-2 o la persona lo apruebe.
5. Claude Code nunca edita `docs/grafo-conocimiento/`, `docs/operaciones/`, `docs/arquitectura.md`, `docs/decisiones-tecnologicas.md`, `ai/handoff/README.md` ni `ai/handoff/siguiente.md`. Si deben cambiar, lo propone en el reporte y el director lo edita.
6. Sin push de Claude Code. La persona integra en `develop` y empuja.

## 4. Lo primero que hace el director del backend

1. Leer, en este orden: `CLAUDE.md`, `ai/handoff/README.md`, `docs/arquitectura.md`, `docs/guia-implementacion-backend.md` (con su Apéndice A), `docs/guia/` (la guía del profesor) y `ai/handoff/historial/` (las asignaciones T-02a, T-02b y T-02c sirven de plantilla del formato).
2. **Entregar E-2** (`docs/modelos/`) antes de asignar T-04: tablas, colecciones, etiquetas y relaciones, diccionario de datos y reglas. Se redacta a partir del grafo (decisiones D-03 a D-72, patrones AR, AD y AG, operaciones). Lo que el grafo no define queda como supuesto y se anota. Dudas que E-2 debe cerrar:
   - nombres y propiedades del Movimiento en Neo4j (D-69) y regla de `SIGUIENTE` (D-70), incluido su caso límite;
   - tipo, valores y propiedades de anexos y notas en MongoDB (`tipo_nota` además de `evidencia_atencion`);
   - si `tipo` del Movimiento es una columna de PostgreSQL (AR-03 no la lista y C3 la necesita);
   - los campos opcionales por tipo de documento (D-66).
3. **Asignar T-03** desde el borrador, con tres ajustes:
   - el frontend ya existe: solo se agrega el proxy de Vite (`/api` al backend) y un indicador de salud, no se crea un proyecto nuevo;
   - **Parte 0:** corregir la prueba intermitente `o27_o08_v11b_crea_un_asunto_y_el_documento_queda_asignado` (`frontend/src/paginas/consulta.test.tsx`), que falla con carga porque con latencia 0 la espera de `aria-busy="true"` no ve el estado pendiente. Quitar esa aserción o controlar la promesa desde la prueba. Con ello `npm test` queda en verde sin reintentos;
   - Node 24 es obligatorio (`engines`). Con Node 22 y npm 10, `npm ci` rechazó el lock en la revisión de T-02c, aunque los archivos no habían cambiado.
4. Decisiones abiertas (guía, sección 11) y puntos del inventario que conviene resolver antes de T-07 a T-13: el `GET /asuntos`, la paginación en todos los listados y los tres ajustes de ruta del Apéndice A.

## 5. Máquina y herramientas

- Git, Docker Desktop, Python 3.13 con uv, Node 24 y Python 3 para los scripts del grafo.
- Claude Code (aplicación de escritorio) abierto en la carpeta del repositorio. Las skills del proyecto están en `.claude/skills/` (`handoff`, `consultar-grafo`, `implementar-operacion`).
- Para el chat director: Claude con la carpeta del repositorio conectada (aplicación de escritorio, «Agregar carpeta»), así puede leer y editar `docs/` y revisar el trabajo.
- Modelo recomendado: Opus 5.5 con esfuerzo alto, tanto para el director como para Claude Code.

## 6. Prompt para el chat director (copiar al abrir el chat)

```
Eres el revisor del backend de SIGEDOC (Sistema de Seguimiento de Documentos entre Departamentos), proyecto final de bases de datos con PostgreSQL, MongoDB y Neo4j detrás de una API FastAPI. Trabajamos con el protocolo de ai/handoff/README.md (D-57): tú defines alcance, escribes las asignaciones en ai/handoff/siguiente.md, editas docs/ y revisas; Claude Code implementa y escribe el reporte; yo llevo los archivos, hago los commits y decido.

La interfaz ya está terminada con datos simulados. Empezamos el backend. Antes de responder, lee en la carpeta del repositorio: CLAUDE.md, ai/handoff/README.md, docs/traspaso-backend.md, docs/arquitectura.md, docs/guia-implementacion-backend.md (con su Apéndice A) y la guía del profesor en docs/guia/. Para el grafo de conocimiento usa docs/grafo-conocimiento/grafo.json y docs/operaciones/catalogo.json, sin cargarlos completos: busca por id.

Reglas: el grafo manda sobre todo lo demás y la precedencia está en el README del handoff. No inventes datos ni decisiones: lo que el grafo no define, márcalo como supuesto y registralo en el grafo con supuesto true; después corre generar.py y verificar.py (0 errores, 0 avisos). Revisa cada tarea en una copia limpia (git archive del commit): ejecuta los comandos de los criterios, compara el reporte con la asignación y con el grafo, y comprueba que no se tocaron los archivos protegidos y que el commit no lleva coautoría. Las asignaciones siguen el formato de ai/handoff/historial/T-02c-asignacion.md. Responde en español, directo y sin relleno, y pregúntame solo lo que no puedas resolver con los archivos.

Primera tarea: lee todo lo anterior y dime en pocas líneas qué entendiste, qué bloquea el arranque (E-2 y T-03) y qué propones hacer primero.
```

## 7. Mensaje inicial para Claude Code (cuando haya una asignación en `siguiente.md`)

```
Lee CLAUDE.md y ai/handoff/README.md. Antes de empezar comprueba que `git log -1` muestra el commit de la asignación (o uno posterior) y que ai/handoff/siguiente.md existe; si no, dilo y no empieces. Usa la skill handoff: lee siguiente.md completo y las fuentes que cita (skill consultar-grafo para los ids), implementa solo el alcance, ejecuta cada criterio de aceptación con su evidencia, escribe reporte.md, archiva en historial/ y haz un solo commit «T-xx: …» sin coautoría ni push. Si algo te bloquea o se contradice, escribe el reporte con estado bloqueada y detente. Anuncia al inicio de cada fase qué vas a hacer.
```
