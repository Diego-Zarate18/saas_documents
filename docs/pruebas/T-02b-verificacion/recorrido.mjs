// Criterio 6 de T-02b: recorrido en el navegador con capturas, en una sola carga de la página (los datos
// simulados viven en memoria, D-63): buscar y abrir la ficha; asignar a un asunto nuevo y verlo en V-11 y
// V-11c; resolver un posible duplicado; ver un rebote; crear un actor externo y usarlo al registrar; el
// administrador crea un área y una persona.
// Uso: Chrome sin interfaz en el puerto 9222 y `npm run dev` en BASE (5174 por omisión).
import { writeFileSync } from 'node:fs'
import { abrirPestana, esperar } from './cdp.mjs'
import { AYUDAS } from './dom.mjs'

const CAPTURAS = new URL('../T-02b-capturas/', import.meta.url)
const lineas = []
const anotar = (l) => {
  console.log(l)
  lineas.push(l)
}
const comprobar = (nombre, ok) => anotar(`- ${ok ? '✓' : '✗'} ${nombre}`)

const p = await abrirPestana('/iniciar-sesion')
await p.tamano(1080)
const js = async (codigo) => p.js(`(async () => { ${codigo} })()`)
const libre = `!document.querySelector('[aria-busy="true"]')`
const capturar = async (nombre) => {
  await esperar(450)
  await p.capturar(new URL(`app-recorrido-${nombre}.png`, CAPTURAS))
}
const texto = (selector = 'main') => p.js(`document.querySelector(${JSON.stringify(selector)})?.textContent.replace(/\\s+/g, ' ') ?? ''`)
const dialogo = (titulo) => p.hasta(`document.querySelector('[role="dialog"] h2')?.textContent === ${JSON.stringify(titulo)}`, 5000)
const sinDialogo = () => p.hasta(`!document.querySelector('[role="dialog"]')`, 8000)

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
  await p.hasta(`location.pathname !== '/iniciar-sesion' && !!document.querySelector('main h1') && ${libre}`, 10000)
  anotar(`- Entra ${nombre} (${correo}).`)
}

async function ir(ruta, listo = 'true') {
  await js(`t02a.ir(${JSON.stringify(ruta)})`)
  await p.hasta(`location.pathname + location.search === ${JSON.stringify(ruta)} && !!document.querySelector('main h1') && ${libre} && (${listo})`, 8000)
  await esperar(250)
}

const idPorFolio = (folio) => p.js(`(async () => (await import('/src/api/simulado/datos.ts')).idPorFolio(${JSON.stringify(folio)}))()`)

anotar('# Recorrido T-02b')
anotar('')
anotar(`Fecha: ${new Date().toISOString()} · BASE ${process.env.BASE ?? 'http://localhost:5174'}`)
anotar('')

// 1. Buscar un documento y abrir su ficha (V-06, O-30, O-11).
anotar('## 1. Buscar un documento y abrir su ficha')
await entrar('mflores@institucion.gob.mx', 'Marta Flores (oficialía)')
await ir('/buscar', `!!document.querySelector('main tbody')`)
await js(`t02a.escribir('Texto en la síntesis', 'convenio'); t02a.boton('Buscar')`)
await p.hasta(`document.querySelector('main h2')?.textContent === '1 resultado'`, 5000)
await capturar('01-buscar')
comprobar('V-06 encuentra OP-2026-0097 por la síntesis «convenio»', (await texto()).includes('OP-2026-0097'))
await js(`[...document.querySelectorAll('main tbody a')].find(a => a.textContent === 'OP-2026-0097').click()`)
await p.hasta(`location.pathname.startsWith('/documentos/') && document.querySelector('main h1')?.textContent === 'Propuesta de convenio de colaboración' && ${libre}`, 8000)
await capturar('02-ficha-desde-busqueda')
comprobar('La ficha de OP-2026-0097 se abre desde el resultado', (await texto('main h1')) === 'Propuesta de convenio de colaboración')

