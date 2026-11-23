// Criterio 6: comprueba que el `aria-hidden-focus` que accesslint marca con un modal abierto es el falso
// positivo documentado en T-01: cada elemento marcado está dentro de #root, que es `inert` (no enfocable ni
// visible para el lector de pantalla), o es una guarda de foco de Radix (span vacío que solo redirige el foco).
import { readFileSync, writeFileSync } from 'node:fs'
import { abrirPestana } from './cdp.mjs'
import { AYUDAS } from './dom.mjs'

const p = await abrirPestana('/iniciar-sesion')
await p.hasta(`!!document.querySelector('form')`, 8000)
await p.js(AYUDAS)
await p.js(`(() => { const poner = (l, v) => { const c = [...document.querySelectorAll('label')].find(x => x.textContent === l).control
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(c, v); c.dispatchEvent(new Event('input', { bubbles: true })) }
  poner('Correo', 'mflores@institucion.gob.mx'); poner('Contraseña', 'prueba')
  ;[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Entrar').click() })()`)
await p.hasta(`location.pathname === '/bandeja' && !document.querySelector('[aria-busy="true"]')`, 10000)
const id = await p.js(`(async () => (await import('/src/api/simulado/datos.ts')).idPorFolio('OP-2026-0139'))()`)
await p.js(`t02a.ir('/documentos/${id}')`)
await p.hasta(`!!document.querySelector('main header button') && !document.querySelector('[aria-busy="true"]')`, 8000)
await p.js(`t02a.boton('Relacionar')`)
await p.hasta(`!!document.querySelector('[role="dialog"]')`)

// Los selectores que accesslint marcó en V-10 con el modal abierto.
const marcados = JSON.parse(readFileSync(new URL('./auditoria/a11y-v10-modal.json', import.meta.url), 'utf8'))
  .violations.filter((v) => v.ruleId === 'aria/aria-hidden-focus')
  .map((v) => v.selector)
const resultado = await p.js(`(() => {
  const raiz = document.getElementById('root')
  const filas = ${JSON.stringify(marcados)}.map((s) => {
    const e = document.querySelector(s)
    const guarda = e?.hasAttribute('data-radix-focus-guard') ?? false
    return { selector: s, existe: !!e, enRootInerte: !!e && raiz.contains(e) && raiz.inert, guardaDeRadix: guarda }
  })
  return { rootInert: raiz.inert, filas }
})()`)
const todos = resultado.filas.every((f) => f.enRootInerte || f.guardaDeRadix)
const texto = [
  `# aria-hidden-focus con el modal abierto (V-10)`,
  ``,
  `- \`#root.inert\`: ${resultado.rootInert}`,
  `- Elementos marcados: ${resultado.filas.length}; dentro de #root inerte: ${resultado.filas.filter((f) => f.enRootInerte).length}; guardas de foco de Radix: ${resultado.filas.filter((f) => f.guardaDeRadix).length}`,
  `- Todos son el falso positivo documentado: ${todos ? 'sí' : 'no'}`,
  ``,
  ...resultado.filas.map((f) => `- \`${f.selector}\` → ${f.enRootInerte ? 'dentro de #root inerte' : f.guardaDeRadix ? 'guarda de foco de Radix' : 'REVISAR'}`),
].join('\n')
console.log(texto)
writeFileSync(new URL('./inerte-resultado.md', import.meta.url), texto + '\n')
await p.cerrar()
