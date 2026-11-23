// Tipos escritos a mano que siguen el contrato de docs/arquitectura.md, sección 4
// (snake_case, UUID, fechas ISO 8601, errores con `codigo`, listados `{ elementos, total }`).
// Se reemplazan por los generados del OpenAPI en T-15.

export type Uuid = string
/** Fecha y hora ISO 8601 con zona horaria. */
export type FechaHora = string
/** Fecha ISO 8601 sin hora (AAAA-MM-DD). */
export type Fecha = string

export type Rol = 'OF' | 'DI' | 'TI' | 'PE' | 'AD'
export type RolTurno = 'responsable' | 'apoyo' | 'conocimiento'
export type EstadoDocumento = 'en_tramite' | 'concluido' | 'cancelado' | 'sin_efecto'
export type TipoMovimiento = 'registro' | 'turno' | 'devolucion'
/** Catálogo cerrado de D-32. */
export type MotivoDevolucion =
  | 'falta_informacion'
  | 'falta_firma'
  | 'falta_anexo'
  | 'corregir_dato'
  | 'no_competencia'
/** Las cuatro relaciones de D-05. */
export type TipoRelacion = 'responde_a' | 'da_seguimiento_a' | 'en_alcance_a' | 'sustituye_a'

export type CodigoError =
  | 'NO_AUTENTICADO'
  | 'SIN_PERMISO'
  | 'NO_ENCONTRADO'
  | 'VALIDACION'
  | 'DUPLICADO'
  | 'ESTADO_INVALIDO'
  | 'CONFLICTO'
  | 'BASE_NO_DISPONIBLE'

/** Problem details (RFC 9457) con `codigo` estable. */
export interface Problema {
  title: string
  status: number
  detail?: string
  codigo: CodigoError
}

export class ErrorDeApi extends Error {
  readonly problema: Problema
  constructor(problema: Problema) {
    super(problema.detail ?? problema.title)
    this.name = 'ErrorDeApi'
    this.problema = problema
  }
}

export interface Listado<T> {
  elementos: T[]
  total: number
}

// ── Sesión (O-36, O-37, O-38) ──────────────────────────────────────────────

export interface Sesion {
  id_persona: Uuid
  nombre: string
  rol: Rol
  id_area: Uuid | null
  nombre_area: string | null
}

export interface Credenciales {
  correo: string
  contrasena: string
}

// ── Organización (O-32) ────────────────────────────────────────────────────

export interface Area {
  id: Uuid
  nombre: string
  siglas: string
  id_titular: Uuid | null
  nombre_titular: string | null
}

// ── Bandeja (O-14) ─────────────────────────────────────────────────────────

export interface FiltrosBandeja {
  /** Oficialía y dirección eligen el área; titular y personal siempre ven la suya. */
  id_area?: Uuid
  tipo?: string
  antiguedad_minima?: number
  pagina?: number
  tamano?: number
}

export interface PendienteBandeja {
  id_documento: Uuid
  folio: string
  asunto: string
  tipo: string
  emisor: string
  rol: Exclude<RolTurno, 'conocimiento'>
  /** Días naturales desde que el área lo recibió (D-07). */
  antiguedad_dias: number
  titular_al_turnar: string | null
  titular_ya_no_adscrito: boolean
  ultimo_movimiento: { tipo: TipoMovimiento; descripcion: string }
  posible_duplicado: boolean
  confidencial: boolean
}

/** Catálogos (O-31). */
export interface Catalogos {
  tipos_documento: string[]
}

/** Documento marcado como posible duplicado que espera revisión (O-26). */
export interface ResumenDocumento {
  id: Uuid
  folio: string
  asunto: string
}

/** Resumen de C3 (D-32). */
export interface Rebote {
  id_documento: Uuid
  folio: string
  motivo: string
}

/** Salida con acuse cuyo documento de origen está pendiente en el área como responsable (D-58). */
export interface Acuse {
  id_salida: Uuid
  folio_salida: string
  id_documento: Uuid
  folio_documento: string
  acusado_por: string
}

// ── Ficha (O-11) ───────────────────────────────────────────────────────────

export interface Movimiento {
  id: Uuid
  tipo: TipoMovimiento
  /** Mismo valor en los movimientos de un turno simultáneo (D-18). */
  id_grupo_turno: Uuid | null
  area_origen: string | null
  area_destino: string
  rol: RolTurno
  instruccion: string | null
  motivo: MotivoDevolucion | null
  persona: string
  titular_al_turnar: string | null
  fecha_hora: FechaHora
}

export interface UbicacionActual {
  area: string
  rol: Exclude<RolTurno, 'conocimiento'>
  desde: FechaHora
  antiguedad_dias: number
  /** Descripción del movimiento que lo dejó ahí, por ejemplo «Turnado de nuevo por oficialía». */
  llegada: string
}

export interface RegistroDocumento {
  id: Uuid
  folio: string
  /** Nulo cuando el documento es de otra área y el usuario solo ve estado y responsable (D-29). */
  asunto: string | null
  tipo: string
  estado: EstadoDocumento
  confidencial: boolean
  posible_duplicado: boolean
  numero_emisor: string | null
  emisor: string
  tipo_emisor: 'area' | 'externo'
  fecha_documento: Fecha
  medio_recepcion: string
  fecha_recepcion: FechaHora
  fecha_oficial: Fecha
  origen_fecha_oficial: string
  /** Nula si el contenido está oculto por D-29. */
  sintesis: string | null
}

export interface CampoExpediente {
  etiqueta: string
  valor: string
}

export interface Anexo {
  id: Uuid
  titulo: string
  hojas: number
  ubicacion: string
}

export interface Nota {
  id: Uuid
  area: string
  autor: string
  fecha_hora: FechaHora
  texto: string
}

export interface Expediente {
  campos: CampoExpediente[]
  anexos: Anexo[]
  notas: Nota[]
}

export interface Relacion {
  tipo: TipoRelacion
  /** Nulo si el destino no está registrado (D-33). */
  id_documento: Uuid | null
  referencia: string
  descripcion: string | null
  estado: EstadoDocumento | null
}

export interface AsuntoResumen {
  id: Uuid
  nombre: string
}

export type SeccionFicha = 'expediente' | 'recorrido' | 'relaciones'

export interface Ficha {
  /** «restringido»: documento de otra área; solo estado y responsable (D-29). */
  acceso: 'completo' | 'restringido'
  /** El contenido confidencial está oculto para este usuario (D-29). */
  contenido_oculto: boolean
  registro: RegistroDocumento
  ubicacion_actual: UbicacionActual[]
  expediente: Expediente | null
  recorrido: Movimiento[] | null
  relaciones: Relacion[] | null
  asuntos: AsuntoResumen[] | null
  /** Secciones que no respondieron (D-53). */
  secciones_no_disponibles: SeccionFicha[]
}

// ── Turnar (O-03) ──────────────────────────────────────────────────────────

export interface DestinoTurno {
  id_area: Uuid
  rol: RolTurno
  instruccion: string
}

export interface ResultadoTurno {
  id_grupo_turno: Uuid
  movimientos: Movimiento[]
}
