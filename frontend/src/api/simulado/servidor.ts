// Fuente simulada (D-63): responde como lo hará el servicio real, incluida la visibilidad de D-29,
// la regla de pendiente de D-42 y los permisos de D-44. Los datos viven en memoria (datos.ts).

import { borrarSesion, guardarSesion, leerSesionGuardada } from '../../sesion/almacen'
import { validarConclusion, validarDatosTipo, validarGrupoTurno } from '../reglas'
import {
  ErrorDeApi,
  type Acuse,
  type ActorExterno,
  type AlcanceAsunto,
  type Area,
  type AreaOrganizacion,
  type Asunto,
  type CampoBuscable,
  type Canal,
  type Catalogos,
  type CodigoError,
  type Coincidencia,
  type ComparacionDuplicado,
  type Conclusion,
  type Correccion,
  type Credenciales,
  type DatosActor,
  type DatosArea,
  type DatosPersona,
  type DecisionDuplicado,
  type DatosTipo,
  type DestinoRelacion,
  type DestinoTurno,
  type Devolucion,
  type DocumentoComparado,
  type DocumentoEncontrado,
  type DocumentoRegistrado,
  type Ficha,
  type FiltrosBandeja,
  type FiltrosBusqueda,
  type FiltrosRebotes,
  type HiloAsunto,
  type Listado,
  type MotivoDevolucion,
  type Movimiento,
  type NodoHilo,
  type NuevaSalida,
  type NuevoAsunto,
  type NuevoAnexo,
  type NuevoDocumento,
  type PendienteBandeja,
  type Persona,
  type Rebote,
  type ReglaRebote,
  type ResultadoBusqueda,
  type ResultadoTurno,
  type ResumenDocumento,
  type Rol,
  type Salida,
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
  if (!persona?.rol || !persona.activa) falla('NO_AUTENTICADO', 401, 'Inicia sesión para continuar.')
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
 * ni la conclusión o cancelación del documento. Atraer sale de todas las áreas responsables (D-68).
 */
function pendienteEn(doc: db.DocumentoSemilla, idArea: Uuid | null): db.MovimientoSemilla | null {
  if (doc.estado !== 'en_tramite' || !idArea) return null
  let llegada: db.MovimientoSemilla | null = null
  for (const m of efectivos(doc.id)) {
    if (m.id_area_destino === idArea && m.rol !== 'conocimiento') llegada = m
    else if (m.id_area_origen === idArea || m.otros_origenes?.includes(idArea)) llegada = null
  }
  return llegada
}

/** Áreas que hoy tienen el documento como responsable; con D-67 puede haber más de una. */
const responsablesActuales = (doc: db.DocumentoSemilla) =>
  db.areas.filter((a) => pendienteEn(doc, a.id)?.rol === 'responsable')

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
    // D-68: una atracción con varias áreas de origen las nombra todas.
    area_origen: m.otros_origenes?.length
      ? [m.id_area_origen, ...m.otros_origenes].map(nombreArea).join(' y ')
      : nombreArea(m.id_area_origen),
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
  // Una persona dada de baja ya no entra (O-34).
  if (!persona?.rol || !persona.activa || !contrasena) falla('NO_AUTENTICADO', 401, 'Correo o contraseña incorrectos.')
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

/** O-31 Catálogos: los siete tipos (D-65), sus campos propios (D-66) y los actores externos activos (RI-06). */
export async function obtenerCatalogos(): Promise<Catalogos> {
  await esperar()
  contexto()
  return structuredClone({
    tipos_documento: db.tiposDocumento,
    campos_tipo: db.camposTipo,
    actores_externos: db.actores.filter((a) => a.activo).map(({ id, nombre, tipo }) => ({ id, nombre, tipo })),
  })
}

/** O-32 reducido a los selectores: áreas activas con su titular. */
export async function obtenerAreas(): Promise<Listado<Area>> {
  await esperar()
  contexto()
  return listado(
    db.areas.filter((a) => a.activa).map((a) => ({
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
    .map((d) => ({ id: d.id, folio: d.folio, asunto: d.asunto, fecha: d.fecha_recepcion, salida: false }))
  const salidas = db.salidas
    .filter((s) => (ctx.ve_recorrido_completo || s.id_area_emisora === ctx.id_area) && coincide(s.folio, s.sintesis))
    .map((s) => ({ id: s.id, folio: s.folio, asunto: s.sintesis, fecha: s.fecha_hora, salida: true }))
  return listado([...salidas, ...documentos].slice(0, 8))
}

// ── Escrituras: registro y recepción ───────────────────────────────────────

/** RI-06: el emisor es un área activa o un actor externo activo del catálogo (O-35). */
function exigirEmisor(tipo: 'area' | 'externo', nombre: string) {
  if (tipo !== 'area' && tipo !== 'externo') falla('VALIDACION', 422, 'Elige si el emisor es un área interna o un actor externo.')
  if (tipo === 'area' && !db.areas.some((a) => a.activa && a.nombre === nombre)) falla('VALIDACION', 422, 'Elige un área interna del catálogo.')
  if (tipo === 'externo') exigirActor(nombre)
}

function exigirActor(nombre: string): string {
  if (!db.actores.some((a) => a.activo && a.nombre === nombre)) falla('VALIDACION', 422, 'Elige un actor externo activo del catálogo.')
  return nombre
}

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
  exigirEmisor(d.tipo_emisor, emisor)
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
    con_area_sugerida: d.id_area_sugerida !== null,
  })
  if (d.nota.trim()) agregarNotaA(doc, ctx, d.nota.trim())
  return aMovimiento(movimiento)
}

/**
 * O-23 Atraer documento (D-68): tu área queda como única responsable; todas las demás áreas responsables
 * son orígenes del movimiento y dejan de tenerlo pendiente. Apoyo y conocimiento no cambian.
 */
export async function atraer(id: Uuid, justificacion: string): Promise<Movimiento> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['TI'])
  const doc = documentoDe(id)
  exigirEnTramite(doc)
  if (!involucraArea(doc, ctx.id_area)) falla('SIN_PERMISO', 403, 'Tu área no tiene visibilidad sobre el documento.')
  const [anterior, ...otras] = responsablesActuales(doc).filter((a) => a.id !== ctx.id_area)
  if (!anterior && pendienteEn(doc, ctx.id_area)?.rol === 'responsable')
    falla('ESTADO_INVALIDO', 409, 'Tu área ya es la responsable.')
  const texto = exigirTexto(justificacion, 'Escribe la justificación.')
  return aMovimiento(
    mover(doc, ctx, {
      tipo: 'atraccion',
      id_area_origen: anterior?.id ?? null,
      otros_origenes: otras.map((a) => a.id),
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
    destinatario: exigirActor(exigirTexto(s.destinatario, 'Elige el destinatario externo.')),
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

// ── T-02b: consulta (O-30) ─────────────────────────────────────────────────

/** Ve el contenido: el documento es de su visibilidad y no es confidencial ajeno (D-29). */
const veContenido = (doc: db.DocumentoSemilla, ctx: ContextoUsuario) => acceso(doc, ctx) === 'completo' && !contenidoOculto(doc, ctx)

/** Paginación obligatoria (O-30): 20 por página por omisión, 100 como máximo. */
function paginar<T>(elementos: T[], pagina = 1, tamano = 20): Listado<T> {
  const t = Math.min(Math.max(Math.trunc(tamano), 1), 100)
  const inicio = (Math.max(Math.trunc(pagina), 1) - 1) * t
  return { elementos: elementos.slice(inicio, inicio + t), total: elementos.length }
}

const contiene = (valor: string | null | undefined, buscado: string) => (valor ?? '').toLowerCase().includes(buscado.trim().toLowerCase())

/** Solo los campos con índice parcial se buscan (D-46). */
const CAMPOS_BUSCABLES: CampoBuscable[] = ['ente_auditor', 'solicitante']

/**
 * O-30 Buscar documentos (AR-07, AD-07). Fuera de la visibilidad solo devuelve estado y responsable (D-29);
 * los filtros sobre lo que el usuario no ve no se aplican a esos documentos, para no revelar su contenido.
 */
export async function buscar(f: FiltrosBusqueda = {}): Promise<Listado<ResultadoBusqueda>> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'DI', 'TI', 'PE'])
  if (f.campo_tipo && !CAMPOS_BUSCABLES.includes(f.campo_tipo.clave))
    falla('VALIDACION', 422, 'Solo se busca por ente auditor o solicitante (D-46).')
  const campo = f.campo_tipo?.valor.trim() ? f.campo_tipo : undefined
  const resultados = db.documentos
    .map((doc) => {
      const visibilidad: ResultadoBusqueda['visibilidad'] =
        acceso(doc, ctx) === 'restringido' ? 'restringida' : contenidoOculto(doc, ctx) ? 'confidencial' : 'completa'
      return { doc, visibilidad }
    })
    .filter(
      ({ doc, visibilidad }) =>
        (!f.folio?.trim() || contiene(doc.folio, f.folio)) &&
        (!f.numero?.trim() || (visibilidad !== 'restringida' && contiene(doc.numero_emisor, f.numero))) &&
        (!f.emisor || doc.emisor === f.emisor) &&
        (!f.tipo || doc.tipo === f.tipo) &&
        (!f.estado || doc.estado === f.estado) &&
        (!f.desde || diaDe(doc.fecha_recepcion) >= f.desde) &&
        (!f.hasta || diaDe(doc.fecha_recepcion) <= f.hasta) &&
        (!f.texto?.trim() || (visibilidad === 'completa' && contiene(doc.sintesis, f.texto))) &&
        // AD-07: MongoDB devuelve ids por el índice parcial del tipo; la visibilidad se filtra después (D-46).
        (!campo || (visibilidad === 'completa' && contiene(String(doc.expediente.datos_tipo[campo.clave] ?? ''), campo.valor))),
    )
    .sort((a, b) => b.doc.fecha_recepcion.localeCompare(a.doc.fecha_recepcion) || b.doc.folio.localeCompare(a.doc.folio))
    .map(
      ({ doc, visibilidad }): ResultadoBusqueda => ({
        id: doc.id,
        folio: doc.folio,
        numero_emisor: visibilidad === 'restringida' ? null : doc.numero_emisor,
        sintesis: visibilidad === 'completa' ? doc.sintesis : null,
        tipo: doc.tipo,
        estado: doc.estado,
        area_responsable: responsablesActuales(doc)[0]?.nombre ?? null,
        visibilidad,
      }),
    )
  return paginar(resultados, f.pagina, f.tamano)
}

// ── T-02b: asuntos (O-27, O-08, O-18, C2, C5) ──────────────────────────────

function asuntoDe(id: Uuid) {
  const asunto = db.asuntos.find((a) => a.id === id)
  if (!asunto) falla('NO_ENCONTRADO', 404, 'El asunto no existe.')
  return asunto
}

const miembros = (idAsunto: Uuid) =>
  db.documentos.filter((d) => d.asuntos.some((a) => a.id === idAsunto)).sort((a, b) => a.folio.localeCompare(b.folio))

function aAsunto(a: db.AsuntoSemilla): Asunto {
  const docs = miembros(a.id)
  return {
    id: a.id,
    nombre: a.nombre,
    descripcion: a.descripcion,
    creador: personaDe(a.id_creador)?.nombre ?? '',
    fecha: a.fecha,
    documentos: docs.length,
    areas: [...new Set(docs.flatMap((d) => responsablesActuales(d).map((x) => x.nombre)))],
  }
}

/** Asuntos por nombre, para V-11b y el índice de V-11. */
export async function obtenerAsuntos(texto = ''): Promise<Listado<Asunto>> {
  await esperar()
  exigirRol(contexto(), ['OF', 'DI', 'TI', 'PE'])
  return listado(db.asuntos.filter((a) => contiene(a.nombre, texto)).map(aAsunto))
}

/** Un nodo del grafo de referencias: documento registrado, salida o documento no registrado (D-33). */
type ClaveNodo = `doc:${string}` | `sal:${string}` | `nr:${string}`
interface Vecino {
  clave: ClaveNodo
  tipo: TipoRelacion
  sentido: 'entra' | 'sale'
}

const SEPARADOR = '\u0000'
const claveNoRegistrado = (numero: string, emisor: string | null): ClaveNodo => `nr:${numero}${SEPARADOR}${emisor ?? ''}`
const partes = (clave: ClaveNodo) => [clave.slice(0, clave.indexOf(':')), clave.slice(clave.indexOf(':') + 1)] as const

/** Las cuatro referencias en ambos sentidos (AG-02); las salidas responden con RESPONDE_A. */
function vecinos(clave: ClaveNodo): Vecino[] {
  const [clase, id] = partes(clave)
  const entrantes = (coincide: (r: db.DocumentoSemilla['relaciones'][number]) => boolean): Vecino[] =>
    db.documentos.flatMap((d) =>
      d.relaciones.filter(coincide).map((r): Vecino => ({ clave: `doc:${d.id}`, tipo: r.tipo, sentido: 'entra' })),
    )
  if (clase === 'doc') {
    const doc = documentoDe(id)
    return [
      ...doc.relaciones.map(
        (r): Vecino => ({
          clave: r.id_documento ? `doc:${r.id_documento}` : claveNoRegistrado(r.referencia, r.descripcion),
          tipo: r.tipo,
          sentido: 'sale',
        }),
      ),
      ...entrantes((r) => r.id_documento === id),
      ...db.salidas
        .filter((s) => s.id_responde_a === id)
        .map((s): Vecino => ({ clave: `sal:${s.id}`, tipo: 'responde_a', sentido: 'entra' })),
    ]
  }
  if (clase === 'sal') {
    const s = db.salidas.find((x) => x.id === id)
    return s?.id_responde_a ? [{ clave: `doc:${s.id_responde_a}`, tipo: 'responde_a', sentido: 'sale' }] : []
  }
  return entrantes((r) => !r.id_documento && claveNoRegistrado(r.referencia, r.descripcion) === clave)
}

function nodo(clave: ClaveNodo, ctx: ContextoUsuario, relacion: NodoHilo['relacion'], profundidad: number): NodoHilo {
  const [clase, id] = partes(clave)
  const base = { pertenece: profundidad === 0, relacion, profundidad }
  if (clase === 'doc') {
    const doc = documentoDe(id)
    return {
      ...base,
      id_documento: doc.id,
      referencia: doc.folio,
      descripcion: veContenido(doc, ctx) ? doc.asunto : null,
      estado: doc.estado,
      registrado: true,
    }
  }
  if (clase === 'sal') {
    const s = db.salidas.find((x) => x.id === id)
    const ve = ctx.ve_recorrido_completo || s?.id_area_emisora === ctx.id_area
    return { ...base, id_documento: null, referencia: s?.folio ?? '', descripcion: ve ? (s?.sintesis ?? null) : null, estado: null, registrado: true }
  }
  const [numero = '', emisor = ''] = id.split(SEPARADOR)
  return { ...base, id_documento: null, referencia: numero, descripcion: emisor || null, estado: null, registrado: false }
}

/** D-50: los recorridos variables se limitan a 6 saltos. */
const SALTOS_MAXIMOS = 6

/**
 * C2 Hilo de un asunto (AG-02): parte del Asunto, nunca de un Área (HU-F1). Recorre por anchura para dar a
 * cada documento su menor profundidad y lo devuelve en preorden, cada uno después del documento por el que llegó.
 */
export async function obtenerHiloAsunto(id: Uuid): Promise<HiloAsunto> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'DI', 'TI', 'PE'])
  const asunto = asuntoDe(id)
  const raices = miembros(id).map((d): ClaveNodo => `doc:${d.id}`)
  const visitados = new Set<ClaveNodo>(raices)
  const hijos = new Map<ClaveNodo, { clave: ClaveNodo; relacion: NodoHilo['relacion'] }[]>()
  let frente = raices
  for (let salto = 1; salto <= SALTOS_MAXIMOS && frente.length > 0; salto++) {
    const siguiente: ClaveNodo[] = []
    for (const actual of frente)
      for (const v of vecinos(actual)) {
        if (visitados.has(v.clave)) continue
        visitados.add(v.clave)
        siguiente.push(v.clave)
        hijos.set(actual, [...(hijos.get(actual) ?? []), { clave: v.clave, relacion: { tipo: v.tipo, sentido: v.sentido } }])
      }
    frente = siguiente
  }
  const nodos: NodoHilo[] = []
  const visitar = (clave: ClaveNodo, relacion: NodoHilo['relacion'], profundidad: number) => {
    nodos.push(nodo(clave, ctx, relacion, profundidad))
    for (const h of hijos.get(clave) ?? []) visitar(h.clave, h.relacion, profundidad + 1)
  }
  for (const raiz of raices) visitar(raiz, null, 0)
  return structuredClone({ asunto: aAsunto(asunto), nodos })
}

