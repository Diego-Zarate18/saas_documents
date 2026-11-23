import type { ButtonHTMLAttributes, Ref } from 'react'
import { Link, type LinkProps } from 'react-router'
import { Icono, type NombreIcono } from '../../iconos/Icono'
import estilos from './Boton.module.css'

export type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro'

interface Comunes {
  variante?: VarianteBoton
  icono?: NombreIcono
  /** Ocupa todo el ancho (V-01). */
  ancho?: boolean
}

const clases = ({ variante = 'primario', ancho }: Comunes, extra?: string) =>
  [estilos.boton, estilos[variante], ancho && estilos.ancho, extra].filter(Boolean).join(' ')

type PropsBoton = Comunes & ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> }

/** Botón del Figma (31:119): Primario, Secundario, Fantasma y Peligro. Una sola acción primaria por vista. */
export function Boton({ variante, icono, ancho, className, children, type = 'button', ...resto }: PropsBoton) {
  return (
    <button type={type} className={clases({ variante, ancho }, className)} {...resto}>
      {icono && <Icono nombre={icono} tamano={16} className={estilos.icono} />}
      {children}
    </button>
  )
}

/** El mismo botón cuando navega a otra vista. */
export function BotonEnlace({ variante, icono, ancho, className, children, ...resto }: Comunes & LinkProps) {
  return (
    <Link className={clases({ variante, ancho }, className)} {...resto}>
      {icono && <Icono nombre={icono} tamano={16} className={estilos.icono} />}
      {children}
    </Link>
  )
}
