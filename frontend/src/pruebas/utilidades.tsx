import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { iniciarSesion } from '../api'
import { rutas } from '../rutas/rutas'

/** Correos de los usuarios de prueba del Figma. */
export const USUARIO = {
  marta: 'mflores@institucion.gob.mx',
  ana: 'alopez@institucion.gob.mx',
  raul: 'rperez@institucion.gob.mx',
  elena: 'ediaz@institucion.gob.mx',
  jorge: 'jruiz@institucion.gob.mx',
  luis: 'lgomez@institucion.gob.mx',
} as const

export const entrarComo = (correo: string) => iniciarSesion({ correo, contrasena: 'prueba' })

/** Monta la aplicación completa en la ruta indicada. */
export function montarApp(ruta: string) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}
