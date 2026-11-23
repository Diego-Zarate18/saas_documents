import { Select } from 'radix-ui'
import { useId } from 'react'
import { Icono } from '../../iconos/Icono'
import { Forma } from './Esqueleto'
import estilos from './Selector.module.css'

export interface OpcionSelector {
  valor: string
  texto: string
}

interface Props {
  variante: 'hundido' | 'pildora' | 'fila'
  /** Prefijo visible («Área:», «Tipo:»). */
  prefijo?: string
  /** Nombre accesible cuando no hay prefijo visible. */
  etiqueta?: string
  valor: string | undefined
  opciones: OpcionSelector[]
  alCambiar: (valor: string) => void
  marcador?: string
  deshabilitado?: boolean
  /** Las opciones todavía se leen: el valor y la lista muestran formas en su lugar. */
  cargando?: boolean
}

/** Selector con la lista accesible de Radix (teclado, búsqueda por letra, foco). */
export function Selector({ variante, prefijo, etiqueta, valor, opciones, alCambiar, marcador, deshabilitado, cargando }: Props) {
  const id = useId()
  return (
    <Select.Root value={valor} onValueChange={alCambiar} disabled={deshabilitado}>
      {/* El nombre accesible incluye el texto visible (WCAG 2.5.3): «Área: Compras» o «Área destino 1 Elige un área». */}
      <Select.Trigger
        className={`${estilos.disparador} ${estilos[variante] ?? ''}`}
        aria-labelledby={`${id}-prefijo ${id}-valor`}
      >
        <span id={`${id}-prefijo`} className={prefijo ? estilos.prefijo : 'solo-lector'}>
          {prefijo ?? etiqueta}
        </span>
        <span id={`${id}-valor`} className={estilos.valor}>
          {cargando && valor ? <Forma ancho="9ch" /> : <Select.Value placeholder={marcador} />}
        </span>
        <Select.Icon className={estilos.flecha}>
          <Icono nombre="abajo" tamano={variante === 'hundido' ? 16 : 14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        {/* La lista se nombra con el prefijo o la etiqueta del disparador; mientras carga, aria-busy la exime
            de tener opciones (ARIA). */}
        <Select.Content
          className={estilos.lista}
          position="popper"
          sideOffset={6}
          aria-labelledby={`${id}-prefijo`}
          aria-busy={cargando || undefined}
        >
          <Select.Viewport>
            {cargando && (
              // Único anuncio de carga dentro de la lista, que vive fuera del fondo inerte del modal.
              <div className={estilos.cargando}>
                <output className="solo-lector">Cargando…</output>
                {['70%', '55%', '65%'].map((ancho) => (
                  <span key={ancho} className={estilos.opcion}>
                    <Forma ancho={ancho} />
                  </span>
                ))}
              </div>
            )}
            {opciones.map((o) => (
              <Select.Item key={o.valor} value={o.valor} className={estilos.opcion}>
                <Select.ItemText>{o.texto}</Select.ItemText>
                <Select.ItemIndicator className={estilos.marca}>
                  <Icono nombre="check" tamano={14} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
