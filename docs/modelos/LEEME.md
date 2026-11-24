# Modelos (E-2)

Modelado de datos vigente de SIGEDOC. Sustituye al borrador del documento «Proyecto final» (pestaña Entregable 2) y a D-69 como fuente del modelo de grafo.

| Archivo | Contenido |
|---|---|
| [01-conceptual.md](01-conceptual.md) | Conceptos, fuente de verdad y cardinalidades |
| [02-relacional.md](02-relacional.md) | PostgreSQL: diagrama entidad-relación, 17 tablas, restricciones e índices |
| [03-documental.md](03-documental.md) | MongoDB: colección `expedientes`, validador `$jsonSchema` e índices parciales |
| [04-grafo.md](04-grafo.md) | Neo4j: 6 etiquetas, 13 relaciones, restricciones, réplica y regla de SIGUIENTE |
| [05-diccionario-y-reglas.md](05-diccionario-y-reglas.md) | Datos compartidos, reglas RI/RD/RG, revisión de coherencia y supuestos |

Precedencia: el grafo de conocimiento y el catálogo de operaciones mandan sobre estos archivos (`ai/handoff/README.md`). Lo que el grafo no definía quedó como supuesto en D-100 a D-105; el único punto abierto es HU-DEST (destinatarios internos).

T-04 a T-06 implementan estos modelos en `database/` con scripts numerados (D-55). Si un script necesita apartarse de aquí, se registra primero en el grafo y luego se corrige este directorio.
