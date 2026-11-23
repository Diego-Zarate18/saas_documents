// Criterio 6: accesslint (@accesslint/cli, adjunto a la pestaña) e impeccable detect (--cdp) sobre las
// 8 vistas en sus estados (cargando, con datos y con el modal abierto), sin preferencia de movimiento y
// con prefers-reduced-motion: reduce emulado por CDP (la pestaña queda abierta mientras se escanea).
// «Cargando» se toma de un segundo servidor con VITE_API_LATENCIA_MS=15000 (puerto 5175), para que el
// esqueleto dure lo que tarda el escaneo. La sesión simulada se escribe en sessionStorage.
import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const RAPIDO = 'http://localhost:5174'
const LENTO = 'http://localhost:5175'
const IMPECCABLE = 'C:\\Users\\brian\\.claude\\skills\\impeccable\\scripts\\impeccable.cmd'
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const SALIDA = new URL('./auditoria/', import.meta.url)
mkdirSync(SALIDA, { recursive: true })

async function pestana(base, reducido) {
  const t = await (await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(base + '/iniciar-sesion')}`, { method: 'PUT' })).json()
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let n = 0
  const enviar = (method, params = {}) =>
    new Promise((r) => {
      const id = ++n
      const oir = (e) => {
        const m = JSON.parse(e.data)
        if (m.id === id) {
          ws.removeEventListener('message', oir)
          r(m.result)
        }
      }
      ws.addEventListener('message', oir)
      ws.send(JSON.stringify({ id, method, params }))
    })
  const js = async (expression) => (await enviar('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }))?.result?.value
  const hasta = async (expr, ms = 8000) => {
    const fin = Date.now() + ms
    while (Date.now() < fin) {
      if (await js(expr)) return true
      await esperar(50)
    }
    console.error('tiempo agotado:', expr.slice(0, 90))
    return false
  }
  await enviar('Page.enable')
  await enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false })
  await enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reducido ? 'reduce' : 'no-preference' }] })
  await hasta(`document.readyState === 'complete' && !!document.querySelector('form')`, 20000)
  const ir = async (ruta, correo) => {
    if (correo)
      await js(`(async () => { const d = await import('/src/api/simulado/datos.ts'); sessionStorage.setItem('sigedoc.sesion', d.personas.find(p => p.correo === ${JSON.stringify(correo)}).id) })()`)
    const antes = await js('performance.timeOrigin')
    await enviar('Page.navigate', { url: base + ruta })
    await hasta(`performance.timeOrigin !== ${antes} && document.readyState === 'complete'`, 20000)
  }
  const cerrar = async () => {
    ws.close()
    await fetch(`http://127.0.0.1:9222/json/close/${t.id}`)
  }
  return { js, hasta, ir, cerrar, url: () => js('location.href') }
}

const idDe = (p, folio) => p.js(`(async () => (await import('/src/api/simulado/datos.ts')).idPorFolio(${JSON.stringify(folio)}))()`)
const filas = []

