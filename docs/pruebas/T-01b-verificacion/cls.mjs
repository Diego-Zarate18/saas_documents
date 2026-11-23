// Criterio 3: desplazamiento del diseño (CLS) de la carga al contenido, en bandeja y ficha, con la
// latencia simulada por omisión (450 ms). Recarga la vista con la sesión ya abierta y suma los
// layout-shift sin interacción. También guarda la captura del esqueleto de cada vista.
import { abrirPestana, esperar } from './cdp.mjs'

const CAPTURAS = new URL('../T-01b-capturas/', import.meta.url)
const casos = [
  ['bandeja-OF', 'mflores@institucion.gob.mx', '/bandeja'],
  ['bandeja-TI', 'rperez@institucion.gob.mx', '/bandeja'],
  ['bandeja-PE', 'jruiz@institucion.gob.mx', '/bandeja'],
  ['ficha-OF', 'mflores@institucion.gob.mx', 'OP-2026-0139'],
  ['ficha-TI', 'rperez@institucion.gob.mx', 'OP-2026-0152'],
]

for (const [nombre, correo, destino] of casos) {
  const p = await abrirPestana()
  await p.entrar(correo)
  let ruta = destino
  if (!destino.startsWith('/')) {
    ruta = await p.js(`(async () => (await import('/src/api/simulado/datos.ts')).idPorFolio(${JSON.stringify(destino)}))()`)
    ruta = `/documentos/${ruta}`
  }
  // Recarga completa: pantalla de sesión, esqueleto y contenido. Una línea de tiempo registra cuándo
  // terminan de cargar las fuentes y cuándo desaparece el último aria-busy.
  await p.enviar('Page.addScriptToEvaluateOnNewDocument', {
    source: `window.__t = {}; document.fonts.ready.then(() => (window.__t.fuentes = performance.now()));
      new MutationObserver(() => { const b = document.querySelector('[aria-busy="true"]');
        if (b && !window.__t.esqueleto && b.querySelector('[class*="forma"]')) window.__t.esqueleto = performance.now();
        if (!b && window.__t.esqueleto && !window.__t.contenido) window.__t.contenido = performance.now() })
        .observe(document, { subtree: true, childList: true, attributes: true })`,
  })
  const antes = await p.js('performance.timeOrigin')
  await p.enviar('Page.navigate', { url: new URL(ruta, process.env.BASE ?? 'http://localhost:5174').href })
  await p.hasta(`performance.timeOrigin !== ${antes}`, 4000)
  await p.hasta(`!!document.querySelector('main [aria-busy="true"] [class*="forma"]')`, 4000)
  const esqueleto = await p.js(`({ busy: document.querySelectorAll('[aria-busy="true"]').length, status: [...document.querySelectorAll('output')].map(o => o.textContent), formas: document.querySelectorAll('[class*="forma"]').length })`)
  await p.capturar(new URL(`esqueleto-${nombre}.png`, CAPTURAS))
  await p.hasta(`!document.querySelector('[aria-busy="true"]')`, 6000)
  await esperar(1500)
  const cls = await p.js(`new Promise((r) => {
    const turnos = []
    new PerformanceObserver((l) => turnos.push(...l.getEntries())).observe({ type: 'layout-shift', buffered: true })
    setTimeout(() => r({
      cls: turnos.filter((e) => !e.hadRecentInput).reduce((s, e) => s + e.value, 0),
      t: window.__t,
      entradas: turnos.map((e) => ({ valor: +e.value.toFixed(5), ms: Math.round(e.startTime), nodos: e.sources.map((s) => (s.node?.className || s.node?.nodeName || '?').toString().slice(0, 40)) })),
    }), 100)
  })`)
  await p.capturar(new URL(`contenido-${nombre}.png`, CAPTURAS))
  console.log(`${nombre.padEnd(11)} CLS ${cls.cls.toFixed(4)} · esqueleto: aria-busy ${esqueleto.busy}, status ${JSON.stringify(esqueleto.status)}, formas ${esqueleto.formas}`)
  const t = Object.entries(cls.t).map(([k, v]) => `${k} ${Math.round(v)} ms`).join(' · ')
  console.log(`   línea de tiempo: ${t}`)
  for (const e of cls.entradas) console.log(`   layout-shift ${e.valor} a los ${e.ms} ms ← ${e.nodos.join(', ')}`)
  await p.cerrar()
}
