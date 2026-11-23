// Parte C.3: contraste de los límites de los controles y del anillo de foco (WCAG 1.4.11, ≥ 3:1)
// contra cada fondo donde aparecen. Los colores salen de frontend/src/estilos/tokens.css.
// El contraste del texto (≥ 4.5:1) lo mide accesslint (regla color-contrast) en cada vista.
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../../../frontend/src/estilos/tokens.css', import.meta.url), 'utf8')
const token = (nombre) => {
  const valor = css.match(new RegExp(`--${nombre}:\\s*([^;]+);`))?.[1].trim()
  const ref = valor?.match(/^var\(--([\w-]+)\)$/)
  return ref ? token(ref[1]) : valor
}
const luminancia = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contraste = (a, b) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

const casos = [
  ['Borde de campo (Campo, Selector, radio, segmentado, instrucción)', 'borde-campo', ['fondo-base', 'fondo-relieve', 'fondo-hundido', 'fondo-superficie', 'fondo-marca-suave']],
  ['Borde sutil (antes, solo referencia)', 'borde-sutil', ['fondo-base', 'fondo-superficie']],
  ['Foco: anillo guinda (con separación blanca)', 'borde-marca', ['fondo-superficie', 'fondo-base', 'fondo-relieve', 'fondo-hundido']],
  ['Foco sobre la barra lateral: anillo arena', 'fondo-detalle', ['fondo-marca-profundo', 'fondo-marca']],
  ['Borde de foco de los campos (guinda)', 'borde-marca', ['fondo-base']],
  ['Spinner y texto del botón primario', 'texto-sobre-marca', ['fondo-marca']],
]
console.log('| Elemento | Color | Fondo | Contraste | ≥ 3:1 |\n| --- | --- | --- | --- | --- |')
for (const [nombre, color, fondos] of casos)
  for (const f of fondos) {
    const c = contraste(token(color), token(f))
    console.log(`| ${nombre} | \`--${color}\` ${token(color)} | \`--${f}\` ${token(f)} | ${c.toFixed(2)}:1 | ${c >= 3 ? 'sí' : 'no'} |`)
  }
