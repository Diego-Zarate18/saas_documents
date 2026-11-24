## Caso «bases-ok» · 2026-11-24T12:45:32.555Z

Consulta terminada: sí

Texto del aviso:

```
La API real aún no está disponible.

PostgreSQL: ok
MongoDB: ok
Neo4j: ok
```

GET /api/salud por el proxy de Vite: `200 {"estado":"ok","bases":{"postgres":{"ok":true,"ms":7,"error":null},"mongo":{"ok":true,"ms":2,"error":null},"neo4j":{"ok":true,"ms":4,"error":null}}}`

Captura: `docs/pruebas/T-03-capturas/modo-real-bases-ok.png`
## Caso «neo4j-detenida» · 2026-11-24T12:45:40.289Z

Consulta terminada: sí

Texto del aviso:

```
La API real aún no está disponible.

PostgreSQL: ok
MongoDB: ok
Neo4j: tiempo agotado
```

GET /api/salud por el proxy de Vite: `503 {"estado":"degradado","bases":{"postgres":{"ok":true,"ms":5,"error":null},"mongo":{"ok":true,"ms":2,"error":null},"neo4j":{"ok":false,"ms":2004,"error":"tiempo agotado"}}}`

Captura: `docs/pruebas/T-03-capturas/modo-real-neo4j-detenida.png`
