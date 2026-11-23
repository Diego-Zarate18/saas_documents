// Fuente simulada (D-63): responde como lo hará el servicio real, incluida la visibilidad de D-29,
// la regla de pendiente de D-42 y los permisos de D-44. Los datos viven en memoria (datos.ts).

import { borrarSesion, guardarSesion, leerSesionGuardada } from '../../sesion/almacen'
import { validarConclusion, validarDatosTipo, validarGrupoTurno } from '../reglas'
import {
  ErrorDeApi,
  type Acuse,
  type Area,
  type Canal,
  type Catalogos,
  type CodigoError,
  type Conclusion,
  type Correccion,
  type Credenciales,
  type DatosTipo,
  type DestinoRelacion,
  type DestinoTurno,
  type Devolucion,
  type DocumentoEncontrado,
  type DocumentoRegistrado,
  type Ficha,
  type FiltrosBandeja,
  type Listado,
  type MotivoDevolucion,
  type Movimiento,
  type NuevaSalida,
  type NuevoAnexo,
  type NuevoDocumento,
  type PendienteBandeja,
  type Rebote,
  type ResultadoTurno,
  type ResumenDocumento,
  type Rol,
  type Sesion,
  type TipoDocumento,
  type TipoRelacion,
  type UbicacionActual,
  type Uuid,
} from '../tipos'
import * as db from './datos'

// Latencia simulada para que los esqueletos se vean en desarrollo (VITE_API_LATENCIA_MS, 450 ms por
// omisión). En las pruebas es 0; un valor que no sea un número de milisegundos ≥ 0 cuenta como 0.
const latencia = Number(import.meta.env.VITE_API_LATENCIA_MS ?? 450)
const LATENCIA_MS = import.meta.env.MODE === 'test' || !(latencia >= 0) ? 0 : latencia
const esperar = () => new Promise((listo) => setTimeout(listo, LATENCIA_MS))

function falla(codigo: CodigoError, status: number, title: string): never {
  throw new ErrorDeApi({ codigo, status, title })
}

/** Texto obligatorio ya recortado; si falta, VALIDACION con el mensaje dado. */
function exigirTexto(valor: string | null | undefined, mensaje: string): string {
  const texto = valor?.trim()
  if (!texto) falla('VALIDACION', 422, mensaje)
  return texto
}

// ── Contexto del usuario (arquitectura 3.6) ────────────────────────────────

interface ContextoUsuario {
  id_persona: Uuid
  rol: Rol
  id_area: Uuid | null
  areas_visibles: Uuid[]
  ve_recorrido_completo: boolean
}

function contexto(): ContextoUsuario {
  const id = leerSesionGuardada()
  const persona = db.personas.find((p) => p.id === id)
  if (!persona?.rol) falla('NO_AUTENTICADO', 401, 'Inicia sesión para continuar.')
  const todo = persona.rol === 'OF' || persona.rol === 'DI'
  return {
    id_persona: persona.id,
    rol: persona.rol,
    id_area: persona.id_area,
    areas_visibles: todo ? db.areas.map((a) => a.id) : persona.id_area ? [persona.id_area] : [],
    ve_recorrido_completo: todo,
  }
}

function exigirRol(ctx: ContextoUsuario, roles: Rol[]) {
  if (!roles.includes(ctx.rol)) falla('SIN_PERMISO', 403, 'Tu rol no permite esta operación.')
}

// ── Utilidades sobre la semilla ────────────────────────────────────────────

const areaDe = (id: Uuid | null) => db.areas.find((a) => a.id === id)
const nombreArea = (id: Uuid | null) => (id ? (areaDe(id)?.nombre ?? '') : null)
const personaDe = (id: Uuid | null) => db.personas.find((p) => p.id === id)
const movimientosDe = (idDoc: Uuid) => db.movimientos.filter((m) => m.id_documento === idDoc)

function documentoDe(id: Uuid) {
  const doc = db.documentos.find((d) => d.id === id)
  if (!doc) falla('NO_ENCONTRADO', 404, 'El documento no existe.')
  return doc
}

function exigirEnTramite(doc: db.DocumentoSemilla) {
  if (doc.estado !== 'en_tramite') falla('ESTADO_INVALIDO', 409, 'El documento ya no está en trámite.')
}

const fechaLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' })
/** Fecha AAAA-MM-DD en America/Mexico_City. */
const diaDe = (iso: string) => fechaLocal.format(new Date(iso))
/** Días naturales entre la fecha y hoy en America/Mexico_City (D-07). */
const diasDesde = (iso: string) => (Date.parse(diaDe(db.HOY)) - Date.parse(diaDe(iso))) / 86_400_000

const MOTIVO: Record<MotivoDevolucion, string> = {
  falta_informacion: 'falta información',
  falta_firma: 'falta firma',
  falta_anexo: 'falta anexo',
  corregir_dato: 'corregir un dato',
  no_competencia: 'no es de su competencia',
}

const CANAL: Record<Canal, string> = { papel: 'en ventanilla', correo: 'por correo' }