/**
 * C5 Alcance de un asunto (AG-04): áreas y personas de los movimientos de sus documentos. De lo que no ve
 * (D-29) solo cuenta el área, sin personas.
 */
export async function obtenerAlcanceAsunto(id: Uuid): Promise<AlcanceAsunto> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'DI', 'TI', 'PE'])
  asuntoDe(id)
  const porArea = new Map<string, number>()
  const personas = new Set<string>()
  for (const doc of miembros(id)) {
    const movs = movimientosDe(doc.id)
    const areasDoc = new Set(movs.flatMap((m) => [m.id_area_origen, m.id_area_destino, ...(m.otros_origenes ?? [])]))
    for (const a of areasDoc) {
      const nombre = nombreArea(a)
      if (nombre) porArea.set(nombre, (porArea.get(nombre) ?? 0) + 1)
    }
    if (!veContenido(doc, ctx)) continue
    for (const m of movs)
      for (const p of [m.id_persona, m.id_titular_al_turnar]) {
        const nombre = personaDe(p)?.nombre
        if (nombre) personas.add(nombre)
      }
  }
  return {
    areas: [...porArea]
      .map(([area, documentos]) => ({ area, documentos }))
      .sort((a, b) => b.documentos - a.documentos || a.area.localeCompare(b.area)),
    personas: [...personas],
  }
}

