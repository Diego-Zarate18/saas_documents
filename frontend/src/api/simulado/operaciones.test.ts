// Operaciones de T-02a sobre la fuente simulada. Los ids son los del catálogo (docs/operaciones/catalogo.json).
import { describe, expect, it } from 'vitest'
import { entrarComo, USUARIO } from '../../pruebas/utilidades'
import type { Conclusion, ErrorDeApi, NuevoDocumento, Uuid } from '../tipos'
import { AREA, areas, idPorFolio, salidas } from './datos'
import {
  agregarAnexo,
  agregarNota,
  atraer,
  buscarDocumentos,
  cancelarDocumento,
  concluir,
  corregirMovimiento,
  devolver,
  obtenerAcuses,
  obtenerBandeja,
  obtenerCatalogos,
  obtenerFicha,
  obtenerFolioSiguiente,
  quitarRelacion,
  registrarAcuse,
  registrarDocumento,
  registrarSalida,
  registrarSegundaRecepcion,
  relacionar,
  turnar,
} from './servidor'

const errorDe = (promesa: Promise<unknown>) =>
  promesa.then(
    () => undefined,
    (e: ErrorDeApi) => e.problema,
  )
const codigoDe = async (promesa: Promise<unknown>) => (await errorDe(promesa))?.codigo ?? 'sin error'

let consecutivo = 0
const nuevo = (cambios: Partial<NuevoDocumento> = {}): NuevoDocumento => ({
  tipo: 'oficio',
  numero_emisor: `PR/${String(++consecutivo).padStart(4, '0')}/2026`,
  tipo_emisor: 'externo',
  emisor: 'Proveedor externo',
  fecha_documento: '2026-11-20',
  canal: 'papel',
  fecha_recepcion: '2026-11-22T10:00:00-06:00',
  sintesis: 'Documento de prueba',
  confidencial: false,
  extemporaneo: false,
  datos_tipo: {},
  ...cambios,
})

/** Registra como oficialía y lo turna a Compras (responsable) y Finanzas (apoyo). */
async function enCompras(cambios: Partial<NuevoDocumento> = {}): Promise<Uuid> {
  await entrarComo(USUARIO.marta)
  const { id } = await registrarDocumento(nuevo(cambios))
  await turnar(id, [
    { id_area: AREA.compras, rol: 'responsable', instruccion: '' },
    { id_area: AREA.finanzas, rol: 'apoyo', instruccion: '' },
  ])
  return id
}

const folios = async (idArea?: Uuid) => (await obtenerBandeja({ id_area: idArea })).elementos.map((p) => p.id_documento)

