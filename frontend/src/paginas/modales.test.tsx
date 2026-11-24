// Modales de T-02a: el patrón de V-05 (foco atrapado, Esc, foco devuelto, botón pendiente y error en línea)
// y los flujos de V-03, V-07, V-09b y V-13b sobre la fuente simulada.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { corregirMovimiento, registrarDocumento, turnar } from '../api'
import { AREA, idPorFolio } from '../api/simulado/datos'
import { conEscrituraRetenida } from '../pruebas/retener'
import { entrarComo, montarApp, USUARIO } from '../pruebas/utilidades'

// O-22 y O-28 esperan a `escritura.retener` antes de llegar al simulador (ver conEscrituraRetenida).
const escritura = vi.hoisted(() => ({ retener: Promise.resolve() }))
vi.mock('../api', async (original) => {
  const api = await original<typeof import('../api')>()
  const { retenida } = await import('../pruebas/retener')
  return {
    ...api,
    devolver: retenida(escritura, api.devolver),
    agregarAnexo: retenida(escritura, api.agregarAnexo),
  }
})

type Usuario = ReturnType<typeof userEvent.setup>

/** Abre un modal desde un botón o desde una opción de menú y devuelve el control que debe recibir el foco al cerrar. */
async function abrir(usuario: Usuario, boton: string, opcion?: string) {
  const control = await screen.findByRole('button', { name: boton })
  await usuario.click(control)
  if (opcion) await usuario.click(await screen.findByRole('menuitem', { name: new RegExp(opcion) }))
  return control
}

describe('Modales de la ficha y de salidas: teclado y foco', () => {
  it.each([
    ['o07', USUARIO.marta, '/documentos/OP-2026-0139', 'Relacionar', undefined, 'Relacionar documentos'],
    ['o19', USUARIO.marta, '/documentos/OP-2026-0139', 'Más acciones', 'Registrar segunda recepción', 'Registrar segunda recepción'],
    ['o25', USUARIO.marta, '/documentos/OP-2026-0139', 'Más acciones', 'Corregir un movimiento', 'Corregir un movimiento'],
    ['o24', USUARIO.marta, '/documentos/OP-2026-0139', 'Más acciones', 'Cancelar documento', 'Cancelar documento'],
    ['o22', USUARIO.raul, '/documentos/OP-2026-0152', 'Devolver', undefined, 'Devolver o returnar'],
    ['o05', USUARIO.raul, '/documentos/OP-2026-0152', 'Concluir', undefined, 'Concluir documento'],
    ['o23', USUARIO.elena, '/documentos/OP-2026-0139', 'Atraer', undefined, 'Atraer documento'],
    ['o20', USUARIO.marta, '/salidas', 'Registrar salida', undefined, 'Registrar salida externa'],
    ['o28', USUARIO.marta, '/documentos/OP-2026-0139', 'Agregar a Anexos', undefined, 'Agregar anexo'],
    ['o29', USUARIO.marta, '/documentos/OP-2026-0139', 'Agregar a Notas', undefined, 'Agregar nota'],
    ['o08', USUARIO.raul, '/documentos/OP-2026-0152', 'Más', 'Asignar a un asunto', 'Asignar a un asunto'],
    ['o08', USUARIO.raul, '/asuntos', 'Asignar documento', undefined, 'Asignar documento'],
  ])('%s_modal_atrapa_el_foco_esc_cierra_y_devuelve_el_foco', async (_op, correo, ruta, boton, opcion, titulo) => {
    const usuario = userEvent.setup()
    await entrarComo(correo)
    montarApp(ruta.replace(/OP-\d{4}-\d{4}/, (folio) => idPorFolio(folio)))
    const control = await abrir(usuario, boton, opcion)
    const dialogo = await screen.findByRole('dialog', { name: titulo })
    expect(dialogo).toContainElement(document.activeElement as HTMLElement)
    for (let i = 0; i < 15; i++) {
      await usuario.tab()
      expect(dialogo).toContainElement(document.activeElement as HTMLElement)
    }
    await usuario.tab({ shift: true })
    expect(dialogo).toContainElement(document.activeElement as HTMLElement)
    await usuario.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(control).toHaveFocus())
  }, 15_000)
})