/** O-08 Asignar documento a un asunto (D-30): titular o personal, sobre un documento cuyo contenido ve. */
function asignarA(doc: db.DocumentoSemilla, asunto: db.AsuntoSemilla, ctx: ContextoUsuario) {
  exigirRol(ctx, ['TI', 'PE'])
  exigirContenidoVisible(doc, ctx)
  if (doc.asuntos.some((a) => a.id === asunto.id)) falla('CONFLICTO', 409, 'El documento ya pertenece a ese asunto.')
  // MERGE de PERTENECE_A (AG-08); un documento puede estar en varios asuntos.
  doc.asuntos.push({ id: asunto.id, nombre: asunto.nombre })
}

export async function asignarAsunto(idDocumento: Uuid, idAsunto: Uuid): Promise<void> {
  await esperar()
  const ctx = contexto()
  asignarA(documentoDe(idDocumento), asuntoDe(idAsunto), ctx)
}

/** O-27 Crear asunto (D-25). Con documento, queda asignado al crearlo (V-11b); eso exige O-08. */
export async function crearAsunto(a: NuevoAsunto, idDocumento: Uuid | null = null): Promise<Asunto> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'TI', 'PE'])
  const nombre = exigirTexto(a.nombre, 'Escribe el nombre del asunto.')
  const detalle = exigirTexto(a.descripcion, 'Escribe la descripción del asunto.')
  const doc = idDocumento ? documentoDe(idDocumento) : null
  // La asignación se valida antes de crear, para no dejar un asunto a medias.
  if (doc) {
    exigirRol(ctx, ['TI', 'PE'])
    exigirContenidoVisible(doc, ctx)
  }
  const asunto: db.AsuntoSemilla = { id: crypto.randomUUID(), nombre, descripcion: detalle, id_creador: ctx.id_persona, fecha: db.HOY }
  db.asuntos.push(asunto)
  if (doc) asignarA(doc, asunto, ctx)
  return aAsunto(asunto)
}

