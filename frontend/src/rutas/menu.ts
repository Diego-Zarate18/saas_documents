// Menú por rol según el Figma y D-62. Es también la tabla de permisos de las rutas: un rol entra a una ruta
// solo si la opción está en su menú. La vista de cada opción está en rutas.tsx.
import type { Rol } from '../api/tipos'
import type { NombreIcono } from '../iconos/Icono'

export type ClaveOpcion =
  | 'bandeja'
  | 'registrar'
  | 'buscar'
  | 'salidas'
  | 'duplicados'
  | 'asuntos'
  | 'rebotes'
  | 'actores'
  | 'organizacion'
  | 'areas'
  | 'personas'

export interface Opcion {
  ruta: string
  etiqueta: string
  icono: NombreIcono
}

export const OPCIONES: Record<ClaveOpcion, Opcion> = {
  bandeja: { ruta: '/bandeja', etiqueta: 'Bandeja', icono: 'bandeja' },
  registrar: { ruta: '/registrar', etiqueta: 'Registrar documento', icono: 'registrar' },
  buscar: { ruta: '/buscar', etiqueta: 'Buscar', icono: 'buscar' },
  salidas: { ruta: '/salidas', etiqueta: 'Salidas externas', icono: 'salida' },
  duplicados: { ruta: '/posibles-duplicados', etiqueta: 'Posibles duplicados', icono: 'alerta' },
  asuntos: { ruta: '/asuntos', etiqueta: 'Asuntos', icono: 'asunto' },
  rebotes: { ruta: '/rebotes', etiqueta: 'Rebotes', icono: 'rebote' },
  actores: { ruta: '/actores-externos', etiqueta: 'Actores externos', icono: 'actor' },
  organizacion: { ruta: '/organizacion', etiqueta: 'Organización', icono: 'organizacion' },
  areas: { ruta: '/areas', etiqueta: 'Áreas', icono: 'organizacion' },
  personas: { ruta: '/personas', etiqueta: 'Personas y usuarios', icono: 'personas' },
}

export const MENU: Record<Rol, ClaveOpcion[]> = {
  OF: ['bandeja', 'registrar', 'buscar', 'salidas', 'duplicados', 'asuntos', 'rebotes', 'actores', 'organizacion'],
  DI: ['bandeja', 'buscar', 'asuntos', 'rebotes', 'organizacion'],
  TI: ['bandeja', 'buscar', 'asuntos', 'organizacion'],
  PE: ['bandeja', 'buscar', 'asuntos', 'organizacion'],
  AD: ['organizacion', 'areas', 'personas', 'actores'],
}

const ROLES = Object.keys(MENU) as Rol[]

export const rolesDe = (clave: ClaveOpcion) => ROLES.filter((rol) => MENU[rol].includes(clave))

/** Roles que abren la ficha del documento (O-11). */
export const ROLES_FICHA: Rol[] = ['OF', 'DI', 'TI', 'PE']

export const inicioDe = (rol: Rol) => OPCIONES[MENU[rol][0] ?? 'organizacion'].ruta
