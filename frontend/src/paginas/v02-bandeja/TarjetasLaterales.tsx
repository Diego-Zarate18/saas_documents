import { Link } from 'react-router'
import { useAcuses, useRebotes } from '../../api/consultas'
import { BotonEnlace } from '../../componentes/base/Boton'
import { Estado } from '../../componentes/base/Estado'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { EstadoConsulta } from '../../componentes/compuestos/EstadoConsulta'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import { OPCIONES } from '../../rutas/menu'
import estilos from './TarjetasLaterales.module.css'

/** Tres elementos de lista con folio y una línea, como los de rebotes y acuses. */
const esqueleto = (
  <ul className={estilos.lista} aria-hidden="true">
    {['28ch', '22ch', '25ch'].map((ancho) => (
      <li key={ancho}>
        <span className={estilos.folio}>
          <Forma ancho="11ch" />
        </span>
        <p>
          <Forma ancho={ancho} />
        </p>
      </li>
    ))}
  </ul>
)

interface Props {
  /** La columna lateral todavía espera al recorrido: se muestra el esqueleto aunque esta consulta ya haya llegado. */
  cargando: boolean
}

/** Resumen de C3 para oficialía y dirección (D-32). */
export function TarjetaRebotes({ cargando }: Props) {
  const rebotes = useRebotes(true)
  return (
    <Tarjeta
      material="relieve"
      className={`${estilos.tarjeta} ${estilos.relieve}`}
      aria-labelledby="titulo-rebotes"
      aria-busy={rebotes.isPending || cargando || undefined}
    >
      <div className={estilos.cabecera}>
        <h2 id="titulo-rebotes" className={estilos.titulo}>
          Rebotes
        </h2>
        <Estado estado="rebote" />
      </div>
      <EstadoConsulta consulta={rebotes} cargando={cargando} que="los rebotes" esqueleto={esqueleto} vacio={(d) => (d.total === 0 ? 'Sin rebotes detectados.' : null)}>
        {({ elementos }) => (
          <ul className={estilos.lista}>
            {elementos.map((r) => (
              <li key={r.id_documento}>
                <Link to={`/documentos/${r.id_documento}`} className={estilos.folio}>
                  {r.folio}
                </Link>
                <p>{r.motivo}</p>
              </li>
            ))}
          </ul>
        )}
      </EstadoConsulta>
      <div className={estilos.empuje} />
      <BotonEnlace variante="fantasma" icono="rebote" to={OPCIONES.rebotes.ruta}>
        Ver rebotes
      </BotonEnlace>
    </Tarjeta>
  )
}

/** Salidas con acuse cuyo documento está pendiente en el área como responsable (D-58). */
export function TarjetaAcuses({ cargando }: Props) {
  const acuses = useAcuses(true)
  const primero = acuses.isPending || cargando ? undefined : acuses.data?.elementos[0]
  return (
    <Tarjeta
      material="relieve"
      className={`${estilos.tarjeta} ${estilos.relieve}`}
      aria-labelledby="titulo-acuses"
      aria-busy={acuses.isPending || cargando || undefined}
    >
      <div className={estilos.cabecera}>
        <h2 id="titulo-acuses" className={estilos.titulo}>
          Acuses
        </h2>
        <Estado estado="concluido">Puedes concluir</Estado>
      </div>
      <EstadoConsulta
        consulta={acuses}
        cargando={cargando}
        que="los acuses"
        esqueleto={esqueleto}
        vacio={(d) => (d.total === 0 ? 'Ninguna salida acusada espera conclusión.' : null)}
      >
        {({ elementos }) => (
          <ul className={estilos.lista}>
            {elementos.map((a) => (
              <li key={a.id_salida}>
                <Link to={`/documentos/${a.id_documento}`} className={estilos.folio}>
                  {a.folio_documento}
                </Link>
                <p>
                  {a.folio_salida} acusado por {a.acusado_por}
                </p>
              </li>
            ))}
          </ul>
        )}
      </EstadoConsulta>
      <div className={estilos.empuje} />
      {primero && (
        <BotonEnlace variante="fantasma" icono="rebote" to={`/documentos/${primero.id_documento}`}>
          Abrir ficha
        </BotonEnlace>
      )}
    </Tarjeta>
  )
}
