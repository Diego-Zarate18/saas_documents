import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { entrarComo, montarApp, USUARIO } from '../../pruebas/utilidades'

const pendientes = () => screen.getByRole('region', { name: 'Pendientes' })
const folioDelRecorrido = () => within(screen.getByRole('region', { name: 'Recorrido' })).getByText(/^OP-/)

describe('V-02 Bandeja: fila elegida y recorrido (O-14, C1)', () => {
  it('o14_filtro_tipo_fila_resaltada_y_recorrido_son_el_mismo_documento', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.marta)
    montarApp('/')
    const filtrarPor = async (tipo: string) => {
      await usuario.click(within(pendientes()).getByRole('combobox', { name: /^Tipo:/ }))
      await usuario.click(await screen.findByRole('option', { name: tipo }))
    }

    // Por omisión, la primera de la lista.
    await screen.findByRole('button', { name: 'Requerimiento de información', pressed: true })
    await waitFor(() => expect(folioDelRecorrido()).toHaveTextContent('OP-2026-0143'))

    // La elegida por el usuario se conserva mientras siga en la lista filtrada.
    await usuario.click(screen.getByRole('button', { name: 'Requisición de material de cómputo' }))
    await filtrarPor('Solicitud de material o pago')
    await screen.findByRole('button', { name: 'Requisición de material de cómputo', pressed: true })
    await waitFor(() => expect(folioDelRecorrido()).toHaveTextContent('OP-2026-0139'))

    // Si el filtro la deja fuera, se elige la primera de la lista filtrada en la tabla y en el recorrido.
    await filtrarPor('Solicitud de transparencia')
    await screen.findByRole('button', { name: 'Solicitud de acceso a la información', pressed: true })
    await waitFor(() => expect(folioDelRecorrido()).toHaveTextContent('OP-2026-0141'))
  }, 15_000) // dos filtros y tres esperas: con toda la suite en paralelo puede pasar de los 5 s por omisión

  it('o14_esqueleto_de_la_bandeja_aria_busy_un_status_y_formas_ocultas', async () => {
    await entrarComo(USUARIO.marta)
    montarApp('/bandeja')
    // Todo en una sola comprobación: cada findBy deja correr la fuente simulada (latencia 0 en pruebas).
    await waitFor(() => {
      expect(pendientes()).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByRole('region', { name: 'Recorrido' })).toHaveAttribute('aria-busy', 'true')
      expect(document.querySelector('[aria-busy="true"] [class*="indicador"]')).not.toBeNull()
      // Un único anuncio, y dice «Cargando…».
      expect(screen.getAllByRole('status')).toHaveLength(1)
      expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
      // Las formas no se anuncian: todas están ocultas a los lectores de pantalla.
      const formas = [...document.querySelectorAll('[class*="forma"]')]
      expect(formas.length).toBeGreaterThan(20)
      expect(formas.every((f) => f.closest('[aria-hidden="true"]'))).toBe(true)
    })

    // Con los datos, el contenido sustituye al esqueleto.
    await screen.findByRole('button', { name: 'Requerimiento de información', pressed: true })
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
    expect(document.querySelector('[class*="forma"]')).toBeNull()
  })

  it('o14_area_sin_pendientes_no_deja_la_columna_en_esqueleto', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.ana)
    montarApp('/bandeja')
    await usuario.click(await screen.findByRole('combobox', { name: /^Área:/ }))
    await usuario.click(await screen.findByRole('option', { name: 'Sistemas' }))
    expect(await screen.findByText('No hay pendientes en esta área con esos filtros.')).toBeInTheDocument()
    // Sin pendiente no hay recorrido que esperar: la tarjeta de rebotes muestra sus datos.
    await waitFor(() => expect(screen.getByRole('region', { name: 'Rebotes' })).not.toHaveAttribute('aria-busy'))
    expect(screen.queryByRole('region', { name: 'Recorrido' })).not.toBeInTheDocument()
  })
})