function descripcion(m: db.MovimientoSemilla): string {
  const corto = (id: Uuid | null) => areaDe(id)?.nombre_corto ?? ''
  if (m.tipo === 'registro') return `Registro ${CANAL[documentoDe(m.id_documento).canal]}`
  if (m.tipo === 'devolucion') return `Devuelto por ${corto(m.id_area_origen)} · ${m.motivo ? MOTIVO[m.motivo] : ''}`
  if (m.tipo === 'atraccion') return `Atraído por ${corto(m.id_area_destino)}`
  return `Turnado por ${corto(m.id_area_origen)}`
}

/**
 * O-25: la bitácora con las correcciones aplicadas. Una corrección no es un paso más: cambia el rol del
 * movimiento al que apunta (el original sigue en la bitácora, intacto, y el recorrido muestra ambos).
 */
function efectivos(idDoc: Uuid): db.MovimientoSemilla[] {
  const todos = movimientosDe(idDoc)
  const rolCorregido = new Map(todos.filter((m) => m.id_corrige).map((m) => [m.id_corrige, m.rol]))
  return todos.filter((m) => m.tipo !== 'correccion').map((m) => ({ ...m, rol: rolCorregido.get(m.id) ?? m.rol }))
}

/**
 * D-42: el movimiento con el que el documento quedó pendiente en el área, o null si no lo está.
 * Pendiente = el área lo recibió como responsable o apoyo y no hay después una salida desde ella
 * ni la conclusión o cancelación del documento. Atraer sale del área anterior (O-23).
 */
function pendienteEn(doc: db.DocumentoSemilla, idArea: Uuid | null): db.MovimientoSemilla | null {
  if (doc.estado !== 'en_tramite' || !idArea) return null
  let llegada: db.MovimientoSemilla | null = null
  for (const m of efectivos(doc.id)) {
    if (m.id_area_destino === idArea && m.rol !== 'conocimiento') llegada = m
    else if (m.id_area_origen === idArea) llegada = null
  }
  return llegada
}

/** Área que hoy tiene el documento como responsable (la primera, si una rama dejó más de una). */
const responsableActual = (doc: db.DocumentoSemilla) =>
  db.areas.find((a) => pendienteEn(doc, a.id)?.rol === 'responsable')

/** Siguiente folio del área en el año (D-21): consecutivo sin huecos entre documentos y salidas. */
function siguienteFolio(idArea: Uuid | null): string {
  const siglas = areaDe(idArea)?.siglas ?? 'OP'
  const prefijo = `${siglas}-${db.HOY.slice(0, 4)}-`
  const usados = [...db.documentos, ...db.salidas]
    .filter((d) => d.folio.startsWith(prefijo))
    .map((d) => Number(d.folio.slice(prefijo.length)))
  return prefijo + String(Math.max(0, ...usados) + 1).padStart(4, '0')
}

/** Inserta un movimiento en la bitácora (AR-03: solo INSERT). */
function mover(
  doc: db.DocumentoSemilla,
  ctx: ContextoUsuario,
  m: Pick<db.MovimientoSemilla, 'tipo' | 'id_area_origen' | 'id_area_destino' | 'rol'> & Partial<db.MovimientoSemilla>,
): db.MovimientoSemilla {
  const nuevo: db.MovimientoSemilla = {
    id: crypto.randomUUID(),
    id_documento: doc.id,
    id_corrige: null,
    id_grupo_turno: null,
    instruccion: null,
    motivo: null,
    forma_conclusion: null,
    id_persona: ctx.id_persona,
    id_titular_al_turnar: areaDe(m.id_area_destino)?.id_titular ?? null,
    fecha_hora: db.HOY,
    ...m,
  }
  db.movimientos.push(nuevo)
  return nuevo
}

function agregarNotaA(doc: db.DocumentoSemilla, ctx: ContextoUsuario, texto: string, tipo: db.DocumentoSemilla['expediente']['notas'][number]['tipo'] = 'general') {
  doc.expediente.notas.push({
    id: crypto.randomUUID(),
    tipo,
    area: nombreArea(ctx.id_area) ?? '',
    autor: personaDe(ctx.id_persona)?.nombre ?? '',
    fecha_hora: db.HOY,
    texto,
  })
}

// ── Visibilidad (D-29) ─────────────────────────────────────────────────────

const involucraArea = (doc: db.DocumentoSemilla, idArea: Uuid | null) =>
  movimientosDe(doc.id).some((m) => m.id_area_destino === idArea || m.id_area_origen === idArea)

/** Lo suyo completo; de otras áreas, solo estado y responsable. Oficialía y dirección ven todo el recorrido. */
const acceso = (doc: db.DocumentoSemilla, ctx: ContextoUsuario) =>
  ctx.ve_recorrido_completo || involucraArea(doc, ctx.id_area) ? 'completo' : 'restringido'

