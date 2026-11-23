import type { HTMLAttributes } from 'react'
import estilos from './Tarjeta.module.css'

export type Material = 'vidrio' | 'relieve' | 'hundida' | 'solida'

interface Props extends HTMLAttributes<HTMLElement> {
  material: Material
  /** Elemento HTML; por omisión una sección. */
  como?: 'section' | 'div' | 'article'
}

/** Tarjeta con una de las superficies del Figma. El relleno y la disposición los pone quien la usa. */
export function Tarjeta({ material, como: Elemento = 'section', className, ...resto }: Props) {
  return <Elemento className={[estilos.tarjeta, estilos[material], className].filter(Boolean).join(' ')} {...resto} />
}
