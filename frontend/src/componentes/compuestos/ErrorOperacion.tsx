import { mensajeDeError } from '../../api/tipos'
import { Aviso } from './Aviso'

interface Props {
  error: Error | null
  /** Qué no se pudo hacer, en infinitivo: «devolver el documento». */
  que: string
}

/** Error en línea de una operación (T-01b): el mensaje del servidor o uno genérico, anunciado como alerta. */
export function ErrorOperacion({ error, que }: Props) {
  if (!error) return null
  return (
    <Aviso tono="error" rol="alert">
      {mensajeDeError(error, `No se pudo ${que}.`)}
    </Aviso>
  )
}
