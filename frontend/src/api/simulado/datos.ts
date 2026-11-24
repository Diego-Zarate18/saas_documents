// Semilla de la fuente simulada (D-63): los folios, áreas, personas y recorridos del Figma «SIGEDOC».
// Es lo que el servidor real guardaría en sus bases; la interfaz solo lo ve a través de servidor.ts.
//
// Las vistas del Figma muestran «5 de 24» pendientes en oficialía y «5 de 9» en Compras. Los
// documentos que el Figma no dibuja (marcados «relleno») completan esos totales con asuntos genéricos.
//
// El estado inicial es el de V-02 y V-04: OP-2026-0139 está en Oficialía de partes tras la devolución
// de Compras. V-05 lo vuelve a turnar y el resultado es lo que muestran V-02b, V-04b y V-04e.

import type {
  AsuntoResumen,
  CampoTipo,
  Canal,
  EstadoDocumento,
  Expediente,
  FormaConclusion,
  MotivoDevolucion,
  Relacion,
  Rol,
  RolTurno,
  TipoDocumento,
  TipoMovimiento,
  Uuid,
} from '../tipos'

// shortcut: reloj fijo para que antigüedades y capturas coincidan con el Figma; desaparece con la API real (T-15).
export const HOY = '2026-11-22T12:00:00-06:00'

/** UUID determinista y legible para la semilla. */
const uuid = (n: number): Uuid => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/** Fecha y hora de noviembre de 2026 en America/Mexico_City (sin horario de verano desde 2022). */
const nov = (dia: number, hora = '09:00') => `2026-11-${String(dia).padStart(2, '0')}T${hora}:00-06:00`

// ── Áreas ──────────────────────────────────────────────────────────────────

export interface AreaSemilla {
  id: Uuid
  nombre: string
  /** Como aparece en «Turnado por …» en la bandeja del Figma. */
  nombre_corto: string
  siglas: string
  id_titular: Uuid | null
  /** Área de la que depende (O-33, D-47); nula solo en la raíz. */
  id_padre: Uuid | null
  /** Se desactiva, no se borra (D-20). */
  activa: boolean
}

export const AREA = {
  oficialia: uuid(101),
  direccion: uuid(102),
  compras: uuid(103),
  finanzas: uuid(104),
  sistemas: uuid(105),
  juridico: uuid(106),
  administracion: uuid(107),
  rrhh: uuid(108),
  servicios: uuid(109),
  transparencia: uuid(110),
  vinculacion: uuid(111),
  contraloria: uuid(112),
  archivo: uuid(113),
}

export const PERSONA = {
  marta: uuid(201),
  ana: uuid(202),
  raul: uuid(203),
  elena: uuid(204),
  jorge: uuid(205),
  luis: uuid(206),
  sergio: uuid(207),
  pedro: uuid(208),
  laura: uuid(209),
  hugo: uuid(210),
  irma: uuid(211),
  oscar: uuid(212),
  pablo: uuid(213),
  carmen: uuid(214),
}

const nuevaArea = (id: Uuid, nombre: string, siglas: string, id_titular: Uuid | null, id_padre: Uuid | null = AREA.direccion, activa = true, nombre_corto = nombre): AreaSemilla => ({
  id,
  nombre,
  nombre_corto,
  siglas,
  id_titular,
  id_padre,
  activa,
})

// V-16 y V-17: Dirección General es la raíz; Transparencia depende de Jurídico. Las áreas de T-01 y T-02a
// conservan sus nombres y titulares; las nuevas son las del Figma.
export const areas: AreaSemilla[] = [
  nuevaArea(AREA.oficialia, 'Oficialía de partes', 'OP', null, AREA.direccion, true, 'Oficialía'),
  nuevaArea(AREA.direccion, 'Dirección General', 'DG', PERSONA.ana, null, true, 'Dirección'),
  nuevaArea(AREA.compras, 'Compras', 'CO', PERSONA.raul),
  nuevaArea(AREA.finanzas, 'Finanzas', 'FI', PERSONA.elena),
  nuevaArea(AREA.sistemas, 'Sistemas', 'SIS', null),
  nuevaArea(AREA.juridico, 'Jurídico', 'JU', null),
  nuevaArea(AREA.administracion, 'Administración', 'AD', PERSONA.luis),
  nuevaArea(AREA.rrhh, 'Recursos Humanos', 'RH', null),
  nuevaArea(AREA.servicios, 'Servicios Generales', 'SG', PERSONA.pedro),
  nuevaArea(AREA.transparencia, 'Unidad de Transparencia', 'UT', PERSONA.laura, AREA.juridico, true, 'Transparencia'),
  // Vacante: su titular se dio de baja (O-34).
  nuevaArea(AREA.vinculacion, 'Vinculación', 'VI', null),
  nuevaArea(AREA.contraloria, 'Contraloría interna', 'CI', PERSONA.hugo),
  nuevaArea(AREA.archivo, 'Archivo de concentración', 'AR', null, AREA.direccion, false),
]