describe('O-01 Registrar documento y asignar folio', () => {
  it('o01_folio_consecutivo_sin_huecos_aunque_falle_un_registro', async () => {
    await entrarComo(USUARIO.marta)
    const previsto = await obtenerFolioSiguiente()
    const primero = await registrarDocumento(nuevo())
    expect(primero.folio).toBe(previsto)
    // Un registro rechazado (validación o duplicado) no consume folio.
    expect(await codigoDe(registrarDocumento(nuevo({ sintesis: ' ' })))).toBe('VALIDACION')
    const segundo = await registrarDocumento(nuevo())
    const numero = (folio: string) => Number(folio.split('-')[2])
    expect(primero.folio).toMatch(/^OP-2026-\d{4}$/)
    expect(numero(segundo.folio)).toBe(numero(primero.folio) + 1)
  })

  it('o01_d27_duplicado_detectado_no_crea_nada_y_devuelve_el_existente', async () => {
    await entrarComo(USUARIO.marta)
    const datos = nuevo({ canal: 'correo' })
    const original = await registrarDocumento(datos)
    const previsto = await obtenerFolioSiguiente()
    const problema = await errorDe(registrarDocumento({ ...datos, canal: 'papel', fecha_documento: '2026-01-05' }))
    expect(problema).toMatchObject({ codigo: 'DUPLICADO', status: 409, existente: { id: original.id, folio: original.folio, canal: 'correo' } })
    expect(await obtenerFolioSiguiente()).toBe(previsto)
    // Mismo número y emisor pero otro año del documento: no es duplicado.
    expect(await codigoDe(registrarDocumento({ ...datos, fecha_documento: '2025-12-30' }))).toBe('sin error')
  })

  it('o01_sin_numero_o_sin_fecha_queda_como_posible_duplicado', async () => {
    await entrarComo(USUARIO.marta)
    const sinNumero = await registrarDocumento(nuevo({ numero_emisor: null }))
    const sinFecha = await registrarDocumento(nuevo({ fecha_documento: null }))
    const completo = await registrarDocumento(nuevo())
    expect((await obtenerFicha(sinNumero.id)).registro.posible_duplicado).toBe(true)
    expect((await obtenerFicha(sinFecha.id)).registro.posible_duplicado).toBe(true)
    expect((await obtenerFicha(completo.id)).registro.posible_duplicado).toBe(false)
  })

  it('o01_extemporaneo_guarda_la_fecha_real_y_queda_pendiente_en_oficialia', async () => {
    await entrarComo(USUARIO.marta)
    const { id } = await registrarDocumento(nuevo({ extemporaneo: true, fecha_recepcion: '2026-11-10T09:00:00-06:00' }))
    const ficha = await obtenerFicha(id)
    expect(ficha.registro).toMatchObject({ extemporaneo: true, fecha_oficial: '2026-11-10', origen_fecha_oficial: 'sello' })
    expect(ficha.ubicacion_actual).toMatchObject([{ area: 'Oficialía de partes', rol: 'responsable' }])
    expect(await folios()).toContain(id)
  })

  it('o01_ri06_el_emisor_es_un_area_o_un_actor_activo_del_catalogo', async () => {
    await entrarComo(USUARIO.marta)
    expect(await codigoDe(registrarDocumento(nuevo({ emisor: 'Proveedor sin alta' })))).toBe('VALIDACION')
    expect(await codigoDe(registrarDocumento(nuevo({ emisor: 'Papelería Central' })))).toBe('VALIDACION')
    expect(await codigoDe(registrarDocumento(nuevo({ tipo_emisor: 'area', emisor: 'Archivo de concentración' })))).toBe('VALIDACION')
    expect(await codigoDe(registrarDocumento(nuevo({ tipo_emisor: 'otro' as never, emisor: 'Cualquiera' })))).toBe('VALIDACION')
    expect(await codigoDe(registrarDocumento(nuevo({ tipo_emisor: 'area', emisor: 'Sistemas' })))).toBe('sin error')
    const salida = { tipo: 'oficio' as const, numero: 'X/1', id_area_emisora: AREA.compras, sintesis: 'Salida', id_responde_a: null }
    expect(await codigoDe(registrarSalida({ ...salida, destinatario: 'Sistemas' }))).toBe('VALIDACION')
  })

  it('o01_d44_solo_oficialia_registra', async () => {
    await entrarComo(USUARIO.raul)
    expect(await codigoDe(registrarDocumento(nuevo()))).toBe('SIN_PERMISO')
  })
})

