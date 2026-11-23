# T-01 · Interfaz base: evidencia de ejecución

- Fecha: 2026-11-22
- Entorno: Windows 11, Node 24.22.3, npm 11.6.2, Chrome 157 sin interfaz (para accesslint y capturas).
- Base: `develop` en `642cc1d` más el cambio de T-01.
- Datos: fuente simulada (`VITE_API_MODO=simulado`, D-63) con el reloj fijo en 2026-11-22 12:00 (Ciudad de México).

## Criterio 1. Instalación, lint, tipos, pruebas y build

Ejecutados en `frontend/`:

| Comando | Resultado |
| --- | --- |
| `npm ci` | 183 paquetes, 0 vulnerabilidades, sin advertencias. Código 0. |
| `npm run lint` | `oxlint --deny-warnings`: sin hallazgos. Código 0. |
| `npm run typecheck` | `tsc -b`: sin errores. Código 0. |
| `npm test` | 4 archivos, **45 pruebas pasadas**, 0 fallidas, sin advertencias en la salida. Código 0. |
| `npm run build` | Sin errores ni advertencias. Fragmentos: `index` 70 kB, `dependencias` 440 kB (139 kB gzip). Código 0. |

Pruebas por archivo:

| Archivo | Qué cubre | Pruebas |
| --- | --- | --- |
| `src/rutas/rutas.test.tsx` | Menú por rol de los seis usuarios (`d62_menu_*`), redirección sin sesión, inicio de sesión hacia la ruta pedida, mensaje genérico (`o36_*`), aviso «Sin permiso» (`d44_*`), vista en construcción (`t02_*`) y cierre de sesión (`o37_*`) | 16 |
| `src/api/simulado/servidor.test.ts` | Bandeja con los totales del Figma, «ya no está adscrito», conocimiento no queda pendiente, filtros (`o14_*`); visibilidad D-29 (`d29_*`); RI-10, permisos D-44 y turno completo (`o03_*`) | 18 |
| `src/paginas/v04-ficha/Ficha.test.tsx` | Acciones por rol en la ficha (`o11_acciones_*`), aviso de contenido confidencial (`d29_*`), aviso de acción de T-02 | 7 |
| `src/paginas/v05-turnar/Turnar.test.tsx` | Teclado y foco del modal (Tab no sale del diálogo; Esc y Cancelar devuelven el foco a «Turnar»), RI-10 en la interfaz y flujo oficialía → Compras (`o03_*`) | 4 |

Comprobación de que las reglas de accesibilidad del linter corren: un archivo temporal con `<img src="x.png" />` hizo que `npm run lint` respondiera `error jsx-a11y(alt-text): Missing alt attribute` con código 1; luego se borró.

## Criterio 2. Recorrido con `npm run dev`

Script: [`T-01-verificacion/recorrido.mjs`](T-01-verificacion/recorrido.mjs) (inicia sesión por el formulario de V-01 en Chrome por CDP). Salida completa en [`recorrido-resultado.txt`](T-01-verificacion/recorrido-resultado.txt):

| Usuario | Entra en | Menú | Bandeja | Ficha abierta y acciones | Cerrar sesión |
| --- | --- | --- | --- | --- | --- |
| Marta Flores (OF) | `/bandeja` | Bandeja, Registrar documento, Buscar, Salidas externas, Posibles duplicados, Asuntos, Rebotes, Actores externos, Organización | 24 pendientes | OP-2026-0143: Más acciones, Relacionar, Turnar | `/iniciar-sesion` |
| Lic. Ana López (DI) | `/bandeja` | Bandeja, Buscar, Asuntos, Rebotes, Organización | 1 (Dirección General) | OP-2026-0097: Turnar | `/iniciar-sesion` |
| Ing. Raúl Pérez (TI) | `/bandeja` | Bandeja, Buscar, Asuntos, Organización | 8 (Compras) | OP-2026-0152: Más, Devolver, Turnar, Concluir | `/iniciar-sesion` |
| C.P. Elena Díaz (TI) | `/bandeja` | Bandeja, Buscar, Asuntos, Organización | 2 (Finanzas) | OP-2026-0128: Más, Devolver, Turnar, Concluir | `/iniciar-sesion` |
| Jorge Ruiz (PE) | `/bandeja` | Bandeja, Buscar, Asuntos, Organización | 8 (Compras) | OP-2026-0152: Más, Concluir | `/iniciar-sesion` |
| Mtro. Luis Gómez (AD) | `/organizacion` | Organización, Áreas, Personas y usuarios, Actores externos | No tiene bandeja (D-62) | No abre fichas: «Sin permiso» | `/iniciar-sesion` |

