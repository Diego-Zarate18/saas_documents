// El buscador de documento espera a que se deje de teclear antes de consultar O-30 (T-02a, /ponytail-review 9).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BuscadorDocumento } from './BuscadorDocumento'

const buscarDocumentos = vi.hoisted(() => vi.fn<(texto: string) => Promise<unknown>>())
vi.mock('../../api', async (original) => ({ ...(await original<object>()), buscarDocumentos }))

describe('Buscador de documento', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    buscarDocumentos.mockResolvedValue({ elementos: [], total: 0 })
  })
  afterEach(() => vi.useRealTimers())

  it('o30_consulta_250_ms_despues_de_la_ultima_tecla', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BuscadorDocumento etiqueta="Documento" elegido={null} alElegir={() => {}} />
      </QueryClientProvider>,
    )
    const buscador = screen.getByRole('combobox', { name: 'Documento' })
    const esperar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

    fireEvent.change(buscador, { target: { value: 'OP' } })
    await esperar(200)
    // Otra tecla antes de los 250 ms reinicia la espera.
    fireEvent.change(buscador, { target: { value: 'OP-2026' } })
    await esperar(249)
    expect(buscarDocumentos).not.toHaveBeenCalled()
    expect(screen.getByText('Buscando…')).toBeInTheDocument()
    await esperar(1)
    expect(buscarDocumentos).toHaveBeenCalledTimes(1)
    expect(buscarDocumentos).toHaveBeenCalledWith('OP-2026')
  })

  it('o30_intro_durante_la_espera_no_elige_un_resultado_viejo', async () => {
    const viejo = { id: 'a', folio: 'OP-2026-0001', asunto: 'Resultado anterior', fecha: '2026-11-01T09:00:00-06:00', salida: false }
    buscarDocumentos.mockResolvedValue({ elementos: [viejo], total: 1 })
    const alElegir = vi.fn<(documento: unknown) => void>()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BuscadorDocumento etiqueta="Documento" elegido={null} alElegir={alElegir} />
      </QueryClientProvider>,
    )
    const buscador = screen.getByRole('combobox', { name: 'Documento' })
    fireEvent.change(buscador, { target: { value: 'OP' } })
    // 250 ms de espera; después, la respuesta simulada y la notificación de TanStack Query (setTimeout 0).
    await act(() => vi.advanceTimersByTimeAsync(250))
    await act(() => vi.advanceTimersByTimeAsync(50))
    expect(screen.getByRole('option', { name: /OP-2026-0001/ })).toBeInTheDocument()
    // Se sigue escribiendo y se pulsa Intro antes de que llegue la búsqueda nueva: no elige el resultado de «OP».
    fireEvent.change(buscador, { target: { value: 'OP-2026-0153' } })
    fireEvent.keyDown(buscador, { key: 'Enter' })
    expect(alElegir).not.toHaveBeenCalled()
  })
})
