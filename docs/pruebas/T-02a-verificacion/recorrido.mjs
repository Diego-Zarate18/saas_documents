// Criterio 5: recorrido completo en el navegador con los usuarios de prueba y capturas en cada paso:
// registrar → turnar → devolver → atraer → relacionar → salida con acuse → concluir, comprobando la bandeja.
// Todo ocurre en una sola carga de la página: los datos simulados viven en memoria (D-63), así que el
// cambio de usuario se hace con «Cerrar sesión» y el formulario de V-01.
// Uso: Chrome sin interfaz en el puerto 9222 y `npm run dev` en BASE (5174 por omisión).
import { writeFileSync } from 'node:fs'
import { abrirPestana, esperar } from './cdp.mjs'
import { AYUDAS } from './dom.mjs'

const CAPTURAS = new URL('../T-02a-capturas/', import.meta.url)
const lineas = []
const anotar = (l) => {
  console.log(l)
  lineas.push(l)
}
const p = await abrirPestana('/iniciar-sesion')
await p.tamano(1080)
const js = async (codigo) => p.js(`(async () => { ${codigo} })()`)
const capturar = async (nombre) => {
  await esperar(450)
  await p.capturar(new URL(`app-recorrido-${nombre}.png`, CAPTURAS))
}
const libre = `!document.querySelector('[aria-busy="true"]')`

