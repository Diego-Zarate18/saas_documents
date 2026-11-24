import type { RolTurno as Rol } from '../../api/tipos'
import estilos from './RolTurno.module.css'
import { TEXTO_ROL } from './textos'

/** Rol de turno del Figma (31:151). Un solo responsable por grupo (RI-10). */
export function RolTurno({ rol }: { rol: Rol }) {
  return <span className={`${estilos.rol} ${estilos[rol] ?? ''}`}>{TEXTO_ROL[rol]}</span>
}
