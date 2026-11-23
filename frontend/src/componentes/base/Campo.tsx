import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import estilos from './Campo.module.css'

interface Comunes {
  etiqueta: string
  ayuda?: string
  /** Mensaje de error; marca el campo como inválido. */
  error?: string
  /** Caja blanca, como los campos de los modales (V-07 a V-15c); sin ella, hundida como en V-03. */
  blanco?: boolean
}

type Props = Comunes & InputHTMLAttributes<HTMLInputElement>

/** Campo del Figma (31:172): etiqueta, caja hundida y ayuda o error. */
export function Campo({ etiqueta, ayuda, error, blanco, className, ...resto }: Props) {
  const id = useId()
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <input id={id} className={claseCaja(blanco)} {...atributos(id, error, ayuda)} {...resto} />
    </Envoltura>
  )
}

/** Texto largo (nota, justificación, motivo): el mismo campo con varias líneas. */
export function AreaTexto({
  etiqueta,
  ayuda,
  error,
  blanco,
  className,
  ...resto
}: Comunes & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <textarea id={id} rows={2} className={claseCaja(blanco)} {...atributos(id, error, ayuda)} {...resto} />
    </Envoltura>
  )
}

const claseCaja = (blanco?: boolean) => [estilos.caja, blanco && estilos.blanco].filter(Boolean).join(' ')

const atributos = (id: string, error?: string, ayuda?: string) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error || ayuda ? `${id}-nota` : undefined,
})

function Envoltura({ id, etiqueta, ayuda, error, className, children }: Omit<Comunes, 'blanco'> & { id: string; className?: string; children: ReactNode }) {
  const nota = error ?? ayuda
  return (
    <div className={[estilos.campo, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={estilos.etiqueta}>
        {etiqueta}
      </label>
      {children}
      {nota && (
        <p id={`${id}-nota`} className={error ? estilos.error : estilos.ayuda}>
          {nota}
        </p>
      )}
    </div>
  )
}

