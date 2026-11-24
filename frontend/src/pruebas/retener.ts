// Retener escrituras de la API en pruebas (T-03, Parte 0). Sin imports de '../api': `retenida` se usa dentro de la
// fábrica de `vi.mock('../api')`, que se ejecuta antes que los imports del archivo de prueba.

export type Retencion = { retener: Promise<void> }

/** Envuelve una escritura de la API para que espere a `control.retener` (en un `vi.mock('../api')`). */
export const retenida =
  <A extends unknown[], R>(control: Retencion, escritura: (...args: A) => Promise<R>) =>
  async (...args: A): Promise<R> => {
    await control.retener
    return escritura(...args)
  }

/**
 * Corre `paso` con `control.retener` pendiente y lo suelta al terminar, pase lo que pase. Las escrituras envueltas
 * con `retenida` esperan a `control.retener`: así el estado pendiente de un botón se observa sin depender de la
 * latencia del simulador, que en pruebas es 0.
 */
export async function conEscrituraRetenida(control: Retencion, paso: () => Promise<void>) {
  let soltar = () => {}
  control.retener = new Promise<void>((resolver) => (soltar = resolver))
  try {
    await paso()
  } finally {
    soltar()
  }
}