// ── Personas y usuarios de prueba ──────────────────────────────────────────

export interface PersonaSemilla {
  id: Uuid
  nombre: string
  /** Nulo si no tiene usuario. */
  correo: string | null
  rol: Rol | null
  /** Nulo si ya no está adscrita a ninguna área. */
  id_area: Uuid | null
  /** Baja lógica (O-34): conserva sus movimientos y ya no entra. */
  activa: boolean
}

const nuevaPersona = (id: Uuid, nombre: string, correo: string | null, rol: Rol | null, id_area: Uuid | null, activa = true) => ({
  id,
  nombre,
  correo,
  rol,
  id_area,
  activa,
})

/** En modo simulado cualquier contraseña no vacía es válida. */
export const personas: PersonaSemilla[] = [
  nuevaPersona(PERSONA.marta, 'Marta Flores', 'mflores@institucion.gob.mx', 'OF', AREA.oficialia),
  nuevaPersona(PERSONA.ana, 'Lic. Ana López', 'alopez@institucion.gob.mx', 'DI', AREA.direccion),
  nuevaPersona(PERSONA.raul, 'Ing. Raúl Pérez', 'rperez@institucion.gob.mx', 'TI', AREA.compras),
  nuevaPersona(PERSONA.elena, 'C.P. Elena Díaz', 'ediaz@institucion.gob.mx', 'TI', AREA.finanzas),
  nuevaPersona(PERSONA.jorge, 'Jorge Ruiz', 'jruiz@institucion.gob.mx', 'PE', AREA.compras),
  nuevaPersona(PERSONA.luis, 'Mtro. Luis Gómez', 'lgomez@institucion.gob.mx', 'AD', AREA.administracion),
  // Extitular de Jurídico: aparece como «titular al turnar» ya no adscrito (V-02).
  nuevaPersona(PERSONA.sergio, 'Lic. Sergio Ruiz', null, null, null, false),
  nuevaPersona(PERSONA.pedro, 'Arq. Pedro Mena', 'pmena@institucion.gob.mx', 'TI', AREA.servicios),
  nuevaPersona(PERSONA.laura, 'Mtra. Laura Ortiz', 'lortiz@institucion.gob.mx', 'TI', AREA.transparencia),
  nuevaPersona(PERSONA.hugo, 'C.P. Hugo Ramos', 'hramos@institucion.gob.mx', 'TI', AREA.contraloria),
  nuevaPersona(PERSONA.irma, 'Lic. Irma Vela', 'ivela@institucion.gob.mx', 'PE', AREA.vinculacion),
  nuevaPersona(PERSONA.oscar, 'Ing. Óscar Paz', 'opaz@institucion.gob.mx', 'PE', AREA.vinculacion),
  // V-16: segunda persona de oficialía; registra documentos que Marta no ha movido (D-29).
  nuevaPersona(PERSONA.carmen, 'Lic. Carmen Ruiz', 'cruiz@institucion.gob.mx', 'OF', AREA.oficialia),
  // V-18: dado de baja; era titular de Vinculación, que quedó vacante.
  nuevaPersona(PERSONA.pablo, 'Lic. Pablo Rangel', 'prangel@institucion.gob.mx', 'TI', AREA.vinculacion, false),
]

// ── Actores externos (O-35, RI-06) ─────────────────────────────────────────

export type TipoActorSemilla = 'institucion' | 'municipio' | 'proveedor' | 'ciudadano'

export interface ActorSemilla {
  id: Uuid
  nombre: string
  tipo: TipoActorSemilla
  correo: string | null
  telefono: string | null
  /** Con documentos no se borra: se desactiva y deja de ofrecerse al registrar. */
  activo: boolean
}

const actor = (n: number, nombre: string, tipo: TipoActorSemilla, correo: string | null = null, telefono: string | null = null, activo = true): ActorSemilla => ({
  id: uuid(n),
  nombre,
  tipo,
  correo,
  telefono,
  activo,
})

