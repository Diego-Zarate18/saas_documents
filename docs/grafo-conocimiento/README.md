# Grafo de conocimiento del proyecto SIGEDOC

Actualizado: 2026-11-21

Este grafo reúne el contexto de la problemática, la solución con tres bases de datos (PostgreSQL, MongoDB y Neo4j), las decisiones tomadas, los huecos detectados y las deudas técnicas, y cómo se conectan entre sí. Sirve para justificar cualquier decisión rastreándola hasta las entrevistas, la guía del proyecto o la retroalimentación del profesor.

## Archivos

| Archivo | Para qué sirve |
| --- | --- |
| `grafo.json` | Fuente única: nodos y relaciones. Edítalo aquí y regenera lo demás. |
| `grafo.html` | Visor interactivo. Ábrelo con doble clic en el navegador; no necesita internet. |
| `grafo.cypher` | Script para cargar el grafo en Neo4j, con consultas de ejemplo al final. |
| `verificar.py` | Revisa que cada hueco, deuda, requerimiento y decisión tenga las relaciones que su estado exige. |
| `generar.py` | Regenera este README, el visor y el script Cypher a partir del JSON. |
| `visor.html` | Plantilla del visor (paneles ajustables y ocultables); `generar.py` la necesita en la misma carpeta. |
| `README.md` | Este resumen. |

## Contenido: 267 nodos y 885 relaciones

| Tipo de nodo | Cantidad | Qué representa |
| --- | --- | --- |
| Proyecto | 1 | El sistema SIGEDOC |
| Contexto | 6 | Organización, guía, alcance de evaluación, entrevistas y retroalimentación del profesor |
| Problema | 1 | El problema central |
| Hallazgo | 16 | Problemas concretos detectados en las entrevistas |
| Requerimiento | 16 | Requerimientos funcionales (activos y retirados) |
| Rol | 5 | Roles de usuario y qué operaciones ejecutan |
| Consulta | 5 | Consultas principales C1 a C5 |
| Operacion | 33 | Catálogo de operaciones de la API |
| Patron | 29 | Patrones de acceso por base (AR relacional, AD documental, AG grafo) |
| Base | 3 | Los tres motores |
| Concepto | 10 | Conceptos del dominio y su fuente de verdad |
| Regla | 3 | Reglas de integridad y dónde se imponen |
| Decision | 57 | Decisiones de diseño tomadas |
| Hueco | 54 | Huecos técnicos detectados y su estado |
| DeudaTecnica | 19 | Compromisos aceptados o mitigados |
| Alcance | 1 | Lo que queda fuera y las limitaciones declaradas |
| Entregable | 8 | Entregables de la guía y su estado |

## Estado de los huecos

| Estado | Cantidad | Significado |
| --- | --- | --- |
| resuelto | 48 | Una decisión lo cerró |
| aceptado | 5 | Se asume como limitación declarada |
| eliminado | 1 | Desapareció al cambiar el alcance |

### Huecos abiertos o parciales

| ID | Hueco | Estado | Nota |
| --- | --- | --- | --- |
| — | Ninguno | — | Todos los huecos están resueltos, aceptados o eliminados. |

### Huecos aceptados

| ID | Hueco | Aceptado por | Nota |
| --- | --- | --- | --- |
| HU-C1 | Reestructuraciones y vigencias | D-08 | Reestructuraciones fuera de alcance: áreas solo con estado actual, sin sucesión. El titular al momento del turno se guarda en el movimiento. |
| HU-C4 | Plazos en días hábiles | D-06 | Fuera de alcance. |
| HU-E2 | Referencias capturadas a mano | AL-01 | No hay extracción automática; referencias_citadas es solo informativo. |
| HU-G1 | El sistema refleja registros, no la realidad | AL-01 | Limitación declarada: movimientos no capturados no existen para el sistema. |
| HU-VIS | Reglas de visibilidad sin validar por dirección y Jurídico | AL-01 | Se toma lo descrito por la entrevistada como supuesto declarado. |

## Deudas técnicas

Una deuda **parchada** tiene una decisión que la mitiga; una **aceptada** se asume conscientemente para acotar el alcance.

