import { useState } from 'react'
import { useAreas, useCatalogos, useDevolver } from '../../api/consultas'
import type { Ficha, MotivoDevolucion, Uuid } from '../../api/tipos'
import { AreaTexto } from '../../componentes/base/Campo'
import { OPCION_MOTIVO } from '../../componentes/base/textos'
import { Boton } from '../../componentes/base/Boton'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { GrupoOpciones } from '../../componentes/compuestos/GrupoOpciones'
import { Modal } from '../../componentes/compuestos/Modal'
import { OpcionRadio } from '../../componentes/compuestos/OpcionRadio'
import { Segmentado } from '../../componentes/compuestos/Segmentado'
import { CampoSelector } from '../../componentes/compuestos/Selector'

type Modo = 'devolver' | 'returnar'

interface Props {
  ficha: Ficha
  /** Área de quien devuelve: la que deja de tenerlo pendiente. */
  areaPropia: string
  /** Área que lo envió en el último movimiento; ahí regresa al devolver. */
  origen: string | null
  abierto: boolean
  alCambiar: (abierto: boolean) => void
}

/** V-07 Devolver y V-07b Returnar con área sugerida (O-22, D-32). Solo el titular del área que lo tiene pendiente. */
export function Devolver({ ficha, areaPropia, origen, abierto, alCambiar }: Props) {
  const [modo, setModo] = useState<Modo>('devolver')
  const [motivo, setMotivo] = useState<MotivoDevolucion>()
  const [idArea, setIdArea] = useState('')
  const [nota, setNota] = useState('')
  const devolver = useDevolver(ficha.registro.id)
  const catalogos = useCatalogos()
  const motivos = catalogos.data?.motivos_devolucion ?? []
  const areas = useAreas()
  const opciones = (areas.data?.elementos ?? []).filter((a) => a.nombre !== areaPropia)
  const sugerida = opciones.find((a) => a.id === idArea)
  const returna = modo === 'returnar' && sugerida !== undefined

  function cerrar(abrir: boolean) {
    if (!abrir) {
      setModo('devolver')
      setMotivo(undefined)
      setIdArea('')
      setNota('')
      devolver.reset()
    }
    alCambiar(abrir)
  }

  function enviar() {
    if (!motivo) return
    devolver.mutate(
      { motivo, id_area_sugerida: returna ? (idArea as Uuid) : null, nota },
      { onSuccess: () => cerrar(false) },
    )
  }

  return (
    <Modal
      abierto={abierto}
      alCambiar={cerrar}
      folio={ficha.registro.folio}
      titulo="Devolver o returnar"
      descripcion={`${areaPropia} deja de tenerlo pendiente. El motivo es obligatorio y queda en el movimiento.`}
      ancho={640}
      pie={
        <>
          <Boton variante="fantasma" onClick={() => cerrar(false)}>
            Cancelar
          </Boton>
          <Boton icono={returna ? 'turnar' : 'devolver'} onClick={enviar} disabled={!motivo} pendiente={devolver.isPending}>
            {returna ? `Returnar a ${sugerida.nombre}` : `Devolver a ${origen ?? 'quien lo envió'}`}
          </Boton>
        </>
      }
    >
      <Segmentado
        ancho
        etiqueta="Devolver o returnar"
        valor={modo}
        alCambiar={setModo}
        opciones={[
          { valor: 'devolver', texto: 'Devolver', icono: 'devolver' },
          { valor: 'returnar', texto: 'Returnar', icono: 'turnar' },
        ]}
      />
      {modo === 'devolver' && (
        <Aviso tono="info" icono="devolver">
          Regresa a {origen ?? 'quien lo envió'}, el área que lo envió en el último turno.
        </Aviso>
      )}
      <GrupoOpciones leyenda="Motivo del catálogo">
        {motivos.map((m) => (
          <OpcionRadio
            key={m}
            name="motivo"
            texto={OPCION_MOTIVO[m].texto}
            codigo={m}
            descripcion={OPCION_MOTIVO[m].descripcion}
            checked={motivo === m}
            onChange={() => setMotivo(m)}
          />
        ))}
      </GrupoOpciones>
      {modo === 'returnar' && (
        <>
          <CampoSelector
            blanco
            etiqueta="Área sugerida"
            ayuda="Opcional. Si la dejas vacía con «no es de nuestra competencia», la devolución cuenta como rebote."
            marcador="Sin área sugerida"
            valor={idArea}
            cargando={areas.isPending}
            opciones={opciones.map((a) => ({ valor: a.id, texto: a.nombre }))}
            alCambiar={setIdArea}
          />
          {sugerida ? (
            <Aviso tono="exito" rol="status">
              Con área sugerida no cuenta como rebote. {sugerida.nombre} lo recibe como responsable; titular:{' '}
              {sugerida.nombre_titular ?? 'puesto vacante'}.
            </Aviso>
          ) : (
            motivo === 'no_competencia' && (
              // V-07b: «El aviso cambia a rojo en ese caso». El texto es diseño propio.
              <Aviso tono="error" rol="status">
                Sin área sugerida cuenta como rebote: regresa a {origen ?? 'quien lo envió'}.
              </Aviso>
            )
          )}
        </>
      )}
      <AreaTexto blanco etiqueta="Nota para quien lo recibe" value={nota} onChange={(e) => setNota(e.target.value)} />
      <ErrorOperacion error={catalogos.error} que="cargar las opciones del catálogo" />
      <ErrorOperacion error={devolver.error} que="devolver el documento" />
    </Modal>
  )
}
