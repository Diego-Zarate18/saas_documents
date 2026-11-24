import estilos from './Giro.module.css'

/**
 * Spinner de las acciones en curso (T-01b; el Figma no lo dibuja: diseño propio). Anillo con
 * currentColor; decorativo, porque el botón que lo lleva ya se marca con aria-busy.
 */
export function Giro({ tamano = 16, className }: { tamano?: number; className?: string }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.66667}
      strokeLinecap="round"
      className={[estilos.giro, className].filter(Boolean).join(' ')}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="10" cy="10" r="7.5" className={estilos.pista} />
      <path d="M10 2.5A7.5 7.5 0 0 1 17.5 10" />
    </svg>
  )
}
