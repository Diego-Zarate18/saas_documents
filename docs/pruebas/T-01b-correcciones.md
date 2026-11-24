# Evidencia T-01b: correcciones y movimiento de la interfaz base

- Fecha de ejecución: 2026-11-22 y 2026-11-23
- Entorno: Windows 11, Node 24.22.3, npm; Chrome sin interfaz (`--headless=new`) por CDP a 1440 × 960.
- Rama: `claude/sigedoc-t-01b-handoff-dd8f22`, avanzada desde `develop` (`04fee03`).
- Servidores de verificación: `npx vite` en el puerto 5174 (latencia simulada por omisión, 450 ms) y, solo para escanear el estado «cargando», en el 5175 con `VITE_API_LATENCIA_MS=15000`.
- Scripts: `docs/pruebas/T-01b-verificacion/`. Capturas: `docs/pruebas/T-01b-capturas/`.

## 1. Comandos del proyecto

Salida completa: `T-01b-verificacion/criterio1-resultado.txt`. Todos terminaron con código 0.

| Comando | Resultado |
| --- | --- |
| `npm ci` | 183 paquetes, 0 vulnerabilidades |
| `npm run lint` | oxlint `--deny-warnings`, sin hallazgos |
| `npm run typecheck` | `tsc -b`, sin errores |
| `npm test` | 6 archivos, **52 pruebas** pasadas (eran 45) |
| `npm run build` | sin advertencias (0 líneas con «warn») |

Pruebas nuevas o modificadas:

| Prueba | Qué demuestra |
| --- | --- |
| `o14_filtro_tipo_fila_resaltada_y_recorrido_son_el_mismo_documento` | Parte A.1: con el filtro «Tipo», la fila resaltada y el recorrido son el mismo documento, en los dos casos de la regla |
| `o14_esqueleto_de_la_bandeja_aria_busy_un_status_y_formas_ocultas` | Esqueleto de la bandeja: `aria-busy`, un solo `role="status"` con «Cargando…» y las formas ocultas |
| `o14_area_sin_pendientes_no_deja_la_columna_en_esqueleto` | El «must fix» de `/ponytail-review`: un área sin pendientes no deja la columna lateral en esqueleto |
| `o11_esqueleto_de_la_sesion_y_de_la_ficha` | Pantalla de sesión y esqueleto de la ficha, con el mismo contrato de accesibilidad |
| `o03_boton_pendiente_spinner_aria_busy_deshabilitado_y_mismo_texto` | Botón pendiente con ícono: el spinner ocupa el lugar del ícono, el botón queda deshabilitado y con `aria-busy`, y el texto no cambia |
| `o03_boton_sin_icono_y_cerrar_sesion_pendientes` | «Entrar» y «Cerrar sesión» pendientes; no responden al clic |
| `o03_modal_anima_con_data_state_y_cierra_tras_la_salida` | Velo y panel con `data-state`; el diálogo se desmonta y el foco vuelve a «Turnar» |

## 2. Parte A

- **Fila elegida y recorrido.** Además de la prueba `o14_…`, en el navegador (`parte-a.mjs`, captura `parte-a-filtro-tipo.png`):

  ```text
  Sin filtro (primera de la lista)                     fila resaltada OP-2026-0143 · recorrido OP-2026-0143 · coinciden
  Elige «Requisición de material de cómputo»           fila resaltada OP-2026-0139 · recorrido OP-2026-0139 · coinciden
  Tipo: Solicitud de material o pago (la elegida sigue) fila resaltada OP-2026-0139 · recorrido OP-2026-0139 · coinciden
  Tipo: Solicitud de transparencia (la elegida sale)    fila resaltada OP-2026-0141 · recorrido OP-2026-0141 · coinciden
  ```

