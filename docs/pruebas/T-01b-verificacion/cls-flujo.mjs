// Criterio 3, flujo real sin recargar (las fuentes ya están cargadas desde V-01): CLS de «Entrar» a la
// bandeja con datos, y del clic en un folio a la ficha con datos. Latencia simulada por omisión (450 ms).
import { abrirPestana, esperar } from './cdp.mjs'

const casos = [
  ['OF', 'mflores@institucion.gob.mx', 'OP-2026-0139'],
  ['DI', 'alopez@institucion.gob.mx', null],
  ['TI', 'rperez@institucion.gob.mx', 'OP-2026-0152'],
  ['PE', 'jruiz@institucion.gob.mx', 'OP-2026-0152'],
]
// Suma los layout-shift sin interacción reciente desde que se instala hasta que se lee.
const medir = `window.__cls = 0; window.__n = 0; window.__d = []; window.__o?.disconnect(); window.__o = new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__n++; window.__d.push(e.value.toFixed(4) + ' ← ' + e.sources.map((s) => String(s.node?.className || s.node?.nodeName || '?').slice(0, 30) + ' ' + Math.round(s.previousRect.y) + '→' + Math.round(s.currentRect.y) + ' h' + Math.round(s.previousRect.height) + '→' + Math.round(s.currentRect.height)).join(' | ')) } }); window.__o.observe({ type: 'layout-shift' })`
const hastaContenido = (p) => p.hasta(`!!document.querySelector('[class*="forma"]')`, 3000).then(() => p.hasta(`!document.querySelector('[aria-busy="true"]')`, 6000))

for (const [rol, correo, folio] of casos) {
  const p = await abrirPestana()
  await p.hasta(`document.fonts.status === 'loaded' && !!document.querySelector('form')`)
  for (const [etiqueta, valor] of [['Correo', correo], ['Contraseña', 'prueba']]) {
    await p.js(`[...document.querySelectorAll('label')].find(l => l.textContent === ${JSON.stringify(etiqueta)}).control.focus()`)
    await p.enviar('Input.insertText', { text: valor })
  }
  await p.js(`document.activeElement.blur()`)
  await esperar(600) // hadRecentInput dura 500 ms tras escribir
  await p.js(medir)
  await p.js(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Entrar').click()`)
  const vioEsqueleto = await hastaContenido(p)
  await esperar(800)
  const bandeja = await p.js(`({ cls: window.__cls, n: window.__n, d: window.__d })`)
  let ficha = null
  if (folio) {
    await p.js(medir)
    await p.js(`[...document.querySelectorAll('a')].find(a => a.textContent.trim() === ${JSON.stringify(folio)}).click()`)
    await hastaContenido(p)
    await esperar(800)
    ficha = await p.js(`({ cls: window.__cls, n: window.__n, d: window.__d })`)
  }
  console.log(
    `${rol}: Entrar → bandeja CLS ${bandeja.cls.toFixed(4)} (${bandeja.n} desplazamientos${vioEsqueleto ? '' : ', sin esqueleto visto'})` +
      (ficha ? ` · ${folio} → ficha CLS ${ficha.cls.toFixed(4)} (${ficha.n} desplazamientos)` : ''),
  )
  for (const d of [...bandeja.d, ...(ficha?.d ?? [])]) console.log(`   ${d}`)
  await p.cerrar()
}
