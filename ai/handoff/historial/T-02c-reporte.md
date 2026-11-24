# Reporte T-02c: Corrección de V-16, simulador aislado y contrato de la API

- Estado: completa
- Fecha: 2026-11-24

## Qué hice

Seguí las cuatro fases y anuncié el nivel de ponytail de cada una; Diego confirmó cada cambio: 0 off, 1 full, 2 off, 3 off, y full solo para `/ponytail-review`. La evidencia completa está en `docs/pruebas/T-02c-contrato.md`.

1. **Criterio 1:** `npm ci`, `lint`, `typecheck`, `test` y `build` terminan con código 0 y sin advertencias. Hay **171 pruebas** en 16 archivos (la T-02b dejó 166). Una prueba de la T-02b falla a veces; ver «Dudas».

2. **Parte A · V-16:** la sangría por nivel pasó del botón de la fila al nombre. Así las siglas quedan en una columna fija.
   - Medido en el navegador: antes caían en tres posiciones (301, 325 y 349 px); ahora las 12 están en 301 px.
   - Prueba `t02c_v16_siglas_de_todos_los_niveles_en_una_columna_fija`; capturas de antes y después.
   - **El Figma sí sangra la sigla** (marcos «Sangría» de 24 y 48 px antes de cada una). Dejé la columna fija, como pidió Diego.
   - V-17 es una tabla y ya tenía las siglas alineadas (301 px en las 13 áreas): no la cambié.

3. **Parte B.1 · Datos fijos fuera del simulador.** Lo que encontré y moví:

   | Qué | De dónde | A dónde |
   | --- | --- | --- |
   | Motivos de devolución (lista) | `Devolver.tsx`, constante `MOTIVOS` | `Catalogos.motivos_devolucion` (O-31, desde `datos.ts`) |
   | Motivos: texto y descripción de V-07 | `Devolver.tsx` | `textos.ts`, `OPCION_MOTIVO` |
   | Formas de conclusión (lista) | `Concluir.tsx`, `FORMAS` | `Catalogos.formas_conclusion` |
   | Descripciones de las formas | `Concluir.tsx` | `textos.ts`, `DESCRIPCION_FORMA` |
   | Tipos de relación (lista) | `Relacionar.tsx`, `TIPOS` | `Catalogos.tipos_relacion` |
   | Descripciones de las relaciones | `Relacionar.tsx` | `textos.ts`, `DESCRIPCION_RELACION` |
   | Canales | `Registrar.tsx` y `SegundaRecepcion.tsx`, `['correo', 'papel']` | `Catalogos.canales` |
   | Roles de usuario | `Personas.tsx`, `ROLES` (y `ROLES` en `servidor.ts`) | `Catalogos.roles` (`db.roles`) |
   | Roles de turno | `Turnar.tsx` (`ROLES` con textos) y `Corregir.tsx` (`ROLES`) | `Catalogos.roles_turno`; texto de `TEXTO_ROL`, que ya existía |
   | Estados del documento | `Buscar.tsx`, `ESTADOS` | `Catalogos.estados_documento` |
   | Tipos de actor | `Actores.tsx`, `TIPOS` (y `TIPOS_ACTOR` en `servidor.ts`) | `Catalogos.tipos_actor` (`db.tiposActor`) |
   | Usuarios de prueba | `InicioSesion.tsx`, `USUARIOS_DE_PRUEBA` | `datos.ts`, `usuariosDePrueba`, expuesto en `ApiSigedoc` (la API real exporta `[]`) |
   | Ejemplo de folio `OP-2026-…` | `Buscar.tsx` (placeholder) | texto «Siglas-año-número» |
   | `OP-2026-0139` en un comentario | `EncabezadoPagina.tsx` | «BANDEJA / <folio>» |

   Tipos de documento, áreas y actores ya salían de O-31 y O-32. No encontré datos fijos en `src/sesion` ni en `src/rutas`: el menú por rol y `ROLES_FICHA` son reglas de permiso (D-44), no opciones.

4. **Parte B.2 · `ApiSigedoc`** (`src/api/contrato.ts`): las 46 funciones de `index.ts` con sus tipos, más `usuariosDePrueba`. `index.ts` hace `const api: ApiSigedoc = simulado` y exporta desde `api`, así que el compilador falla si el simulador deja de cumplirla. No hay HTTP real.

5. **Parte B.3 · Errores y paginación.**
   - `ErrorApi { codigo, titulo, detalle, estado_http, existente? }` reemplaza a `ErrorDeApi`/`Problema`.
   - Las vistas muestran el texto con `mensajeDeError`, desde `ErrorOperacion` o `EstadoConsulta`. V-01 pasó a usar `ErrorOperacion` y V-18 dejó de leer `.message`.
   - Las 12 funciones que listan responden `{ elementos, total }`. `obtenerRecorrido` (C1) sigue devolviendo `Movimiento[]` (ver «Decisiones»).

