import { useIsFetching } from '@tanstack/react-query'
import type { CSSProperties, ReactNode } from 'react'
import estilos from './Esqueleto.module.css'

interface Props {
  ancho?: CSSProperties['width']
  alto?: CSSProperties['height']
  /** Radio de un molde: el del control que imita (por omisión, el del rol de turno). */
  radio?: CSSProperties['borderRadius']
  className?: string
  /** Molde: la forma toma exactamente el tamaño de sus hijos, que no se ven (un botón, una píldora). */
  children?: ReactNode
}

/**
 * Forma de un esqueleto de carga (T-01b, diseño propio). Sin hijos ocupa una línea del texto que la
 * rodea, así que el alto de la línea no cambia cuando llegan los datos. Nunca se anuncia.
 */
export function Forma({ ancho, alto, radio, className, children }: Props) {
  return (
    <span
      aria-hidden="true"
      className={[estilos.forma, children ? estilos.molde : estilos.linea, className].filter(Boolean).join(' ')}
      style={{ width: ancho, height: alto, borderRadius: radio }}
    >
      {children}
    </span>
  )
}

/**
 * El único role="status" de carga de una vista: dice «Cargando…» mientras alguna consulta se lee por
 * primera vez (cuando se ven los esqueletos). Existe siempre, para que el lector de pantalla lo anuncie.
 */
export function AnuncioCarga() {
  const cargando = useIsFetching({ predicate: (consulta) => consulta.state.status === 'pending' }) > 0
  return (
    <output className="solo-lector">{cargando ? 'Cargando…' : ''}</output>
  )
}
