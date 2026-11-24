# Evidencia de la T-02c: V-16, simulador aislado y contrato de la API

- Fecha: 2026-11-24
- Entorno: Windows 11, Node 24.22.3, npm del proyecto, Chrome 158 sin interfaz (puerto 9222) para las comprobaciones en el navegador, Vite en `http://localhost:5174`.
- Scripts y resultados: `docs/pruebas/T-02c-verificacion/`. Capturas: `docs/pruebas/T-02c-capturas/`.
- Los scripts de navegador reutilizan `cdp.mjs` y `dom.mjs` de la T-02b.

## Criterio 1 · Comandos de `frontend/`

`criterio1-resultado.txt` guarda la última corrida completa, de `npm ci` a `npm run build`.

| Comando | Resultado |
| --- | --- |
| `npm ci` | 0 vulnerabilidades, código 0 |
| `npm run lint` | `oxlint --deny-warnings` sin hallazgos, código 0 |
| `npm run typecheck` | sin errores, código 0 |
| `npm test` | 16 archivos, **171 pruebas** pasadas (T-02b: 166), código 0 |
| `npm run build` | sin advertencias, código 0 |

**Una prueba de la T-02b falla a veces.** En 2 de 9 corridas completas falló 1 prueba. La segunda vez quedó el nombre: `o27_o08_v11b_crea_un_asunto_y_el_documento_queda_asignado` (`consulta.test.tsx:111`). Con latencia 0, la creación termina antes de que `waitFor(… aria-busy="true")` alcance a verlo, el modal se cierra y la espera falla. No es parte de esta tarea y no la cambié (ver «Dudas» del reporte). La corrida de arriba, la que cuenta, pasó completa.

Pruebas nuevas:

| Prueba | Archivo |
| --- | --- |
| `t02c_v16_siglas_de_todos_los_niveles_en_una_columna_fija` | `src/paginas/administracion.test.tsx` |
| `t02c_ningun_archivo_fuera_del_simulador_depende_de_la_semilla` | `src/api/aislamiento.test.ts` |
| `t02c_la_prueba_detecta_una_pagina_con_id_de_semilla_o_que_importa_el_simulador` | `src/api/aislamiento.test.ts` |
| `contrato_inventario_cubre_todas_las_funciones` | `src/api/contrato.test.ts` |
| `o31_si_el_catalogo_falla_el_modal_lo_avisa` | `src/paginas/catalogos.test.tsx` (de `/ponytail-review`) |

## Criterio 2 · V-16, siglas en una columna fija

- **Figma** (`9yljMLMqWHlIHQqRCsXEjV`, V-16 `52:2118`): cada fila de segundo nivel lleva un marco «Sangría» de 24 px antes de la sigla, y la de tercer nivel (UT) uno de 48 px. **El Figma sí sangra la sigla.** Se dejó la columna fija, como pidió Diego (captura `figma-v16-estructura.png`). Las notas de V-16 (`52:2310`) no hablan de las siglas.
- **Cambio:** la sangría por nivel pasó del botón de la fila al nombre (`Organizacion.tsx`).
- **Medición en el navegador** (`siglas.mjs`, `siglas-antes.md` y `siglas-despues.md`): borde izquierdo de cada sigla, sesión de administración.

| Vista | Antes | Después |
| --- | --- | --- |
| V-16 | 301 px (DG), 325 px (segundo nivel), 349 px (UT): 3 desplazamientos | 301 px en las 12 áreas: columna fija |
| V-17 | 301 px en las 13 áreas | sin cambio (es una tabla; no tenía el desfase) |

- **Capturas:** `app-v16-antes.png`, `app-v16-despues.png`, `app-v17-antes.png` y `app-v17-despues.png`.
- **Prueba:** `t02c_v16_siglas_de_todos_los_niveles_en_una_columna_fija`. jsdom no calcula posiciones, así que la prueba comprueba la estructura: ni la fila ni la sigla tienen estilo propio, y solo el nombre se sangra (DG ×0, JU ×1, UT ×2).

## Criterio 3 · Datos movidos y prueba de aislamiento

Tabla de lo que se movió: en el reporte (`ai/handoff/reporte.md`, «Qué hice»).

**Prueba de aislamiento** (`src/api/aislamiento.test.ts`): lee todo `src/` con `import.meta.glob` y falla en dos casos:

- un archivo fuera de `api/simulado/` y de las pruebas importa del simulador (`api/index.ts` es la única excepción: es quien elige la fuente);
- un archivo de `paginas/` o `componentes/` contiene un id de semilla (un folio con la forma `XX-2026-0000`, `OP-2026-`, `@institucion.gob.mx` o los UUID deterministas de `datos.ts`).

**Mutación en disco** (`aislamiento-mutacion.txt`):

1. Con `const FOLIO_FIJO = 'OP-2026-0139'` en `Bandeja.tsx`, falla con «paginas/v02-bandeja/Bandeja.tsx contiene un id de semilla: OP-2026-0139».
2. Con `import { personas } from '../../api/simulado/datos'` en `Bandeja.tsx`, falla con «paginas/v02-bandeja/Bandeja.tsx importa del simulador».
3. Con `Bandeja.tsx` restaurado, pasa (2 de 2). `git status` no muestra cambios en el archivo.

## Criterio 4 · `ApiSigedoc`, `ErrorApi` y `{ elementos, total }`

