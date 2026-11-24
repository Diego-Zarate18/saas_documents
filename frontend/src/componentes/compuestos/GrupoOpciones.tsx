import type { ReactNode } from 'react'
import estilos from './GrupoOpciones.module.css'

interface Props {
  /** Leyenda en mono: «Motivo del catálogo», «Forma de conclusión». */
  leyenda: string
  /** Marca a la derecha de la leyenda (V-09: «Catálogo cerrado · D-59»). */
  marca?: ReactNode
  /** Dos columnas, como los tipos de relación de V-10. */
  columnas?: 1 | 2
  children: ReactNode
}

/** Grupo de opciones de radio de un catálogo cerrado (V-07, V-09, V-10). */
export function GrupoOpciones({ leyenda, marca, columnas = 1, children }: Props) {
  return (
    <fieldset className={estilos.grupo}>
      <div className={estilos.cabecera}>
        <legend className={estilos.leyenda}>{leyenda}</legend>
        {marca}
      </div>
      <div className={estilos.opciones} style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
        {children}
      </div>
    </fieldset>
  )
}