/** Lo confidencial solo lo ven el titular del área involucrada y quien tiene movimiento en el documento. */
function contenidoOculto(doc: db.DocumentoSemilla, ctx: ContextoUsuario): boolean {
  if (!doc.confidencial) return false
  const conMovimiento = movimientosDe(doc.id).some(
    (m) => m.id_persona === ctx.id_persona || m.id_titular_al_turnar === ctx.id_persona,
  )
  const titular = ctx.rol === 'TI' && involucraArea(doc, ctx.id_area)
  return !conMovimiento && !titular
}

/** Escribir en el expediente o relacionar exige ver el contenido del documento (D-29). */
function exigirContenidoVisible(doc: db.DocumentoSemilla, ctx: ContextoUsuario) {
  if (acceso(doc, ctx) === 'restringido' || contenidoOculto(doc, ctx))
    falla('SIN_PERMISO', 403, 'No tienes visibilidad sobre el contenido de este documento.')
}

function aMovimiento(m: db.MovimientoSemilla): Movimiento {
  return {
    id: m.id,
    tipo: m.tipo,
    id_corrige: m.id_corrige,
    id_grupo_turno: m.id_grupo_turno,
    area_origen: nombreArea(m.id_area_origen),
    area_destino: nombreArea(m.id_area_destino) ?? '',
    rol: m.rol,
    instruccion: m.instruccion,
    motivo: m.motivo,
    forma_conclusion: m.forma_conclusion,
    persona: personaDe(m.id_persona)?.nombre ?? '',
    titular_al_turnar: personaDe(m.id_titular_al_turnar)?.nombre ?? null,
    fecha_hora: m.fecha_hora,
  }
}

const listado = <T>(elementos: T[]): Listado<T> => ({ elementos, total: elementos.length })

// ── Sesión: O-36, O-38, O-37 ───────────────────────────────────────────────

function aSesion(ctx: ContextoUsuario): Sesion {
  return {
    id_persona: ctx.id_persona,
    nombre: personaDe(ctx.id_persona)?.nombre ?? '',
    rol: ctx.rol,
    id_area: ctx.id_area,
    nombre_area: nombreArea(ctx.id_area),
  }
}

/** O-36 Iniciar sesión. Mensaje genérico ante credenciales incorrectas. */
export async function iniciarSesion({ correo, contrasena }: Credenciales): Promise<Sesion> {
  await esperar()
  const persona = db.personas.find((p) => p.correo === correo.trim().toLowerCase())
  if (!persona?.rol || !contrasena) falla('NO_AUTENTICADO', 401, 'Correo o contraseña incorrectos.')
  guardarSesion(persona.id)
  return aSesion(contexto())
}

/** O-38 Sesión actual. */
export async function obtenerSesionActual(): Promise<Sesion> {
  await esperar()
  return aSesion(contexto())
}

/** O-37 Cerrar sesión. */
export async function cerrarSesion(): Promise<void> {
  await esperar()
  borrarSesion()
}

// ── Lecturas ───────────────────────────────────────────────────────────────

/** O-31 Catálogos: los siete tipos (D-65) y sus campos propios (D-66). */
export async function obtenerCatalogos(): Promise<Catalogos> {
  await esperar()
  contexto()
  return structuredClone({ tipos_documento: db.tiposDocumento, campos_tipo: db.camposTipo })
}

/** O-32 Estructura organizacional: áreas con su titular. */
export async function obtenerAreas(): Promise<Listado<Area>> {
  await esperar()
  contexto()
  return listado(
    db.areas.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      siglas: a.siglas,
      id_titular: a.id_titular,
      nombre_titular: personaDe(a.id_titular)?.nombre ?? null,
    })),
  )
}

/** O-14 Pendientes por área (bandeja), ordenados por antigüedad. */
export async function obtenerBandeja(filtros: FiltrosBandeja = {}): Promise<Listado<PendienteBandeja>> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'DI', 'TI', 'PE'])
  const idArea = filtros.id_area ?? ctx.id_area
  if (!idArea || !ctx.areas_visibles.includes(idArea)) falla('SIN_PERMISO', 403, 'No puedes ver la bandeja de esa área.')

  const pendientes: PendienteBandeja[] = []
  for (const doc of db.documentos) {
    const llegada = pendienteEn(doc, idArea)
    if (!llegada || llegada.rol === 'conocimiento') continue
    const titular = personaDe(llegada.id_titular_al_turnar)
    pendientes.push({
      id_documento: doc.id,
      folio: doc.folio,
      asunto: doc.asunto,
      tipo: doc.tipo,
      emisor: doc.emisor,
      rol: llegada.rol,
      antiguedad_dias: diasDesde(llegada.fecha_hora),
      titular_al_turnar: titular?.nombre ?? null,
      titular_ya_no_adscrito: titular !== undefined && titular.id_area === null,
      ultimo_movimiento: { tipo: llegada.tipo, descripcion: descripcion(llegada) },
      posible_duplicado: doc.posible_duplicado,
      confidencial: doc.confidencial,
    })
  }
  const filtrados = pendientes
    .filter((p) => !filtros.tipo || p.tipo === filtros.tipo)
    .filter((p) => p.antiguedad_dias >= (filtros.antiguedad_minima ?? 0))
    .sort((a, b) => a.antiguedad_dias - b.antiguedad_dias || b.folio.localeCompare(a.folio))
  const tamano = Math.min(filtros.tamano ?? 100, 100)
  const inicio = ((filtros.pagina ?? 1) - 1) * tamano
  return { elementos: filtrados.slice(inicio, inicio + tamano), total: filtrados.length }
}

