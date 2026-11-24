// Criterios 4 y 5: estilos calculados de cada animación aprobada, sin preferencia y con
// prefers-reduced-motion: reduce emulado por CDP. Los estados :hover y :active se fuerzan con
// CSS.forcePseudoState. Guarda una captura del esqueleto con movimiento reducido.
import { abrirPestana, esperar } from './cdp.mjs'

const CAPTURAS = new URL('../T-01b-capturas/', import.meta.url)

async function medir(reducido) {
  const p = await abrirPestana()
  await p.enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reducido ? 'reduce' : 'no-preference' }] })
  await p.enviar('DOM.enable')
  await p.enviar('CSS.enable')
  const forzar = async (pares) => {
    const { root } = await p.enviar('DOM.getDocument', { depth: -1 })
    for (const [selector, estados] of pares) {
      const { nodeId } = await p.enviar('DOM.querySelector', { nodeId: root.nodeId, selector })
      await p.enviar('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: estados })
    }
  }
  // En este Chrome sin interfaz, Input.dispatch* de CDP no llega a la página: se usan eventos del DOM.
  // El selector de Radix se abre con Enter (teclado) y los diálogos se cierran con Escape en el documento.
  const abrirSelector = (expresion) => p.js(`(() => { const e = ${expresion}; e.focus(); e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })()`)
  const escape = () => p.js(`(document.activeElement ?? document).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
  const estilo = (selector, pseudo, props) =>
    p.js(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return 'no encontrado';
      const c = getComputedStyle(e, ${JSON.stringify(pseudo)}); return ${JSON.stringify(props)}.map(k => k + ': ' + c[k]).join('; ') })()`)
  const r = {}

  // «Entrar» pendiente: el spinner gira (800 ms; con movimiento reducido, 1600 ms).
  await p.hasta(`!!document.querySelector('form')`)
  for (const [etiqueta, valor] of [['Correo', 'mflores@institucion.gob.mx'], ['Contraseña', 'prueba']]) {
    await p.js(`[...document.querySelectorAll('label')].find(l => l.textContent === ${JSON.stringify(etiqueta)}).control.focus()`)
    await p.enviar('Input.insertText', { text: valor })
  }
  await p.js(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Entrar').click()`)
  await p.hasta(`!!document.querySelector('button[aria-busy="true"] svg')`, 2000)
  r['Spinner de «Entrar»'] = await estilo('button[aria-busy="true"] svg', null, ['animationName', 'animationDuration', 'animationIterationCount'])

  // Esqueleto de la bandeja: brillo en bucle (1400 ms); con movimiento reducido, quieto.
  await p.hasta(`!!document.querySelector('main [aria-busy="true"] [class*="forma"]')`, 4000)
  r['Brillo del esqueleto (::after)'] = await estilo('main [class*="forma"]', '::after', ['animationName', 'animationDuration', 'transform'])
  await p.capturar(new URL(`esqueleto-bandeja-${reducido ? 'reducido' : 'normal'}.png`, CAPTURAS))
  await p.hasta(`!document.querySelector('[aria-busy="true"]')`, 6000)
  await esperar(500)
  r['Contenido tras el esqueleto'] = await estilo('main div[class*="contenido"] > *', null, ['animationDuration', 'animationTimingFunction'])

  // Navegación lateral: hover (fondo e ícono) y barra arena de la vista activa.
  // Un solo DOM.getDocument para los tres: volver a pedirlo anula los estados ya forzados.
  await forzar([['nav a:not([aria-current])', ['hover']], ['main header a[class*="boton"]', ['hover', 'active']], ['aside > button', ['hover']]])
  await esperar(400) // las transiciones terminan: se lee el estado final
  r['Navegación (hover): ícono'] = await estilo('nav a:not([aria-current]) svg', null, ['transform', 'transitionDuration'])
  r['Navegación (activa): barra arena'] = await estilo('nav a[aria-current="page"]', '::before', ['transform', 'transitionDuration', 'transitionTimingFunction'])
  // Botón: hover (fondo y sombra) y :active (escala).
  r['Botón (hover y :active)'] = await estilo('main header a[class*="boton"]', null, ['transform', 'transitionProperty', 'transitionDuration'])
  // Fila de la tabla: fondo.
  r['Fila de la tabla'] = await estilo('tbody td', null, ['transitionProperty', 'transitionDuration'])
  // Cerrar sesión (hover): la flecha.
  r['Cerrar sesión (hover): flecha'] = await estilo('aside > button svg', null, ['transform'])

  // Selector abierto: chevron y lista.
  await abrirSelector(`document.querySelector('main [role="combobox"]')`)
  await p.hasta(`!!document.querySelector('[role="listbox"]')`, 2000)
  await esperar(400)
  r['Chevron del selector abierto'] = await estilo('main [role="combobox"][data-state="open"] [class*="flecha"]', null, ['transform', 'transitionDuration'])
  r['Lista del selector'] = await estilo('[role="listbox"]', null, ['animationName', 'animationDuration'])
  await escape()
  await esperar(400)

  // Modal de V-05 y aviso de RI-10.
  await p.js(`[...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'OP-2026-0139').click()`)
  // El molde del esqueleto también tiene un «Turnar» (oculto): se espera a la ficha ya leída.
  await p.hasta(`location.pathname.startsWith('/documentos/') && !document.querySelector('[aria-busy="true"]')`, 4000)
  await p.js(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Turnar').focus()`)
  await p.js(`document.activeElement.click()`)
  await p.hasta(`!!document.querySelector('[role="dialog"]')`, 2000)
  r['Modal: velo'] = await estilo('[class*="velo"]', null, ['animationName', 'animationDuration'])
  r['Modal: panel'] = await estilo('[role="dialog"]', null, ['animationName', 'animationDuration'])
  r['Aviso de RI-10'] = await estilo('[role="dialog"] [role="status"]', null, ['animationName', 'animationDuration'])
  await esperar(400)
  await p.capturar(new URL(`modal-v05-${reducido ? 'reducido' : 'normal'}.png`, CAPTURAS))
  await escape()
  await p.hasta(`!!document.querySelector('[role="dialog"][data-state="closed"]')`, 1000)
  r['Modal: panel al cerrar'] = await estilo('[role="dialog"]', null, ['animationName', 'animationDuration'])
  await p.hasta(`!document.querySelector('[role="dialog"]')`, 2000)
  r['Foco tras cerrar'] = await p.js(`document.activeElement?.textContent?.trim()`)
  await p.cerrar()
  return r
}

const normal = await medir(false)
const reducido = await medir(true)
console.log('| Elemento | Sin preferencia | prefers-reduced-motion: reduce |\n| --- | --- | --- |')
for (const k of Object.keys(normal)) console.log(`| ${k} | ${normal[k]} | ${reducido[k]} |`)
