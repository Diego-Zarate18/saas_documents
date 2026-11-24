// Criterio 8 de T-03: con VITE_API_MODO=real el aviso muestra el estado de GET /api/salud (por el proxy de Vite).
// Uso: Chrome sin interfaz en el puerto 9222, el backend en 127.0.0.1:8000 y `VITE_API_MODO=real npx vite --port 5175`;
// después `BASE=http://localhost:5175 CASO=<nombre> node salud-interfaz.mjs`, una vez por caso (bases ok, neo4j detenida).
import { appendFileSync } from 'node:fs'
import { abrirPestana } from '../T-02b-verificacion/cdp.mjs'

const CASO = process.env.CASO ?? 'ok'
const p = await abrirPestana('/')
await p.tamano(400)
const listo = await p.hasta(
  `location.protocol === 'http:' && !!document.querySelector('[role="alert"]') && !document.body.innerText.includes('Consultando el estado de la API')`,
  10000,
)
const texto = await p.js(`document.querySelector('[role="alert"]')?.innerText.trim() ?? null`)
const salud = await p.js(`fetch('/api/salud').then(async (r) => r.status + ' ' + (await r.text()))`)
await p.capturar(new URL(`../T-03-capturas/modo-real-${CASO}.png`, import.meta.url))
await p.cerrar()

const lineas = [
  `## Caso «${CASO}» · ${new Date().toISOString()}`,
  '',
  `Consulta terminada: ${listo ? 'sí' : 'no'}`,
  '',
  'Texto del aviso:',
  '',
  '```',
  texto,
  '```',
  '',
  `GET /api/salud por el proxy de Vite: \`${salud}\``,
  '',
  `Captura: \`docs/pruebas/T-03-capturas/modo-real-${CASO}.png\``,
  '',
]
appendFileSync(new URL('salud-interfaz.md', import.meta.url), lineas.join('\n'))
console.log(lineas.join('\n'))
