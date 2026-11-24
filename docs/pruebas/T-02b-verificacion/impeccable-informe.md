# impeccable sobre las vistas y modales de la T-02b (criterio 7)

Modo **Operate**. El Figma es el brief aprobado: no se tocan paleta, tipografía, composición ni textos. Los hallazgos que piden cambiarlos quedan listados para el revisor, sin corregir.

Evidencia del detector:

- `detect --json frontend/src` sobre el código fuente: 0 hallazgos (`impeccable-fuente.json`).
- `detect --json --cdp 9222` sobre los 27 estados renderizados de `auditar.mjs`. Son vistas, modales y estados de error de V-03, V-04, V-06, V-10, V-11, V-11b, V-11c, V-12, V-13, V-13b, V-14 y V-16 a V-19 (`auditoria/resumen.md` y `auditoria/impeccable-*.json`).

## audit

| # | Dimensión | Puntos | Hallazgo principal |
| --- | --- | --- | --- |
| 1 | Accesibilidad | 3 | AA en vistas y modales. Quedan los falsos positivos de la T-01 en los modales: `aria-hidden-focus` con `#root` inerte (`inerte-resultado.md`) y `landmarks/region` en el portal |
| 2 | Rendimiento | 3 | Sin animaciones nuevas. O-30 espera 250 ms tras la última tecla y el paginador no crece con el total |
| 3 | Temas | 3 | Todos los colores, duraciones y curvas salen de tokens (`greps-resultado.txt`) |
| 4 | Adaptable | 2 | Escritorio primero. Los paneles laterales y la columna de V-14 bajan bajo la lista por debajo de 1280 px |
| 5 | Integridad | 3 | Solo avisos explicados abajo |
| **Total** | | **14/20** | **Bueno** |

### Hallazgos

- **[P1, corregido] Enlace dentro de texto en el hilo de V-11 y V-11c.** accesslint (`link-in-text-block`, grave): el folio enlazado junto a «PERTENECE AL ASUNTO» solo se distinguía por color. Ahora lleva subrayado. Es diseño propio: el Figma no lo subraya.
- **[P1, corregido] Contraste en V-14.** La etiqueta gris sobre el fondo verde de «coincide» quedaba en 4.46:1. Ahora usa la tinta.
- **[P2, listado] `low-contrast` (advisory) en V-11b y en «Asignar documento»: 4.49:1 y 4.47:1.** Es una muestra de píxeles del texto secundario sobre el vidrio del modal, con el fondo desenfocado detrás. Viene del token `--vidrio-fondo-modal` de la T-01, que comparten todos los modales; cambiarlo es decisión del revisor.
- **[P2, listado] `cramped-padding` en las tablas de V-12, V-13 y V-18.** Son 7 px junto al texto en lugar de 8. Es el relleno de la `Tabla` de la T-01, tomado del Figma.
- **[P3, listado] `kicker-above-heading`** en V-17, V-18 y V-19. Es la etiqueta en mono sobre el título del panel («EDITAR ÁREA»), como la dibuja el Figma.
- **[P3, listado] `straggler`** en la descripción de V-12 y en la ayuda del rol en V-18: una palabra sola en la última línea. Son textos del Figma o de D-44.
- **[P3, listado] `line-length`** en el aviso de no registrado de V-10. Viene de la T-02a.
- **[P3, listado] `nested-cards`**: el bloque del usuario de la barra lateral, las cifras dentro del hilo de V-11 y las tarjetas de comparación de V-14. Así las dibuja el Figma.
- **[P3, falso positivo] `cream-palette`**: es el marfil `#F2EFEA` de la paleta aprobada.

## polish

Revisé V-06, V-11, V-11b, V-11c, V-12, V-13, V-14 y V-16 a V-19 contra su captura del Figma (`figma-*.png` frente a `app-*.png`), en el navegador a 1440 px y en las capturas del recorrido.

- Composición, textos, tipografía y materiales coinciden.
- Las diferencias de datos:
  - V-06 muestra la semilla en lugar de «7 resultados».
  - V-16 y V-17 usan las áreas de la semilla («Dirección General» en lugar de «Dirección General de Administración»).
  - Los correos son `@institucion.gob.mx`.
  - Las fechas salen en formato `mm/dd/aaaa`, porque el Chrome sin interfaz está en inglés.
- Corregido en el camino:
  - En V-12, el folio de la tabla salía gris: la clase del botón de fila pisaba al folio.
  - En V-19, el segmentado de «Tipo» se salía del panel; ahora usa el segmentado sin ancho completo.
- Las diferencias de diseño están en el reporte como «diseño propio para revisar».
