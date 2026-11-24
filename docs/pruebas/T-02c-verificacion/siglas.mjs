// Criterio 2 de T-02c: captura V-16 y V-17 y mide el desplazamiento horizontal de las siglas de cada fila.
// Uso: Chrome sin interfaz en el puerto 9222 y `npm run dev -- --port 5174`; `node siglas.mjs antes|despues`.
import { writeFileSync } from 'node:fs'
import { abrirPestana } from '../T-02b-verificacion/cdp.mjs'

const momento = process.argv[2] ?? 'despues'
const CAPTURAS = new URL('../T-02c-capturas/', import.meta.url)
const lineas = [`# Siglas en V-16 y V-17 (${momento})`, '', `Fecha: ${new Date().toISOString()}`, '']

const p = await abrirPestana()
await p.entrar('lgomez@institucion.gob.mx') // AD: ve V-16 y V-17
for (const [vista, ruta, selector] of [
  ['v16', '/organizacion', 'ul[aria-label="Áreas por dependencia"] li'],
  ['v17', '/areas', 'tbody tr'],
]) {
  await p.js(`history.pushState({}, '', '${ruta}'); dispatchEvent(new PopStateEvent('popstate'))`)
  await p.hasta(`document.querySelectorAll('${selector}').length > 0`, 8000)
  const filas = await p.js(`[...document.querySelectorAll('${selector}')].map((f) => {
    const s = f.querySelector('[class*="siglas"]')
    return { siglas: s.textContent.trim(), x: Math.round(s.getBoundingClientRect().left) }
  })`)
  const xs = new Set(filas.map((f) => f.x))
  lineas.push(`## ${vista.toUpperCase()}`, '', filas.map((f) => `${f.siglas}: ${f.x}px`).join(' · '), '', `Desplazamientos distintos: ${xs.size} → ${xs.size === 1 ? 'columna fija' : 'desalineadas'}`, '')
  await p.capturar(new URL(`app-${vista}-${momento}.png`, CAPTURAS))
}
await p.cerrar()
writeFileSync(new URL(`siglas-${momento}.md`, import.meta.url), lineas.join('\n'))
console.log(lineas.join('\n'))
