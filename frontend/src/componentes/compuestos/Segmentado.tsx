import { useId } from 'react'
import estilos from './Segmentado.module.css'

export interface Segmento<T extends string> {
  valor: T
  texto: string
  /** El elegido se pinta en guinda (Responsable en V-05); los demás, en blanco. */
  marca?: boolean
}

interface Props<T extends string> {
  etiqueta: string
  opciones: Segmento<T>[]
  valor: T
  alCambiar: (valor: T) => void
}

/** Control segmentado con radios nativos: las flechas cambian de opción y Tab sale del grupo. */
export function Segmentado<T extends string>({ etiqueta, opciones, valor, alCambiar }: Props<T>) {
  const nombre = useId()
  return (
    <fieldset className={estilos.grupo}>
      <legend className="solo-lector">{etiqueta}</legend>
      {opciones.map((o) => (
        <label key={o.valor} className={[estilos.segmento, o.marca && estilos.marca].filter(Boolean).join(' ')}>
          <input
            type="radio"
            name={nombre}
            value={o.valor}
            aria-label={o.texto}
            checked={o.valor === valor}
            onChange={() => alCambiar(o.valor)}
          />
          {o.texto}
        </label>
      ))}
    </fieldset>
  )
}