describe('D-65 y D-66 Tipos y campos propios', () => {
  it('d65_catalogo_con_los_siete_tipos', async () => {
    await entrarComo(USUARIO.marta)
    expect((await obtenerCatalogos()).tipos_documento).toEqual([
      'oficio',
      'solicitud_material_pago',
      'requerimiento_auditoria',
      'solicitud_transparencia',
      'memorandum',
      'circular',
      'informe',
    ])
  })

  it('d66_solo_tres_tipos_tienen_campos_propios', async () => {
    await entrarComo(USUARIO.marta)
    const { campos_tipo } = await obtenerCatalogos()
    expect(Object.keys(campos_tipo).sort()).toEqual(['requerimiento_auditoria', 'solicitud_material_pago', 'solicitud_transparencia'])
    expect(campos_tipo.requerimiento_auditoria?.map((c) => [c.clave, c.forma, c.obligatorio])).toEqual([
      ['ente_auditor', 'texto', true],
      ['puntos', 'lista', false],
    ])
    expect(campos_tipo.solicitud_transparencia?.map((c) => [c.clave, c.obligatorio])).toEqual([['solicitante', true]])
    expect(campos_tipo.solicitud_material_pago?.map((c) => [c.clave, c.obligatorio])).toEqual([['concepto', false]])
  })

  it('d66_campos_obligatorios_por_tipo', async () => {
    await entrarComo(USUARIO.marta)
    expect(await errorDe(registrarDocumento(nuevo({ tipo: 'requerimiento_auditoria' })))).toMatchObject({
      codigo: 'VALIDACION',
      title: 'Escribe el campo «Ente auditor».',
    })
    expect(await codigoDe(registrarDocumento(nuevo({ tipo: 'solicitud_transparencia', datos_tipo: { solicitante: '  ' } })))).toBe(
      'VALIDACION',
    )
    // Concepto es opcional; los tipos sin campos no piden nada.
    expect(await codigoDe(registrarDocumento(nuevo({ tipo: 'solicitud_material_pago' })))).toBe('sin error')
    expect(await codigoDe(registrarDocumento(nuevo({ tipo: 'circular' })))).toBe('sin error')
  })

  it('d66_la_ficha_devuelve_los_datos_del_tipo_limpios', async () => {
    await entrarComo(USUARIO.marta)
    const { id } = await registrarDocumento(
      nuevo({
        tipo: 'requerimiento_auditoria',
        datos_tipo: { ente_auditor: ' Auditoría Superior del Estado ', puntos: ['Viáticos', ' ', 'Contratos'], ajeno: 'x' },
      }),
    )
    expect((await obtenerFicha(id)).expediente?.datos_tipo).toEqual({
      ente_auditor: 'Auditoría Superior del Estado',
      puntos: ['Viáticos', 'Contratos'],
    })
    // Un tipo sin campos propios guarda su expediente sin datos del tipo.
    const memo = await registrarDocumento(nuevo({ tipo: 'memorandum', datos_tipo: { concepto: 'no aplica' } }))
    expect((await obtenerFicha(memo.id)).expediente?.datos_tipo).toEqual({})
  })
})

describe('O-19 Segunda recepción', () => {
  it('o19_duplicado_detectado_y_segunda_recepcion_en_papel_fija_la_fecha_oficial', async () => {
    await entrarComo(USUARIO.marta)
    const datos = nuevo({ canal: 'correo', fecha_recepcion: '2026-11-20T17:48:00-06:00' })
    await registrarDocumento(datos)
    // El mismo oficio llega en papel: O-01 lo detecta y la interfaz ofrece O-19 con el existente.
    const existente = (await errorDe(registrarDocumento({ ...datos, canal: 'papel' })))?.existente
    expect(existente).toBeDefined()
    const id = existente?.id ?? ''
    const folio = (await obtenerFicha(id)).registro.folio
    await registrarSegundaRecepcion(id, 'papel', '2026-11-21T10:32:00-06:00')
    const { registro } = await obtenerFicha(id)
    expect(registro).toMatchObject({
      folio,
      canal: 'correo',
      segunda_recepcion: { canal: 'papel', fecha_recepcion: '2026-11-21T10:32:00-06:00' },
      fecha_oficial: '2026-11-21',
      origen_fecha_oficial: 'sello',
    })
  })

  it('o19_correo_no_cambia_la_fecha_oficial_y_el_mismo_canal_se_rechaza', async () => {
    await entrarComo(USUARIO.marta)
    const { id } = await registrarDocumento(nuevo({ canal: 'papel', fecha_recepcion: '2026-11-18T09:12:00-06:00' }))
    expect(await codigoDe(registrarSegundaRecepcion(id, 'papel', '2026-11-19T09:00:00-06:00'))).toBe('CONFLICTO')
    await registrarSegundaRecepcion(id, 'correo', '2026-11-17T18:02:00-06:00')
    expect((await obtenerFicha(id)).registro.fecha_oficial).toBe('2026-11-18')
    expect(await codigoDe(registrarSegundaRecepcion(id, 'correo', '2026-11-19T09:00:00-06:00'))).toBe('CONFLICTO')
  })
})

