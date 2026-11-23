// Punto único de acceso a la API (D-63). Las páginas solo importan de aquí o de consultas.ts.
// VITE_API_MODO elige la fuente; en T-01 solo existe «simulado» y T-15 agrega «real».
import * as simulado from './simulado/servidor'

const modo = import.meta.env.VITE_API_MODO ?? 'simulado'
if (modo !== 'simulado') throw new Error(`VITE_API_MODO=${modo} no está disponible todavía; usa «simulado».`)

export const {
  iniciarSesion,
  obtenerSesionActual,
  cerrarSesion,
  obtenerCatalogos,
  obtenerAreas,
  obtenerBandeja,
  obtenerFicha,
  obtenerRecorrido,
  obtenerRebotes,
  obtenerPosiblesDuplicados,
  obtenerAcuses,
  obtenerFolioSiguiente,
  buscarDocumentos,
  registrarDocumento,
  registrarSegundaRecepcion,
  cancelarDocumento,
  corregirMovimiento,
  turnar,
  devolver,
  atraer,
  concluir,
  relacionar,
  quitarRelacion,
  registrarSalida,
  registrarAcuse,
  agregarAnexo,
  agregarNota,
} = simulado
