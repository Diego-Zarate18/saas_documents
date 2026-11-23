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
  /**
   * Lo que se ve mientras carga: formas con las mismas medidas que el contenido. El contenedor lleva
   * aria-busy y el anuncio «Cargando…» lo da AnuncioCarga, uno por vista.
   */
  esqueleto: ReactNode
  /** Si los datos llegaron vacíos, este texto sustituye al contenido. */
  vacio?: (datos: T) => string | null
  children: (datos: T) => ReactNode
}

/** Muestra el esqueleto, el error (con reintento) o el vacío; si hay datos, el contenido aparece con un fundido. */
export function EstadoConsulta<T>({ consulta, que, esqueleto, vacio, children }: Props<T>) {
  if (consulta.isPending) return esqueleto
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
  if (textoVacio) return <p className={`${estilos.estado} ${estilos.aparecer}`}>{textoVacio}</p>
  return <div className={estilos.contenido}>{children(consulta.data)}</div>
}
