import type { ReactNode } from 'react'
import type { RouteObject } from 'react-router'
import { Marco } from '../componentes/marco/Marco'
import { InicioSesion } from '../paginas/v01-inicio-sesion/InicioSesion'
import { Bandeja } from '../paginas/v02-bandeja/Bandeja'
import { Registrar } from '../paginas/v03-registrar/Registrar'
import { Ficha } from '../paginas/v04-ficha/Ficha'
import { Buscar } from '../paginas/v06-buscar/Buscar'
import { Asuntos } from '../paginas/v11-asuntos/Asuntos'
import { Rebotes } from '../paginas/v12-rebotes/Rebotes'
import { Duplicados } from '../paginas/v14-duplicados/Duplicados'
import { Organizacion } from '../paginas/v16-organizacion/Organizacion'
import { Areas } from '../paginas/v17-areas/Areas'
import { Personas } from '../paginas/v18-personas/Personas'
import { Actores } from '../paginas/v19-actores/Actores'
import { Salidas } from '../paginas/v13b-salida/Salidas'
import { OPCIONES, ROLES_FICHA, rolesDe, type ClaveOpcion } from './menu'
import { IrAlInicio, RutaProtegida } from './RutaProtegida'

/** Vista de cada opción del menú con ruta propia (T-02b: ninguna queda en construcción). */
const VISTAS: Record<Exclude<ClaveOpcion, 'bandeja' | 'registrar'>, ReactNode> = {
  buscar: <Buscar />,
  salidas: <Salidas />,
  duplicados: <Duplicados />,
  asuntos: <Asuntos />,
  rebotes: <Rebotes />,
  actores: <Actores />,
  organizacion: <Organizacion />,
  areas: <Areas />,
  personas: <Personas />,
}

const opciones = (Object.keys(VISTAS) as (keyof typeof VISTAS)[]).map((clave) => ({
  path: OPCIONES[clave].ruta,
  element: <RutaProtegida roles={rolesDe(clave)}>{VISTAS[clave]}</RutaProtegida>,
}))

export const rutas: RouteObject[] = [
  { path: '/iniciar-sesion', element: <InicioSesion /> },
  {
    path: '/',
    element: (
      <RutaProtegida>
        <Marco />
      </RutaProtegida>
    ),
    children: [
      { index: true, element: <IrAlInicio /> },
      {
        path: OPCIONES.bandeja.ruta,
        element: (
          <RutaProtegida roles={rolesDe('bandeja')}>
            <Bandeja />
          </RutaProtegida>
        ),
      },
      {
        path: OPCIONES.registrar.ruta,
        element: (
          <RutaProtegida roles={rolesDe('registrar')}>
            <Registrar />
          </RutaProtegida>
        ),
      },
      {
        path: '/documentos/:id',
        element: (
          <RutaProtegida roles={ROLES_FICHA}>
            <Ficha />
          </RutaProtegida>
        ),
      },
      ...opciones,
      { path: '*', element: <IrAlInicio /> },
    ],
  },
]
