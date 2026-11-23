// Fuente simulada (D-63): responde como lo hará el servicio real, incluida la visibilidad de D-29,
// la regla de pendiente de D-42 y los permisos de D-44. Los datos viven en memoria (datos.ts).

import { borrarSesion, guardarSesion, leerSesionGuardada } from '../../sesion/almacen'
import { validarGrupoTurno } from '../reglas'
import {
  ErrorDeApi,
  type Acuse,
  type Area,
  type Catalogos,
  type CodigoError,
  type Credenciales,
  type DestinoTurno,
  type Ficha,
  type FiltrosBandeja,
  type Listado,
  type MotivoDevolucion,
  type Movimiento,
  type PendienteBandeja,
  type Rebote,
  type ResultadoTurno,
  type ResumenDocumento,
  type Rol,
  type Sesion,
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

const areaDe = (id: Uuid) => db.areas.find((a) => a.id === id)
const nombreArea = (id: Uuid | null) => (id ? (areaDe(id)?.nombre ?? '') : null)
const personaDe = (id: Uuid | null) => db.personas.find((p) => p.id === id)
const movimientosDe = (idDoc: Uuid) => db.movimientos.filter((m) => m.id_documento === idDoc)

function documentoDe(id: Uuid) {
  const doc = db.documentos.find((d) => d.id === id)
  if (!doc) falla('NO_ENCONTRADO', 404, 'El documento no existe.')
  return doc
}

const fechaLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' })
/** Días naturales entre la fecha y hoy en America/Mexico_City (D-07). */
const diasDesde = (iso: string) =>
  (Date.parse(fechaLocal.format(new Date(db.HOY))) - Date.parse(fechaLocal.format(new Date(iso)))) / 86_400_000

const MOTIVO: Record<MotivoDevolucion, string> = {
  falta_informacion: 'falta información',
  falta_firma: 'falta firma',
  falta_anexo: 'falta anexo',
  corregir_dato: 'corregir un dato',
  no_competencia: 'no es de su competencia',
}

function descripcion(m: db.MovimientoSemilla): string {
  const origen = db.areas.find((a) => a.id === m.id_area_origen)?.nombre_corto ?? ''
  if (m.tipo === 'registro') return `Registro ${documentoDe(m.id_documento).via_registro}`
  if (m.tipo === 'devolucion') return `Devuelto por ${origen} · ${m.motivo ? MOTIVO[m.motivo] : ''}`
  return `Turnado por ${origen}`
}

/**
 * D-42: el movimiento con el que el documento quedó pendiente en el área, o null si no lo está.
 * Pendiente = el área lo recibió como responsable o apoyo y no hay después una salida desde ella
 * ni la conclusión o cancelación del documento.
 */
function pendienteEn(doc: db.DocumentoSemilla, idArea: Uuid): db.MovimientoSemilla | null {
  if (doc.estado !== 'en_tramite') return null
  let llegada: db.MovimientoSemilla | null = null
  for (const m of movimientosDe(doc.id)) {
    if (m.id_area_destino === idArea && m.rol !== 'conocimiento') llegada = m
    else if (m.id_area_origen === idArea) llegada = null
  }
  return llegada
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

function aMovimiento(m: db.MovimientoSemilla): Movimiento {
  return {
    id: m.id,
    tipo: m.tipo,
    id_grupo_turno: m.id_grupo_turno,
    area_origen: nombreArea(m.id_area_origen),
    area_destino: nombreArea(m.id_area_destino) ?? '',
    rol: m.rol,
    instruccion: m.instruccion,
    motivo: m.motivo,
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

/** O-31 Catálogos. */
export async function obtenerCatalogos(): Promise<Catalogos> {
  await esperar()
  contexto()
  return { tipos_documento: [...db.tiposDocumento] }
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
      numero_emisor: doc.numero_emisor,
      emisor: doc.emisor,
      tipo_emisor: doc.tipo_emisor,
      fecha_documento: doc.fecha_documento,
      medio_recepcion: doc.medio_recepcion,
      fecha_recepcion: doc.fecha_recepcion,
      fecha_oficial: doc.fecha_oficial,
      origen_fecha_oficial: doc.origen_fecha_oficial,
      sintesis: restringido || oculto ? null : doc.sintesis,
    },
    ubicacion_actual: ubicacion,
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
  const idArea = ctx.id_area
  return listado(
    db.salidas
      .filter((s) => idArea && pendienteEn(documentoDe(s.id_documento), idArea)?.rol === 'responsable')
      .map((s) => ({
        id_salida: s.id,
        folio_salida: s.folio,
        id_documento: s.id_documento,
        folio_documento: documentoDe(s.id_documento).folio,
        acusado_por: s.acusado_por,
      })),
  )
}

// ── Escrituras ─────────────────────────────────────────────────────────────

/** O-03 Turnar a una o varias áreas en un solo grupo (RI-10, D-18, D-31, D-44). */
export async function turnar(idDocumento: Uuid, destinos: DestinoTurno[]): Promise<ResultadoTurno> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'DI', 'TI'])
  const doc = documentoDe(idDocumento)
  if (doc.estado !== 'en_tramite') falla('ESTADO_INVALIDO', 409, 'No se turnan documentos concluidos ni cancelados.')
  if (ctx.rol === 'TI' && !(ctx.id_area && pendienteEn(doc, ctx.id_area)))
    falla('SIN_PERMISO', 403, 'El titular solo turna lo que tiene pendiente en su área.')
  const error = validarGrupoTurno(destinos)
  if (error) falla('VALIDACION', 422, error)
  if (destinos.some((d) => !areaDe(d.id_area))) falla('VALIDACION', 422, 'Un área destino no existe.')

  const grupo = crypto.randomUUID()
  const nuevos = destinos.map(
    (d): db.MovimientoSemilla => ({
      id: crypto.randomUUID(),
      id_documento: doc.id,
      tipo: 'turno',
      id_grupo_turno: grupo,
      id_area_origen: ctx.id_area,
      id_area_destino: d.id_area,
      rol: d.rol,
      instruccion: d.instruccion.trim() || null,
      motivo: null,
      id_persona: ctx.id_persona,
      id_titular_al_turnar: areaDe(d.id_area)?.id_titular ?? null,
      fecha_hora: db.HOY,
    }),
  )
  db.movimientos.push(...nuevos)
  return { id_grupo_turno: grupo, movimientos: nuevos.map(aMovimiento) }
}
