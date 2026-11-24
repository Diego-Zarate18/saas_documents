import { NavLink } from 'react-router'
import { Giro } from '../../iconos/Giro'
import { Icono, type NombreIcono } from '../../iconos/Icono'
import estilos from './ElementoNavegacion.module.css'

interface Props {
  icono: NombreIcono
  texto: string
}

/** Navegación/Elemento del Figma (31:187) como enlace; aria-current marca la vista activa. */
export function ElementoNavegacion({ icono, texto, a }: Props & { a: string }) {
  return (
    <NavLink to={a} className={estilos.elemento}>
      <Icono nombre={icono} className={estilos.icono} />
      <span className={estilos.texto}>{texto}</span>
    </NavLink>
  )
}

/** El mismo elemento como acción (Cerrar sesión); mientras está `pendiente`, el ícono cede su lugar al spinner. */
export function AccionNavegacion({ icono, texto, onClick, pendiente }: Props & { onClick: () => void; pendiente?: boolean }) {
  return (
    <button type="button" className={estilos.elemento} onClick={onClick} disabled={pendiente} aria-busy={pendiente || undefined}>
      {pendiente ? <Giro tamano={20} className={estilos.icono} /> : <Icono nombre={icono} className={estilos.icono} />}
      <span className={estilos.texto}>{texto}</span>
    </button>
  )
}
