import { describe, expect, it } from 'vitest'
import { paginasVisibles } from './paginas'

describe('Paginador de V-06 (O-30)', () => {
  it('o30_paginador_muestra_extremos_y_vecinas_con_saltos', () => {
    expect(paginasVisibles(1, 1)).toEqual([1])
    expect(paginasVisibles(1, 2)).toEqual([1, 2])
    expect(paginasVisibles(1, 500)).toEqual([1, 2, null, 500])
    expect(paginasVisibles(250, 500)).toEqual([1, null, 249, 250, 251, null, 500])
    expect(paginasVisibles(500, 500)).toEqual([1, null, 499, 500])
    // Sin salto cuando solo falta una página entre la primera y las vecinas: 1, 2, 3, 4 seguidas.
    expect(paginasVisibles(3, 5)).toEqual([1, 2, 3, 4, 5])
  })
})
