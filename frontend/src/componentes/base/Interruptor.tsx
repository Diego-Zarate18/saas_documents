import { useId } from 'react'
import estilos from './Interruptor.module.css'

interface Props {
  texto: string
  descripcion: string
  activo: boolean
  alCambiar: (activo: boolean) => void
}

/** Interruptor de V-03 (confidencial, extemporáneo): una casilla nativa con rol de switch. */
export function Interruptor({ texto, descripcion, activo, alCambiar }: Props) {
  const id = useId()
  return (
    <label className={estilos.interruptor} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className={estilos.pista}
        checked={activo}
        aria-checked={activo}
        aria-labelledby={`${id}-texto`}
        aria-describedby={`${id}-descripcion`}
        onChange={(e) => alCambiar(e.target.checked)}
      />
      <span className={estilos.textos}>
        <span id={`${id}-texto`} className={estilos.texto}>
          {texto}
        </span>
        <span id={`${id}-descripcion`} className={estilos.descripcion}>
          {descripcion}
        </span>
      </span>
    </label>
  )
}
