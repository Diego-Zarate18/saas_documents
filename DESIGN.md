---
name: SIGEDOC
description: Seguimiento de documentos entre departamentos. Identidad «Señal Guinda».
colors:
  fondo-marca: "#6D1F33"
  fondo-marca-profundo: "#4A1422"
  fondo-marca-suave: "#F6ECEE"
  fondo-detalle: "#B8925A"
  fondo-detalle-suave: "#EFE3CF"
  fondo-base: "#F2EFEA"
  fondo-relieve: "#F5F2ED"
  fondo-hundido: "#EAE5DF"
  fondo-superficie: "#FFFFFF"
  texto-principal: "#1F1B1C"
  texto-secundario: "#6B6461"
  texto-marca: "#6D1F33"
  texto-sobre-marca: "#FFFFFF"
  texto-sobre-detalle: "#1F1B1C"
  borde-marca: "#6D1F33"
  borde-sutil: "#D6CEC6"
  estado-en-tramite: "#1F5A8A"
  estado-concluido: "#2E6B4A"
  estado-cancelado: "#6B6461"
  estado-sin-efecto: "#5B4B8A"
  estado-posible-duplicado: "#9A5B00"
  estado-rebote: "#C2410C"
  estado-confidencial: "#6D1F33"
  estado-error: "#B42318"
typography:
  display-l:
    fontFamily: "Unbounded Variable, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: normal
    letterSpacing: "-0.02em"
  titulo-l:
    fontFamily: "Unbounded Variable, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: normal
    letterSpacing: "-0.01em"
  titulo-m:
    fontFamily: "Unbounded Variable, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: normal
    letterSpacing: "-0.01em"
  titulo-s:
    fontFamily: "Unbounded Variable, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: normal
    letterSpacing: "-0.005em"
  cuerpo-m:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  cuerpo-s:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  etiqueta-m:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: normal
  etiqueta-s:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: normal
  pie:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: normal
  mono-folio:
    fontFamily: "Geist Mono Variable, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: normal
    letterSpacing: "0.02em"
  mono-dato:
    fontFamily: "Geist Mono Variable, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: normal
  mono-encabezado:
    fontFamily: "Geist Mono Variable, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: normal
    letterSpacing: "0.06em"
rounded:
  indicador: "2px"
  rol: "6px"
  control: "10px"
  tarjeta: "20px"
  chip: "999px"
spacing:
  boton: "10px 16px"
  campo: "11px 12px"
  navegacion: "10px"
  tarjeta: "24px"
components:
  boton-primario:
    backgroundColor: "{colors.fondo-marca}"
    textColor: "{colors.texto-sobre-marca}"
    typography: "{typography.etiqueta-m}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  boton-secundario:
    backgroundColor: "{colors.fondo-superficie}"
    textColor: "{colors.texto-marca}"
    typography: "{typography.etiqueta-m}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  boton-fantasma:
    textColor: "{colors.texto-principal}"
    typography: "{typography.etiqueta-m}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  boton-peligro:
    backgroundColor: "{colors.estado-error}"
    textColor: "{colors.texto-sobre-marca}"
    typography: "{typography.etiqueta-m}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  campo:
    backgroundColor: "{colors.fondo-base}"
    textColor: "{colors.texto-principal}"
    typography: "{typography.cuerpo-m}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
  campo-deshabilitado:
    backgroundColor: "{colors.fondo-hundido}"
    textColor: "{colors.texto-secundario}"
  rol-responsable:
    backgroundColor: "{colors.fondo-marca}"
    textColor: "{colors.texto-sobre-marca}"
    typography: "{typography.etiqueta-s}"
    rounded: "{rounded.rol}"
    padding: "3px 8px"
  rol-apoyo:
    backgroundColor: "{colors.fondo-marca-suave}"
    textColor: "{colors.texto-marca}"
    typography: "{typography.etiqueta-s}"
    rounded: "{rounded.rol}"
    padding: "3px 8px"
  rol-conocimiento:
    textColor: "{colors.texto-secundario}"
    typography: "{typography.etiqueta-s}"
    rounded: "{rounded.rol}"
    padding: "3px 8px"
  estado:
    typography: "{typography.etiqueta-s}"
    rounded: "{rounded.chip}"
    padding: "4px 10px"
  navegacion-elemento:
    textColor: "{colors.texto-sobre-marca}"
    typography: "{typography.etiqueta-m}"
    rounded: "{rounded.control}"
    padding: "10px"
    height: "40px"
---

# Design System: SIGEDOC

<!-- Documentado en T-01 desde el Figma aprobado (archivo 9yljMLMqWHlIHQqRCsXEjV: «01 · Identidad», «02 · Sistema», «03 · Vistas»). El Figma manda; este archivo lo describe. Los nombres de token son los de las variables del Figma en kebab-case y son los mismos de frontend/src/estilos/tokens.css. -->

