import { useId } from 'react'
import { Boton } from '../../componentes/base/Boton'
import { Icono } from '../../iconos/Icono'
import estilos from './Registrar.module.css'

interface Props {
  etiqueta: string
  valores: string[]
  alCambiar: (valores: string[]) => void
}

/** Campo de lista de textos (D-66: «puntos» del requerimiento de auditoría): alta y baja de renglones numerados. */
export function Puntos({ etiqueta, valores, alCambiar }: Props) {
  const id = useId()
  const cambiar = (i: number, valor: string) => alCambiar(valores.map((v, j) => (j === i ? valor : v)))
  return (
    <fieldset className={estilos.puntos}>
      <legend className={estilos.etiqueta}>{etiqueta}</legend>
      {valores.length > 0 && (
        <ol className={estilos.renglones}>
          {valores.map((v, i) => (
            // La posición es la identidad del renglón: los puntos no tienen id propio.
            // oxlint-disable-next-line react/no-array-index-key
            <li key={i} className={estilos.renglon}>
              <span className={estilos.numeroPunto} aria-hidden="true">
                {i + 1}
              </span>
              <input
                id={`${id}-${i}`}
                aria-label={`Punto ${i + 1}`}
                value={v}
                onChange={(e) => cambiar(i, e.target.value)}
              />
              <button
                type="button"
                className={estilos.quitar}
                aria-label={`Quitar el punto ${i + 1}`}
                onClick={() => alCambiar(valores.filter((_, j) => j !== i))}
              >
                <Icono nombre="cerrar" tamano={14} />
              </button>
            </li>
          ))}
        </ol>
      )}
      <Boton
        variante="fantasma"
        icono="mas"
        className={estilos.agregar}
        onClick={() => {
          alCambiar([...valores, ''])
          // El renglón nuevo recibe el foco para escribir de inmediato.
          requestAnimationFrame(() => document.getElementById(`${id}-${valores.length}`)?.focus())
        }}
      >
        Agregar punto
      </Boton>
    </fieldset>
  )
}