describe('D-29 Confidencial', () => {
  it('d29_confidencial_visible_solo_al_titular_y_a_quien_tiene_movimiento', async () => {
    const id = await enCompras({ confidencial: true })
    // Oficialía lo registró y lo turnó: tiene movimiento.
    await entrarComo(USUARIO.marta)
    expect((await obtenerFicha(id)).contenido_oculto).toBe(false)
    // Titular del área responsable.
    await entrarComo(USUARIO.raul)
    expect((await obtenerFicha(id)).contenido_oculto).toBe(false)
    // Personal de Compras sin movimiento y Dirección: ven el recorrido, no el contenido.
    for (const usuario of [USUARIO.jorge, USUARIO.ana]) {
      await entrarComo(usuario)
      const ficha = await obtenerFicha(id)
      expect(ficha.contenido_oculto).toBe(true)
      expect(ficha.expediente).toBeNull()
      expect(ficha.registro.sintesis).toBeNull()
    }
    // Sin ver el contenido no se escribe en el expediente.
    await entrarComo(USUARIO.jorge)
    expect(await codigoDe(agregarNota(id, 'Nota'))).toBe('SIN_PERMISO')
  })
})

describe('D-67 Turno de oficialía o dirección (D-42 literal)', () => {
  it('d67_turno_de_oficialia_o_direccion_sobre_un_pendiente_de_otra_area_no_lo_cierra', async () => {
    const id = await enCompras()
    // Oficialía y Dirección turnan desde su área: Compras sigue teniéndolo pendiente (D-42, literal).
    for (const [usuario, area] of [
      [USUARIO.marta, AREA.juridico],
      [USUARIO.ana, AREA.sistemas],
    ] as const) {
      await entrarComo(usuario)
      await turnar(id, [{ id_area: area, rol: 'responsable', instruccion: '' }])
      expect(await folios(AREA.compras)).toContain(id)
      expect(await folios(area)).toContain(id)
    }
  })
})

describe('O-22 Devolver o returnar', () => {
  it('o22_devolver_regresa_al_area_que_lo_envio_con_motivo_y_nota', async () => {
    const id = await enCompras()
    await entrarComo(USUARIO.raul)
    const m = await devolver(id, { motivo: 'falta_firma', id_area_sugerida: null, nota: 'Falta la firma autógrafa.' })
    expect(m).toMatchObject({ tipo: 'devolucion', area_origen: 'Compras', area_destino: 'Oficialía de partes', motivo: 'falta_firma' })
    expect(await folios()).not.toContain(id)
    expect((await obtenerFicha(id)).expediente?.notas.at(-1)).toMatchObject({ area: 'Compras', texto: 'Falta la firma autógrafa.' })
    await entrarComo(USUARIO.marta)
    expect(await folios()).toContain(id)
  })

  it('o22_returnar_lo_manda_al_area_sugerida_como_responsable_con_su_titular', async () => {
    const id = await enCompras()
    await entrarComo(USUARIO.raul)
    const m = await devolver(id, { motivo: 'no_competencia', id_area_sugerida: AREA.administracion, nota: '' })
    expect(m).toMatchObject({ area_destino: 'Administración', rol: 'responsable', titular_al_turnar: 'Mtro. Luis Gómez' })
    await entrarComo(USUARIO.marta)
    expect(await folios(AREA.administracion)).toContain(id)
    expect(await folios(AREA.compras)).not.toContain(id)
  })

  it('o22_d44_solo_el_titular_con_el_pendiente_y_motivo_del_catalogo', async () => {
    const id = await enCompras()
    const d = { motivo: 'falta_firma' as const, id_area_sugerida: null, nota: '' }
    await entrarComo(USUARIO.jorge)
    expect(await codigoDe(devolver(id, d))).toBe('SIN_PERMISO')
    await entrarComo(USUARIO.marta)
    expect(await codigoDe(devolver(id, d))).toBe('SIN_PERMISO')
    await entrarComo(USUARIO.raul)
    expect(await codigoDe(devolver(id, { ...d, motivo: 'otro' as never }))).toBe('VALIDACION')
    expect(await codigoDe(devolver(id, { ...d, id_area_sugerida: AREA.compras }))).toBe('VALIDACION')
  })
})

