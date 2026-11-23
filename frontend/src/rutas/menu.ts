// Menú por rol según el Figma y D-62. Es también la tabla de permisos de las rutas:
// un rol entra a una ruta solo si la opción está en su menú.
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

interface Vista {
  vista: string
  nodo: string
}

export interface Opcion extends Vista {
  ruta: string
  etiqueta: string
  icono: NombreIcono
  /** Vista del Figma cuando el rol tiene una variante propia. */
  variantes?: Partial<Record<Rol, Vista>>
}

export const OPCIONES: Record<ClaveOpcion, Opcion> = {
  bandeja: {
    ruta: '/bandeja',
    etiqueta: 'Bandeja',
    icono: 'bandeja',
    vista: 'V-02',
    nodo: '34:157',
    variantes: { TI: { vista: 'V-02b', nodo: '62:3141' }, PE: { vista: 'V-02c', nodo: '62:3523' } },
  },
  registrar: { ruta: '/registrar', etiqueta: 'Registrar documento', icono: 'registrar', vista: 'V-03', nodo: '36:128' },
  buscar: { ruta: '/buscar', etiqueta: 'Buscar', icono: 'buscar', vista: 'V-06', nodo: '39:593' },
  salidas: { ruta: '/salidas', etiqueta: 'Salidas externas', icono: 'salida', vista: 'V-13', nodo: '50:1425' },
  duplicados: {
    ruta: '/posibles-duplicados',
    etiqueta: 'Posibles duplicados',
    icono: 'alerta',
    vista: 'V-14',
    nodo: '50:1648',
  },
  asuntos: {
    ruta: '/asuntos',
    etiqueta: 'Asuntos',
    icono: 'asunto',
    vista: 'V-11',
    nodo: '49:1318',
    variantes: { DI: { vista: 'V-11c', nodo: '65:2922' } },
  },
  rebotes: { ruta: '/rebotes', etiqueta: 'Rebotes', icono: 'rebote', vista: 'V-12', nodo: '49:1577' },
  actores: { ruta: '/actores-externos', etiqueta: 'Actores externos', icono: 'actor', vista: 'V-19', nodo: '52:2751' },
  organizacion: {
    ruta: '/organizacion',
    etiqueta: 'Organización',
    icono: 'organizacion',
    vista: 'V-16',
    nodo: '52:2118',
  },
  areas: { ruta: '/areas', etiqueta: 'Áreas', icono: 'organizacion', vista: 'V-17', nodo: '52:2315' },
  personas: { ruta: '/personas', etiqueta: 'Personas y usuarios', icono: 'personas', vista: 'V-18', nodo: '52:2531' },
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

export const vistaDe = (clave: ClaveOpcion, rol: Rol): Vista => OPCIONES[clave].variantes?.[rol] ?? OPCIONES[clave]