Flujo oficialía → Turnar → bandeja de Compras, con clics reales en el navegador de vista previa de Claude Code:

1. Marta Flores abre OP-2026-0139 («Pendiente en Oficialía de partes como responsable · 1 día») y pulsa **Turnar**.
2. Elige Compras como responsable, agrega Finanzas y la marca como apoyo. El aviso dice «Un responsable en el grupo: Compras.» y la nota de titulares «Compras, Ing. Raúl Pérez · Finanzas, C.P. Elena Díaz».
3. **Turnar a 2 áreas**: el modal se cierra, el foco vuelve a «Turnar» y la ficha dice «Pendiente en Compras como responsable · 0 días».
4. Cierra sesión y entra Ing. Raúl Pérez: la bandeja de Compras muestra **9 / 7 / 2 / 8 días** y la fila «OP-2026-0139 · Requisición de material de cómputo · Turnado por Oficialía · Responsable · 0 días · Ing. Raúl Pérez». La tarjeta «Acuses» lista CO-2026-0048, CO-2026-0049 y CO-2026-0046, como V-02b.

## Criterio 3. Fidelidad al Figma

Capturas a 1440 px en [`T-01-capturas/`](T-01-capturas/): `figma-*.png` son las del nodo del Figma y `app-*.png` las de la aplicación, del mismo tamaño. Las de la aplicación se tomaron con [`capturas.mjs`](T-01-verificacion/capturas.mjs) (Chrome sin interfaz por CDP) porque el panel del navegador de Claude Code estaba oculto y recortaba las capturas a 1440 px. Para V-02b, V-04b y V-04e, OP-2026-0139 se dejó en el estado que dibuja el Figma llamando a `turnar` de la fuente simulada con las tres áreas de V-05; el mismo turno se hizo por la interfaz en el criterio 2.

| Vista | Nodo | Capturas | Diferencias conocidas |
| --- | --- | --- | --- |
| V-01 Inicio de sesión | `34:115` | `figma-v01.png` · `app-v01.png` | Los campos aparecen vacíos (el Figma muestra un correo de ejemplo y el foco en Contraseña). |
| V-02 Bandeja (oficialía) | `34:157` | `figma-v02.png` · `app-v02.png` | OP-2026-0139 dice «1 día» (el Figma, «3 días»; su ficha V-04 dice 1 día). La vista previa del recorrido muestra el primer pendiente (OP-2026-0143); el Figma muestra OP-2026-0139. Icono de la última acción por tipo de movimiento (registro, turno, devolución); el Figma no es consistente. |
| V-02b Bandeja (titular) | `62:3141` | `figma-v02b.png` · `app-v02b.png` | El recorrido de la vista previa lista todos los movimientos de OP-2026-0139 (7); el Figma muestra 3 pasos. Antigüedad de OP-2026-0139: 0 días (el turno es del mismo día del reloj fijo); el Figma, 1 día. |
| V-02c Bandeja (personal) | `62:3523` | `figma-v02c.png` · `app-v02c.png` | Las mismas que V-02b. |
| V-04 Ficha (oficialía) | `37:231` | `figma-v04.png` · `app-v04.png` | Ninguna de contenido. |
| V-04b Ficha (titular) | `45:537` | `figma-v04b.png` · `app-v04b.png` | El recorrido muestra el segundo turno como grupo («Compras + Finanzas + Dirección General») y las dos ubicaciones actuales (Compras responsable, Finanzas apoyo); el Figma solo dibuja Compras con «Turnado de nuevo por oficialía». |
| V-04e Ficha (personal) | `65:2638` | `figma-v04e.png` · `app-v04e.png` | Las mismas que V-04b. |
| V-05 Turnar (modal) | `39:320` | `figma-v05.png` · `app-v05.png` | Se captura el modal recién abierto (una fila vacía y el aviso rojo «Elige el área de cada fila.»); el Figma muestra tres filas llenas. El selector de Radix no responde a eventos sintéticos en Chrome sin interfaz. El modal lleno se verificó con clics reales (criterio 2). |

