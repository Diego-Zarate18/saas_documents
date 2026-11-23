import type { ReactNode } from 'react'
import estilos from './Resumen.module.css'

interface Props {
  /** Encabezado en mono: «AL CONCLUIR», «PRIMERA RECEPCIÓN». */
  titulo: string
  /** Con borde sutil (V-15a, V-15b, V-15c); sin él, como «Al concluir» de V-09. */
  borde?: boolean
  children: ReactNode
}

/** Caja de resumen de los modales: lo que pasará al confirmar o el dato que se corrige. */
export function Resumen({ titulo, borde, children }: Props) {
  return (
    <div className={`${estilos.resumen} ${borde ? estilos.borde : ''}`}>
      <p className={estilos.titulo}>{titulo}</p>
      {children}
    </div>
  )
}

/** Lista con viñeta «·» de un resumen (V-09, V-15a). */
export function Efectos({ children }: { children: ReactNode }) {
  return <ul className={estilos.efectos}>{children}</ul>
}
