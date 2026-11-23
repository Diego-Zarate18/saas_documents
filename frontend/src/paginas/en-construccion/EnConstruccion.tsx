import { Aviso } from '../../componentes/compuestos/Aviso'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { OPCIONES, vistaDe, type ClaveOpcion } from '../../rutas/menu'
import { useSesion } from '../../sesion/sesion'

/** Opciones del menú cuyas vistas llegan en T-02. */
export function EnConstruccion({ clave }: { clave: ClaveOpcion }) {
  const rol = useSesion().data?.rol
  const { vista, nodo } = rol ? vistaDe(clave, rol) : OPCIONES[clave]
  return (
    <div style={{ display: 'grid', gap: 'var(--espacio-24)' }}>
      <EncabezadoPagina titulo={OPCIONES[clave].etiqueta} descripcion="Vista en construcción." />
      <Aviso tono="info" icono="reloj">
        {vista} · nodo del Figma {nodo}
      </Aviso>
    </div>
  )
}
