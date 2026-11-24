// T-02c Parte C: resume la semilla del simulador en Markdown para el inventario del contrato.
// Uso (Node 24, que quita los tipos de TypeScript): `node semilla.mjs > semilla.md` desde esta carpeta.
const db = await import('../../../frontend/src/api/simulado/datos.ts')

const area = (id) => db.areas.find((a) => a.id === id)
const persona = (id) => db.personas.find((p) => p.id === id)
const fila = (...c) => `| ${c.map((x) => String(x ?? '—').replaceAll('|', '\\|')).join(' | ')} |`
const salida = []
const p = (...l) => salida.push(...l)

p(`Reloj fijo de la semilla: \`HOY = ${db.HOY}\`. Los UUID son deterministas: \`00000000-0000-4000-8000-<n en 12 dígitos>\`.`, '')

p('### Áreas', '', fila('id', 'siglas', 'nombre', 'depende de', 'titular', 'activa'), '| --- | --- | --- | --- | --- | --- |')
for (const a of db.areas) p(fila(a.id, a.siglas, a.nombre, area(a.id_padre)?.siglas, persona(a.id_titular)?.nombre, a.activa ? 'sí' : 'no'))

p('', '### Personas y usuarios', '', 'Todas entran con cualquier contraseña no vacía. Las marcadas en V-01 se sugieren en el inicio de sesión.', '')
p(fila('id', 'nombre', 'correo', 'rol', 'área', 'activa', 'V-01'), '| --- | --- | --- | --- | --- | --- | --- |')
for (const x of db.personas)
  p(fila(x.id, x.nombre, x.correo, x.rol, area(x.id_area)?.siglas, x.activa ? 'sí' : 'no', db.usuariosDePrueba.includes(x.correo) ? 'sí' : ''))

p('', '### Actores externos', '', fila('id', 'nombre', 'tipo', 'activo'), '| --- | --- | --- | --- |')
for (const a of db.actores) p(fila(a.id, a.nombre, a.tipo, a.activo ? 'sí' : 'no'))

p('', '### Documentos recibidos', '', 'Responsable y pendientes se calculan de los movimientos (D-42); aquí van el estado y el último movimiento.', '')
p(fila('id', 'folio', 'tipo', 'estado', 'emisor', 'número', 'canal', 'conf.', 'pos. dup.', 'movs.', 'último movimiento'), '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for (const d of [...db.documentos].sort((a, b) => a.folio.localeCompare(b.folio))) {
  const movs = db.movimientos.filter((m) => m.id_documento === d.id)
  const u = movs.at(-1)
  const ultimo = u ? `${u.tipo} ${area(u.id_area_origen)?.siglas ?? '·'}→${area(u.id_area_destino)?.siglas ?? '·'} (${u.rol})` : ''
  p(fila(d.id, d.folio, d.tipo, d.estado, d.emisor, d.numero_emisor, d.canal, d.confidencial ? 'sí' : '', d.posible_duplicado ? 'sí' : '', movs.length, ultimo))
}

p('', '### Salidas externas', '', fila('id', 'folio', 'área emisora', 'destinatario', 'responde a', 'acuse'), '| --- | --- | --- | --- | --- | --- |')
for (const s of db.salidas)
  p(fila(s.id, s.folio, area(s.id_area_emisora)?.siglas, s.destinatario, db.documentos.find((d) => d.id === s.id_responde_a)?.folio, s.acuse ? s.acuse.recibio : ''))

p('', '### Asuntos', '', fila('id', 'nombre', 'creador', 'documentos'), '| --- | --- | --- | --- |')
for (const a of db.asuntos)
  p(fila(a.id, a.nombre, persona(a.id_creador)?.nombre, db.documentos.filter((d) => d.asuntos.some((x) => x.id === a.id)).map((d) => d.folio).join(', ')))

p('', `Totales: ${db.areas.length} áreas, ${db.personas.length} personas, ${db.actores.length} actores, ${db.documentos.length} documentos, ${db.movimientos.length} movimientos, ${db.salidas.length} salidas, ${db.asuntos.length} asuntos.`)
console.log(salida.join('\n'))