/** O-18 en su parte de sacar de un asunto (AG-09): borra la pertenencia, nunca el nodo (D-20). */
export async function sacarDeAsunto(idDocumento: Uuid, idAsunto: Uuid): Promise<void> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'TI', 'PE'])
  const doc = documentoDe(idDocumento)
  exigirContenidoVisible(doc, ctx)
  const i = doc.asuntos.findIndex((a) => a.id === idAsunto)
  if (i < 0) falla('NO_ENCONTRADO', 404, 'El documento no pertenece a ese asunto.')
  doc.asuntos.splice(i, 1)
}

// ── T-02b: rebotes (C3) ────────────────────────────────────────────────────

/** Áreas por las que pasó como responsable, sin oficialía, que es paso obligado (supernodo, HU-F1). */
const areasResponsables = (movs: db.MovimientoSemilla[]) =>
  new Set(
    movs
      .filter((m) => m.rol === 'responsable' && m.tipo !== 'registro' && m.id_area_destino !== db.AREA.oficialia)
      .map((m) => m.id_area_destino),
  )

/**
 * C3 Rebotes entre áreas (AG-03, D-32): parte de los movimientos del periodo, no de un área (D-50). Una
 * devolución con motivo del catálogo y una «no competencia» con área sugerida son legítimas.
 */