async function entrar(correo, nombre) {
  if (await p.js(`location.pathname !== '/iniciar-sesion'`)) {
    await p.js(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cerrar sesión').click()`)
    await p.hasta(`location.pathname === '/iniciar-sesion' && !!document.querySelector('form')`, 8000)
  } else await p.hasta(`!!document.querySelector('form')`, 8000)
  await p.js(AYUDAS)
  await js(`
    const poner = (l, v) => { const c = [...document.querySelectorAll('label')].find(x => x.textContent === l).control
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(c, v); c.dispatchEvent(new Event('input', { bubbles: true })) }
    poner('Correo', ${JSON.stringify(correo)}); poner('Contraseña', 'prueba')
    ;[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Entrar').click()`)
  await p.hasta(`location.pathname === '/bandeja' && !!document.querySelector('main h1') && ${libre}`, 10000)
  anotar(`- Entra ${nombre} (${correo}).`)
}

/** Folios de la bandeja (con «Ver todos» desplegado) y el área que muestra. */
async function bandeja() {
  await js(`t02a.ir('/bandeja')`)
  await p.hasta(
    `location.pathname === '/bandeja' && (!!document.querySelector('main tbody a') || document.body.textContent.includes('No hay pendientes')) && ${libre}`,
    8000,
  )
  await esperar(200)
  await js(`const v = [...document.querySelectorAll('main button')].find(b => b.textContent.trim().startsWith('Ver todos')); v?.click()`)
  await esperar(200)
  return p.js(`[...document.querySelectorAll('main tbody a')].map(a => a.textContent.trim())`)
}

async function ficha(id) {
  await js(`t02a.ir('/documentos/${id}')`)
  await p.hasta(`location.pathname === '/documentos/${id}' && !!document.querySelector('main h1') && ${libre}`, 8000)
  await esperar(200)
}

const dialogo = (titulo) => p.hasta(`document.querySelector('[role="dialog"] h2')?.textContent === ${JSON.stringify(titulo)}`, 5000)
const sinDialogo = () => p.hasta(`!document.querySelector('[role="dialog"]')`, 8000)
const comprobar = (condicion, texto) => anotar(`  ${condicion ? '✓' : '✗'} ${texto}`)

// 1. Registrar (Oficialía).
anotar('## 1. Registrar (O-01)')
await entrar('mflores@institucion.gob.mx', 'Marta Flores, oficialía')
await js(`t02a.ir('/registrar')`)
await p.hasta(`!!document.querySelector('form [role="combobox"]') && /OP-2026-\\d{4}/.test(document.body.textContent)`, 8000)
const folioPrevisto = await p.js(`document.body.textContent.match(/OP-2026-\\d{4}/)[0]`)
await js(`await t02a.elegir('Tipo de documento', 'Solicitud de material o pago')`)
await js(`
  t02a.escribir('Número del emisor', 'UT/0415/2026')
  t02a.escribir('Actor externo', 'Universidad Tecnológica')
  t02a.escribir('Fecha del documento', '2026-11-20')
  t02a.escribir('Síntesis', 'Solicitud de mantenimiento del laboratorio de redes')
  t02a.escribir('Concepto (opcional)', 'Mantenimiento preventivo de 12 equipos')`)
await capturar('01-registrar')
await js(`t02a.boton('Registrar y asignar folio')`)
if (!(await p.hasta(`location.pathname.startsWith('/documentos/')`, 5000)))
  anotar(`  errores al registrar: ${await p.js(`[...document.querySelectorAll('p')].filter(e => getComputedStyle(e).color === 'rgb(180, 35, 24)').map(e => e.textContent).join(' · ')`)}`)
await p.hasta(`location.pathname.startsWith('/documentos/') && !!document.querySelector('main h1') && ${libre}`, 8000)
await p.hasta(`!!document.querySelector('main nav [aria-current="page"]')`, 5000)
const id = await p.js(`location.pathname.split('/').pop()`)
const folio = await p.js(`document.querySelector('main nav [aria-current="page"]').textContent`)
await capturar('02-ficha-registrada')
comprobar(folio === folioPrevisto, `Folio asignado ${folio}, el mismo que V-03 anunciaba (${folioPrevisto}).`)
comprobar(await p.js(`document.body.textContent.includes('Mantenimiento preventivo de 12 equipos')`), 'La ficha muestra «Datos del tipo» con el concepto.')
let folios = await bandeja()
await capturar('03-bandeja-oficialia')
comprobar(folios.includes(folio), `Bandeja de Oficialía: ${folio} pendiente (${folios.length} pendientes).`)

// 2. Turnar (Oficialía): Compras responsable y Finanzas para conocimiento.
anotar('## 2. Turnar (O-03)')
await ficha(id)
await js(`t02a.boton('Turnar')`)
await dialogo('Turnar documento')
await js(`await t02a.elegir('Área destino 1', 'Compras', true)`)
await js(`t02a.boton('Agregar área', true)`)
await js(`await t02a.elegir('Área destino 2', 'Finanzas', true)`)
await js(`[...document.querySelectorAll('[role="dialog"] fieldset')].find(f => f.textContent.includes('Responsable') && f.querySelector('legend').textContent === 'Rol de Finanzas').querySelector('input[value="conocimiento"]').click()`)
await capturar('04-turnar')
await js(`t02a.boton('Turnar a 2 áreas', true)`)
await sinDialogo()
folios = await bandeja()
comprobar(!folios.includes(folio), `Bandeja de Oficialía: ${folio} ya no está.`)
await entrar('rperez@institucion.gob.mx', 'Ing. Raúl Pérez, titular de Compras')
folios = await bandeja()
await capturar('05-bandeja-compras')
comprobar(folios.includes(folio), `Bandeja de Compras: ${folio} pendiente como responsable.`)

// 3. Devolver (titular de Compras).
anotar('## 3. Devolver (O-22)')
await ficha(id)
await js(`t02a.boton('Devolver')`)
await dialogo('Devolver o returnar')
await js(`t02a.radio('Falta anexo', true); t02a.escribir('Nota para quien lo recibe', 'Falta la cotización firmada del proveedor.', true)`)
await capturar('06-devolver')
await js(`t02a.boton('Devolver a Oficialía de partes', true)`)
await sinDialogo()
folios = await bandeja()
comprobar(!folios.includes(folio), `Bandeja de Compras: ${folio} ya no está.`)
await entrar('mflores@institucion.gob.mx', 'Marta Flores, oficialía')
folios = await bandeja()
comprobar(folios.includes(folio), `Bandeja de Oficialía: ${folio} regresó («Devuelto por Compras · falta anexo»).`)
await capturar('07-bandeja-oficialia-devuelto')

// 4. Atraer (titular de Finanzas, que lo recibió para conocimiento).
anotar('## 4. Atraer (O-23)')
await entrar('ediaz@institucion.gob.mx', 'C.P. Elena Díaz, titular de Finanzas')
folios = await bandeja()
comprobar(!folios.includes(folio), `Bandeja de Finanzas: ${folio} no está (solo conocimiento).`)
await ficha(id)
await js(`t02a.boton('Atraer')`)
await dialogo('Atraer documento')
await js(`t02a.escribir('Justificación (obligatoria)', 'Finanzas valida la suficiencia presupuestal antes del mantenimiento.', true)`)
await capturar('08-atraer')
await js(`t02a.boton('Atraer a Finanzas', true)`)
await sinDialogo()
folios = await bandeja()
await capturar('09-bandeja-finanzas')
comprobar(folios.includes(folio), `Bandeja de Finanzas: ${folio} pendiente como responsable.`)

// 5. Relacionar (titular de Finanzas, desde «Más»).
anotar('## 5. Relacionar (O-07)')
await ficha(id)
await js(`await t02a.menu('Más', 'Relacionar con otro documento')`)
await dialogo('Relacionar documentos')
await js(`t02a.radio('Da seguimiento a', true)`)
await js(`await t02a.buscar('Documento', 'OP-2026-0139', 'OP-2026-0139', true)`)
await capturar('10-relacionar')
await js(`t02a.boton('Relacionar', true)`)
await sinDialogo()
await esperar(300)
await capturar('11-ficha-relacionada')
comprobar(await p.js(`document.querySelector('[aria-labelledby="titulo-relaciones"]').textContent.includes('OP-2026-0139')`), 'Relaciones y asuntos: «Da seguimiento a OP-2026-0139».')

// 6. Salida externa que responde al documento, y su acuse (Oficialía).
anotar('## 6. Salida externa y acuse (O-20, O-21)')
await entrar('mflores@institucion.gob.mx', 'Marta Flores, oficialía')
await js(`t02a.ir('/salidas')`)
await p.hasta(`!!document.querySelector('main h1') && ${libre}`, 8000)
await js(`t02a.boton('Registrar salida')`)
await dialogo('Registrar salida externa')
await js(`await t02a.elegir('Área emisora', 'Finanzas', true)`)
await js(`
  t02a.escribir('Número del documento', 'FI/0312/2026', true)
  t02a.escribir('Destinatario externo', 'Universidad Tecnológica', true)
  t02a.escribir('Síntesis', 'Respuesta: el mantenimiento se programa con la partida 2026.', true)`)
await js(`await t02a.buscar('Responde a (opcional)', '${folio}', '${folio}', true)`)
await capturar('12-registrar-salida')
await js(`t02a.boton('Registrar salida', true)`)
await sinDialogo()
await p.hasta(`document.body.textContent.includes('Registrar acuse')`, 5000)
const salida = await p.js(`document.querySelector('[aria-labelledby="titulo-acuse"] p').textContent`)
await js(`t02a.escribir('Quién recibió', 'Rectoría de la Universidad Tecnológica')`)
await capturar('13-acuse')
await js(`t02a.boton('Guardar acuse')`)
await p.hasta(`document.body.textContent.includes('Acuse guardado.')`, 5000)
comprobar(/^FI-2026-\d{4}$/.test(salida), `Salida ${salida} registrada con su acuse.`)

// 7. Concluir con la salida como respuesta (titular de Finanzas, D-58).
anotar('## 7. Concluir con respuesta (O-05, D-58, D-59)')
await entrar('ediaz@institucion.gob.mx', 'C.P. Elena Díaz, titular de Finanzas')
folios = await bandeja()
const acuses = await p.js(`document.querySelector('[aria-labelledby="titulo-acuses"]').textContent`)
await capturar('14-bandeja-finanzas-acuses')
comprobar(acuses.includes(folio) && acuses.includes(salida), `Tarjeta «Acuses» de Finanzas: ${folio} con ${salida}.`)
await ficha(id)
await js(`t02a.boton('Concluir')`)
await dialogo('Concluir documento')
await js(`await t02a.buscar('Documento de respuesta (obligatorio con esta forma)', '${salida}', '${salida}', true)`)
await capturar('15-concluir')
await js(`t02a.boton('Concluir documento', true)`)
await sinDialogo()
await esperar(300)
await capturar('16-ficha-concluida')
comprobar(await p.js(`document.querySelector('main header').textContent.includes('Concluido')`), 'La ficha muestra «Concluido» y el paso «Conclusión · con documento de respuesta».')
folios = await bandeja()
await capturar('17-bandeja-finanzas-final')
const acusesFinal = await p.js(`document.querySelector('[aria-labelledby="titulo-acuses"]').textContent`)
comprobar(!folios.includes(folio) && !acusesFinal.includes(folio), `Bandeja de Finanzas: ${folio} ya no está, ni en «Acuses».`)
if (folios.includes(folio) || acusesFinal.includes(folio)) anotar(`    bandeja: ${folios.join(', ')} · acuses: ${acusesFinal}`)

await p.cerrar()
writeFileSync(new URL('./recorrido-resultado.md', import.meta.url), `# Recorrido completo (criterio 5)\n\n${lineas.join('\n')}\n`)