| ID | Deuda | Estado | Generada por | Mitigada por |
| --- | --- | --- | --- | --- |
| DT-01 | Sin historial de titulares y adscripciones | parchada | D-08 | D-31 |
| DT-02 | Sin plazos ni días hábiles | aceptada | D-06 | — |
| DT-03 | Anexos sin archivos binarios | aceptada | D-16 | — |
| DT-04 | Consistencia eventual en las réplicas de Neo4j | parchada | D-11 | D-13 |
| DT-05 | Reglas que Neo4j Community no impone | aceptada | D-10 | — |
| DT-06 | RI-10 'al menos un responsable' solo en el servicio | aceptada | D-18 | — |
| DT-07 | Ciclos en la jerarquía validados por consulta | parchada | D-08 | D-47 |
| DT-08 | Escritura sin transacción distribuida en sustituciones | parchada | D-11 | D-14 |
| DT-09 | Tipo de documento duplicado en MongoDB | parchada | D-16 | D-26 |
| DT-10 | Expediente creado después del documento | parchada | D-16 | D-13 |
| DT-11 | referencias_citadas en texto libre | aceptada | D-05 | — |
| DT-12 | Asunto y referencias sin réplica | parchada | D-24 | D-25 |
| DT-13 | Visibilidad solo en el servicio | aceptada | D-29 | — |
| DT-14 | Ligado manual de documentos no registrados | aceptada | D-33 | — |
| DT-15 | Folios fuera de orden cronológico | aceptada | D-34 | — |
| DT-16 | Duplicados sin número o sin fecha con revisión manual | aceptada | D-27 | — |
| DT-17 | Autenticación y roles construidos a mano | aceptada | D-37 | — |
| DT-18 | Un solo proceso de outbox | aceptada | D-48 | — |
| DT-19 | Pendientes calculados en cada consulta | aceptada | D-42 | — |

## Fuera de alcance

**Fuera de alcance y limitaciones declaradas.** Plazos y días hábiles; historial de titulares, adscripciones y reestructuraciones; sugerencia automática de asuntos; extracción automática de referencias; archivos binarios de anexos; permisos configurables por persona. El sistema refleja registros, no la realidad.

## Reglas de integridad

| ID | Regla | Se impone en | Detalle |
| --- | --- | --- | --- |
| RI-06 | Todo documento tiene emisor | PostgreSQL | Un área emisora o un actor externo. Redacción reconstruida desde HU-EMI; confirmar contra E-2. |
| RI-10 | Un solo responsable por grupo de turno | PostgreSQL y backend | 'A lo más uno' con índice único parcial sobre id_grupo_turno; 'al menos uno' en el servicio (DT-06). |
| RI-14 | Conclusión explícita | PostgreSQL y backend | Un documento solo se concluye con forma_conclusion registrada. Redacción reconstruida desde HU-D3; confirmar contra E-2. |

## Roles

| ID | Rol | Qué hace |
| --- | --- | --- |
| ROL-OF | Oficialía de partes | Registra entradas y salidas, turna, cancela, corrige y resuelve duplicados. Ve el recorrido de todo, sin el contenido de lo confidencial ajeno. |
| ROL-DI | Dirección | Turna y consulta el recorrido de todo, sin el contenido de lo confidencial ajeno. |
| ROL-TI | Titular de área | Turna de forma directa desde su área, devuelve, returna, atrae y concluye. Ve lo suyo completo. |
| ROL-PE | Personal del área | Atiende y concluye solo cuando su área es la responsable; agrega notas y anexos. |
| ROL-AD | Administrador | Gestiona áreas, personas, usuarios y roles. |

## Operaciones

El detalle (qué recibe, qué devuelve y reglas) está en cada nodo y en el documento de operaciones.

