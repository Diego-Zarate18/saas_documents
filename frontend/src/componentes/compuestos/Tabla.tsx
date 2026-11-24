import type { ReactNode } from 'react'
import estilos from './Tabla.module.css'

interface Columna {
  titulo: string
  /** Ancho fijo en píxeles; sin él la columna toma el espacio restante. */
  ancho?: number
}

interface Props {
  columnas: Columna[]
  /** Descripción para lectores de pantalla. */
  titulo: string
  /** Filas como <tr>…</tr>. */
  children: ReactNode
}

/** Tabla del sistema visual: encabezados en mono y columnas de ancho fijo como en el Figma. */
export function Tabla({ columnas, titulo, children }: Props) {
  return (
    <table className={estilos.tabla}>
      <caption className="solo-lector">{titulo}</caption>
      <colgroup>
        {columnas.map((c, i) => {
          // El ancho del Figma más el relleno de la celda: 7 px por lado y 20 px en los extremos.
          const relleno = (i === 0 ? 20 : 7) + (i === columnas.length - 1 ? 20 : 7)
          return <col key={c.titulo} style={c.ancho ? { width: c.ancho + relleno } : undefined} />
        })}
      </colgroup>
      <thead>
        <tr>
          {columnas.map((c) => (
            <th key={c.titulo} scope="col">
              {c.titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}
