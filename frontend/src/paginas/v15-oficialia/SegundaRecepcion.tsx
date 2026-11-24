import { useState } from 'react'
import { useCatalogos, useFicha, useSegundaRecepcion } from '../../api/consultas'
import type { Canal, Uuid } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { Campo } from '../../componentes/base/Campo'
import { TEXTO_CANAL } from '../../componentes/base/textos'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Modal } from '../../componentes/compuestos/Modal'
import { Resumen } from '../../componentes/compuestos/Resumen'
import { Segmentado } from '../../componentes/compuestos/Segmentado'
import { deHoraLocal, fecha, fechaHora } from '../formato'

interface Props {
  /** Se abre desde la ficha (V-04d) o desde el duplicado detectado al registrar (V-03). */
  idDocumento: Uuid
  abierto: boolean
  alCambiar: (abierto: boolean) => void
  /** Al registrarla desde V-03 se navega a la ficha. */
  alRegistrar?: () => void
}

/** V-15c Registrar segunda recepción (O-19, D-28): el folio no cambia; solo el sello en papel fija la fecha oficial. */
export function SegundaRecepcion({ idDocumento, abierto, alCambiar, alRegistrar }: Props) {
  const ficha = useFicha(idDocumento).data
  const recepcion = useSegundaRecepcion(idDocumento)
  const r = ficha?.registro
  const catalogos = useCatalogos()
  const canales = catalogos.data?.canales ?? []
  // D-28: la segunda recepción llega por el canal que aún no se registró.
  const otro: Canal = r?.canal === 'papel' ? 'correo' : 'papel'
  const [canal, setCanal] = useState<Canal>()
  const [hora, setHora] = useState('')
  const elegido = canal ?? otro
  const fechaOficial = elegido === 'papel' && hora ? fecha(hora.slice(0, 10)) : r ? fecha(r.fecha_oficial) : ''

  function cerrar(abrir: boolean) {
    if (!abrir) {
      setCanal(undefined)
      setHora('')
      recepcion.reset()
    }
    alCambiar(abrir)
  }

  return (
    <Modal
      abierto={abierto}
      alCambiar={cerrar}
      folio={r?.folio}
      titulo="Registrar segunda recepción"
      descripcion="El mismo documento llegó por otro canal. El folio no cambia."
      ancho={560}
      pie={
        <>
          <Boton variante="fantasma" onClick={() => cerrar(false)}>
            Volver
          </Boton>
          <Boton
            icono="registrar"
            disabled={!hora || !r || r.segunda_recepcion !== null}
            pendiente={recepcion.isPending}
            onClick={() =>
              recepcion.mutate(
                { canal: elegido, fecha_recepcion: deHoraLocal(hora) },
                {
                  onSuccess: () => {
                    cerrar(false)
                    alRegistrar?.()
                  },
                },
              )
            }
          >
            Registrar recepción
          </Boton>
        </>
      }
    >
      {r && (
        <Resumen titulo="Primera recepción" borde>
          <p>
            {TEXTO_CANAL[r.canal]} · {fechaHora(r.fecha_recepcion)}
            {r.canal === 'papel' && ' · sello de oficialía'}
          </p>
          <p>Fecha oficial: {fecha(r.fecha_oficial)}</p>
        </Resumen>
      )}
      {r?.segunda_recepcion ? (
        <Aviso tono="error" rol="status">
          Este documento ya tiene su segunda recepción, por {TEXTO_CANAL[r.segunda_recepcion.canal].toLowerCase()}.
        </Aviso>
      ) : (
        <>
          <Segmentado
            ancho
            etiqueta="Canal de esta recepción"
            valor={elegido}
            alCambiar={setCanal}
            opciones={canales.map((c) => ({
              valor: c,
              texto: c === r?.canal ? `${TEXTO_CANAL[c]} · ya registrado` : TEXTO_CANAL[c],
              deshabilitado: c === r?.canal,
            }))}
          />
          <Campo
            blanco
            type="datetime-local"
            etiqueta="Fecha y hora de recepción"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
          <Aviso tono="info" icono="reloj">
            {elegido === 'correo'
              ? `Solo el sello en papel fija la fecha oficial. Como esta llegó por correo, la fecha oficial sigue siendo ${fechaOficial}.`
              : `El sello en papel fija la fecha oficial${hora ? `: pasará a ser ${fechaOficial}` : ''}.`}
          </Aviso>
        </>
      )}
      <ErrorOperacion error={catalogos.error} que="cargar las opciones del catálogo" />
      <ErrorOperacion error={recepcion.error} que="registrar la recepción" />
    </Modal>
  )
}
