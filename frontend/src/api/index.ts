// Punto único de acceso a la API (D-63). Las páginas solo importan de aquí o de consultas.ts.
// VITE_API_MODO elige la fuente: «simulado» por omisión; T-15 agrega «real» con el cliente del OpenAPI.
import type { ApiSigedoc } from './contrato'
import * as simulado from './simulado/servidor'

/** Con otro modo, main.tsx muestra «La API real aún no está disponible» en lugar de la aplicación. */
export const API_DISPONIBLE = (import.meta.env.VITE_API_MODO ?? 'simulado') === 'simulado'

// shortcut: el simulador se importa también en modo «real», que aún no monta la aplicación; T-15 elige aquí el cliente real.
const api: ApiSigedoc = simulado

export const {
  usuariosDePrueba,
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
  buscar,
  obtenerAsuntos,
  obtenerHiloAsunto,
  obtenerAlcanceAsunto,
  asignarAsunto,
  crearAsunto,
  sacarDeAsunto,
  obtenerComparacionDuplicado,
  resolverDuplicado,
  obtenerSalidas,
  obtenerOrganizacion,
  guardarArea,
  desactivarArea,
  obtenerPersonas,
  guardarPersona,
  darDeBajaPersona,
  obtenerActores,
  guardarActor,
  desactivarActor,
} = api
