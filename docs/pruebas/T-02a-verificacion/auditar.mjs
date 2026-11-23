// Criterios 4 y 6: arma en el navegador cada vista, modal y estado de error nuevos de T-02a, los captura
// (T-02a-capturas/app-*.png, para compararlos con figma-*.png) y los escanea con accesslint
// (@accesslint/cli, adjunto a la pestaña) e impeccable detect (--cdp). Cada usuario usa una sola carga
// de página: los datos simulados viven en memoria.
// Uso: Chrome sin interfaz en el puerto 9222 y `npm run dev` en BASE (5174 por omisión).
// SOLO=oficialia (o titular, finanzas) repite solo esa parte y actualiza sus filas de auditoria/resumen.md.
const SOLO = process.env.SOLO
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { abrirPestana, esperar } from './cdp.mjs'
import { AYUDAS } from './dom.mjs'

const IMPECCABLE = 'C:\\Users\\brian\\.claude\\skills\\impeccable\\scripts\\impeccable.cmd'
const SALIDA = new URL('./auditoria/', import.meta.url)
const CAPTURAS = new URL('../T-02a-capturas/', import.meta.url)
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
  await p.hasta(`location.pathname === '/bandeja' && !!document.querySelector('main tbody') && ${libre}`, 10000)
  const js = (codigo) => p.js(`(async () => { ${codigo} })()`)
  const estado = async (nombre) => {
    await esperar(500)
    await p.capturar(new URL(`app-${nombre}.png`, CAPTURAS))
    escanear(nombre, await p.js('location.href'))
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

// ── Oficialía ──────────────────────────────────────────────────────────────
let p
if (!SOLO || SOLO === 'oficialia') {
p = await sesion('mflores@institucion.gob.mx')
await p.js(`t02a.ir('/registrar')`)
await p.hasta(`!!document.querySelector('form [role="combobox"]') && /OP-2026-\\d{4}/.test(document.body.textContent) && ${libre}`, 8000)
await p.estado('v03')
await p.js(`t02a.boton('Registrar y asignar folio')`)
await p.hasta(`!!document.querySelector('[aria-invalid="true"]')`)
await p.estado('v03-errores')
await p.js(`await t02a.elegir('Tipo de documento', 'Requerimiento de auditoría')`)
await p.js(`t02a.escribir('Número del emisor', 'ASE/DAF/0457/2026'); t02a.escribir('Actor externo', 'Auditoría Superior del Estado'); t02a.escribir('Fecha del documento', '2026-11-19'); t02a.escribir('Síntesis', 'Requerimiento de información sobre el ejercicio del gasto 2025'); t02a.escribir('Ente auditor', 'Auditoría Superior del Estado'); t02a.boton('Agregar punto')`)
await p.hasta(`!!document.querySelector('[aria-label="Punto 1"]')`)
await p.js(`t02a.escribir('Punto 1', 'Comprobación de viáticos del segundo semestre'); t02a.boton('Agregar punto')`)
await p.hasta(`!!document.querySelector('[aria-label="Punto 2"]')`)
await p.js(`t02a.escribir('Punto 2', 'Contratos de servicios generales')`)
await p.estado('v03-tipo')
// Duplicado: el mismo número, emisor y año de OP-2026-0139 (Sistemas, área interna).
await p.js(`t02a.ir('/bandeja')`)
await p.hasta(`location.pathname === '/bandeja'`)
await p.js(`t02a.ir('/registrar')`)
await p.hasta(`!!document.querySelector('form [role="combobox"]') && ${libre}`, 8000)
await p.js(`await t02a.elegir('Tipo de documento', 'Oficio'); t02a.escribir('Número del emisor', 'SIS/0231/2026'); t02a.radio('Área interna')`)
await p.hasta(`[...document.querySelectorAll('main [role="combobox"]')].some(c => c.textContent.startsWith('Área interna'))`)
await p.js(`await t02a.elegir('Área interna', 'Sistemas'); t02a.escribir('Fecha del documento', '2026-11-17'); t02a.escribir('Síntesis', 'Requisición de material de cómputo'); t02a.boton('Registrar y asignar folio')`)
await p.hasta(`document.body.textContent.includes('Ya existe este documento')`)
await p.estado('v03-duplicado')
await p.js(`t02a.boton('Segunda recepción')`)
await p.dialogo('Registrar segunda recepción')
await p.js(`t02a.escribir('Fecha y hora de recepción', '2026-11-17T18:02', true)`)
await p.estado('v15c-modal')
await p.cerrarDialogo()

await p.ficha('OP-2026-0139')
await p.hasta(`[...document.querySelectorAll('main header button')].some(x => x.textContent.trim() === 'Más acciones')`)
await p.js(`const b = [...document.querySelectorAll('main header button')].find(x => x.textContent.trim() === 'Más acciones'); b.focus(); b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`)
await p.hasta(`!!document.querySelector('[role="menu"]')`)
await p.estado('v04d-menu')
await p.js(`document.querySelector('[role="menu"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
await p.hasta(`!document.querySelector('[role="menu"]')`)

await p.js(`t02a.boton('Relacionar')`)
await p.dialogo('Relacionar documentos')
await p.js(`t02a.radio('En alcance a', true); t02a.radio('No registrado', true)`)
await p.hasta(`!!document.querySelector('[role="dialog"] input:not([role])')`)
await p.js(`t02a.escribir('Número del documento', 'DA/0412/2026', true); t02a.escribir('Emisor', 'Dirección Académica', true)`)
await p.estado('v10-modal')
// La semilla ya tiene «en alcance a» SIS/0198/2026 de Sistemas: mismo número y emisor, mismo documento (D-33).
await p.js(`t02a.escribir('Número del documento', 'SIS/0198/2026', true); t02a.escribir('Emisor', 'Sistemas', true); t02a.boton('Relacionar', true)`)
await p.hasta(`!!document.querySelector('[role="dialog"] [role="alert"]')`)
await p.estado('v10-error')
await p.cerrarDialogo()

await p.js(`await t02a.menu('Más acciones', 'Cancelar documento')`)
await p.dialogo('Cancelar documento')
await p.js(`t02a.escribir('Motivo (obligatorio)', 'El área emisora retiró la solicitud con el oficio SIS/0240/2026 del 22 nov.', true)`)
await p.estado('v15a-modal')
await p.cerrarDialogo()

await p.js(`await t02a.menu('Más acciones', 'Corregir un movimiento')`)
await p.dialogo('Corregir un movimiento')
await p.js(`await t02a.elegir('Qué se corrige', 'Rol de Finanzas en el turno', true)`)
await p.js(`t02a.radio('Apoyo', true); t02a.escribir('Motivo (obligatorio)', 'Finanzas debía recibirlo como apoyo para validar la suficiencia presupuestal; se capturó como conocimiento.', true)`)
await p.estado('v15b-modal')
await p.cerrarDialogo()

await p.js(`t02a.ir('/salidas')`)
await p.hasta(`location.pathname === '/salidas' && !!document.querySelector('main h1')`)
await p.js(`t02a.boton('Registrar salida')`)
await p.dialogo('Registrar salida externa')
await p.js(`await t02a.elegir('Área emisora', 'Compras', true)`)
await p.js(`t02a.escribir('Número del documento', 'DGA/CO/0213/2026', true); t02a.escribir('Destinatario externo', 'Dell México, S.A. de C.V.', true); t02a.escribir('Síntesis', 'Orden de compra de 12 equipos de cómputo de escritorio para el laboratorio de redes.', true)`)
await p.js(`await t02a.buscar('Responde a (opcional)', 'OP-2026-0139', 'OP-2026-0139', true)`)
await p.estado('v13b-modal')
await p.js(`t02a.boton('Registrar salida', true)`)
await p.hasta(`document.body.textContent.includes('Registrar acuse') && !document.querySelector('[role="dialog"]')`)
await p.js(`t02a.escribir('Quién recibió', 'Juan Hernández Gómez')`)
await p.estado('v13-acuse')
await p.cerrar()
}

// ── Titular de Compras ─────────────────────────────────────────────────────
if (!SOLO || SOLO === 'titular') {
p = await sesion('rperez@institucion.gob.mx')
await p.ficha('OP-2026-0152')
await p.js(`t02a.boton('Devolver')`)
await p.dialogo('Devolver o returnar')
await p.js(`t02a.radio('Falta anexo', true); t02a.escribir('Nota para quien lo recibe', 'La cotización del proveedor no trae firma autógrafa ni la ficha técnica sellada.', true)`)
await p.estado('v07-modal')
await p.js(`t02a.radio('Returnar', true); t02a.radio('No es de nuestra competencia', true)`)
await p.estado('v07b-rebote')
await p.js(`await t02a.elegir('Área sugerida', 'Administración', true)`)
await p.estado('v07b-modal')
await p.cerrarDialogo()
await p.js(`t02a.boton('Concluir')`)
await p.dialogo('Concluir documento')
await p.js(`await t02a.buscar('Documento de respuesta (obligatorio con esta forma)', 'CO-2026-0049', 'CO-2026-0049', true)`)
await p.estado('v09-modal')
await p.js(`t02a.radio('Atención sin oficio', true)`)
await p.js(`const t = [...document.querySelectorAll('[role="dialog"] label')].find(l => l.textContent === 'Evidencia de la atención (obligatoria)').control; t.focus(); t.blur()`)
await p.hasta(`!!document.querySelector('[role="dialog"] textarea[aria-invalid="true"]')`)
await p.estado('v09b-error')
await p.js(`t02a.escribir('Evidencia de la atención (obligatoria)', 'Se entregaron los 12 equipos al laboratorio de redes el 25 nov. Acta de entrega firmada por el jefe de laboratorio.', true)`)
await p.estado('v09b-modal')
await p.cerrarDialogo()
await p.cerrar()
}

// ── Titular de Finanzas ────────────────────────────────────────────────────
if (!SOLO || SOLO === 'finanzas') {
p = await sesion('ediaz@institucion.gob.mx')
await p.ficha('OP-2026-0139')
await p.estado('v04-atraer')
await p.js(`t02a.boton('Atraer')`)
await p.dialogo('Atraer documento')
await p.js(`t02a.escribir('Justificación (obligatoria)', 'El monto supera el techo de la partida 2026 para equipo de cómputo.', true)`)
await p.estado('v08-modal')
await p.cerrarDialogo()
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
