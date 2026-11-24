import { Aviso } from '../../componentes/compuestos/Aviso'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'

/** Aviso para un rol que entra a una ruta que no le corresponde (diseño propio, sin vista en el Figma). */
export function SinPermiso() {
  return (
    <div style={{ display: 'grid', gap: 'var(--espacio-24)' }}>
      <EncabezadoPagina titulo="Sin permiso" />
      <Aviso tono="error" icono="candado">
        Tu rol no tiene acceso a esta vista. Usa el menú para ir a una de tus opciones.
      </Aviso>
    </div>
  )
}
