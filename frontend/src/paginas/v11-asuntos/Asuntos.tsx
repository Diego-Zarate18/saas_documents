import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAlcanceAsunto, useAsuntos, useHiloAsunto, useSacarDeAsunto } from '../../api/consultas'
import type { HiloAsunto, NodoHilo, Sesion } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { Estado } from '../../componentes/base/Estado'
import { TEXTO_RELACION } from '../../componentes/base/textos'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { EstadoConsulta } from '../../componentes/compuestos/EstadoConsulta'
import { Selector } from '../../componentes/compuestos/Selector'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import { Icono } from '../../iconos/Icono'
import { useSesion } from '../../sesion/sesion'
import { fecha } from '../formato'
import listado from '../listado.module.css'
import { AsignarDocumento } from './Asignar'
import estilos from './Asuntos.module.css'

/** D-50: profundidad máxima del hilo. */
const SALTOS = 6

/**
 * V-11 Asunto: hilo (C2) y alcance (C5), con «Asignar documento» (O-08) y «Sacar» (O-18) para quien las tiene.
 * V-11c es la misma vista para Dirección, solo de consulta (D-62).
 */
export function Asuntos() {
  const sesion = useSesion().data
  const lista = useAsuntos()
  const [parametros, setParametros] = useSearchParams()
  if (!sesion) return null
  // Diseño propio: el Figma no dibuja la lista de asuntos; el encabezado ofrece un selector y la dirección ?id= los enlaza.
  const id = parametros.get('id') ?? lista.data?.elementos[0]?.id
  const selector = (
    <Selector
      variante="pildora"
      prefijo="Asunto:"
      valor={id ?? ''}
      cargando={lista.isPending}
      opciones={(lista.data?.elementos ?? []).map((a) => ({ valor: a.id, texto: a.nombre }))}
      alCambiar={(valor) => setParametros({ id: valor })}
    />
  )
  if (lista.data?.total === 0) return <EncabezadoPagina titulo="Asuntos" descripcion="Todavía no hay asuntos." />
  return id ? <Asunto key={id} id={id} sesion={sesion} selector={selector} /> : <EncabezadoPagina titulo={<Forma ancho="20ch" />} />
}

function Asunto({ id, sesion, selector }: { id: string; sesion: Sesion; selector: ReactNode }) {
  const hilo = useHiloAsunto(id)
  const [asignando, setAsignando] = useState(false)
  // D-44 y D-62: asignar es de titular y personal (O-08); sacar, también de oficialía (O-18). Dirección solo consulta.
  const asigna = sesion.rol === 'TI' || sesion.rol === 'PE'
  const saca = asigna || sesion.rol === 'OF'
  const datos = hilo.data?.asunto

  return (
    <div className={listado.pagina}>
      <EncabezadoPagina
        migas={<span>Asuntos</span>}
        titulo={datos?.nombre ?? <Forma ancho="20ch" />}
        descripcion={
          datos ? `${datos.descripcion} Lo creó ${datos.creador} el ${fecha(datos.fecha.slice(0, 10))}.` : <Forma ancho="40ch" />
        }
        acciones={
          <>
            {selector}
            {asigna && (
              <Boton variante="secundario" icono="mas" onClick={() => setAsignando(true)}>
                Asignar documento
              </Boton>
            )}
          </>
        }
      />
      <div className={listado.cuerpo}>
        <Tarjeta material="vidrio" className={estilos.hilo} aria-labelledby="titulo-hilo" aria-busy={hilo.isPending || undefined}>
          <div className={estilos.cabecera}>
            <h2 id="titulo-hilo" className={listado.titulo}>
              Hilo del asunto
            </h2>
            <p className={listado.origen}>C2 · Neo4j + PostgreSQL</p>
          </div>
          <EstadoConsulta consulta={hilo} que="el hilo del asunto" esqueleto={<Forma ancho="80%" />}>
            {(h) => <Hilo hilo={h} idAsunto={id} saca={saca} />}
          </EstadoConsulta>
          <p className={listado.pie}>
            Se recorre desde los documentos del asunto por sus relaciones, hasta {SALTOS} saltos.{' '}
            {sesion.rol === 'DI' ? 'Dirección solo consulta.' : saca ? '«Sacar» corrige una asignación por error.' : ''}
          </p>
        </Tarjeta>
        <div className={estilos.lateral}>
          <Alcance id={id} />
          <p className={estilos.filtrado}>
            <Icono nombre="ojo" tamano={16} />
            Filtrado por tu visibilidad: de lo confidencial ajeno solo cuenta el área, sin contenido.
          </p>
        </div>
      </div>
      {asigna && datos && <AsignarDocumento idAsunto={id} nombre={datos.nombre} abierto={asignando} alCambiar={setAsignando} />}
    </div>
  )
}

