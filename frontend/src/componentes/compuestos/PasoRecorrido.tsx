import type { ReactNode } from 'react'
import estilos from './PasoRecorrido.module.css'

/** Un paso del recorrido como elemento de lista; `actual` marca la ubicación actual. */
export function PasoRecorrido({ actual, children }: { actual?: boolean; children: ReactNode }) {
  return (
    <li className={[estilos.paso, actual && estilos.actual].filter(Boolean).join(' ')}>
      <span className={estilos.marcador} aria-hidden="true" />
      <div className={estilos.contenido}>{children}</div>
    </li>
  )
}
