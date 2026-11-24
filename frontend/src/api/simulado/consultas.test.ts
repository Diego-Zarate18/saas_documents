// Operaciones y consultas de T-02b sobre la fuente simulada. Los ids son los del catálogo (docs/operaciones/catalogo.json).
import { describe, expect, it } from 'vitest'
import { entrarComo, USUARIO } from '../../pruebas/utilidades'
import type { ErrorDeApi, NuevoDocumento, Uuid } from '../tipos'
import { AREA, ASUNTO, idPorFolio, PERSONA } from './datos'
import {
  asignarAsunto,
  buscar,
  crearAsunto,
  darDeBajaPersona,
  desactivarActor,
  desactivarArea,
  devolver,
  guardarActor,
  guardarArea,
  guardarPersona,
  obtenerActores,
  obtenerAlcanceAsunto,
  obtenerAreas,
  obtenerAsuntos,
  obtenerBandeja,
  obtenerCatalogos,
  obtenerComparacionDuplicado,
  obtenerFicha,
  obtenerHiloAsunto,
  obtenerOrganizacion,
  obtenerPersonas,
  obtenerPosiblesDuplicados,
  obtenerRebotes,
  obtenerSalidas,
  registrarDocumento,
  relacionar,
  resolverDuplicado,
  sacarDeAsunto,
  turnar,
} from './servidor'

const codigoDe = (promesa: Promise<unknown>) =>
  promesa.then(
    () => 'sin error',
    (e: ErrorDeApi) => e.problema.codigo,
  )

