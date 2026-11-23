import { useRecorrido } from '../../api/consultas'
import type { Movimiento, PendienteBandeja } from '../../api/tipos'
import { Boton, BotonEnlace } from '../../componentes/base/Boton'
import { TEXTO_MOTIVO } from '../../componentes/base/textos'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { EstadoConsulta } from '../../componentes/compuestos/EstadoConsulta'
import { PasoRecorrido } from '../../componentes/compuestos/PasoRecorrido'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import { diaHora } from '../formato'
import estilos from './TarjetasLaterales.module.css'

/** «Turno como responsable · 18 nov 11:40», como en V-02 y V-02b. */
function detalle(m: Movimiento) {
  const cuando = diaHora(m.fecha_hora, false)
  if (m.tipo === 'registro') return `Registro · ${cuando}`
  if (m.tipo === 'devolucion') return `Devolución · ${m.motivo ? TEXTO_MOTIVO[m.motivo] : ''} · ${cuando}`
  return m.rol === 'conocimiento' ? `Turno para conocimiento · ${cuando}` : `Turno como ${m.rol} · ${cuando}`
}

// Pasos del esqueleto: los del recorrido más corto, el de un documento recién registrado.
const esqueleto = (
  <ol className={estilos.pasos} aria-hidden="true">
    <PasoRecorrido actual>
      <p className={estilos.area}>
        <Forma ancho="16ch" />
      </p>
      <p className={estilos.detalle}>
        <Forma ancho="24ch" />
      </p>
    </PasoRecorrido>
  </ol>
)

interface Props {
  pendiente: PendienteBandeja | undefined
  /** La bandeja todavía se lee: aún no hay pendiente elegido. */
  cargando: boolean
}

/** C1 en la bandeja: recorrido del pendiente elegido. */
export function VistaPreviaRecorrido({ pendiente, cargando }: Props) {
  const recorrido = useRecorrido(pendiente?.id_documento)
  if (!pendiente && !cargando) return null
  return (
    <Tarjeta
      material="vidrio"
      className={estilos.tarjeta}
      aria-labelledby="titulo-recorrido"
      aria-busy={!pendiente || recorrido.isPending || undefined}
    >
      <div className={estilos.cabecera}>
        <h2 id="titulo-recorrido" className={estilos.titulo}>
          Recorrido
        </h2>
        {pendiente ? (
          <span className={estilos.folio}>{pendiente.folio}</span>
        ) : (
          <span className={estilos.folio}>
            <Forma ancho="11ch" />
          </span>
        )}
      </div>
      {pendiente ? (
        <EstadoConsulta consulta={recorrido} que="el recorrido" esqueleto={esqueleto}>
          {(movimientos) => (
            <ol className={estilos.pasos}>
              {movimientos.map((m, i) => (
                <PasoRecorrido key={m.id} actual={i === movimientos.length - 1}>
                  <p className={estilos.area}>{m.area_destino}</p>
                  <p className={estilos.detalle}>{detalle(m)}</p>
                </PasoRecorrido>
              ))}
            </ol>
          )}
        </EstadoConsulta>
      ) : (
        esqueleto
      )}
      {pendiente ? (
        <BotonEnlace variante="secundario" to={`/documentos/${pendiente.id_documento}`}>
          Abrir ficha
        </BotonEnlace>
      ) : (
        <Forma radio="var(--radio-control)">
          <Boton variante="secundario">Abrir ficha</Boton>
        </Forma>
      )}
    </Tarjeta>
  )
}
