import { DropdownMenu } from 'radix-ui'
import { useRef, type ReactNode } from 'react'
import { Icono, type NombreIcono } from '../../iconos/Icono'
import { Boton } from '../base/Boton'
import estilos from './Menu.module.css'

export interface OpcionMenu {
  texto: string
  icono: NombreIcono
  /** Operación del catálogo, en mono a la derecha (V-04d: «O-07»). */
  operacion: string
  alElegir: () => void
  /** Separada y en rojo: cambia el estado del documento para todas las áreas (V-04d, Cancelar). */
  peligro?: boolean
  deshabilitado?: boolean
}

interface Props {
  texto: ReactNode
  opciones: OpcionMenu[]
}

/** Menú de acciones de la ficha (V-04d): botón fantasma con chevron y lista de vidrio de Radix (teclado y foco). */
export function Menu({ texto, opciones }: Props) {
  const disparador = useRef<HTMLButtonElement>(null)
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild ref={disparador}>
        <Boton variante="fantasma" icono="abajo">
          {texto}
        </Boton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={estilos.lista} align="end" sideOffset={8}>
          {opciones.map((o) => (
            <div key={o.texto} className={estilos.bloque}>
              {o.peligro && <DropdownMenu.Separator className={estilos.separador} />}
              <DropdownMenu.Item
                className={`${estilos.opcion} ${o.peligro ? estilos.peligro : ''}`}
                disabled={o.deshabilitado}
                // El foco vuelve al botón antes de abrir la acción: el modal lo guarda y se lo devuelve al cerrar.
                onSelect={() => {
                  disparador.current?.focus()
                  o.alElegir()
                }}
              >
                <Icono nombre={o.icono} tamano={16} />
                <span className={estilos.texto}>{o.texto}</span>
                <span className={estilos.operacion}>{o.operacion}</span>
              </DropdownMenu.Item>
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
