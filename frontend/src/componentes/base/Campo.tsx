import { useId, type InputHTMLAttributes } from 'react'
import estilos from './Campo.module.css'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string
  ayuda?: string
  /** Mensaje de error; marca el campo como inválido. */
  error?: string
}

/** Campo del Figma (31:172): etiqueta, caja hundida y ayuda o error. */
export function Campo({ etiqueta, ayuda, error, className, ...resto }: Props) {
  const id = useId()
  const idNota = `${id}-nota`
  const nota = error ?? ayuda
  return (
    <div className={[estilos.campo, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={estilos.etiqueta}>
        {etiqueta}
      </label>
      <input
        id={id}
        className={estilos.caja}
        aria-invalid={error ? true : undefined}
        aria-describedby={nota ? idNota : undefined}
        {...resto}
      />
      {nota && (
        <p id={idNota} className={error ? estilos.error : estilos.ayuda}>
          {nota}
        </p>
      )}
    </div>
  )
}

