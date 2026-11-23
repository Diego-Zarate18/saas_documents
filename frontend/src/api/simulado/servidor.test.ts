import { describe, expect, it } from 'vitest'
import { entrarComo, USUARIO } from '../../pruebas/utilidades'
import { validarGrupoTurno } from '../reglas'
import type { ErrorDeApi } from '../tipos'
import { AREA, idPorFolio } from './datos'
import { obtenerAcuses, obtenerBandeja, obtenerFicha, turnar } from './servidor'

const codigoDe = (promesa: Promise<unknown>) =>
  promesa.then(
    () => 'sin error',
    (e: ErrorDeApi) => e.problema.codigo,
  )

const folios = async (idArea?: string) => (await obtenerBandeja({ id_area: idArea })).elementos.map((p) => p.folio)

describe('O-14 Bandeja', () => {
  it('o14_oficialia_coincide_con_los_indicadores_del_figma', async () => {
    await entrarComo(USUARIO.marta)
    const { elementos, total } = await obtenerBandeja()
    expect(total).toBe(24)
    expect(elementos.filter((p) => p.rol === 'responsable')).toHaveLength(18)
    expect(elementos.filter((p) => p.rol === 'apoyo')).toHaveLength(6)
    expect(Math.max(...elementos.map((p) => p.antiguedad_dias))).toBe(12)
    expect(elementos.slice(0, 5).map((p) => p.folio)).toEqual([
      'OP-2026-0143',
      'OP-2026-0141',
      'OP-2026-0139',
      'OP-2026-0137',
      'OP-2026-0129',
    ])
  })

  it('o14_titular_ya_no_adscrito', async () => {
    await entrarComo(USUARIO.marta)
    const queja = (await obtenerBandeja()).elementos.find((p) => p.folio === 'OP-2026-0129')
    expect(queja).toMatchObject({ titular_al_turnar: 'Lic. Sergio Ruiz', titular_ya_no_adscrito: true })
    expect(queja?.ultimo_movimiento.descripcion).toBe('Devuelto por Jurídico · no es de su competencia')
  })

  it('o14_conocimiento_no_queda_pendiente', async () => {
    await entrarComo(USUARIO.elena)
    // Finanzas recibió OP-2026-0139 solo para conocimiento (D-42).
    expect(await folios()).not.toContain('OP-2026-0139')
  })

  it('o14_filtros_tipo_y_antiguedad', async () => {
    await entrarComo(USUARIO.marta)
    const { elementos } = await obtenerBandeja({ tipo: 'Solicitud de transparencia', antiguedad_minima: 1 })
    expect(elementos.length).toBeGreaterThan(0)
    expect(elementos.every((p) => p.tipo === 'Solicitud de transparencia' && p.antiguedad_dias >= 1)).toBe(true)
  })

  it('d29_titular_y_personal_solo_ven_la_bandeja_de_su_area', async () => {
    await entrarComo(USUARIO.jorge)
    expect(await folios()).toContain('OP-2026-0152')
    expect(await codigoDe(obtenerBandeja({ id_area: AREA.oficialia }))).toBe('SIN_PERMISO')
    await entrarComo(USUARIO.ana)
    expect(await folios(AREA.compras)).toContain('OP-2026-0152')
  })
})

