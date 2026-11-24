import { useState } from 'react'
import { useAreas, useCatalogos, useTurnar } from '../../api/consultas'
import { validarGrupoTurno } from '../../api/reglas'
import type { RolTurno, Uuid } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { TEXTO_ROL } from '../../componentes/base/textos'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Modal } from '../../componentes/compuestos/Modal'
import { Segmentado } from '../../componentes/compuestos/Segmentado'
import { Selector } from '../../componentes/compuestos/Selector'
import { Icono } from '../../iconos/Icono'
import { useSesion } from '../../sesion/sesion'
import estilos from './Turnar.module.css'

interface Fila {
  clave: number
  id_area: Uuid
  rol: RolTurno
  instruccion: string
}

let siguienteClave = 0
const filaNueva = (): Fila => ({ clave: siguienteClave++, id_area: '', rol: 'responsable', instruccion: '' })

interface Props {
  idDocumento: Uuid
  folio: string
  abierto: boolean
  alCambiar: (abierto: boolean) => void
}

/** V-05 Turnar a una o varias áreas en un solo grupo (O-03, RI-10). */
export function Turnar({ idDocumento, folio, abierto, alCambiar }: Props) {
  const [filas, setFilas] = useState<Fila[]>(() => [filaNueva()])
  const consultaAreas = useAreas()
  const catalogos = useCatalogos()
  const roles = (catalogos.data?.roles_turno ?? []).map((r) => ({ valor: r, texto: TEXTO_ROL[r], marca: r === 'responsable' }))
  const areas = consultaAreas.data?.elementos ?? []
  const idPropia = useSesion().data?.id_area
  const turnar = useTurnar(idDocumento)

  const error = validarGrupoTurno(filas)
  const areaDe = (id: Uuid) => areas.find((a) => a.id === id)
  const elegidas = filas.filter((f) => f.id_area)
  const responsable = filas.find((f) => f.rol === 'responsable')

  const cambiar = (clave: number, cambio: Partial<Fila>) =>
    setFilas((actuales) => actuales.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)))

  function cerrar(abrir: boolean) {
    if (!abrir) {
      setFilas([filaNueva()])
      turnar.reset()
    }
    alCambiar(abrir)
  }

  function enviar() {
    turnar.mutate(
      filas.map(({ id_area, rol, instruccion }) => ({ id_area, rol, instruccion })),
      { onSuccess: () => cerrar(false) },
    )
  }

  return (
    <Modal
      abierto={abierto}
      alCambiar={cerrar}
      folio={folio}
      titulo="Turnar documento"
      descripcion="Cada turno simultáneo forma un grupo con un solo responsable. Conocimiento solo informa: no queda pendiente."
      pie={
        <>
          <Boton variante="fantasma" onClick={() => cerrar(false)}>
            Cancelar
          </Boton>
          <Boton icono="turnar" onClick={enviar} disabled={error !== null} pendiente={turnar.isPending}>
            Turnar a {filas.length} {filas.length === 1 ? 'área' : 'áreas'}
          </Boton>
        </>
      }
    >
      <div className={estilos.columnas} aria-hidden="true">
        <span>Área destino</span>
        <span>Rol</span>
        <span>Instrucción</span>
      </div>
      <ul className={estilos.filas} aria-label="Áreas destino">
        {filas.map((f, i) => {
          const nombre = areaDe(f.id_area)?.nombre ?? `fila ${i + 1}`
          return (
            <li key={f.clave} className={estilos.fila}>
              <Selector
                variante="fila"
                etiqueta={`Área destino ${i + 1}`}
                marcador="Elige un área"
                valor={f.id_area}
                cargando={consultaAreas.isPending}
                opciones={areas.filter((a) => a.id !== idPropia).map((a) => ({ valor: a.id, texto: a.nombre }))}
                alCambiar={(id_area) => cambiar(f.clave, { id_area })}
              />
              <Segmentado
                etiqueta={`Rol de ${nombre}`}
                opciones={roles}
                valor={f.rol}
                alCambiar={(rol) => cambiar(f.clave, { rol })}
              />
              <textarea
                className={estilos.instruccion}
                aria-label={`Instrucción para ${nombre}`}
                rows={1}
                value={f.instruccion}
                onChange={(e) => cambiar(f.clave, { instruccion: e.target.value })}
              />
              <button
                type="button"
                className={estilos.quitar}
                aria-label={`Quitar ${nombre}`}
                onClick={() => setFilas((actuales) => actuales.filter((x) => x.clave !== f.clave))}
              >
                <Icono nombre="cerrar" tamano={16} />
              </button>
            </li>
          )
        })}
      </ul>
      <Boton variante="fantasma" icono="mas" className={estilos.agregar} onClick={() => setFilas([...filas, filaNueva()])}>
        Agregar área
      </Boton>
      {error ? (
        <Aviso tono="error" rol="status">
          {error}
        </Aviso>
      ) : (
        <Aviso tono="exito" rol="status">
          Un responsable en el grupo: {areaDe(responsable?.id_area ?? '')?.nombre}.
        </Aviso>
      )}
      {elegidas.length > 0 && (
        <Aviso tono="info">
          Se guardará quién es titular de cada área al turnar:{' '}
          {elegidas
            .map((f) => {
              const area = areaDe(f.id_area)
              return `${area?.nombre ?? ''}, ${area?.nombre_titular ?? 'puesto vacante'}`
            })
            .join(' · ')}
          .
        </Aviso>
      )}
      <ErrorOperacion error={catalogos.error} que="cargar las opciones del catálogo" />
      <ErrorOperacion error={turnar.error} que="turnar el documento" />
    </Modal>
  )
}
