# E-2.5 Diccionario de datos compartidos, reglas del dominio y revisión de coherencia

El diccionario de cada base está en los archivos 02, 03 y 04. Este archivo une los tres: dónde vive cada dato compartido, qué base hace cumplir cada regla y en qué difiere el modelo del borrador anterior y del simulador.

## Datos compartidos

| Dato | PostgreSQL (fuente salvo que se indique) | MongoDB | Neo4j |
|---|---|---|---|
| Id del documento | `documento.id_documento` | `expedientes._id` | `Documento.id` |
| Tipo | `documento.tipo` | `expedientes.tipo` (copia inmutable) | `Documento.tipo` |
| Estado | `documento.estado` | — | `Documento.estado` |
| Confidencial | `documento.confidencial` | — | `Documento.confidencial` |
| Síntesis | `documento.sintesis` | — | — |
| Contenido del tipo, anexos y notas | — | `expedientes` (fuente) | — |
| Movimiento | `movimiento` y `movimiento_origen` | `notas.id_movimiento` en la evidencia | `Movimiento` y sus relaciones |
| Área | `area` | `notas.id_area` | `Area.id`, `siglas` |
| Persona | `persona` | `id_persona` en anexos y notas | `Persona.id`, `nombre` |
| Salida que responde | `documento.id_responde_a` (fuente, D-101) | — | `RESPONDE_A` (réplica) |
| Referencias entre documentos | — | `referencias_citadas` (texto informativo) | Cuatro relaciones (fuente, D-24) |
| Documento no registrado | — | — | `DocumentoNoRegistrado` (fuente) |
| Asunto | — | — | `Asunto` y `PERTENECE_A` (fuente) |

Toda escritura que cruza bases sale de PostgreSQL por el outbox (D-13), salvo las de fuente Neo4j (referencias, asuntos) y la sustitución, que escribe en Neo4j y luego el estado en PostgreSQL con reconciliación (D-14). O-40 compara existencia, estado y tipo entre las tres bases.

## Reglas del dominio

| Id | Regla | Base | Mecanismo |
|---|---|---|---|
| RI-01 | Los identificadores no se repiten | Las tres | PK y UNIQUE; `_id`; restricciones de unicidad |
| RI-02 | El correo de una persona es único | PostgreSQL | UNIQUE sobre `lower(correo)` |
| RI-03 | Los datos obligatorios existen | PostgreSQL, MongoDB | NOT NULL; `required` |
| RI-04 | Catálogos y listas cerradas solo aceptan sus valores | PostgreSQL, MongoDB | FK a catálogo o CHECK (D-72); `enum` |
| RI-05 | Las fechas son coherentes | PostgreSQL | CHECK: la segunda recepción no es anterior a la primera |
| RI-06 | Todo documento tiene emisor: un área o un actor externo; una salida, área emisora y actor destinatario | PostgreSQL | CHECK de tabla en `documento` |
| RI-07 | Todo movimiento tiene documento, destino, rol y persona; solo el registro carece de origen | PostgreSQL | NOT NULL y CHECK |
| RI-08 | Un folio por documento, consecutivo por área y año sin huecos | PostgreSQL | `folio.id_documento` UNIQUE, UNIQUE (área, año, consecutivo) y `contador_folio` bloqueado (D-21) |
| RI-09 | La jerarquía de áreas no forma ciclos; un titular por área y un área por titular, adscrito a ella | PostgreSQL | UNIQUE en `id_titular`; consulta recursiva en la transacción (D-47); servicio |
| RI-10 | Un grupo de turno tiene exactamente un responsable | PostgreSQL y servicio | Índice único parcial (a lo más uno); servicio (al menos uno y correcciones) |
| RI-11 | Cada tipo de movimiento lleva sus datos | PostgreSQL | CHECK por tipo (02, «Bitácora») |
| RI-12 | Movimientos, orígenes y folios no se modifican ni se borran | PostgreSQL | Disparador; Neo4j solo recibe réplicas |
| RI-13 | El tipo de documento no cambia | PostgreSQL, MongoDB | Disparador en PostgreSQL; ninguna operación lo escribe; O-40 compara (D-26) |
| RI-14 | Un documento se concluye solo con una forma del catálogo y sus requisitos | PostgreSQL y servicio | La misma transacción inserta la conclusión y cambia el estado; requisitos de D-59 en el servicio |
| RI-15 | Ninguna referencia une un documento consigo mismo; SUSTITUYE_A solo entre registrados y deja al sustituido `sin_efecto` | Neo4j y PostgreSQL | Servicio antes de escribir; `estado_previo`; reconciliación (D-14) |
| RD-01 | Cada expediente cumple el esquema de su tipo | MongoDB | `$jsonSchema` con `oneOf` |
| RD-02 | Todo expediente corresponde a un documento | MongoDB y PostgreSQL | Solo lo crea el outbox; mismo `_id`; O-40 |
| RD-03 | La evidencia de una atención sin oficio apunta a su conclusión y no se borra | MongoDB | `id_movimiento` obligatorio; `$pull` excluye `evidencia_atencion` (O-17) |
| RG-01 | Las réplicas son idempotentes y nunca borran datos propios del grafo | Neo4j | `MERGE`; la réplica no toca Asunto ni referencias (D-25) |
| RG-02 | Un documento no registrado se identifica por número y emisor | Neo4j | Unicidad compuesta (D-33) |

