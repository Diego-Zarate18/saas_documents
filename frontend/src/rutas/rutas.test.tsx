import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { entrarComo, montarApp, USUARIO } from '../pruebas/utilidades'

const opcionesDelMenu = async () => {
  const menu = await screen.findByRole('navigation', { name: 'Menú principal' })
  return within(menu)
    .getAllByRole('link')
    .map((enlace) => enlace.textContent)
}

describe('Menú por rol (D-62)', () => {
  it.each([
    [
      'OF',
      USUARIO.marta,
      [
        'Bandeja',
        'Registrar documento',
        'Buscar',
        'Salidas externas',
        'Posibles duplicados',
        'Asuntos',
        'Rebotes',
        'Actores externos',
        'Organización',
      ],
    ],
    ['DI', USUARIO.ana, ['Bandeja', 'Buscar', 'Asuntos', 'Rebotes', 'Organización']],
    ['TI', USUARIO.raul, ['Bandeja', 'Buscar', 'Asuntos', 'Organización']],
    ['TI', USUARIO.elena, ['Bandeja', 'Buscar', 'Asuntos', 'Organización']],
    ['PE', USUARIO.jorge, ['Bandeja', 'Buscar', 'Asuntos', 'Organización']],
    ['AD', USUARIO.luis, ['Organización', 'Áreas', 'Personas y usuarios', 'Actores externos']],
  ])('d62_menu_%s_%s', async (_rol, correo, esperado) => {
    await entrarComo(correo)
    montarApp('/')
    expect(await opcionesDelMenu()).toEqual(esperado)
  })
})

describe('Protección de rutas', () => {
  it('o36_sin_sesion_redirige_a_inicio_de_sesion', async () => {
    const router = montarApp('/bandeja')
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/iniciar-sesion')
  })

  it('o36_inicio_de_sesion_lleva_a_la_ruta_pedida', async () => {
    const router = montarApp('/documentos/registrar-no-existe')
    const usuario = userEvent.setup()
    await usuario.type(await screen.findByLabelText('Correo'), USUARIO.marta)
    await usuario.type(screen.getByLabelText('Contraseña'), 'prueba')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
    await screen.findByRole('navigation', { name: 'Menú principal' })
    expect(router.state.location.pathname).toBe('/documentos/registrar-no-existe')
  })

  it('o36_credenciales_incorrectas_mensaje_generico', async () => {
    montarApp('/iniciar-sesion')
    const usuario = userEvent.setup()
    await usuario.type(await screen.findByLabelText('Correo'), 'nadie@institucion.gob.mx')
    await usuario.type(screen.getByLabelText('Contraseña'), 'x')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.')
  })

  it.each([
    ['PE', USUARIO.jorge, '/rebotes'],
    ['TI', USUARIO.raul, '/registrar'],
    ['DI', USUARIO.ana, '/posibles-duplicados'],
    ['AD', USUARIO.luis, '/bandeja'],
    ['AD', USUARIO.luis, '/documentos/cualquiera'],
  ])('d44_rol_%s_sin_permiso_en_%s', async (_rol, correo, ruta) => {
    await entrarComo(correo)
    montarApp(ruta)
    expect(await screen.findByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument()
    // El marco sigue ahí: no es una página rota.
    expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument()
  })

  it('t02_opcion_en_construccion_muestra_vista_y_nodo', async () => {
    await entrarComo(USUARIO.ana)
    montarApp('/asuntos')
    expect(await screen.findByText('Vista en construcción.')).toBeInTheDocument()
    expect(screen.getByText('V-11c · nodo del Figma 65:2922')).toBeInTheDocument()
  })

  it('o37_cerrar_sesion_vuelve_a_inicio_de_sesion', async () => {
    await entrarComo(USUARIO.raul)
    const router = montarApp('/bandeja')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/iniciar-sesion')
  })
})
