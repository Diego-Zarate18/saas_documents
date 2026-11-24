// Genera database/*/data/ a partir de la semilla del simulador (frontend/src/api/simulado/datos.ts), para que la
// interfaz y las bases tengan los mismos datos (guía de implementación del backend, Apéndice A).
// Uso, desde la raíz: node database/semilla.mjs   (Node 24 ejecuta el TypeScript sin compilar)
import { writeFileSync } from 'node:fs'
import { actores, areas, asuntos, documentos, movimientos, personas, salidas } from '../frontend/src/api/simulado/datos.ts'

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const escribir = (ruta, datos) => writeFileSync(new URL(ruta, import.meta.url), JSON.stringify(datos, null, 2) + '\n')

const areaPorNombre = new Map(areas.map((a) => [a.nombre, a.id]))
const actorPorNombre = new Map(actores.map((a) => [a.nombre, a.id]))
const personaPorNombre = new Map(personas.map((p) => [p.nombre, p.id]))
const titularDe = new Map(areas.map((a) => [a.id, a.id_titular]))
const registroDe = new Map(movimientos.filter((m) => m.tipo === 'registro').map((m) => [m.id_documento, m]))
const folio = (texto, idDocumento) => {
  const [siglas, anio, consecutivo] = texto.split('-')
  const idArea = areas.find((a) => a.siglas === siglas).id
  return { folio: texto, id_documento: idDocumento, id_area: idArea, anio: Number(anio), consecutivo: Number(consecutivo) }
}

// Destinatarios de salida que en el simulador son texto libre (D-101 pide un actor externo).
const ACTOR_DESTINATARIO = {
  'el OIC': actorPorNombre.get('Órgano Interno de Control'),
  // Sistemas y Administración son áreas internas: el simulador las usa como destinatario de dos salidas de Compras.
  Sistemas: actorPorNombre.get('Proveedor externo'),
  Administración: actorPorNombre.get('Proveedor externo'),
}

// ── PostgreSQL ───────────────────────────────────────────────────────────────

const docsEntrada = documentos.map((d) => {
  // El relleno del simulador marca como externo a «Recursos Humanos»: si el nombre no es de un actor, es del área.
  const interno = d.tipo_emisor === 'area' || !actorPorNombre.has(d.emisor)
  return {
    id_documento: d.id,
    sentido: 'entrada',
    tipo: d.tipo,
    numero_emisor: d.numero_emisor,
    id_area_emisora: interno ? areaPorNombre.get(d.emisor) : null,
    id_actor_emisor: interno ? null : actorPorNombre.get(d.emisor),
    id_actor_destinatario: null,
    fecha_documento: d.fecha_documento,
    sintesis: d.sintesis,
    confidencial: d.confidencial,
    estado: d.estado,
    posible_duplicado: d.posible_duplicado,
    duplicado_de: d.duplicado_de ?? null,
    motivo_cancelacion: d.motivo_cancelacion,
    extemporaneo: d.extemporaneo,
    canal_inicial: d.canal,
    fecha_recepcion_inicial: d.fecha_recepcion,
    canal_segunda: d.segunda_recepcion?.canal ?? null,
    fecha_recepcion_segunda: d.segunda_recepcion?.fecha_recepcion ?? null,
    fecha_recepcion_oficial: d.fecha_oficial,
    id_responde_a: null,
    fecha_registro: d.fecha_recepcion,
  }
})
for (const d of docsEntrada) {
  if (!d.id_area_emisora && !d.id_actor_emisor) throw new Error(`Emisor desconocido en ${d.id_documento}`)
}

const docsSalida = salidas.map((s) => ({
  id_documento: s.id,
  sentido: 'salida',
  tipo: s.tipo,
  numero_emisor: s.numero,
  id_area_emisora: s.id_area_emisora,
  id_actor_emisor: null,
  id_actor_destinatario: actorPorNombre.get(s.destinatario) ?? ACTOR_DESTINATARIO[s.destinatario],
  fecha_documento: s.fecha_hora.slice(0, 10),
  sintesis: s.sintesis,
  confidencial: false,
  estado: 'en_tramite',
  posible_duplicado: false,
  duplicado_de: null,
  motivo_cancelacion: null,
  extemporaneo: false,
  canal_inicial: null,
  fecha_recepcion_inicial: null,
  canal_segunda: null,
  fecha_recepcion_segunda: null,
  fecha_recepcion_oficial: null,
  id_responde_a: s.id_responde_a,
  fecha_registro: s.fecha_hora,
}))
for (const d of docsSalida) if (!d.id_actor_destinatario) throw new Error(`Destinatario desconocido en ${d.id_documento}`)

const folios = [...documentos.map((d) => folio(d.folio, d.id)), ...salidas.map((s) => folio(s.folio, s.id))]