// Los de V-19 y los emisores que ya usaban los documentos de T-01 y T-02a, con el mismo nombre.
export const actores: ActorSemilla[] = [
  actor(601, 'Auditoría Superior de la Federación', 'institucion', 'oficialia@asf.gob.mx'),
  actor(602, 'Municipio de Tuxtla · Sec. de Economía', 'municipio', null, '961 612 5511'),
  actor(603, 'Dell México, S.A. de C.V.', 'proveedor', 'ventas.gob@dell.com', '55 5258 1000'),
  actor(604, 'Juan Hernández Gómez', 'ciudadano', 'jhg@correo.mx'),
  actor(605, 'Mobiliario del Sur', 'proveedor', null, '961 145 0090'),
  actor(606, 'Papelería Central', 'proveedor', null, null, false),
  actor(607, 'Órgano Interno de Control', 'institucion'),
  actor(608, 'Universidad Tecnológica', 'institucion'),
  actor(609, 'Gobierno del estado', 'institucion'),
  actor(610, 'Proveedor externo', 'proveedor'),
  actor(611, 'Ciudadano', 'ciudadano'),
]

// ── Asuntos (O-27, O-08; nodo Asunto de Neo4j, D-24) ───────────────────────

export interface AsuntoSemilla {
  id: Uuid
  nombre: string
  descripcion: string
  id_creador: Uuid
  fecha: string
}

export const ASUNTO = { laboratorios: uuid(401), presupuesto: uuid(402), auditoria: uuid(403) }

// ── Documentos ─────────────────────────────────────────────────────────────

export interface DocumentoSemilla {
  id: Uuid
  folio: string
  asunto: string
  tipo: TipoDocumento
  estado: EstadoDocumento
  confidencial: boolean
  posible_duplicado: boolean
  extemporaneo: boolean
  numero_emisor: string | null
  emisor: string
  tipo_emisor: 'area' | 'externo'
  fecha_documento: string | null
  canal: Canal
  fecha_recepcion: string
  segunda_recepcion: { canal: Canal; fecha_recepcion: string } | null
  fecha_oficial: string
  origen_fecha_oficial: string
  sintesis: string
  expediente: Expediente
  relaciones: Relacion[]
  asuntos: AsuntoResumen[]
  /** O-24 (D-20): el documento no se borra; se guarda por qué se canceló. */
  motivo_cancelacion: string | null
  /** O-26: cancelado por ser el mismo que este documento, registrado antes. */
  duplicado_de?: Uuid
}

export interface MovimientoSemilla {
  id: Uuid
  id_documento: Uuid
  tipo: TipoMovimiento
  id_corrige: Uuid | null
  id_grupo_turno: Uuid | null
  id_area_origen: Uuid | null
  /** Solo en «atraccion» (D-68): las demás áreas que lo tenían como responsables también son origen. */
  otros_origenes?: Uuid[]
  id_area_destino: Uuid
  rol: RolTurno
  instruccion: string | null
  motivo: MotivoDevolucion | null
  forma_conclusion: FormaConclusion | null
  /** Solo en «devolucion» (O-22): returno a un área sugerida; sin ella, «no_competencia» cuenta como rebote (D-32). */
  con_area_sugerida?: boolean
  id_persona: Uuid
  id_titular_al_turnar: Uuid | null
  fecha_hora: string
}

export const documentos: DocumentoSemilla[] = []
export const movimientos: MovimientoSemilla[] = []

let siguiente = 1000
const nuevoId = () => uuid(siguiente++)

const expedienteVacio = (): Expediente => ({ datos_tipo: {}, anexos: [], notas: [] })

interface DatosDocumento {
  folio: string
  asunto: string
  tipo: TipoDocumento
  emisor: string
  tipo_emisor?: 'area' | 'externo'
  registro: string
  canal?: Canal
  estado?: EstadoDocumento
  confidencial?: boolean
  posible_duplicado?: boolean
  numero_emisor?: string
  sintesis?: string
  /** Quien lo registra; Marta Flores por omisión. */
  registra?: Uuid
}

/** Crea el documento con su movimiento de registro hacia oficialía (responsable). */
function documento(d: DatosDocumento, extra: Partial<DocumentoSemilla> = {}): Uuid {
  const id = nuevoId()
  documentos.push({
    id,
    folio: d.folio,
    asunto: d.asunto,
    tipo: d.tipo,
    estado: d.estado ?? 'en_tramite',
    confidencial: d.confidencial ?? false,
    posible_duplicado: d.posible_duplicado ?? false,
    extemporaneo: false,
    numero_emisor: d.numero_emisor ?? null,
    emisor: d.emisor,
    tipo_emisor: d.tipo_emisor ?? 'externo',
    fecha_documento: d.registro.slice(0, 10),
    canal: d.canal ?? 'papel',
    fecha_recepcion: d.registro,
    segunda_recepcion: null,
    fecha_oficial: d.registro.slice(0, 10),
    origen_fecha_oficial: d.canal === 'correo' ? 'correo' : 'sello',
    sintesis: d.sintesis ?? d.asunto,
    expediente: expedienteVacio(),
    relaciones: [],
    asuntos: [],
    motivo_cancelacion: null,
    ...extra,
  })
  movimientos.push({
    id: nuevoId(),
    id_documento: id,
    tipo: 'registro',
    id_corrige: null,
    id_grupo_turno: null,
    id_area_origen: null,
    id_area_destino: AREA.oficialia,
    rol: 'responsable',
    instruccion: null,
    motivo: null,
    forma_conclusion: null,
    id_persona: d.registra ?? PERSONA.marta,
    id_titular_al_turnar: null,
    fecha_hora: d.registro,
  })
  return id
}