describe('O-23 Atraer', () => {
  it('o23_el_area_que_atrae_queda_responsable_y_la_anterior_deja_de_tenerlo', async () => {
    const id = await enCompras()
    await entrarComo(USUARIO.elena)
    expect(await codigoDe(atraer(id, '  '))).toBe('VALIDACION')
    const m = await atraer(id, 'Finanzas valida la suficiencia presupuestal.')
    expect(m).toMatchObject({ tipo: 'atraccion', area_origen: 'Compras', area_destino: 'Finanzas', rol: 'responsable' })
    const ficha = await obtenerFicha(id)
    expect(ficha.ubicacion_actual.map((u) => [u.area, u.rol])).toEqual([['Finanzas', 'responsable']])
    expect(await codigoDe(atraer(id, 'Otra vez'))).toBe('ESTADO_INVALIDO')
    await entrarComo(USUARIO.raul)
    expect(await folios()).not.toContain(id)
  })

  it('o23_d29_sin_visibilidad_no_se_atrae', async () => {
    const id = await enCompras()
    await entrarComo(USUARIO.marta)
    await turnar(id, [{ id_area: AREA.administracion, rol: 'responsable', instruccion: '' }])
    // Finanzas lo tiene como apoyo: puede atraerlo. Un titular sin movimiento en el documento, no.
    await entrarComo(USUARIO.elena)
    expect(await codigoDe(atraer(idPorFolio('OP-2026-0152'), 'Sin visibilidad'))).toBe('SIN_PERMISO')
  })
})

describe('D-68 Atraer deja una sola área responsable', () => {
  it('d68_atraer_con_dos_responsables_saca_a_ambas_y_no_toca_apoyo_ni_conocimiento', async () => {
    const id = idPorFolio('OP-2026-0152')
    // OP-2026-0152 está en Compras como responsable; oficialía lo turna además a Jurídico (D-67),
    // con Sistemas de apoyo y Finanzas para conocimiento.
    await entrarComo(USUARIO.marta)
    await turnar(id, [
      { id_area: AREA.juridico, rol: 'responsable', instruccion: '' },
      { id_area: AREA.sistemas, rol: 'apoyo', instruccion: '' },
      { id_area: AREA.finanzas, rol: 'conocimiento', instruccion: '' },
    ])
    const areasDe = async () => (await obtenerFicha(id)).ubicacion_actual.map((u) => [u.area, u.rol])
    expect(await areasDe()).toEqual([
      ['Compras', 'responsable'],
      ['Sistemas', 'apoyo'],
      ['Jurídico', 'responsable'],
    ])

    await entrarComo(USUARIO.elena)
    const m = await atraer(id, 'Finanzas concentra la cotización.')
    expect(m).toMatchObject({ tipo: 'atraccion', area_origen: 'Compras y Jurídico', area_destino: 'Finanzas' })
    expect(await areasDe()).toEqual([
      ['Finanzas', 'responsable'],
      ['Sistemas', 'apoyo'],
    ])
    await entrarComo(USUARIO.raul)
    expect(await folios()).not.toContain(id)
  })
})

