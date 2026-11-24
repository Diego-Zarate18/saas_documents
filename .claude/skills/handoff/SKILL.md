---
name: handoff
description: Protocolo de trabajo con el revisor de SIGEDOC. Úsala al empezar una sesión, al recibir una tarea nueva en ai/handoff/siguiente.md, cuando algo te bloquee y al terminar una tarea para escribir el reporte, archivar y hacer el commit.
---

# Protocolo de handoff

Las reglas completas están en `ai/handoff/README.md`. Este es el procedimiento.

## Al empezar

1. Lee `ai/handoff/README.md` si no lo has leído en esta sesión.
2. Lee `ai/handoff/siguiente.md` completo. Anota el id de la tarea (`T-xx`).
3. Revisa `ai/handoff/historial/` solo si la tarea cita una anterior.
4. Para cada id que cite la tarea (O-xx, D-xx, AR-xx, HU-xx…), consulta el grafo con la skill `consultar-grafo`.
5. Ejecuta `git status`. El único cambio esperado sin commit es `ai/handoff/siguiente.md` (lo deja Diego). Si hay otros que no son tuyos, detente y repórtalo como bloqueo.
6. Si algo impide empezar (falta un archivo, dos fuentes se contradicen, el alcance es ambiguo de forma que cambie el resultado), escribe `ai/handoff/reporte.md` con estado `bloqueada` y tus preguntas, y detente.

## Mientras trabajas

- Solo lo que dice «Alcance». Si descubres algo fuera de alcance que hace falta, anótalo para «Dudas y huecos propuestos»; no lo implementes.

## Al terminar

1. Ejecuta los comandos de «Criterios de aceptación» una vez.
2. Escribe `ai/handoff/reporte.md` con la plantilla de `ai/handoff/README.md`. Breve y concreto.
3. `git add` de los cambios de la tarea y el reporte; un solo `git commit -m "T-xx: <resumen>"`.
4. No hagas push. Dile a Diego, en una línea, el estado de la tarea y el hash del commit.
