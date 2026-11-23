import { useState } from 'react'
import { useRegistrarAcuse } from '../../api/consultas'
import { Boton } from '../../componentes/base/Boton'
import { Campo } from '../../componentes/base/Campo'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import { EnConstruccion } from '../en-construccion/EnConstruccion'
import { aHoraLocal, deHoraLocal } from '../formato'
import { RegistrarSalida, type SalidaRegistrada } from './RegistrarSalida'
import estilos from './Salidas.module.css'

/**
 * Salidas externas mientras V-13 (el listado, T-02b) sigue en construcción: la acción «Registrar salida»
 * del encabezado de V-13 abre V-13b, y la salida recién registrada ofrece el panel «Registrar acuse» de V-13 (O-21).
 */
export function Salidas() {
  const [abierto, setAbierto] = useState(false)
  const [salida, setSalida] = useState<SalidaRegistrada>()
  return (
    <EnConstruccion
      clave="salidas"
      acciones={
        <Boton icono="salida" onClick={() => setAbierto(true)}>
          Registrar salida
        </Boton>
      }
    >
      {salida && <PanelAcuse key={salida.id} salida={salida} />}
      <RegistrarSalida abierto={abierto} alCambiar={setAbierto} alRegistrar={setSalida} />
    </EnConstruccion>
  )
}

/** Panel «Registrar acuse» de V-13 para la salida recién registrada (D-58: oficialía registra, el área concluye). */
function PanelAcuse({ salida }: { salida: SalidaRegistrada }) {
  const [hora, setHora] = useState(() => aHoraLocal(new Date().toISOString()))
  const [recibio, setRecibio] = useState('')
  const acuse = useRegistrarAcuse()
  const listo = hora && recibio.trim()
  return (
    <Tarjeta material="solida" className={estilos.panel} aria-labelledby="titulo-acuse">
      <div>
        <p className={estilos.folio}>{salida.folio}</p>
        <h2 id="titulo-acuse" className={estilos.titulo}>
          Registrar acuse
        </h2>
        <p className={estilos.secundario}>
          {salida.sintesis} · para {salida.destinatario}
        </p>
      </div>
      {acuse.isSuccess ? (
        <Aviso tono="exito" rol="status">
          Acuse guardado.
          {salida.respondeA && ` El área responsable de ${salida.respondeA.folio} lo verá en su bandeja para concluirlo.`}
        </Aviso>
      ) : (
        <>
          <div className={estilos.fila}>
            <Campo blanco type="datetime-local" etiqueta="Fecha y hora del acuse" value={hora} onChange={(e) => setHora(e.target.value)} />
            <Campo blanco etiqueta="Quién recibió" value={recibio} onChange={(e) => setRecibio(e.target.value)} />
          </div>
          {salida.respondeA && (
            <Aviso tono="info" icono="enlace">
              Esta salida responde a {salida.respondeA.folio}. Concluirlo le toca al área responsable: lo verá en su bandeja con la
              salida ya ligada.
            </Aviso>
          )}
          <ErrorOperacion error={acuse.error} que="guardar el acuse" />
          <Boton
            className={estilos.guardar}
            icono="check"
            disabled={!listo}
            pendiente={acuse.isPending}
            onClick={() => acuse.mutate({ id_salida: salida.id, fecha_hora: deHoraLocal(hora), recibio })}
          >
            Guardar acuse
          </Boton>
        </>
      )}
    </Tarjeta>
  )
}
