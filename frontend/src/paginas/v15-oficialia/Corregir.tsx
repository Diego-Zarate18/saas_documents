import { useState } from 'react'
import { useCorregirMovimiento } from '../../api/consultas'
import type { Ficha, Movimiento, RolTurno as Rol } from '../../api/tipos'
import { AreaTexto } from '../../componentes/base/Campo'
import { Boton } from '../../componentes/base/Boton'
import { RolTurno } from '../../componentes/base/RolTurno'
import { TEXTO_ROL } from '../../componentes/base/textos'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Modal } from '../../componentes/compuestos/Modal'
import { Resumen } from '../../componentes/compuestos/Resumen'
import { Segmentado } from '../../componentes/compuestos/Segmentado'
import { CampoSelector } from '../../componentes/compuestos/Selector'
import { diaMes, fechaHora } from '../formato'
import estilos from './Corregir.module.css'

const ROLES: Rol[] = ['responsable', 'apoyo', 'conocimiento']

interface Props {
  ficha: Ficha
  abierto: boolean
  alCambiar: (abierto: boolean) => void
}

/** Turnos de la bitácora con el rol vigente: el de su última corrección, si la tiene (O-25). */
function turnosVigentes(recorrido: Movimiento[]) {
  const corregido = new Map(recorrido.filter((m) => m.id_corrige).map((m) => [m.id_corrige, m.rol]))
  return recorrido.filter((m) => m.tipo === 'turno').map((m) => ({ ...m, rol: corregido.get(m.id) ?? m.rol }))
}

/** V-15b Corregir un movimiento (O-25): se agrega un movimiento de corrección; el original queda intacto. */
export function Corregir({ ficha, abierto, alCambiar }: Props) {
  const turnos = turnosVigentes(ficha.recorrido ?? [])
  const [idMovimiento, setIdMovimiento] = useState('')
  const [rol, setRol] = useState<Rol>()
  const [motivo, setMotivo] = useState('')
  const [tocado, setTocado] = useState(false)
  const corregir = useCorregirMovimiento()
  // Por omisión, el último turno: lo más probable es que la captura equivocada sea la más reciente.
  const elegido = turnos.find((m) => m.id === idMovimiento) ?? turnos.at(-1)
  const grupo = turnos.filter((m) => m.id_grupo_turno === elegido?.id_grupo_turno)
  const otroResponsable = grupo.find((m) => m.id !== elegido?.id && m.rol === 'responsable')
  // RI-10: un solo responsable y nunca ninguno. Los roles que lo romperían no se ofrecen.
  const permitido = (r: Rol) => (r === 'responsable' ? !otroResponsable : elegido?.rol !== 'responsable')
  const nuevo = rol ?? ROLES.find((r) => r !== elegido?.rol && permitido(r))
  const valido = elegido && nuevo && nuevo !== elegido.rol && permitido(nuevo) && motivo.trim()
  const fechas = new Set(turnos.map((m) => m.id_grupo_turno)).size > 1

  function cerrar(abrir: boolean) {
    if (!abrir) {
      setIdMovimiento('')
      setRol(undefined)
      setMotivo('')
      setTocado(false)
      corregir.reset()
    }
    alCambiar(abrir)
  }

  return (
    <Modal
      abierto={abierto}
      alCambiar={cerrar}
      folio={ficha.registro.folio}
      titulo="Corregir un movimiento"
      descripcion="La bitácora no se edita: se agrega un movimiento de corrección que apunta al original."
      ancho={640}
      pie={
        <>
          <Boton variante="fantasma" onClick={() => cerrar(false)}>
            Volver
          </Boton>
          <Boton
            icono="check"
            disabled={!valido}
            pendiente={corregir.isPending}
            onClick={() =>
              elegido && nuevo && corregir.mutate({ id_movimiento: elegido.id, rol: nuevo, motivo }, { onSuccess: () => cerrar(false) })
            }
          >
            Guardar corrección
          </Boton>
        </>
      }
    >
      {!elegido ? (
        <Aviso tono="info" icono="reloj">
          Este documento no tiene turnos que corregir.
        </Aviso>
      ) : (
        <>
          <Resumen titulo="Movimiento original · Turno" borde>
            <p>
              {fechaHora(elegido.fecha_hora)} · {elegido.persona} · {elegido.area_origen}
            </p>
            <ul className={estilos.grupo}>
              {grupo.map((m) => (
                <li key={m.id}>
                  {m.area_destino}
                  <RolTurno rol={m.rol} />
                </li>
              ))}
            </ul>
          </Resumen>
          <CampoSelector
            blanco
            etiqueta="Qué se corrige"
            valor={elegido.id}
            opciones={turnos.map((m) => ({
              valor: m.id,
              texto: `Rol de ${m.area_destino} en el turno${fechas ? ` del ${diaMes(m.fecha_hora)}` : ''}`,
            }))}
            alCambiar={(id) => {
              setIdMovimiento(id)
              setRol(undefined)
            }}
          />
          <div className={estilos.valor}>
            <p className={estilos.etiqueta} aria-hidden="true">
              Valor corregido
            </p>
            <Segmentado
              ancho
              etiqueta="Valor corregido"
              valor={nuevo ?? elegido.rol}
              alCambiar={setRol}
              opciones={ROLES.map((r) => ({ valor: r, texto: TEXTO_ROL[r], deshabilitado: r === elegido.rol || !permitido(r) }))}
            />
            {otroResponsable && (
              <p className={estilos.ayuda}>
                Responsable no está disponible: el grupo ya tiene uno ({otroResponsable.area_destino}).
              </p>
            )}
            {elegido.rol === 'responsable' && (
              <p className={estilos.ayuda}>El grupo se quedaría sin responsable: corrige primero el rol de otra área.</p>
            )}
          </div>
          <AreaTexto
            blanco
            etiqueta="Motivo (obligatorio)"
            error={tocado && !motivo.trim() ? 'Escribe el motivo de la corrección.' : undefined}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            onBlur={() => setTocado(true)}
          />
          {nuevo && nuevo !== elegido.rol && (
            <Aviso tono="info" icono="reloj">
              El original queda intacto y visible en el recorrido marcado como corregido.{' '}
              {nuevo === 'conocimiento'
                ? `${elegido.area_destino} dejará de tenerlo pendiente.`
                : `${elegido.area_destino} pasará a tenerlo pendiente como ${nuevo}.`}
            </Aviso>
          )}
        </>
      )}
      <ErrorOperacion error={corregir.error} que="guardar la corrección" />
    </Modal>
  )
}
