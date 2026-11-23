import { Outlet, useNavigate } from 'react-router'
import type { Rol, Sesion } from '../../api/tipos'
import { Isotipo } from '../../iconos/Isotipo'
import { MENU, OPCIONES } from '../../rutas/menu'
import { useCerrarSesion, useSesion } from '../../sesion/sesion'
import { AccionNavegacion, ElementoNavegacion } from '../base/ElementoNavegacion'
import estilos from './Marco.module.css'

/** Rótulo bajo el logotipo, como en el Figma. */
const ROTULO_ROL: Record<Rol, string> = {
  OF: 'Oficialía de partes',
  DI: 'Dirección',
  TI: 'Titular de área',
  PE: 'Personal del área',
  AD: 'Administración',
}

/** «Titular · Compras» y «Personal · Compras» para titular y personal; el área para los demás. */
function adscripcion({ rol, nombre_area }: Sesion) {
  if (rol === 'TI') return `Titular · ${nombre_area ?? ''}`
  if (rol === 'PE') return `Personal · ${nombre_area ?? ''}`
  return nombre_area ?? ROTULO_ROL[rol]
}

/** Iniciales sin títulos: «Ing. Raúl Pérez» → «RP». */
const iniciales = (nombre: string) =>
  nombre
    .split(' ')
    .filter((parte) => parte && !parte.endsWith('.'))
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')

/** Marco de la aplicación: barra lateral con el menú del rol y el contenido de la vista. */
export function Marco() {
  const sesion = useSesion().data
  const cerrar = useCerrarSesion()
  const navegar = useNavigate()
  if (!sesion) return null

  async function salir() {
    await cerrar.mutateAsync()
    navegar('/iniciar-sesion', { replace: true })
  }

  return (
    <div className={estilos.marco}>
      <div className={estilos.brillos} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <aside className={estilos.barra}>
        <div className={estilos.marca}>
          <p className={estilos.logotipo}>
            <Isotipo tamano={30} />
            SIGEDOC
          </p>
          <p className={estilos.rolUsuario}>{ROTULO_ROL[sesion.rol]}</p>
        </div>
        <nav aria-label="Menú principal">
          <ul className={estilos.menu}>
            {MENU[sesion.rol].map((clave) => (
              <li key={clave}>
                <ElementoNavegacion a={OPCIONES[clave].ruta} icono={OPCIONES[clave].icono} texto={OPCIONES[clave].etiqueta} />
              </li>
            ))}
          </ul>
        </nav>
        <div className={estilos.espacio} />
        <div className={estilos.usuario}>
          <span className={estilos.avatar} aria-hidden="true">
            {iniciales(sesion.nombre)}
          </span>
          <span className={estilos.datosUsuario}>
            <span className={estilos.nombre}>{sesion.nombre}</span>
            <span className={estilos.adscripcion}>{adscripcion(sesion)}</span>
          </span>
        </div>
        <AccionNavegacion icono="salir" texto="Cerrar sesión" onClick={salir} />
      </aside>
      <main className={estilos.contenido}>
        <Outlet />
      </main>
    </div>
  )
}
