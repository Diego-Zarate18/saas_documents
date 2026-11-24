// Sesión y rol del usuario (O-36, O-37, O-38): la sesión es la cookie httpOnly de la API (D-49).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cerrarSesion, iniciarSesion, obtenerSesionActual } from '../api'

export const useSesion = () =>
  useQuery({ queryKey: ['sesion'], queryFn: obtenerSesionActual, retry: false, staleTime: Infinity })

export function useIniciarSesion() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: iniciarSesion,
    onSuccess: (sesion) => {
      cliente.clear()
      cliente.setQueryData(['sesion'], sesion)
    },
  })
}

export function useCerrarSesion() {
  const cliente = useQueryClient()
  return useMutation({ mutationFn: cerrarSesion, onSettled: () => cliente.clear() })
}
