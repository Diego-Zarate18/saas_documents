import type { ReactNode } from 'react'
import estilos from './Estado.module.css'
import { TEXTO_ESTADO, type ClaveEstado } from './textos'

/** Estado del Figma (31:144). `children` cambia el texto y conserva el color (V-02b: «Puedes concluir»). */
export function Estado({ estado, children }: { estado: ClaveEstado; children?: ReactNode }) {
  return <span className={`${estilos.estado} ${estilos[estado] ?? ''}`}>{children ?? TEXTO_ESTADO[estado]}</span>
}