describe('V-07 Devolver (O-22)', () => {
  it('o22_motivo_obligatorio_boton_pendiente_y_la_ficha_se_refresca', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.raul)
    montarApp(`/documentos/${idPorFolio('OP-2026-0152')}`)
    await abrir(usuario, 'Devolver')
    const dialogo = await screen.findByRole('dialog', { name: 'Devolver o returnar' })
    // El nombre del área va tal cual, sin pasarlo a minúsculas.
    const devolver = within(dialogo).getByRole('button', { name: 'Devolver a Oficialía de partes' })
    expect(devolver).toBeDisabled()
    await usuario.click(within(dialogo).getByRole('radio', { name: /Falta firma/ }))
    await conEscrituraRetenida(escritura, async () => {
      await usuario.click(devolver)
      await waitFor(() => expect(devolver).toHaveAttribute('aria-busy', 'true'))
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Compras ya no lo tiene: la ficha se volvió a leer y el titular ya no ve «Devolver».
    expect(await screen.findByText('Pendiente en Oficialía de partes como responsable · 0 días')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Devolver' })).not.toBeInTheDocument()
  })

  it('o22_returnar_avisa_rebote_sin_area_y_titular_con_area', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.raul)
    montarApp(`/documentos/${idPorFolio('OP-2026-0133')}`)
    await abrir(usuario, 'Devolver')
    const dialogo = await screen.findByRole('dialog', { name: 'Devolver o returnar' })
    await usuario.click(within(dialogo).getByRole('radio', { name: 'Returnar' }))
    await usuario.click(within(dialogo).getByRole('radio', { name: /No es de nuestra competencia/ }))
    expect(within(dialogo).getByRole('status')).toHaveTextContent('Sin área sugerida cuenta como rebote')
    await usuario.click(within(dialogo).getByRole('combobox', { name: /Área sugerida/ }))
    await usuario.click(await screen.findByRole('option', { name: 'Administración' }))
    expect(within(dialogo).getByRole('status')).toHaveTextContent('Administración lo recibe como responsable; titular: Mtro. Luis Gómez.')
    expect(within(dialogo).getByRole('button', { name: 'Returnar a Administración' })).toBeEnabled()
  })

  it('o22_o25_regresa_a_usa_los_roles_corregidos_como_el_servidor', async () => {
    // Llega a Compras de oficialía como responsable y luego de Dirección para conocimiento, corregido a apoyo:
    // el último envío que cuenta es el de Dirección.
    await entrarComo(USUARIO.marta)
    const { id } = await registrarDocumento({
      tipo: 'oficio',
      numero_emisor: 'PR/0901/2026',
      tipo_emisor: 'externo',
      emisor: 'Proveedor externo',
      fecha_documento: '2026-11-20',
      canal: 'papel',
      fecha_recepcion: '2026-11-22T10:00:00-06:00',
      sintesis: 'Documento corregido',
      confidencial: false,
      extemporaneo: false,
      datos_tipo: {},
    })
    await turnar(id, [{ id_area: AREA.compras, rol: 'responsable', instruccion: '' }])
    await entrarComo(USUARIO.ana)
    const { movimientos } = await turnar(id, [
      { id_area: AREA.sistemas, rol: 'responsable', instruccion: '' },
      { id_area: AREA.compras, rol: 'conocimiento', instruccion: '' },
    ])
    await entrarComo(USUARIO.marta)
    await corregirMovimiento(movimientos.find((m) => m.area_destino === 'Compras')?.id ?? '', { rol: 'apoyo', motivo: 'Era apoyo' })

    const usuario = userEvent.setup()
    await entrarComo(USUARIO.raul)
    montarApp(`/documentos/${id}`)
    await abrir(usuario, 'Devolver')
    const dialogo = await screen.findByRole('dialog', { name: 'Devolver o returnar' })
    expect(within(dialogo).getByText(/Regresa a Dirección General/)).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Devolver a Dirección General' })).toBeInTheDocument()
  })
})

describe('Anexo y nota (O-28, O-29), diseño propio', () => {
  it('o28_hojas_invalidas_en_linea_boton_pendiente_y_el_anexo_aparece', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.marta)
    montarApp(`/documentos/${idPorFolio('OP-2026-0139')}`)
    await abrir(usuario, 'Agregar a Anexos')
    const dialogo = await screen.findByRole('dialog', { name: 'Agregar anexo' })
    const agregar = within(dialogo).getByRole('button', { name: 'Agregar anexo' })
    await usuario.type(within(dialogo).getByLabelText('Descripción'), 'Acta de entrega')
    const hojas = within(dialogo).getByLabelText('Número de hojas')
    await usuario.type(hojas, '0')
    await usuario.tab()
    expect(hojas).toHaveAccessibleDescription('El número de hojas debe ser 1 o más.')
    await usuario.clear(hojas)
    await usuario.type(hojas, '3')
    await usuario.type(within(dialogo).getByLabelText('Ubicación física'), 'Archivo de oficialía, gaveta 4')
    await conEscrituraRetenida(escritura, async () => {
      await usuario.click(agregar)
      await waitFor(() => expect(agregar).toHaveAttribute('aria-busy', 'true'))
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Acta de entrega')).toBeInTheDocument()
  })

  it('o29_nota_vacia_en_linea_y_la_nota_aparece_con_su_autor', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.marta)
    montarApp(`/documentos/${idPorFolio('OP-2026-0139')}`)
    await abrir(usuario, 'Agregar a Notas')
    const dialogo = await screen.findByRole('dialog', { name: 'Agregar nota' })
    const nota = within(dialogo).getByLabelText('Nota')
    await usuario.click(nota)
    await usuario.tab()
    expect(nota).toHaveAccessibleDescription('Escribe la nota.')
    expect(within(dialogo).getByRole('button', { name: 'Agregar nota' })).toBeDisabled()
    await usuario.type(nota, 'Se recibió la cotización firmada.')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar nota' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Se recibió la cotización firmada.')).toBeInTheDocument()
  })
})

