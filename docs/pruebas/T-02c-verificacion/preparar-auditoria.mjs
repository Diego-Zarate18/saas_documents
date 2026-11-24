// Criterio 8 de T-02c: deja abiertas en el Chrome sin interfaz (puerto 9222) dos pestañas con sesión de
// administración, una en V-16 y otra en V-17, para que accesslint (audit_live) las reutilice por su URL.
// La sesión simulada vive en el sessionStorage de cada pestaña; por eso cada una inicia sesión por V-01.
// Uso: `npm run dev -- --port 5174` y `node preparar-auditoria.mjs`.
import { abrirPestana } from '../T-02b-verificacion/cdp.mjs'

for (const [ruta, listo] of [
  ['/organizacion', 'ul[aria-label="Áreas por dependencia"] li'],
  ['/areas', 'tbody tr'],
]) {
  const p = await abrirPestana()
  await p.entrar('lgomez@institucion.gob.mx')
  await p.js(`history.pushState({}, '', '${ruta}'); dispatchEvent(new PopStateEvent('popstate'))`)
  const ok = await p.hasta(`document.querySelectorAll('${listo}').length > 0 && !document.querySelector('[aria-busy="true"]')`, 10000)
  console.log(`${ruta}: ${ok ? 'lista' : 'NO cargó'}`)
}
// Las pestañas quedan abiertas a propósito (sin cerrar).
process.exit(0)
