import { useState } from 'react'
import { Link } from 'react-router'
import { useBandeja, useCatalogos } from '../../api/consultas'
import type { PendienteBandeja, TipoMovimiento, Uuid } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { Estado } from '../../componentes/base/Estado'
import { RolTurno } from '../../componentes/base/RolTurno'
import { EstadoConsulta } from '../../componentes/compuestos/EstadoConsulta'
import { Selector } from '../../componentes/compuestos/Selector'
import { Tabla } from '../../componentes/compuestos/Tabla'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import { Icono, type NombreIcono } from '../../iconos/Icono'
import { dias } from '../formato'
import estilos from './TablaPendientes.module.css'

const VISIBLES = 5
const TODOS = 'todos'

// El Figma no define las opciones del filtro de antigüedad (O-14 solo dice «filtros por tipo y antigüedad»).
const ANTIGUEDADES = [
  { valor: '0', texto: 'Cualquiera' },
  { valor: '3', texto: '3 días o más' },
  { valor: '8', texto: '8 días o más' },
]

const ICONO_MOVIMIENTO: Record<TipoMovimiento, NombreIcono> = {
  registro: 'registrar',
  turno: 'turnar',
  devolucion: 'devolver',
}

const COLUMNAS = [
  { titulo: 'Folio', ancho: 104 },
  { titulo: 'Documento' },
  { titulo: 'Rol', ancho: 100 },
  { titulo: 'Antigüedad', ancho: 76 },
  { titulo: 'Titular al turnar', ancho: 128 },
]

interface Props {
  idArea: Uuid | undefined
  seleccion: PendienteBandeja | undefined
  alSeleccionar: (pendiente: PendienteBandeja) => void
}

/** Tarjeta «Pendientes» de la bandeja: filtros de O-14, tabla y «Ver todos». */
export function TablaPendientes({ idArea, seleccion, alSeleccionar }: Props) {
  const [tipo, setTipo] = useState(TODOS)
  const [antiguedad, setAntiguedad] = useState('0')
  const [verTodos, setVerTodos] = useState(false)
  const catalogos = useCatalogos()
  const bandeja = useBandeja({
    id_area: idArea,
    tipo: tipo === TODOS ? undefined : tipo,
    antiguedad_minima: Number(antiguedad),
  })

  return (
    <Tarjeta material="solida" className={estilos.tarjeta} aria-labelledby="titulo-pendientes">
      <div className={estilos.cabecera}>
        <h2 id="titulo-pendientes" className={estilos.titulo}>
          Pendientes
        </h2>
        <Selector
          variante="pildora"
          prefijo="Tipo:"
          valor={tipo}
          opciones={[
            { valor: TODOS, texto: 'Todos' },
            ...(catalogos.data?.tipos_documento ?? []).map((t) => ({ valor: t, texto: t })),
          ]}
          alCambiar={setTipo}
        />
        <Selector
          variante="pildora"
          prefijo="Antigüedad:"
          valor={antiguedad}
          opciones={ANTIGUEDADES}
          alCambiar={setAntiguedad}
        />
      </div>
      <EstadoConsulta
        consulta={bandeja}
        que="la bandeja"
        vacio={(d) => (d.total === 0 ? 'No hay pendientes en esta área con esos filtros.' : null)}
      >
        {({ elementos, total }) => {
          const filas = verTodos ? elementos : elementos.slice(0, VISIBLES)
          const elegida = seleccion?.id_documento ?? elementos[0]?.id_documento
          return (
            <>
              <Tabla titulo="Documentos pendientes en el área" columnas={COLUMNAS}>
                {filas.map((p) => (
                  <tr key={p.id_documento} className={p.id_documento === elegida ? estilos.elegida : undefined}>
                    <td>
                      <Link to={`/documentos/${p.id_documento}`} className={estilos.folio}>
                        {p.folio}
                      </Link>
                    </td>
                    <td>
                      <div className={estilos.documento}>
                        <div className={estilos.lineaTitulo}>
                          <button
                            type="button"
                            className={estilos.asunto}
                            aria-pressed={p.id_documento === elegida}
                            title="Ver su recorrido"
                            onClick={() => alSeleccionar(p)}
                          >
                            {p.asunto}
                          </button>
                          {p.posible_duplicado && <Estado estado="posible_duplicado" />}
                          {p.confidencial && <Estado estado="confidencial" />}
                        </div>
                        <p className={estilos.meta}>
                          {p.tipo} · {p.emisor}
                        </p>
                        <p className={estilos.movimiento}>
                          <Icono nombre={ICONO_MOVIMIENTO[p.ultimo_movimiento.tipo]} tamano={13} />
                          {p.ultimo_movimiento.descripcion}
                        </p>
                      </div>
                    </td>
                    <td>
                      <RolTurno rol={p.rol} />
                    </td>
                    <td className={estilos.dato}>{dias(p.antiguedad_dias)}</td>
                    <td>
                      {p.titular_al_turnar ? (
                        <p className={estilos.titular}>
                          <span>{p.titular_al_turnar}</span>
                          {p.titular_ya_no_adscrito && <span className={estilos.noAdscrito}>Ya no está adscrito</span>}
                        </p>
                      ) : (
                        <span className={estilos.sinTitular} aria-label="Sin titular">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </Tabla>
              <div className={estilos.pie}>
                <p>
                  {filas.length} de {total} · ordenados por antigüedad
                </p>
                {!verTodos && total > VISIBLES && (
                  <Boton variante="fantasma" onClick={() => setVerTodos(true)}>
                    Ver todos
                  </Boton>
                )}
              </div>
            </>
          )
        }}
      </EstadoConsulta>
    </Tarjeta>
  )
}