/** O-11 Ficha completa, con la visibilidad de D-29. */
export async function obtenerFicha(id: Uuid): Promise<Ficha> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'DI', 'TI', 'PE'])
  const doc = documentoDe(id)
  const nivel = acceso(doc, ctx)
  const oculto = contenidoOculto(doc, ctx)
  const restringido = nivel === 'restringido'

  const ubicacion: UbicacionActual[] = []
  for (const area of db.areas) {
    const llegada = pendienteEn(doc, area.id)
    if (!llegada || llegada.rol === 'conocimiento') continue
    ubicacion.push({
      area: area.nombre,
      rol: llegada.rol,
      desde: llegada.fecha_hora,
      antiguedad_dias: diasDesde(llegada.fecha_hora),
      llegada: descripcion(llegada),
    })
  }

  return structuredClone({
    acceso: nivel,
    contenido_oculto: oculto,
    registro: {
      id: doc.id,
      folio: doc.folio,
      asunto: restringido ? null : doc.asunto,
      tipo: doc.tipo,
      estado: doc.estado,
      confidencial: doc.confidencial,
      posible_duplicado: doc.posible_duplicado,
      extemporaneo: doc.extemporaneo,
      numero_emisor: doc.numero_emisor,
      emisor: doc.emisor,
      tipo_emisor: doc.tipo_emisor,
      fecha_documento: doc.fecha_documento,
      canal: doc.canal,
      fecha_recepcion: doc.fecha_recepcion,
      segunda_recepcion: doc.segunda_recepcion,
      fecha_oficial: doc.fecha_oficial,
      origen_fecha_oficial: doc.origen_fecha_oficial,
      sintesis: restringido || oculto ? null : doc.sintesis,
    },
    ubicacion_actual: ubicacion,
    // El expediente trae los datos del tipo (D-66) cuando el tipo los tiene.
    expediente: restringido || oculto ? null : doc.expediente,
    recorrido: restringido ? null : movimientosDe(doc.id).map(aMovimiento),
    relaciones: restringido || oculto ? null : doc.relaciones,
    asuntos: restringido || oculto ? null : doc.asuntos,
    secciones_no_disponibles: [],
  })
}

/** C1 Recorrido de un documento (vista previa de la bandeja). */
export async function obtenerRecorrido(id: Uuid): Promise<Movimiento[]> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'DI', 'TI', 'PE'])
  const doc = documentoDe(id)
  if (acceso(doc, ctx) === 'restringido') falla('SIN_PERMISO', 403, 'No puedes ver el recorrido de este documento.')
  return movimientosDe(doc.id).map(aMovimiento)
}

/** C3 Rebotes, resumen para oficialía y dirección. */
export async function obtenerRebotes(): Promise<Listado<Rebote>> {
  await esperar()
  exigirRol(contexto(), ['OF', 'DI'])
  return listado(db.rebotes.map((r) => ({ ...r, folio: documentoDe(r.id_documento).folio })))
}

/** O-30 filtrado: posibles duplicados que esperan revisión (O-26). Solo oficialía. */
export async function obtenerPosiblesDuplicados(): Promise<Listado<ResumenDocumento>> {
  await esperar()
  exigirRol(contexto(), ['OF'])
  return listado(
    db.documentos
      .filter((d) => d.posible_duplicado && d.estado === 'en_tramite')
      .map((d) => ({ id: d.id, folio: d.folio, asunto: d.asunto })),
  )
}

/** D-58: salidas acusadas cuyo documento de origen está pendiente en el área como responsable. */
export async function obtenerAcuses(): Promise<Listado<Acuse>> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['TI', 'PE'])
  const acusadas = db.salidas.filter(
    (s) => s.acuse && s.id_responde_a && pendienteEn(documentoDe(s.id_responde_a), ctx.id_area)?.rol === 'responsable',
  )
  return listado(
    acusadas.map((s) => ({
      id_salida: s.id,
      folio_salida: s.folio,
      id_documento: s.id_responde_a ?? '',
      folio_documento: documentoDe(s.id_responde_a ?? '').folio,
      acusado_por: s.acuse?.recibio ?? '',
    })),
  )
}

/** Vista previa del folio de V-03: el que O-01 asignará si nadie registra antes (D-21). */
export async function obtenerFolioSiguiente(): Promise<string> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF'])
  return siguienteFolio(ctx.id_area)
}

/**
 * O-30 reducido a lo que piden los selectores de V-09, V-10 y V-13b: documentos y salidas visibles cuyo
 * folio o asunto contiene el texto. La vista de búsqueda (V-06) es de T-02b.
 */