const titularDe = (idArea: Uuid) => areas.find((a) => a.id === idArea)?.id_titular ?? null

/** Destino de un turno: [área, rol, instrucción, titular al turnar si el Figma muestra otro]. */
type Destino = [Uuid, RolTurno, string?, (Uuid | null)?]

function turno(idDoc: Uuid, fecha: string, origen: Uuid, persona: Uuid, destinos: Destino[]) {
  const grupo = nuevoId()
  for (const [area, rol, instruccion, titular] of destinos) {
    movimientos.push({
      id: nuevoId(),
      id_documento: idDoc,
      tipo: 'turno',
      id_corrige: null,
      id_grupo_turno: grupo,
      id_area_origen: origen,
      id_area_destino: area,
      rol,
      instruccion: instruccion ?? null,
      motivo: null,
      forma_conclusion: null,
      id_persona: persona,
      id_titular_al_turnar: titular === undefined ? titularDe(area) : titular,
      fecha_hora: fecha,
    })
  }
}

function devolucion(
  idDoc: Uuid,
  fecha: string,
  origen: Uuid,
  destino: Uuid,
  persona: Uuid,
  motivo: MotivoDevolucion,
  titular: Uuid | null = titularDe(destino),
) {
  movimientos.push({
    id: nuevoId(),
    id_documento: idDoc,
    tipo: 'devolucion',
    id_corrige: null,
    id_grupo_turno: null,
    id_area_origen: origen,
    id_area_destino: destino,
    rol: 'responsable',
    instruccion: null,
    motivo,
    forma_conclusion: null,
    id_persona: persona,
    id_titular_al_turnar: titular,
    fecha_hora: fecha,
  })
}

const SOLICITUD = 'solicitud_material_pago'
const AUDITORIA = 'requerimiento_auditoria'
const TRANSPARENCIA = 'solicitud_transparencia'
const OFICIO = 'oficio'
const OIC = 'Órgano Interno de Control'

// ── Documentos del Figma ───────────────────────────────────────────────────

const d0087 = documento(
  {
    folio: 'OP-2026-0087',
    asunto: 'Solicitud de equipamiento de laboratorios 2026',
    tipo: OFICIO,
    emisor: 'Sistemas',
    tipo_emisor: 'area',
    registro: '2026-03-10T10:00:00-06:00',
    estado: 'concluido',
  },
  { asuntos: [{ id: ASUNTO.laboratorios, nombre: 'Equipamiento de laboratorios 2026' }] },
)
turno(d0087, '2026-03-10T12:00:00-06:00', AREA.oficialia, PERSONA.marta, [[AREA.compras, 'responsable']])

// V-02, V-04 y V-05: OP-2026-0139
export const ID_0139 = documento(
  {
    folio: 'OP-2026-0139',
    asunto: 'Requisición de material de cómputo',
    tipo: SOLICITUD,
    emisor: 'Sistemas',
    tipo_emisor: 'area',
    numero_emisor: 'SIS/0231/2026',
    registro: nov(18, '09:12'),
    sintesis:
      'Solicitud de 12 equipos de cómputo para el laboratorio de redes, con cargo al presupuesto 2026.',
  },
  {
    fecha_documento: '2026-11-17',
    expediente: {
      // El Figma dibuja también «Monto estimado», de ejemplo; D-66 no admite montos por tipo.
      datos_tipo: { concepto: 'Equipo de cómputo de escritorio (12 piezas)' },
      anexos: [
        { id: uuid(301), titulo: 'Cotización de proveedor', hojas: 4, ubicacion: 'Archivo de oficialía, gaveta 2' },
        { id: uuid(302), titulo: 'Ficha técnica de los equipos', hojas: 2, ubicacion: 'Archivo de oficialía, gaveta 2' },
      ],
      notas: [
        {
          id: uuid(311),
          tipo: 'general',
          area: 'Compras',
          autor: 'Ing. Raúl Pérez',
          fecha_hora: nov(21, '10:05'),
          texto: 'Se devuelve: falta la cotización firmada por el proveedor. Las demás hojas están completas.',
        },
      ],
    },
    relaciones: [
      {
        tipo: 'da_seguimiento_a',
        id_documento: d0087,
        referencia: 'OP-2026-0087',
        descripcion: 'Solicitud de equipamiento de laboratorios 2026',
        estado: 'concluido',
      },
      // No registrado: la descripción guarda su emisor (D-33).
      { tipo: 'en_alcance_a', id_documento: null, referencia: 'SIS/0198/2026', descripcion: 'Sistemas', estado: null },
    ],
    asuntos: [{ id: ASUNTO.laboratorios, nombre: 'Equipamiento de laboratorios 2026' }],
  },
)
turno(ID_0139, nov(18, '11:40'), AREA.oficialia, PERSONA.marta, [
  [AREA.compras, 'responsable'],
  [AREA.finanzas, 'conocimiento'],
])
// El Figma (V-02) muestra a Ing. Raúl Pérez como titular al turnar de esta devolución.
devolucion(ID_0139, nov(21, '10:05'), AREA.compras, AREA.oficialia, PERSONA.raul, 'falta_anexo', PERSONA.raul)

