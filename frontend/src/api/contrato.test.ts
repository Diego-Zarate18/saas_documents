// T-02c Parte C: el inventario del contrato (ai/handoff/borradores/contrato-api.md) cubre todo lo que
// index.ts exporta para las páginas, con los nueve campos por función.
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as api from '.'

// Se lee con node:fs y no con «?raw»: Vite no sirve archivos fuera de frontend/, y así debe seguir.
// Vitest corre desde frontend/ (npm test).
const inventario = readFileSync(`${process.cwd()}/../ai/handoff/borradores/contrato-api.md`, 'utf8')

const CAMPOS = ['Función y operación', 'Método y ruta', 'Entrada', 'Salida', 'Roles', 'Visibilidad', 'Reglas', 'Errores', 'Pruebas']

/** Cada ficha empieza en «### `nombre`» y termina en el siguiente encabezado de nivel 2 o 3. */
const fichas = new Map(
  inventario
    .split(/^(?=#{2,3} )/m)
    .map((seccion) => [seccion.match(/^### `(\w+)`/)?.[1], seccion] as const)
    .filter((par): par is readonly [string, string] => par[0] !== undefined),
)

describe('T-02c inventario del contrato', () => {
  it('contrato_inventario_cubre_todas_las_funciones', () => {
    // API_DISPONIBLE es la bandera del modo, no parte de ApiSigedoc.
    const exportadas = Object.keys(api).filter((nombre) => nombre !== 'API_DISPONIBLE')
    expect(exportadas.length).toBeGreaterThan(40)
    expect(exportadas.filter((nombre) => !fichas.has(nombre))).toEqual([])
    for (const nombre of exportadas) {
      const faltan = CAMPOS.filter((campo) => !fichas.get(nombre)?.includes(`| ${campo} |`))
      expect(faltan, `ficha de ${nombre}`).toEqual([])
    }
  })
})
