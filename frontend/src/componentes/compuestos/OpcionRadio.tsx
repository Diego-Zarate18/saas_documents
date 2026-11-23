import type { InputHTMLAttributes } from 'react'
import estilos from './OpcionRadio.module.css'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  texto: string
  descripcion?: string
  /** Clave del catálogo en mono junto al texto (V-07: «falta_firma»). */
  codigo?: string
}

/** Opción de radio con texto y descripción; las del mismo `name` forman un grupo navegable con flechas. */
export function OpcionRadio({ texto, descripcion, codigo, ...resto }: Props) {
  return (
    <label className={estilos.opcion}>
      <input type="radio" className={estilos.circulo} {...resto} />
      <span className={estilos.textos}>
        <span className={estilos.texto}>
          {texto}
          {codigo && <span className={estilos.codigo}>{codigo}</span>}
        </span>
        {descripcion && <span className={estilos.descripcion}>{descripcion}</span>}
      </span>
    </label>
  )
}