## Overview

**Creative North Star: "Señal Guinda"**

Guinda y arena, los colores que se asocian con la administración pública mexicana, usados con sobriedad. Guinda para la navegación y la acción principal; arena solo como detalle (líneas, íconos, indicadores), nunca para texto. Vidrio en lo que flota y relieve suave en los resúmenes.

Es una herramienta de oficina para trabajar todo el día: densidad media, lectura rápida de folios y estados, y una sola acción principal por vista. La personalidad está en los detalles precisos (el indicador arena de la vista activa, los folios en mono con espaciado, los títulos en Unbounded), no en la decoración. El fondo marfil lleva brillos difusos guinda y arena que dan profundidad a las superficies de vidrio.

**Key Characteristics:**
- Barra lateral guinda profundo fija a la izquierda (248 px) con el menú del rol.
- Cuatro superficies con papel definido: vidrio, relieve, hundida y sólida.
- Folios, encabezados de tabla y datos técnicos en Geist Mono.
- Estados como píldoras con punto de color sobre un tinte del 12 % del mismo color.
- Cada sección de la ficha indica en mono la base de la que viene (POSTGRESQL, MONGODB, NEO4J).

## Colors

Paleta cálida y contenida: marfil de fondo, tinta casi negra para texto y guinda como única voz de marca.

