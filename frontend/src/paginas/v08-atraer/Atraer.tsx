import { useState } from 'react'
import { useAreas, useAtraer } from '../../api/consultas'
import type { Ficha } from '../../api/tipos'
import { AreaTexto } from '../../componentes/base/Campo'
import { Boton } from '../../componentes/base/Boton'
import { RolTurno } from '../../componentes/base/RolTurno'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Modal } from '../../componentes/compuestos/Modal'
import { Icono } from '../../iconos/Icono'
import { dias, diaMes } from '../formato'
import estilos from './Atraer.module.css'

const COMO = { responsable: 'como responsable', apoyo: 'como apoyo', conocimiento: 'para conocimiento' }

interface Props {
  ficha: Ficha
  areaPropia: string
  abierto: boolean
  alCambiar: (abierto: boolean) => void
}

/** V-08 Atraer documento (O-23): el área del titular queda como responsable y la anterior deja de tenerlo pendiente. */
export function Atraer({ ficha, areaPropia, abierto, alCambiar }: Props) {
  const [justificacion, setJustificacion] = useState('')
  const [tocado, setTocado] = useState(false)
  const atraer = useAtraer(ficha.registro.id)
  const areas = useAreas().data?.elementos ?? []
  const ahora = ficha.ubicacion_actual.find((u) => u.rol === 'responsable')
  const titular = (nombre: string | undefined) => areas.find((a) => a.nombre === nombre)?.nombre_titular ?? 'Puesto vacante'
  // Por qué tiene visibilidad (D-29): el último movimiento que llegó a su área.
  const llegada = ficha.recorrido?.findLast((m) => m.area_destino === areaPropia)
  const vacia = !justificacion.trim()

  function cerrar(abrir: boolean) {
    if (!abrir) {
      setJustificacion('')
      setTocado(false)
      atraer.reset()
    }
    alCambiar(abrir)
  }

  return (
    <Modal
      abierto={abierto}
      alCambiar={cerrar}
      folio={ficha.registro.folio}
      titulo="Atraer documento"
      descripcion="Tu área queda como responsable y el área que lo tenía deja de tenerlo pendiente."
      ancho={600}
      pie={
        <>
          <Boton variante="fantasma" onClick={() => cerrar(false)}>
            Cancelar
          </Boton>
          <Boton
            icono="atraer"
            disabled={vacia}
            pendiente={atraer.isPending}
            onClick={() => atraer.mutate(justificacion, { onSuccess: () => cerrar(false) })}
          >
            Atraer a {areaPropia}
          </Boton>
        </>
      }
    >
      <div className={estilos.cambio}>
        <div className={estilos.lado}>
          <p className={estilos.cuando}>Ahora</p>
          <p className={estilos.area}>
            {ahora?.area ?? 'Sin responsable'}
            {ahora && <RolTurno rol="responsable" />}
          </p>
          <p className={estilos.persona}>{titular(ahora?.area)}</p>
          {ahora && <p className={estilos.desde}>Pendiente desde hace {dias(ahora.antiguedad_dias)}</p>}
        </div>
        <Icono nombre="flecha" className={estilos.flecha} />
        <div className={`${estilos.lado} ${estilos.despues}`}>
          <p className={estilos.cuando}>Después</p>
          <p className={estilos.area}>
            {areaPropia}
            <RolTurno rol="responsable" />
          </p>
          <p className={estilos.persona}>{titular(areaPropia)}</p>
          <p className={estilos.desde}>Desde que confirmes</p>
        </div>
      </div>
      {llegada && (
        <Aviso tono="info" icono="ojo">
          Puedes atraerlo porque {areaPropia} tiene visibilidad sobre el documento: lo recibió {COMO[llegada.rol]} el{' '}
          {diaMes(llegada.fecha_hora)}.
        </Aviso>
      )}
      <AreaTexto
        blanco
        rows={3}
        etiqueta="Justificación (obligatoria)"
        ayuda={`Queda en el movimiento de atracción y la ve ${ahora?.area ?? 'el área anterior'}.`}
        error={tocado && vacia ? 'Escribe la justificación.' : undefined}
        value={justificacion}
        onChange={(e) => setJustificacion(e.target.value)}
        onBlur={() => setTocado(true)}
      />
      <ErrorOperacion error={atraer.error} que="atraer el documento" />
    </Modal>
  )
}
