// Criterio 7 de T-02b (adaptado de T-02a): arma en el navegador cada vista, modal y estado de error nuevos,
// los captura (T-02b-capturas/app-*.png, para compararlos con figma-*.png) y los escanea con accesslint
// (@accesslint/cli, adjunto a la pestaña) e impeccable detect (--cdp). Cada usuario usa una sola carga
// de página: los datos simulados viven en memoria.
// Uso: Chrome sin interfaz en el puerto 9222 y `npm run dev` en BASE (5174 por omisión).
// SOLO=oficialia (o titular, direccion, administracion) repite solo esa parte y actualiza auditoria/resumen.md.
const SOLO = process.env.SOLO
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { abrirPestana, esperar } from './cdp.mjs'
import { AYUDAS } from './dom.mjs'

const IMPECCABLE = 'C:\\Users\\brian\\.claude\\skills\\impeccable\\scripts\\impeccable.cmd'
const SALIDA = new URL('./auditoria/', import.meta.url)
const CAPTURAS = new URL('../T-02b-capturas/', import.meta.url)
mkdirSync(SALIDA, { recursive: true })
const filas = []
const libre = `!document.querySelector('[aria-busy="true"]')`

function escanear(nombre, url) {
  let a11y
  try {
    a11y = execSync(`npx -y @accesslint/cli@latest scan "${url}" --attach --port 9222 --format json`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (e) {
    a11y = e.stdout
  }
  writeFileSync(new URL(`a11y-${nombre}.json`, SALIDA), a11y)
  let det
  try {
    det = execSync(`"${IMPECCABLE}" detect --json --cdp 9222 --target "${url}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: true })
  } catch (e) {
    det = e.stdout || JSON.stringify({ error: String(e.stderr).slice(0, 300) })
  }
  writeFileSync(new URL(`impeccable-${nombre}.json`, SALIDA), det)
  let hallazgos
  try {
    const d = JSON.parse(det)
    const lista = Array.isArray(d) ? d : (d.findings ?? [])
    hallazgos = lista.map((f) => `${f.antipattern ?? f.rule ?? f.id}${f.severity ? ` (${f.severity})` : ''}`)
    if (d.error) hallazgos = [`error: ${d.error}`]
  } catch {
    hallazgos = ['sin JSON']
  }
  let resumen = 'sin JSON'
  let detalle = '—'
  try {
    const r = JSON.parse(a11y)
    const impacto = {}
    for (const v of r.violations) impacto[v.impact] = (impacto[v.impact] ?? 0) + 1
    resumen = `${r.ruleCount} reglas · ${r.violations.length} ${JSON.stringify(impacto)}`
    detalle = r.violations.map((v) => `${v.ruleId} (${v.impact}) @ ${v.selector}`).join('<br>') || '—'
  } catch {
    // se deja «sin JSON»
  }
  const fila = `| ${nombre} | ${url.replace(/^http:\/\/localhost:\d+/, '')} | ${resumen} | ${detalle} | ${hallazgos.join(', ') || '—'} |`
  console.log(fila)
  filas.push(fila)
}

async function sesion(correo) {
  const p = await abrirPestana('/iniciar-sesion')
  await p.tamano(1080)
  await p.hasta(`!!document.querySelector('form')`, 8000)
  await p.js(AYUDAS)
  await p.js(`(() => { const poner = (l, v) => { const c = [...document.querySelectorAll('label')].find(x => x.textContent === l).control
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(c, v); c.dispatchEvent(new Event('input', { bubbles: true })) }
    poner('Correo', ${JSON.stringify(correo)}); poner('Contraseña', 'prueba')
    ;[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Entrar').click() })()`)
  await p.hasta(`location.pathname !== '/iniciar-sesion' && !!document.querySelector('main h1') && ${libre}`, 10000)
  const js = (codigo) => p.js(`(async () => { ${codigo} })()`)
  const estado = async (nombre) => {
    await esperar(500)
    await p.capturar(new URL(`app-${nombre}.png`, CAPTURAS))
    escanear(nombre, await p.js('location.href'))
    // accesslint se adjunta a la pestaña; sin volver a traerla al frente, Chrome frena sus temporizadores.
    await p.enviar('Page.bringToFront')
    await p.enviar('Emulation.setFocusEmulationEnabled', { enabled: true })
  }
  const ficha = async (folio) => {
    const id = await p.js(`(async () => (await import('/src/api/simulado/datos.ts')).idPorFolio(${JSON.stringify(folio)}))()`)
    await js(`t02a.ir('/documentos/${id}')`)
    await p.hasta(`location.pathname === '/documentos/${id}' && !!document.querySelector('main header button') && ${libre}`, 8000)
  }
  const dialogo = (titulo) => p.hasta(`document.querySelector('[role="dialog"] h2')?.textContent === ${JSON.stringify(titulo)}`, 5000)
  const cerrarDialogo = async () => {
    await p.js(`document.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
    await p.hasta(`!document.querySelector('[role="dialog"]')`, 5000)
  }
  return { ...p, js, estado, ficha, dialogo, cerrarDialogo }
}

console.log('| Estado | Ruta | accesslint | Violaciones | impeccable detect |\n| --- | --- | --- | --- | --- |')

let p
const ir = async (ruta, listo = 'true') => {
  await p.js(`t02a.ir(${JSON.stringify(ruta)})`)
  if (!(await p.hasta(`location.pathname === ${JSON.stringify(ruta.split('?')[0])} && !!document.querySelector('main h1') && ${libre} && (${listo})`, 15000)))
    throw new Error(`no cargó ${ruta}`)
}
const clicEtiqueta = (etiqueta) => p.js(`document.querySelector('[aria-label=${JSON.stringify(etiqueta)}]').click()`)
const salir = (etiqueta) =>
  p.js(`[...document.querySelectorAll('[role="dialog"] label, main label')].find(l => l.textContent === ${JSON.stringify(etiqueta)}).control.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))`)

// ── Oficialía ──────────────────────────────────────────────────────────────
if (!SOLO || SOLO === 'oficialia') {
  p = await sesion('mflores@institucion.gob.mx')
  await ir('/buscar', `!!document.querySelector('main tbody')`)
  await p.estado('v06')
  await p.js(`await t02a.elegir('Tipo:', 'Requerimiento de auditoría')`)
  await p.hasta(`[...document.querySelectorAll('main label')].some(l => l.textContent === 'Ente auditor contiene')`)
  await p.js(`t02a.escribir('Ente auditor contiene', 'interno'); t02a.boton('Buscar')`)
  await p.hasta(`document.querySelector('main').textContent.includes('Campo del tipo') && ${libre}`)
  await p.estado('v06-campo-tipo')
  await p.js(`t02a.boton('Limpiar')`)
  await p.js(`t02a.escribir('Folio', 'OP-2026-0109'); t02a.boton('Buscar')`)
  await p.hasta(`document.querySelector('main').textContent.includes('Contenido confidencial de otra área') && ${libre}`)
  await p.estado('v06-confidencial')

  await ir('/rebotes', `!!document.querySelector('main tbody')`)
  await p.estado('v12')
  await ir('/posibles-duplicados', `document.querySelector('main').textContent.includes('Registrado primero')`)
  await p.estado('v14')
  await ir('/salidas', `!!document.querySelector('main tbody')`)
  await p.estado('v13')
  await p.js(`t02a.boton('Registrar salida')`)
  await p.dialogo('Registrar salida externa')
  await p.js(`await t02a.elegir('Área emisora', 'Compras', true)`)
  await p.js(`await t02a.elegir('Destinatario externo', 'Dell México, S.A. de C.V.', true)`)
  await p.js(`t02a.escribir('Número del documento', 'DGA/CO/0213/2026', true); t02a.escribir('Síntesis', 'Orden de compra de 12 equipos de cómputo.', true)`)
  await p.estado('v13b-destinatario')
  await p.cerrarDialogo()

  await ir('/asuntos', `!!document.querySelector('main ol')`)
  await p.estado('v11-oficialia')
  await ir('/actores-externos', `!!document.querySelector('main tbody')`)
  await p.estado('v19')
  await p.js(`t02a.boton('Nuevo actor')`)
  await p.hasta(`[...document.querySelectorAll('main h2')].some(h => h.textContent === 'Actor nuevo')`)
  await p.estado('v19-nuevo')

  await ir('/registrar', `!!document.querySelector('form [role="combobox"]')`)
  await p.js(`await t02a.elegir('Actor externo', 'Auditoría Superior de la Federación')`)
  await p.estado('v03-actor')

  await p.ficha('OP-2026-0139')
  await p.hasta(`!!document.querySelector('[aria-label="Agregar a Anexos"]')`, 8000)
  await clicEtiqueta('Agregar a Anexos')
  await p.dialogo('Agregar anexo')
  await p.js(`t02a.escribir('Descripción', 'Acta de entrega', true); t02a.escribir('Número de hojas', '0', true)`)
  await salir('Número de hojas')
  await p.hasta(`!!document.querySelector('[role="dialog"] [aria-invalid="true"]')`)
  await p.estado('v04-anexo-error')
  await p.cerrarDialogo()
  await clicEtiqueta('Agregar a Notas')
  await p.dialogo('Agregar nota')
  await p.js(`t02a.escribir('Nota', 'Se recibió la cotización firmada por el proveedor.', true)`)
  await p.estado('v04-nota-modal')
  await p.cerrarDialogo()
  await p.js(`t02a.boton('Relacionar')`)
  await p.dialogo('Relacionar documentos')
  await p.js(`t02a.radio('En alcance a', true); t02a.radio('No registrado', true)`)
  await p.hasta(`[...document.querySelectorAll('[role="dialog"] [role="combobox"]')].some(c => c.textContent.startsWith('Emisor'))`)
  await p.js(`t02a.escribir('Número del documento', 'DA/0412/2026', true)`)
  await p.js(`await t02a.elegir('Emisor', 'Universidad Tecnológica', true)`)
  await p.estado('v10-emisor')
  await p.cerrarDialogo()
  await p.cerrar()
}

// ── Titular de Compras ─────────────────────────────────────────────────────
if (!SOLO || SOLO === 'titular') {
  p = await sesion('rperez@institucion.gob.mx')
  // La ruta cambia antes de que React pinte la vista: se espera un campo propio de V-06, no solo una tabla.
  await ir('/buscar', `!!document.querySelector('main tbody') && [...document.querySelectorAll('main label')].some(l => l.textContent === 'Folio')`)
  await p.js(`t02a.escribir('Folio', 'OP-2026-0097'); t02a.boton('Buscar')`)
  await p.hasta(`document.querySelector('main').textContent.includes('De otra área: solo estado y responsable') && ${libre}`)
  await p.estado('v06-restringida')
  await ir('/asuntos', `!!document.querySelector('main ol')`)
  await p.estado('v11')
  await p.js(`t02a.boton('Asignar documento')`)
  await p.dialogo('Asignar documento')
  await p.js(`await t02a.buscar('Documento', 'OP-2026-0152', 'OP-2026-0152', true)`)
  await p.estado('v11-asignar-documento')
  await p.cerrarDialogo()
  await p.ficha('OP-2026-0139')
  await p.hasta(`[...document.querySelectorAll('main header button')].some(b => b.textContent.trim() === 'Más')`, 8000)
  await p.js(`await t02a.menu('Más', 'Asignar a un asunto')`)
  await p.dialogo('Asignar a un asunto')
  await p.hasta(`document.querySelector('[role="dialog"]').textContent.includes('Ya pertenece')`)
  await p.js(`[...document.querySelectorAll('[role="dialog"] label')].find(l => l.textContent.startsWith('Presupuesto de inversión 2026')).querySelector('input').click()`)
  await p.estado('v11b-modal')
  await p.js(`[...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.includes('Crea un asunto nuevo')).click()`)
  await p.hasta(`[...document.querySelectorAll('[role="dialog"] label')].some(l => l.textContent === 'Nombre del asunto')`)
  await salir('Nombre del asunto')
  await p.hasta(`!!document.querySelector('[role="dialog"] [aria-invalid="true"]')`)
  await p.estado('v11b-crear-error')
  await p.cerrarDialogo()
  await ir('/organizacion', `!!document.querySelector('main ul')`)
  await p.estado('v16')
  await p.cerrar()
}

// ── Dirección ──────────────────────────────────────────────────────────────
if (!SOLO || SOLO === 'direccion') {
  p = await sesion('alopez@institucion.gob.mx')
  await ir('/asuntos', `!!document.querySelector('main ol')`)
  await p.estado('v11c')
  await p.cerrar()
}

// ── Administración ─────────────────────────────────────────────────────────
if (!SOLO || SOLO === 'administracion') {
  p = await sesion('lgomez@institucion.gob.mx')
  await ir('/areas', `!!document.querySelector('main tbody')`)
  await p.estado('v17')
  await p.js(`[...document.querySelectorAll('main tbody button')].find(b => b.textContent === 'JU').click()`)
  await p.hasta(`[...document.querySelectorAll('main h2')].some(h => h.textContent === 'Jurídico')`)
  await p.js(`await t02a.elegir('Depende de', 'Unidad de Transparencia')`)
  await p.js(`t02a.boton('Guardar')`)
  await p.hasta(`!!document.querySelector('main [role="alert"]')`)
  await p.estado('v17-ciclo')
  await p.js(`t02a.boton('Nueva área')`)
  await p.hasta(`[...document.querySelectorAll('main h2')].some(h => h.textContent === 'Área nueva')`)
  await p.estado('v17-nueva')
  await ir('/personas', `!!document.querySelector('main tbody')`)
  await p.js(`t02a.escribir('Nombre completo', 'Mariana Solís Aguilar'); t02a.escribir('Correo', 'jruiz@institucion.gob.mx')`)
  await p.js(`await t02a.elegir('Área de adscripción', 'Compras')`)
  await p.js(`t02a.boton('Crear persona')`)
  await p.hasta(`!!document.querySelector('main input[aria-invalid="true"]')`)
  await p.estado('v18-correo-repetido')
  await p.js(`[...document.querySelectorAll('main tbody button')].find(b => b.textContent === 'Arq. Pedro Mena').click()`)
  await p.hasta(`document.querySelector('main').textContent.includes('Editar persona')`)
  await p.estado('v18-editar')
  await p.cerrar()
}

// Con SOLO, las filas nuevas reemplazan a las del mismo estado y las demás se conservan en su orden.
const archivo = new URL('resumen.md', SALIDA)
const SALTO = String.fromCharCode(10)
const previas = SOLO && existsSync(archivo) ? readFileSync(archivo, 'utf8').split(SALTO).filter((l) => l.startsWith('| v')) : []
const nombre = (fila) => fila.split('|')[1].trim()
const nuevas = new Map(filas.map((f) => [nombre(f), f]))
const todas = [...previas.map((f) => nuevas.get(nombre(f)) ?? f), ...filas.filter((f) => !previas.some((x) => nombre(x) === nombre(f)))]
const encabezado = ['| Estado | Ruta | accesslint | Violaciones | impeccable detect |', '| --- | --- | --- | --- | --- |']
writeFileSync(archivo, [...encabezado, ...todas, ''].join(SALTO))
