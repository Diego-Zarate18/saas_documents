// Cliente de la API real (D-108): implementa ApiSigedoc con fetch sobre /api. En desarrollo Vite reenvía /api al
// backend, así la cookie de sesión httpOnly (D-49) es del mismo origen. Los errores RFC 9457 se convierten a
// ErrorApi, el único error que leen las páginas; un fallo de red o un 5xx sin cuerpo llega como Error y la vista
// muestra su texto de respaldo.
import type { ApiSigedoc } from './contrato'
import type {
  Acuse,
  ActorExterno,
  AlcanceAsunto,
  Area,
  AreaOrganizacion,
  Asunto,
  Catalogos,
  CodigoError,
  ComparacionDuplicado,
  DocumentoEncontrado,
  DocumentoExistente,
  DocumentoRegistrado,
  Ficha,
  FiltrosBusqueda,
  HiloAsunto,
  Listado,
  Movimiento,
  PendienteBandeja,
  Persona,
  Rebote,
  ResultadoBusqueda,
  ResultadoTurno,
  ResumenDocumento,
  Salida,
  Sesion,
  Uuid,
} from './tipos'
import { ErrorApi } from './tipos'

type Parametros = Record<string, string | number | null | undefined>

interface ProblemDetails {
  codigo?: CodigoError
  title?: string
  detail?: string | null
  status?: number
  existente?: DocumentoExistente
}

