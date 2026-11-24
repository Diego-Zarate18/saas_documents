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

export interface DocumentoExistente {
  id: Uuid
  folio: string
  numero_emisor: string
  emisor: string
  canal: Canal
  fecha_recepcion: FechaHora
}

/**
 * Único error que reciben las páginas (contrato, sección 4). El cliente real lo arma desde el *problem
 * details* (RFC 9457) de la respuesta: `title` → `titulo`, `detail` → `detalle`, `status` → `estado_http`.
 * Las páginas no leen sus textos: los muestran ErrorOperacion y EstadoConsulta con `mensajeDeError`.
 */
export class ErrorApi extends Error {
  readonly codigo: CodigoError
  readonly titulo: string
  readonly detalle: string | null
  readonly estado_http: number
  /** Con DUPLICADO (O-01, D-27): el documento que ya existe. */
  readonly existente?: DocumentoExistente
  constructor(e: { codigo: CodigoError; titulo: string; detalle?: string | null; estado_http: number; existente?: DocumentoExistente }) {
    super(e.detalle ?? e.titulo)
    this.name = 'ErrorApi'
    this.codigo = e.codigo
    this.titulo = e.titulo
    this.detalle = e.detalle ?? null
    this.estado_http = e.estado_http
    if (e.existente) this.existente = e.existente
  }
}

/** Texto que ve el usuario: el del servidor si es un ErrorApi; si no (red, fallo inesperado), el de respaldo. */
export const mensajeDeError = (error: unknown, respaldo: string) => (error instanceof ErrorApi ? error.titulo : respaldo)

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

export interface PersonaAdscrita {
  id: Uuid
  nombre: string
  rol: Rol | null
}

/** O-32: cada área con su dependencia, titular y personas adscritas; solo el estado actual (D-08). */
export interface AreaOrganizacion extends Area {
  id_padre: Uuid | null
  activa: boolean
  personas: PersonaAdscrita[]
  /** Documentos pendientes en el área (D-42): con pendientes no se desactiva (O-33). */
  pendientes: number
  /** Con folios emitidos las siglas no cambian (D-61). */
  con_folios: boolean
}

/** O-33 Gestionar áreas. */
export interface DatosArea {
  siglas: string
  nombre: string
  id_padre: Uuid | null
  id_titular: Uuid | null
}

/** O-34: persona con su usuario. */
export interface Persona {
  id: Uuid
  nombre: string
  correo: string | null
  id_area: Uuid | null
  nombre_area: string | null
  rol: Rol | null
  /** Baja lógica: conserva sus movimientos. */
  activa: boolean
}

export interface DatosPersona {
  nombre: string
  correo: string
  id_area: Uuid
  rol: Rol
}

export type TipoActor = 'institucion' | 'municipio' | 'proveedor' | 'ciudadano'

/** O-35: emisor de entradas y destinatario de salidas (RI-06). */
export interface ActorExterno {
  id: Uuid
  nombre: string
  tipo: TipoActor
  correo: string | null
  telefono: string | null
  activo: boolean
  /** Entradas que emitió y salidas que recibió. */
  documentos: number
}

export interface DatosActor {
  nombre: string
  tipo: TipoActor
  correo: string | null
  telefono: string | null
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
  /** Nulo si es confidencial y quien consulta no ve su contenido (D-29). */
  asunto: string | null
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
  /** Solo los activos: emisores y destinatarios que se ofrecen al registrar (RI-06, O-35). */
  actores_externos: Pick<ActorExterno, 'id' | 'nombre' | 'tipo'>[]
  /** Listas cerradas que la interfaz ofrece como opciones, en orden (T-02c: ninguna vive en las páginas). */
  motivos_devolucion: MotivoDevolucion[]
  formas_conclusion: FormaConclusion[]
  canales: Canal[]
  roles: Rol[]
  roles_turno: RolTurno[]
  estados_documento: EstadoDocumento[]
  tipos_relacion: TipoRelacion[]
  tipos_actor: TipoActor[]
}

/** Documento marcado como posible duplicado que espera revisión (O-26). */
export interface ResumenDocumento {
  id: Uuid
  folio: string
  asunto: string
  /** Por qué se marcó (D-27): sin número o sin fecha del documento. */
  falta: 'numero' | 'fecha'
}

/** Un lado de la comparación de V-14. */
export interface DocumentoComparado {
  id: Uuid
  folio: string
  numero_emisor: string | null
  emisor: string
  fecha_documento: Fecha | null
  canal: Canal
  fecha_recepcion: FechaHora
  sintesis: string
  estado: EstadoDocumento
  /** Área responsable hoy, si la hay. */
  ubicacion: string | null
}

export type Coincidencia = 'numero_emisor' | 'emisor' | 'fecha_documento' | 'sintesis'

/** O-26: el marcado y el candidato registrado antes, del mismo emisor. */
export interface ComparacionDuplicado {
  posterior: DocumentoComparado
  candidato: DocumentoComparado | null
  coincidencias: Coincidencia[]
}

