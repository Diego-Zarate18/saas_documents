import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'
import { borrarSesion } from '../sesion/almacen'

// jsdom no implementa la captura de puntero ni scrollIntoView, que usa el selector de Radix.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

// Con todas las pruebas en paralelo, montar la aplicación (sesión, marco, esqueleto y datos) puede pasar
// del segundo que espera findBy por omisión.
configure({ asyncUtilTimeout: 3000 })

afterEach(() => {
  cleanup()
  borrarSesion()
})