export async function obtenerRebotes(f: FiltrosRebotes = {}): Promise<Listado<Rebote>> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['OF', 'DI'])
  const periodo = f.periodo ?? db.HOY.slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(periodo)) falla('VALIDACION', 422, 'El periodo es un mes AAAA-MM.')
  const rebotes: Rebote[] = []
  for (const doc of db.documentos) {
    if (doc.estado !== 'en_tramite') continue
    const movs = efectivos(doc.id).filter((m) => diaDe(m.fecha_hora).startsWith(periodo))
    if (f.id_area && !movs.some((m) => m.id_area_destino === f.id_area || m.id_area_origen === f.id_area)) continue
    const devoluciones = movs.filter((m) => m.tipo === 'devolucion')
    const areas = areasResponsables(movs).size
    const reglas: ReglaRebote[] = []
    if (devoluciones.some((m) => m.motivo === 'no_competencia' && !m.con_area_sugerida)) reglas.push('no_competencia_sin_area')
    if (devoluciones.length >= 3) reglas.push('tres_devoluciones')
    if (areas >= 3) reglas.push('tres_areas')
    if (reglas.length === 0) continue
    rebotes.push({
      id_documento: doc.id,
      folio: doc.folio,
      asunto: veContenido(doc, ctx) ? doc.asunto : null,
      reglas,
      areas,
      ubicacion: responsablesActuales(doc)[0]?.nombre ?? null,
    })
  }
  return listado(rebotes.sort((a, b) => b.folio.localeCompare(a.folio)))
}

// ── T-02b: posibles duplicados (O-26) ──────────────────────────────────────

/** Documentos marcados que esperan revisión (O-26). Solo oficialía. */
export async function obtenerPosiblesDuplicados(): Promise<Listado<ResumenDocumento>> {
  await esperar()
  exigirRol(contexto(), ['OF'])
  return listado(
    db.documentos
      .filter((d) => d.posible_duplicado && d.estado === 'en_tramite')
      .sort((a, b) => b.folio.localeCompare(a.folio))
      .map((d): ResumenDocumento => ({ id: d.id, folio: d.folio, asunto: d.asunto, falta: d.numero_emisor ? 'fecha' : 'numero' })),
  )
}

const antesQue = (a: db.DocumentoSemilla, b: db.DocumentoSemilla) =>
  a.fecha_recepcion < b.fecha_recepcion || (a.fecha_recepcion === b.fecha_recepcion && a.folio < b.folio)

/** El candidato se busca por emisor y fecha del documento, o por número si lo trae (V-14): el último registrado antes. */
function candidatoDe(doc: db.DocumentoSemilla) {
  return db.documentos
    .filter(
      (o) =>
        o.id !== doc.id &&
        o.estado !== 'cancelado' &&
        o.emisor === doc.emisor &&
        antesQue(o, doc) &&
        ((doc.numero_emisor !== null && o.numero_emisor === doc.numero_emisor) ||
          (doc.fecha_documento !== null && o.fecha_documento === doc.fecha_documento)),
    )
    .sort((a, b) => (antesQue(a, b) ? 1 : -1))[0]
}

/** Palabras de 4 letras o más, sin acentos: dos síntesis se parecen si comparten la mitad. */
const palabras = (t: string) =>
  new Set(
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length >= 4),
  )

