import { useRecorrido } from '../../api/consultas'
import type { Movimiento, PendienteBandeja } from '../../api/tipos'
import { BotonEnlace } from '../../componentes/base/Boton'
import { TEXTO_MOTIVO } from '../../componentes/base/textos'
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

/** C1 en la bandeja: recorrido del pendiente elegido. */
export function VistaPreviaRecorrido({ pendiente }: { pendiente: PendienteBandeja | undefined }) {
  const recorrido = useRecorrido(pendiente?.id_documento)
  if (!pendiente) return null
  return (
    <Tarjeta material="vidrio" className={estilos.tarjeta} aria-labelledby="titulo-recorrido">
      <div className={estilos.cabecera}>
        <h2 id="titulo-recorrido" className={estilos.titulo}>
          Recorrido
        </h2>
        <span className={estilos.folio}>{pendiente.folio}</span>
      </div>
      <EstadoConsulta consulta={recorrido} que="el recorrido">
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
      <BotonEnlace variante="secundario" to={`/documentos/${pendiente.id_documento}`}>
        Abrir ficha
      </BotonEnlace>
    </Tarjeta>
  )
}