- **`Tarjeta`:** sin la opción `como`; siempre es `section`.
- **`.claude/launch.json`:** versionado con el contenido de la asignación.
- **`--borde-campo`:** vale #6B6461 (`var(--texto-secundario)`), con estos contrastes (`contraste-resultado.md`):

  | Fondo | Borde de campo | Borde sutil (antes) |
  | --- | --- | --- |
  | Marfil `#F2EFEA` | 5.06:1 | 1.36:1 |
  | Marfil relieve `#F5F2ED` | 5.19:1 | — |
  | Marfil hundido `#EAE5DF` | 4.63:1 | — |
  | Blanco `#FFFFFF` | 5.80:1 | 1.56:1 |
  | Guinda suave `#F6ECEE` | 5.01:1 | — |

  El valor y los contrastes también están en `DESIGN.md`.

## 3. Esqueletos y desplazamiento del diseño

Cada esqueleto se verificó en el navegador: contenedor con `aria-busy`, un único `role="status"` con «Cargando…» y formas ocultas a los lectores de pantalla. Las capturas son `esqueleto-*.png` y `contenido-*.png`.

**CLS en el flujo normal** (`cls-flujo.mjs`, `cls-flujo-resultado.txt`): de «Entrar» a la bandeja con datos, y del clic en un folio a la ficha con datos.

| Rol | Entrar → bandeja | Folio → ficha |
| --- | --- | --- |
| OF | 0.0004 | 0.0031 |
| DI | 0.0022 | — |
| TI | 0.0001 | 0.0000 |
| PE | 0.0001 | 0.0000 |

**CLS al recargar** la vista con la sesión abierta (`cls.mjs`, `cls-recarga-resultado.txt`):

| Vista | CLS |
| --- | --- |
| Bandeja OF | 0.0041 |
| Bandeja TI | 0.0034 |
| Bandeja PE | 0.0034 |
| Ficha OF | 0.0030 (0.0057 en una corrida anterior) |
| Ficha TI | 0.0015 |

Notas:

- Lo que queda al recargar (≈0.003) es el cambio de fuente a Unbounded, porque las fuentes se cargan después del primer pintado. El flujo normal entra por V-01, donde las fuentes ya están cargadas, y ahí no aparece.
- Antes de un ajuste, la bandeja de Dirección daba **0.0465**: la tarjeta «Rebotes» bajaba 192 px cuando llegaba un recorrido de 5 pasos. Ahora, en la carga inicial, la columna lateral espera al recorrido y se sustituye de una vez.

## 4. Movimiento

- `DESIGN.md` tiene la sección «Movimiento», con los tokens y la tabla de animaciones aprobadas.
- `grep` (`greps.sh`, `greps-resultado.txt`): toda declaración `transition` o `animation` fuera de `tokens.css` usa `var(--mov-*)` y `var(--curva-*)`. No hay ningún literal de tiempo ni de curva fuera de `tokens.css`.
- Duraciones: las animaciones de interfaz usan 100, 150 y 220 ms; ninguna pasa de `--mov-medio`. Solo el brillo del esqueleto (1400 ms) y el spinner (800 ms) son bucles más largos.

## 5. Movimiento reducido

`movimiento.mjs` emula `prefers-reduced-motion: reduce` por CDP (`Emulation.setEmulatedMedia`) y compara los estilos calculados contra el modo sin preferencia. Los estados `:hover` y `:active` se fuerzan con `CSS.forcePseudoState`. Tabla completa en `movimiento-resultado.md`; capturas `esqueleto-bandeja-reducido.png` y `modal-v05-reducido.png`.

| Elemento | Sin preferencia | Con `reduce` |
| --- | --- | --- |
| Brillo del esqueleto | `brillo`, 1.4 s, en bucle | `none`: la forma queda estática |
| Ícono de navegación (hover) | `translateX(2px)` | `none` |
| Botón (`:active`) | `scale(0.98)` | `none` |
| Flecha de «Cerrar sesión» | `translateX(2px)` | `none` |
| Chevron del selector abierto | `rotate(180deg)` | `none` |
| Lista del selector | `desplegar-bajando` (`opacity` y `translateY`), 0.15 s | `desplegar` (solo `opacity`), 0.01 ms |
| Modal: panel | `subir`, 0.22 s; al cerrar `bajar`, 0.15 s | `aparecer` y `desaparecer` (solo `opacity`), 0.01 ms |
| Velo y aviso de RI-10 | `aparecer`, 0.22 s y 0.15 s | 0.01 ms |
| Spinner de «Entrar» | 0.8 s, en bucle | **1.6 s**, en bucle (se conserva) |
| Foco tras cerrar el modal | «Turnar» | «Turnar» |

