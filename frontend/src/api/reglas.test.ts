// Reglas puras que comparten los formularios y el servicio (RI-10): el error en línea dice lo mismo que la API.
import { describe, expect, it } from 'vitest'
import { validarGrupoTurno } from './reglas'

describe('O-03 Turnar (RI-10)', () => {
  it.each([
    [[], 'Agrega al menos un área.'],
    [[{ id_area: 'a', rol: 'apoyo' as const }], 'Falta un responsable en el grupo.'],
    [
      [
        { id_area: 'a', rol: 'responsable' as const },
        { id_area: 'b', rol: 'responsable' as const },
      ],
      'Solo puede haber un responsable en el grupo.',
    ],
    [
      [
        { id_area: 'a', rol: 'responsable' as const },
        { id_area: 'a', rol: 'apoyo' as const },
      ],
      'Cada área puede aparecer una sola vez.',
    ],
    [
      [
        { id_area: 'a', rol: 'responsable' as const },
        { id_area: 'b', rol: 'conocimiento' as const },
      ],
      null,
    ],
  ])('o03_ri10_validar_grupo_%#', (destinos, esperado) => {
    expect(validarGrupoTurno(destinos)).toBe(esperado)
  })
})
