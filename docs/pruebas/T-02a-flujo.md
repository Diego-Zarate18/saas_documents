# T-02a · Evidencia: flujo del documento en la interfaz (datos simulados)

Fecha: 2026-11-23. Comandos en `frontend/`, Windows 11, Node 24.

## Criterio 2 · Parte 0 (pendientes de la T-01b)

| Punto | Cambio | Comprobación |
| --- | --- | --- |
| 0.1 `Select` controlado | `Selector.valor` es `string` (siempre controlado; la cadena vacía muestra el marcador). `Turnar` pasa `valor={f.id_area}` y `Bandeja` `valor={idArea ?? ''}`. | `src/pruebas/preparar.ts` hace fallar toda prueba que llame a `console.error` o `console.warn`. Con el `|| undefined` anterior, `o03_ri10_boton_deshabilitado_sin_un_solo_responsable` y `o03_flujo_oficialia_turnar_bandeja_de_compras` fallan con «Select is changing from uncontrolled to controlled»; con el arreglo, ninguna prueba imprime advertencias. |
| 0.2 Columna lateral | `Bandeja` esqueletiza la columna entera solo hasta que termina la carga inicial (estado `columnaLista`). Después, al filtrar o cambiar de fila, solo «Recorrido» muestra su esqueleto. | Prueba nueva `o14_cambiar_un_filtro_no_vuelve_a_esqueletizar_rebotes` (un `MutationObserver` registra cada estado intermedio): falla con el código de la T-01b y pasa con el arreglo. |
| 0.3 `@keyframes aparecer` | Una sola definición en `base.css`; `Aviso`, `EstadoConsulta` y `Modal` la usan con `global(aparecer)`. | En el CSS del build hay un solo `@keyframes aparecer` y las cuatro reglas `animation:aparecer …` apuntan a él, sin sufijo de módulo. |
| 0.4 `cargando` en `EstadoConsulta` | Prop nueva `cargando`; `TarjetasLaterales` ya no construye `{ ...consulta, isPending }`. | Revisión del código y la misma prueba de 0.2. |
| 0.5 Precarga de fuentes | Tres `<link rel="preload" as="font" crossorigin>` en `index.html` hacia los `woff2` latinos de Fontsource, sin dependencias nuevas. | Build: el `href` de cada precarga es idéntico a la `url()` de su `@font-face` (`unbounded-…-D5afBTBx`, `geist-…-BgDaEnEv`, `geist-mono-…-XN7g48iV`) y cada archivo se emite una vez. Desarrollo: cada `woff2` se pide una sola vez, con iniciador `link`, y la consola no muestra avisos de precarga sin usar. |
| 0.6 `.claude/settings.json` | Quitada `Bash(npx eslint *)` de `allow`. | `grep -c eslint .claude/settings.json` → 0. |

Tras la Fase 1: `npm run lint`, `typecheck`, `test` (6 archivos, 53 pruebas) y `build` terminan con código 0 y sin advertencias.

## Parte B · Datos y reglas simuladas

- **Siete tipos (D-65):** `TipoDocumento` con los siete ids; los nombres de la interfaz están en `TEXTO_TIPO`. O-31 devuelve los siete.
- **Campos propios (D-66):** la tabla `camposTipo` (semilla) se sirve con O-31 como `campos_tipo` y la usan la validación del servidor y del formulario (`validarDatosTipo` en `api/reglas.ts`) y la ficha. Solo tres tipos tienen entrada.
- **Operaciones simuladas** en `api/simulado/servidor.ts`, expuestas en `api/index.ts` y con su hook en `api/consultas.ts` (cada escritura invalida las consultas): O-01, O-19, O-24, O-25, O-22 (devolver y returnar), O-23, O-05 (cinco formas), O-07 y O-18, O-20, O-21, O-28 y O-29, más la búsqueda para los selectores (O-30 reducido) y el folio siguiente de V-03.
- **Ficha:** el expediente trae `datos_tipo` y la ficha muestra «Datos del tipo» solo en los tres tipos con campos. En el navegador, OP-2026-0139 muestra «Concepto» y la bandeja, los nombres de tipo.

Pruebas en `src/api/simulado/operaciones.test.ts` (35 casos). Comprobación por mutación: con la corrección de O-25 desactivada falla `o25_…`; con el origen de la atracción en nulo falla `o23_…`.

Tras la Fase 2: `lint`, `typecheck`, `test` (7 archivos, 88 pruebas) y `build` con código 0 y sin advertencias.

## Parte A · Vistas

- **V-03 Registrar documento** (`paginas/v03-registrar/`): ruta `/registrar` para oficialía; los siete tipos, el bloque «Contenido · {tipo}» que sale de la tabla de campos y desaparece en los cuatro tipos sin campos, `puntos` como lista con alta y baja, interruptores confidencial y extemporáneo, folio que se asignará, panel «Ya existe este documento» con salida a V-15c y recordatorio «Después de registrar». Validación en línea con foco al primer error; al guardar navega a la ficha.
- **Modales** con el patrón de `Turnar` (Radix Dialog, foco atrapado, Esc, foco devuelto, botón pendiente, error en línea): V-07/07b `Devolver`, V-08 `Atraer`, V-09/09b `Concluir`, V-10 `Relacionar` (con «Quitar», O-18), V-15a `Cancelar`, V-15b `Corregir`, V-15c `SegundaRecepcion`, V-13b `RegistrarSalida` y el panel de acuse.
- **Ficha:** acciones por rol desde `accionesFicha`; «Más acciones» de oficialía (V-04d) con Relacionar, Segunda recepción, Corregir y Cancelar; «Más» de titular y personal con Relacionar y Asignar a un asunto. Cada operación invalida las consultas: ficha, recorrido y bandeja se vuelven a leer.
- **Recorrido:** textos de atracción, conclusión y corrección; el movimiento corregido queda marcado.