export type DecisionDuplicado = 'mismo' | 'distintos'

/** Reglas de rebote de D-32; «sin motivo» no ocurre porque O-22 exige motivo. */
export type ReglaRebote = 'no_competencia_sin_area' | 'tres_devoluciones' | 'tres_areas'

export interface FiltrosRebotes {
  /** Mes AAAA-MM de los movimientos (D-50); por omisión, el actual. */
  periodo?: string
  id_area?: Uuid
}

/** C3 Rebotes entre áreas (D-32). */
export interface Rebote {
  id_documento: Uuid
  folio: string
  /** Nulo si el contenido es confidencial y no lo ve (D-29). */
  asunto: string | null
  reglas: ReglaRebote[]
  /** Áreas distintas por las que pasó como responsable, sin contar oficialía. */
  areas: number
  /** Área responsable hoy. */
  ubicacion: string | null
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

/** Con acceso restringido solo traen valor folio, tipo, estado y las marcas (D-29, T-07). */
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
  emisor: string | null
  tipo_emisor: 'area' | 'externo' | null
  /** Nula si el documento no trae fecha (queda como posible duplicado). */
  fecha_documento: Fecha | null
  /** Primera recepción; el folio se asigna con ella (D-28). */
  canal: Canal | null
  fecha_recepcion: FechaHora | null
  /** Segunda recepción por el otro canal (O-19). */
  segunda_recepcion: { canal: Canal; fecha_recepcion: FechaHora } | null
  fecha_oficial: Fecha | null
  origen_fecha_oficial: string | null
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
  /** «entra»: el otro documento apunta a este (AG-05). */
  sentido: 'sale' | 'entra'
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
  /** Es una salida externa (O-20), no un documento recibido. */
  salida: boolean
}

/** Campos propios con índice parcial (D-46): los únicos por los que se busca. */
export type CampoBuscable = 'ente_auditor' | 'solicitante'

/** O-30 Buscar documentos. Todos los filtros son opcionales; la paginación es obligatoria. */
export interface FiltrosBusqueda {
  texto?: string
  folio?: string
  numero?: string
  emisor?: string
  tipo?: TipoDocumento
  estado?: EstadoDocumento
  /** Fecha de recepción, inclusive. */
  desde?: Fecha
  hasta?: Fecha
  campo_tipo?: { clave: CampoBuscable; valor: string }
  pagina?: number
  tamano?: number
}

export interface ResultadoBusqueda {
  id: Uuid
  folio: string
  /** Nulo fuera de la visibilidad (D-29). */
  numero_emisor: string | null
  /** Nula fuera de la visibilidad o si es confidencial y no la ve (D-29). */
  sintesis: string | null
  tipo: TipoDocumento
  estado: EstadoDocumento
  area_responsable: string | null
  /** «restringida»: de otra área, solo estado y responsable; «confidencial»: sin contenido. */
  visibilidad: 'completa' | 'restringida' | 'confidencial'
}

// ── Asuntos (O-08, O-18, O-27, C2, C5) ─────────────────────────────────────

export interface Asunto {
  id: Uuid
  nombre: string
  descripcion: string
  creador: string
  fecha: FechaHora
  /** Documentos que pertenecen al asunto. */
  documentos: number
  /** Áreas responsables hoy de esos documentos. */
  areas: string[]
}

export interface NuevoAsunto {
  nombre: string
  descripcion: string
}

/** Un documento del hilo de C2. */
export interface NodoHilo {
  /** Para abrir la ficha; nulo en salidas y no registrados. */
  id_documento: Uuid | null
  referencia: string
  /** Asunto del documento, síntesis de la salida o emisor del no registrado; nula sin visibilidad (D-29). */
  descripcion: string | null
  estado: EstadoDocumento | null
  /** Falso en los DocumentoNoRegistrado (D-33). */
  registrado: boolean
  /** Pertenece al asunto; los demás llegan por relaciones. */
  pertenece: boolean
  /** Relación con el nodo anterior del hilo: «entra» si este apunta al anterior. Nula en los que pertenecen. */
  relacion: { tipo: TipoRelacion; sentido: 'entra' | 'sale' } | null
  /** Saltos desde el documento del asunto (D-50: hasta 6). */
  profundidad: number
}

/** C2 Hilo de un asunto y C5 Alcance. */
export interface HiloAsunto {
  asunto: Asunto
  nodos: NodoHilo[]
}

export interface AlcanceAsunto {
  areas: { area: string; documentos: number }[]
  /** Solo de los documentos cuyo contenido ve (D-29). */
  personas: string[]
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
  folio_responde_a: string | null
  area_emisora: string
  fecha_hora: FechaHora
  acuse: { fecha_hora: FechaHora; recibio: string } | null
}

// ── Expediente (O-28, O-29) ────────────────────────────────────────────────

export interface NuevoAnexo {
  titulo: string
  hojas: number
  ubicacion: string
}
