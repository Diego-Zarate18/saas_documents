# impeccable sobre las 8 vistas (T-01b, Parte C.1)

Modo **Operate**. El Figma es el brief aprobado: no se tocan paleta, tipografía, composición ni textos. Los hallazgos que piden cambiarlos quedan listados para el revisor, sin corregir.

Evidencia del detector: `detect --json frontend/src` (código fuente, 0 hallazgos) y `detect --json --cdp 9222` sobre cada vista y estado renderizado (ver `auditoria/resumen.md` y `auditoria/impeccable-*.json`).

## 1. audit

| # | Dimensión | Puntos | Hallazgo principal |
| --- | --- | --- | --- |
| 1 | Accesibilidad | 3 | AA cumplido en las 8 vistas y sus estados; quedan el falso positivo `aria-hidden-focus` con `#root` inerte y `landmarks/region` (moderado) en el portal de los modales |
| 2 | Rendimiento | 3 | Movimiento solo con `opacity` y `transform`; el cambio de fuente en una carga en frío desplaza ≈0.006 (CLS) |
| 3 | Temas | 3 | Todos los colores, duraciones y curvas salen de tokens; sin modo oscuro (fuera de alcance) |
| 4 | Adaptable | 2 | Escritorio primero por decisión (1280 a 1920 px, legible a 1024); el móvil está fuera de alcance |
| 5 | Integridad | 3 | Solo avisos del detector, los tres explicados (abajo) |
| **Total** | | **14/20** | **Bueno** |

**Integridad: pasa.** El sistema es el del Figma («Señal Guinda»). Los esqueletos usan las mismas tarjetas y líneas que el contenido, y el movimiento sale de una sola tabla de tokens.

### Hallazgos

- **[P1, corregido] Pantalla de sesión sin `main` ni `h1`.** accesslint marcó `navigable/bypass` (grave), `page-has-heading-one`, `landmark-main` y `region`. Ahora la pantalla es un `main` con un `h1` «SIGEDOC» solo para lectores de pantalla (`RutaProtegida.tsx`).
- **[P1, corregido] Lista del selector cargando (V-05).** Faltaban las opciones y el nombre: `aria-required-children` y `form-label`, ambos críticos. La lista ahora lleva `aria-busy` mientras carga (ARIA la exime de opciones) y se nombra con el prefijo o la etiqueta del disparador (`Selector.tsx`).
- **[P2, corregido] Campo «Instrucción» de V-05 sin límite visible.** Usaba solo la sombra hundida, como el selector de su fila. Ahora lleva el mismo anillo de `--borde-campo`.
- **[P2, listado] Cambio de fuente en una carga en frío.** Al recargar sobre una vista, Unbounded llega después del primer pintado y desplaza ≈0.006 (`cls.mjs`). En el flujo normal, que entra por V-01, las fuentes ya están cargadas y el desplazamiento no aparece (`cls-flujo.mjs`). Arreglo posible: precargar los `woff2` latinos.
- **[P2, listado] `landmarks/region` en los modales.** El contenido del portal de Radix queda fuera de un landmark. Viene de la T-01.
- **[P3, falso positivo] `cream-palette`.** Es el marfil `#F2EFEA` de la paleta aprobada. Viene de la T-01.
- **[P3, listado] `nested-cards`.** Es el bloque del usuario dentro de la barra lateral (`aside > div:nth-of-type(3)`); así lo dibuja el Figma.
- **[P3, falso positivo] `marquee`.** Es el brillo del esqueleto, una animación aprobada que se detiene con movimiento reducido.

## 2. critique

⚠️ DEGRADED: single-context. No lancé subagentes porque las reglas de la sesión lo impiden sin pedirlo; las evaluaciones A y B corrieron en el mismo contexto: primero la revisión de diseño y después el detector.

Se evalúa sobre todo lo que agrega la T-01b (estados de carga, respuesta de las acciones y movimiento), porque la composición es la aprobada.

| # | Heurística | Puntos | Comentario |
| --- | --- | --- | --- |
| 1 | Visibilidad del estado | 4 | Esqueletos con la forma del contenido, spinner en las tres acciones con espera, «Cargando…» para el lector de pantalla y barra arena en la vista activa |
| 2 | Coincidencia con el mundo real | 3 | Lenguaje de oficialía (turnar, acuse, folio) |
| 3 | Control y libertad | 3 | Esc y Cancelar cierran el modal; el foco vuelve al botón que lo abrió |
| 4 | Consistencia | 3 | Un solo vocabulario de movimiento; el chevron de «Ver todos» no existe (ver dudas) |
| 5 | Prevención de errores | 3 | «Turnar a N áreas» se deshabilita sin un solo responsable (RI-10) y queda pendiente mientras turna: no hay doble envío |
| 6 | Reconocer antes que recordar | 3 | La fila elegida y el recorrido coinciden (Parte A) |
| 7 | Flexibilidad y eficiencia | 2 | Sin atajos de teclado para la bandeja (fuera de alcance) |
| 8 | Diseño estético y minimalista | 3 | El movimiento es sobrio y no hay entradas de página |
| 9 | Recuperación de errores | 3 | Error de la fuente con «Reintentar» y aviso con fundido |
| 10 | Ayuda y documentación | 2 | Las vistas en construcción dicen qué falta y en qué tarea llega |
| **Total** | | **29/40** | **Bueno** |

**Especificidad del diseño.** Los esqueletos no son bloques genéricos: repiten las tarjetas, los anchos de columna y el recorrido de cada vista. La columna lateral de la bandeja espera al recorrido para no mover nada que ya se vea.

**Personas.**

- **Alex (usuario experto):** la carga ya no deja ceros ni rayas que confundan. Le sigue faltando teclado rápido en la tabla.
- **Sam (lector de pantalla):** oye un solo «Cargando…» por vista, sin cuatro anuncios a la vez. El botón pendiente se anuncia ocupado y no se puede volver a pulsar.
- **Marta (oficialía, del PRODUCT.md):** en la bandeja con filtros, la fila marcada y el recorrido ya son el mismo documento.

**Preguntas para el revisor.**

- ¿El «Cargando…» debe anunciar también lo que se lee sin esqueleto? Hoy lo anuncia; por ejemplo, las áreas que precarga la ficha para el modal.
- ¿«Ver todos» debe convertirse en un control que se pliega, con chevron, como sugiere la tabla de animaciones?

## 3. polish

Recorrido completo en Chrome sin interfaz a 1440 × 960: V-01, las bandejas de OF, DI, TI y PE, las fichas, «Vista en construcción» y V-05.

- **Estados:** cargando (esqueleto o spinner), con datos, vacío, error con reintento y modal. Cada uno se verificó con `auditar.mjs` y `movimiento.mjs`.
- **Desplazamiento:** CLS ≤ 0.0031 en el flujo normal y ≤ 0.0057 al recargar (`cls-flujo.mjs` y `cls.mjs`). Lo corregido en esta fase fue la columna lateral, que daba 0.0465 con Dirección.
- **Foco y contraste:** anillos y bordes de control ≥ 3:1 en todos los fondos (`contraste-resultado.md`). El texto lo revisa la regla `color-contrast` de accesslint en cada escaneo.
- **Código:** sin código de depuración ni estilos huérfanos. La regla de la flecha (`Boton.module.css`, `.flecha`) se queda aunque hoy no la use ningún botón, porque la tabla aprobada la pide.
