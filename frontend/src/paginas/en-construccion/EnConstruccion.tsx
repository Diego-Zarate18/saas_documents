import type { ReactNode } from 'react'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { OPCIONES, vistaDe, type ClaveOpcion } from '../../rutas/menu'
import { useSesion } from '../../sesion/sesion'

interface Props {
  clave: ClaveOpcion
  /** Acciones de la vista que ya existen aunque la vista no (Salidas: «Registrar salida», V-13b). */
  acciones?: ReactNode
  children?: ReactNode
}

/** Opciones del menú cuyas vistas llegan en T-02b. */
export function EnConstruccion({ clave, acciones, children }: Props) {
  const rol = useSesion().data?.rol
  const { vista, nodo } = rol ? vistaDe(clave, rol) : OPCIONES[clave]
  return (
    <div style={{ display: 'grid', gap: 'var(--espacio-24)' }}>
      <EncabezadoPagina titulo={OPCIONES[clave].etiqueta} descripcion="Vista en construcción." acciones={acciones} />
      <Aviso tono="info" icono="reloj">
        {vista} · nodo del Figma {nodo}
      </Aviso>
      {children}
    </div>
  )
}
