// T-03: el aviso del modo «real» muestra el estado de GET /api/salud, con fetch simulado.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EstadoBase, Salud } from '../../api/salud'
import { AvisoApiReal } from './AvisoApiReal'

const base = (ok: boolean, error: EstadoBase['error'] = null): EstadoBase => ({ ok, ms: 3, error })

function responder(estado: number, cuerpo: Salud) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(cuerpo), { status: estado })))
}

function montar() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AvisoApiReal />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('T-03 aviso del modo real con la salud de la API', () => {
  it('t03_salud_ok_muestra_las_tres_bases_en_ok', async () => {
    responder(200, { estado: 'ok', bases: { postgres: base(true), mongo: base(true), neo4j: base(true) } })
    montar()
    expect(screen.getByText('La API real aún no está disponible.')).toBeInTheDocument()
    const lista = await screen.findByRole('list', { name: 'Estado de las bases' })
    expect(within(lista).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'PostgreSQL: ok',
      'MongoDB: ok',
      'Neo4j: ok',
    ])
    expect(fetch).toHaveBeenCalledWith('/api/salud', expect.anything())
  })

  it('t03_salud_degradado_muestra_el_error_de_la_base_que_falla', async () => {
    responder(503, {
      estado: 'degradado',
      bases: { postgres: base(true), mongo: base(true), neo4j: base(false, 'tiempo agotado') },
    })
    montar()
    const lista = await screen.findByRole('list', { name: 'Estado de las bases' })
    expect(within(lista).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'PostgreSQL: ok',
      'MongoDB: ok',
      'Neo4j: tiempo agotado',
    ])
  })

  it('t03_sin_respuesta_de_la_api_lo_dice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    montar()
    expect(await screen.findByText('No se pudo consultar el estado de la API')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('t03_una_respuesta_que_no_es_de_salud_cuenta_como_sin_respuesta', async () => {
    // Vite responde 500 por el proxy cuando el backend no está levantado.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    montar()
    expect(await screen.findByText('No se pudo consultar el estado de la API')).toBeInTheDocument()
  })
})