escribir('relational/data/semilla.json', {
  areas: areas.map((a) => ({
    id_area: a.id,
    siglas: a.siglas,
    nombre: a.nombre,
    id_area_padre: a.id_padre,
    id_titular: a.id_titular,
    activa: a.activa,
  })),
  personas: personas.map((p) => ({ id_persona: p.id, nombre: p.nombre, correo: p.correo, id_area: p.id_area, activa: p.activa })),
  usuarios: personas.filter((p) => p.rol).map((p) => ({ id_persona: p.id, rol: p.rol })),
  actores: actores.map((a) => ({ id_actor: a.id, nombre: a.nombre, tipo: a.tipo, correo: a.correo, telefono: a.telefono, activo: a.activo })),
  documentos: [...docsEntrada, ...docsSalida],
  folios,
  movimientos: movimientos.map((m) => ({
    id_movimiento: m.id,
    id_documento: m.id_documento,
    tipo: m.tipo,
    fecha_hora: m.fecha_hora,
    id_grupo_turno: m.id_grupo_turno,
    id_area_origen: m.id_area_origen,
    id_area_destino: m.id_area_destino,
    rol: m.rol,
    instruccion: m.instruccion,
    motivo: m.motivo,
    id_area_sugerida: m.con_area_sugerida ? m.id_area_destino : null,
    forma_conclusion: m.forma_conclusion,
    id_persona: m.id_persona,
    id_titular_al_turnar: m.id_titular_al_turnar,
    id_movimiento_corregido: m.id_corrige,
    fecha_registro: m.fecha_hora,
  })),
  movimiento_origen: movimientos.flatMap((m) => (m.otros_origenes ?? []).map((a) => ({ id_movimiento: m.id, id_area: a }))),
  acuses: salidas
    .filter((s) => s.acuse)
    .map((s) => ({
      id_documento: s.id,
      fecha_hora: s.acuse.fecha_hora,
      recibio: s.acuse.recibio,
      id_persona: titularDe.get(s.id_area_emisora),
      fecha_registro: s.acuse.fecha_hora,
    })),
})

// ── MongoDB ──────────────────────────────────────────────────────────────────

// El validador (D-66) exige el campo obligatorio del tipo; el simulador deja vacíos algunos documentos de relleno.
const datosTipo = (d) => {
  const datos = { ...d.expediente.datos_tipo }
  if (d.tipo === 'requerimiento_auditoria' && !datos.ente_auditor) datos.ente_auditor = d.emisor
  if (d.tipo === 'solicitud_transparencia' && !datos.solicitante) datos.solicitante = d.emisor
  return datos
}

const expedientes = [
  ...documentos.map((d) => {
    const registro = registroDe.get(d.id)
    const notas = d.expediente.notas.map((n) => ({
      id: n.id,
      tipo: n.tipo,
      texto: n.texto,
      id_persona: personaPorNombre.get(n.autor),
      id_area: areaPorNombre.get(n.area),
      fecha_hora: n.fecha_hora,
      ...(n.id_movimiento ? { id_movimiento: n.id_movimiento } : {}),
    }))
    const fechas = [d.fecha_recepcion, ...notas.map((n) => n.fecha_hora)].sort()
    return {
      _id: d.id,
      tipo: d.tipo,
      datos_tipo: datosTipo(d),
      referencias_citadas: [],
      // El simulador no guarda autor ni fecha del anexo: se toman del registro del documento.
      anexos: d.expediente.anexos.map((a) => ({
        id: a.id,
        titulo: a.titulo,
        hojas: a.hojas,
        ubicacion: a.ubicacion,
        id_persona: registro.id_persona,
        fecha_hora: d.fecha_recepcion,
      })),
      notas,
      creado_en: d.fecha_recepcion,
      actualizado_en: fechas.at(-1),
    }
  }),
  ...salidas.map((s) => ({
    _id: s.id,
    tipo: s.tipo,
    datos_tipo: {},
    referencias_citadas: [],
    anexos: [],
    notas: [],
    creado_en: s.fecha_hora,
    actualizado_en: s.fecha_hora,
  })),
]
for (const e of expedientes) for (const n of e.notas) if (!n.id_persona || !n.id_area) throw new Error(`Nota sin autor en ${e._id}`)
escribir('document/data/expedientes.json', expedientes)

// ── Neo4j: lo que solo vive en el grafo (D-24); las réplicas salen de PostgreSQL al cargar ─────────────────

let siguienteId = 700
const pertenencias = documentos.flatMap((d) =>
  d.asuntos.map(({ id }) => {
    const asunto = asuntos.find((a) => a.id === id)
    const fecha = [asunto.fecha, d.fecha_recepcion].sort().at(-1)
    return { id: uuid(siguienteId++), id_documento: d.id, id_asunto: id, id_persona: asunto.id_creador, fecha_hora: fecha }
  }),
)
const referencias = documentos.flatMap((d) =>
  d.relaciones.map((r) => ({
    id: uuid(siguienteId++),
    tipo: r.tipo.toUpperCase(),
    id_origen: d.id,
    id_destino: r.id_documento,
    no_registrado: r.id_documento ? null : { numero: r.referencia, emisor: r.descripcion.trim() },
    id_persona: registroDe.get(d.id).id_persona,
    fecha_hora: d.fecha_recepcion,
  })),
)
escribir('graph/data/grafo.json', {
  asuntos: asuntos.map((a) => ({ id: a.id, nombre: a.nombre, descripcion: a.descripcion, id_persona: a.id_creador, fecha_hora: a.fecha })),
  pertenece_a: pertenencias,
  referencias,
})

console.log(
  `${areas.length} áreas, ${personas.length} personas, ${actores.length} actores, ${docsEntrada.length + docsSalida.length} documentos, ` +
    `${movimientos.length} movimientos, ${expedientes.length} expedientes, ${asuntos.length} asuntos, ${referencias.length} referencias`,
)