6. **Parte B.4 · Modo.** `VITE_API_MODO` vale `simulado` por omisión. Con `real`, `index.ts` ya no lanza una excepción: exporta `API_DISPONIBLE` y `main.tsx` muestra «La API real aún no está disponible.». Lo comprobé en el navegador con Vite en ese modo: la consulta queda sin errores ni advertencias.

7. **Parte B.5 · Prueba de aislamiento** (`src/api/aislamiento.test.ts`). Falla si un archivo fuera del simulador y de las pruebas lo importa (la única excepción es `api/index.ts`), o si `paginas/` o `componentes/` contienen un id de semilla. Lo comprobé en disco: con `'OP-2026-0139'` o con un import del simulador en `Bandeja.tsx` falla, y al restaurar pasa.

8. **Parte C · Inventario** (`ai/handoff/borradores/contrato-api.md`).
   - 47 fichas con los nueve campos.
   - Al final: las operaciones sin función, 16 diferencias entre el simulador y la API real con su propuesta, y la semilla con sus ids (la genera `semilla.mjs`).
   - La prueba `contrato_inventario_cubre_todas_las_funciones` pasa y falla por mutación, tanto si falta una ficha como si falta un campo.

9. **Contraste del vidrio:** `--vidrio-fondo-modal` pasó de 0.9 a **0.94**.
   - Lo medí en V-11 «Asignar documento» y V-11b «Asignar a un asunto».
   - A 0.9, impeccable medía 4.4:1 en V-11. A 0.92 seguía en 4.46:1. Desde 0.93 deja de marcarlo. Elegí 0.94 para tener margen.
   - Contra el fondo medido (WCAG): 5.48 y 5.13:1.
   - El valor está en `DESIGN.md`.

10. **accesslint:** V-16 y V-17 sin violaciones de ningún nivel.
11. **Colores y dependencias:** ningún color fuera de los tokens; `package.json` y `package-lock.json` sin cambios.
12. **`/ponytail-review`:** 0 «must fix», 1 «should fix» (corregido) y 1 «nice to have» (en «Deuda»). El «should fix» era que, si O-31 fallaba, los modales quedaban sin opciones y sin aviso. Ahora las ocho vistas lo avisan, con la prueba `o31_si_el_catalogo_falla_el_modal_lo_avisa`.

## Archivos

Creados:

- `frontend/src/api/contrato.ts`: interfaz `ApiSigedoc`.
- `frontend/src/api/aislamiento.test.ts`: prueba de aislamiento (Parte B.5).
- `frontend/src/api/contrato.test.ts`: prueba del inventario.
- `frontend/src/paginas/catalogos.test.tsx`: aviso cuando O-31 falla.
- `ai/handoff/borradores/contrato-api.md`: inventario del contrato (Parte C).
- `docs/pruebas/T-02c-contrato.md`: evidencia.
- `docs/pruebas/T-02c-verificacion/`:
  - scripts: `siglas.mjs`, `contraste.mjs`, `modo-real.mjs`, `preparar-auditoria.mjs` y `semilla.mjs`;
  - resultados: `criterio1-resultado.txt`, `siglas-antes.md`, `siglas-despues.md`, `contraste-antes-0.9.md`, `contraste-despues-0.94.md`, `modo-real.md`, `aislamiento-mutacion.txt`, `accesslint-resultado.md`, `greps-resultado.txt`, `semilla.md` y `ponytail-review.md`.
- `docs/pruebas/T-02c-capturas/`: `figma-v16-estructura.png`, `app-v16-antes/despues.png`, `app-v17-antes/despues.png`, `contraste-*.png` y `app-modo-real.png`.
- `ai/handoff/historial/T-02c-asignacion.md` y `T-02c-reporte.md`.

Modificados:

- **API:**
  - `api/index.ts`: exporta a través de `ApiSigedoc`, modo y `API_DISPONIBLE`.
  - `api/tipos.ts`: `ErrorApi`, `mensajeDeError` y las listas nuevas de `Catalogos`.
  - `api/simulado/datos.ts`: listas cerradas y `usuariosDePrueba`.
  - `api/simulado/servidor.ts`: O-31 con las listas, `ErrorApi`, y roles y tipos de actor desde `datos.ts`.
- **Pruebas del simulador** (`consultas.test.ts`, `operaciones.test.ts` y `servidor.test.ts`): leen `ErrorApi`.
- **Componentes:**
  - `textos.ts`: `OPCION_MOTIVO`, `DESCRIPCION_FORMA` y `DESCRIPCION_RELACION`.
  - `ErrorOperacion.tsx` y `EstadoConsulta.tsx`: usan `mensajeDeError`.
  - `EncabezadoPagina.tsx`: comentario sin folio.
