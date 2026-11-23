import { useState } from 'react'
import { useCancelar } from '../../api/consultas'
import type { Ficha } from '../../api/tipos'
import { AreaTexto } from '../../componentes/base/Campo'
import { Boton } from '../../componentes/base/Boton'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Modal } from '../../componentes/compuestos/Modal'
import { Efectos, Resumen } from '../../componentes/compuestos/Resumen'

interface Props {
  ficha: Ficha
  abierto: boolean
  alCambiar: (abierto: boolean) => void
}

/** V-15a Cancelar documento (O-24): no se borra; queda cancelado con todo su historial (D-20). */
export function Cancelar({ ficha, abierto, alCambiar }: Props) {
  const [motivo, setMotivo] = useState('')
  const [tocado, setTocado] = useState(false)
  const cancelar = useCancelar(ficha.registro.id)
  const pendientes = ficha.ubicacion_actual.map((u) => u.area)
  const vacio = !motivo.trim()

  function cerrar(abrir: boolean) {
    if (!abrir) {
      setMotivo('')
      setTocado(false)
      cancelar.reset()
    }
    alCambiar(abrir)
  }

  return (
    <Modal
      abierto={abierto}
      alCambiar={cerrar}
      folio={ficha.registro.folio}
      titulo="Cancelar documento"
      descripcion="El documento no se borra: queda cancelado con todo su historial."
      ancho={560}
      pie={
        <>
          <Boton variante="fantasma" onClick={() => cerrar(false)}>
            Volver
          </Boton>
          <Boton
            variante="peligro"
            icono="cerrar"
            disabled={vacio}
            pendiente={cancelar.isPending}
            onClick={() => cancelar.mutate(motivo, { onSuccess: () => cerrar(false) })}
          >
            Cancelar documento
          </Boton>
        </>
      }
    >
      <AreaTexto
        blanco
        rows={3}
        etiqueta="Motivo (obligatorio)"
        error={tocado && vacio ? 'Escribe el motivo de la cancelación.' : undefined}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        onBlur={() => setTocado(true)}
      />
      <Resumen titulo="Al cancelar" borde>
        <Efectos>
          <li>Estado: en trámite → cancelado, para todas las áreas</li>
          {pendientes.length > 0 && (
            <li>
              Sale de la bandeja: {pendientes.join(' y ')} {pendientes.length === 1 ? 'deja' : 'dejan'} de tenerlo pendiente
            </li>
          )}
          <li>Recorrido, expediente y relaciones se conservan</li>
        </Efectos>
      </Resumen>
      <ErrorOperacion error={cancelar.error} que="cancelar el documento" />
    </Modal>
  )
}
