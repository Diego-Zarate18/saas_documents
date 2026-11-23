import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { borrarSesion } from '../sesion/almacen'

// jsdom no implementa la captura de puntero ni scrollIntoView, que usa el selector de Radix.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

// Con todas las pruebas en paralelo, montar la aplicación (sesión, marco, esqueleto y datos) puede pasar
// del segundo que espera findBy por omisión.
configure({ asyncUtilTimeout: 3000 })

// Ninguna prueba imprime advertencias (React, Radix): una advertencia hace fallar la prueba que la causó.
beforeEach(() => {
  vi.spyOn(console, 'error')
  vi.spyOn(console, 'warn')
})

afterEach(() => {
  cleanup()
  borrarSesion()
  const avisos = [vi.mocked(console.error), vi.mocked(console.warn)].flatMap((espia) => espia.mock.calls)
  vi.restoreAllMocks()
  if (avisos.length > 0) throw new Error(`La prueba imprimió advertencias: ${avisos.map((a) => a.join(' ')).join(' | ')}`)
})