export async function buscarDocumentos(texto: string): Promise<Listado<DocumentoEncontrado>> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'DI', 'TI', 'PE'])
  const buscado = texto.trim().toLowerCase()
  if (!buscado) return listado([])
  const coincide = (...textos: string[]) => textos.some((t) => t.toLowerCase().includes(buscado))
  const documentos = db.documentos
    .filter((d) => acceso(d, ctx) === 'completo' && !contenidoOculto(d, ctx) && coincide(d.folio, d.asunto))
    .map((d) => ({ id: d.id, folio: d.folio, asunto: d.asunto, fecha: d.fecha_recepcion }))
  const salidas = db.salidas
    .filter((s) => (ctx.ve_recorrido_completo || s.id_area_emisora === ctx.id_area) && coincide(s.folio, s.sintesis))
    .map((s) => ({ id: s.id, folio: s.folio, asunto: s.sintesis, fecha: s.fecha_hora }))
  return listado([...salidas, ...documentos].slice(0, 8))
}

// ── Escrituras: registro y recepción ───────────────────────────────────────

/** Conserva solo los campos del tipo, sin espacios sobrantes ni puntos vacíos (D-66). */
function limpiarDatosTipo(tipo: TipoDocumento, datos: DatosTipo): DatosTipo {
  const limpios: DatosTipo = {}
  for (const c of db.camposTipo[tipo] ?? []) {
    const valor = datos[c.clave]
    if (Array.isArray(valor)) {
      const puntos = valor.map((v) => v.trim()).filter(Boolean)
      if (puntos.length > 0) limpios[c.clave] = puntos
    } else if (valor?.trim()) limpios[c.clave] = valor.trim()
  }
  return limpios
}

/**
 * O-01 Registrar documento recibido y asignar folio (D-21, D-27, D-28, D-29, D-34, D-66).
 * Si número, emisor y año de la fecha del documento ya existen, no crea nada: 409 DUPLICADO con el existente.
 */
export async function registrarDocumento(d: NuevoDocumento): Promise<DocumentoRegistrado> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF'])
  if (!db.tiposDocumento.includes(d.tipo)) falla('VALIDACION', 422, 'Elige un tipo de documento del catálogo.')
  const emisor = exigirTexto(d.emisor, 'Escribe el emisor del documento.')
  const sintesis = exigirTexto(d.sintesis, 'Escribe la síntesis del documento.')
  if (Number.isNaN(Date.parse(d.fecha_recepcion))) falla('VALIDACION', 422, 'Escribe la fecha y hora de recepción.')
  const errores = Object.values(validarDatosTipo(db.camposTipo[d.tipo] ?? [], d.datos_tipo))
  if (errores[0]) falla('VALIDACION', 422, errores[0])

  const numero = d.numero_emisor?.trim() || null
  const anio = d.fecha_documento?.slice(0, 4)
  const existente =
    numero && anio
      ? db.documentos.find((x) => x.numero_emisor === numero && x.emisor === emisor && x.fecha_documento?.slice(0, 4) === anio)
      : undefined
  if (existente)
    throw new ErrorDeApi({
      codigo: 'DUPLICADO',
      status: 409,
      title: 'Ya existe este documento: mismo número, mismo emisor y mismo año del documento.',
      existente: {
        id: existente.id,
        folio: existente.folio,
        numero_emisor: existente.numero_emisor ?? '',
        emisor: existente.emisor,
        canal: existente.canal,
        fecha_recepcion: existente.fecha_recepcion,
      },
    })

  const doc: db.DocumentoSemilla = {
    id: crypto.randomUUID(),
    folio: siguienteFolio(ctx.id_area),
    asunto: sintesis,
    tipo: d.tipo,
    estado: 'en_tramite',
    confidencial: d.confidencial,
    // Sin número o sin fecha no se puede detectar el duplicado: queda para revisión (O-26).
    posible_duplicado: !numero || !d.fecha_documento,
    extemporaneo: d.extemporaneo,
    numero_emisor: numero,
    emisor,
    tipo_emisor: d.tipo_emisor,
    fecha_documento: d.fecha_documento,
    canal: d.canal,
    fecha_recepcion: d.fecha_recepcion,
    segunda_recepcion: null,
    fecha_oficial: diaDe(d.fecha_recepcion),
    origen_fecha_oficial: d.canal === 'papel' ? 'sello' : 'correo',
    sintesis,
    expediente: { datos_tipo: limpiarDatosTipo(d.tipo, d.datos_tipo), anexos: [], notas: [] },
    relaciones: [],
    asuntos: [],
    motivo_cancelacion: null,
  }
  db.documentos.push(doc)
  mover(doc, ctx, { tipo: 'registro', id_area_origen: null, id_area_destino: ctx.id_area ?? '', rol: 'responsable', id_titular_al_turnar: null })
  return { id: doc.id, folio: doc.folio }
}

