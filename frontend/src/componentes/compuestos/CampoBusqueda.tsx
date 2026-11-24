import { Icono } from '../../iconos/Icono'
import estilos from './CampoBusqueda.module.css'

interface Props {
  /** Nombre accesible y marcador («Buscar área o persona»). */
  etiqueta: string
  valor: string
  alCambiar: (valor: string) => void
}

/** Buscador en píldora del encabezado de V-16 a V-19: filtra la lista mientras se escribe. */
export function CampoBusqueda({ etiqueta, valor, alCambiar }: Props) {
  return (
    <label className={estilos.campo}>
      <Icono nombre="buscar" tamano={16} className={estilos.lupa} />
      <input type="search" aria-label={etiqueta} placeholder={etiqueta} value={valor} onChange={(e) => alCambiar(e.target.value)} />
    </label>
  )
}