documento(
  {
    folio: 'OP-2026-0143',
    asunto: 'Requerimiento de información',
    tipo: AUDITORIA,
    emisor: OIC,
    registro: nov(22, '08:30'),
  },
  {
    expediente: {
      datos_tipo: { ente_auditor: OIC, puntos: ['Contratos de servicios generales 2025'] },
      anexos: [],
      notas: [],
    },
  },
)

documento(
  {
    folio: 'OP-2026-0141',
    asunto: 'Solicitud de acceso a la información',
    tipo: TRANSPARENCIA,
    emisor: 'Ciudadano',
    registro: nov(21, '13:20'),
    canal: 'correo',
    posible_duplicado: true,
  },
  { expediente: { datos_tipo: { solicitante: 'Ciudadano' }, anexos: [], notas: [] } },
)

const d0137 = documento({
  folio: 'OP-2026-0137',
  asunto: 'Dictamen técnico de infraestructura',
  tipo: OFICIO,
  emisor: 'Dirección General',
  tipo_emisor: 'area',
  registro: nov(16, '10:00'),
})
turno(d0137, nov(16, '12:00'), AREA.oficialia, PERSONA.marta, [[AREA.direccion, 'responsable']])
turno(d0137, nov(17, '09:30'), AREA.direccion, PERSONA.ana, [
  [AREA.juridico, 'responsable', 'Emitir el dictamen'],
  // El Figma (V-02) muestra a Lic. Ana López como titular al turnar en oficialía.
  [AREA.oficialia, 'apoyo', 'Integrar los antecedentes', PERSONA.ana],
  [AREA.compras, 'apoyo', 'Revisar el costo estimado'],
])

const d0129 = documento({
  folio: 'OP-2026-0129',
  asunto: 'Queja por atención en ventanilla',
  tipo: OFICIO,
  emisor: 'Ciudadano',
  registro: nov(12, '11:00'),
  confidencial: true,
  sintesis: 'Queja de una persona usuaria por el trato recibido en ventanilla el 10 de noviembre.',
})
turno(d0129, nov(13, '09:00'), AREA.oficialia, PERSONA.marta, [[AREA.juridico, 'responsable', undefined, PERSONA.sergio]])
devolucion(d0129, nov(14, '16:00'), AREA.juridico, AREA.oficialia, PERSONA.sergio, 'no_competencia', PERSONA.sergio)

// V-02b y V-02c (Compras)
const d0152 = documento({
  folio: 'OP-2026-0152',
  asunto: 'Cotización de papelería 2027',
  tipo: SOLICITUD,
  emisor: 'Administración',
  tipo_emisor: 'area',
  registro: nov(20, '09:10'),
})
turno(d0152, nov(20, '10:00'), AREA.oficialia, PERSONA.marta, [[AREA.compras, 'responsable']])

const d0148 = documento({
  folio: 'OP-2026-0148',
  asunto: 'Orden de compra de mobiliario',
  tipo: OFICIO,
  emisor: 'Finanzas',
  tipo_emisor: 'area',
  registro: nov(18, '12:00'),
})
turno(d0148, nov(18, '13:00'), AREA.oficialia, PERSONA.marta, [[AREA.finanzas, 'responsable']])
turno(d0148, nov(19, '10:00'), AREA.finanzas, PERSONA.elena, [
  [AREA.administracion, 'responsable', 'Recibir el mobiliario'],
  [AREA.compras, 'apoyo', 'Emitir la orden de compra'],
])

const d0133 = documento({
  folio: 'OP-2026-0133',
  asunto: 'Auditoría de adquisiciones 2026',
  tipo: AUDITORIA,
  emisor: OIC,
  registro: nov(13, '09:00'),
})
turno(d0133, nov(13, '11:00'), AREA.oficialia, PERSONA.marta, [[AREA.direccion, 'responsable']])
turno(d0133, nov(14, '09:00'), AREA.direccion, PERSONA.ana, [[AREA.compras, 'responsable', 'Atender el requerimiento']])