describe('Buscador de documento (V-09, V-10, V-13b)', () => {
  it('o30_flechas_e_intro_eligen_escribir_busca_de_nuevo_y_esc_solo_cierra_la_lista', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.raul)
    montarApp(`/documentos/${idPorFolio('OP-2026-0123')}`)
    await abrir(usuario, 'Concluir')
    const dialogo = await screen.findByRole('dialog', { name: 'Concluir documento' })
    const buscador = within(dialogo).getByRole('combobox', { name: 'Documento de respuesta (obligatorio con esta forma)' })
    await usuario.type(buscador, 'CO-2026-004')
    // Tres resultados (CO-2026-0048, 0049 y 0046): la flecha baja al segundo e Intro lo elige.
    await within(dialogo).findByRole('option', { name: /CO-2026-0046/ })
    await usuario.keyboard('{ArrowDown}{Enter}')
    expect(buscador).toHaveValue('CO-2026-0049 Cotización de papelería enviada')
    expect(within(dialogo).getByRole('button', { name: 'Concluir documento' })).toBeEnabled()

    // Escribir con un documento elegido empieza otra búsqueda y conserva lo tecleado.
    await usuario.type(buscador, 'C')
    expect(buscador).toHaveValue('C')
    expect(within(dialogo).getByRole('button', { name: 'Concluir documento' })).toBeDisabled()
    await within(dialogo).findByRole('option', { name: /CO-2026-0049/ })
    expect(buscador).toHaveAttribute('aria-expanded', 'true')

    // Esc cierra solo la lista; el modal sigue abierto con lo escrito.
    await usuario.keyboard('{Escape}')
    expect(buscador).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('dialog', { name: 'Concluir documento' })).toBeInTheDocument()
    expect(buscador).toHaveValue('C')
  })
})

describe('V-09b Concluir sin oficio (O-05, D-59)', () => {
  it('o05_d59_sin_evidencia_el_boton_queda_deshabilitado_y_el_campo_muestra_el_error', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.jorge)
    montarApp(`/documentos/${idPorFolio('OP-2026-0126')}`)
    await abrir(usuario, 'Concluir')
    const dialogo = await screen.findByRole('dialog', { name: 'Concluir documento' })
    const concluir = within(dialogo).getByRole('button', { name: 'Concluir documento' })
    await usuario.click(within(dialogo).getByRole('radio', { name: /Atención sin oficio/ }))
    const evidencia = within(dialogo).getByRole('textbox', { name: 'Evidencia de la atención (obligatoria)' })
    expect(concluir).toBeDisabled()
    await usuario.click(evidencia)
    await usuario.tab()
    expect(evidencia).toHaveAccessibleDescription('Escribe la evidencia de la atención.')
    await usuario.type(evidencia, 'Acta de entrega firmada.')
    expect(concluir).toBeEnabled()
    await usuario.click(concluir)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Concluido')).toBeInTheDocument()
    expect(screen.getByText('Acta de entrega firmada.')).toBeInTheDocument()
  })
})

describe('V-10 Relacionar (O-07)', () => {
  it('o07_error_del_servidor_en_linea', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.marta)
    montarApp(`/documentos/${idPorFolio('OP-2026-0139')}`)
    await abrir(usuario, 'Relacionar')
    const dialogo = await screen.findByRole('dialog', { name: 'Relacionar documentos' })
    await usuario.click(within(dialogo).getByRole('radio', { name: /En alcance a/ }))
    await usuario.click(within(dialogo).getByRole('radio', { name: 'No registrado' }))
    // «Sustituye a» no se ofrece con un documento no registrado (D-14).
    expect(within(dialogo).getByRole('radio', { name: /Sustituye a/ })).toBeDisabled()
    await usuario.type(within(dialogo).getByRole('textbox', { name: 'Número del documento' }), 'SIS/0198/2026')
    await usuario.click(within(dialogo).getByRole('combobox', { name: /^Emisor/ }))
    await usuario.click(await screen.findByRole('option', { name: 'Sistemas' }))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Relacionar' }))
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Esa relación ya existe.')
    expect(dialogo).toBeInTheDocument()
  })
})

