// T-02c (/ponytail-review 1): las listas de opciones salen de O-31; si la consulta falla, el modal lo dice
// en lugar de quedar con un grupo vacío y el botón deshabilitado sin explicación.
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { idPorFolio } from '../api/simulado/datos'
import { entrarComo, montarApp, USUARIO } from '../pruebas/utilidades'

vi.mock('../api/simulado/servidor', async (original) => ({
  ...(await original<typeof import('../api/simulado/servidor')>()),
  obtenerCatalogos: () => Promise.reject(new Error('sin red')),
}))

describe('O-31 sin respuesta', () => {
  it('o31_si_el_catalogo_falla_el_modal_lo_avisa', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.raul)
    montarApp(`/documentos/${idPorFolio('OP-2026-0152')}`)
    await usuario.click(await screen.findByRole('button', { name: 'Devolver' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Devolver o returnar' })
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('No se pudo cargar las opciones del catálogo.')
    expect(within(dialogo).queryByRole('radio', { name: /Falta firma/ })).not.toBeInTheDocument()
  })
})
