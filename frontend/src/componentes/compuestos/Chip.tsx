import type { ReactNode } from 'react'
import estilos from './Chip.module.css'

/** Chip con texto guinda sobre guinda suave. */
export function Chip({ children }: { children: ReactNode }) {
  return <span className={estilos.chip}>{children}</span>
}
