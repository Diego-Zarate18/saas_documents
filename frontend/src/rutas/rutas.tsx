import type { RouteObject } from 'react-router'
import { Marco } from '../componentes/marco/Marco'
import { EnConstruccion } from '../paginas/en-construccion/EnConstruccion'
import { InicioSesion } from '../paginas/v01-inicio-sesion/InicioSesion'
import { Bandeja } from '../paginas/v02-bandeja/Bandeja'
import { Ficha } from '../paginas/v04-ficha/Ficha'
import { OPCIONES, ROLES_FICHA, rolesDe, type ClaveOpcion } from './menu'
import { IrAlInicio, RutaProtegida } from './RutaProtegida'

const enConstruccion = (Object.keys(OPCIONES) as ClaveOpcion[])
  .filter((clave) => clave !== 'bandeja')
  .map((clave) => ({
    path: OPCIONES[clave].ruta,
    element: (
      <RutaProtegida roles={rolesDe(clave)}>
        <EnConstruccion clave={clave} />
      </RutaProtegida>
    ),
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
        path: '/documentos/:id',
        element: (
          <RutaProtegida roles={ROLES_FICHA}>
            <Ficha />
          </RutaProtegida>
        ),
      },
      ...enConstruccion,
      { path: '*', element: <IrAlInicio /> },
    ],
  },
]