## Criterio 4. Accesibilidad

**accesslint** (CLI 0.13, motor 0.21, 94 reglas WCAG 2.2 A y AA). Script: [`escanear.sh`](T-01-verificacion/escanear.sh); resultados JSON en `T-01-verificacion/a11y-*.json`. El servidor MCP de accesslint no conectó en la sesión, así que se usó la CLI que trae la propia skill.

| Vista | Violaciones |
| --- | --- |
| V-01, V-02 (OF y DI), V-02b, V-02c, V-04, V-04b, V-04e | 0 |
| V-05 (modal abierto) | 19 `aria-hidden-focus` (graves) y 1 `landmarks/region` (moderada) |

- `aria-hidden-focus`: falso positivo. Mientras el modal está abierto, `#root` lleva `inert` (`document.getElementById('root').inert === true`), así que nada del fondo puede recibir el foco. Radix además lo oculta con `aria-hidden`, y el motor de accesslint no toma en cuenta `inert`. Dos de los 19 son los `span` de guarda de foco que Radix agrega a `body`. La prueba `o03_modal_atrapa_el_foco_y_esc_lo_devuelve_al_boton` confirma que Tab no sale del diálogo.
- `landmarks/region`: el portal del diálogo queda fuera de los landmarks. Hallazgo menor; el diálogo tiene `role="dialog"`, título y descripción.
- Corregidos durante la revisión: el disparador del selector no tenía nombre como combobox (3 vistas) y el de V-05 decía «Área destino 1» mientras mostraba «Elige un área» (WCAG 2.5.3). Ahora se nombra con el prefijo o la etiqueta más el valor visible.

**impeccable** (`detect`): el código fuente no tiene hallazgos. En la página renderizada de V-01 el único hallazgo es `cream-palette` por el marfil `#F2EFEA`, que es el fondo de la paleta aprobada (D-64): falso positivo del brief. El detector no puede iniciar sesión, así que las demás vistas se revisaron con accesslint, el contraste calculado y en el navegador.

**Contraste WCAG 2.2 AA** (calculado con la fórmula de luminancia relativa):

- Texto: todo pasa 4.5:1. Mínimos: texto secundario sobre marfil hundido 4.63; rótulo de la barra lateral (blanco al 55 % sobre guinda profundo) 5.36; foco guinda sobre marfil 9.67.
- Pastillas de estado: con los colores exactos del Figma, Rebote (3.83 a 3.92), Posible duplicado (4.05 sobre marfil) y Cancelado (4.34 sobre marfil) no llegaban a 4.5:1. Con aprobación de Diego, el texto lleva un 20 % de tinta; el punto y el tinte conservan el color del Figma. Mínimo resultante: 4.58.
- Borde de los campos (`--borde-sutil` sobre marfil): 1.36:1, por debajo del 3:1 de WCAG 1.4.11. Se deja como el Figma por decisión de Diego; lo compensan la etiqueta visible, la sombra hundida y el borde de foco guinda. Queda como hallazgo menor para el revisor.

**Teclado:** todos los controles son nativos o primitivas de Radix y tienen foco visible (anillo guinda, arena sobre la barra lateral). El segmentado usa radios nativos (flechas dentro del grupo). Lo cubren las pruebas del modal y el recorrido por teclado del criterio 2.

## Criterio 5. Colores fuera de los tokens

```
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" frontend/src --include=*.css --include=*.tsx --include=*.ts
```

49 resultados, todos en `frontend/src/estilos/tokens.css`. Ninguno en otro archivo.

## Criterio 6. `/ponytail-review`

Sin hallazgos «must fix». Los demás quedan en el reporte (`ai/handoff/reporte.md`).

## Responsive

Sin desbordamiento horizontal a 1024, 1280 y 1440 px (`scrollWidth` igual al ancho de la ventana). Por debajo de 1280 px las columnas laterales de la bandeja y de la ficha bajan debajo de la tabla y del expediente.
