import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { Rol } from '../api/tipos'
import { SinPermiso } from '../paginas/sin-permiso/SinPermiso'
import { useSesion } from '../sesion/sesion'
import { inicioDe } from './menu'

/** Lleva a la primera opción del menú del rol. */
export function IrAlInicio() {
  const rol = useSesion().data?.rol
  return rol ? <Navigate to={inicioDe(rol)} replace /> : null
}

/** Sin sesión, manda a V-01; con un rol que no corresponde, muestra el aviso de «sin permiso». */
export function RutaProtegida({ roles, children }: { roles?: Rol[]; children: ReactNode }) {
  const sesion = useSesion()
  const ubicacion = useLocation()
  if (sesion.isPending) return null
  if (!sesion.data) return <Navigate to="/iniciar-sesion" replace state={{ desde: ubicacion.pathname }} />
  if (roles && !roles.includes(sesion.data.rol)) return <SinPermiso />
  return children
}
