# Decisiones tecnológicas (E-3)

Actualizado: 2026-11-21 · Origen: decisiones D-10, D-36 a D-41, D-54 a D-56 del grafo de conocimiento.

Criterios de la guía que condicionan la elección (secciones 2.4, 7.3 y 7.6): contrato de API documentado, validación de entradas, controladores/servicios/repositorios separados, drivers o clientes oficiales, consultas parametrizadas, credenciales externas, interfaz sin acceso a las bases e instalación reproducible. Criterios propios del proyecto: el esquema vive en scripts de cada base, el equipo conoce Python y no conoce FastAPI, y el desarrollo se asiste con Claude Code.

## 1. Motores de datos (D-10, D-35)

| Motor | Necesidad que atiende | Qué se pierde si se quita |
| --- | --- | --- |
| PostgreSQL | Folios sin huecos con escritura concurrente, bitácora inmutable, llaves foráneas y outbox en la misma transacción. Se justifica por garantías, no por volumen: unos 300 documentos por semana en temporada alta | La integridad transaccional |
| MongoDB | Contenido del expediente que cambia según el tipo de documento, con anexos y notas anidados y validación por tipo (`$jsonSchema`) | El contenido iría en JSONB, sin validación declarativa por tipo y mezclado con el registro transaccional |
| Neo4j | Recorridos con ramas, rebotes, hilo y alcance de un asunto, referencias entre documentos | Los recorridos serían consultas recursivas en SQL, menos legibles |

## 2. Backend (D-37)

| Criterio | FastAPI (elegido) | Django | NestJS | .NET |
| --- | --- | --- | --- | --- |
| Contrato y validación de entradas | OpenAPI y Pydantic incluidos | Requiere extensiones | Requiere paquetes adicionales | Requiere paquetes adicionales |
| Tres bases sin ORM único | Encaja: repositorios con drivers oficiales | Su ORM solo cubre una de las tres bases y duplicaría el DDL de los scripts SQL | Encaja | Encaja |
| Lenguaje para el equipo | Python, ya conocido | Python | Lenguaje nuevo | Lenguaje nuevo |
| Código de estructura | Poco: routers, servicios y repositorios explícitos | Medio: convenciones propias del framework | Más código de estructura | Más código de estructura |
| Decisión | **Elegido** | Descartado | Descartado | Descartado |

Consecuencia aceptada: FastAPI no trae usuarios ni roles; la autenticación y la autorización se construyen a mano (sesiones en PostgreSQL, D-49, y la función central de visibilidad, D-29). Deuda DT-17.

## 3. Frontend (D-38)

| Criterio | React + Vite + TypeScript (elegido) | Next.js |
| --- | --- | --- |
| Servidor propio | No: son archivos estáticos | Sí: su parte de servidor podría conectarse a las bases o alojar lógica de negocio |
| Criterio 7 de la guía (la interfaz no accede a las bases) | Se cumple por construcción | Se arriesga |
| Contrato | Cliente generado del OpenAPI de FastAPI | Igual, pero con un backend duplicado |
| Decisión | **Elegido** | Descartado |

Sesión en cookie `httpOnly` y CORS limitado al origen del frontend. En desarrollo, Vite reenvía `/api` al backend.

## 4. Estilo de API (D-39)

REST. Las consultas C1 a C5 y las operaciones se exponen como endpoints fijos; no hace falta la consulta flexible de GraphQL. El contrato lo da el OpenAPI de FastAPI, exportado a `docs/api/openapi.json`.

## 5. Acceso a datos (D-40)

Un repositorio por base, con driver oficial y sin ORM: psycopg 3 para PostgreSQL, PyMongo con su API asíncrona para MongoDB (Motor está en desuso) y el driver oficial de Neo4j. Consultas parametrizadas y credenciales en variables de entorno.

## 6. Despliegue (D-41)

Un solo `docker-compose` con las tres bases, la API, el proceso del outbox y el frontend compilado. La guía (sección 5.2) indica que para un proyecto académico basta una arquitectura modular con una API que coordine las tres bases, sin microservicios ni transacciones distribuidas.

## 7. Versiones (D-55)

| Componente | Versión | Nota |
| --- | --- | --- |
| Python | 3.13, con uv | Se fija el parche en `uv.lock` |
| Node.js | 24 LTS | Elegido por su soporte más largo que el de 22 |
| PostgreSQL | 17 | Imagen con etiqueta de parche fija |
| MongoDB | 8.0 | Imagen con etiqueta de parche fija |
| Neo4j | 5.26 Community (LTS) | Soporte hasta junio de 2028 según [Neo4j](https://neo4j.com/blog/developer/neo4j-v5-lts-evolution/); sin las reglas de Enterprise (DT-05) |

## 8. Consecuencias y deudas asumidas

- DT-05: Neo4j Community no impone existencia ni tipos de propiedades; se validan en la aplicación.
- DT-13: ningún motor impone la visibilidad; un error en una consulta expone datos. Mitigación: pruebas de visibilidad obligatorias (D-56).
- DT-17: autenticación y roles construidos a mano.
- DT-18: un solo proceso de outbox (D-48); si cae, la réplica se atrasa y `/salud` lo informa.