describe('O-05 Concluir (D-44, D-58, D-59)', () => {
  const formas: [string, Omit<Conclusion, 'id_respuesta' | 'id_original'>][] = [
    ['con_respuesta', { forma: 'con_respuesta', nota: '' }],
    ['atencion_sin_oficio', { forma: 'atencion_sin_oficio', nota: 'Se entregaron los 12 equipos.' }],
    ['enterado', { forma: 'enterado', nota: '' }],
    ['no_procede', { forma: 'no_procede', nota: 'No corresponde atenderlo.' }],
    ['duplicado', { forma: 'duplicado', nota: 'Es el mismo oficio.' }],
  ]

  it.each(formas)('o05_d59_concluir_con_forma_%s', async (forma, datos) => {
    const otro = await enCompras()
    const id = await enCompras()
    await entrarComo(USUARIO.raul)
    const c: Conclusion = {
      ...datos,
      id_respuesta: forma === 'con_respuesta' ? otro : null,
      id_original: forma === 'duplicado' ? otro : null,
    }
    const m = await concluir(id, c)
    expect(m).toMatchObject({ tipo: 'conclusion', forma_conclusion: forma })
    const ficha = await obtenerFicha(id)
    expect(ficha.registro.estado).toBe('concluido')
    expect(ficha.ubicacion_actual).toEqual([])
    expect(await folios()).not.toContain(id)
  })

  it('o05_d59_respuesta_crea_responde_a_y_sin_oficio_deja_la_evidencia', async () => {
    const respuesta = await enCompras()
    const conRespuesta = await enCompras()
    const sinOficio = await enCompras()
    await entrarComo(USUARIO.raul)
    await concluir(conRespuesta, { forma: 'con_respuesta', id_respuesta: respuesta, id_original: null, nota: '' })
    await concluir(sinOficio, { forma: 'atencion_sin_oficio', id_respuesta: null, id_original: null, nota: 'Acta de entrega firmada.' })
    expect((await obtenerFicha(respuesta)).relaciones).toContainEqual(
      expect.objectContaining({ tipo: 'responde_a', id_documento: conRespuesta }),
    )
    expect((await obtenerFicha(sinOficio)).expediente?.notas.at(-1)).toMatchObject({
      tipo: 'evidencia_atencion',
      texto: 'Acta de entrega firmada.',
    })
  })

  it('o05_d59_requisitos_de_cada_forma', async () => {
    const id = await enCompras()
    await entrarComo(USUARIO.raul)
    const vacia = { id_respuesta: null, id_original: null, nota: '' }
    for (const forma of ['con_respuesta', 'atencion_sin_oficio', 'no_procede', 'duplicado'] as const)
      expect(await codigoDe(concluir(id, { ...vacia, forma }))).toBe('VALIDACION')
    expect(await codigoDe(concluir(id, { ...vacia, forma: 'con_respuesta', id_respuesta: id }))).toBe('VALIDACION')
  })

  it('o05_d44_concluye_titular_o_personal_del_area_responsable', async () => {
    const enterado: Conclusion = { forma: 'enterado', id_respuesta: null, id_original: null, nota: '' }
    const id = await enCompras()
    // Finanzas lo tiene como apoyo: no concluye. Dirección y oficialía tampoco.
    for (const usuario of [USUARIO.elena, USUARIO.ana, USUARIO.marta]) {
      await entrarComo(usuario)
      expect(await codigoDe(concluir(id, enterado))).toBe('SIN_PERMISO')
    }
    // El personal del área responsable sí.
    await entrarComo(USUARIO.jorge)
    expect(await codigoDe(concluir(id, enterado))).toBe('sin error')
    expect(await codigoDe(concluir(id, enterado))).toBe('ESTADO_INVALIDO')
  })
})

describe('O-20 y O-21 Salida externa y acuse (D-58)', () => {
  it('o20_o21_d58_oficialia_registra_el_acuse_y_el_area_responsable_concluye', async () => {
    const id = await enCompras()
    await entrarComo(USUARIO.marta)
    const salida = await registrarSalida({
      tipo: 'oficio',
      numero: 'DGA/CO/0213/2026',
      id_area_emisora: AREA.compras,
      destinatario: 'Dell México, S.A. de C.V.',
      sintesis: 'Orden de compra de 12 equipos',
      id_responde_a: id,
    })
    expect(salida.folio).toMatch(/^CO-2026-\d{4}$/)
    // Sin acuse todavía, no aparece en la tarjeta «Acuses».
    await entrarComo(USUARIO.raul)
    expect((await obtenerAcuses()).elementos.map((a) => a.id_salida)).not.toContain(salida.id)

    await entrarComo(USUARIO.marta)
    await registrarAcuse(salida.id, '2026-11-22T12:40:00-06:00', 'Recepción de Dell México')
    expect(await codigoDe(registrarAcuse(salida.id, '2026-11-22T12:41:00-06:00', 'Otra vez'))).toBe('CONFLICTO')
    // Oficialía registró el acuse, pero no concluye (D-58).
    const conRespuesta: Conclusion = { forma: 'con_respuesta', id_respuesta: salida.id, id_original: null, nota: '' }
    expect(await codigoDe(concluir(id, conRespuesta))).toBe('SIN_PERMISO')

    await entrarComo(USUARIO.raul)
    expect((await obtenerAcuses()).elementos).toContainEqual(
      expect.objectContaining({ id_salida: salida.id, id_documento: id, acusado_por: 'Recepción de Dell México' }),
    )
    await concluir(id, conRespuesta)
    expect((await obtenerAcuses()).elementos.map((a) => a.id_salida)).not.toContain(salida.id)
  })

  it('o21_solo_documentos_de_salida', async () => {
    await entrarComo(USUARIO.marta)
    expect(await codigoDe(registrarAcuse(idPorFolio('OP-2026-0139'), '2026-11-22T12:40:00-06:00', 'Alguien'))).toBe('NO_ENCONTRADO')
    // D-21: el folio de una salida lleva las siglas de su área emisora (CO-2026-…, UT-2026-…).
    expect(salidas.every((s) => s.folio.startsWith(`${areas.find((a) => a.id === s.id_area_emisora)?.siglas}-`))).toBe(true)
  })
})