describe('O-11 Ficha con visibilidad (D-29)', () => {
  it('d29_personal_no_ve_contenido_confidencial_ajeno', async () => {
    const id = idPorFolio('OP-2026-0124')
    await entrarComo(USUARIO.jorge)
    const ficha = await obtenerFicha(id)
    expect(ficha.contenido_oculto).toBe(true)
    expect(ficha.registro.sintesis).toBeNull()
    expect(ficha.expediente).toBeNull()
    expect(ficha.recorrido).not.toBeNull()
  })

  it('d29_titular_si_ve_contenido_confidencial_de_su_area', async () => {
    await entrarComo(USUARIO.raul)
    const ficha = await obtenerFicha(idPorFolio('OP-2026-0124'))
    expect(ficha.contenido_oculto).toBe(false)
    expect(ficha.registro.sintesis).not.toBeNull()
  })

  it('d29_documento_de_otra_area_solo_estado_y_responsable', async () => {
    await entrarComo(USUARIO.jorge)
    const ficha = await obtenerFicha(idPorFolio('OP-2026-0129'))
    expect(ficha.acceso).toBe('restringido')
    expect(ficha.registro.asunto).toBeNull()
    expect(ficha.recorrido).toBeNull()
    expect(ficha.registro.estado).toBe('en_tramite')
    expect(ficha.ubicacion_actual.map((u) => u.area)).toEqual(['Oficialía de partes'])
  })

  it('d29_oficialia_ve_el_recorrido_de_todo', async () => {
    await entrarComo(USUARIO.marta)
    const ficha = await obtenerFicha(idPorFolio('OP-2026-0097'))
    expect(ficha.acceso).toBe('completo')
    expect(ficha.recorrido?.length).toBeGreaterThan(1)
  })

  it('d44_administrador_no_lee_documentos', async () => {
    await entrarComo(USUARIO.luis)
    expect(await codigoDe(obtenerFicha(idPorFolio('OP-2026-0139')))).toBe('SIN_PERMISO')
  })
})

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

  it('o03_servidor_rechaza_grupo_sin_un_solo_responsable', async () => {
    await entrarComo(USUARIO.marta)
    const destinos = [
      { id_area: AREA.compras, rol: 'responsable' as const, instruccion: '' },
      { id_area: AREA.finanzas, rol: 'responsable' as const, instruccion: '' },
    ]
    expect(await codigoDe(turnar(idPorFolio('OP-2026-0139'), destinos))).toBe('VALIDACION')
  })

  it('o03_permisos_d44', async () => {
    const destinos = [{ id_area: AREA.finanzas, rol: 'responsable' as const, instruccion: '' }]
    await entrarComo(USUARIO.jorge)
    expect(await codigoDe(turnar(idPorFolio('OP-2026-0152'), destinos))).toBe('SIN_PERMISO')
    // El titular solo turna lo que tiene pendiente en su área.
    await entrarComo(USUARIO.elena)
    expect(await codigoDe(turnar(idPorFolio('OP-2026-0152'), destinos))).toBe('SIN_PERMISO')
    // No se turnan documentos concluidos.
    await entrarComo(USUARIO.marta)
    expect(await codigoDe(turnar(idPorFolio('OP-2026-0087'), destinos))).toBe('ESTADO_INVALIDO')
  })

  it('o03_turnar_mueve_el_documento_a_la_bandeja_de_compras', async () => {
    const id = idPorFolio('OP-2026-0139')
    await entrarComo(USUARIO.raul)
    expect(await folios()).not.toContain('OP-2026-0139')
    expect((await obtenerAcuses()).elementos.map((a) => a.folio_documento)).not.toContain('OP-2026-0139')

    await entrarComo(USUARIO.marta)
    const resultado = await turnar(id, [
      { id_area: AREA.compras, rol: 'responsable', instruccion: 'Revisar la cotización firmada y proceder a la compra' },
      { id_area: AREA.finanzas, rol: 'apoyo', instruccion: 'Validar suficiencia presupuestal' },
      { id_area: AREA.direccion, rol: 'conocimiento', instruccion: 'Para su conocimiento' },
    ])
    expect(new Set(resultado.movimientos.map((m) => m.id_grupo_turno))).toEqual(new Set([resultado.id_grupo_turno]))
    expect(resultado.movimientos.map((m) => m.titular_al_turnar)).toEqual([
      'Ing. Raúl Pérez',
      'C.P. Elena Díaz',
      'Lic. Ana López',
    ])
    expect(await folios()).not.toContain('OP-2026-0139')

    await entrarComo(USUARIO.raul)
    const compras = await obtenerBandeja()
    expect(compras.total).toBe(9)
    expect(compras.elementos.find((p) => p.folio === 'OP-2026-0139')).toMatchObject({
      rol: 'responsable',
      ultimo_movimiento: { tipo: 'turno', descripcion: 'Turnado por Oficialía' },
    })
    expect((await obtenerAcuses()).elementos.map((a) => a.folio_documento)).toContain('OP-2026-0139')
    const ficha = await obtenerFicha(id)
    expect(ficha.ubicacion_actual.map((u) => [u.area, u.rol])).toEqual([
      ['Compras', 'responsable'],
      ['Finanzas', 'apoyo'],
    ])
  })
})
