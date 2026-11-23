import type { RouteObject } from 'react-router'
import { Marco } from '../componentes/marco/Marco'
import { EnConstruccion } from '../paginas/en-construccion/EnConstruccion'
import { InicioSesion } from '../paginas/v01-inicio-sesion/InicioSesion'
import { Bandeja } from '../paginas/v02-bandeja/Bandeja'
import { Registrar } from '../paginas/v03-registrar/Registrar'
import { Ficha } from '../paginas/v04-ficha/Ficha'
import { Salidas } from '../paginas/v13b-salida/Salidas'
import { OPCIONES, ROLES_FICHA, rolesDe, type ClaveOpcion } from './menu'
import { IrAlInicio, RutaProtegida } from './RutaProtegida'

const enConstruccion = (Object.keys(OPCIONES) as ClaveOpcion[])
  .filter((clave) => clave !== 'bandeja' && clave !== 'registrar')
  .map((clave) => ({
    path: OPCIONES[clave].ruta,
    element: (
      <RutaProtegida roles={rolesDe(clave)}>
        {/* Salidas (V-13) sigue en construcción, pero ya registra salidas y acuses (V-13b, O-20, O-21). */}
        {clave === 'salidas' ? <Salidas /> : <EnConstruccion clave={clave} />}
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
      ...enConstruccion,
      { path: '*', element: <IrAlInicio /> },
    ],
  },
]