- **Vistas:**
  - `v16-organizacion/Organizacion.tsx`: Parte A.
  - `v01-inicio-sesion/InicioSesion.tsx`: usuarios de la API y `ErrorOperacion`.
  - Listas de O-31 y aviso de error del catálogo: `v05-turnar/Turnar.tsx`, `v07-devolver/Devolver.tsx`, `v09-concluir/Concluir.tsx`, `v10-relacionar/Relacionar.tsx`, `v15-oficialia/Corregir.tsx`, `v15-oficialia/SegundaRecepcion.tsx`, `v18-personas/Personas.tsx` y `v19-actores/Actores.tsx`.
  - Solo las listas de O-31: `v03-registrar/Registrar.tsx` (canales; sus selectores ya muestran la carga) y `v06-buscar/Buscar.tsx` (estados y el ejemplo de folio).
- `paginas/administracion.test.tsx`: prueba de V-16.
- `main.tsx`: aviso del modo `real`.
- `estilos/tokens.css`: `--vidrio-fondo-modal` a 0.94.
- `DESIGN.md`: el valor del vidrio de los modales.
- `ai/handoff/reporte.md`: este reporte.

## Evidencia

Detalle en `docs/pruebas/T-02c-contrato.md`.

- **Criterio 1:** `npm ci` (0 vulnerabilidades), `lint`, `typecheck`, `test` (16 archivos, 171 pruebas) y `build` (sin advertencias), todos con código 0 (`criterio1-resultado.txt`, corrida posterior a la última corrección).
- **Criterio 2:** `siglas-antes.md` y `siglas-despues.md` (3 posiciones antes, 1 después) y las cuatro capturas de V-16 y V-17.
- **Criterio 3:** la tabla de la Parte B.1 y `aislamiento-mutacion.txt` (falla con el id de semilla y con el import; al restaurar pasa).
- **Criterio 4:** `tsc` contra `ApiSigedoc`, grep sin lecturas de error a mano en las vistas, y los 12 listados con el tipo `Listado<T>`.
- **Criterio 5:** `modo-real.md` y `app-modo-real.png`.
- **Criterio 6:** la prueba del inventario y su mutación.
- **Criterio 7:** `contraste-antes-0.9.md`, `contraste-despues-0.94.md` y la tabla por opacidad.
- **Criterio 8:** `accesslint-resultado.md` y `greps-resultado.txt`.
- **Criterio 9:** `ponytail-review.md`.
- **Criterio 10:** commit único `T-02c: …`, sin coautoría; lo comprobé después del commit (`git log -1 --format=%B`, `git status`, `git ls-files`).

## Decisiones que tomé

- **O-31 ampliado.** Además de lo que nombra el catálogo (tipos, motivos, formas y actores), agregué canales, roles, roles de turno, estados, tipos de relación y tipos de actor. Así ninguna lista de opciones vive en una página, que es lo que pide la Parte B.1. Ver el hueco propuesto.
- **Textos de las opciones.** Los textos y las descripciones de cada opción se quedan en `textos.ts`, indexados por el valor del catálogo. Los títulos con mayúscula de V-07 («No es de nuestra competencia») conviven con `TEXTO_MOTIVO` en minúsculas («no es de su competencia»), que usan el recorrido y la bandeja. Así ya estaba antes.
- **`ErrorApi`** es una clase con los campos en español. El cliente de T-15 convierte el *problem details* (`title`, `detail`, `status`) a esos campos. La API sigue hablando RFC 9457, como dice la arquitectura.
- **`usuariosDePrueba`** es una constante dentro de `ApiSigedoc` y no una función, porque no hay operación detrás. La API real exporta `[]`.
- **Modo `real`:** el simulador se sigue importando y la aplicación no se monta. Lo marqué con un comentario `shortcut:` en `index.ts`; T-15 elige ahí el cliente real.
- **Excepción de la prueba de aislamiento:** `api/index.ts` es el único archivo de producción que puede importar del simulador, porque es quien elige la fuente. La asignación pedía que fallara con «cualquier archivo fuera del simulador y de las pruebas», pero eso haría imposible la Parte B.2.
- **Ids de semilla:** la prueba no revisa los archivos `.test.*` de `paginas/`, porque las pruebas de vista usan folios a propósito.
- **`obtenerRecorrido` (C1)** sigue devolviendo `Movimiento[]` y no `Listado`: es el recorrido completo de un documento, no un listado paginado.
- **`SegundaRecepcion`** conserva la regla `canal anterior → el otro` (D-28) escrita en el código: es lógica, no una lista de opciones.
- **Vidrio a 0.94 y no a 0.93,** para tener margen sobre una medición que varía unas centésimas. El token también lo usan los menús y las listas desplegables, que quedan un poco más opacos.
- **Lectura del inventario en la prueba:** uso `node:fs` y no `?raw`, porque Vite bloquea leer fuera de `frontend/`. No quise ampliar `server.fs.allow`, que también abriría el servidor de desarrollo a la raíz del repositorio.