// Rebotes (V-02, resumen de C3)
const d0118 = documento({
  folio: 'OP-2026-0118',
  asunto: 'Solicitud de apoyo para evento institucional',
  tipo: OFICIO,
  emisor: 'Recursos Humanos',
  tipo_emisor: 'area',
  registro: nov(10, '10:00'),
})
turno(d0118, nov(11, '09:00'), AREA.oficialia, PERSONA.marta, [[AREA.administracion, 'responsable']])
devolucion(d0118, nov(12, '12:00'), AREA.administracion, AREA.oficialia, PERSONA.luis, 'no_competencia')

const d0097 = documento({
  folio: 'OP-2026-0097',
  asunto: 'Propuesta de convenio de colaboración',
  tipo: OFICIO,
  emisor: 'Universidad Tecnológica',
  registro: nov(2, '10:00'),
})
turno(d0097, nov(3, '09:00'), AREA.oficialia, PERSONA.marta, [[AREA.juridico, 'responsable']])
turno(d0097, nov(5, '09:00'), AREA.juridico, PERSONA.sergio, [[AREA.administracion, 'responsable']])
turno(d0097, nov(9, '09:00'), AREA.administracion, PERSONA.luis, [[AREA.finanzas, 'responsable']])
turno(d0097, nov(12, '09:00'), AREA.finanzas, PERSONA.elena, [[AREA.direccion, 'responsable']])

const d0131 = documento({
  folio: 'OP-2026-0131',
  asunto: 'Constancia de no adeudo',
  tipo: OFICIO,
  emisor: 'Ciudadano',
  registro: nov(4, '10:00'),
})
turno(d0131, nov(5, '09:00'), AREA.oficialia, PERSONA.marta, [[AREA.rrhh, 'responsable']])
devolucion(d0131, nov(6, '09:00'), AREA.rrhh, AREA.oficialia, PERSONA.marta, 'falta_informacion')
turno(d0131, nov(7, '09:00'), AREA.oficialia, PERSONA.marta, [[AREA.rrhh, 'responsable']])
devolucion(d0131, nov(8, '09:00'), AREA.rrhh, AREA.oficialia, PERSONA.marta, 'falta_firma')
turno(d0131, nov(9, '09:00'), AREA.oficialia, PERSONA.marta, [[AREA.finanzas, 'responsable']])
devolucion(d0131, nov(10, '09:00'), AREA.finanzas, AREA.oficialia, PERSONA.elena, 'corregir_dato')

// V-06: confidencial de otra área para oficialía (Marta no tiene movimiento en él, D-29).
const d0109 = documento({
  folio: 'OP-2026-0109',
  asunto: 'Denuncia sobre una adjudicación directa',
  tipo: OFICIO,
  emisor: 'Ciudadano',
  numero_emisor: 'DEN-0045',
  registro: nov(9, '10:00'),
  confidencial: true,
  registra: PERSONA.carmen,
  sintesis: 'Denuncia anónima sobre la adjudicación directa de un contrato de servicios de cómputo.',
})
turno(d0109, nov(9, '12:00'), AREA.oficialia, PERSONA.carmen, [[AREA.juridico, 'responsable']])

// Rebotes: C3 los detecta en el recorrido (servidor.ts); OP-2026-0118, 0129, 0097 y 0131 cumplen alguna regla de D-32.

// V-14: OP-2026-0141 llegó por correo sin número; OP-2026-0140, del mismo emisor y fecha, se registró antes.
const d0140 = documento(
  {
    folio: 'OP-2026-0140',
    asunto: 'Solicitud de acceso a la información sobre contratos',
    tipo: TRANSPARENCIA,
    emisor: 'Ciudadano',
    numero_emisor: 'SAI-0233',
    registro: nov(21, '08:30'),
    sintesis: 'Solicitud de acceso a la información sobre los contratos de limpieza 2026.',
  },
  { expediente: { datos_tipo: { solicitante: 'Ciudadano' }, anexos: [], notas: [] } },
)
turno(d0140, nov(21, '09:30'), AREA.oficialia, PERSONA.marta, [[AREA.transparencia, 'responsable']])

// Salidas externas (O-20) con su acuse (O-21, D-58): el Figma las muestra en V-02b, V-02c y V-09.
export interface SalidaSemilla {
  id: Uuid
  folio: string
  tipo: TipoDocumento
  numero: string
  id_area_emisora: Uuid
  destinatario: string
  sintesis: string
  id_responde_a: Uuid | null
  fecha_hora: string
  acuse: { fecha_hora: string; recibio: string } | null
}