/** O-19 Segunda recepción: el folio no cambia; si llega en papel, su sello fija la fecha oficial (D-28). */
export async function registrarSegundaRecepcion(id: Uuid, canal: Canal, fechaRecepcion: string): Promise<void> {
  await esperar()
  exigirRol(contexto(), ['OF'])
  const doc = documentoDe(id)
  if (doc.canal === canal || doc.segunda_recepcion) falla('CONFLICTO', 409, 'Ya hay una recepción registrada por ese canal.')
  if (Number.isNaN(Date.parse(fechaRecepcion))) falla('VALIDACION', 422, 'Escribe la fecha y hora de recepción.')
  doc.segunda_recepcion = { canal, fecha_recepcion: fechaRecepcion }
  if (canal === 'papel') {
    doc.fecha_oficial = diaDe(fechaRecepcion)
    doc.origen_fecha_oficial = 'sello'
  }
}

/** O-24 Cancelar documento: nunca se borra (D-20) y deja de estar pendiente en todas las áreas (D-42). */
export async function cancelarDocumento(id: Uuid, motivo: string): Promise<void> {
  await esperar()
  exigirRol(contexto(), ['OF'])
  const doc = documentoDe(id)
  exigirEnTramite(doc)
  doc.motivo_cancelacion = exigirTexto(motivo, 'Escribe el motivo de la cancelación.')
  doc.estado = 'cancelado'
}

/** O-25 Corregir un movimiento: inserta uno nuevo con CORRIGE; el original queda intacto (RF-15, RI-10). */
export async function corregirMovimiento(idMovimiento: Uuid, c: Correccion): Promise<Movimiento> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF'])
  const original = db.movimientos.find((m) => m.id === idMovimiento)
  if (!original) falla('NO_ENCONTRADO', 404, 'El movimiento no existe.')
  if (original.tipo !== 'turno') falla('VALIDACION', 422, 'Solo se corrige el rol de un turno.')
  const doc = documentoDe(original.id_documento)
  exigirEnTramite(doc)
  const motivo = exigirTexto(c.motivo, 'Escribe el motivo de la corrección.')
  const grupo = efectivos(doc.id).filter((m) => m.id_grupo_turno === original.id_grupo_turno)
  const actual = grupo.find((m) => m.id === original.id)?.rol
  if (actual === c.rol) falla('VALIDACION', 422, 'El valor corregido es igual al actual.')
  const error = validarGrupoTurno(grupo.map((m) => ({ id_area: m.id_area_destino, rol: m.id === original.id ? c.rol : m.rol })))
  if (error) falla('VALIDACION', 422, error)
  const correccion = mover(doc, ctx, {
    tipo: 'correccion',
    id_corrige: original.id,
    id_grupo_turno: original.id_grupo_turno,
    id_area_origen: original.id_area_origen,
    id_area_destino: original.id_area_destino,
    rol: c.rol,
    instruccion: motivo,
    id_titular_al_turnar: original.id_titular_al_turnar,
  })
  return aMovimiento(correccion)
}

// ── Escrituras: recorrido ──────────────────────────────────────────────────

/** O-03 Turnar a una o varias áreas en un solo grupo (RI-10, D-18, D-31, D-44). */
export async function turnar(idDocumento: Uuid, destinos: DestinoTurno[]): Promise<ResultadoTurno> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'DI', 'TI'])
  const doc = documentoDe(idDocumento)
  if (doc.estado !== 'en_tramite') falla('ESTADO_INVALIDO', 409, 'No se turnan documentos concluidos ni cancelados.')
  if (ctx.rol === 'TI' && !pendienteEn(doc, ctx.id_area))
    falla('SIN_PERMISO', 403, 'El titular solo turna lo que tiene pendiente en su área.')
  const error = validarGrupoTurno(destinos)
  if (error) falla('VALIDACION', 422, error)
  if (destinos.some((d) => !areaDe(d.id_area))) falla('VALIDACION', 422, 'Un área destino no existe.')

  const grupo = crypto.randomUUID()
  // El origen es el área de quien turna: un turno de OF o DI no cierra el pendiente de otra área (D-42).
  const nuevos = destinos.map((d) =>
    mover(doc, ctx, {
      tipo: 'turno',
      id_grupo_turno: grupo,
      id_area_origen: ctx.id_area,
      id_area_destino: d.id_area,
      rol: d.rol,
      instruccion: d.instruccion.trim() || null,
    }),
  )
  return { id_grupo_turno: grupo, movimientos: nuevos.map(aMovimiento) }
}

/**
 * O-22 Devolver o returnar con motivo (D-32, D-44). Sin área sugerida regresa al área que lo envió;
 * con ella, esa área lo recibe como responsable. La nota va al expediente.
 */
export async function devolver(id: Uuid, d: Devolucion): Promise<Movimiento> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['TI'])
  const doc = documentoDe(id)
  exigirEnTramite(doc)
  const llegada = pendienteEn(doc, ctx.id_area)
  if (!llegada) falla('SIN_PERMISO', 403, 'Solo devuelve el titular del área que tiene el documento pendiente.')
  if (!(d.motivo in MOTIVO)) falla('VALIDACION', 422, 'Elige el motivo del catálogo.')
  const destino = d.id_area_sugerida ?? llegada.id_area_origen
  if (!destino || !areaDe(destino) || destino === ctx.id_area) falla('VALIDACION', 422, 'Elige otra área para returnarlo.')
  const movimiento = mover(doc, ctx, {
    tipo: 'devolucion',
    id_area_origen: ctx.id_area,
    id_area_destino: destino,
    rol: 'responsable',
    motivo: d.motivo,
  })
  if (d.nota.trim()) agregarNotaA(doc, ctx, d.nota.trim())
  return aMovimiento(movimiento)
}

