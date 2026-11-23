// Isotipo del Figma (nodo 23:12): doble chevrón que avanza. Mismos trazos; colores desde los tokens.
export function Isotipo({ tamano }: { tamano: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 104 104" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M74.75 0H29.25C13.0957 0 0 13.0957 0 29.25V74.75C0 90.9043 13.0957 104 29.25 104H74.75C90.9043 104 104 90.9043 104 74.75V29.25C104 13.0957 90.9043 0 74.75 0Z"
        style={{ fill: 'var(--fondo-marca)' }}
      />
      <path
        d="M27.625 32.5L47.125 52L27.625 71.5"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: 'var(--fondo-detalle)' }}
      />
      <path
        d="M53.625 32.5L73.125 52L53.625 71.5"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: 'var(--texto-sobre-marca)' }}
      />
    </svg>
  )
}