function escanear(nombre, url, reducido) {
  const archivo = `${nombre}${reducido ? '-reducido' : ''}`
  let a11y
  try {
    a11y = execSync(`npx -y @accesslint/cli@latest scan "${url}" --attach --port 9222 --format json`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (e) {
    a11y = e.stdout
  }
  writeFileSync(new URL(`a11y-${archivo}.json`, SALIDA), a11y)
  let det
  try {
    det = execSync(`"${IMPECCABLE}" detect --json --cdp 9222 --target "${url}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: true })
  } catch (e) {
    det = e.stdout || JSON.stringify({ error: String(e.stderr).slice(0, 300) })
  }
  writeFileSync(new URL(`impeccable-${archivo}.json`, SALIDA), det)
  let hallazgos
  try {
    const d = JSON.parse(det)
    const lista = Array.isArray(d) ? d : (d.findings ?? [])
    hallazgos = lista.map((f) => `${f.antipattern ?? f.rule ?? f.id}${f.severity ? ` (${f.severity})` : ''}`)
    if (d.error) hallazgos = [`error: ${d.error}`]
  } catch {
    hallazgos = ['sin JSON']
  }
  let resumen = 'sin JSON'
  let detalle = '—'
  try {
    const r = JSON.parse(a11y)
    const impacto = {}
    for (const v of r.violations) impacto[v.impact] = (impacto[v.impact] ?? 0) + 1
    resumen = `${r.ruleCount} reglas · ${r.violations.length} ${JSON.stringify(impacto)}`
    detalle = r.violations.map((v) => `${v.ruleId} (${v.impact}) @ ${v.selector}`).join('<br>') || '—'
  } catch {
    // se deja «sin JSON»
  }
  const fila = `| ${archivo} | ${url.replace(/^http:\/\/localhost:\d+/, '')} | ${resumen} | ${detalle} | ${hallazgos.join(', ') || '—'} |`
  console.log(fila)
  filas.push(fila)
}

const VISTAS = [
  // [bandeja, correo, folio, ficha, botón que abre «Vista en construcción»]
  ['v02', 'mflores@institucion.gob.mx', 'OP-2026-0139', 'v04', 'Más acciones'],
  ['v02b', 'rperez@institucion.gob.mx', 'OP-2026-0152', 'v04b', 'Más'],
  ['v02c', 'jruiz@institucion.gob.mx', 'OP-2026-0152', 'v04e', 'Más'],
]
const ENCABEZADO = '| Vista y estado | Ruta | accesslint | Violaciones | impeccable detect |\n| --- | --- | --- | --- | --- |'
// --solo-v05 repite solo los estados de V-05 (y no reescribe resumen.md).
const soloV05 = process.argv.includes('--solo-v05')
const reducidos = process.argv.includes('--solo-reducido') ? [true] : process.argv.includes('--solo-normal') ? [false] : [false, true]

console.log(ENCABEZADO)
for (const reducido of reducidos) {
  // V-01: el formulario, y «Entrar» pendiente (cargando).
  let p
  if (!soloV05) {
  p = await pestana(RAPIDO, reducido)
  escanear('v01-datos', await p.url(), reducido)
  await p.cerrar()
  p = await pestana(LENTO, reducido)
  await p.js(`(() => { const poner = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (const [l, v] of [['Correo', 'mflores@institucion.gob.mx'], ['Contraseña', 'prueba']]) {
      const c = [...document.querySelectorAll('label')].find(x => x.textContent === l).control
      poner.call(c, v); c.dispatchEvent(new Event('input', { bubbles: true })) } })()`)
  await p.js(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Entrar').click()`)
  await p.hasta(`!!document.querySelector('button[aria-busy="true"]')`)
  escanear('v01-cargando', await p.url(), reducido)
  await p.cerrar()
  }

  for (const [vista, correo, folio, vistaFicha, mas] of soloV05 ? [] : VISTAS) {
    // Cargando: pantalla de sesión, esqueleto de la bandeja y esqueleto de la ficha.
    p = await pestana(LENTO, reducido)
    await p.ir('/bandeja', correo)
    if (vista === 'v02') {
      await p.hasta(`!!document.querySelector('main[aria-busy="true"] > output')`, 5000)
      escanear('sesion-cargando', await p.url(), reducido)
    }
    await p.hasta(`!!document.querySelector('main [aria-busy="true"] [class*="forma"]')`, 25000)
    escanear(`${vista}-cargando`, await p.url(), reducido)
    const id = await idDe(p, folio)
    // Navegación dentro de la aplicación: la sesión ya está resuelta en esta pestaña.
    await p.js(`history.pushState({}, '', '/documentos/${id}'); dispatchEvent(new PopStateEvent('popstate'))`)
    await p.hasta(`location.pathname.startsWith('/documentos/') && !!document.querySelector('main [aria-busy="true"] [class*="forma"]')`, 5000)
    escanear(`${vistaFicha}-cargando`, await p.url(), reducido)
    await p.cerrar()

    // Con datos: bandeja y ficha; modal «Vista en construcción».
    p = await pestana(RAPIDO, reducido)
    await p.ir('/bandeja', correo)
    await p.hasta(`!!document.querySelector('tbody a') && !document.querySelector('[aria-busy="true"]')`)
    await esperar(300)
    escanear(`${vista}-datos`, await p.url(), reducido)
    if (vista === 'v02') {
      // La lista de un selector abierta, con sus opciones (filtro «Tipo»).
      await p.js(`(() => { const e = [...document.querySelectorAll('main [role="combobox"]')].find(c => c.textContent.startsWith('Tipo:')); e.focus(); e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })()`)
      await p.hasta(`!!document.querySelector('[role="listbox"] [role="option"]')`)
      await esperar(300)
      escanear(`${vista}-selector`, await p.url(), reducido)
    }
    await p.ir(`/documentos/${await idDe(p, folio)}`)
    await p.hasta(`!!document.querySelector('main h1') && !document.querySelector('[aria-busy="true"]')`)
    await esperar(300)
    escanear(`${vistaFicha}-datos`, await p.url(), reducido)
    await p.js(`[...document.querySelectorAll('main header button')].find(b => b.textContent.trim() === ${JSON.stringify(mas)}).click()`)
    await p.hasta(`!!document.querySelector('[role="dialog"]')`)
    await esperar(400)
    escanear(`${vistaFicha}-modal`, await p.url(), reducido)
    await p.cerrar()
  }

  // V-05 con datos (modal abierto) y cargando (lista de áreas del selector mientras se leen).
  p = await pestana(RAPIDO, reducido)
  await p.ir(`/documentos/${await idDe(p, 'OP-2026-0139')}`, 'mflores@institucion.gob.mx')
  await p.hasta(`!!document.querySelector('main h1') && !document.querySelector('[aria-busy="true"]')`)
  await p.js(`[...document.querySelectorAll('main header button')].find(b => b.textContent.trim() === 'Turnar').click()`)
  await p.hasta(`!!document.querySelector('[role="dialog"]')`)
  await esperar(400)
  escanear('v05-modal', await p.url(), reducido)
  await p.cerrar()
  p = await pestana(LENTO, reducido)
  await p.ir(`/documentos/${await idDe(p, 'OP-2026-0139')}`, 'mflores@institucion.gob.mx')
  // Ficha ya leída: sin pantalla de sesión ni esqueleto (ningún aria-busy en la página).
  await p.hasta(`!!document.querySelector('main header button') && !document.querySelector('[aria-busy="true"]')`, 40000)
  await p.js(`[...document.querySelectorAll('main header button')].find(b => b.textContent.trim() === 'Turnar').click()`)
  await p.hasta(`!!document.querySelector('[role="dialog"]')`)
  await p.js(`(() => { const e = document.querySelector('[role="dialog"] [role="combobox"]'); e.focus(); e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })()`)
  await p.hasta(`!!document.querySelector('[role="listbox"][aria-busy="true"]')`)
  console.log('lista cargando:', await p.js(`document.querySelector('[role="listbox"]')?.getAttribute('aria-busy')`))
  await esperar(300)
  escanear('v05-cargando', await p.url(), reducido)
  await p.cerrar()
}
if (!soloV05) writeFileSync(new URL('resumen.md', SALIDA), `${ENCABEZADO}\n${filas.join('\n')}\n`)
