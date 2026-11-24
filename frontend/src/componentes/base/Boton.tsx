import type { ButtonHTMLAttributes, Ref } from 'react'
import { Link, type LinkProps } from 'react-router'
import { Giro } from '../../iconos/Giro'
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

// La flecha se desplaza al pasar el cursor (T-01b); los demás íconos no se mueven.
const claseIcono = (icono: NombreIcono) => (icono === 'flecha' ? `${estilos.icono} ${estilos.flecha}` : estilos.icono)

type PropsBoton = Comunes &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    ref?: Ref<HTMLButtonElement>
    /** La operación está en curso: spinner en lugar del ícono, deshabilitado y con aria-busy; el texto y el ancho no cambian. */
    pendiente?: boolean
  }

/** Botón del Figma (31:119): Primario, Secundario, Fantasma y Peligro. Una sola acción primaria por vista. */
export function Boton({ variante, icono, ancho, pendiente, disabled, className, children, type = 'button', ...resto }: PropsBoton) {
  return (
    <button
      type={type}
      className={clases({ variante, ancho }, className)}
      disabled={disabled || pendiente}
      aria-busy={pendiente || undefined}
      {...resto}
    >
      {pendiente ? (
        <Giro className={icono ? estilos.icono : estilos.giroSuelto} />
      ) : (
        icono && <Icono nombre={icono} tamano={16} className={claseIcono(icono)} />
      )}
      {children}
    </button>
  )
}

/** El mismo botón cuando navega a otra vista. */
export function BotonEnlace({ variante, icono, ancho, className, children, ...resto }: Comunes & LinkProps) {
  return (
    <Link className={clases({ variante, ancho }, className)} {...resto}>
      {icono && <Icono nombre={icono} tamano={16} className={claseIcono(icono)} />}
      {children}
    </Link>
  )
}
