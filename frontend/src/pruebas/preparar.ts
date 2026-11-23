import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { borrarSesion } from '../sesion/almacen'

// jsdom no implementa la captura de puntero ni scrollIntoView, que usa el selector de Radix.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

afterEach(() => {
  cleanup()
  borrarSesion()
})
