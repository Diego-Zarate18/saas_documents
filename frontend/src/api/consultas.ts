// Hooks de TanStack Query sobre las funciones de la API.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '.'
import type { DestinoTurno, FiltrosBandeja, Uuid } from './tipos'

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

/** O-03. Un turno cambia bandejas, fichas, recorridos y acuses: se invalida todo. */
export function useTurnar(idDocumento: Uuid) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (destinos: DestinoTurno[]) => api.turnar(idDocumento, destinos),
    onSuccess: () => cliente.invalidateQueries(),
  })
}