| ID | Operación | Rol | Tipo | Bases | Frec. |
| --- | --- | --- | --- | --- | --- |
| O-01 | Registrar documento recibido y asignar folio | OF | E | PG+MG+NJ | Alta |
| O-03 | Turnar a una o varias áreas | OF, DI, TI | E | PG+NJ | Alta |
| O-05 | Concluir documento | TI, PE | E | PG+NJ+MG | Alta |
| O-07 | Relacionar documentos | OF, TI, PE | E | NJ+PG | Media |
| O-08 | Asignar documento a un asunto | TI, PE | E | NJ | Media |
| O-09 | Consultar y actualizar contenido del expediente | OF, TI, PE | L+E | MG | Media |
| O-11 | Ficha completa de un documento | OF, DI, TI, PE | L | PG+MG+NJ | Alta |
| O-14 | Pendientes por área y responsable (bandeja) | OF, DI, TI, PE | L | PG | Alta |
| O-17 | Eliminar anexo o nota | OF, PE | E | MG | Baja |
| O-18 | Quitar referencia o sacar de un asunto | OF, TI, PE | E | NJ | Baja |
| O-19 | Registrar segunda recepción | OF | E | PG | Media |
| O-20 | Registrar salida externa | OF | E | PG+MG+NJ | Baja |
| O-21 | Registrar acuse de salida | OF | E | PG | Baja |
| O-22 | Devolver o returnar con motivo | TI | E | PG+NJ | Media |
| O-23 | Atraer documento | TI | E | PG+NJ | Baja |
| O-24 | Cancelar documento | OF | E | PG+NJ | Baja |
| O-25 | Corregir un movimiento | OF | E | PG+NJ | Baja |
| O-26 | Resolver posible duplicado | OF | E | PG+NJ | Media |
| O-27 | Crear asunto | OF, TI, PE | E | NJ | Media |
| O-28 | Agregar anexo | OF, PE | E | MG | Media |
| O-29 | Agregar nota | OF, DI, TI, PE | E | MG | Media |
| O-30 | Buscar documentos | OF, DI, TI, PE | L | PG+MG | Alta |
| O-31 | Consultar catálogos | OF, DI, TI, PE, AD | L | PG | Alta |
| O-32 | Consultar estructura organizacional | OF, DI, TI, PE, AD | L | PG | Media |
| O-33 | Gestionar áreas | AD | E | PG+NJ | Baja |
| O-34 | Gestionar personas y usuarios | AD | E | PG+NJ | Baja |
| O-35 | Gestionar actores externos | OF, AD | E | PG | Baja |
| O-36 | Iniciar sesión | OF, DI, TI, PE, AD | L+E | PG | Media |
| O-37 | Cerrar sesión | OF, DI, TI, PE, AD | E | PG | Baja |
| O-38 | Validar sesión y calcular visibilidad | Sistema | L+E | PG | Muy alta |
| O-39 | Sincronizar el outbox | Sistema | E | PG+NJ+MG | Alta |
| O-40 | Reconciliar entre bases | Sistema, equipo | L | PG+MG+NJ | Baja |
| O-41 | Respaldo y carga de datos de prueba | Equipo | E | PG+MG+NJ | Ocasional |

## Patrones de acceso

| ID | Base | Patrón | Sirve a |
| --- | --- | --- | --- |
| AR-01 | PG | Asignar folio sin huecos | O-01 |
| AR-02 | PG | Detectar duplicado | O-01, O-26 |
| AR-03 | PG | Insertar movimiento en la bitácora | O-03, O-22, O-23, O-05, O-25 |
| AR-04 | PG | Encolar en el outbox | O-01, O-03, O-05, O-07, O-20, O-24 |
| AR-05 | PG | Tomar lote del outbox | O-39 |
| AR-06 | PG | Bandeja de pendientes | O-14, C4, C1 |
| AR-07 | PG | Búsqueda paginada con visibilidad | O-30 |
| AR-08 | PG | Validar sesión | O-38, O-36, O-37 |
| AR-09 | PG | Validar jerarquía sin ciclos | O-33 |
| AR-10 | PG | Ficha: registro, folios y acuses | O-11 |
| AR-11 | PG | Lote para reconciliar | O-40 |
| AD-01 | MG | Crear expediente validado por tipo | O-01, O-20 |
| AD-02 | MG | Leer expediente por _id | O-11, O-09 |
| AD-03 | MG | Actualizar contenido según el tipo | O-09 |
| AD-04 | MG | Agregar anexo | O-28 |
| AD-05 | MG | Agregar nota o evidencia | O-29, O-05 |
| AD-06 | MG | Quitar anexo o nota | O-17 |
| AD-07 | MG | Buscar por campo propio del tipo | O-30 |
| AD-08 | MG | Verificar expedientes por lote | O-40 |
| AG-01 | NJ | Recorrido de un documento con ramas | C1, O-11 |
| AG-02 | NJ | Hilo de un asunto | C2 |
| AG-03 | NJ | Rebotes | C3 |
| AG-04 | NJ | Alcance de un asunto | C5 |
| AG-05 | NJ | Relaciones y asuntos de un documento | O-11 |
| AG-06 | NJ | Replicar desde el outbox | O-39 |
| AG-07 | NJ | Crear referencia | O-07 |
| AG-08 | NJ | Crear asunto y asignar documento | O-27, O-08 |
| AG-09 | NJ | Quitar referencia o pertenencia | O-18 |
| AG-10 | NJ | Detectar faltantes para reconciliar | O-40 |

