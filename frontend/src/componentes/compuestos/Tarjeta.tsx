import type { HTMLAttributes } from 'react'
import estilos from './Tarjeta.module.css'

export type Material = 'vidrio' | 'relieve' | 'hundida' | 'solida'

interface Props extends HTMLAttributes<HTMLElement> {
  material: Material
}

/** Tarjeta con una de las superficies del Figma. El relleno y la disposición los pone quien la usa. */
export function Tarjeta({ material, className, ...resto }: Props) {
  return <section className={[estilos.tarjeta, estilos[material], className].filter(Boolean).join(' ')} {...resto} />
}