### Primary
- **Guinda** (#6D1F33, `fondo-marca`, `texto-marca`, `borde-marca`): acción principal, rol responsable, folios y enlaces, borde de foco de los campos, tarjeta indicadora destacada.
- **Guinda profundo** (#4A1422, `fondo-marca-profundo`): barra lateral y degradado de la tarjeta indicadora destacada.
- **Guinda suave** (#F6ECEE, `fondo-marca-suave`): rol de apoyo, fondo de encabezados de tabla y chips de asunto.

### Secondary
- **Arena** (#B8925A, `fondo-detalle`): solo detalle — indicador de la vista activa, avatar, punto del recorrido en la ubicación actual. Nunca texto.
- **Arena suave** (#EFE3CF, `fondo-detalle-suave`): aviso de posibles duplicados y notas del expediente.

### Neutral
- **Marfil** (#F2EFEA, `fondo-base`): fondo de la aplicación y relleno de los campos.
- **Marfil relieve** (#F5F2ED, `fondo-relieve`): tarjetas en relieve; casi igual al fondo, como pide el neumorfismo ligero.
- **Marfil hundido** (#EAE5DF, `fondo-hundido`): campo deshabilitado y anexos.
- **Blanco** (#FFFFFF, `fondo-superficie`): tablas y formularios.
- **Tinta** (#1F1B1C, `texto-principal`): texto principal.
- **Gris cálido** (#6B6461, `texto-secundario`): texto secundario, metadatos, rol de conocimiento.
- **Borde sutil** (#D6CEC6, `borde-sutil`): divisiones de tabla, bordes de campos y selectores.

### Estados
- **En trámite** #1F5A8A · **Concluido** #2E6B4A · **Cancelado** #6B6461 · **Sin efecto** #5B4B8A · **Posible duplicado** #9A5B00 · **Rebote** #C2410C · **Confidencial** #6D1F33 · **Error** #B42318.

### Named Rules
**La regla de la arena.** La arena nunca es texto: solo líneas, íconos, indicadores y fondos suaves.

**La regla de una sola voz.** Una sola acción primaria guinda por vista; las demás son secundarias o fantasma.

## Typography

**Display Font:** Unbounded (SemiBold)
**Body Font:** Geist (Regular y Medium)
**Label/Mono Font:** Geist Mono

**Character:** Unbounded, ancha y geométrica, da carácter a títulos y cifras; Geist hace el trabajo de lectura; Geist Mono marca lo que se dicta o se copia (folios, fechas técnicas, encabezados de tabla).

### Hierarchy
- **Display/L** (600, 32 px, −2 %): título de página («Bandeja», título del documento).
- **Título/L** (600, 22 px, −1 %): títulos de modal y cifras de indicadores secundarios.
- **Título/M** (600, 17 px, −1 %): títulos de tarjeta («Pendientes», «Recorrido»).
- **Título/S** (600, 14 px, −0.5 %): subtítulos de sección dentro de tarjeta («Anexos · 2»).
- **Cuerpo/M** (400, 14 px, 1.5): texto general y valores de campo.
- **Cuerpo/S** (400, 13 px, 1.45): descripciones y metadatos en filas.
- **Etiqueta/M** (500, 14 px): botones y navegación activa.
- **Etiqueta/S** (500, 12 px): etiquetas de campo, estados y roles.
- **Pie** (400, 12 px): notas al pie y contadores.
- **Mono/Folio** (500, 12 px, +2 %): folios.
- **Mono/Dato** (400, 12 px): antigüedad y datos técnicos.
- **Mono/Encabezado** (400, 11 px, +6 %, mayúsculas): encabezados de tabla, migas de pan y origen de cada sección.

## Layout

Lienzo de 1440 × 960 px: barra lateral de 248 px y área principal con márgenes de 32 px. La bandeja combina una fila de cuatro indicadores, un aviso a todo lo ancho y una retícula de dos columnas (tabla principal y columna lateral de 320 px). La ficha usa dos columnas: registro y expediente a la izquierda, recorrido y relaciones a la derecha. Escritorio primero, garantizado de 1280 a 1920 px.

## Elevation & Depth

Profundidad por material, no por capas de sombra genéricas. Cada superficie tiene un papel fijo.

### Shadow Vocabulary
- **Vidrio** (`backdrop-filter: blur(28px)`, `inset 0 1px 0 #FFFFFFB2`, `0 12px 32px -8px #17141F14`): lo que flota — recorrido, barra superior, modales, menús. Requiere color detrás.
- **Vidrio oscuro** (`backdrop-filter: blur(32px)`, `inset 0 1px 0 #FFFFFF24`): elementos sobre la barra lateral guinda.
- **Relieve** (`-6px -6px 16px #FFFFFFE5`, `6px 6px 18px #17141F1A`): tarjetas indicadoras y resúmenes.
- **Hundida** (`inset 2px 2px 6px #17141F17`, `inset -2px -2px 6px #FFFFFFE5`): campos y buscador.
- **Sólida** (`0 2px 8px #17141F0D`): tablas y formularios, lectura intensiva.

### Named Rules
**La regla del material.** Vidrio para lo que flota, relieve para resúmenes, hundido para campos y sólido para tablas y formularios. No se mezclan en una misma superficie.

## Shapes

Esquinas suaves y consistentes: 10 px en controles (botón, campo, elemento de navegación), 20 px en tarjetas y superficies, 6 px en el rol de turno, píldora completa en los estados y 2 px en el indicador de vista activa.

## Components

### Buttons
- **Shape:** esquinas de control (10 px), relleno 10 × 16 px, ícono de 16 px a 8 px del texto.
- **Primario:** guinda con texto blanco. Una sola acción principal por vista.
- **Secundario:** blanco con borde y texto guinda.
- **Fantasma:** sin fondo, texto tinta.
- **Peligro:** rojo de error con texto blanco; solo para cancelar un documento (O-24).

### Estado
Píldora con punto de 6 px y texto Etiqueta/S del color del estado sobre su tinte al 12 %. Variantes: En trámite, Concluido, Cancelado, Sin efecto, Posible duplicado, Rebote, Confidencial, Extemporáneo. Rebote es una detección de C3, no un estado.

### Rol de turno
Etiqueta de 6 px de radio. Responsable: guinda con texto blanco. Apoyo: guinda suave con texto guinda. Conocimiento: borde sutil con texto gris. Un solo responsable por grupo de turno (RI-10).

### Inputs / Fields
- **Style:** etiqueta Etiqueta/S arriba (6 px de separación), caja de 10 px de radio sobre marfil con sombra hundida y borde sutil de 1 px.
- **Focus:** borde guinda de 1.5 px.
- **Error:** borde y texto de ayuda en rojo de error.
- **Disabled:** fondo marfil hundido y texto gris.

### Navigation
Elemento de 40 px de alto en la barra lateral: indicador de 3 × 18 px, ícono de 20 px y texto blanco. Activo: fondo blanco al 12 %, indicador arena y Etiqueta/M. Inactivo: ícono al 75 % y texto Cuerpo/M al 80 %.

### Cards / Containers
Radio de 20 px y relleno de 24 px. El material sigue la regla del material; la tarjeta indicadora destacada usa el degradado guinda con texto blanco.

## Do's and Don'ts

### Do:
- **Do** tomar cada color de `tokens.css`; ningún color escrito fuera de ese archivo.
- **Do** escribir folios en Mono/Folio y los encabezados de tabla en Mono/Encabezado.
- **Do** mostrar en cada sección de la ficha la base de la que viene.
- **Do** mantener foco visible y navegación por teclado en todos los controles.

### Don't:
- **Don't** usar la arena como color de texto.
- **Don't** poner más de una acción primaria guinda por vista.
- **Don't** dibujar notificaciones, actividad reciente ni vencimientos: no tienen operación que los respalde.
- **Don't** cambiar paleta, tipografía, composición ni textos del Figma sin pasar por el revisor.
