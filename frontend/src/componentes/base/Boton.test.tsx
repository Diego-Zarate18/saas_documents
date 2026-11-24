import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Boton } from './Boton'
import { AccionNavegacion } from './ElementoNavegacion'

// El estado pendiente lo usan «Turnar a N áreas» (O-03), «Entrar» (O-36) y «Cerrar sesión» (O-37).
describe('Botón pendiente (T-01b)', () => {
  it('o03_boton_pendiente_spinner_aria_busy_deshabilitado_y_mismo_texto', () => {
    const { rerender } = render(<Boton icono="turnar">Turnar a 2 áreas</Boton>)
    const boton = screen.getByRole('button', { name: 'Turnar a 2 áreas' })
    const icono = boton.querySelector('svg')
    expect(boton).toBeEnabled()
    expect(boton).not.toHaveAttribute('aria-busy')

    rerender(
      <Boton icono="turnar" pendiente>
        Turnar a 2 áreas
      </Boton>,
    )
    expect(boton).toHaveAttribute('aria-busy', 'true')
    expect(boton).toBeDisabled()
    expect(boton).toHaveTextContent('Turnar a 2 áreas')
    // El spinner ocupa el lugar del ícono: el mismo tamaño, así que el ancho no cambia.
    const giro = boton.querySelectorAll('svg')
    expect(giro).toHaveLength(1)
    expect(giro[0]).not.toBe(icono)
    expect(giro[0]).toHaveAttribute('width', icono?.getAttribute('width'))
  })

  it('o03_boton_sin_icono_y_cerrar_sesion_pendientes', () => {
    const salir = vi.fn<() => void>()
    render(
      <>
        <Boton type="submit" pendiente>
          Entrar
        </Boton>
        <AccionNavegacion icono="salir" texto="Cerrar sesión" onClick={salir} pendiente />
      </>,
    )
    for (const nombre of ['Entrar', 'Cerrar sesión']) {
      const boton = screen.getByRole('button', { name: nombre })
      expect(boton).toHaveAttribute('aria-busy', 'true')
      expect(boton).toBeDisabled()
      expect(boton.querySelectorAll('svg')).toHaveLength(1)
    }
    screen.getByRole('button', { name: 'Cerrar sesión' }).click()
    expect(salir).not.toHaveBeenCalled()
  })
})
