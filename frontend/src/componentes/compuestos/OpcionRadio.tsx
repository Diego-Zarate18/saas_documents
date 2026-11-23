import type { InputHTMLAttributes } from 'react'
import estilos from './OpcionRadio.module.css'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  texto: string
  descripcion?: string
}

/** Opción de radio con texto y descripción; las del mismo `name` forman un grupo navegable con flechas. */
export function OpcionRadio({ texto, descripcion, ...resto }: Props) {
  return (
    <label className={estilos.opcion}>
      <input type="radio" className={estilos.circulo} {...resto} />
      <span className={estilos.textos}>
        <span className={estilos.texto}>{texto}</span>
        {descripcion && <span className={estilos.descripcion}>{descripcion}</span>}
      </span>
    </label>
  )
}
