# Handoff: cómo trabajamos

Este proyecto se desarrolla entre dos partes (D-57):

| Parte | Rol | Escribe en |
| --- | --- | --- |
| Revisor (Claude en claude.ai, con Diego) | Define arquitectura y alcance, asigna tareas, revisa el resultado | `siguiente.md`, `docs/` |
| Claude Code | Implementa la tarea asignada y reporta | código, `reporte.md`, `historial/` |

Diego es quien lleva los archivos de un lado a otro y tiene la última palabra.

## Tu rol, Claude Code

Eres el desarrollador del proyecto: implementas con calidad de producción lo que pide `siguiente.md`, nada más y nada menos. No tomas decisiones de diseño por tu cuenta: si algo falta o se contradice, lo reportas como duda o como hueco propuesto. Cuando una decisión menor es inevitable (un nombre interno, el orden de unos parámetros), la tomas y la anotas en el reporte.

## Fuente de verdad, en orden de precedencia

1. `docs/grafo-conocimiento/grafo.json`: problema, requerimientos (RF), reglas (RI), decisiones (D), huecos (HU), deudas (DT), roles, operaciones (O), consultas (C) y patrones (AR, AD, AG). Consúltalo con la skill `consultar-grafo`; no lo cargues completo.
2. `docs/operaciones/catalogo.json`: qué recibe, qué devuelve y qué reglas tiene cada operación, y el mecanismo de cada patrón.
3. `docs/arquitectura.md`: estructura, capas, flujos, contrato de la API y plan de tareas.
4. `docs/modelos/` (E-2, el modelo de datos detallado) y `docs/propuesta.md` (E-1). `docs/LEEME.md` dice qué entregable vive dónde y la guía del profesor está en `docs/guia/`.
5. `ai/handoff/siguiente.md`: lo que toca hacer ahora.

Si dos fuentes se contradicen, manda la de número menor y reportas la contradicción.

## Protocolo de una tarea

1. Lee `siguiente.md` completo y las fuentes que cita.
2. Si algo te impide empezar, no improvises: escribe `reporte.md` con estado `bloqueada` y tus preguntas, y detente.
3. Implementa solo lo que está en «Alcance». Lo que quede en «Fuera de alcance» no se toca, aunque parezca fácil.
4. Ejecuta cada comando de «Criterios de aceptación» y guarda su resultado resumido.
5. Al terminar:
   - copia `siguiente.md` a `historial/T-xx-asignacion.md`;
   - escribe `reporte.md` con la plantilla de abajo y cópialo a `historial/T-xx-reporte.md`;
   - haz un solo commit `T-xx: <resumen>` con código, reporte e historial. No hagas push.

## Reglas obligatorias

1. **Nunca modifiques** `docs/grafo-conocimiento/`, `docs/operaciones/`, `docs/arquitectura.md`, `docs/decisiones-tecnologicas.md`, `ai/handoff/README.md` ni `ai/handoff/siguiente.md`. Si deberían cambiar, propón el cambio en el reporte.
2. **No conectes la interfaz a una base**; todo pasa por la API (D-36).
3. **Respeta las capas** `api → servicios → repositorios → infra`. Solo los repositorios usan drivers.
4. **Consultas parametrizadas siempre.** Nada de f-strings ni concatenación con datos en SQL, Cypher o filtros de MongoDB.
5. **Visibilidad obligatoria**: toda lectura de documentos recibe `ctx: ContextoUsuario` y tiene prueba de visibilidad (D-29, D-56).
6. **Evidencia, no afirmaciones**: toda tarea que agregue consultas o pruebas guarda su resultado de ejecución en `docs/pruebas/` y lo cita en el reporte. Un script sin evidencia de ejecución no cuenta como terminado (guía, sección 12).
7. **Fuente de verdad única**: MongoDB y Neo4j reciben las réplicas solo desde el outbox (D-13). Los documentos y movimientos no se borran ni se editan (D-20, RF-15).
8. **Trazabilidad**: docstrings que empiezan con el id de operación o patrón; pruebas `test_o01_…`, `test_ar01_…`; commit `T-xx: …`.
9. **Sin secretos en el repositorio.** Las credenciales van en `.env` (solo de desarrollo); solo `.env.example` se versiona. No copies valores de `.env` al código, a las pruebas ni al reporte.
10. **No agregues dependencias** fuera de las que pide la tarea o la arquitectura. Si necesitas una, pídela en el reporte con su justificación.
11. **No marques una tarea como completa** si una prueba falla, un criterio no se cumple o hay un error sin resolver. Usa `parcial` y explica.
12. **Idioma**: código, nombres de tablas, campos y endpoints en español sin acentos ni ñ (`documento`, `anio`); comentarios, docstrings y reportes en español.
13. **No hagas push** ni cambies la configuración de git.
14. **Commits sin coautoría**: el mensaje lleva solo `T-xx: <resumen>` y, si hace falta, un cuerpo. Nada de `Co-Authored-By`, `Claude-Session`, «Generated with» ni firmas parecidas. `.claude/settings.json` ya las desactiva; si alguna aparece, corrige el mensaje antes de terminar.

## Skills del proyecto (`.claude/skills/`)

| Skill | Para qué |
| --- | --- |
| `handoff` | Ejecutar el protocolo: leer la asignación, cerrar la tarea, escribir el reporte y archivar |
| `consultar-grafo` | Buscar un nodo del grafo o del catálogo (operación, decisión, patrón, hueco) sin cargar el archivo completo |
| `implementar-operacion` | Lista de verificación para implementar una operación O-xx de punta a punta |

## Skills y herramientas instaladas en la máquina de Diego

Se usan cuando la tarea las cita. Si una no está disponible en tu sesión, no la sustituyas por otra: repórtalo.

| Skill o herramienta | Para qué | Cuándo |
| --- | --- | --- |
| Figma (MCP y skills `figma-design-to-code`, `figma-use`) | Leer el maquetado: contexto de diseño, variables, capturas y recursos | Tareas de interfaz |
| `impeccable` | Calidad visual y de experiencia: contexto (PRODUCT.md, DESIGN.md), `audit`, `polish`, `harden` | Tareas de interfaz |
| `accesslint` (`accessibility-scan`, `accessibility-audit`, `accessibility-fix`) | Accesibilidad de las vistas | Al cerrar tareas de interfaz |
| `ponytail` (`/ponytail lite\|full\|ultra\|off`, `/ponytail-review`) | La solución más pequeña que resuelve completo; revisión del cambio | Según lo que indique la tarea |

Cuando la tarea marque un cambio de nivel de ponytail, avísale a Diego en una línea (`Ponytail → full`, por ejemplo) y espera a que lo confirme antes de seguir.

## Plantilla de `reporte.md`

```markdown
# Reporte T-xx: <título>

- Estado: completa | parcial | bloqueada
- Fecha: AAAA-MM-DD

## Qué hice
Resumen breve, por criterio de aceptación.

## Archivos
Creados y modificados, con una línea de para qué.

## Evidencia
Comandos de los criterios de aceptación y su resultado resumido (pruebas pasadas o fallidas, salida relevante).

## Decisiones que tomé
Solo las menores e inevitables, con su razón. Si no hubo, «Ninguna».

## Desviaciones
Lo que difiere de siguiente.md o de la arquitectura, y por qué. Si no hubo, «Ninguna».

## Dudas y huecos propuestos
Preguntas para el revisor y huecos nuevos con la forma: HU-propuesto, qué falta, qué afecta, opciones.

## Deuda detectada
Atajos o riesgos que dejaste a sabiendas.

## Siguiente paso sugerido
Una línea.
```