Pruebas nuevas en `src/paginas/modales.test.tsx` (15): teclado y foco de los ocho modales, botón pendiente y refresco tras devolver, avisos de returnar, V-09b sin evidencia, error del servidor en línea en V-10, bloque del tipo en V-03, registro con validación y duplicado con segunda recepción.

Tras la Fase 3: `lint`, `typecheck`, `test` (8 archivos, 104 pruebas) y `build` con código 0 y sin advertencias.

## Fase 4 · Verificación y cierre

### Criterio 1

`npm ci`, `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`, ejecutados juntos tras las correcciones de `/ponytail-review`, terminan con código 0 (`T-02a-verificacion/criterio1-resultado.txt`):

- `npm ci`: 0 vulnerabilidades.
- `lint`: sin hallazgos.
- `test`: 8 archivos, 107 pruebas; ninguna advertencia, porque cualquiera haría fallar su prueba.
- `build`: sin advertencias.

### Criterio 3

| Archivo | Qué cubre |
| --- | --- |
| `src/api/simulado/operaciones.test.ts` (36) | O-01, O-19, D-29, D-42, O-22, O-23, O-05 y D-59 (las cinco formas y sus requisitos), D-44 y D-58, O-20 y O-21, O-07 y O-18 (con D-33), O-24, O-25, O-28 y O-29, O-30, D-65 y D-66 |
| `src/paginas/modales.test.tsx` (16) | Los modales, V-03 y el buscador |
| `src/paginas/v04-ficha/Ficha.test.tsx` | Acciones por rol, incluido el contenido confidencial |
| `src/paginas/v02-bandeja/Bandeja.test.tsx` | Parte 0 |

### Criterio 4

Prueba por modal (foco atrapado, Esc, foco devuelto) para V-07, V-08, V-09, V-10, V-13b, V-15a, V-15b y V-15c, además de:

- botón pendiente y refresco tras devolver;
- error del servidor en línea en V-10;
- error de campo en V-09b y V-03;
- teclado del buscador: Esc cierra la lista sin cerrar el modal.

En el navegador, las capturas `app-v*-modal.png`, `app-v09b-error.png` y `app-v10-error.png`.

### Criterio 5

`T-02a-verificacion/recorrido.mjs` sobre Chrome sin interfaz (CDP, 1440 × 1080), con una sola carga de página y cambio de usuario por «Cerrar sesión» y V-01. Recorre: registrar (Marta Flores) → turnar a Compras y Finanzas → devolver (Ing. Raúl Pérez) → atraer (C.P. Elena Díaz) → relacionar → salida externa con acuse (Marta Flores) → concluir con la salida como respuesta (C.P. Elena Díaz). Pasan las 14 comprobaciones de bandeja, ficha y acuses (`recorrido-resultado.md`), con 17 capturas `app-recorrido-*.png`.

El recorrido descubrió que, al volver a una vista tras una operación, la bandeja mostraba un instante la lista anterior. `useEscritura` ahora descarta las consultas que no están en pantalla.

### Criterio 6

`T-02a-verificacion/auditar.mjs`, con `@accesslint/cli` adjunto a la pestaña e `impeccable detect --cdp`, sobre 20 estados (`auditoria/resumen.md`):

- **0 hallazgos críticos.**
- **Vistas sin modal** (V-03 en sus cuatro estados, V-04 con Atraer y el panel de acuse): 0 violaciones.
- **Modales:** `aria/aria-hidden-focus` (grave) y `landmarks/region` (moderado), el falso positivo de la T-01. `inerte.mjs` comprueba en V-10 que los 19 elementos marcados están dentro de `#root` inerte (17) o son guardas de foco de Radix (2) (`inerte-resultado.md`).
- **Menú V-04d:** 2 `focus-visible` (graves) y 2 `focus-order` (moderados) sobre las dos guardas de foco de Radix (spans invisibles que solo devuelven el foco al menú), y 1 `landmarks/region` del envoltorio del menú. Es la misma clase de falso positivo.
- **impeccable:** 0 hallazgos en el código fuente. Los del navegador se explican en `impeccable-informe.md`; el único real era el contraste del aviso informativo, ya corregido.

### Criterio 7

`greps-resultado.txt`: ningún color, tiempo ni curva fuera de `tokens.css`; `package.json` sin cambios frente a `develop`; ninguna importación de `api/simulado` fuera de `src/api/index.ts` y de las pruebas.

### Criterio 8

`ponytail-review.md`: 9 hallazgos. Se corrigieron el 1, el 2, el 3, el 4, el 5 y el 8; el 6 queda como duda y el 7 y el 9 como deuda.