- **`ApiSigedoc`** está en `src/api/contrato.ts`. `index.ts` declara `const api: ApiSigedoc = simulado` y exporta desde `api`, así que `tsc` falla si el simulador deja de cumplir la interfaz.
- **`ErrorApi`** (`tipos.ts`) trae `codigo`, `titulo`, `detalle`, `estado_http` y `existente`, y reemplaza a `ErrorDeApi`/`Problema`.
  - Las vistas muestran el texto con `mensajeDeError`, desde `ErrorOperacion` o `EstadoConsulta`.
  - Ninguna vista lee el texto a mano. V-01 pasó a `ErrorOperacion` y V-18 dejó de leer `.message`. Solo dos vistas leen otros campos: V-03 (`existente`) y V-18 (`codigo === 'CONFLICTO'`).
  - Comprobado con grep: no queda ningún `.message`, `isError` ni `problema.` en las vistas.
- **Listados:** las 12 funciones que devuelven listas responden `Listado<T>` (`{ elementos, total }`); el tipo lo garantiza.
  - La excepción es `obtenerRecorrido` (C1), que devuelve `Movimiento[]`: es el recorrido completo de un documento y no se pagina (ver el inventario).

## Criterio 5 · `VITE_API_MODO=real`

`modo-real.mjs` arranca Vite con `VITE_API_MODO=real` en el puerto 5175 y escucha la consola desde antes de recargar la página (`modo-real.md`, `app-modo-real.png`):

- Texto de la página: «La API real aún no está disponible.» (`role="alert"`).
- Errores o advertencias en la consola: ninguno.

Antes, `index.ts` lanzaba una excepción al importarse. Ahora exporta `API_DISPONIBLE` y `main.tsx` muestra el aviso en lugar de la aplicación.

## Criterio 6 · Inventario del contrato

- `ai/handoff/borradores/contrato-api.md`: 47 fichas, una por cada nombre que `index.ts` exporta para las páginas (46 funciones y `usuariosDePrueba`), con los nueve campos. Al final trae las operaciones sin función, 16 diferencias entre el simulador y la API real, y la semilla (`semilla.mjs` y `semilla.md`).
- `contrato_inventario_cubre_todas_las_funciones` pasa. **Por mutación:**
  - si se renombra el encabezado de `atraer`, falla con `expected [ 'atraer' ] to deeply equal []`;
  - si se cambia «Visibilidad» en la ficha de `obtenerCatalogos`, falla con `ficha de obtenerCatalogos: expected [ 'Visibilidad' ] to deeply equal []`;
  - restaurado, pasa.

## Criterio 7 · Contraste sobre el vidrio de los modales

Medido en dos modales con `contraste.mjs` (`contraste-antes-0.9.md` y `contraste-despues-0.94.md`, más las capturas `contraste-*.png`). Se usaron dos métodos:

1. **WCAG con el fondo medido:** para cada texto con `--texto-secundario` dentro del diálogo, se captura su caja y se toma como fondo el color más frecuente de esos píxeles (velo, brillos y desenfoque incluidos). Se calcula el contraste del token sobre ese fondo.
2. **impeccable detect** (`--cdp 9222`), que compara los píxeles del texto suavizado: es la medición que dio 4.47 y 4.49:1 en la T-02b.

| `--vidrio-fondo-modal` | V-11 «Asignar documento» (WCAG) | V-11b «Asignar a un asunto» (WCAG) | impeccable |
| --- | --- | --- | --- |
| 0.9 (T-01) | 5.29:1 | 5.03:1 | V-11: **4.4:1**, no cumple |
| 0.92 | 5.39:1 | 5.08:1 | V-11: **4.46:1**, no cumple (dos corridas) |
| 0.93 | — | — | sin hallazgos (una corrida) |
| **0.94** (elegido) | **5.48:1** | **5.13:1** | sin hallazgos (tres corridas) |

Elegí 0.94 y no 0.93 para dejar margen sobre una medición que cambia unas centésimas entre corridas. El valor está en `tokens.css` y en `DESIGN.md` («Shadow Vocabulary», Vidrio). El token también lo usan los menús y las listas desplegables (`Menu`, `Selector` y `BuscadorDocumento`), que quedan 4 puntos más opacos.

## Criterio 8 · accesslint, colores y dependencias

- **accesslint** (`accesslint-resultado.md`): V-16 y V-17 sin violaciones de ningún nivel.
- **Greps** (`greps-resultado.txt`):
  - ningún color fuera de `tokens.css`;
  - `package.json` y `package-lock.json` iguales a los de `develop`;
  - el único importador del simulador fuera de él es `api/index.ts`;
  - no hay ids de semilla en `paginas/` ni en `componentes/`.

## Criterio 9 · `/ponytail-review`

`T-02c-verificacion/ponytail-review.md`: 0 «must fix», 1 «should fix» y 1 «nice to have».

- El «should fix»: si O-31 fallaba, los modales quedaban sin opciones y sin aviso. Está corregido en las ocho vistas, con la prueba `o31_si_el_catalogo_falla_el_modal_lo_avisa`, comprobada por mutación.
- El «nice to have» (la prueba del inventario depende del directorio desde el que se corre) queda como deuda.

La corrida del criterio 1 es posterior a la corrección.

## Criterio 10 · Commit

Pendiente: en el reporte, después del commit.
