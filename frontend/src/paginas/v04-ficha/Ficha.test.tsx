import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { idPorFolio } from '../../api/simulado/datos'
import { entrarComo, montarApp, USUARIO } from '../../pruebas/utilidades'

const acciones = async () => {
  // La pantalla de sesión («SIGEDOC») y el esqueleto («Ficha del documento») llevan su propio h1; se espera el de la ficha.
  const titulo = await screen.findByRole('heading', {
    level: 1,
    name: (nombre) => !['SIGEDOC', 'Ficha del documento'].includes(nombre),
  })
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
    // Con el documento como apoyo, el titular también puede atraerlo (O-23).
    ['TI apoyo', USUARIO.raul, 'OP-2026-0148', ['Más', 'Devolver', 'Turnar', 'Atraer']],
    // V-08: Finanzas lo recibió para conocimiento; solo puede atraerlo.
    ['TI conocimiento', USUARIO.elena, 'OP-2026-0139', ['Más', 'Atraer']],
    ['PE', USUARIO.jorge, 'OP-2026-0152', ['Más', 'Concluir']],
    // Confidencial sin movimiento (D-29): sin ver el contenido no se ofrece relacionar ni asignar asunto.
    ['PE confidencial', USUARIO.jorge, 'OP-2026-0124', ['Concluir']],
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

  it('o11_asignar_a_un_asunto_abre_aviso_en_construccion', async () => {
    await entrarComo(USUARIO.raul)
    montarApp(`/documentos/${idPorFolio('OP-2026-0152')}`)
    const { default: userEvent } = await import('@testing-library/user-event')
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Más' }))
    await usuario.click(await screen.findByRole('menuitem', { name: /Asignar a un asunto/ }))
    const dialogo = await screen.findByRole('dialog', { name: 'Asignar a un asunto' })
    expect(dialogo).toHaveTextContent('V-11b · nodo del Figma 48:1407 (T-02b)')
  })

  it('o11_esqueleto_de_la_sesion_y_de_la_ficha', async () => {
    await entrarComo(USUARIO.marta)
    montarApp(`/documentos/${idPorFolio('OP-2026-0139')}`)
    // Mientras se resuelve la sesión: pantalla neutra con el isotipo y «Cargando…».
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
    expect(screen.getByRole('status').closest('[aria-busy="true"]')).not.toBeNull()

    // Después, el esqueleto de la ficha: un h1 propio, aria-busy, un solo anuncio y formas ocultas.
    // Todo en una sola comprobación: cada findBy deja correr la fuente simulada (latencia 0 en pruebas).
    await waitFor(() => {
      const titulo = screen.getByRole('heading', { level: 1, name: 'Ficha del documento' })
      expect(titulo.closest('[aria-busy="true"]')).not.toBeNull()
      expect(screen.getAllByRole('status')).toHaveLength(1)
      expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
      const formas = [...document.querySelectorAll('[class*="forma"]')]
      expect(formas.length).toBeGreaterThan(20)
      expect(formas.every((f) => f.closest('[aria-hidden="true"]'))).toBe(true)
    })

    expect(await screen.findByRole('heading', { level: 1, name: 'Requisición de material de cómputo' })).toBeInTheDocument()
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })
})