// 2. Asignar a un asunto nuevo y verlo en V-11 y V-11c (O-27, O-08, C2, C5, D-62).
anotar('')
anotar('## 2. Asignar a un asunto nuevo y verlo en V-11 y V-11c')
await entrar('rperez@institucion.gob.mx', 'Ing. Raúl Pérez (titular de Compras)')
const id0152 = await idPorFolio('OP-2026-0152')
await ir(`/documentos/${id0152}`, `!!document.querySelector('main header button')`)
await js(`await t02a.menu('Más', 'Asignar a un asunto')`)
await dialogo('Asignar a un asunto')
await js(`[...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.includes('Crea un asunto nuevo')).click()`)
await esperar(200)
await js(`t02a.escribir('Nombre del asunto', 'Papelería 2027', true); t02a.escribir('Descripción', 'Compras de papelería del próximo ejercicio.', true)`)
await capturar('03-v11b-crear-asunto')
await js(`t02a.boton('Crear y asignar', true)`)
await sinDialogo()
await esperar(300)
await capturar('04-ficha-con-asunto')
comprobar('La ficha de OP-2026-0152 muestra el asunto «Papelería 2027»', (await texto()).includes('Papelería 2027'))
const idAsunto = await p.js(`(async () => (await import('/src/api/simulado/datos.ts')).asuntos.find(a => a.nombre === 'Papelería 2027')?.id)()`)
await ir(`/asuntos?id=${idAsunto}`, `!!document.querySelector('main ol')`)
await capturar('05-v11-asunto')
const v11 = await texto()
comprobar('V-11 muestra OP-2026-0152 como documento del asunto', v11.includes('Pertenece al asunto OP-2026-0152'))
comprobar('V-11 ofrece «Asignar documento» y «Sacar» al titular', v11.includes('Asignar documento') && v11.includes('Sacar'))
await entrar('alopez@institucion.gob.mx', 'Lic. Ana López (dirección)')
await ir(`/asuntos?id=${idAsunto}`, `!!document.querySelector('main ol')`)
await capturar('06-v11c-direccion')
const v11c = await texto()
comprobar('V-11c muestra el mismo asunto a Dirección', v11c.includes('Papelería 2027') && v11c.includes('OP-2026-0152'))
comprobar('V-11c no ofrece «Asignar documento» ni «Sacar» (D-62)', !v11c.includes('Asignar documento') && !v11c.includes('Sacar'))

// 3. Ver un rebote en V-12 (C3).
anotar('')
anotar('## 3. Ver un rebote en V-12')
await ir('/rebotes', `!!document.querySelector('main tbody')`)
await js(`[...document.querySelectorAll('main tbody button')].find(b => b.textContent === 'OP-2026-0118').click()`)
await p.hasta(`[...document.querySelectorAll('main h2')].some(h => h.textContent === 'Solicitud de apoyo para evento institucional')`, 5000)
await capturar('07-v12-rebote')
const v12 = await texto()
comprobar('V-12 muestra OP-2026-0118 con la regla «No competencia sin área sugerida»', v12.includes('OP-2026-0118') && v12.includes('No competencia sin área sugerida'))
comprobar('El detalle del rebote muestra su recorrido y «Abrir ficha»', v12.includes('Devolución') && v12.includes('Abrir ficha'))

// 4. Resolver un posible duplicado (V-14, O-26).
anotar('')
anotar('## 4. Resolver un posible duplicado')
await entrar('mflores@institucion.gob.mx', 'Marta Flores (oficialía)')
await ir('/posibles-duplicados', `!!document.querySelector('main ul button')`)
await js(`[...document.querySelectorAll('main ul button')].find(b => b.textContent.startsWith('OP-2026-0141')).click()`)
await p.hasta(`document.querySelector('main').textContent.includes('OP-2026-0140') && ${libre}`, 5000)
await capturar('08-v14-comparar')
comprobar('V-14 compara OP-2026-0141 con su candidato OP-2026-0140', (await texto()).includes('OP-2026-0140'))
await js(`t02a.boton('Son el mismo: cancelar OP-2026-0141')`)
await p.hasta(`![...document.querySelectorAll('main ul button')].some(b => b.textContent.startsWith('OP-2026-0141')) && ${libre}`, 8000)
await capturar('09-v14-resuelto')
comprobar('OP-2026-0141 sale de «Por revisar»', !(await texto('main ul')).includes('OP-2026-0141'))
await ir(`/documentos/${await idPorFolio('OP-2026-0141')}`)
comprobar('La ficha de OP-2026-0141 dice «Cancelado»', (await texto('main header')).includes('Cancelado'))

