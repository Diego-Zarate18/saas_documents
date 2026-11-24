import type { ReactNode } from 'react'
import { mensajeDeError } from '../../api/tipos'
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
  /** Muestra el esqueleto aunque la consulta ya haya llegado (lo espera otra parte de la vista). */
  cargando?: boolean
  /** Si los datos llegaron vacíos, este texto sustituye al contenido. */
  vacio?: (datos: T) => string | null
  children: (datos: T) => ReactNode
}

/** Muestra el esqueleto, el error (con reintento) o el vacío; si hay datos, el contenido aparece con un fundido. */
export function EstadoConsulta<T>({ consulta, que, esqueleto, cargando, vacio, children }: Props<T>) {
  if (consulta.isPending || cargando) return esqueleto
  if (consulta.error || consulta.data === undefined) {
    const detalle = mensajeDeError(consulta.error, '')
    return (
      <div className={`${estilos.estado} ${estilos.error}`} role="alert">
        <p>
          No se pudo cargar {que}.{detalle && ` ${detalle}`}
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