describe('O-07 y O-18 Relacionar', () => {
  it('o07_registrado_no_registrado_y_quitar', async () => {
    await entrarComo(USUARIO.marta)
    const a = await registrarDocumento(nuevo())
    const b = await registrarDocumento(nuevo())
    await relacionar(a.id, 'da_seguimiento_a', { id_documento: b.id })
    await relacionar(a.id, 'en_alcance_a', { numero: 'DA/0412/2026', emisor: 'Dirección Académica' })
    expect(await codigoDe(relacionar(a.id, 'en_alcance_a', { numero: 'DA/0412/2026', emisor: 'Dirección Académica' }))).toBe('CONFLICTO')
    expect(await codigoDe(relacionar(a.id, 'responde_a', { id_documento: a.id }))).toBe('VALIDACION')
    expect(await codigoDe(relacionar(a.id, 'sustituye_a', { numero: 'X/1', emisor: 'Y' }))).toBe('VALIDACION')
    expect((await obtenerFicha(a.id)).relaciones?.map((r) => [r.tipo, r.id_documento, r.referencia])).toEqual([
      ['da_seguimiento_a', b.id, b.folio],
      ['en_alcance_a', null, 'DA/0412/2026'],
    ])
    await quitarRelacion(a.id, 'en_alcance_a', 'DA/0412/2026', 'Dirección Académica')
    expect((await obtenerFicha(a.id)).relaciones).toHaveLength(1)
  })

  it('o07_o18_d33_no_registrado_se_identifica_por_numero_y_emisor', async () => {
    await entrarComo(USUARIO.marta)
    const a = await registrarDocumento(nuevo())
    await relacionar(a.id, 'en_alcance_a', { numero: 'X/0001/2026', emisor: 'Emisor A' })
    // Mismo número, otro emisor: es otro documento no registrado, no un duplicado.
    await relacionar(a.id, 'en_alcance_a', { numero: 'X/0001/2026', emisor: 'Emisor B' })
    expect((await obtenerFicha(a.id)).relaciones).toHaveLength(2)
    await quitarRelacion(a.id, 'en_alcance_a', 'X/0001/2026', 'Emisor B')
    expect((await obtenerFicha(a.id)).relaciones?.map((r) => r.descripcion)).toEqual(['Emisor A'])
  })

  it('o07_sustituye_a_deja_al_otro_sin_efecto_y_quitarla_lo_devuelve', async () => {
    await entrarComo(USUARIO.marta)
    const a = await registrarDocumento(nuevo())
    const b = await registrarDocumento(nuevo())
    await relacionar(a.id, 'sustituye_a', { id_documento: b.id })
    expect((await obtenerFicha(b.id)).registro.estado).toBe('sin_efecto')
    expect(await folios()).not.toContain(b.id)
    await quitarRelacion(a.id, 'sustituye_a', b.folio, null)
    expect((await obtenerFicha(b.id)).registro.estado).toBe('en_tramite')
  })

  it('o07_d44_direccion_no_relaciona', async () => {
    await entrarComo(USUARIO.ana)
    expect(await codigoDe(relacionar(idPorFolio('OP-2026-0139'), 'en_alcance_a', { numero: 'X/1', emisor: 'Y' }))).toBe('SIN_PERMISO')
  })
})

describe('O-24 Cancelar', () => {
  it('o24_cancelado_no_se_borra_y_sale_de_todas_las_bandejas', async () => {
    const id = await enCompras()
    await entrarComo(USUARIO.marta)
    expect(await codigoDe(cancelarDocumento(id, ''))).toBe('VALIDACION')
    await cancelarDocumento(id, 'El área emisora retiró la solicitud.')
    const ficha = await obtenerFicha(id)
    expect(ficha.registro.estado).toBe('cancelado')
    expect(ficha.recorrido?.length).toBeGreaterThan(1)
    expect(ficha.ubicacion_actual).toEqual([])
    expect(await folios(AREA.compras)).not.toContain(id)
    expect(await folios(AREA.finanzas)).not.toContain(id)
    expect(await codigoDe(cancelarDocumento(id, 'Otra vez'))).toBe('ESTADO_INVALIDO')
    expect(await codigoDe(agregarNota(id, 'Nota'))).toBe('ESTADO_INVALIDO')
    await entrarComo(USUARIO.raul)
    expect(await codigoDe(cancelarDocumento(idPorFolio('OP-2026-0152'), 'No'))).toBe('SIN_PERMISO')
  })
})