/** O-23 Atraer documento: tu área queda como responsable y la anterior deja de tenerlo pendiente (D-42). */
export async function atraer(id: Uuid, justificacion: string): Promise<Movimiento> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['TI'])
  const doc = documentoDe(id)
  exigirEnTramite(doc)
  if (!involucraArea(doc, ctx.id_area)) falla('SIN_PERMISO', 403, 'Tu área no tiene visibilidad sobre el documento.')
  const anterior = responsableActual(doc)
  if (anterior?.id === ctx.id_area) falla('ESTADO_INVALIDO', 409, 'Tu área ya es la responsable.')
  const texto = exigirTexto(justificacion, 'Escribe la justificación.')
  return aMovimiento(
    mover(doc, ctx, {
      tipo: 'atraccion',
      id_area_origen: anterior?.id ?? null,
      id_area_destino: ctx.id_area ?? '',
      rol: 'responsable',
      instruccion: texto,
    }),
  )
}

/** Documento registrado o salida con ese id. */
const respuestaDe = (id: Uuid | null) => db.documentos.find((d) => d.id === id) ?? db.salidas.find((s) => s.id === id)

/**
 * O-05 Concluir documento con una forma del catálogo cerrado (D-59). Solo el área responsable con el
 * documento pendiente, titular o personal (D-44); oficialía no concluye aunque haya registrado el acuse (D-58).
 */
export async function concluir(id: Uuid, c: Conclusion): Promise<Movimiento> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['TI', 'PE'])
  const doc = documentoDe(id)
  exigirEnTramite(doc)
  if (pendienteEn(doc, ctx.id_area)?.rol !== 'responsable')
    falla('SIN_PERMISO', 403, 'Solo lo concluye el área responsable que lo tiene pendiente.')
  const error = validarConclusion(c)
  if (error) falla('VALIDACION', 422, error)
  const enlazado = c.forma === 'con_respuesta' ? c.id_respuesta : c.forma === 'duplicado' ? c.id_original : null
  const otro = respuestaDe(enlazado)
  if (enlazado && (!otro || enlazado === id)) falla('VALIDACION', 422, 'Elige otro documento registrado.')

  if (c.forma === 'con_respuesta' && otro) {
    // RESPONDE_A sale de la respuesta hacia este documento (D-05).
    if ('id_responde_a' in otro) otro.id_responde_a = doc.id
    else otro.relaciones.push({ tipo: 'responde_a', id_documento: doc.id, referencia: doc.folio, descripcion: doc.asunto, estado: 'concluido' })
  }
  if (c.nota.trim()) agregarNotaA(doc, ctx, c.nota.trim(), c.forma === 'atencion_sin_oficio' ? 'evidencia_atencion' : 'general')
  const movimiento = mover(doc, ctx, {
    tipo: 'conclusion',
    id_area_origen: ctx.id_area,
    id_area_destino: ctx.id_area ?? '',
    rol: 'responsable',
    forma_conclusion: c.forma,
    instruccion: otro ? otro.folio : null,
  })
  doc.estado = 'concluido'
  return aMovimiento(movimiento)
}

// ── Escrituras: relaciones (O-07, O-18) ────────────────────────────────────

/** O-07 Relacionar documentos (D-05, D-14, D-33). */
export async function relacionar(id: Uuid, tipo: TipoRelacion, destino: DestinoRelacion): Promise<void> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'TI', 'PE'])
  const doc = documentoDe(id)
  exigirContenidoVisible(doc, ctx)
  let relacion: db.DocumentoSemilla['relaciones'][number]
  if ('id_documento' in destino) {
    if (destino.id_documento === id) falla('VALIDACION', 422, 'Un documento no se relaciona consigo mismo.')
    const otro = documentoDe(destino.id_documento)
    // SUSTITUYE_A deja al sustituido sin efecto (D-14).
    if (tipo === 'sustituye_a') otro.estado = 'sin_efecto'
    relacion = { tipo, id_documento: otro.id, referencia: otro.folio, descripcion: otro.asunto, estado: otro.estado }
  } else {
    if (tipo === 'sustituye_a') falla('VALIDACION', 422, '«Sustituye a» solo se usa entre documentos registrados.')
    const numero = exigirTexto(destino.numero, 'Escribe el número del documento.')
    const emisor = exigirTexto(destino.emisor, 'Escribe el emisor del documento.')
    // El documento no registrado se identifica por número y emisor (D-33): el mismo par lo reutiliza.
    relacion = { tipo, id_documento: null, referencia: numero, descripcion: emisor, estado: null }
  }
  if (doc.relaciones.some((r) => mismaRelacion(r, tipo, relacion.referencia, relacion.descripcion)))
    falla('CONFLICTO', 409, 'Esa relación ya existe.')
  doc.relaciones.push(relacion)
}

