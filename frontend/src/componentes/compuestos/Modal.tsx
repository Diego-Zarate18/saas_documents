import { Dialog } from 'radix-ui'
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { Icono } from '../../iconos/Icono'
import estilos from './Modal.module.css'

interface Props {
  abierto: boolean
  alCambiar: (abierto: boolean) => void
  /** Folio sobre el título (V-05). */
  folio?: string
  titulo: string
  descripcion?: string
  /** Ancho del panel en píxeles; el de V-05 es 780. */
  ancho?: number
  children: ReactNode
  /** Botones al pie, alineados a la derecha. */
  pie?: ReactNode
}

/**
 * Modal con velo sobre el diálogo de Radix: atrapa el foco, cierra con Esc y devuelve el foco al
 * control que lo abrió.
 */
export function Modal({ abierto, alCambiar, folio, titulo, descripcion, ancho = 780, children, pie }: Props) {
  // Radix solo devuelve el foco a su Dialog.Trigger; aquí el modal se abre por estado, así que se guarda el control.
  const origen = useRef<HTMLElement | null>(null)
  // Fondo inerte mientras el modal está abierto: Radix lo oculta con aria-hidden, pero sus controles
  // seguían siendo enfocables para los lectores de pantalla (regla aria-hidden-focus).
  useEffect(() => {
    if (!abierto) return
    const raiz = document.getElementById('root')
    raiz?.setAttribute('inert', '')
    return () => raiz?.removeAttribute('inert')
  }, [abierto])
  return (
    <Dialog.Root open={abierto} onOpenChange={alCambiar}>
      <Dialog.Portal>
        <Dialog.Overlay className={estilos.velo} />
        <Dialog.Content
          className={estilos.panel}
          style={{ '--ancho': `${ancho}px` } as CSSProperties}
          onOpenAutoFocus={() => {
            origen.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          }}
          // Radix oye Esc en la captura del documento, antes que el campo: con la lista de un combobox
          // abierta (BuscadorDocumento), Esc cierra la lista y no el modal.
          onEscapeKeyDown={(evento) => {
            if (evento.target instanceof HTMLElement && evento.target.getAttribute('aria-expanded') === 'true') evento.preventDefault()
          }}
          onCloseAutoFocus={(evento) => {
            evento.preventDefault()
            document.getElementById('root')?.removeAttribute('inert')
            origen.current?.focus()
          }}
          // Sin descripción, Radix pide declararlo explícitamente.
          {...(descripcion ? {} : { 'aria-describedby': undefined })}
        >
          <div className={estilos.cabecera}>
            <div className={estilos.textos}>
              {folio && <p className={estilos.folio}>{folio}</p>}
              <Dialog.Title className={estilos.titulo}>{titulo}</Dialog.Title>
              {descripcion && <Dialog.Description className={estilos.descripcion}>{descripcion}</Dialog.Description>}
            </div>
            <Dialog.Close className={estilos.cerrar} aria-label="Cerrar">
              <Icono nombre="cerrar" />
            </Dialog.Close>
          </div>
          {children}
          {pie && <div className={estilos.pie}>{pie}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