## Desviaciones

- **El Figma sangra la sigla en V-16.** Dejé la columna fija, como pidió Diego. El Figma debería alinearse (lo hace el revisor).
- **El worktree partía de `main` (`2f69384`).** Lo detuve antes de empezar. Por indicación de Diego hice `git merge --ff-only develop` (`b5ec2e2`). **El commit queda en la rama del worktree** (`claude/sigedoc-t-02c-handoff-822ac8`); Diego lo integra en `develop`.
- **Fuera de alcance, pero hecho:** quité dos listas duplicadas del simulador (`ROLES` y `TIPOS_ACTOR` en `servidor.ts`) para que use las mismas que devuelve O-31. No cambia el comportamiento.

## Dudas y huecos propuestos

- **HU-propuesto · Listas cerradas en O-31.**
  - Qué falta: O-31 en el grafo y en el catálogo nombra áreas, tipos, motivos, formas y actores. La interfaz además necesita canales, roles de usuario, roles de turno, estados, tipos de relación y tipos de actor.
  - Qué afecta: `GET /catalogos` (T-13), D-32, D-44, D-59 y D-05.
  - Opciones: (a) ampliar la descripción de O-31 con esas listas, que es lo que hace hoy el simulador; (b) dejar las listas cerradas en el código de la interfaz y que la prueba de aislamiento las permita.
- **Prueba intermitente de la T-02b.** `o27_o08_v11b_crea_un_asunto_y_el_documento_queda_asignado` (`consulta.test.tsx:111`) falló en 2 de 9 corridas completas.
  - Causa: con latencia 0, la creación termina antes de que `waitFor(… aria-busy="true")` lo vea; el modal se cierra y la espera falla.
  - No la cambié porque es de la T-02b. La corrección es quitar esa aserción o comprobar el estado pendiente con una promesa que la prueba controle. ¿Va en una tarea?
- **Decisiones del simulador que me parecen dudosas.** Están marcadas «Dudoso» en el inventario y no las cambié. Las de visibilidad (D-29) son las más importantes:
  - con acceso restringido, la ficha sigue trayendo número de emisor, emisor, fechas y canal (O-30 sí oculta el número);
  - la bandeja muestra el asunto de un confidencial a todo el personal del área;
  - `obtenerAsuntos` cuenta documentos y áreas que el usuario no ve;
  - turnar, devolver y registrar una salida aceptan áreas inactivas;
  - un área de apoyo que devuelve deja al destino como responsable;
  - `sustituye_a` no revisa el estado de los documentos;
  - O-19 no exige que el documento esté en trámite;
  - el motivo de cancelación se guarda pero nada lo devuelve;
  - el nombre de un asunto no es único.
- **Rutas nuevas y ajustes del mapa de endpoints.** Están en las fichas, marcadas **nuevo** o **ajuste**. Las que más conviene decidir:
  - `DELETE /documentos/{id}/referencias/{tipo}?referencia=&emisor=`, porque un no registrado no tiene id;
  - `POST /salidas/{id}/acuses`, en lugar de `/documentos/{id}/acuses`;
  - un solo `GET /consultas/selector-documentos`, que incluye salidas.
- **Paginación en los demás listados.** La arquitectura pide `?pagina=&tamano=` en los listados, pero el simulador solo pagina la bandeja y la búsqueda. Propongo que la API acepte esos parámetros en salidas, asuntos, rebotes, duplicados, personas y actores.
- **O-21, «un acuse por destinatario».** El simulador permite un acuse por salida; equivalen mientras cada salida tenga un solo destinatario.

## Deuda detectada

- `shortcut:` en modo `real` el simulador se sigue importando (`api/index.ts`); T-15 lo reemplaza.
- La prueba del inventario lee el archivo relativo a `process.cwd()`: solo funciona corriendo vitest desde `frontend/`, como hace `npm test` (`/ponytail-review` 2).
- El aviso del modo `real` es un `Aviso` sin la maquetación de página. No hay diseño en el Figma para ese estado.
- Las de la T-02b siguen: vínculos por nombre, contraseña sin simular y periodos con el reloj real. Están en «Diferencias» del inventario.

## Siguiente paso sugerido

El revisor revisa el inventario y lo pasa al apéndice A de la guía del backend. Después, validación visual de V-16 y de los modales con el vidrio a 0.94.
