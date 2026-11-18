# Grafo de conocimiento del proyecto SIGEDOC

Actualizado: 2026-11-17

Este grafo reúne el contexto de la problemática, la solución con tres bases de datos (PostgreSQL, MongoDB y Neo4j), las decisiones tomadas, los huecos detectados y las deudas técnicas, y cómo se conectan entre sí. Sirve para justificar cualquier decisión rastreándola hasta la entrevista o hasta la guía del proyecto.

## Archivos

| Archivo | Para qué sirve |
| --- | --- |
| `grafo.json` | Fuente única: nodos y relaciones. Edítalo aquí y regenera lo demás. |
| `grafo.html` | Visor interactivo. Ábrelo con doble clic en el navegador; no necesita internet. |
| `grafo.cypher` | Script para cargar el grafo en Neo4j, con consultas de ejemplo al final. |
| `README.md` | Este resumen. |

## Contenido: 131 nodos y 305 relaciones

| Tipo de nodo | Cantidad | Qué representa |
| --- | --- | --- |
| Proyecto | 1 | El sistema SIGEDOC |
| Contexto | 4 | Organización, guía del proyecto, alcance de evaluación y entrevista |
| Problema | 1 | El problema central |
| Hallazgo | 10 | Problemas concretos detectados en la entrevista |
| Requerimiento | 16 | Requerimientos funcionales (activos y retirados) |
| Consulta | 5 | Consultas principales C1 a C5 |
| Operacion | 9 | Operaciones clave de la API |
| Base | 3 | Los tres motores |
| Concepto | 9 | Conceptos del dominio y su fuente de verdad |
| Decision | 23 | Decisiones de diseño tomadas |
| Hueco | 31 | Huecos técnicos detectados y su estado |
| DeudaTecnica | 11 | Compromisos aceptados o mitigados |
| Entregable | 8 | Entregables de la guía y su estado |

## Estado de los huecos

| Estado | Cantidad | Significado |
| --- | --- | --- |
| resuelto | 20 | Una decisión lo cerró |
| parcial | 3 | Cubierto en parte; queda trabajo |
| aceptado | 3 | Se asume como limitación declarada |
| eliminado | 1 | Desapareció al cambiar el alcance |
| abierto | 4 | Sin resolver |

### Huecos abiertos o parciales

| ID | Hueco | Estado | Nota |
| --- | --- | --- | --- |
| HU-C1 | Reestructuraciones y vigencias | parcial | Áreas con vigencia y sucesión; titulares y adscripciones sin historial. |
| HU-D6 | Ciclos legítimos frente a rebotes | parcial | C3 define rebote por devoluciones repetidas o regreso a un área; falta excluir ciclos legítimos (pedir y devolver información). |
| HU-E3 | Referencias a documentos fuera del sistema | abierto | No está definido si se crea un nodo fantasma o se pierde la referencia. |
| HU-F1 | Supernodos (oficialía, secretarías particulares) | abierto | Pendiente en diseño físico: límites de profundidad e índices. |
| HU-F4 | Explosión de caminos en consultas variables | parcial | Se acordó limitar profundidad; falta fijarla en el catálogo Cypher. |
| HU-INT | ¿La interfaz es obligatoria? | abierto | Confirmar con el profesor. |
| HU-STK | Lenguaje y framework del backend | abierto | Decisión pendiente para la Fase 3. |

## Deudas técnicas

Una deuda **parchada** tiene una decisión que la mitiga; una **aceptada** se asume conscientemente para acotar el alcance.

| ID | Deuda | Estado | Generada por | Mitigada por |
| --- | --- | --- | --- | --- |
| DT-01 | Sin historial de titulares y adscripciones | aceptada | D-08 | — |
| DT-02 | Sin plazos ni días hábiles | aceptada | D-06 | — |
| DT-03 | Anexos sin archivos binarios | aceptada | D-16 | — |
| DT-04 | Consistencia eventual en las réplicas de Neo4j | parchada | D-11 | D-13 |
| DT-05 | Reglas que Neo4j Community no impone | aceptada | D-10 | — |
| DT-06 | RI-10 'al menos un responsable' solo en el servicio | aceptada | D-18 | — |
| DT-07 | Ciclos en DEPENDE_DE validados en el backend | aceptada | D-08 | — |
| DT-08 | Escritura sin transacción distribuida en sustituciones | parchada | D-11 | D-14 |
| DT-09 | Tipo de documento duplicado en MongoDB | parchada | D-16 | D-17 |
| DT-10 | Expediente creado después del documento | parchada | D-16 | D-13 |
| DT-11 | referencias_citadas en texto libre | aceptada | D-05 | — |

## Decisiones