// 5. Crear un actor externo y usarlo al registrar una entrada (V-19, O-35, V-03, RI-06).
anotar('')
anotar('## 5. Crear un actor externo y usarlo al registrar una entrada')
await ir('/actores-externos', `!!document.querySelector('main tbody')`)
await js(`t02a.boton('Nuevo actor')`)
await esperar(200)
await js(`t02a.escribir('Nombre', 'Colegio de Arquitectos de Chiapas'); t02a.radio('Institución'); t02a.escribir('Correo de contacto', 'contacto@cach.org.mx')`)
await capturar('10-v19-nuevo-actor')
await js(`t02a.boton('Guardar')`)
await p.hasta(`[...document.querySelectorAll('main tbody button')].some(b => b.textContent === 'Colegio de Arquitectos de Chiapas') && ${libre}`, 5000)
await capturar('11-v19-actor-creado')
comprobar('V-19 lista al actor nuevo', (await texto('main tbody')).includes('Colegio de Arquitectos de Chiapas'))
await ir('/registrar', `!!document.querySelector('main form')`)
await js(`await t02a.elegir('Tipo de documento', 'Oficio')`)
await js(`t02a.escribir('Número del emisor', 'CACH/0012/2026')`)
await js(`await t02a.elegir('Actor externo', 'Colegio de Arquitectos de Chiapas')`)
await js(`t02a.escribir('Fecha del documento', '2026-11-20'); t02a.escribir('Síntesis', 'Invitación al foro de vivienda sustentable')`)
await capturar('12-v03-actor-del-catalogo')
await js(`t02a.boton('Registrar y asignar folio')`)
await p.hasta(`location.pathname.startsWith('/documentos/') && document.querySelector('main h1')?.textContent === 'Invitación al foro de vivienda sustentable' && ${libre}`, 8000)
await capturar('13-ficha-entrada-registrada')
comprobar('La entrada se registra con el actor nuevo como emisor', (await texto()).includes('Colegio de Arquitectos de Chiapas'))

// 6. El administrador crea un área y una persona (V-17, V-18, O-33, O-34).
anotar('')
anotar('## 6. El administrador crea un área y una persona')
await entrar('lgomez@institucion.gob.mx', 'Mtro. Luis Gómez (administración)')
await ir('/areas', `!!document.querySelector('main tbody')`)
await js(`t02a.boton('Nueva área')`)
await esperar(200)
await js(`t02a.escribir('Siglas', 'PL'); t02a.escribir('Nombre', 'Planeación')`)
await js(`await t02a.elegir('Depende de', 'Dirección General')`)
await capturar('14-v17-nueva-area')
await js(`t02a.boton('Guardar')`)
await p.hasta(`[...document.querySelectorAll('main tbody button')].some(b => b.textContent === 'PL') && ${libre}`, 5000)
await capturar('15-v17-area-creada')
comprobar('V-17 lista el área PL · Planeación', (await texto('main tbody')).includes('Planeación'))
await ir('/personas', `!!document.querySelector('main tbody')`)
await js(`t02a.escribir('Nombre completo', 'Mariana Solís Aguilar'); t02a.escribir('Correo', 'msolis@institucion.gob.mx')`)
await js(`await t02a.elegir('Área de adscripción', 'Planeación')`)
await js(`t02a.radio('PE')`)
await capturar('16-v18-nueva-persona')
await js(`t02a.boton('Crear persona')`)
await p.hasta(`[...document.querySelectorAll('main tbody button')].some(b => b.textContent === 'Mariana Solís Aguilar') && ${libre}`, 5000)
await capturar('17-v18-persona-creada')
comprobar('V-18 lista a Mariana Solís Aguilar en Planeación', (await texto('main tbody')).includes('Mariana Solís Aguilar'))
await ir('/organizacion', `!!document.querySelector('main ul')`)
comprobar('V-16 muestra Planeación con su persona adscrita', (await texto()).includes('Planeación'))

const total = lineas.filter((l) => l.startsWith('- ✓') || l.startsWith('- ✗')).length
const bien = lineas.filter((l) => l.startsWith('- ✓')).length
anotar('')
anotar(`Resultado: ${bien} de ${total} comprobaciones.`)
writeFileSync(new URL('./recorrido-resultado.md', import.meta.url), lineas.join('\n') + '\n')
await p.cerrar()
process.exit(bien === total ? 0 : 1)
