import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { idPorFolio } from '../../api/simulado/datos'
import { entrarComo, montarApp, USUARIO } from '../../pruebas/utilidades'

const acciones = async () => {
  const titulo = await screen.findByRole('heading', { level: 1 })
  const encabezado = titulo.closest('header') as HTMLElement
  return within(encabezado)
    .getAllByRole('button')
    .map((b) => b.textContent)
}

describe('O-11 Ficha: acciones por rol (D-44, D-62)', () => {
  it.each([
    ['OF', USUARIO.marta, 'OP-2026-0139', ['Más acciones', 'Relacionar', 'Turnar']],
    ['DI', USUARIO.ana, 'OP-2026-0139', ['Turnar']],
    ['TI', USUARIO.raul, 'OP-2026-0152', ['Más', 'Devolver', 'Turnar', 'Concluir']],
    ['TI apoyo', USUARIO.raul, 'OP-2026-0148', ['Más', 'Devolver', 'Turnar']],
    ['PE', USUARIO.jorge, 'OP-2026-0152', ['Más', 'Concluir']],
  ])('o11_acciones_%s', async (_rol, correo, folio, esperadas) => {
    await entrarComo(correo)
    montarApp(`/documentos/${idPorFolio(folio)}`)
    expect(await acciones()).toEqual(esperadas)
  })

  it('d29_personal_ve_aviso_de_contenido_confidencial', async () => {
    await entrarComo(USUARIO.jorge)
    montarApp(`/documentos/${idPorFolio('OP-2026-0124')}`)
    expect(await screen.findByRole('heading', { name: 'Expediente' })).toBeInTheDocument()
    expect(screen.getAllByText(/Contenido confidencial/).length).toBeGreaterThan(0)
    expect(screen.queryByText('Anexos · 0')).not.toBeInTheDocument()
  })

  it('o11_accion_de_t02_abre_aviso_en_construccion', async () => {
    await entrarComo(USUARIO.marta)
    montarApp(`/documentos/${idPorFolio('OP-2026-0139')}`)
    const { default: userEvent } = await import('@testing-library/user-event')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Relacionar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Relacionar' })
    expect(dialogo).toHaveTextContent('V-10 · nodo del Figma 48:1119')
  })
})
