import { useId } from 'react'
import { Icono, type NombreIcono } from '../../iconos/Icono'
import estilos from './Segmentado.module.css'

export interface Segmento<T extends string> {
  valor: T
  texto: string
  /** El elegido se pinta en guinda (Responsable en V-05); los demás, en blanco. */
  marca?: boolean
  icono?: NombreIcono
  /** No se puede elegir (V-15c: «Papel · ya registrado»). */
  deshabilitado?: boolean
}

interface Props<T extends string> {
  etiqueta: string
  opciones: Segmento<T>[]
  valor: T
  alCambiar: (valor: T) => void
  /** Ocupa todo el ancho con segmentos iguales (V-07, V-15b, V-15c, V-03). */
  ancho?: boolean
}

/** Control segmentado con radios nativos: las flechas cambian de opción y Tab sale del grupo. */
export function Segmentado<T extends string>({ etiqueta, opciones, valor, alCambiar, ancho }: Props<T>) {
  const nombre = useId()
  return (
    <fieldset className={[estilos.grupo, ancho && estilos.ancho].filter(Boolean).join(' ')}>
      <legend className="solo-lector">{etiqueta}</legend>
      {opciones.map((o) => (
        <label key={o.valor} className={[estilos.segmento, o.marca && estilos.marca].filter(Boolean).join(' ')}>
          <input
            type="radio"
            name={nombre}
            value={o.valor}
            aria-label={o.texto}
            checked={o.valor === valor}
            disabled={o.deshabilitado}
            onChange={() => alCambiar(o.valor)}
          />
          {o.icono && <Icono nombre={o.icono} tamano={16} />}
          {o.texto}
        </label>
      ))}
    </fieldset>
  )
}