Del modelo de la actividad de grafos no se conserva la regla «un alcance une documentos del mismo emisor»: O-07 no la incluye y los emisores externos no están en el grafo.

## Revisión de coherencia

### Frente al borrador anterior de E-2 (documento «Proyecto final», pestaña Entregable 2)

| Punto | Borrador | Modelo vigente | Por qué |
|---|---|---|---|
| Tipos de documento | Incluía tarjeta_informativa | Siete de D-65, con informe | D-65 |
| Campos por tipo | Partidas, montos, número de auditoría, solicitante como objeto | Solo los de D-66 | D-66 |
| Estructura organizacional | `area_sucesion`, vigencias, nivel | Solo estado actual | D-08 |
| Roles | oficialia, direccion, area, administrador | OF, DI, TI, PE, AD | D-44 |
| Movimiento | Siete tipos con archivo y conclusión por forma propia | Seis tipos del contrato; formas de D-59; atracción con varios orígenes | D-59, D-68, D-102 |
| SIGUIENTE | Tabla `movimiento_siguiente` | Se calcula al replicar | D-70 |
| Grafo | 5 etiquetas y 16 relaciones | 6 y 13 | D-22, D-52, D-100 |
| Folio | Varios por documento, con medio de recepción | Uno por documento; canal en `documento` | D-28, D-101 |
| Control de versión del expediente | Campo `version` | No se modela | D-104 |

### Frente al simulador del frontend (contrato ejecutable)

El grafo manda sobre el simulador. Estas diferencias las resuelven las tareas del backend que implementan cada operación:

| Punto | Simulador | Modelo | Tarea |
|---|---|---|---|
| Área sugerida en una devolución | Acepta cualquier motivo | Solo con `no_competencia` (D-69) | T-09 |
| Nota de una devolución | La agrega al expediente | Va en `movimiento.instruccion`: O-22 solo usa PostgreSQL y Neo4j | T-09 |
| Destinatarios internos | No existen | Tabla y relaciones sin captura (HU-DEST) | Pendiente de decisión |

Lo demás coincide: nombres de los tipos de movimiento, notas `general` y `evidencia_atencion`, anexos con `titulo`, `hojas` y `ubicacion`, folio `SIGLAS-AAAA-NNNN` compartido entre entradas y salidas del área.

## Supuestos registrados en el grafo

| Id | Supuesto |
|---|---|
| D-100 | Las 6 etiquetas y 13 relaciones de Neo4j; CORRIGE sale del grafo; las referencias llevan id |
| D-101 | Salidas como documentos con sentido `salida`; un folio por documento; acuse por salida; `id_responde_a` en PostgreSQL |
| D-102 | Tipos y columnas del movimiento; atracción con `movimiento_origen`; corrección solo del rol |
| D-103 | Caso límite y respaldo de la regla de SIGUIENTE |
| D-104 | Estructura del expediente, anexos y notas |
| D-105 | Las 17 tablas, catálogos, columnas de soporte y la fecha límite fuera del modelo |

Hueco abierto: **HU-DEST**, destinatarios internos (DIRIGIDO_A y COPIA_A) sin operación que los capture.