## Decisiones

Las marcadas con * son supuestos declarados, pendientes de validar con dirección y Jurídico.

| ID | Decisión | Justificada por | Detalle |
| --- | --- | --- | --- |
| D-01 | Acotar a una sola organización | — | Se descartó el seguimiento entre N dependencias por los huecos de participación, actores y gobernanza. |
| D-02 | El documento es el protagonista | — | El modelo sigue al documento; los departamentos son el mapa. Genérico para N departamentos. |
| D-03 | Movimiento como entidad, no relación | — | Cada paso une documento, dos áreas y personas, y debe ser inmutable. |
| D-04 | Relaciones tipadas Documento-Área | — | EMITIDO_POR, DIRIGIDO_A y COPIA_A separadas para distinguir responsable de enterado. |
| D-05 | Cuatro relaciones entre documentos separadas | — | Se conservan RESPONDE_A, DA_SEGUIMIENTO_A, EN_ALCANCE_A y SUSTITUYE_A en vez de REFERENCIA_A {tipo}. |
| D-06 | Retirar RF-09 (plazos) | — | Sin calendario de días inhábiles ni vencimientos para acotar el alcance. |
| D-07 | Acotar RF-12 a pendientes por área | — | Sin tiempos promedio ni cumplimiento; antigüedad en días naturales. |
| D-08 | Estructura organizacional solo en estado actual | — | TITULAR_DE, ADSCRITA_A y DEPENDE_DE sin desde/hasta. |
| D-09 | SIGUIENTE N:M | — | El recorrido puede dividirse en ramas y volver a unirse cuando varias áreas integran una respuesta. |
| D-10 | Motores: PostgreSQL, MongoDB y Neo4j, cada uno por una necesidad | H-07, H-03, CTX-02 | PostgreSQL: folios sin huecos, bitácora inmutable e integridad con escritura concurrente (D-35). MongoDB: contenido que cambia según el tipo de documento (H-07), con anexos y notas anidados y validación por tipo. Neo4j: recorridos y patrones de C1 a C3, referencias entre documentos y asuntos. Si se quita PostgreSQL se pierde la integridad transaccional; si se quita MongoDB el contenido iría en JSONB, sin validación declarativa por tipo y mezclado con el registro transaccional; si se quita Neo4j los recorridos serían consultas recursivas en SQL, menos legibles. |
| D-11 | Movimiento con fuente en PostgreSQL | — | Transacción e inmutabilidad en la relacional; réplica completa a Neo4j para recorrer. |
| D-12 | ActorExterno fuera del grafo | — | Ninguna consulta de grafo lo necesita. |
| D-13 | Patrón outbox | — | La transacción relacional guarda un registro de sincronización pendiente; un proceso reintenta hacia Neo4j o MongoDB. |
| D-14 | Consulta de reconciliación para sustituciones | — | SUSTITUYE_A se escribe en Neo4j y luego el estado en PostgreSQL; la reconciliación detecta fallas a medias. |
| D-15 | Un mismo UUID en las tres bases | — | Generado por el backend; _id en MongoDB e id en Neo4j. |
| D-16 | Expediente con _id = id_documento | — | Relación 1:1 sin tabla de equivalencias; tipo copiado como dato inmutable. |
| D-17 | Catálogo de 7 tipos de documento | — | Separa solicitud de material o pago, requerimiento de auditoría y solicitud de transparencia. |
| D-18 | id_grupo_turno para RI-10 | — | Agrupa turnos simultáneos en lugar de comparar fecha_hora. |
| D-19 | Evidencia como nota del expediente | — | Nota evidencia_atencion ligada al id_movimiento de la conclusión. |
| D-20 | Documentos y movimientos no se borran | — | Se cancelan o corrigen; solo se eliminan anexos, notas, referencias y pertenencias a asuntos capturados por error. |
| D-21 | Folios con contador bloqueado | — | contador_folio con SELECT ... FOR UPDATE en la transacción para no dejar huecos. |
| D-22 | Grafo adelgazado | — | 5 etiquetas y 16 relaciones; sale todo lo que tiene fuente en PostgreSQL y no se recorre. |
| D-23 | Proyecto en documentos nuevos | — | Los entregables de la actividad de grafos se conservan; el proyecto final vive en un documento propio. |
| D-24 | Asunto y referencias con fuente en Neo4j | — | Son los únicos datos propios del grafo; justifican el paradigma. |
| D-25 | Protección de los datos propios del grafo | — | Unicidad en id, réplica con MERGE que nunca borra Asunto ni referencias, y respaldo con neo4j-admin database dump. |
| D-26 | Tipo inmutable verificado por reconciliación | — | El backend nunca actualiza el tipo; una consulta compara el tipo en PostgreSQL y en MongoDB. |
| D-27 | Clave de duplicados con año | H-12 | UNIQUE parcial sobre número, emisor (área o actor externo) y año de fecha_documento; así no hace falta interpretar el número y funcionan los oficios sin año o con consecutivo continuado. Sin número o sin fecha_documento se marca posible_duplicado y lo revisa una persona. |
| D-28 | Correo y papel en un solo documento | H-12 | canal_inicial, fecha_recepcion_inicial y fecha_recepcion_oficial (sello). El folio se asigna en la primera recepción. |
| D-29 | Visibilidad en tres niveles aplicada en el backend * | H-11 | Lo suyo completo; de otras áreas estado y responsable; dirección y oficialía todo el recorrido. Confidencial por documento, marcado por oficialía, visible al titular y a quien tiene movimiento. Una función central pasa $areasVisibles a cada consulta. |
| D-30 | Asignación de asuntos por quien atiende | H-14 | Manual, en cualquier momento, con O-08; no se exige en el registro. Un documento puede pertenecer a varios asuntos. |
| D-31 | Titular al turnar en el movimiento | H-13 | id_titular_al_turnar se guarda al turnar (nulo si el puesto está vacante); como el movimiento es inmutable, el dato queda fijo. |
| D-32 | Motivos de devolución y regla de rebote | H-15 | Catálogo cerrado: falta_informacion, falta_firma, falta_anexo, corregir_dato, no_competencia (área sugerida opcional; sin ella cuenta como rebote). C3 usa la regla de H-15. |
| D-33 | Nodo DocumentoNoRegistrado | H-16 | RESPONDE_A, DA_SEGUIMIENTO_A y EN_ALCANCE_A pueden apuntar a un nodo con número y emisor en texto; SUSTITUYE_A no, porque cambia el estado en PostgreSQL. El ligado al documento real, si se registra después, es manual. |
| D-34 | Registro extemporáneo | H-16 | El folio sigue el orden y el año de registro; se captura la fecha real de recepción y la marca extemporaneo. |
| D-35 | Justificar PostgreSQL por garantías, no por escala | CTX-06 | Unos 300 documentos por semana en temporada alta es poco volumen; el argumento es la integridad transaccional. |
| D-36 | Aplicación web | CTX-02 | La interfaz es obligatoria (confirmado). Es una aplicación web que consume solo la API y nunca se conecta a las bases (guía, sección 2.4 y entregable 6). La guía acepta web, móvil o escritorio; se elige web. |
| D-37 | Backend en Python con FastAPI | CTX-02 | Routers, servicios y repositorios separados. Se elige porque la guía pide contrato de API documentado y validación de entradas (OpenAPI y Pydantic vienen incluidos), el esquema vive en scripts SQL sin ORM y se tiene experiencia previa con Python. Descartados NestJS y .NET (más código de estructura y un lenguaje nuevo) y Django (su ORM solo cubre una de las tres bases y duplica el DDL). |
| D-38 | Frontend en React, Vite y TypeScript | CTX-02 | Aplicación de una sola página sin servidor propio, para que la interfaz no pueda conectarse a las bases ni alojar lógica de negocio. Cliente de la API generado desde el OpenAPI de FastAPI; sesión en cookie httpOnly y CORS limitado al origen del frontend. Descartado Next.js: su parte de servidor duplicaría el backend y arriesga el criterio 7 de la guía. |
| D-39 | API REST | — | C1 a C5 y las operaciones se exponen como endpoints fijos; no hace falta la consulta flexible de GraphQL. |
| D-40 | Repositorios con drivers oficiales y sin ORM | CTX-02 | psycopg 3 para PostgreSQL, PyMongo con su API asíncrona para MongoDB (Motor está en desuso) y el driver oficial de Neo4j. Un repositorio por base, consultas parametrizadas y credenciales en variables de entorno. |
| D-41 | Despliegue con docker-compose | CTX-02 | Las tres bases, la API, el proceso del outbox y el frontend compilado como archivos estáticos se levantan con un solo docker-compose; cubre la instalación reproducible del entregable 8. |
| D-42 | Regla de pendiente calculada en PostgreSQL | H-02 | Un documento está pendiente en un área cuando esa área recibió un movimiento como responsable o apoyo y no hay después un movimiento de salida desde ella ni la conclusión o cancelación del documento. Se calcula de la bitácora en PostgreSQL, sin tabla de estado, para que la bandeja refleje un turno al instante sin esperar la réplica. |
| D-43 | Síntesis del documento en PostgreSQL | H-01 | Columna sintesis (texto corto) en el registro oficial para listados y búsqueda; MongoDB guarda el contenido completo. Se llama sintesis y no asunto para no confundirla con el nodo Asunto. |
| D-44 | Cinco roles y permisos de turno * | H-02, H-11 | Oficialía, dirección, titular de área, personal del área y administrador. Oficialía y dirección turnan cualquier documento; el titular hace turnos directos de lo que tiene pendiente, devuelve, returna y atrae; el personal atiende y concluye solo si su área es responsable. |
| D-45 | Catálogo de operaciones con ids que no se reutilizan * | — | Se conservan los ids existentes; los números que faltan (O-02, O-04, O-06, O-10, O-12, O-13, O-15, O-16) se consideran eliminados y las operaciones nuevas empiezan en O-19. |
| D-46 | Búsqueda por campos propios del tipo en MongoDB | H-07, CTX-06 | Índices parciales por tipo para buscar por datos que solo tiene un tipo (solicitante de transparencia, ente auditor). MongoDB devuelve ids y la visibilidad se filtra en PostgreSQL. Es la operación que distingue a la base documental de una columna JSONB. |
| D-47 | Jerarquía de áreas validada en PostgreSQL | — | Los ciclos se detectan con una consulta recursiva dentro de la misma transacción, con la tabla de áreas bloqueada, y no contra la réplica, que puede ir atrasada. |
| D-48 | Outbox con un solo proceso y en orden | — | Un único proceso toma los registros en orden de id, porque un movimiento debe llegar después del anterior para unirlos con SIGUIENTE. SKIP LOCKED queda como protección si alguien levanta dos procesos. |
| D-49 | Sesiones guardadas en PostgreSQL | — | Código aleatorio en cookie httpOnly y solo su huella SHA-256 en la base; caducan por inactividad. Cerrar sesión revoca de inmediato, cosa que un JWT sin estado no permite. |
| D-50 | Consultas de grafo ancladas y con profundidad máxima | — | Toda consulta parte de un Documento, un Asunto o de movimientos filtrados por fecha con índice, nunca de un Área; las áreas de alto grado (oficialía, secretarías particulares) solo aparecen como destino. Los recorridos variables se limitan a 6 saltos. |
| D-51 | C4 se resuelve en PostgreSQL | CTX-06 | Pendientes por responsable no recorre caminos: todo lo que necesita (movimientos, titular al turnar, adscripción) está en PostgreSQL. Presentarla como consulta de grafo debilitaba la justificación de Neo4j. El flujo integrado de la guía lo cubre O-11. |
| D-52 | Relaciones organizacionales solo en PostgreSQL | — | Aplica D-22: DEPENDE_DE, TITULAR_DE y ADSCRITA_A no las recorre ninguna consulta de grafo, así que salen de Neo4j; Área y Persona quedan como nodos de id y nombre para los movimientos. |
| D-53 | Ficha completa con degradación controlada | CTX-02 | Si MongoDB o Neo4j no responden, la ficha devuelve lo disponible y marca la sección faltante, como pide la guía en el flujo integrado. |
| D-54 | Estructura del repositorio según la guía | CTX-02 | El repositorio sigue la organización que sugiere la guía (sección 10), con nombres en español donde no choca con ella: api/v1 equivale a controladores, servicios a services y repositorios/relacional|documental|grafo a repositories. El backend va por capas api → servicios → repositorios → infra y solo los repositorios usan drivers. |
| D-55 | Esquemas versionados y versiones fijas | CTX-02 | El esquema de cada base vive en scripts numerados (database/*/schema y validators en MongoDB) que aplica en orden python -m herramientas.esquemas y registra en la tabla esquema_version; también carga data/ y se reproduce desde cero (guía 7.4). Un script aplicado no se edita: se agrega otro. Versiones fijas: Python 3.13 con uv, Node.js 24 LTS, PostgreSQL 17, MongoDB 8.0 y Neo4j 5.26 Community (LTS), con etiqueta de parche fija en las imágenes. |
| D-56 | Pruebas por tipo de la guía con evidencia de ejecución | CTX-02 | Pruebas en tests/unit, tests/integration y tests/e2e, más las consultas y pruebas propias de cada base en database/*/queries y database/graph/tests. Se cubren los tipos de prueba de la guía (sección 9) y, además, una prueba de visibilidad por cada consulta que lee documentos, porque ningún motor la impone. Los resultados se guardan en docs/pruebas/: un script sin evidencia de ejecución no cuenta (guía 12). |
| D-57 | Desarrollo entre revisor y Claude Code | — | El revisor (Claude en claude.ai, con Diego) define arquitectura y alcance, asigna tareas en ai/handoff/siguiente.md y revisa; Claude Code implementa solo lo asignado y reporta en reporte.md e historial/, con un commit por tarea y sin push. Diego lleva los archivos y tiene la última palabra. Precedencia de fuentes: grafo, catálogo de operaciones, arquitectura, modelos y asignación. |

## Tipos de relación

| Relación | Cantidad |
| --- | --- |
| ACEPTA | 5 |
| ADSCRITA_A | 1 |
| AFECTA | 99 |
| ATIENDE | 15 |
| CONTRIBUYE_A | 16 |
| DEFINE_ROL | 5 |
| DELIMITA | 1 |
| DERIVA_DE | 10 |
| DESCRIBE | 2 |
| DESDE_HACIA | 1 |
| DOCUMENTA | 116 |
| EJECUTA | 72 |
| ELIGE | 3 |
| ENTREGA | 8 |
| ENVIA_O_RECIBE | 1 |
| EXPONE | 2 |
| FUENTE_DE_VERDAD_DE | 10 |
| GENERA | 19 |
| IMPLEMENTA | 54 |
| INTEGRA | 3 |
| JUSTIFICA | 28 |
| MITIGA | 7 |
| ORIGINA | 28 |
| PARCHA | 61 |
| PERTENECE_A | 1 |
| RECIBE | 1 |
| REGULA | 3 |
| REGULADO_POR | 5 |
| REPLICADO_EN | 5 |
| REQUIERE | 1 |
| RESUELVE | 1 |
| RETIRA | 1 |
| REVELA | 16 |
| SE_BASA_EN | 1 |
| SE_DOCUMENTA_EN | 2 |
| SE_EJECUTA_EN | 29 |
| SE_EVALUA_SEGUN | 2 |
| SE_IMPONE_EN | 3 |
| SE_RIGE_POR | 1 |
| SIRVE_A | 48 |
| SOBRE | 1 |
| TIENE | 1 |
| TIENE_DEUDA | 19 |
| TIENE_HUECO | 54 |
| TOMA | 57 |
| UNE | 2 |
| USA | 64 |

## Cómo mantenerlo

1. Agrega o cambia nodos y relaciones en `grafo.json`. Cada relación usa los `id` de sus nodos de origen y destino.
2. Ejecuta `python verificar.py grafo.json`. Debe terminar sin errores; un aviso indica algo cubierto solo por una regla o una decisión.
3. Ejecuta `python generar.py grafo.json .` para regenerar este README, `grafo.html` y `grafo.cypher`.
4. Para consultarlo con Cypher, ejecuta `grafo.cypher` en una base de Neo4j dedicada (no en la base del proyecto).