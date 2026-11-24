// Abre una pestaña en el Chrome de accesslint, inicia sesión por el formulario de V-01,
// navega dentro de la app (sin recargar) y, si se pide, pulsa un botón. Imprime la URL final.
const [, , correo, ruta, boton] = process.argv
const base = 'http://localhost:5173'
const t = await (await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(base + '/iniciar-sesion')}`, { method: 'PUT' })).json()
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let n = 0
const enviar = (method, params = {}) =>
  new Promise((r) => {
    const id = ++n
    const oir = (e) => { const m = JSON.parse(e.data); if (m.id === id) { ws.removeEventListener('message', oir); if (m.error) console.error(method, JSON.stringify(m.error)); r(m.result) } }
    ws.addEventListener('message', oir)
    ws.send(JSON.stringify({ id, method, params }))
  })
const js = async (expression) => (await enviar('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }))?.result?.value
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
await enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false })
await esperar(3000)
for (const [id, valor] of [['Correo', correo], ['Contraseña', 'prueba']]) {
  await js(`[...document.querySelectorAll('label')].find(l => l.textContent === ${JSON.stringify(id)}).control.focus()`)
  await enviar('Input.insertText', { text: valor })
}
await js(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Entrar').click()`)
await esperar(1500)
if (ruta) {
  // Pulsa el enlace cuyo texto es `ruta` (por ejemplo, un folio de la bandeja).
  await js(`[...document.querySelectorAll('a')].find(a => a.textContent.trim() === ${JSON.stringify(ruta)}).click()`)
  await esperar(1500)
}
if (boton) {
  await js(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(boton)}).click()`)
  await esperar(1000)
}
console.log(await js('location.href'))
ws.close()
