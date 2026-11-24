import { useState } from 'react'
import { useOrganizacion } from '../../api/consultas'
import type { AreaOrganizacion, PersonaAdscrita } from '../../api/tipos'
import { TEXTO_ROL_USUARIO } from '../../componentes/base/textos'
import { CampoBusqueda } from '../../componentes/compuestos/CampoBusqueda'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { EstadoConsulta } from '../../componentes/compuestos/EstadoConsulta'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import { Icono } from '../../iconos/Icono'
import { useSesion } from '../../sesion/sesion'
import listado from '../listado.module.css'
import estilos from './Organizacion.module.css'

/** Áreas activas en orden de la jerarquía, cada una con su profundidad (D-08: solo el estado actual). */
function arbol(areas: AreaOrganizacion[]): { area: AreaOrganizacion; nivel: number }[] {
  const activas = areas.filter((a) => a.activa)
  const filas: { area: AreaOrganizacion; nivel: number }[] = []
  const visitar = (padre: string | null, nivel: number) => {
    for (const a of activas.filter((x) => x.id_padre === padre)) {
      filas.push({ area: a, nivel })
      visitar(a.id, nivel + 1)
    }
  }
  visitar(null, 0)
  return filas
}

const funcion = (area: AreaOrganizacion, p: PersonaAdscrita) =>
  area.id_titular === p.id ? 'Titular de área' : p.rol === 'PE' ? 'Personal del área' : p.rol ? TEXTO_ROL_USUARIO[p.rol] : 'Sin usuario'

/** Los folios se numeran por año (D-21). */
const ANIO = new Date().getFullYear()

const personas = (n: number) => `${n} ${n === 1 ? 'persona' : 'personas'}`

/** V-16 Organización (O-32): todos los roles; solo el estado actual, desde PostgreSQL (D-08, D-52). */
export function Organizacion() {
  const sesion = useSesion().data
  const organizacion = useOrganizacion()
  const [texto, setTexto] = useState('')
  const [elegida, setElegida] = useState<string>()
  const todas = organizacion.data?.elementos ?? []
  const filas = arbol(todas)
  const buscado = texto.trim().toLowerCase()
  const visibles = buscado
    ? filas.filter(
        ({ area }) =>
          area.nombre.toLowerCase().includes(buscado) ||
          area.siglas.toLowerCase().includes(buscado) ||
          area.personas.some((p) => p.nombre.toLowerCase().includes(buscado)),
      )
    : filas
  const actual =
    visibles.find((f) => f.area.id === elegida)?.area ?? visibles.find((f) => f.area.id === sesion?.id_area)?.area ?? visibles[0]?.area
  const raiz = filas[0]?.area

  return (
    <div className={listado.pagina}>
      <EncabezadoPagina
        titulo="Organización"
        descripcion="Estructura vigente: de quién depende cada área, quién es su titular y quiénes están adscritos."
        acciones={<CampoBusqueda etiqueta="Buscar área o persona" valor={texto} alCambiar={setTexto} />}
      />
      <div className={listado.cuerpo}>
        <Tarjeta material="vidrio" className={listado.tarjeta} aria-labelledby="titulo-estructura" aria-busy={organizacion.isPending || undefined}>
          <div className={listado.cabecera}>
            <h2 id="titulo-estructura" className={listado.titulo}>
              {raiz?.nombre ?? <Forma ancho="20ch" />}
            </h2>
            <p className={listado.origen}>PostgreSQL</p>
          </div>
          <EstadoConsulta
            consulta={organizacion}
            que="la estructura organizacional"
            esqueleto={<Forma ancho="80%" />}
            vacio={() => (visibles.length === 0 ? 'Ninguna área ni persona coincide.' : null)}
          >
            {() => (
              <ul className={estilos.arbol} aria-label="Áreas por dependencia">
                {visibles.map(({ area, nivel }) => (
                  <li key={area.id} className={area === actual ? estilos.elegida : undefined}>
                    <button
                      type="button"
                      className={estilos.fila}
                      aria-pressed={area === actual}
                      style={{ paddingLeft: `calc(var(--espacio-12) + ${buscado ? 0 : nivel} * var(--espacio-24))` }}
                      onClick={() => setElegida(area.id)}
                    >
                      <span className={listado.siglas}>{area.siglas}</span>
                      <span className={estilos.nombre}>{area.nombre}</span>
                      <span className={estilos.titular}>
                        {area.nombre_titular ?? <span className={`${listado.pildora} ${listado.vacante}`}>Vacante</span>}
                      </span>
                      <span className={listado.pie}>{personas(area.personas.length)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </EstadoConsulta>
        </Tarjeta>
        {actual && <Detalle area={actual} padre={todas.find((a) => a.id === actual.id_padre)} />}
      </div>
    </div>
  )
}

function Detalle({ area, padre }: { area: AreaOrganizacion; padre: AreaOrganizacion | undefined }) {
  return (
    <Tarjeta material="vidrio" className={listado.panel} aria-labelledby="titulo-area">
      <div>
        <p className={listado.siglas}>{area.siglas}</p>
        <h2 id="titulo-area" className={listado.tituloPanel}>
          {area.nombre}
        </h2>
      </div>
      <dl className={estilos.datos}>
        <div>
          <dt>Depende de</dt>
          <dd>{padre?.nombre ?? '— (es la raíz)'}</dd>
        </div>
        <div>
          <dt>Titular</dt>
          <dd>{area.nombre_titular ?? 'Vacante'}</dd>
        </div>
        <div>
          <dt>Folios</dt>
          <dd>
            {area.siglas}-{ANIO}-0001 en adelante, por año
          </dd>
        </div>
      </dl>
      <p className={listado.etiquetaPanel}>Personas adscritas · {area.personas.length}</p>
      <ul className={estilos.personas}>
        {area.personas.map((p) => (
          <li key={p.id}>
            <Icono nombre="personas" tamano={16} />
            <span className={estilos.nombre}>{p.nombre}</span>
            <span className={listado.pie}>{funcion(area, p)}</span>
          </li>
        ))}
      </ul>
      <p className={estilos.nota}>
        <Icono nombre="reloj" tamano={16} />
        Solo el estado actual. El titular que recibió cada turno queda guardado en el movimiento.
      </p>
    </Tarjeta>
  )
}
