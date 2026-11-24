// T-02c Parte B.5: el simulador queda aislado detrás de ApiSigedoc. Si esta prueba falla, una página
// depende de la semilla y dejaría de funcionar al conectar la API real (T-15).
import { describe, expect, it } from 'vitest'

// Todo el código de src como texto, con la ruta relativa a src (sin tipos de Node: lo resuelve Vite).
const fuentes = import.meta.glob<string>('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })
const archivos = Object.entries(fuentes).map(([ruta, texto]) => ({ ruta: ruta.replace('/src/', ''), texto }))
const esPrueba = (ruta: string) => /\.test\.tsx?$/.test(ruta) || ruta.startsWith('pruebas/')

/** Ids que solo existen en la semilla: folios, correos de prueba y UUID deterministas de datos.ts. */
const ID_SEMILLA = /\b[A-Z]{2,4}-20\d\d-\d{4}\b|OP-2026-|@institucion\.gob\.mx|00000000-0000-4000-8000-/

/** Archivos de producción que violan el aislamiento (con lista propia para la comprobación por mutación). */
function violaciones(lista = archivos) {
  const fuera = lista.filter((a) => !esPrueba(a.ruta) && !a.ruta.startsWith('api/simulado/'))
  return [
    // index.ts es el único punto que elige la fuente (D-63).
    ...fuera
      .filter((a) => a.ruta !== 'api/index.ts' && /from ['"][^'"]*simulado[/'"]/.test(a.texto))
      .map((a) => `${a.ruta} importa del simulador`),
    ...fuera
      .filter((a) => /^(paginas|componentes)\//.test(a.ruta) && ID_SEMILLA.test(a.texto))
      .map((a) => `${a.ruta} contiene un id de semilla: ${a.texto.match(ID_SEMILLA)?.[0]}`),
  ]
}

describe('T-02c aislamiento del simulador', () => {
  it('t02c_ningun_archivo_fuera_del_simulador_depende_de_la_semilla', () => {
    expect(archivos.length).toBeGreaterThan(50)
    expect(violaciones()).toEqual([])
  })

  it('t02c_la_prueba_detecta_una_pagina_con_id_de_semilla_o_que_importa_el_simulador', () => {
    const mutadas = [
      { ruta: 'paginas/v02-bandeja/Bandeja.tsx', texto: "const folio = 'OP-2026-0139'" },
      { ruta: 'componentes/base/Campo.tsx', texto: "const correo = 'mflores@institucion.gob.mx'" },
      { ruta: 'sesion/sesion.ts', texto: "import { personas } from '../api/simulado/datos'" },
    ]
    expect(violaciones(mutadas)).toHaveLength(3)
  })
})