const salida = (
  n: number,
  folio: string,
  idRespondeA: Uuid | null,
  sintesis: string,
  recibio: string,
  { emisora = AREA.compras, dia = 20, acuse = 21 }: { emisora?: Uuid; dia?: number; acuse?: number | null } = {},
): SalidaSemilla => ({
  id: uuid(n),
  folio,
  tipo: OFICIO,
  numero: folio,
  id_area_emisora: emisora,
  destinatario: recibio,
  sintesis,
  id_responde_a: idRespondeA,
  fecha_hora: nov(dia, '12:00'),
  acuse: acuse === null ? null : { fecha_hora: nov(acuse, '12:00'), recibio },
})

export const salidas: SalidaSemilla[] = [
  salida(501, 'CO-2026-0048', ID_0139, 'Oficio de respuesta a Sistemas', 'Sistemas'),
  salida(502, 'CO-2026-0049', d0152, 'Cotización de papelería enviada', 'Administración'),
  salida(503, 'CO-2026-0046', d0133, 'Respuesta al requerimiento de auditoría', 'el OIC'),
  // V-13: salidas a actores externos, con el folio de su área emisora (D-21).
  salida(504, 'UT-2026-0001', d0140, 'Respuesta a la solicitud de acceso a la información', 'Ciudadano', {
    emisora: AREA.transparencia,
    dia: 22,
    acuse: null,
  }),
  salida(505, 'SG-2026-0001', null, 'Solicitud de cotización de mobiliario', 'Mobiliario del Sur', { emisora: AREA.servicios, dia: 17, acuse: 18 }),
  salida(506, 'CI-2026-0001', null, 'Informe de avance a la Auditoría Superior', 'Auditoría Superior de la Federación', {
    emisora: AREA.contraloria,
    dia: 19,
    acuse: 20,
  }),
  salida(507, 'VI-2026-0001', null, 'Invitación a la feria de empleo', 'Municipio de Tuxtla · Sec. de Economía', {
    emisora: AREA.vinculacion,
    dia: 19,
    acuse: null,
  }),
]

/** Asuntos de V-11 y V-11b; la pertenencia vive en cada documento (PERTENECE_A). */
export const asuntos: AsuntoSemilla[] = [
  {
    id: ASUNTO.laboratorios,
    nombre: 'Equipamiento de laboratorios 2026',
    descripcion: 'Compras de equipo para los laboratorios de redes y telecomunicaciones.',
    id_creador: PERSONA.raul,
    fecha: '2026-10-02T10:00:00-06:00',
  },
  {
    id: ASUNTO.presupuesto,
    nombre: 'Presupuesto de inversión 2026',
    descripcion: 'Solicitudes con cargo al presupuesto de inversión del ejercicio 2026.',
    id_creador: PERSONA.elena,
    fecha: '2026-10-15T10:00:00-06:00',
  },
  {
    id: ASUNTO.auditoria,
    nombre: 'Auditoría ASF 2025 · cuenta pública',
    descripcion: 'Requerimientos y respuestas de la revisión de la cuenta pública 2025.',
    id_creador: PERSONA.raul,
    fecha: '2026-11-13T10:00:00-06:00',
  },
]

const asignar = (idAsunto: Uuid, ...folios: string[]) => {
  const { id, nombre } = asuntos.find((a) => a.id === idAsunto) as AsuntoSemilla
  for (const folio of folios) documentos.find((d) => d.folio === folio)?.asuntos.push({ id, nombre })
}

// ── Relleno: completa los totales que muestran los indicadores del Figma ──
// Oficialía: 24 pendientes (18 como responsable, 6 como apoyo), el más antiguo de 12 días.
// Compras: 9 pendientes después del turno de V-05 (7 responsable, 2 apoyo), el más antiguo de 8 días.

const rellenoOficialia: [folio: string, asunto: string, tipo: TipoDocumento, emisor: string, dia: number][] = [
  ['OP-2026-0101', 'Solicitud de constancia de servicio', OFICIO, 'Ciudadano', 10],
  ['OP-2026-0103', 'Petición de información sobre licitación', TRANSPARENCIA, 'Ciudadano', 10],
  ['OP-2026-0102', 'Solicitud de prórroga de entrega', OFICIO, 'Proveedor externo', 10],
  ['OP-2026-0105', 'Solicitud de baja de bienes muebles', SOLICITUD, 'Proveedor externo', 11],
  ['OP-2026-0104', 'Solicitud de reembolso de viáticos', SOLICITUD, 'Recursos Humanos', 11],
  ['OP-2026-0106', 'Aviso de cambio de domicilio fiscal', OFICIO, 'Proveedor externo', 11],
  ['OP-2026-0107', 'Solicitud de acceso a contratos 2025', TRANSPARENCIA, 'Ciudadano', 12],
  ['OP-2026-0108', 'Requerimiento de expedientes de personal', AUDITORIA, OIC, 12],
  ['OP-2026-0110', 'Invitación a foro regional', OFICIO, 'Gobierno del estado', 13],
  ['OP-2026-0111', 'Solicitud de pago a proveedor', SOLICITUD, 'Proveedor externo', 13],
  ['OP-2026-0112', 'Petición de copia certificada', OFICIO, 'Ciudadano', 13],
  ['OP-2026-0113', 'Solicitud de mantenimiento de aulas', SOLICITUD, 'Recursos Humanos', 14],
]
rellenoOficialia.forEach(([folio, asunto, tipo, emisor, dia], i) =>
  documento({ folio, asunto, tipo, emisor, registro: nov(dia), posible_duplicado: i < 2 }),
)

