// Utilidades de CDP para la verificación de T-01b: una pestaña del Chrome sin interfaz (puerto 9222)
// a 1440 × 960, con evaluación de JavaScript, capturas e inicio de sesión por el formulario de V-01.
import { writeFileSync } from 'node:fs'

export const BASE = process.env.BASE ?? 'http://localhost:5174'
export const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

export async function abrirPestana(ruta = '/iniciar-sesion') {
  const t = await (await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(BASE + ruta)}`, { method: 'PUT' })).json()
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let n = 0
  const enviar = (method, params = {}) =>
    new Promise((r) => {
      const id = ++n
      const oir = (e) => {
        const m = JSON.parse(e.data)
        if (m.id !== id) return
        ws.removeEventListener('message', oir)
        if (m.error) console.error(method, m.error.message)
        r(m.result)
      }
      ws.addEventListener('message', oir)
      ws.send(JSON.stringify({ id, method, params }))
    })
  const js = async (expression) => {
    const r = await enviar('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r?.exceptionDetails) console.error('JS:', String(r.exceptionDetails.exception?.description).slice(0, 300))
    return r?.result?.value
  }
  const tamano = (alto = 960) => enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: alto, deviceScaleFactor: 1, mobile: false })
  const capturar = async (archivo) => {
    const { data } = await enviar('Page.captureScreenshot', { format: 'png' })
    writeFileSync(archivo, Buffer.from(data, 'base64'))
  }
  /** Espera hasta que la expresión sea verdadera (o se acabe el tiempo). */
  const hasta = async (expresion, ms = 5000) => {
    const fin = Date.now() + ms
    while (Date.now() < fin) {
      if (await js(expresion)) return true
      await esperar(20)
    }
    return false
  }
  const entrar = async (correo) => {
    await hasta(`!!document.querySelector('form')`)
    for (const [etiqueta, valor] of [['Correo', correo], ['Contraseña', 'prueba']]) {
      await js(`[...document.querySelectorAll('label')].find(l => l.textContent === ${JSON.stringify(etiqueta)}).control.focus()`)
      await enviar('Input.insertText', { text: valor })
    }
    await js(`document.activeElement.blur()`)
    await js(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Entrar').click()`)
    await hasta(`location.pathname !== '/iniciar-sesion' && !document.querySelector('[aria-busy="true"]')`, 8000)
  }
  const cerrar = async () => {
    ws.close()
    await fetch(`http://127.0.0.1:9222/json/close/${t.id}`)
  }
  await enviar('Page.enable')
  // Sin foco, la pestaña sin interfaz descarta el teclado y el ratón de CDP (por eso en la T-01 el
  // selector de Radix «no respondía»).
  await enviar('Page.bringToFront')
  await enviar('Emulation.setFocusEmulationEnabled', { enabled: true })
  await tamano()
  return { enviar, js, tamano, capturar, hasta, entrar, cerrar }
}