let consecutivo = 0
const nuevo = (cambios: Partial<NuevoDocumento> = {}): NuevoDocumento => ({
  tipo: 'oficio',
  numero_emisor: `PB/${String(++consecutivo).padStart(4, '0')}/2026`,
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

/** Registra como oficialía y lo turna a Compras como responsable. */
async function enCompras(cambios: Partial<NuevoDocumento> = {}): Promise<Uuid> {
  await entrarComo(USUARIO.marta)
  const { id } = await registrarDocumento(nuevo(cambios))
  await turnar(id, [{ id_area: AREA.compras, rol: 'responsable', instruccion: '' }])
  return id
}

describe('O-30 Buscar documentos', () => {
  it('o30_paginacion_obligatoria', async () => {
    await entrarComo(USUARIO.marta)
    const todo = await buscar({ tamano: 100 })
    const primera = await buscar({ tamano: 5 })
    const segunda = await buscar({ tamano: 5, pagina: 2 })
    expect(primera.total).toBe(todo.total)
    expect(primera.elementos).toHaveLength(5)
    expect(segunda.elementos.map((r) => r.folio)).toEqual(todo.elementos.slice(5, 10).map((r) => r.folio))
    // Sin tamaño, 20 por página; nunca más de 100.
    expect((await buscar()).elementos).toHaveLength(20)
    expect((await buscar({ tamano: 5000 })).elementos.length).toBeLessThanOrEqual(100)
  })

  it('o30_d29_fuera_de_la_visibilidad_solo_estado_y_responsable', async () => {
    // OP-2026-0097 pasó por Jurídico, Administración, Finanzas y Dirección; Compras nunca lo tuvo.
    await entrarComo(USUARIO.raul)
    const [ajeno] = (await buscar({ folio: 'OP-2026-0097' })).elementos
    expect(ajeno).toMatchObject({ visibilidad: 'restringida', numero_emisor: null, sintesis: null, estado: 'en_tramite' })
    expect(ajeno?.area_responsable).toBe('Dirección General')
    // Lo que no ve no sirve para filtrar: su síntesis no lo delata.
    expect((await buscar({ texto: 'convenio' })).elementos.map((r) => r.folio)).not.toContain('OP-2026-0097')
    await entrarComo(USUARIO.marta)
    expect((await buscar({ texto: 'convenio' })).elementos.map((r) => r.folio)).toContain('OP-2026-0097')
  })

  it('o30_d29_confidencial_de_otra_area_para_oficialia', async () => {
    // OP-2026-0109 lo registró y turnó otra persona de oficialía: Marta no tiene movimiento en él.
    await entrarComo(USUARIO.marta)
    const [confidencial] = (await buscar({ folio: 'OP-2026-0109' })).elementos
    expect(confidencial).toMatchObject({ visibilidad: 'confidencial', sintesis: null, numero_emisor: 'DEN-0045', area_responsable: 'Jurídico' })
    expect((await buscar({ texto: 'adjudicación' })).elementos.map((r) => r.folio)).not.toContain('OP-2026-0109')
    // Quien lo registró sí lo ve.
    await entrarComo('cruiz@institucion.gob.mx')
    expect((await buscar({ folio: 'OP-2026-0109' })).elementos[0]?.visibilidad).toBe('completa')
  })

  it('o30_d46_campo_propio_solo_en_los_dos_tipos_con_indice', async () => {
    await entrarComo(USUARIO.marta)
    const porEnte = await buscar({ campo_tipo: { clave: 'ente_auditor', valor: 'órgano interno' } })
    expect(porEnte.elementos.map((r) => r.folio)).toEqual(['OP-2026-0143'])
    expect(porEnte.elementos.every((r) => r.tipo === 'requerimiento_auditoria')).toBe(true)
    const porSolicitante = await buscar({ campo_tipo: { clave: 'solicitante', valor: 'Ciudadano' } })
    expect(porSolicitante.elementos.every((r) => r.tipo === 'solicitud_transparencia')).toBe(true)
    expect(porSolicitante.total).toBeGreaterThan(0)
    // «concepto» no tiene índice (D-66): no se busca por él.
    expect(await codigoDe(buscar({ campo_tipo: { clave: 'concepto' as never, valor: 'cómputo' } }))).toBe('VALIDACION')
  })

  it('o30_filtros_por_tipo_estado_emisor_y_fechas', async () => {
    await entrarComo(USUARIO.marta)
    const r = await buscar({ tipo: 'solicitud_material_pago', estado: 'en_tramite', emisor: 'Sistemas', desde: '2026-11-18', hasta: '2026-11-18' })
    expect(r.elementos.map((x) => x.folio)).toEqual(['OP-2026-0139'])
  })
})

describe('O-27, O-08 y O-18 Asuntos', () => {
  it('o27_o08_crear_con_documento_lo_asigna_y_o18_lo_saca', async () => {
    const id = idPorFolio('OP-2026-0152')
    await entrarComo(USUARIO.raul)
    expect(await codigoDe(crearAsunto({ nombre: ' ', descripcion: 'x' }, id))).toBe('VALIDACION')
    const asunto = await crearAsunto({ nombre: 'Papelería 2027', descripcion: 'Compras de papelería del próximo año.' }, id)
    expect(asunto).toMatchObject({ documentos: 1, creador: 'Ing. Raúl Pérez' })
    expect((await obtenerFicha(id)).asuntos?.map((a) => a.nombre)).toContain('Papelería 2027')
    // Un documento puede estar en varios asuntos, pero no dos veces en el mismo.
    await asignarAsunto(id, ASUNTO.presupuesto)
    expect(await codigoDe(asignarAsunto(id, asunto.id))).toBe('CONFLICTO')
    await sacarDeAsunto(id, asunto.id)
    expect((await obtenerFicha(id)).asuntos?.map((a) => a.id)).toEqual([ASUNTO.presupuesto])
    expect(await codigoDe(sacarDeAsunto(id, asunto.id))).toBe('NO_ENCONTRADO')
  })

  it('o08_o27_d44_permisos_por_rol', async () => {
    const id = idPorFolio('OP-2026-0139')
    // Oficialía crea asuntos (O-27) pero no asigna (O-08 es de TI y PE).
    await entrarComo(USUARIO.marta)
    const antes = (await obtenerAsuntos()).total
    expect(await codigoDe(asignarAsunto(id, ASUNTO.presupuesto))).toBe('SIN_PERMISO')
    expect(await codigoDe(crearAsunto({ nombre: 'Con documento', descripcion: 'x' }, id))).toBe('SIN_PERMISO')
    expect((await obtenerAsuntos()).total).toBe(antes)
    await crearAsunto({ nombre: 'Sin documento', descripcion: 'Lo crea oficialía.' })
    // Dirección solo consulta (D-62).
    await entrarComo(USUARIO.ana)
    expect(await codigoDe(asignarAsunto(id, ASUNTO.presupuesto))).toBe('SIN_PERMISO')
    expect(await codigoDe(crearAsunto({ nombre: 'DI', descripcion: 'x' }))).toBe('SIN_PERMISO')
    expect(await codigoDe(sacarDeAsunto(id, ASUNTO.laboratorios))).toBe('SIN_PERMISO')
    // Personal sin visibilidad del contenido no asigna (D-29).
    await entrarComo(USUARIO.jorge)
    expect(await codigoDe(asignarAsunto(idPorFolio('OP-2026-0097'), ASUNTO.presupuesto))).toBe('SIN_PERMISO')
  })
})

describe('C2 Hilo y C5 Alcance de un asunto', () => {
  it('c2_hilo_con_relaciones_en_ambos_sentidos_y_no_registrados', async () => {
    await entrarComo(USUARIO.ana)
    const { asunto, nodos } = await obtenerHiloAsunto(ASUNTO.laboratorios)
    expect(asunto.nombre).toBe('Equipamiento de laboratorios 2026')
    const resumen = nodos.map((n) => [n.referencia, n.profundidad, n.pertenece, n.relacion?.tipo ?? null, n.relacion?.sentido ?? null])
    expect(resumen).toEqual([
      ['OP-2026-0087', 0, true, null, null],
      ['OP-2026-0139', 0, true, null, null],
      ['SIS/0198/2026', 1, false, 'en_alcance_a', 'sale'],
      ['CO-2026-0048', 1, false, 'responde_a', 'entra'],
    ])
    const noRegistrado = nodos.find((n) => n.referencia === 'SIS/0198/2026')
    expect(noRegistrado).toMatchObject({ registrado: false, id_documento: null, descripcion: 'Sistemas', estado: null })
  })

  it('c2_d50_hasta_6_saltos', async () => {
    // Cadena de 8 documentos: cada uno da seguimiento al anterior.
    await entrarComo(USUARIO.marta)
    const ids: Uuid[] = []
    for (let i = 0; i < 8; i++) {
      const { id } = await registrarDocumento(nuevo({ sintesis: `Eslabón ${i}` }))
      if (ids.length) await relacionar(id, 'da_seguimiento_a', { id_documento: ids.at(-1) ?? '' })
      ids.push(id)
    }
    await turnar(ids[0] ?? '', [{ id_area: AREA.compras, rol: 'responsable', instruccion: '' }])
    await entrarComo(USUARIO.raul)
    const asunto = await crearAsunto({ nombre: 'Cadena larga', descripcion: 'Seis saltos como máximo.' }, ids[0])
    await entrarComo(USUARIO.marta)
    const { nodos } = await obtenerHiloAsunto(asunto.id)
    expect(nodos.map((n) => n.profundidad)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(nodos.map((n) => n.id_documento)).not.toContain(ids[7])
  })

  it('c2_c5_d29_sin_visibilidad_solo_area_sin_contenido_ni_personas', async () => {
    // Finanzas no tiene movimiento en los documentos del asunto de auditoría.
    await entrarComo(USUARIO.elena)
    const { nodos } = await obtenerHiloAsunto(ASUNTO.auditoria)
    expect(nodos.length).toBeGreaterThan(0)
    // Ve el estado de los documentos (D-29), no su contenido; la salida de Compras tampoco.
    expect(nodos.every((n) => n.descripcion === null)).toBe(true)
    expect(nodos.filter((n) => n.id_documento).every((n) => n.estado !== null)).toBe(true)
    expect(nodos.map((n) => n.referencia)).toContain('CO-2026-0046')
    const alcance = await obtenerAlcanceAsunto(ASUNTO.auditoria)
    expect(alcance.areas.map((a) => a.area)).toContain('Compras')
    expect(alcance.personas).toEqual([])
  })

  it('c5_alcance_areas_y_personas_con_contacto', async () => {
    await entrarComo(USUARIO.marta)
    const alcance = await obtenerAlcanceAsunto(ASUNTO.laboratorios)
    expect(alcance.areas).toContainEqual({ area: 'Compras', documentos: 2 })
    expect(alcance.areas).toContainEqual({ area: 'Oficialía de partes', documentos: 2 })
    expect(alcance.personas).toEqual(expect.arrayContaining(['Marta Flores', 'Ing. Raúl Pérez']))
  })
})

describe('C3 Rebotes (D-32)', () => {
  it('c3_los_tres_casos_de_rebote', async () => {
    await entrarComo(USUARIO.ana)
    const rebotes = (await obtenerRebotes()).elementos
    const reglasDe = (folio: string) => rebotes.find((r) => r.folio === folio)?.reglas
    expect(reglasDe('OP-2026-0118')).toEqual(['no_competencia_sin_area'])
    expect(reglasDe('OP-2026-0131')).toEqual(['tres_devoluciones'])
    expect(reglasDe('OP-2026-0097')).toEqual(['tres_areas'])
    expect(rebotes.find((r) => r.folio === 'OP-2026-0097')).toMatchObject({ areas: 4, ubicacion: 'Dirección General' })
    // Por área y por periodo (D-50: se ancla en movimientos por fecha).
    expect((await obtenerRebotes({ id_area: AREA.rrhh })).elementos.map((r) => r.folio)).toEqual(['OP-2026-0131'])
    expect((await obtenerRebotes({ periodo: '2026-10' })).total).toBe(0)
    expect(await codigoDe(obtenerRebotes({ periodo: 'noviembre' }))).toBe('VALIDACION')
  })

  it('c3_devolucion_con_motivo_y_returno_con_area_no_son_rebote', async () => {
    const conMotivo = await enCompras()
    const conArea = await enCompras()
    const sinArea = await enCompras()
    await entrarComo(USUARIO.raul)
    await devolver(conMotivo, { motivo: 'falta_firma', id_area_sugerida: null, nota: '' })
    await devolver(conArea, { motivo: 'no_competencia', id_area_sugerida: AREA.finanzas, nota: '' })
    await devolver(sinArea, { motivo: 'no_competencia', id_area_sugerida: null, nota: '' })
    await entrarComo(USUARIO.marta)
    const ids = (await obtenerRebotes()).elementos.map((r) => r.id_documento)
    expect(ids).not.toContain(conMotivo)
    expect(ids).not.toContain(conArea)
    expect(ids).toContain(sinArea)
  })

  it('c3_d44_solo_oficialia_y_direccion_y_confidencial_sin_contenido', async () => {
    await entrarComo(USUARIO.raul)
    expect(await codigoDe(obtenerRebotes())).toBe('SIN_PERMISO')
    // OP-2026-0129 es confidencial y Dirección no tiene movimiento: el rebote se ve sin su asunto.
    await entrarComo(USUARIO.ana)
    expect((await obtenerRebotes()).elementos.find((r) => r.folio === 'OP-2026-0129')).toMatchObject({ asunto: null })
  })
})

describe('O-26 Resolver posible duplicado', () => {
  it('o26_comparacion_con_el_candidato_del_mismo_emisor_y_fecha', async () => {
    await entrarComo(USUARIO.marta)
    const c = await obtenerComparacionDuplicado(idPorFolio('OP-2026-0141'))
    expect(c.candidato?.folio).toBe('OP-2026-0140')
    expect(c.coincidencias).toEqual(['emisor', 'fecha_documento', 'sintesis'])
    expect(c.candidato?.ubicacion).toBe('Unidad de Transparencia')
  })

  it('o26_son_el_mismo_cancela_el_posterior_con_duplicado_de_y_conserva_movimientos', async () => {
    const id = idPorFolio('OP-2026-0141')
    await entrarComo(USUARIO.marta)
    const pasos = (await obtenerFicha(id)).recorrido?.length
    expect((await obtenerBandeja()).elementos.map((p) => p.id_documento)).toContain(id)
    await resolverDuplicado(id, idPorFolio('OP-2026-0140'), 'mismo')
    const ficha = await obtenerFicha(id)
    expect(ficha.registro).toMatchObject({ estado: 'cancelado', posible_duplicado: false })
    expect(ficha.recorrido).toHaveLength(pasos ?? 0)
    const { documentos } = await import('./datos')
    expect(documentos.find((d) => d.id === id)?.duplicado_de).toBe(idPorFolio('OP-2026-0140'))
    expect((await obtenerPosiblesDuplicados()).elementos.map((d) => d.id)).not.toContain(id)
    expect((await obtenerBandeja()).elementos.map((p) => p.id_documento)).not.toContain(id)
    expect(await codigoDe(resolverDuplicado(id, idPorFolio('OP-2026-0140'), 'mismo'))).toBe('ESTADO_INVALIDO')
  })

  it('o26_son_distintos_solo_retira_la_marca', async () => {
    const id = idPorFolio('OP-2026-0103')
    await entrarComo(USUARIO.marta)
    const c = await obtenerComparacionDuplicado(id)
    expect(c.candidato?.folio).toBe('OP-2026-0101')
    await resolverDuplicado(id, c.candidato?.id ?? '', 'distintos')
    expect((await obtenerFicha(id)).registro).toMatchObject({ estado: 'en_tramite', posible_duplicado: false })
  })

  it('o26_d44_solo_oficialia_y_el_original_es_anterior', async () => {
    await entrarComo(USUARIO.raul)
    expect(await codigoDe(obtenerPosiblesDuplicados())).toBe('SIN_PERMISO')
    await entrarComo(USUARIO.marta)
    const [pendiente] = (await obtenerPosiblesDuplicados()).elementos
    expect(pendiente?.falta).toBe('numero')
    expect(await codigoDe(resolverDuplicado(pendiente?.id ?? '', idPorFolio('OP-2026-0152'), 'mismo'))).toBe('VALIDACION')
    // Sin candidato no se puede decir que son el mismo, pero sí retirar la marca.
    const id = idPorFolio('OP-2026-0101')
    expect((await obtenerComparacionDuplicado(id)).candidato).toBeNull()
    expect(await codigoDe(resolverDuplicado(id, null, 'mismo'))).toBe('NO_ENCONTRADO')
    await resolverDuplicado(id, null, 'distintos')
    expect((await obtenerFicha(id)).registro.posible_duplicado).toBe(false)
  })
})

describe('Salidas externas (V-13)', () => {
  it('o20_o21_listado_con_responde_a_y_filtro_de_acuse', async () => {
    await entrarComo(USUARIO.marta)
    const todas = await obtenerSalidas()
    expect(todas.elementos[0]).toMatchObject({ folio: 'UT-2026-0001', folio_responde_a: 'OP-2026-0140', acuse: null })
    const sin = await obtenerSalidas('sin')
    expect(sin.elementos.every((s) => s.acuse === null)).toBe(true)
    expect((await obtenerSalidas('con')).total + sin.total).toBe(todas.total)
    await entrarComo(USUARIO.raul)
    expect(await codigoDe(obtenerSalidas())).toBe('SIN_PERMISO')
  })
})

describe('O-32 y O-33 Organización y áreas', () => {
  it('o32_estructura_actual_para_todos_los_roles', async () => {
    await entrarComo(USUARIO.jorge)
    const areas = (await obtenerOrganizacion()).elementos
    const vinculacion = areas.find((a) => a.siglas === 'VI')
    expect(vinculacion).toMatchObject({ id_titular: null, activa: true, id_padre: AREA.direccion })
    expect(vinculacion?.personas.map((p) => p.nombre)).toEqual(['Lic. Irma Vela', 'Ing. Óscar Paz'])
    expect(areas.find((a) => a.siglas === 'UT')?.id_padre).toBe(AREA.juridico)
    expect(areas.find((a) => a.siglas === 'AR')?.activa).toBe(false)
    // Los selectores solo ofrecen áreas activas.
    expect((await obtenerAreas()).elementos.map((a) => a.siglas)).not.toContain('AR')
  })

  it('o33_d47_sin_ciclos_y_d61_siglas_fijas_con_folios', async () => {
    await entrarComo(USUARIO.luis)
    const juridico = { siglas: 'JU', nombre: 'Jurídico', id_padre: AREA.transparencia, id_titular: null }
    expect(await codigoDe(guardarArea(juridico, AREA.juridico))).toBe('VALIDACION')
    expect(await codigoDe(guardarArea({ ...juridico, id_padre: AREA.juridico }, AREA.juridico))).toBe('VALIDACION')
    const compras = { siglas: 'COM', nombre: 'Compras', id_padre: AREA.direccion, id_titular: PERSONA.raul }
    expect(await codigoDe(guardarArea(compras, AREA.compras))).toBe('CONFLICTO')
    // Un área nueva sin folios sí cambia sus siglas.
    const nueva = await guardarArea({ siglas: 'pl', nombre: 'Planeación', id_padre: AREA.direccion, id_titular: null })
    expect(nueva.siglas).toBe('PL')
    expect((await guardarArea({ siglas: 'PLA', nombre: 'Planeación', id_padre: AREA.direccion, id_titular: null }, nueva.id)).siglas).toBe('PLA')
    expect(await codigoDe(guardarArea({ siglas: 'CO', nombre: 'Otra', id_padre: AREA.direccion, id_titular: null }))).toBe('CONFLICTO')
    expect(await codigoDe(guardarArea({ siglas: 'XY', nombre: 'Sin padre', id_padre: null, id_titular: null }))).toBe('VALIDACION')
    // Renombrar un área conserva la liga con los documentos que emitió (RI-06).
    await guardarArea({ siglas: 'SIS', nombre: 'Sistemas de información', id_padre: AREA.direccion, id_titular: null }, AREA.sistemas)
    await entrarComo(USUARIO.marta)
    expect((await buscar({ emisor: 'Sistemas de información', folio: 'OP-2026-0139' })).total).toBe(1)
    expect((await buscar({ emisor: 'Sistemas' })).total).toBe(0)
    await entrarComo(USUARIO.luis)
    // El titular debe estar adscrito al área.
    expect(await codigoDe(guardarArea({ ...compras, siglas: 'CO', id_titular: PERSONA.elena }, AREA.compras))).toBe('VALIDACION')
  })

  it('o33_d42_no_se_desactiva_con_pendientes', async () => {
    await entrarComo(USUARIO.luis)
    const vinculacion = (await obtenerOrganizacion()).elementos.find((a) => a.siglas === 'VI')
    expect(vinculacion?.pendientes).toBe(0)
    const compras = (await obtenerOrganizacion()).elementos.find((a) => a.siglas === 'CO')
    expect(compras?.pendientes).toBeGreaterThan(0)
    expect(await codigoDe(desactivarArea(AREA.compras))).toBe('CONFLICTO')
    // Con un área activa que depende de ella tampoco: quedaría fuera de la estructura (V-16).
    const madre = await guardarArea({ siglas: 'MA', nombre: 'Madre', id_padre: AREA.direccion, id_titular: null })
    const hija = await guardarArea({ siglas: 'HI', nombre: 'Hija', id_padre: madre.id, id_titular: null })
    expect(await codigoDe(desactivarArea(madre.id))).toBe('CONFLICTO')
    await desactivarArea(hija.id)
    await desactivarArea(madre.id)
    await desactivarArea(AREA.vinculacion)
    expect((await obtenerAreas()).elementos.map((a) => a.siglas)).not.toContain('VI')
    await entrarComo(USUARIO.marta)
    expect(await codigoDe(guardarArea({ siglas: 'ZZ', nombre: 'Z', id_padre: AREA.direccion, id_titular: null }))).toBe('SIN_PERMISO')
  })
})

describe('O-35 Actores externos', () => {
  it('o35_crear_y_usar_en_el_catalogo_y_nombre_unico', async () => {
    await entrarComo(USUARIO.marta)
    const actor = await guardarActor({ nombre: 'Colegio de Ingenieros', tipo: 'institucion', correo: ' ', telefono: '961 000 0000' })
    expect(actor).toMatchObject({ correo: null, telefono: '961 000 0000', activo: true, documentos: 0 })
    expect((await obtenerCatalogos()).actores_externos.map((a) => a.nombre)).toContain('Colegio de Ingenieros')
    expect(await codigoDe(guardarActor({ nombre: 'colegio de ingenieros', tipo: 'institucion', correo: null, telefono: null }))).toBe('CONFLICTO')
    expect(await codigoDe(guardarActor({ nombre: 'X', tipo: 'empresa' as never, correo: null, telefono: null }))).toBe('VALIDACION')
    await entrarComo(USUARIO.raul)
    expect(await codigoDe(obtenerActores())).toBe('SIN_PERMISO')
  })

  it('o35_actor_con_documentos_se_desactiva_no_se_borra', async () => {
    await entrarComo(USUARIO.luis)
    const oic = (await obtenerActores()).elementos.find((a) => a.nombre === 'Órgano Interno de Control')
    expect(oic?.documentos).toBeGreaterThan(0)
    await desactivarActor(oic?.id ?? '')
    const despues = (await obtenerActores()).elementos.find((a) => a.id === oic?.id)
    expect(despues).toMatchObject({ activo: false, documentos: oic?.documentos })
    expect((await obtenerCatalogos()).actores_externos.map((a) => a.id)).not.toContain(oic?.id)
  })
})

// Al final: dar de baja a Raúl impide que vuelva a entrar en las pruebas que sigan.
describe('O-34 Personas y usuarios', () => {
  it('o34_correo_unico', async () => {
    await entrarComo(USUARIO.luis)
    const datos = { nombre: 'Mariana Solís Aguilar', correo: 'JRUIZ@institucion.gob.mx', id_area: AREA.compras, rol: 'PE' as const }
    expect(await codigoDe(guardarPersona(datos))).toBe('CONFLICTO')
    const mariana = await guardarPersona({ ...datos, correo: 'msolis@institucion.gob.mx' })
    expect(mariana).toMatchObject({ nombre_area: 'Compras', rol: 'PE', activa: true })
    expect(await codigoDe(guardarPersona({ ...datos, correo: 'no es correo' }))).toBe('VALIDACION')
    await entrarComo(USUARIO.marta)
    expect(await codigoDe(obtenerPersonas())).toBe('SIN_PERMISO')
  })

  it('o34_baja_de_un_titular_deja_el_area_vacante_y_conserva_sus_movimientos', async () => {
    await entrarComo(USUARIO.luis)
    expect(await codigoDe(darDeBajaPersona(PERSONA.luis))).toBe('VALIDACION')
    await darDeBajaPersona(PERSONA.raul)
    expect((await obtenerOrganizacion()).elementos.find((a) => a.siglas === 'CO')).toMatchObject({ id_titular: null, nombre_titular: null })
    expect((await obtenerPersonas()).elementos.find((p) => p.id === PERSONA.raul)?.activa).toBe(false)
    expect(await codigoDe(entrarComo(USUARIO.raul))).toBe('NO_AUTENTICADO')
    await entrarComo(USUARIO.marta)
    const recorrido = (await obtenerFicha(idPorFolio('OP-2026-0139'))).recorrido ?? []
    expect(recorrido.some((m) => m.persona === 'Ing. Raúl Pérez')).toBe(true)
  })
})
