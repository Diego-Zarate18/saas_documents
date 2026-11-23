// Hooks de TanStack Query sobre las funciones de la API.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '.'
import type { Canal, Conclusion, Correccion, DestinoRelacion, DestinoTurno, Devolucion, FiltrosBandeja, NuevoAnexo, TipoRelacion, Uuid } from './tipos'

export const useCatalogos = () => useQuery({ queryKey: ['catalogos'], queryFn: api.obtenerCatalogos })

export const useAreas = () => useQuery({ queryKey: ['areas'], queryFn: api.obtenerAreas })

/** O-14 */
export const useBandeja = (filtros: FiltrosBandeja) =>
  useQuery({ queryKey: ['bandeja', filtros], queryFn: () => api.obtenerBandeja(filtros) })

/** O-11 */
export const useFicha = (id: Uuid) => useQuery({ queryKey: ['ficha', id], queryFn: () => api.obtenerFicha(id) })

/** C1 */
export const useRecorrido = (id: Uuid | undefined) =>
  useQuery({
    queryKey: ['recorrido', id],
    queryFn: () => api.obtenerRecorrido(id ?? ''),
    enabled: id !== undefined,
  })

/** C3 */
export const useRebotes = (habilitado: boolean) =>
  useQuery({ queryKey: ['rebotes'], queryFn: api.obtenerRebotes, enabled: habilitado })

export const usePosiblesDuplicados = (habilitado: boolean) =>
  useQuery({ queryKey: ['posibles-duplicados'], queryFn: api.obtenerPosiblesDuplicados, enabled: habilitado })

/** D-58 */
export const useAcuses = (habilitado: boolean) =>
  useQuery({ queryKey: ['acuses'], queryFn: api.obtenerAcuses, enabled: habilitado })

/** Vista previa del folio en V-03 (D-21). */
export const useFolioSiguiente = () => useQuery({ queryKey: ['folio-siguiente'], queryFn: api.obtenerFolioSiguiente })

/** O-30 para los selectores de documento; sin texto no consulta. */
export const useBuscarDocumentos = (texto: string) =>
  useQuery({ queryKey: ['buscar', texto], queryFn: () => api.buscarDocumentos(texto), enabled: texto.trim() !== '' })

/**
 * Toda escritura cambia bandejas, fichas, recorridos, acuses o el folio siguiente. Al terminar, las
 * consultas que no están en pantalla se descartan (al volver a una vista se ve su esqueleto, nunca datos
 * anteriores a la operación) y las que sí están se vuelven a leer antes de dar la operación por terminada,
 * así el modal se cierra sobre la ficha ya actualizada.
 */
function useEscritura<A, R>(operacion: (datos: A) => Promise<R>) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: operacion,
    onSuccess: () => {
      cliente.removeQueries({ type: 'inactive' })
      return cliente.invalidateQueries()
    },
  })
}

/** O-01 */
export const useRegistrarDocumento = () => useEscritura(api.registrarDocumento)
/** O-19 */
export const useSegundaRecepcion = (id: Uuid) =>
  useEscritura((d: { canal: Canal; fecha_recepcion: string }) => api.registrarSegundaRecepcion(id, d.canal, d.fecha_recepcion))
/** O-24 */
export const useCancelar = (id: Uuid) => useEscritura((motivo: string) => api.cancelarDocumento(id, motivo))
/** O-25 */
export const useCorregirMovimiento = () =>
  useEscritura((d: Correccion & { id_movimiento: Uuid }) => api.corregirMovimiento(d.id_movimiento, d))
/** O-03 */
export const useTurnar = (id: Uuid) => useEscritura((destinos: DestinoTurno[]) => api.turnar(id, destinos))
/** O-22 */
export const useDevolver = (id: Uuid) => useEscritura((d: Devolucion) => api.devolver(id, d))
/** O-23 */
export const useAtraer = (id: Uuid) => useEscritura((justificacion: string) => api.atraer(id, justificacion))
/** O-05 */
export const useConcluir = (id: Uuid) => useEscritura((c: Conclusion) => api.concluir(id, c))
/** O-07 */
export const useRelacionar = (id: Uuid) =>
  useEscritura((d: { tipo: TipoRelacion; destino: DestinoRelacion }) => api.relacionar(id, d.tipo, d.destino))
/** O-18 */
export const useQuitarRelacion = (id: Uuid) =>
  useEscritura((d: { tipo: TipoRelacion; referencia: string; emisor: string | null }) =>
    api.quitarRelacion(id, d.tipo, d.referencia, d.emisor),
  )
/** O-20 */
export const useRegistrarSalida = () => useEscritura(api.registrarSalida)
/** O-21 */
export const useRegistrarAcuse = () =>
  useEscritura((d: { id_salida: Uuid; fecha_hora: string; recibio: string }) => api.registrarAcuse(d.id_salida, d.fecha_hora, d.recibio))
/** O-28 */
export const useAgregarAnexo = (id: Uuid) => useEscritura((a: NuevoAnexo) => api.agregarAnexo(id, a))
/** O-29 */
export const useAgregarNota = (id: Uuid) => useEscritura((texto: string) => api.agregarNota(id, texto))
