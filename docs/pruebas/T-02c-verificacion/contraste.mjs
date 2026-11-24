// Criterio 7 de T-02c: contraste del texto secundario (--texto-secundario) sobre el vidrio de dos modales,
// medido con píxeles reales (velo, brillos y desenfoque incluidos). Para cada texto secundario del diálogo se
// captura su caja y se toma como fondo el color más frecuente de la captura; el texto es el token.
// Uso: Chrome sin interfaz en el puerto 9222 y `npm run dev -- --port 5174`; `node contraste.mjs <etiqueta>`.
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { abrirPestana, esperar } from '../T-02b-verificacion/cdp.mjs'
import { AYUDAS } from '../T-02b-verificacion/dom.mjs'

const etiqueta = process.argv[2] ?? 'medicion'
const TEXTO = [0x6b, 0x64, 0x61] // --texto-secundario
const IMPECCABLE = 'C:/Users/brian/.claude/skills/impeccable/scripts/impeccable.cmd'

/** PNG de 8 bits sin entrelazar (lo que entrega Chrome) a una lista de píxeles RGB. */
function pixeles(png) {
  let i = 8
  let ancho = 0
  let canales = 0
  const datos = []
  while (i < png.length) {
    const largo = png.readUInt32BE(i)
    const tipo = png.toString('ascii', i + 4, i + 8)
    const cuerpo = png.subarray(i + 8, i + 8 + largo)
    if (tipo === 'IHDR') {
      ancho = cuerpo.readUInt32BE(0)
      canales = { 2: 3, 6: 4 }[cuerpo[9]]
    } else if (tipo === 'IDAT') datos.push(cuerpo)
    i += 12 + largo
  }
  const crudo = inflateSync(Buffer.concat(datos))
  const fila = ancho * canales
  const salida = []
  let previa = Buffer.alloc(fila)
  for (let y = 0; y * (fila + 1) < crudo.length; y++) {
    const filtro = crudo[y * (fila + 1)]
    const actual = Buffer.from(crudo.subarray(y * (fila + 1) + 1, (y + 1) * (fila + 1)))
    for (let x = 0; x < fila; x++) {
      const a = x >= canales ? actual[x - canales] : 0
      const b = previa[x]
      const c = x >= canales ? previa[x - canales] : 0
      const p = a + b - c
      const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c
      actual[x] = (actual[x] + [0, a, b, (a + b) >> 1, paeth][filtro]) & 255
    }
    for (let x = 0; x < fila; x += canales) salida.push([actual[x], actual[x + 1], actual[x + 2]])
    previa = actual
  }
  return salida
}

const lineal = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminancia = ([r, g, b]) => 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b)
const contraste = (a, b) => {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}
const moda = (lista) => {
  const cuenta = new Map()
  for (const p of lista) cuenta.set(p.join(), (cuenta.get(p.join()) ?? 0) + 1)
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number)
}

const p = await abrirPestana()
await p.entrar('rperez@institucion.gob.mx')
await p.js(AYUDAS)
const dialogo = (titulo) => p.hasta(`document.querySelector('[role="dialog"] h2')?.textContent === ${JSON.stringify(titulo)}`, 8000)
const lineas = [`# Contraste del texto secundario sobre el vidrio de los modales (${etiqueta})`, '', `Fecha: ${new Date().toISOString()}`, '']

async function medir(modal) {
  await esperar(600) // fin de la animación de entrada
  const cajas = await p.js(`[...document.querySelectorAll('[role="dialog"] *')]
    .filter((e) => getComputedStyle(e).color === 'rgb(107, 100, 97)' && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
    .map((e) => { const r = e.getBoundingClientRect(); return { texto: e.textContent.trim().slice(0, 50), x: r.x, y: r.y, width: r.width, height: r.height } })
    .filter((r) => r.width > 0 && r.height > 0)`)
  const filas = []
  for (const c of cajas) {
    const { data } = await p.enviar('Page.captureScreenshot', { format: 'png', clip: { x: c.x, y: c.y, width: c.width, height: c.height, scale: 1 } })
    const fondo = moda(pixeles(Buffer.from(data, 'base64')))
    filas.push({ ...c, fondo, razon: contraste(TEXTO, fondo) })
  }
  const minimo = Math.min(...filas.map((f) => f.razon))
  lineas.push(`## ${modal}`, '', '| Texto | Fondo medido | Contraste (WCAG, token sobre el fondo) |', '| --- | --- | --- |')
  for (const f of filas) lineas.push(`| ${f.texto} | rgb(${f.fondo.join(', ')}) | ${f.razon.toFixed(2)}:1 |`)
  lineas.push('', `Mínimo: **${minimo.toFixed(2)}:1** (${minimo >= 4.5 ? 'cumple' : 'NO cumple'} 4.5:1)`, '')
  // Segunda medición, la que dio 4.47 y 4.49:1 en la T-02b: impeccable compara los píxeles del texto suavizado.
  let hallazgos = []
  try {
    const salida = execSync(`"${IMPECCABLE}" detect --json --cdp 9222 --target "${await p.js('location.href')}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: true })
    hallazgos = JSON.parse(salida).findings ?? JSON.parse(salida)
  } catch (e) {
    try {
      hallazgos = JSON.parse(e.stdout).findings ?? JSON.parse(e.stdout)
    } catch {
      throw new Error(`impeccable no respondió JSON: ${String(e.stderr ?? e).slice(0, 300)}`)
    }
  }
  const pixel = (Array.isArray(hallazgos) ? hallazgos : []).filter((h) => /contrast/i.test(JSON.stringify(h)))
  lineas.push(`impeccable detect (contraste por píxeles): ${pixel.length === 0 ? 'sin hallazgos de contraste' : pixel.map((h) => h.snippet ?? JSON.stringify(h)).join(' · ')}`, '')
  await p.enviar('Page.bringToFront')
  await p.enviar('Emulation.setFocusEmulationEnabled', { enabled: true })
  await p.capturar(new URL(`../T-02c-capturas/contraste-${modal.split(' ')[0]}-${etiqueta}.png`, import.meta.url))
  await p.js(`document.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
  await p.hasta(`!document.querySelector('[role="dialog"]')`, 5000)
}

// Los dos modales donde la T-02b midió 4.47 y 4.49:1.
await p.js(`t02a.ir('/asuntos')`)
await p.hasta(`!!document.querySelector('main ol') && !document.querySelector('[aria-busy="true"]')`, 10000)
await p.js(`t02a.boton('Asignar documento')`)
await dialogo('Asignar documento')
await medir('V-11 «Asignar documento»')

const id = await p.js(`(async () => (await import('/src/api/simulado/datos.ts')).idPorFolio('OP-2026-0139'))()`)
await p.js(`t02a.ir('/documentos/${id}')`)
await p.hasta(`[...document.querySelectorAll('main header button')].some(b => b.textContent.trim() === 'Más')`, 8000)
await p.js(`(async () => { await t02a.menu('Más', 'Asignar a un asunto') })()`)
await dialogo('Asignar a un asunto')
await p.hasta(`document.querySelector('[role="dialog"]').textContent.includes('Ya pertenece')`)
await medir('V-11b «Asignar a un asunto»')

await p.cerrar()
writeFileSync(new URL(`contraste-${etiqueta}.md`, import.meta.url), lineas.join('\n'))
console.log(lineas.join('\n'))
