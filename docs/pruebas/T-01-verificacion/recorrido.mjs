// Criterio 2: cada usuario de prueba entra, ve su menú y su bandeja, abre una ficha y cierra la sesión (npm run dev).
const base = 'http://localhost:5173'
const usuarios = ['mflores', 'alopez', 'rperez', 'ediaz', 'jruiz', 'lgomez']
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
for (const u of usuarios) {
  const t = await (await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(base + '/iniciar-sesion')}`, { method: 'PUT' })).json()
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let n = 0
  const enviar = (method, params = {}) => new Promise((r) => { const id = ++n; const oir = (e) => { const m = JSON.parse(e.data); if (m.id === id) { ws.removeEventListener('message', oir); r(m.result) } }; ws.addEventListener('message', oir); ws.send(JSON.stringify({ id, method, params })) })
  const js = async (expression) => (await enviar('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }))?.result?.value
  await esperar(3000)
  for (const [id, valor] of [['Correo', `${u}@institucion.gob.mx`], ['Contraseña', 'prueba']]) {
    await js(`[...document.querySelectorAll('label')].find(l => l.textContent === ${JSON.stringify(id)}).control.focus()`)
    await enviar('Input.insertText', { text: valor })
  }
  await js(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Entrar').click()`)
  await esperar(1800)
  const inicio = await js(`({ ruta: location.pathname, usuario: document.querySelector('aside [class*=nombre]')?.textContent, menu: [...document.querySelectorAll('nav[aria-label="Menú principal"] a')].map(a => a.textContent).join(', '), h1: document.querySelector('h1')?.textContent, pendientes: document.querySelector('[class*=indicador] [class*=valor]')?.textContent })`)
  let ficha = '—'
  const folio = await js(`document.querySelector('table a')?.textContent ?? null`)
  if (folio) {
    await js(`document.querySelector('table a').click()`)
    await esperar(1500)
    ficha = await js(`folio => 0, document.querySelector('h1')?.textContent + ' · acciones: ' + [...document.querySelector('header').querySelectorAll('button')].map(b => b.textContent).join(', ')`)
    ficha = `${folio} → ${ficha}`
  }
  await js(`[...document.querySelectorAll('aside button')].find(b => b.textContent.trim() === 'Cerrar sesión').click()`)
  await esperar(1200)
  const salida = await js('location.pathname')
  console.log(`${u}: entra en ${inicio.ruta} como ${inicio.usuario}\n  menú: ${inicio.menu}\n  vista: ${inicio.h1}${inicio.pendientes ? ` (pendientes en el área: ${inicio.pendientes})` : ''}\n  ficha: ${ficha}\n  cerrar sesión → ${salida}`)
  ws.close()
  await fetch(`http://127.0.0.1:9222/json/close/${t.id}`)
}