describe('O-25 Corregir un movimiento', () => {
  it('o25_corregir_el_rol_inserta_un_movimiento_y_cambia_los_pendientes', async () => {
    await entrarComo(USUARIO.marta)
    const { id } = await registrarDocumento(nuevo())
    const { movimientos } = await turnar(id, [
      { id_area: AREA.compras, rol: 'responsable', instruccion: '' },
      { id_area: AREA.finanzas, rol: 'conocimiento', instruccion: '' },
    ])
    const [compras, finanzas] = movimientos
    if (!compras || !finanzas) throw new Error('El turno no devolvió dos movimientos')
    expect(await folios(AREA.finanzas)).not.toContain(id)

    expect(await codigoDe(corregirMovimiento(finanzas.id, { rol: 'apoyo', motivo: ' ' }))).toBe('VALIDACION')
    // RI-10: el grupo ya tiene un responsable, y no puede quedarse sin él.
    expect(await errorDe(corregirMovimiento(finanzas.id, { rol: 'responsable', motivo: 'x' }))).toMatchObject({
      title: 'Solo puede haber un responsable en el grupo.',
    })
    expect(await codigoDe(corregirMovimiento(compras.id, { rol: 'apoyo', motivo: 'x' }))).toBe('VALIDACION')

    const correccion = await corregirMovimiento(finanzas.id, { rol: 'apoyo', motivo: 'Debía recibirlo como apoyo.' })
    expect(correccion).toMatchObject({ tipo: 'correccion', id_corrige: finanzas.id, rol: 'apoyo', area_destino: 'Finanzas' })
    const recorrido = (await obtenerFicha(id)).recorrido ?? []
    expect(recorrido.find((m) => m.id === finanzas.id)?.rol).toBe('conocimiento')
    expect(recorrido.at(-1)?.id).toBe(correccion.id)
    expect(await folios(AREA.finanzas)).toContain(id)

    await entrarComo(USUARIO.raul)
    expect(await codigoDe(corregirMovimiento(finanzas.id, { rol: 'conocimiento', motivo: 'x' }))).toBe('SIN_PERMISO')
  })
})

describe('O-28 y O-29 Anexo y nota', () => {
  it('o28_o29_agregar_anexo_y_nota_con_permisos', async () => {
    const id = await enCompras()
    await entrarComo(USUARIO.marta)
    expect(await codigoDe(agregarAnexo(id, { titulo: 'Cotización', hojas: 0, ubicacion: 'Gaveta 2' }))).toBe('VALIDACION')
    await agregarAnexo(id, { titulo: 'Cotización', hojas: 4, ubicacion: 'Gaveta 2' })
    await entrarComo(USUARIO.jorge)
    await agregarNota(id, 'Se pidió la cotización firmada.')
    const e = (await obtenerFicha(id)).expediente
    expect(e?.anexos).toMatchObject([{ titulo: 'Cotización', hojas: 4 }])
    expect(e?.notas).toMatchObject([{ autor: 'Jorge Ruiz', area: 'Compras', texto: 'Se pidió la cotización firmada.' }])
    // O-28 es de oficialía y personal; el titular no agrega anexos.
    await entrarComo(USUARIO.raul)
    expect(await codigoDe(agregarAnexo(id, { titulo: 'Otro', hojas: 1, ubicacion: 'x' }))).toBe('SIN_PERMISO')
  })
})

describe('O-30 Buscar para elegir un documento', () => {
  it('o30_busca_documentos_y_salidas_visibles', async () => {
    await entrarComo(USUARIO.raul)
    const encontrados = (await buscarDocumentos('co-2026-0048')).elementos.map((d) => d.folio)
    expect(encontrados).toEqual(['CO-2026-0048'])
    // De otra área solo ve estado y responsable: no aparece al buscar.
    expect((await buscarDocumentos('OP-2026-0129')).elementos).toEqual([])
    expect((await buscarDocumentos('  ')).elementos).toEqual([])
  })
})