function sintesisParecidas(a: string, b: string) {
  const [pa, pb] = [palabras(a), palabras(b)]
  const comunes = [...pa].filter((p) => pb.has(p)).length
  return comunes > 0 && comunes / Math.min(pa.size, pb.size) >= 0.5
}

function aComparado(doc: db.DocumentoSemilla): DocumentoComparado {
  return {
    id: doc.id,
    folio: doc.folio,
    numero_emisor: doc.numero_emisor,
    emisor: doc.emisor,
    fecha_documento: doc.fecha_documento,
    canal: doc.canal,
    fecha_recepcion: doc.fecha_recepcion,
    sintesis: doc.sintesis,
    estado: doc.estado,
    ubicacion: responsablesActuales(doc)[0]?.nombre ?? null,
  }
}

function exigirPosibleDuplicado(doc: db.DocumentoSemilla) {
  if (!doc.posible_duplicado || doc.estado !== 'en_tramite') falla('ESTADO_INVALIDO', 409, 'El documento ya no espera revisión.')
}

/** V-14: el marcado frente a su candidato, con los campos que coinciden. */
export async function obtenerComparacionDuplicado(id: Uuid): Promise<ComparacionDuplicado> {
  await esperar()
  exigirRol(contexto(), ['OF'])
  const doc = documentoDe(id)
  exigirPosibleDuplicado(doc)
  const otro = candidatoDe(doc)
  const coincidencias: Coincidencia[] = []
  if (otro) {
    if (doc.numero_emisor && doc.numero_emisor === otro.numero_emisor) coincidencias.push('numero_emisor')
    coincidencias.push('emisor')
    if (doc.fecha_documento && doc.fecha_documento === otro.fecha_documento) coincidencias.push('fecha_documento')
    if (sintesisParecidas(doc.sintesis, otro.sintesis)) coincidencias.push('sintesis')
  }
  return structuredClone({ posterior: aComparado(doc), candidato: otro ? aComparado(otro) : null, coincidencias })
}

/**
 * O-26 Resolver posible duplicado. «mismo»: el posterior pasa a cancelado con duplicado_de y sus movimientos
 * se conservan (D-20). «distintos»: solo se retira la marca.
 */
export async function resolverDuplicado(idPosterior: Uuid, idOtro: Uuid | null, decision: DecisionDuplicado): Promise<void> {
  await esperar()
  exigirRol(contexto(), ['OF'])
  const doc = documentoDe(idPosterior)
  exigirPosibleDuplicado(doc)
  if (decision !== 'mismo' && decision !== 'distintos') falla('VALIDACION', 422, 'Elige «son el mismo» o «son distintos».')
  // Sin candidato solo se puede decidir que son distintos: retirar la marca.
  if (decision === 'mismo' || idOtro) {
    const otro = documentoDe(idOtro ?? '')
    if (otro.id === doc.id || !antesQue(otro, doc)) falla('VALIDACION', 422, 'Compara con un documento registrado antes.')
    if (decision === 'mismo') {
      if (otro.estado === 'cancelado') falla('VALIDACION', 422, 'El original está cancelado.')
      doc.estado = 'cancelado'
      doc.duplicado_de = otro.id
      doc.motivo_cancelacion = `Duplicado de ${otro.folio}`
    }
  }
  doc.posible_duplicado = false
}

// ── T-02b: salidas externas (V-13) ─────────────────────────────────────────

/** Listado de salidas externas (O-20, O-21) de V-13, las más recientes primero. Solo oficialía. */
export async function obtenerSalidas(acuse: 'con' | 'sin' | null = null): Promise<Listado<Salida>> {
  await esperar()
  exigirRol(contexto(), ['OF'])
  return structuredClone(
    listado(
      db.salidas
        .filter((s) => acuse === null || (acuse === 'con') === (s.acuse !== null))
        .sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora) || b.folio.localeCompare(a.folio))
        .map(
          (s): Salida => ({
            id: s.id,
            folio: s.folio,
            sintesis: s.sintesis,
            destinatario: s.destinatario,
            id_responde_a: s.id_responde_a,
            folio_responde_a: s.id_responde_a ? documentoDe(s.id_responde_a).folio : null,
            area_emisora: nombreArea(s.id_area_emisora) ?? '',
            fecha_hora: s.fecha_hora,
            acuse: s.acuse,
          }),
        ),
    ),
  )
}

// ── T-02b: organización y administración (O-32 a O-35) ────────────────────

const conFolios = (siglas: string) => [...db.documentos, ...db.salidas].some((d) => d.folio.startsWith(`${siglas}-`))

/** O-32 Estructura organizacional: todas las áreas, activas e inactivas, en su estado actual (D-08). */
export async function obtenerOrganizacion(): Promise<Listado<AreaOrganizacion>> {
  await esperar()
  contexto()
  return listado(
    db.areas.map(
      (a): AreaOrganizacion => ({
        id: a.id,
        nombre: a.nombre,
        siglas: a.siglas,
        id_titular: a.id_titular,
        nombre_titular: personaDe(a.id_titular)?.nombre ?? null,
        id_padre: a.id_padre,
        activa: a.activa,
        personas: db.personas.filter((p) => p.id_area === a.id && p.activa).map((p) => ({ id: p.id, nombre: p.nombre, rol: p.rol })),
        pendientes: db.documentos.filter((d) => pendienteEn(d, a.id)).length,
        con_folios: conFolios(a.siglas),
      }),
    ),
  )
}