| ID | Decisión | Detalle |
| --- | --- | --- |
| D-01 | Acotar a una sola organización | Se descartó el seguimiento entre N dependencias por los huecos de participación, actores y gobernanza. |
| D-02 | El documento es el protagonista | El modelo sigue al documento; los departamentos son el mapa. Genérico para N departamentos. |
| D-03 | Movimiento como entidad, no relación | Cada paso une documento, dos áreas y personas, y debe ser inmutable. |
| D-04 | Relaciones tipadas Documento-Área | EMITIDO_POR, DIRIGIDO_A y COPIA_A separadas para distinguir responsable de enterado. |
| D-05 | Cuatro relaciones entre documentos separadas | Se conservan RESPONDE_A, DA_SEGUIMIENTO_A, EN_ALCANCE_A y SUSTITUYE_A en vez de REFERENCIA_A {tipo}. |
| D-06 | Retirar RF-09 (plazos) | Sin calendario de días inhábiles ni vencimientos para acotar el alcance. |
| D-07 | Acotar RF-12 a pendientes por área | Sin tiempos promedio ni cumplimiento; antigüedad en días naturales. |
| D-08 | Estructura organizacional solo en estado actual | TITULAR_DE, ADSCRITA_A y DEPENDE_DE sin desde/hasta. |
| D-09 | SIGUIENTE N:M | El recorrido puede dividirse en ramas y volver a unirse cuando varias áreas integran una respuesta. |
| D-10 | Motores: PostgreSQL, MongoDB y Neo4j | Drivers oficiales en cualquier backend; comunes en el curso. |
| D-11 | Movimiento con fuente en PostgreSQL | Transacción e inmutabilidad en la relacional; réplica completa a Neo4j para recorrer. |
| D-12 | ActorExterno fuera del grafo | Ninguna consulta de grafo lo necesita. |
| D-13 | Patrón outbox | La transacción relacional guarda un registro de sincronización pendiente; un proceso reintenta hacia Neo4j o MongoDB. |
| D-14 | Consulta de reconciliación para sustituciones | SUSTITUYE_A se escribe en Neo4j y luego el estado en PostgreSQL; la reconciliación detecta fallas a medias. |
| D-15 | Un mismo UUID en las tres bases | Generado por el backend; _id en MongoDB e id en Neo4j. |
| D-16 | Expediente con _id = id_documento | Relación 1:1 sin tabla de equivalencias; tipo copiado como dato inmutable. |
| D-17 | Catálogo de 7 tipos de documento | Separa solicitud de material o pago, requerimiento de auditoría y solicitud de transparencia. |
| D-18 | id_grupo_turno para RI-10 | Agrupa turnos simultáneos en lugar de comparar fecha_hora. |
| D-19 | Evidencia como nota del expediente | Nota evidencia_atencion ligada al id_movimiento de la conclusión. |
| D-20 | Documentos y movimientos no se borran | Se cancelan o corrigen; solo se eliminan anexos, notas, referencias y pertenencias a asuntos capturados por error. |
| D-21 | Folios con contador bloqueado | contador_folio con SELECT ... FOR UPDATE en la transacción para no dejar huecos. |
| D-22 | Grafo adelgazado | 5 etiquetas y 16 relaciones; sale todo lo que tiene fuente en PostgreSQL y no se recorre. |
| D-23 | Proyecto en documentos nuevos | Los entregables de la actividad de grafos se conservan; el proyecto final vive en un documento propio. |

## Tipos de relación

| Relación | Cantidad |
| --- | --- |
| ACEPTA | 1 |
| ADSCRITA_A | 1 |
| AFECTA | 28 |
| ATIENDE | 15 |
| BLOQUEA | 1 |
| CONTRIBUYE_A | 10 |
| DERIVA_DE | 3 |
| DESCRIBE | 1 |
| DESDE_HACIA | 1 |
| DOCUMENTA | 14 |
| ELIGE | 3 |
| ENTREGA | 8 |
| ENVIA_O_RECIBE | 1 |
| FUENTE_DE_VERDAD_DE | 9 |
| GENERA | 11 |
| IMPLEMENTA | 27 |
| INTEGRA | 3 |
| MITIGA | 4 |
| ORIGINA | 19 |
| PARCHA | 26 |
| PERTENECE_A | 1 |
| RECIBE | 1 |
| REPLICADO_EN | 5 |
| REQUIERE | 1 |
| RESUELVE | 1 |
| RETIRA | 1 |
| REVELA | 10 |
| SE_BASA_EN | 1 |
| SE_DOCUMENTA_EN | 2 |
| SE_EVALUA_SEGUN | 1 |
| SE_RIGE_POR | 1 |
| SOBRE | 1 |
| TIENE | 1 |
| TIENE_DEUDA | 11 |
| TIENE_HUECO | 31 |
| TOMA | 23 |
| UNE | 1 |
| USA | 26 |

## Cómo mantenerlo

1. Agrega o cambia nodos y relaciones en `grafo.json`. Cada relación usa los `id` de sus nodos de origen y destino.
2. Abre `grafo.html` para revisarlo: el visor lee los datos incrustados al generarse, así que después de editar el JSON hay que regenerar el HTML o pedírmelo.
3. Para consultarlo con Cypher, ejecuta `grafo.cypher` en una base de Neo4j dedicada (no en la base del proyecto).