function Hilo({ hilo, idAsunto, saca }: { hilo: HiloAsunto; idAsunto: string; saca: boolean }) {
  const sacar = useSacarDeAsunto(idAsunto)
  const registrados = hilo.nodos.filter((n) => n.registrado)
  const cuenta = (estado: string) => hilo.nodos.filter((n) => n.estado === estado).length
  const profundidad = Math.max(0, ...hilo.nodos.map((n) => n.profundidad))
  return (
    <>
      <div className={estilos.cifras}>
        <Cifra valor={registrados.length} nota="documentos registrados" />
        <Cifra valor={cuenta('concluido')} nota="concluidos" clase={estilos.concluido} />
        <Cifra valor={cuenta('en_tramite')} nota="en trámite" clase={estilos.enTramite} />
        <Cifra valor={`${profundidad} / ${SALTOS}`} nota="saltos de profundidad" />
      </div>
      {hilo.nodos.length === 0 ? (
        <p className={listado.secundario}>El asunto todavía no tiene documentos.</p>
      ) : (
        <ol className={estilos.nodos}>
          {hilo.nodos.map((n) => (
            <Nodo
              key={`${n.referencia}-${n.descripcion}`}
              nodo={n}
              sacar={saca && n.pertenece && n.id_documento ? () => sacar.mutate(n.id_documento ?? '') : undefined}
              pendiente={sacar.isPending && sacar.variables === n.id_documento}
            />
          ))}
        </ol>
      )}
      <ErrorOperacion error={sacar.error} que="sacar el documento del asunto" />
    </>
  )
}

function Cifra({ valor, nota, clase }: { valor: ReactNode; nota: string; clase?: string }) {
  return (
    <div className={estilos.cifra}>
      <p className={`${estilos.valor} ${clase ?? ''}`}>{valor}</p>
      <p className={listado.pie}>{nota}</p>
    </div>
  )
}

function Nodo({ nodo: n, sacar, pendiente }: { nodo: NodoHilo; sacar?: () => void; pendiente: boolean }) {
  const etiqueta = n.pertenece
    ? 'Pertenece al asunto'
    : `${n.relacion?.sentido === 'entra' ? '←' : '→'} ${n.relacion ? TEXTO_RELACION[n.relacion.tipo] : ''}`
  const titulo = !n.registrado
    ? `${n.descripcion ?? 'Emisor desconocido'} · no registrado`
    : (n.descripcion ?? 'Contenido no visible para tu área')
  return (
    <li className={estilos.fila} style={{ marginLeft: `calc(${Math.max(0, n.profundidad - 1)} * var(--espacio-32))` }}>
      {!n.pertenece && <Icono nombre="enlace" tamano={16} className={estilos.enlace} />}
      <div className={`${estilos.nodo} ${n.registrado ? '' : estilos.noRegistrado}`}>
        <div className={estilos.textosNodo}>
          <p className={estilos.etiquetaNodo}>
            {etiqueta}{' '}
            {n.id_documento ? (
              <Link to={`/documentos/${n.id_documento}`} className={listado.folio}>
                {n.referencia}
              </Link>
            ) : (
              <span className={n.registrado ? listado.folio : estilos.folioNoRegistrado}>{n.referencia}</span>
            )}
          </p>
          <p className={n.registrado ? (n.descripcion ? listado.texto : listado.secundario) : estilos.tituloNoRegistrado}>{titulo}</p>
        </div>
        {n.estado && <Estado estado={n.estado} />}
        {sacar && (
          <Boton variante="fantasma" icono="cerrar" pendiente={pendiente} onClick={sacar} aria-label={`Sacar ${n.referencia} del asunto`}>
            Sacar
          </Boton>
        )}
      </div>
    </li>
  )
}

/** C5 Alcance: áreas con barra proporcional y personas, filtradas por visibilidad (D-29). */
function Alcance({ id }: { id: string }) {
  const alcance = useAlcanceAsunto(id)
  return (
    <Tarjeta material="vidrio" className={estilos.alcance} aria-labelledby="titulo-alcance" aria-busy={alcance.isPending || undefined}>
      <div className={estilos.cabecera}>
        <h2 id="titulo-alcance" className={listado.titulo}>
          Alcance
        </h2>
        <p className={listado.origen}>C5 · Neo4j</p>
      </div>
      <p className={listado.secundario}>Áreas y personas que han tenido contacto con algún documento del asunto.</p>
      <EstadoConsulta consulta={alcance} que="el alcance" esqueleto={<Forma ancho="80%" />}>
        {({ areas, personas }) => {
          const maximo = Math.max(1, ...areas.map((a) => a.documentos))
          return (
            <>
              <ul className={estilos.areas}>
                {areas.map((a) => (
                  <li key={a.area}>
                    <p className={estilos.area}>
                      <span>{a.area}</span>
                      <span className={listado.pie}>
                        {a.documentos} {a.documentos === 1 ? 'documento' : 'documentos'}
                      </span>
                    </p>
                    <span className={estilos.barra} aria-hidden="true">
                      <span
                        className={a.documentos * 2 > maximo ? estilos.mayor : undefined}
                        style={{ width: `${(a.documentos / maximo) * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
              <p className={listado.etiquetaPanel}>Personas · {personas.length}</p>
              <ul className={estilos.personas}>
                {personas.map((p) => (
                  <li key={p} className={estilos.persona}>
                    {p}
                  </li>
                ))}
              </ul>
            </>
          )
        }}
      </EstadoConsulta>
    </Tarjeta>
  )
}
