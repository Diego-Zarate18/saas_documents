// Vistas de consulta y asuntos de T-02b (V-06, V-11, V-11b, V-11c, V-12, V-13, V-14) sobre la fuente simulada.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { idPorFolio } from '../api/simulado/datos'
import { conEscrituraRetenida } from '../pruebas/retener'
import { entrarComo, montarApp, USUARIO } from '../pruebas/utilidades'

// Cuenta las lecturas de la comparación de V-14 sin cambiar lo que devuelve. O-27 espera a `lecturas.retener`
// antes de llegar al simulador (ver conEscrituraRetenida).
const lecturas = vi.hoisted(() => ({ comparacion: 0, retener: Promise.resolve() }))
vi.mock('../api', async (original) => {
  const api = await original<typeof import('../api')>()
  const { retenida } = await import('../pruebas/retener')
  return {
    ...api,
    obtenerComparacionDuplicado: (id: string) => {
      lecturas.comparacion++
      return api.obtenerComparacionDuplicado(id)
    },
    crearAsunto: retenida(lecturas, api.crearAsunto),
  }
})

const tabla = (nombre: string) => screen.findByRole('table', { name: nombre })

describe('V-06 Buscar (O-30)', () => {
  it('o30_v06_busca_por_sintesis_pagina_y_oculta_lo_confidencial_ajeno', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.marta)
    montarApp('/buscar')
    // Sin filtros: todo el registro, 20 por página.
    expect(await screen.findByText(/^1–20 de \d+ · 20 por página$/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(await screen.findByText(/^21–/)).toBeInTheDocument()

    await usuario.type(screen.getByLabelText('Folio'), 'OP-2026-0109')
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }))
    const resultados = await tabla('Documentos encontrados')
    await waitFor(() => expect(within(resultados).getAllByRole('row')).toHaveLength(2))
    expect(within(resultados).getByText('Contenido confidencial de otra área')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '1 resultado' })).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Limpiar' }))
    await usuario.type(screen.getByLabelText('Texto en la síntesis'), 'convenio')
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByRole('link', { name: 'OP-2026-0097' })).toBeInTheDocument()
  }, 15_000)

  it('o30_v06_campo_propio_solo_con_los_dos_tipos_y_chip_que_se_quita', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.marta)
    montarApp('/buscar')
    await screen.findByRole('heading', { name: /resultados/ })
    expect(screen.queryByLabelText(/contiene/)).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('combobox', { name: /Tipo:/ }))
    await usuario.click(await screen.findByRole('option', { name: 'Requerimiento de auditoría' }))
    await usuario.type(screen.getByLabelText('Ente auditor contiene'), 'interno')
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByText(/Ente auditor contiene “interno”/)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: '1 resultado' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Quitar el filtro por campo del tipo' }))
    await waitFor(() => expect(screen.queryByText(/Ente auditor contiene “/)).not.toBeInTheDocument())
  }, 15_000)
})

