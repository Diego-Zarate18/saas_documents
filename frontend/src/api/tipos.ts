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
/** Devolver y returnar (O-22) son ambos «devolucion»; atraer (O-23), concluir (O-05) y corregir (O-25) dejan su movimiento. */
export type TipoMovimiento = 'registro' | 'turno' | 'devolucion' | 'atraccion' | 'conclusion' | 'correccion'
/** Los siete tipos de D-65. */
export type TipoDocumento =
  | 'oficio'
  | 'solicitud_material_pago'
  | 'requerimiento_auditoria'
  | 'solicitud_transparencia'
  | 'memorandum'
  | 'circular'
  | 'informe'
export type Canal = 'correo' | 'papel'
/** Catálogo cerrado de D-59. */
export type FormaConclusion = 'con_respuesta' | 'atencion_sin_oficio' | 'enterado' | 'no_procede' | 'duplicado'
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
  /** Con DUPLICADO (O-01, D-27): el documento que ya existe. */
  existente?: DocumentoExistente
}

export interface DocumentoExistente {
  id: Uuid
  folio: string
  numero_emisor: string
  emisor: string
  canal: Canal
  fecha_recepcion: FechaHora
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
  tipo?: TipoDocumento
  antiguedad_minima?: number
  pagina?: number
  tamano?: number
}

export interface PendienteBandeja {
  id_documento: Uuid
  folio: string
  asunto: string
  tipo: TipoDocumento
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

/**
 * Un campo propio de un tipo (D-66). El formulario de registro y la ficha se dibujan con esta tabla;
 * T-05 la reemplaza por el esquema versionado de MongoDB (D-55).
 */
export interface CampoTipo {
  clave: string
  etiqueta: string
  forma: 'texto' | 'lista'
  obligatorio: boolean
}

/** Contenido según el tipo: texto o lista de textos, por clave de campo. */
export type DatosTipo = Record<string, string | string[]>

/** Catálogos (O-31). */
export interface Catalogos {
  tipos_documento: TipoDocumento[]
  /** Solo los tipos con campos propios tienen entrada (D-66). */
  campos_tipo: Partial<Record<TipoDocumento, CampoTipo[]>>
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
  /** Con «correccion»: el movimiento original, que queda intacto (O-25). */
  id_corrige: Uuid | null
  /** Mismo valor en los movimientos de un turno simultáneo (D-18). */
  id_grupo_turno: Uuid | null
  area_origen: string | null
  area_destino: string
  rol: RolTurno
  /** Instrucción del turno, justificación de la atracción o motivo de la corrección. */
  instruccion: string | null
  motivo: MotivoDevolucion | null
  /** Con «conclusion» (D-59). */
  forma_conclusion: FormaConclusion | null
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
  tipo: TipoDocumento
  estado: EstadoDocumento
  confidencial: boolean
  posible_duplicado: boolean
  extemporaneo: boolean
  numero_emisor: string | null
  emisor: string
  tipo_emisor: 'area' | 'externo'
  /** Nula si el documento no trae fecha (queda como posible duplicado). */
  fecha_documento: Fecha | null
  /** Primera recepción; el folio se asigna con ella (D-28). */
  canal: Canal
  fecha_recepcion: FechaHora
  /** Segunda recepción por el otro canal (O-19). */
  segunda_recepcion: { canal: Canal; fecha_recepcion: FechaHora } | null
  fecha_oficial: Fecha
  origen_fecha_oficial: string
  /** Nula si el contenido está oculto por D-29. */
  sintesis: string | null
}

export interface Anexo {
  id: Uuid
  titulo: string
  hojas: number
  ubicacion: string
}

export interface Nota {
  id: Uuid
  /** «evidencia_atencion» sostiene una conclusión sin oficio (D-19) y no se elimina. */
  tipo: 'general' | 'evidencia_atencion'
  area: string
  autor: string
  fecha_hora: FechaHora
  texto: string
}

export interface Expediente {
  /** Datos del tipo (D-66); vacío en los tipos sin campos propios. */
  datos_tipo: DatosTipo
  anexos: Anexo[]
  notas: Nota[]
}

export interface Relacion {
  tipo: TipoRelacion
  /** Nulo si el destino no está registrado (D-33). */
  id_documento: Uuid | null
  referencia: string
  /** Asunto del registrado o emisor del no registrado (D-33). */
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

// ── Registro y recepción (O-01, O-19, O-24, O-25) ──────────────────────────

export interface NuevoDocumento {
  tipo: TipoDocumento
  numero_emisor: string | null
  tipo_emisor: 'area' | 'externo'
  /** Nombre del área interna o del actor externo (RI-06). */
  emisor: string
  fecha_documento: Fecha | null
  canal: Canal
  fecha_recepcion: FechaHora
  /** Texto corto para listados y búsqueda (D-43); también es el asunto. */
  sintesis: string
  confidencial: boolean
  extemporaneo: boolean
  datos_tipo: DatosTipo
}

export interface DocumentoRegistrado {
  id: Uuid
  folio: string
}

/** O-25: qué cambia en un movimiento de turno. Solo el rol, como dibuja V-15b. */
export interface Correccion {
  rol: RolTurno
  motivo: string
}

// ── Recorrido (O-22, O-23, O-05) ───────────────────────────────────────────

export interface Devolucion {
  motivo: MotivoDevolucion
  /** Con área, returna: esa área lo recibe como responsable. Sin área, regresa a quien lo envió. */
  id_area_sugerida: Uuid | null
  nota: string
}

export interface Conclusion {
  forma: FormaConclusion
  /** Obligatorio con «con_respuesta»: documento registrado o salida que responde a este. */
  id_respuesta: Uuid | null
  /** Obligatorio con «duplicado» (D-27). */
  id_original: Uuid | null
  /** Obligatoria con «atencion_sin_oficio» (evidencia) y «no_procede» (motivo). */
  nota: string
}

// ── Relaciones (O-07, O-18) y búsqueda para elegir un documento (O-30) ─────

export type DestinoRelacion = { id_documento: Uuid } | { numero: string; emisor: string }

/** Resultado de buscar un documento o una salida para relacionarlo o concluir con él. */
export interface DocumentoEncontrado {
  id: Uuid
  folio: string
  asunto: string
  fecha: FechaHora
}

// ── Salidas externas (O-20, O-21) ──────────────────────────────────────────

export interface NuevaSalida {
  tipo: TipoDocumento
  numero: string
  id_area_emisora: Uuid
  destinatario: string
  sintesis: string
  id_responde_a: Uuid | null
}

export interface Salida {
  id: Uuid
  folio: string
  sintesis: string
  destinatario: string
  id_responde_a: Uuid | null
  acuse: { fecha_hora: FechaHora; recibio: string } | null
}

// ── Expediente (O-28, O-29) ────────────────────────────────────────────────

export interface NuevoAnexo {
  titulo: string
  hojas: number
  ubicacion: string
}
