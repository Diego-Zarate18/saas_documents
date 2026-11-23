import type { ReactNode } from 'react'
import estilos from './Indicador.module.css'

interface Props {
  etiqueta: string
  /** La cifra, o una forma mientras carga. */
  valor: ReactNode
  nota: string
  destacado?: boolean
}

/** Indicador de la bandeja: etiqueta, cifra y nota. */
export function Indicador({ etiqueta, valor, nota, destacado }: Props) {
  return (
    <div className={[estilos.indicador, destacado && estilos.destacado].filter(Boolean).join(' ')}>
      <p className={estilos.etiqueta}>{etiqueta}</p>
      <p className={estilos.valor}>{valor}</p>
      <p className={estilos.nota}>{nota}</p>
    </div>
  )
}