describe('V-11, V-11b y V-11c Asuntos (C2, C5, O-08, O-18, O-27)', () => {
  it('d62_v11c_direccion_solo_consulta', async () => {
    await entrarComo(USUARIO.ana)
    montarApp('/asuntos')
    expect(await screen.findByRole('heading', { level: 1, name: 'Equipamiento de laboratorios 2026' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'OP-2026-0139' })).toBeInTheDocument()
    expect(screen.getByText(/Dirección solo consulta\./)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Asignar documento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Sacar/ })).not.toBeInTheDocument()
    expect(await screen.findByText('Oficialía de partes')).toBeInTheDocument()
  }, 15_000)

  it('c2_v11_hilo_con_no_registrado_y_o18_sacar', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.raul)
    montarApp('/asuntos')
    expect(await screen.findByText('Sistemas · no registrado')).toBeInTheDocument()
    await usuario.click(await screen.findByRole('button', { name: 'Sacar OP-2026-0087 del asunto' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Sacar OP-2026-0087 del asunto' })).not.toBeInTheDocument())
    // Sigue en el hilo por su relación con OP-2026-0139, ya no como documento del asunto.
    expect(screen.getByRole('link', { name: 'OP-2026-0087' })).toBeInTheDocument()
  }, 15_000)

  it('o08_asignar_documento_desde_v11_con_error_en_linea', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.raul)
    montarApp('/asuntos')
    await usuario.click(await screen.findByRole('button', { name: 'Asignar documento' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Asignar documento' })
    await usuario.type(within(dialogo).getByRole('combobox', { name: 'Documento' }), 'OP-2026-0139')
    await usuario.click(await within(dialogo).findByRole('option', { name: /OP-2026-0139/ }))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Asignar documento' }))
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('El documento ya pertenece a ese asunto.')
  }, 15_000)

  it('o08_v11b_una_busqueda_nueva_quita_el_asunto_elegido', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.raul)
    montarApp(`/documentos/${idPorFolio('OP-2026-0152')}`)
    await usuario.click(await screen.findByRole('button', { name: 'Más' }))
    await usuario.click(await screen.findByRole('menuitem', { name: /Asignar a un asunto/ }))
    const dialogo = await screen.findByRole('dialog', { name: 'Asignar a un asunto' })
    await usuario.click(await within(dialogo).findByRole('radio', { name: 'Presupuesto de inversión 2026' }))
    expect(within(dialogo).getByRole('button', { name: 'Asignar a «Presupuesto de inversión 2026»' })).toBeEnabled()
    await usuario.type(within(dialogo).getByLabelText('Buscar asunto por nombre'), 'Auditoría')
    expect(within(dialogo).getByRole('button', { name: 'Asignar' })).toBeDisabled()
  })

  it('o27_o08_v11b_crea_un_asunto_y_el_documento_queda_asignado', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.raul)
    montarApp(`/documentos/${idPorFolio('OP-2026-0152')}`)
    await usuario.click(await screen.findByRole('button', { name: 'Más' }))
    await usuario.click(await screen.findByRole('menuitem', { name: /Asignar a un asunto/ }))
    const dialogo = await screen.findByRole('dialog', { name: 'Asignar a un asunto' })
    await usuario.click(within(dialogo).getByRole('button', { name: /Crea un asunto nuevo/ }))
    const crear = within(dialogo).getByRole('button', { name: 'Crear y asignar' })
    expect(crear).toBeDisabled()
    await usuario.click(within(dialogo).getByLabelText('Nombre del asunto'))
    await usuario.tab()
    expect(within(dialogo).getByLabelText('Nombre del asunto')).toHaveAccessibleDescription('Escribe el nombre del asunto.')
    await usuario.type(within(dialogo).getByLabelText('Nombre del asunto'), 'Papelería 2027')
    await usuario.type(within(dialogo).getByLabelText('Descripción'), 'Compras de papelería del próximo ejercicio.')
    await conEscrituraRetenida(lecturas, async () => {
      await usuario.click(crear)
      await waitFor(() => expect(crear).toHaveAttribute('aria-busy', 'true'))
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Papelería 2027')).toBeInTheDocument()
  }, 15_000)
})

describe('V-12 Rebotes (C3)', () => {
  it('c3_v12_lista_las_reglas_y_el_detalle_del_elegido', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.ana)
    montarApp('/rebotes')
    const filas = await tabla('Documentos con rebote')
    expect(within(filas).getByRole('button', { name: 'OP-2026-0118' })).toBeInTheDocument()
    expect(within(filas).getAllByText('3 o más devoluciones')).toHaveLength(1)
    await usuario.click(within(filas).getByRole('button', { name: 'OP-2026-0097' }))
    expect(await screen.findByRole('heading', { name: 'Propuesta de convenio de colaboración' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir ficha' })).toHaveAttribute('href', `/documentos/${idPorFolio('OP-2026-0097')}`)
  }, 15_000)
})

describe('V-14 Posibles duplicados (O-26)', () => {
  it('o26_v14_son_el_mismo_cancela_el_marcado_y_sale_de_la_lista', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.marta)
    montarApp('/posibles-duplicados')
    await usuario.click(await screen.findByRole('button', { name: /OP-2026-0141/ }))
    expect(await screen.findByText('OP-2026-0140')).toBeInTheDocument()
    const mismo = screen.getByRole('button', { name: 'Son el mismo: cancelar OP-2026-0141' })
    const antes = lecturas.comparacion
    await usuario.click(mismo)
    // Mientras se resuelve, la comparación del marcado no se relee: el servidor ya no la daría y se vería
    // «No se pudo cargar la comparación» un instante.
    await waitFor(() => expect(screen.queryByRole('button', { name: /OP-2026-0141/ })).not.toBeInTheDocument())
    // Después se lee solo la comparación del siguiente documento de la lista.
    expect(lecturas.comparacion - antes).toBeLessThanOrEqual(1)
  }, 15_000)
})

describe('V-13 Salidas externas (O-20, O-21)', () => {
  it('o21_v13_lista_las_salidas_y_registra_el_acuse_de_la_elegida', async () => {
    const usuario = userEvent.setup()
    await entrarComo(USUARIO.marta)
    montarApp('/salidas')
    const salidas = await tabla('Salidas externas de Noviembre 2026')
    expect(within(salidas).getByText('Responde a OP-2026-0140')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Registrar acuse' })).toBeInTheDocument()
    await usuario.type(screen.getByLabelText('Quién recibió'), 'Ventanilla ciudadana')
    await usuario.click(screen.getByRole('button', { name: 'Guardar acuse' }))
    expect(await screen.findByRole('heading', { name: 'Acuse registrado' })).toBeInTheDocument()
    const fila = within(await tabla('Salidas externas de Noviembre 2026')).getByRole('button', { name: 'UT-2026-0001' }).closest('tr')
    expect(fila).toHaveTextContent(/Con acuse/)
  }, 15_000)
})
