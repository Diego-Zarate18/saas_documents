---
name: consultar-grafo
description: Consulta el grafo de conocimiento y el catálogo de operaciones de SIGEDOC. Úsala cuando una tarea o el código cite un id (O-01, D-29, AR-03, AG-01, RI-10, HU-xx, DT-xx, RF-xx, C1…) o necesites saber qué se decidió sobre un tema, en vez de leer grafo.json completo.
---

# Consultar el grafo

El grafo (`docs/grafo-conocimiento/grafo.json`, unos 270 nodos) es la fuente de verdad del proyecto. No lo cargues entero: usa el script, que solo lee.

```bash
# Uno o varios nodos con sus relaciones entrantes y salientes
uv run python .claude/skills/consultar-grafo/scripts/grafo.py O-01 D-21 RI-10

# Una operación con su detalle del catálogo, sus patrones de acceso y las decisiones que la afectan
uv run python .claude/skills/consultar-grafo/scripts/grafo.py --operacion O-03

# Todos los nodos de un tipo: Operacion, Patron, Decision, Hueco, DeudaTecnica, Regla, Requerimiento, Consulta, Rol, Concepto
uv run python .claude/skills/consultar-grafo/scripts/grafo.py --tipo Patron

# Búsqueda de texto en id, nombre y descripción
uv run python .claude/skills/consultar-grafo/scripts/grafo.py --buscar outbox
```

Cómo leer lo que devuelve:

- Una **Decision** con `"supuesto": true` es un supuesto declarado: se implementa tal cual, pero no se generaliza.
- Un **Hueco** `aceptado` y una **DeudaTecnica** `aceptada` son límites conscientes: no los "arregles".
- Si el grafo contradice a otra fuente, manda el grafo; repórtalo.
- Si buscas algo y no existe, no lo inventes: repórtalo como hueco propuesto.
