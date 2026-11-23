import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { idPorFolio } from '../../api/simulado/datos'
import { entrarComo, montarApp, USUARIO } from '../../pruebas/utilidades'

const ficha0139 = () => `/documentos/${idPorFolio('OP-2026-0139')}`

async function abrirTurnar() {
  const usuario = userEvent.setup()
  await entrarComo(USUARIO.marta)
  montarApp(ficha0139())
  const boton = await screen.findByRole('button', { name: 'Turnar' })
  await usuario.click(boton)
  const dialogo = await screen.findByRole('dialog', { name: 'Turnar documento' })
  return { usuario, boton, dialogo }
}

async function elegirArea(usuario: ReturnType<typeof userEvent.setup>, fila: number, area: string) {
  await usuario.click(screen.getByRole('combobox', { name: new RegExp(`^Área destino ${fila} `) }))
  await usuario.click(await screen.findByRole('option', { name: area }))
}

describe('V-05 Turnar: teclado y foco del modal', () => {
  it('o03_modal_atrapa_el_foco_y_esc_lo_devuelve_al_boton', async () => {
    const { usuario, boton, dialogo } = await abrirTurnar()
    expect(dialogo).toContainElement(document.activeElement as HTMLElement)

    // Tab y Mayús+Tab no salen del diálogo.
    for (let i = 0; i < 12; i++) {
      await usuario.tab()
      expect(dialogo).toContainElement(document.activeElement as HTMLElement)
    }
    await usuario.tab({ shift: true })
    expect(dialogo).toContainElement(document.activeElement as HTMLElement)

    await usuario.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(boton).toHaveFocus())
  })

  it('o03_cancelar_cierra_y_devuelve_el_foco', async () => {
    const { usuario, boton } = await abrirTurnar()
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(boton).toHaveFocus())
  })
})

describe('V-05 Turnar: un solo responsable por grupo (RI-10)', () => {
  it('o03_ri10_boton_deshabilitado_sin_un_solo_responsable', async () => {
    const { usuario, dialogo } = await abrirTurnar()
    const turnar = () => within(dialogo).getByRole('button', { name: /^Turnar a/ })
    expect(turnar()).toBeDisabled()

    await elegirArea(usuario, 1, 'Compras')
    expect(within(dialogo).getByRole('status')).toHaveTextContent('Un responsable en el grupo: Compras.')
    expect(turnar()).toBeEnabled()

    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar área' }))
    await elegirArea(usuario, 2, 'Finanzas')
    // La fila nueva también nace como responsable: dos responsables.
    expect(within(dialogo).getByRole('status')).toHaveTextContent('Solo puede haber un responsable en el grupo.')
    expect(turnar()).toBeDisabled()

    const rolFinanzas = within(dialogo).getByRole('group', { name: 'Rol de Finanzas' })
    await usuario.click(within(rolFinanzas).getByRole('radio', { name: 'Apoyo' }))
    expect(turnar()).toBeEnabled()
  })

  it('o03_flujo_oficialia_turnar_bandeja_de_compras', async () => {
    const { usuario, dialogo } = await abrirTurnar()
    await elegirArea(usuario, 1, 'Compras')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar área' }))
    await elegirArea(usuario, 2, 'Finanzas')
    const rolFinanzas = within(dialogo).getByRole('group', { name: 'Rol de Finanzas' })
    await usuario.click(within(rolFinanzas).getByRole('radio', { name: 'Apoyo' }))
    expect(within(dialogo).getByText(/Compras, Ing. Raúl Pérez · Finanzas, C.P. Elena Díaz/)).toBeInTheDocument()

    await usuario.click(within(dialogo).getByRole('button', { name: 'Turnar a 2 áreas' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // La ficha se vuelve a leer: ya no está pendiente en oficialía.
    expect(await screen.findByText('Pendiente en Compras como responsable · 0 días')).toBeInTheDocument()
  })
})
