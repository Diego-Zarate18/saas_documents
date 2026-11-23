import type { ReactNode } from 'react'
import { ErrorDeApi } from '../../api/tipos'
import { Boton } from '../base/Boton'
import estilos from './EstadoConsulta.module.css'

interface Consulta<T> {
  data: T | undefined
  error: Error | null
  isPending: boolean
  refetch: () => unknown
}

interface Props<T> {
  consulta: Consulta<T>
  /** Qué se carga, en minúsculas: «la bandeja», «el recorrido». */
  que: string
  /** Si los datos llegaron vacíos, este texto sustituye al contenido. */
  vacio?: (datos: T) => string | null
  children: (datos: T) => ReactNode
}

/** Muestra cargando, error (con reintento) o vacío; si hay datos, dibuja el contenido. */
export function EstadoConsulta<T>({ consulta, que, vacio, children }: Props<T>) {
  if (consulta.isPending)
    return (
      <output className={estilos.estado}>
        Cargando {que}…
      </output>
    )
  if (consulta.error || consulta.data === undefined) {
    const detalle = consulta.error instanceof ErrorDeApi ? ` ${consulta.error.problema.title}` : ''
    return (
      <div className={`${estilos.estado} ${estilos.error}`} role="alert">
        <p>
          No se pudo cargar {que}.{detalle}
        </p>
        <Boton variante="secundario" onClick={() => consulta.refetch()}>
          Reintentar
        </Boton>
      </div>
    )
  }
  const textoVacio = vacio?.(consulta.data)
  if (textoVacio) return <p className={estilos.estado}>{textoVacio}</p>
  return children(consulta.data)
}
