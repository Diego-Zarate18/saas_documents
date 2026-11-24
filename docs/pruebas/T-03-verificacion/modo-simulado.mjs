// Criterio 8 de T-03: con el modo por omisión (simulado) la aplicación funciona igual que en T-02c: se entra como
// Marta Flores, carga la bandeja y no aparece el aviso del modo real.
// Uso: Chrome sin interfaz en el puerto 9222 y `npx vite --port 5174`; `BASE=http://localhost:5174 node modo-simulado.mjs`.
import { writeFileSync } from 'node:fs'
import { abrirPestana } from '../T-02b-verificacion/cdp.mjs'

const p = await abrirPestana()
await p.tamano()
await p.entrar('mflores@institucion.gob.mx')
const ruta = await p.js('location.pathname')
const aviso = await p.js(`document.body.innerText.includes('La API real aún no está disponible')`)
await p.hasta(`[...document.querySelectorAll('tr')].some((tr) => /OP-\\d{4}-\\d{4}/.test(tr.innerText))`, 8000)
const pendientes = await p.js(`[...document.querySelectorAll('tr')].filter((tr) => /OP-\\d{4}-\\d{4}/.test(tr.innerText)).length`)
await p.capturar(new URL('../T-03-capturas/modo-simulado-bandeja.png', import.meta.url))
await p.cerrar()

const cumple = ruta !== '/iniciar-sesion' && !aviso
const lineas = [
  '# Modo simulado (por omisión)',
  '',
  `Fecha: ${new Date().toISOString()}`,
  '',
  `Ruta tras entrar como Marta Flores: \`${ruta}\``,
  `Aparece el aviso del modo real: ${aviso ? 'sí' : 'no'}`,
  `Filas en la región «Pendientes»: ${pendientes}`,
  'Captura: `docs/pruebas/T-03-capturas/modo-simulado-bandeja.png`',
  '',
  `Resultado: ${cumple ? 'cumple' : 'NO cumple'}`,
  '',
]
writeFileSync(new URL('modo-simulado.md', import.meta.url), lineas.join('\n'))
console.log(lineas.join('\n'))
