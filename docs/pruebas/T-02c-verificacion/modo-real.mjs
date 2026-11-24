// Criterio 5 de T-02c: con VITE_API_MODO=real la aplicación muestra el mensaje y la consola queda sin errores.
// Uso: Chrome sin interfaz en el puerto 9222 y `VITE_API_MODO=real npx vite --port 5175`; `BASE=http://localhost:5175 node modo-real.mjs`.
import { writeFileSync } from 'node:fs'
import { abrirPestana, esperar } from '../T-02b-verificacion/cdp.mjs'

const BASE = process.env.BASE ?? 'http://localhost:5175'
const p = await abrirPestana('/')
// Se escucha la consola en otra conexión a la misma pestaña y se recarga, para no perder lo del arranque.
const consola = []
const pestana = (await (await fetch('http://127.0.0.1:9222/json/list')).json()).find((x) => x.url.startsWith(BASE))
const oyente = new WebSocket(pestana.webSocketDebuggerUrl)
await new Promise((r) => oyente.addEventListener('open', r))
let n = 1000
const mandar = (method, params = {}) => oyente.send(JSON.stringify({ id: ++n, method, params }))
oyente.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Runtime.exceptionThrown') consola.push(`excepción: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`)
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type))
    consola.push(`${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`)
  if (m.method === 'Log.entryAdded' && ['error', 'warning'].includes(m.params.entry.level)) consola.push(`${m.params.entry.level}: ${m.params.entry.text}`)
})
mandar('Runtime.enable')
mandar('Log.enable')
mandar('Page.reload', { ignoreCache: true })
await esperar(4000)
const texto = await p.js(`document.body.innerText.trim()`)
const rol = await p.js(`document.querySelector('[role="alert"]')?.textContent.trim() ?? null`)
await p.capturar(new URL('../T-02c-capturas/app-modo-real.png', import.meta.url))
oyente.close()
await p.cerrar()

const lineas = [
  '# VITE_API_MODO=real',
  '',
  `Fecha: ${new Date().toISOString()}`,
  '',
  `Texto de la página: «${texto}»`,
  `Alerta: «${rol}»`,
  `Errores o advertencias en consola: ${consola.length === 0 ? 'ninguno' : ''}`,
  ...consola.map((c) => `- ${c}`),
  '',
  `Resultado: ${rol === 'La API real aún no está disponible.' && consola.length === 0 ? 'cumple' : 'NO cumple'}`,
]
writeFileSync(new URL('modo-real.md', import.meta.url), lineas.join('\n'))
console.log(lineas.join('\n'))
