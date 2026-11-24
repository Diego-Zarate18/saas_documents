// Criterio 3: captura cada vista a 1440 px con Chrome sin interfaz (CDP), en una sola pestaña
// porque los datos simulados viven en la memoria de la página.
import { writeFileSync } from 'node:fs'
const [, , salida] = process.argv
const base = 'http://localhost:5173'
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const t = await (await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(base + '/iniciar-sesion')}`, { method: 'PUT' })).json()
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let n = 0
const enviar = (method, params = {}) => new Promise((r) => { const id = ++n; const oir = (e) => { const m = JSON.parse(e.data); if (m.id === id) { ws.removeEventListener('message', oir); if (m.error) console.error(method, m.error.message); r(m.result) } }; ws.addEventListener('message', oir); ws.send(JSON.stringify({ id, method, params })) })
const js = async (expression) => { const r = await enviar('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r?.exceptionDetails) console.error('JS:', String(r.exceptionDetails.exception?.description).slice(0, 200)); return r?.result?.value }
const tamano = (height) => enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height, deviceScaleFactor: 1, mobile: false })
async function capturar(nombre, alto) {
  await tamano(alto); await esperar(900)
  const { data } = await enviar('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${salida}/app-${nombre}.png`, Buffer.from(data, 'base64'))
  console.log('captura', nombre, `1440x${alto}`, await js('location.pathname'))
}
const boton = (texto, donde = 'document') => js(`[...${donde}.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(texto)}).click()`)
const enlace = (texto) => js(`[...document.querySelectorAll('a')].find(a => a.textContent.trim() === ${JSON.stringify(texto)}).click()`)
async function entrar(correo) {
  for (const [id, valor] of [['Correo', correo], ['Contraseña', 'prueba']]) {
    await js(`[...document.querySelectorAll('label')].find(l => l.textContent === ${JSON.stringify(id)}).control.focus()`)
    await enviar('Input.insertText', { text: valor })
  }
  await js(`document.activeElement.blur()`)
  await boton('Entrar'); await esperar(2000)
}
const salir = async () => { await boton('Cerrar sesión', "document.querySelector('aside')"); await esperar(1200) }

await tamano(960); await esperar(3000)
await capturar('v01', 960)
await entrar('mflores@institucion.gob.mx')
await capturar('v02', 960)
await enlace('OP-2026-0139'); await esperar(1500)
await capturar('v04', 1120)
await boton('Turnar'); await esperar(800)
await capturar('v05', 1120)
await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await esperar(500)
// El turno de V-05 (tres áreas, como en el Figma) con la misma función que usa el modal.
console.log('turno:', await js(`(async () => {
  const s = await import('/src/api/simulado/servidor.ts'); const d = await import('/src/api/simulado/datos.ts')
  const r = await s.turnar(d.ID_0139, [
    { id_area: d.AREA.compras, rol: 'responsable', instruccion: 'Revisar la cotización firmada y proceder a la compra' },
    { id_area: d.AREA.finanzas, rol: 'apoyo', instruccion: 'Validar suficiencia presupuestal' },
    { id_area: d.AREA.direccion, rol: 'conocimiento', instruccion: 'Para su conocimiento' }])
  return r.movimientos.map(m => m.area_destino + ':' + m.rol).join(', ') })()`))
await salir()
await entrar('rperez@institucion.gob.mx')
await capturar('v02b', 960)
await enlace('OP-2026-0139'); await esperar(1500)
await capturar('v04b', 1120)
await salir()
await entrar('jruiz@institucion.gob.mx')
await capturar('v02c', 960)
await enlace('OP-2026-0139'); await esperar(1500)
await capturar('v04e', 1120)
ws.close(); await fetch(`http://127.0.0.1:9222/json/close/${t.id}`)
