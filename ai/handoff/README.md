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

1. Lee `siguiente.md` y solo las fuentes que cita, en la parte que necesites.
2. Si algo te impide avanzar y no es una decisión menor, escribe `reporte.md` con estado `bloqueada` y tus preguntas, y detente. Una herramienta o skill que falte no bloquea: sigue sin ella.
3. Implementa solo el alcance de la tarea.
4. Ejecuta los criterios de aceptación.
5. Al terminar, escribe `reporte.md` (plantilla de abajo, breve) y haz un solo commit `T-xx: <resumen>` con código y reporte. No hagas push. No copies nada a `historial/`.

## Reglas obligatorias

1. **Nunca modifiques** `docs/grafo-conocimiento/`, `docs/operaciones/`, `docs/arquitectura.md`, `docs/modelos/`, `ai/handoff/README.md` ni `ai/handoff/siguiente.md`. Si deberían cambiar, dilo en el reporte.
2. **No conectes la interfaz a una base**; todo pasa por la API (D-36).
3. **Capas** `api → servicios → repositorios → infra`. Solo los repositorios usan drivers.
4. **Consultas parametrizadas siempre.**
5. **Visibilidad**: toda lectura de documentos recibe `ctx: ContextoUsuario` (D-29).
6. **Réplicas solo por el outbox** (D-13). Documentos y movimientos no se borran ni se editan (D-20).
7. **Sin secretos en el repositorio**; solo `.env.example` se versiona.
8. **Sin dependencias nuevas** salvo las que pida la tarea.
9. **Idioma**: identificadores en español sin acentos ni ñ; comentarios y reporte en español.
10. **Commits sin coautoría**: solo `T-xx: <resumen>`. Nada de `Co-Authored-By`, `Claude-Session` ni firmas.

## Ahorro de archivos y de tiempo

- **Pruebas:** solo las que pida la tarea. No agregues pruebas de más ni repitas corridas.
- **Evidencia:** no generes capturas, carpetas de verificación ni archivos de salida. La evidencia de ejecución para la guía del profesor se junta una sola vez, en la última tarea, en `docs/pruebas/evidencia.md`.
- **No crees documentos** fuera de los que pida la tarea; no dupliques en Markdown lo que ya dice el código.
- No uses skills de interfaz ni de revisión (Figma, impeccable, accesslint, ponytail) salvo que la tarea las pida.

## Skills del proyecto (`.claude/skills/`)

| Skill | Para qué |
| --- | --- |
| `consultar-grafo` | Buscar un nodo del grafo o del catálogo sin cargar el archivo completo |
| `implementar-operacion` | Lista de verificación para implementar una operación O-xx |

## Plantilla de `reporte.md`

```markdown
# Reporte T-xx: <título>

- Estado: completa | parcial | bloqueada

## Qué hice
Una línea por criterio de aceptación, con su resultado.

## Desviaciones y decisiones
Lo que difiere de la tarea o de los modelos, y las decisiones menores. «Ninguna» si no hubo.

## Dudas
Preguntas para el revisor. «Ninguna» si no hubo.
```