/** Un registrado se identifica por su folio; un no registrado, por número y emisor (D-33). */
const mismaRelacion = (r: db.DocumentoSemilla['relaciones'][number], tipo: TipoRelacion, referencia: string, emisor: string | null) =>
  r.tipo === tipo && r.referencia === referencia && (r.id_documento !== null || r.descripcion === emisor)

/** O-18 Quitar referencia: solo corrige capturas por error (D-20). `emisor` distingue a los no registrados (D-33). */
export async function quitarRelacion(id: Uuid, tipo: TipoRelacion, referencia: string, emisor: string | null): Promise<void> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'TI', 'PE'])
  const doc = documentoDe(id)
  exigirContenidoVisible(doc, ctx)
  const i = doc.relaciones.findIndex((r) => mismaRelacion(r, tipo, referencia, emisor))
  const [quitada] = i >= 0 ? doc.relaciones.splice(i, 1) : []
  if (!quitada) falla('NO_ENCONTRADO', 404, 'La relación no existe.')
  // shortcut: devuelve «en trámite» sin guardar el estado anterior; el servicio real lo lee de la reconciliación (D-14).
  if (tipo === 'sustituye_a' && quitada.id_documento) documentoDe(quitada.id_documento).estado = 'en_tramite'
}

// ── Escrituras: salidas externas (O-20, O-21) ──────────────────────────────

/** O-20 Registrar salida externa: emisor interno, destinatario externo; si responde a otro, RESPONDE_A. */
export async function registrarSalida(s: NuevaSalida): Promise<DocumentoRegistrado> {
  await esperar()
  exigirRol(contexto(), ['OF'])
  if (!db.tiposDocumento.includes(s.tipo)) falla('VALIDACION', 422, 'Elige un tipo de documento del catálogo.')
  if (!areaDe(s.id_area_emisora)) falla('VALIDACION', 422, 'Elige el área emisora.')
  if (s.id_responde_a) documentoDe(s.id_responde_a)
  const salida: db.SalidaSemilla = {
    id: crypto.randomUUID(),
    folio: siguienteFolio(s.id_area_emisora),
    tipo: s.tipo,
    numero: exigirTexto(s.numero, 'Escribe el número del documento.'),
    id_area_emisora: s.id_area_emisora,
    destinatario: exigirTexto(s.destinatario, 'Escribe el destinatario externo.'),
    sintesis: exigirTexto(s.sintesis, 'Escribe la síntesis.'),
    id_responde_a: s.id_responde_a,
    fecha_hora: db.HOY,
    acuse: null,
  }
  db.salidas.push(salida)
  return { id: salida.id, folio: salida.folio }
}

/** O-21 Registrar acuse: un acuse por salida; el área responsable lo ve en «Acuses» y concluye (D-58). */
export async function registrarAcuse(idSalida: Uuid, fechaHora: string, recibio: string): Promise<void> {
  await esperar()
  exigirRol(contexto(), ['OF'])
  const salida = db.salidas.find((s) => s.id === idSalida)
  if (!salida) falla('NO_ENCONTRADO', 404, 'Solo se registra el acuse de un documento de salida.')
  if (salida.acuse) falla('CONFLICTO', 409, 'La salida ya tiene acuse.')
  if (Number.isNaN(Date.parse(fechaHora))) falla('VALIDACION', 422, 'Escribe la fecha y hora del acuse.')
  salida.acuse = { fecha_hora: fechaHora, recibio: exigirTexto(recibio, 'Escribe quién recibió.') }
}

// ── Escrituras: expediente (O-28, O-29) ────────────────────────────────────

/** O-28 Agregar anexo: solo datos descriptivos, sin archivo (DT-03). */
export async function agregarAnexo(id: Uuid, a: NuevoAnexo): Promise<void> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'PE'])
  const doc = documentoDe(id)
  exigirContenidoVisible(doc, ctx)
  if (doc.estado === 'cancelado') falla('ESTADO_INVALIDO', 409, 'Un documento cancelado es de solo lectura.')
  if (!Number.isInteger(a.hojas) || a.hojas < 1) falla('VALIDACION', 422, 'El número de hojas debe ser 1 o más.')
  doc.expediente.anexos.push({
    id: crypto.randomUUID(),
    titulo: exigirTexto(a.titulo, 'Escribe la descripción del anexo.'),
    hojas: a.hojas,
    ubicacion: exigirTexto(a.ubicacion, 'Escribe la ubicación física.'),
  })
}

/** O-29 Agregar nota: autor y fecha los pone el servidor; requiere visibilidad (D-29). */
export async function agregarNota(id: Uuid, texto: string): Promise<void> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'DI', 'TI', 'PE'])
  const doc = documentoDe(id)
  exigirContenidoVisible(doc, ctx)
  if (doc.estado === 'cancelado') falla('ESTADO_INVALIDO', 409, 'Un documento cancelado es de solo lectura.')
  agregarNotaA(doc, ctx, exigirTexto(texto, 'Escribe la nota.'))
}
