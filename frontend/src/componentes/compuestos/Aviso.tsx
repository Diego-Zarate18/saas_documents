import type { ReactNode } from 'react'
import { Icono, type NombreIcono } from '../../iconos/Icono'
import estilos from './Aviso.module.css'

type Tono = 'duplicado' | 'exito' | 'error' | 'info'

const ICONO: Record<Tono, NombreIcono> = { duplicado: 'alerta', exito: 'check', error: 'alerta', info: 'personas' }

interface Props {
  tono: Tono
  icono?: NombreIcono
  children: ReactNode
  /** Botón a la derecha (V-02: «Revisar»). */
  accion?: ReactNode
  /** role="status" para mensajes que cambian mientras el usuario edita (V-05). */
  rol?: 'status' | 'alert'
}

/** Aviso en línea con ícono, texto y acción opcional. */
export function Aviso({ tono, icono, children, accion, rol }: Props) {
  return (
    <div className={`${estilos.aviso} ${estilos[tono] ?? ''}`} role={rol}>
      <Icono nombre={icono ?? ICONO[tono]} tamano={tono === 'duplicado' ? 18 : 16} className={estilos.icono} />
      <div className={estilos.texto}>{children}</div>
      {accion}
    </div>
  )
}
