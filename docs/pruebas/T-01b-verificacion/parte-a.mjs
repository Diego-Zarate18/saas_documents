// Criterio 2 (Parte A), comprobación en el navegador: con el filtro «Tipo» en la bandeja de oficialía,
// la fila resaltada y la tarjeta «Recorrido» muestran el mismo documento. Guarda una captura.
import { abrirPestana, esperar } from './cdp.mjs'

const p = await abrirPestana()
await p.entrar('mflores@institucion.gob.mx')
await p.hasta(`!document.querySelector('[aria-busy="true"]') && !!document.querySelector('tbody button[aria-pressed="true"]')`)
const estado = () =>
  p.js(`({ fila: document.querySelector('tbody tr:has(button[aria-pressed="true"]) a')?.textContent,
    recorrido: document.querySelector('section[aria-labelledby="titulo-recorrido"] h2 + span')?.textContent })`)
const elegirTipo = async (tipo) => {
  await p.js(`(() => { const e = [...document.querySelectorAll('main [role="combobox"]')].find(c => c.textContent.startsWith('Tipo:')); e.focus(); e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })()`)
  await p.hasta(`!!document.querySelector('[role="listbox"] [role="option"]')`)
  await p.js(`(() => { const o = [...document.querySelectorAll('[role="option"]')].find(x => x.textContent === ${JSON.stringify(tipo)}); o.focus(); o.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })()`)
  await p.hasta(`!document.querySelector('[role="listbox"]') && !document.querySelector('[aria-busy="true"]')`)
  await esperar(600)
}
const linea = async (paso) => {
  const { fila, recorrido } = await estado()
  console.log(`${paso.padEnd(58)} fila resaltada ${fila} · recorrido ${recorrido} · ${fila === recorrido ? 'coinciden' : 'NO COINCIDEN'}`)
}

await linea('Sin filtro (primera de la lista)')
await p.js(`[...document.querySelectorAll('tbody button')].find(b => b.textContent === 'Requisición de material de cómputo').click()`)
await esperar(800)
await linea('Elige «Requisición de material de cómputo»')
await elegirTipo('Solicitud de material o pago')
await linea('Tipo: Solicitud de material o pago (la elegida sigue)')
await elegirTipo('Solicitud de transparencia')
await linea('Tipo: Solicitud de transparencia (la elegida sale)')
await p.capturar(new URL('../T-01b-capturas/parte-a-filtro-tipo.png', import.meta.url))
await p.cerrar()
