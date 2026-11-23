import type { ReactNode } from 'react'
import estilos from './EncabezadoPagina.module.css'

interface Props {
  titulo: string
  /** Migas de pan sobre el título (V-04: «BANDEJA / OP-2026-0139»). */
  migas?: ReactNode
  /** Línea bajo el título: texto o metadatos. */
  descripcion?: ReactNode
  acciones?: ReactNode
}

/** Encabezado de una vista: el h1 de la página. */
export function EncabezadoPagina({ titulo, migas, descripcion, acciones }: Props) {
  return (
    <header className={estilos.encabezado}>
      <div className={estilos.textos}>
        {migas && (
          <nav aria-label="Ruta de navegación" className={estilos.migas}>
            {migas}
          </nav>
        )}
        <h1 className={estilos.titulo} title={titulo}>
          {titulo}
        </h1>
        {descripcion && <div className={estilos.descripcion}>{descripcion}</div>}
      </div>
      {acciones && <div className={estilos.acciones}>{acciones}</div>}
    </header>
  )
}