describe('V-03 Registrar documento (O-01, D-66)', () => {
  it('d66_el_bloque_de_datos_del_tipo_solo_aparece_en_los_tres_tipos', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.marta)
    montarApp('/registrar')
    const elegir = async (tipo: string) => {
      await usuario.click(await screen.findByRole('combobox', { name: /^Tipo de documento/ }))
      await usuario.click(await screen.findByRole('option', { name: tipo }))
    }
    for (const [tipo, campo] of [
      ['Requerimiento de auditoría', 'Ente auditor'],
      ['Solicitud de transparencia', 'Solicitante'],
      ['Solicitud de material o pago', 'Concepto (opcional)'],
    ] as const) {
      await elegir(tipo)
      expect(screen.getByRole('heading', { name: `Contenido · ${tipo}` })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: campo })).toBeInTheDocument()
    }
    for (const tipo of ['Oficio', 'Memorándum', 'Circular', 'Informe']) {
      await elegir(tipo)
      expect(screen.queryByRole('heading', { name: /^Contenido ·/ })).not.toBeInTheDocument()
    }
  }, 20_000)

  it('o01_validacion_en_linea_y_registro_navega_a_la_ficha', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.marta)
    montarApp('/registrar')
    const folio = (await screen.findByText(/^OP-2026-\d{4}$/)).textContent ?? ''
    await usuario.click(screen.getByRole('button', { name: 'Registrar y asignar folio' }))
    expect(await screen.findByText('Elige el tipo de documento.')).toBeInTheDocument()
    expect(screen.getByText('Escribe la síntesis.')).toBeInTheDocument()

    await usuario.click(screen.getByRole('combobox', { name: /^Tipo de documento/ }))
    await usuario.click(await screen.findByRole('option', { name: 'Requerimiento de auditoría' }))
    // RI-06: el actor externo se elige del catálogo.
    await usuario.click(screen.getByRole('combobox', { name: /^Actor externo/ }))
    await usuario.click(await screen.findByRole('option', { name: 'Auditoría Superior de la Federación' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Síntesis' }), 'Requerimiento sobre el gasto 2025')
    await usuario.click(screen.getByRole('button', { name: 'Registrar y asignar folio' }))
    // Falta el campo obligatorio del tipo: el foco va a él.
    const ente = screen.getByRole('textbox', { name: 'Ente auditor' })
    await waitFor(() => expect(ente).toHaveFocus())
    expect(ente).toHaveAccessibleDescription('Escribe el campo «Ente auditor».')
    await usuario.type(ente, 'Auditoría Superior del Estado')
    await usuario.click(screen.getByRole('button', { name: 'Agregar punto' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Punto 1' }), 'Viáticos')
    await usuario.click(screen.getByRole('switch', { name: 'Confidencial' }))
    await usuario.click(screen.getByRole('button', { name: 'Registrar y asignar folio' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Requerimiento sobre el gasto 2025' })).toBeInTheDocument()
    expect(screen.getByText(folio, { selector: '[aria-current="page"]' })).toBeInTheDocument()
    expect(screen.getByText('Viáticos')).toBeInTheDocument()
    expect(screen.getByText('Confidencial')).toBeInTheDocument()
  }, 20_000)

  it('o01_o19_duplicado_detectado_ofrece_segunda_recepcion', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.marta)
    montarApp('/registrar')
    await usuario.click(await screen.findByRole('combobox', { name: /^Tipo de documento/ }))
    await usuario.click(await screen.findByRole('option', { name: 'Oficio' }))
    // OP-2026-0139: SIS/0231/2026 de Sistemas, área interna, documento de 2026.
    await usuario.type(screen.getByRole('textbox', { name: 'Número del emisor' }), 'SIS/0231/2026')
    await usuario.click(screen.getByRole('radio', { name: 'Área interna' }))
    await usuario.click(screen.getByRole('combobox', { name: /^Área interna/ }))
    await usuario.click(await screen.findByRole('option', { name: 'Sistemas' }))
    await usuario.type(screen.getByLabelText('Fecha del documento'), '2026-11-17')
    await usuario.type(screen.getByRole('textbox', { name: 'Síntesis' }), 'Requisición de material de cómputo')
    await usuario.click(screen.getByRole('button', { name: 'Registrar y asignar folio' }))

    const aviso = await screen.findByRole('region', { name: 'Ya existe este documento' })
    expect(aviso).toHaveTextContent('OP-2026-0139')
    await usuario.click(within(aviso).getByRole('button', { name: 'Segunda recepción' }))
    expect(await screen.findByRole('dialog', { name: 'Registrar segunda recepción' })).toHaveTextContent('Papel · ya registrado')
  }, 20_000)
})
