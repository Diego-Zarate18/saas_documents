// Frontera de la API (T-02c, D-63): lo único que las páginas pueden pedir al servidor. El simulador la
// implementa hoy; en T-15 el cliente generado del OpenAPI la implementa sin tocar las páginas.
// El detalle de cada función (ruta, reglas, errores y pruebas) está en ai/handoff/borradores/contrato-api.md.
import type {
  Acuse,
  ActorExterno,
  AlcanceAsunto,
  Area,
  AreaOrganizacion,
  Asunto,
  Canal,
  Catalogos,
  ComparacionDuplicado,
  Conclusion,
  Correccion,
  Credenciales,
  DatosActor,
  DatosArea,
  DatosPersona,
  DecisionDuplicado,
  DestinoRelacion,
  DestinoTurno,
  Devolucion,
  DocumentoEncontrado,
  DocumentoRegistrado,
  Ficha,
  FiltrosBandeja,
  FiltrosBusqueda,
  FiltrosRebotes,
  HiloAsunto,
  Listado,
  Movimiento,
  NuevaSalida,
  NuevoAnexo,
  NuevoAsunto,
  NuevoDocumento,
  PendienteBandeja,
  Persona,
  Rebote,
  ResultadoBusqueda,
  ResultadoTurno,
  ResumenDocumento,
  Salida,
  Sesion,
  TipoRelacion,
  Uuid,
} from './tipos'

/** Toda función rechaza con `ErrorApi` (tipos.ts); los listados responden `{ elementos, total }`. */
export interface ApiSigedoc {
  /** Correos que V-01 sugiere. Solo el simulador tiene; la API real devuelve una lista vacía. */
  usuariosDePrueba: readonly string[]

  // Sesión
  iniciarSesion(credenciales: Credenciales): Promise<Sesion>
  obtenerSesionActual(): Promise<Sesion>
  cerrarSesion(): Promise<void>

  // Catálogos y organización
  obtenerCatalogos(): Promise<Catalogos>
  obtenerAreas(): Promise<Listado<Area>>
  obtenerOrganizacion(): Promise<Listado<AreaOrganizacion>>
  guardarArea(datos: DatosArea, id?: Uuid | null): Promise<Area>
  desactivarArea(id: Uuid): Promise<void>
  obtenerPersonas(): Promise<Listado<Persona>>
  guardarPersona(datos: DatosPersona, id?: Uuid | null): Promise<Persona>
  darDeBajaPersona(id: Uuid): Promise<void>
  obtenerActores(): Promise<Listado<ActorExterno>>
  guardarActor(datos: DatosActor, id?: Uuid | null): Promise<ActorExterno>
  desactivarActor(id: Uuid): Promise<void>

  // Consultas
  obtenerBandeja(filtros?: FiltrosBandeja): Promise<Listado<PendienteBandeja>>
  obtenerFicha(id: Uuid): Promise<Ficha>
  obtenerRecorrido(id: Uuid): Promise<Movimiento[]>
  obtenerRebotes(filtros?: FiltrosRebotes): Promise<Listado<Rebote>>
  obtenerPosiblesDuplicados(): Promise<Listado<ResumenDocumento>>
  obtenerComparacionDuplicado(id: Uuid): Promise<ComparacionDuplicado>
  obtenerAcuses(): Promise<Listado<Acuse>>
  obtenerFolioSiguiente(): Promise<string>
  buscarDocumentos(texto: string): Promise<Listado<DocumentoEncontrado>>
  buscar(filtros?: FiltrosBusqueda): Promise<Listado<ResultadoBusqueda>>
  obtenerSalidas(acuse?: 'con' | 'sin' | null): Promise<Listado<Salida>>
  obtenerAsuntos(texto?: string): Promise<Listado<Asunto>>
  obtenerHiloAsunto(id: Uuid): Promise<HiloAsunto>
  obtenerAlcanceAsunto(id: Uuid): Promise<AlcanceAsunto>

  // Escrituras
  registrarDocumento(datos: NuevoDocumento): Promise<DocumentoRegistrado>
  registrarSegundaRecepcion(id: Uuid, canal: Canal, fechaRecepcion: string): Promise<void>
  cancelarDocumento(id: Uuid, motivo: string): Promise<void>
  corregirMovimiento(idMovimiento: Uuid, correccion: Correccion): Promise<Movimiento>
  turnar(idDocumento: Uuid, destinos: DestinoTurno[]): Promise<ResultadoTurno>
  devolver(id: Uuid, devolucion: Devolucion): Promise<Movimiento>
  atraer(id: Uuid, justificacion: string): Promise<Movimiento>
  concluir(id: Uuid, conclusion: Conclusion): Promise<Movimiento>
  relacionar(id: Uuid, tipo: TipoRelacion, destino: DestinoRelacion): Promise<void>
  quitarRelacion(id: Uuid, tipo: TipoRelacion, referencia: string, emisor: string | null): Promise<void>
  registrarSalida(salida: NuevaSalida): Promise<DocumentoRegistrado>
  registrarAcuse(idSalida: Uuid, fechaHora: string, recibio: string): Promise<void>
  agregarAnexo(id: Uuid, anexo: NuevoAnexo): Promise<void>
  agregarNota(id: Uuid, texto: string): Promise<void>
  asignarAsunto(idDocumento: Uuid, idAsunto: Uuid): Promise<void>
  crearAsunto(asunto: NuevoAsunto, idDocumento?: Uuid | null): Promise<Asunto>
  sacarDeAsunto(idDocumento: Uuid, idAsunto: Uuid): Promise<void>
  resolverDuplicado(idPosterior: Uuid, idOtro: Uuid | null, decision: DecisionDuplicado): Promise<void>
}
