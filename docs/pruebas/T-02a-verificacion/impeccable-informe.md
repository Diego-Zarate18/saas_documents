# impeccable sobre las vistas y modales de la T-02a (criterio 6)

Modo **Operate**. El Figma es el brief aprobado: no se tocan paleta, tipografía, composición ni textos. Los hallazgos que piden cambiarlos quedan listados para el revisor, sin corregir.

Evidencia del detector:

- `detect --json frontend/src` sobre el código fuente: 0 hallazgos (`impeccable-fuente.json`).
- `detect --json --cdp 9222` sobre los 20 estados renderizados: V-03 (vacía, con errores, con campos del tipo y con duplicado), V-04 con Atraer, el menú V-04d, los modales V-07, V-07b (rebote y con área), V-08, V-09, V-09b (con error y lleno), V-10 (lleno y con error del servidor), V-13b, el panel de acuse y V-15a, V-15b y V-15c (`auditoria/resumen.md` y `auditoria/impeccable-*.json`).

## audit

| # | Dimensión | Puntos | Hallazgo principal |
| --- | --- | --- | --- |
| 1 | Accesibilidad | 3 | AA en las vistas y modales; quedan el falso positivo `aria-hidden-focus` con `#root` inerte y `landmarks/region` (moderado) en el portal de los modales, ambos de la T-01 |
| 2 | Rendimiento | 3 | Sin animaciones nuevas; los modales reutilizan las de la T-01b. Las vistas que no están en pantalla se descartan tras escribir, para no mostrar datos viejos |
| 3 | Temas | 3 | Todos los colores, duraciones y curvas salen de tokens (`greps-resultado.txt`) |
| 4 | Adaptable | 2 | Escritorio primero; V-03 baja la columna derecha por debajo de 1280 px, como la bandeja y la ficha |
| 5 | Integridad | 3 | Solo avisos explicados abajo |
| **Total** | | **14/20** | **Bueno** |

### Hallazgos

- **[P1, corregido] Contraste del aviso informativo en los modales.** El detector midió 4.4:1 en «Regresa a…» (V-07), el aviso de no registrado (V-10), la corrección (V-15b) y la fecha oficial (V-15c). El fondo era marfil al 80 % sobre el vidrio del modal; ahora es `--fondo-base` opaco, como en el Figma (5.06:1).
- **[P1, corregido] Esc en el buscador cerraba el modal entero** y se perdía lo capturado. Lo encontró la prueba del buscador pedida en `/ponytail-review`. `Modal` ya no se cierra con Esc cuando viene de un combobox con la lista abierta.
- **[P2, listado] `low-contrast` en segmentos deshabilitados**: «Papel · ya registrado» (V-15c) y «Responsable» (V-15b), a 1.9:1. WCAG 1.4.3 exime los controles inactivos y el Figma los dibuja atenuados.
- **[P2, listado] `line-length` en el aviso de V-10** (≈95 caracteres por línea). Son el texto y el ancho de 660 px del Figma.
- **[P3, listado] `straggler`** en la descripción de V-09: «responsable.» queda sola en la segunda línea. Es el texto del Figma.
- **[P3, listado] `nested-cards`**: el bloque del usuario en la barra lateral, el segmentado de V-03 dentro del formulario y el documento existente dentro del panel de duplicado. Así lo dibuja el Figma.
- **[P3, falso positivo] `cream-palette`**: es el marfil `#F2EFEA` de la paleta aprobada (viene de la T-01).

## polish

Revisé V-03, V-04d, V-08, V-09, V-10 y V-13b contra su captura del Figma (`figma-*.png` frente a `app-*.png`), además de las capturas del recorrido.

- Composición, textos, tipografía y materiales coinciden.
- Las diferencias son de datos: folios y fechas de la semilla en lugar de los del ejemplo, y fechas en formato `mm/dd/aaaa` porque el Chrome sin interfaz está en inglés (en español es `dd/mm/aaaa`).
- Las diferencias de diseño están listadas en el reporte como «diseño propio para revisar».
- El anillo de foco aparece en el botón de cerrar y en los selectores recién usados. Es el foco visible de la T-01, no un defecto.