function aError(estado: number, cuerpo: ProblemDetails | undefined): Error {
  if (cuerpo?.codigo && cuerpo.title) {
    return new ErrorApi({
      codigo: cuerpo.codigo,
      titulo: cuerpo.title,
      detalle: cuerpo.detail ?? null,
      estado_http: cuerpo.status ?? estado,
      existente: cuerpo.existente,
    })
  }
  return new Error(`La API respondió ${estado}`)
}

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown, parametros?: Parametros): Promise<T> {
  const consulta = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') consulta.set(clave, String(valor))
  }
  const url = `/api${ruta}${consulta.size > 0 ? `?${consulta}` : ''}`
  const respuesta = await fetch(url, {
    method: metodo,
    credentials: 'include',
    headers: cuerpo === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  const texto = respuesta.status === 204 ? '' : await respuesta.text()
  const datos: unknown = texto ? JSON.parse(texto) : undefined
  if (!respuesta.ok) throw aError(respuesta.status, datos as ProblemDetails | undefined)
  return datos as T
}

const leer = <T>(ruta: string, parametros?: Parametros) => pedir<T>('GET', ruta, undefined, parametros)
const enviar = <T>(ruta: string, cuerpo: unknown = {}) => pedir<T>('POST', ruta, cuerpo)
const guardar = <T>(ruta: string, id: Uuid | null | undefined, cuerpo: unknown) =>
  id ? pedir<T>('PATCH', `${ruta}/${id}`, cuerpo) : pedir<T>('POST', ruta, cuerpo)

/** V-06: el filtro por campo del tipo viaja como dos parámetros (D-46). */
function parametrosDeBusqueda({ campo_tipo, ...resto }: FiltrosBusqueda = {}): Parametros {
  return { ...resto, campo_tipo: campo_tipo?.clave, valor_campo: campo_tipo?.valor }
}

export const api: ApiSigedoc = {
  // Sesión (O-36 a O-38)
  iniciarSesion: (credenciales) => enviar<Sesion>('/sesiones', credenciales),
  obtenerSesionActual: () => leer<Sesion>('/sesiones/actual'),
  cerrarSesion: () => pedir<void>('DELETE', '/sesiones/actual'),

  // Catálogos y organización (O-31 a O-35)
  obtenerCatalogos: () => leer<Catalogos>('/catalogos'),
  obtenerAreas: () => leer<Listado<Area>>('/areas', { activas: 'true' }),
  obtenerOrganizacion: () => leer<Listado<AreaOrganizacion>>('/organizacion'),
  guardarArea: (datos, id) => guardar<Area>('/areas', id, datos),
  desactivarArea: (id) => enviar<void>(`/areas/${id}/desactivacion`),
  obtenerPersonas: () => leer<Listado<Persona>>('/personas'),
  guardarPersona: (datos, id) => guardar<Persona>('/personas', id, datos),
  darDeBajaPersona: (id) => enviar<void>(`/personas/${id}/baja`),
  obtenerActores: () => leer<Listado<ActorExterno>>('/actores-externos'),
  guardarActor: (datos, id) => guardar<ActorExterno>('/actores-externos', id, datos),
  desactivarActor: (id) => enviar<void>(`/actores-externos/${id}/desactivacion`),

  // Consultas
  obtenerBandeja: (filtros = {}) => leer<Listado<PendienteBandeja>>('/bandeja', { ...filtros }),
  obtenerFicha: (id) => leer<Ficha>(`/documentos/${id}`),
  obtenerRecorrido: (id) => leer<Movimiento[]>(`/documentos/${id}/recorrido`),
  obtenerRebotes: (filtros = {}) => leer<Listado<Rebote>>('/consultas/rebotes', { ...filtros }),
  obtenerPosiblesDuplicados: () => leer<Listado<ResumenDocumento>>('/consultas/posibles-duplicados'),
  obtenerComparacionDuplicado: (id) => leer<ComparacionDuplicado>(`/consultas/posibles-duplicados/${id}/comparacion`),
  obtenerAcuses: () => leer<Listado<Acuse>>('/consultas/acuses'),
  obtenerFolioSiguiente: () => leer<string>('/documentos/folio-siguiente'),
  buscarDocumentos: (texto) => leer<Listado<DocumentoEncontrado>>('/consultas/selector-documentos', { texto }),
  buscar: (filtros) => leer<Listado<ResultadoBusqueda>>('/documentos', parametrosDeBusqueda(filtros)),
  obtenerSalidas: (acuse) => leer<Listado<Salida>>('/salidas', { acuse }),
  obtenerAsuntos: (texto = '') => leer<Listado<Asunto>>('/asuntos', { texto }),
  obtenerHiloAsunto: (id) => leer<HiloAsunto>(`/asuntos/${id}/hilo`),
  obtenerAlcanceAsunto: (id) => leer<AlcanceAsunto>(`/asuntos/${id}/alcance`),

  // Escrituras. Las que devuelven un movimiento lo traen con ids; las páginas no lo leen, vuelven a consultar.
  registrarDocumento: (datos) => enviar<DocumentoRegistrado>('/documentos', datos),
  registrarSegundaRecepcion: (id, canal, fecha_recepcion) =>
    enviar<void>(`/documentos/${id}/recepciones`, { canal, fecha_recepcion }),
  cancelarDocumento: (id, motivo) => enviar<void>(`/documentos/${id}/cancelacion`, { motivo }),
  corregirMovimiento: (idMovimiento, { rol, motivo }) =>
    enviar<Movimiento>(`/movimientos/${idMovimiento}/correcciones`, { rol, motivo }),
  turnar: (idDocumento, destinos) => enviar<ResultadoTurno>(`/documentos/${idDocumento}/turnos`, { destinos }),
  devolver: (id, devolucion) => enviar<Movimiento>(`/documentos/${id}/devoluciones`, devolucion),
  atraer: (id, justificacion) => enviar<Movimiento>(`/documentos/${id}/atracciones`, { justificacion }),
  concluir: (id, conclusion) => enviar<Movimiento>(`/documentos/${id}/conclusion`, conclusion),
  relacionar: (id, tipo, destino) => enviar<void>(`/documentos/${id}/referencias`, { tipo, destino }),
  quitarRelacion: (id, tipo, referencia, emisor) =>
    pedir<void>('DELETE', `/documentos/${id}/referencias/${tipo}`, undefined, { referencia, emisor }),
  registrarSalida: (salida) => enviar<DocumentoRegistrado>('/salidas', salida),
  registrarAcuse: (idSalida, fecha_hora, recibio) => enviar<void>(`/salidas/${idSalida}/acuses`, { fecha_hora, recibio }),
  agregarAnexo: (id, anexo) => enviar<void>(`/documentos/${id}/expediente/anexos`, anexo),
  agregarNota: (id, texto) => enviar<void>(`/documentos/${id}/expediente/notas`, { texto }),
  asignarAsunto: (idDocumento, idAsunto) => enviar<void>(`/asuntos/${idAsunto}/documentos`, { id_documento: idDocumento }),
  crearAsunto: (asunto, idDocumento) => enviar<Asunto>('/asuntos', { ...asunto, id_documento: idDocumento ?? null }),
  sacarDeAsunto: (idDocumento, idAsunto) => pedir<void>('DELETE', `/asuntos/${idAsunto}/documentos/${idDocumento}`),
  resolverDuplicado: (idPosterior, idOtro, decision) =>
    enviar<void>(`/documentos/${idPosterior}/resolucion-duplicado`, { id_otro: idOtro, decision }),
}
