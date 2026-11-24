// Vistas de administración y actores de T-02b (V-16 a V-19) sobre la fuente simulada.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { entrarComo, montarApp, USUARIO } from '../pruebas/utilidades'

const elegirOpcion = async (usuario: ReturnType<typeof userEvent.setup>, combobox: RegExp, opcion: string) => {
  await usuario.click(screen.getByRole('combobox', { name: combobox }))
  await usuario.click(await screen.findByRole('option', { name: opcion }))
}

describe('V-16 Organización (O-32)', () => {
  it('o32_v16_estructura_vigente_con_vacante_y_personas_adscritas', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.jorge)
    montarApp('/organizacion')
    // Personal de Compras: su área aparece elegida.
    expect(await screen.findByRole('heading', { name: 'Compras' })).toBeInTheDocument()
    expect(screen.getByText('Titular de área')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: /Vinculación/ }))
    expect(await screen.findByRole('heading', { name: 'Vinculación' })).toBeInTheDocument()
    expect(screen.getAllByText('Vacante').length).toBeGreaterThan(0)
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar área o persona' }), 'Laura')
    expect(screen.getByRole('button', { name: /Unidad de Transparencia/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^CO/ })).not.toBeInTheDocument()
  }, 15_000)

  it('t02c_v16_siglas_de_todos_los_niveles_en_una_columna_fija', async () => {
    await entrarComo(USUARIO.jorge)
    montarApp('/organizacion')
    const arbol = await screen.findByRole('list', { name: 'Áreas por dependencia' })
    // jsdom no calcula posiciones: la columna es fija si nada antes de las siglas se sangra.
    const filas = within(arbol).getAllByRole('button')
    const sangrias = filas.map((fila) => {
      const [siglas, nombre] = [...fila.children] as HTMLElement[]
      expect(fila.getAttribute('style')).toBeNull()
      expect(siglas?.getAttribute('style')).toBeNull()
      return { siglas: siglas?.textContent, sangria: nombre?.style.paddingLeft }
    })
    // Los tres niveles del Figma: la raíz, Jurídico y Unidad de Transparencia (bajo Jurídico).
    expect(sangrias).toEqual(
      expect.arrayContaining([
        { siglas: 'DG', sangria: 'calc(0 * var(--espacio-24))' },
        { siglas: 'JU', sangria: 'calc(1 * var(--espacio-24))' },
        { siglas: 'UT', sangria: 'calc(2 * var(--espacio-24))' },
      ]),
    )
  })
})

describe('V-17 Áreas (O-33)', () => {
  it('o33_v17_crea_un_area_y_rechaza_un_ciclo_en_linea', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.luis)
    montarApp('/areas')
    await usuario.click(await screen.findByRole('button', { name: 'Nueva área' }))
    await usuario.type(screen.getByLabelText('Siglas'), 'pl')
    await usuario.type(screen.getByLabelText('Nombre'), 'Planeación')
    await elegirOpcion(usuario, /^Depende de/, 'Dirección General')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('button', { name: 'PL' })).toBeInTheDocument()

    // Jurídico no puede depender de Transparencia, que depende de él (D-47).
    await usuario.click(screen.getByRole('button', { name: 'JU' }))
    await elegirOpcion(usuario, /^Depende de/, 'Unidad de Transparencia')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No puede depender de un área que depende de ella.')
  }, 20_000)

  it('o33_v17_siglas_fijas_con_folios_y_no_se_desactiva_con_pendientes', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.luis)
    montarApp('/areas')
    await usuario.click(await screen.findByRole('button', { name: 'CO' }))
    expect(screen.getByLabelText('Siglas')).toBeDisabled()
    expect(screen.getByText('Fijas mientras el área tenga folios emitidos (D-61).')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeDisabled()
    expect(screen.getByText(/No se puede desactivar: tiene \d+ documentos pendientes/)).toBeInTheDocument()
  }, 15_000)
})

describe('V-18 Personas y usuarios (O-34)', () => {
  it('o34_v18_correo_repetido_en_el_campo_y_alta', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.luis)
    montarApp('/personas')
    await screen.findByRole('table', { name: 'Personas y usuarios' })
    await usuario.type(screen.getByLabelText('Nombre completo'), 'Mariana Solís Aguilar')
    const correo = screen.getByLabelText('Correo')
    await usuario.type(correo, 'jruiz@institucion.gob.mx')
    await elegirOpcion(usuario, /^Área de adscripción/, 'Compras')
    await usuario.click(screen.getByRole('button', { name: 'Crear persona' }))
    await waitFor(() => expect(correo).toHaveAccessibleDescription('Ya existe un usuario con este correo.'))
    expect(correo).toHaveAttribute('aria-invalid', 'true')

    await usuario.clear(correo)
    await usuario.type(correo, 'msolis@institucion.gob.mx')
    await usuario.click(screen.getByRole('button', { name: 'Crear persona' }))
    expect(await screen.findByRole('button', { name: 'Mariana Solís Aguilar' })).toBeInTheDocument()
  }, 20_000)

  it('o34_v18_baja_de_un_titular_deja_el_area_vacante', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.luis)
    montarApp('/personas')
    await usuario.click(await screen.findByRole('button', { name: 'Arq. Pedro Mena' }))
    expect(screen.getByText('Es titular de Servicios Generales: si la das de baja, el área queda vacante.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Dar de baja' }))
    const fila = (await screen.findByRole('button', { name: 'Arq. Pedro Mena' })).closest('tr')
    await waitFor(() => expect(fila).toHaveTextContent('Baja'))
    // El administrador no se da de baja a sí mismo.
    await usuario.click(screen.getByRole('button', { name: 'Mtro. Luis Gómez' }))
    expect(screen.queryByRole('button', { name: 'Dar de baja' })).not.toBeInTheDocument()
  }, 15_000)
})

describe('V-19 Actores externos (O-35, RI-06)', () => {
  it('o35_v19_crea_un_actor_y_se_ofrece_al_registrar', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.marta)
    const router = montarApp('/actores-externos')
    await usuario.click(await screen.findByRole('button', { name: 'Nuevo actor' }))
    await usuario.type(screen.getByLabelText('Nombre'), 'Colegio de Arquitectos de Chiapas')
    await usuario.click(screen.getByRole('radio', { name: 'Institución' }))
    await usuario.type(screen.getByLabelText('Correo de contacto'), 'contacto@cach.org.mx')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('button', { name: 'Colegio de Arquitectos de Chiapas' })).toBeInTheDocument()

    await router.navigate('/registrar')
    await usuario.click(await screen.findByRole('combobox', { name: /^Actor externo/ }))
    expect(await screen.findByRole('option', { name: 'Colegio de Arquitectos de Chiapas' })).toBeInTheDocument()
  }, 20_000)

  it('o35_v19_actor_con_documentos_se_desactiva_no_se_borra', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.luis)
    montarApp('/actores-externos')
    await usuario.click(await screen.findByRole('button', { name: 'Órgano Interno de Control' }))
    expect(screen.getByText(/no se puede eliminar, solo desactivar/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Desactivar' }))
    const fila = (await screen.findByRole('button', { name: 'Órgano Interno de Control' })).closest('tr')
    await waitFor(() => expect(fila).toHaveTextContent('Inactivo'))
    expect(within(fila as HTMLElement).getByRole('button', { name: 'Órgano Interno de Control' })).toBeInTheDocument()
  }, 15_000)
})