/**
 * O-33 Gestionar áreas: crear (sin id) o actualizar. Sin ciclos en la jerarquía (D-47, AR-09), siglas fijas
 * con folios emitidos (D-61) y titular adscrito al área.
 */
export async function guardarArea(d: DatosArea, id: Uuid | null = null): Promise<Area> {
  await esperar()
  exigirRol(contexto(), ['AD'])
  const actual = id ? areaDe(id) : undefined
  if (id && !actual) falla('NO_ENCONTRADO', 404, 'El área no existe.')
  const siglas = exigirTexto(d.siglas, 'Escribe las siglas.').toUpperCase()
  const nombre = exigirTexto(d.nombre, 'Escribe el nombre del área.')
  if (!/^[A-Z]{2,5}$/.test(siglas)) falla('VALIDACION', 422, 'Las siglas son de 2 a 5 letras, sin acentos.')
  if (db.areas.some((a) => a.id !== id && a.siglas === siglas)) falla('CONFLICTO', 409, 'Ya existe un área con esas siglas.')
  if (actual && actual.siglas !== siglas && conFolios(actual.siglas))
    falla('CONFLICTO', 409, 'Las siglas no cambian: el área ya tiene folios emitidos (D-61).')
  // Solo la raíz actual puede quedar sin área de la que depende.
  if (!d.id_padre && actual?.id_padre !== null) falla('VALIDACION', 422, 'Elige el área de la que depende.')
  if (d.id_padre) {
    if (!areaDe(d.id_padre)?.activa) falla('VALIDACION', 422, 'El área de la que depende no existe o está inactiva.')
    // AR-09: se sube desde el padre propuesto; si se llega al área misma, habría un ciclo.
    for (let a = areaDe(d.id_padre); a; a = areaDe(a.id_padre))
      if (a.id === id) falla('VALIDACION', 422, 'No puede depender de un área que depende de ella.')
  }
  if (d.id_titular) {
    const titular = personaDe(d.id_titular)
    if (!id || !titular?.activa || titular.id_area !== id) falla('VALIDACION', 422, 'El titular debe estar adscrito al área.')
  }
  const area: db.AreaSemilla = actual ?? {
    id: crypto.randomUUID(),
    nombre,
    nombre_corto: nombre,
    siglas,
    id_titular: null,
    id_padre: null,
    activa: true,
  }
  // shortcut: la semilla liga los documentos con su área emisora por nombre; el servicio real usa el id (RI-06).
  if (actual && actual.nombre !== nombre)
    for (const doc of db.documentos) if (doc.tipo_emisor === 'area' && doc.emisor === actual.nombre) doc.emisor = nombre
  Object.assign(area, { siglas, nombre, id_padre: d.id_padre, id_titular: d.id_titular })
  if (!actual) db.areas.push(area)
  return { id: area.id, nombre, siglas, id_titular: area.id_titular, nombre_titular: personaDe(area.id_titular)?.nombre ?? null }
}

/** O-33: se desactiva, no se borra (D-20); con pendientes no se desactiva (D-42). */
export async function desactivarArea(id: Uuid): Promise<void> {
  await esperar()
  exigirRol(contexto(), ['AD'])
  const area = areaDe(id)
  if (!area) falla('NO_ENCONTRADO', 404, 'El área no existe.')
  const pendientes = db.documentos.filter((d) => pendienteEn(d, id)).length
  if (pendientes > 0)
    falla('CONFLICTO', 409, `No se puede desactivar: tiene ${pendientes} documentos pendientes. Turna o concluye esos documentos primero.`)
  // Una hija activa de un área inactiva quedaría fuera de la estructura vigente (V-16).
  if (db.areas.some((a) => a.activa && a.id_padre === id))
    falla('CONFLICTO', 409, 'No se puede desactivar: tiene áreas activas que dependen de ella.')
  area.activa = false
}

function aPersona(p: db.PersonaSemilla): Persona {
  return { id: p.id, nombre: p.nombre, correo: p.correo, id_area: p.id_area, nombre_area: nombreArea(p.id_area), rol: p.rol, activa: p.activa }
}

/** O-34: personas con su usuario. Solo administración. */
export async function obtenerPersonas(): Promise<Listado<Persona>> {
  await esperar()
  exigirRol(contexto(), ['AD'])
  return listado(db.personas.map(aPersona))
}

const ROLES: Rol[] = ['OF', 'DI', 'TI', 'PE', 'AD']

/** Un titular que ya no está adscrito a su área (cambio o baja) deja el área vacante (O-34). */
function vaciarTitularidades(persona: db.PersonaSemilla) {
  for (const a of db.areas) if (a.id_titular === persona.id && (!persona.activa || persona.id_area !== a.id)) a.id_titular = null
}

