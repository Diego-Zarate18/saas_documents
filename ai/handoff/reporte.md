# Reporte T-08: Interfaz conectada a la API real y retiro del simulador

- Estado: completa

## Qué hice

1. **Calidad.** `npm run lint`, `npm run typecheck`, `npm test` (10 pruebas en 4 archivos) y `npm run build` terminan sin errores ni avisos. `uv run pytest ../tests` da 41 pasadas y `uv run ruff check . ../tests` no marca nada.
2. **Sin simulador.** `grep -ri "simulad" frontend/src` no devuelve nada.
3. **Recorrido de las pantallas.** Lo hice con la API real, la semilla recargada y un usuario por rol (contraseña `sigedoc-dev`), en Chrome sin interfaz dirigido por CDP con scripts fuera del repositorio.
   - El inicio de sesión se hizo por el formulario real.
   - Cada pantalla se abrió y se revisó su contenido, las respuestas 4xx/5xx de `/api` y los errores de consola.
   - Las escrituras se ejecutaron con el mismo cliente (`src/api`) desde la página, con la sesión de cada rol, y después se revisaron las pantallas que las muestran. Una escritura (agregar nota) se hizo además llenando el formulario: el modal se cierra y la ficha se actualiza.
   - El único 401 que aparece es el de `GET /sesiones/actual` antes de iniciar sesión, que es lo esperado.
4. **Commit.** Un solo commit `T-08: …` sin coautoría.

| Pantalla | Resultado |
| --- | --- |
| Iniciar sesión (V-01), 5 roles | Funciona. Cada rol entra a su inicio: OF, DI, TI y PE a `/bandeja`; AD a `/organizacion`. |
| Bandeja (V-02) | Funciona: oficialía, 24 pendientes (18 como responsable), como en la semilla. Se corrigieron en el backend dos diferencias con el contrato: «Atraído por …» nombraba el área de origen en lugar de la que atrae, y «Ya no está adscrito» se marcaba a cualquier titular de otra área (ahora solo cuando el titular quedó sin área, como el simulador). La síntesis nula de un confidencial ajeno se muestra como «Contenido confidencial». |
| Registrar (V-03, O-01) | Funciona: OP-2026-0153 con datos del tipo. |
| Turnar (O-03) | Funciona: grupo Compras (responsable) y Finanzas (apoyo). |
| Devolver (O-22) | Funciona: OP-2026-0152 regresa a oficialía «Devuelto por Compras · falta firma». |
| Atraer (O-23) | Funciona: Finanzas atrae OP-2026-0153; la bandeja dice «Atraído por Finanzas» (después de la corrección). |
| Concluir (O-05) | Funciona: `con_respuesta` con la salida nueva (titular) y `enterado` (personal). |
| Ficha (V-04, O-11) | Funciona: registro, expediente de MongoDB (datos del tipo, anexo y nota), recorrido de Neo4j (turno, corrección, atracción), relaciones y ubicación. Con acceso restringido, el registro ya admite los campos nulos (se muestra «—»). |
| Expediente, segunda recepción, corrección, cancelación (O-28, O-29, O-19, O-25, O-24) | Funcionan. La nota también desde el formulario. |
| Relacionar y quitar (O-07, O-18) | Funcionan, con un documento registrado y uno no registrado; la ficha muestra la relación. |
| Asuntos e hilo (V-11, C2, C5, O-27, O-08) | Funcionan: el hilo de «Laboratorios» trae la salida que responde y el no registrado. Crear un asunto con documento, asignar y sacar también funcionan. |
| Búsqueda (V-06, O-30) y selector | Funcionan: 37 resultados sin filtros. |
| Rebotes (V-12, C3) | Funciona: 4 documentos con sus reglas. |
| Posibles duplicados (V-14, O-26) | Funciona: comparación, «distintos» y «mismo»; la lista queda vacía. |
| Salidas y acuse (V-13, O-20, O-21, D-58) | Funcionan: CO-2026-0050 responde a OP-2026-0121 y aparece con acuse; los acuses del área llegan a Compras. |
| Administración (O-32 a O-35) | Funciona: crear área, persona (cuenta nueva), titular, baja, desactivar área, crear y desactivar actor. Organización, Áreas, Personas y Actores cargan. |

## Desviaciones y decisiones

- **Cliente real.** `src/api/real.ts` usa `fetch` sobre `/api` con `credentials: 'include'` y convierte los problem details a `ErrorApi` (`title` → `titulo`, `detail` → `detalle`, `status` → `estado_http`, `existente`). Un fallo de red o un 5xx sin cuerpo llega como `Error`, y la vista muestra su texto de respaldo. Las escrituras que devuelven un `Movimiento` lo reciben con ids, no con nombres; ninguna página lo lee (vuelven a consultar).
- **Tipos actualizados a la API** (T-06 y T-07):
  - `PendienteBandeja.asunto` puede ser nulo.
  - `RegistroDocumento` admite nulos con acceso restringido.
  - `Relacion` trae `sentido`.
  - La ficha, la segunda recepción y la bandeja muestran «—» o «Contenido confidencial» donde llega `null`.
- **Pruebas del frontend.**
  - Se borraron las que montaban la aplicación o leían la semilla del simulador.
  - Los casos de `validarGrupoTurno`, que estaban en `simulado/servidor.test.ts`, pasaron a `api/reglas.test.ts` (son reglas puras, no pruebas nuevas).
  - `api/contrato.test.ts` se borró: leía `ai/handoff/borradores/contrato-api.md`, que ya no existe.
  - Quedan Boton, BuscadorDocumento (con la API mockeada), el paginador y las reglas.
- **Indicador de salud y sesión.** El indicador de T-03 (`AvisoApiReal`, `api/salud.ts`) se borró: solo existía para el modo real sin vistas. `sesion/almacen.ts` (la sesión en `sessionStorage` del simulador) también se borró: la sesión es la cookie httpOnly.
- **Semilla y variables.** Se borraron `database/semilla.mjs` y `frontend/.env.example`. Este último solo tenía `VITE_API_MODO` y `VITE_API_LATENCIA_MS`.
- **Neo4j.** El driver de la API no emite notificaciones informativas (`notifications_min_severity='OFF'`). Llenaban el registro con avisos de propiedades opcionales que aún no existen en ningún nodo, como `id_area_sugerida`.

## Dudas

Ninguna.