const rellenoApoyoOficialia: [folio: string, asunto: string, dia: number][] = [
  ['OP-2026-0114', 'Programa anual de adquisiciones', 13],
  ['OP-2026-0115', 'Calendario de cierre del ejercicio', 13],
  ['OP-2026-0116', 'Lineamientos de archivo institucional', 14],
  ['OP-2026-0117', 'Informe de avance de metas', 14],
  ['OP-2026-0119', 'Plan de capacitación 2027', 12],
]
for (const [folio, asunto, dia] of rellenoApoyoOficialia) {
  const id = documento({ folio, asunto, tipo: OFICIO, emisor: 'Dirección General', tipo_emisor: 'area', registro: nov(dia - 2) })
  turno(id, nov(dia - 1), AREA.oficialia, PERSONA.marta, [[AREA.direccion, 'responsable']])
  turno(id, nov(dia), AREA.direccion, PERSONA.ana, [
    [AREA.administracion, 'responsable'],
    [AREA.oficialia, 'apoyo', 'Integrar los antecedentes'],
  ])
}

const rellenoCompras: [folio: string, asunto: string, confidencial: boolean][] = [
  ['OP-2026-0121', 'Requisición de mobiliario de oficina', false],
  ['OP-2026-0123', 'Solicitud de servicio de fotocopiado', false],
  ['OP-2026-0124', 'Inconformidad de proveedor en licitación', true],
  ['OP-2026-0126', 'Requisición de consumibles de impresión', false],
]
for (const [folio, asunto, confidencial] of rellenoCompras) {
  const id = documento({ folio, asunto, tipo: SOLICITUD, emisor: 'Proveedor externo', registro: nov(13), confidencial })
  turno(id, nov(14), AREA.oficialia, PERSONA.marta, [[AREA.compras, 'responsable']])
}

const rellenoFinanzas: [folio: string, asunto: string][] = [
  ['OP-2026-0127', 'Solicitud de ampliación presupuestal'],
  ['OP-2026-0128', 'Conciliación bancaria de octubre'],
]
for (const [folio, asunto] of rellenoFinanzas) {
  const id = documento({ folio, asunto, tipo: SOLICITUD, emisor: 'Sistemas', tipo_emisor: 'area', registro: nov(17) })
  turno(id, nov(17, '12:00'), AREA.oficialia, PERSONA.marta, [[AREA.finanzas, 'responsable']])
}

// Pertenencias de los asuntos de V-11b (después del relleno, que incluye OP-2026-0127).
asignar(ASUNTO.presupuesto, 'OP-2026-0127', 'OP-2026-0148')
asignar(ASUNTO.auditoria, 'OP-2026-0133', 'OP-2026-0143')

/** Los siete tipos de D-65. */
export const tiposDocumento: TipoDocumento[] = [
  'oficio',
  'solicitud_material_pago',
  'requerimiento_auditoria',
  'solicitud_transparencia',
  'memorandum',
  'circular',
  'informe',
]

/** D-66: campos propios por tipo; los otros cuatro tipos no tienen. T-05 la reemplaza por el esquema de MongoDB (D-55). */
export const camposTipo: Partial<Record<TipoDocumento, CampoTipo[]>> = {
  requerimiento_auditoria: [
    { clave: 'ente_auditor', etiqueta: 'Ente auditor', forma: 'texto', obligatorio: true },
    { clave: 'puntos', etiqueta: 'Puntos de auditoría', forma: 'lista', obligatorio: false },
  ],
  solicitud_transparencia: [{ clave: 'solicitante', etiqueta: 'Solicitante', forma: 'texto', obligatorio: true }],
  solicitud_material_pago: [{ clave: 'concepto', etiqueta: 'Concepto', forma: 'texto', obligatorio: false }],
}

/** Para las pruebas: id de un documento por su folio. */
export const idPorFolio = (folio: string): Uuid => {
  const doc = documentos.find((d) => d.folio === folio)
  if (!doc) throw new Error(`No existe ${folio} en la semilla`)
  return doc.id
}