/** O-34 Gestionar personas y usuarios: crear (sin id) o actualizar. Correo único. */
export async function guardarPersona(d: DatosPersona, id: Uuid | null = null): Promise<Persona> {
  await esperar()
  exigirRol(contexto(), ['AD'])
  const actual = id ? personaDe(id) : undefined
  if (id && !actual) falla('NO_ENCONTRADO', 404, 'La persona no existe.')
  if (actual && !actual.activa) falla('ESTADO_INVALIDO', 409, 'La persona está dada de baja.')
  const nombre = exigirTexto(d.nombre, 'Escribe el nombre completo.')
  const correo = exigirTexto(d.correo, 'Escribe el correo.').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) falla('VALIDACION', 422, 'Escribe un correo válido.')
  if (db.personas.some((p) => p.id !== id && p.correo === correo)) falla('CONFLICTO', 409, 'Ya existe un usuario con este correo.')
  if (!areaDe(d.id_area)?.activa) falla('VALIDACION', 422, 'Elige el área de adscripción.')
  if (!ROLES.includes(d.rol)) falla('VALIDACION', 422, 'Elige el rol.')
  // shortcut: la contraseña inicial y su hash no se simulan; el servicio real la guarda con hash (O-34, D-49).
  const persona: db.PersonaSemilla = actual ?? { id: crypto.randomUUID(), nombre, correo, rol: d.rol, id_area: d.id_area, activa: true }
  Object.assign(persona, { nombre, correo, rol: d.rol, id_area: d.id_area })
  if (!actual) db.personas.push(persona)
  vaciarTitularidades(persona)
  return aPersona(persona)
}

/** O-34 Baja lógica: conserva sus movimientos; si era titular, el área queda vacante. */
export async function darDeBajaPersona(id: Uuid): Promise<void> {
  await esperar()
  const ctx = contexto()
  exigirRol(ctx, ['AD'])
  const persona = personaDe(id)
  if (!persona) falla('NO_ENCONTRADO', 404, 'La persona no existe.')
  if (persona.id === ctx.id_persona) falla('VALIDACION', 422, 'No puedes darte de baja a ti mismo.')
  persona.activa = false
  vaciarTitularidades(persona)
}

const TIPOS_ACTOR: db.TipoActorSemilla[] = ['institucion', 'municipio', 'proveedor', 'ciudadano']

const documentosDeActor = (nombre: string) =>
  db.documentos.filter((d) => d.tipo_emisor === 'externo' && d.emisor === nombre).length +
  db.salidas.filter((s) => s.destinatario === nombre).length

/** O-35: actores externos con cuántos documentos tienen. Oficialía y administración. */
export async function obtenerActores(): Promise<Listado<ActorExterno>> {
  await esperar()
  exigirRol(contexto(), ['OF', 'AD'])
  return structuredClone(listado(db.actores.map((a) => ({ ...a, documentos: documentosDeActor(a.nombre) }))))
}

/** O-35 Gestionar actores externos: crear (sin id) o actualizar. */
export async function guardarActor(d: DatosActor, id: Uuid | null = null): Promise<ActorExterno> {
  await esperar()
  exigirRol(contexto(), ['OF', 'AD'])
  const actual = id ? db.actores.find((a) => a.id === id) : undefined
  if (id && !actual) falla('NO_ENCONTRADO', 404, 'El actor no existe.')
  const nombre = exigirTexto(d.nombre, 'Escribe el nombre del actor.')
  if (!TIPOS_ACTOR.includes(d.tipo)) falla('VALIDACION', 422, 'Elige el tipo de actor.')
  if (db.actores.some((a) => a.id !== id && a.nombre.toLowerCase() === nombre.toLowerCase()))
    falla('CONFLICTO', 409, 'Ya existe un actor con ese nombre.')
  const actor: db.ActorSemilla = actual ?? { id: crypto.randomUUID(), nombre, tipo: d.tipo, correo: null, telefono: null, activo: true }
  // shortcut: la semilla liga documentos y salidas por nombre; el servicio real usa el id del actor (RI-06).
  if (actual && actual.nombre !== nombre) {
    for (const doc of db.documentos) if (doc.tipo_emisor === 'externo' && doc.emisor === actual.nombre) doc.emisor = nombre
    for (const s of db.salidas) if (s.destinatario === actual.nombre) s.destinatario = nombre
  }
  Object.assign(actor, { nombre, tipo: d.tipo, correo: d.correo?.trim() || null, telefono: d.telefono?.trim() || null })
  if (!actual) db.actores.push(actor)
  return { ...actor, documentos: documentosDeActor(nombre) }
}

/** O-35: no se elimina, se desactiva (D-20): deja de ofrecerse al registrar y conserva sus documentos. */
export async function desactivarActor(id: Uuid): Promise<void> {
  await esperar()
  exigirRol(contexto(), ['OF', 'AD'])
  const actor = db.actores.find((a) => a.id === id)
  if (!actor) falla('NO_ENCONTRADO', 404, 'El actor no existe.')
  actor.activo = false
}