En este Chrome sin interfaz, los eventos de ratón y teclado de CDP no llegan a la página. Por eso los scripts abren el selector con un `keydown` Enter del DOM y pulsan los botones con `.click()`.

## 6. Accesibilidad: accesslint e impeccable

`auditar.mjs` corre `@accesslint/cli` (94 reglas, adjunto a la pestaña) e `impeccable detect --cdp` en 42 escaneos: las 8 vistas, cada una en sus estados (cargando, con datos y con modal), más la pantalla de sesión y el selector abierto, todo sin preferencia y con movimiento reducido. Resumen en `auditoria/resumen.md` y JSON por escaneo en `auditoria/`.

- **Sin violaciones (0):** V-01 (formulario y «Entrar» pendiente), pantalla de sesión, V-02, V-02b y V-02c (cargando y con datos), V-04, V-04b y V-04e (cargando y con datos), en los dos modos de movimiento.
- **Con un diálogo o una lista abierta** (V-04, V-04b y V-04e con «Vista en construcción», V-05 con datos, V-05 cargando y el selector «Tipo» abierto en V-02) quedan solo dos reglas:
  - `aria-hidden-focus` (grave, según el motor): es el falso positivo de la T-01. Radix oculta con `aria-hidden` todo lo que está fuera del diálogo o de la lista. En el modal, `#root` además queda `inert`; en el selector, el foco queda atrapado en la lista. Ninguno de esos controles se puede alcanzar.
  - `landmarks/region` (moderado): el portal de Radix queda fuera de un landmark.
- **Corregido en esta tarea:**
  - Pantalla de sesión: `navigable/bypass` (grave), `page-has-heading-one`, `landmark-main` y `region`.
  - Lista del selector cargando en V-05: `aria-required-children` y `form-label` (críticos). El nuevo escaneo con la lista cargando (`aria-busy="true"` confirmado) ya no los da.
- **impeccable detect:** 0 hallazgos en el código fuente. En las vistas, solo avisos sin gravedad:
  - `cream-palette`: el marfil de la paleta aprobada.
  - `nested-cards`: el bloque del usuario en la barra lateral, como lo dibuja el Figma.
  - `marquee`: el brillo aprobado del esqueleto.

  Informe de audit (14/20), critique (29/40, en modo degradado de un solo contexto) y polish: `T-01b-verificacion/impeccable-informe.md`.
- **Contraste** (`contraste-resultado.md`):
  - Bordes de control: de 4.63 a 5.80:1.
  - Anillo de foco guinda: de 8.86 a 11.09:1; arena sobre la barra lateral: 3.85 y 5.16:1.
  - Texto: lo mide la regla `color-contrast` de accesslint, sin violaciones en ningún escaneo.

## 7. Colores y dependencias

- `grep` de colores (el mismo de la T-01): ninguno fuera de `frontend/src/estilos/tokens.css`.
- `git diff develop -- frontend/package.json frontend/package-lock.json`: sin cambios.

## 8. /ponytail-review

Informe en `T-01b-verificacion/ponytail-review.md`.

- **Must fix (corregido):** la columna lateral se quedaba en esqueleto con una bandeja vacía, porque TanStack da por pendiente una consulta deshabilitada. Lo cubre la prueba `o14_area_sin_pendientes_…`, que falló antes del arreglo.
- **Should fix (listado):** un filtro vuelve a poner en esqueleto toda la columna lateral.
- **Nice to have (listado):** un `@keyframes` repetido en tres módulos, y la copia del resultado de la consulta en `TarjetasLaterales.tsx`.

## 9. Commit

Se verifica en el reporte (`git log -1 --format=%B`, `git status`, `git ls-files`).
