import { useState } from 'react'
import { useAreas, useBandeja, usePosiblesDuplicados } from '../../api/consultas'
import type { PendienteBandeja, Sesion } from '../../api/tipos'
import { BotonEnlace } from '../../componentes/base/Boton'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { Indicador } from '../../componentes/compuestos/Indicador'
import { Selector } from '../../componentes/compuestos/Selector'
import { OPCIONES } from '../../rutas/menu'
import { useSesion } from '../../sesion/sesion'
import { dias } from '../formato'
import estilos from './Bandeja.module.css'
import { TablaPendientes } from './TablaPendientes'
import { TarjetaAcuses, TarjetaRebotes } from './TarjetasLaterales'
import { VistaPreviaRecorrido } from './VistaPreviaRecorrido'

const DESCRIPCION =
  'Lo que tu área recibió como responsable o apoyo y todavía no sale de ella.'
const DESCRIPCION_PERSONAL =
  'Lo que tu área recibió como responsable o apoyo. Atiende y concluye lo que tu área tiene como responsable.'

/** V-02 (oficialía y dirección), V-02b (titular) y V-02c (personal): O-14. */
export function Bandeja() {
  const sesion = useSesion().data
  if (!sesion) return null
  return <BandejaDe sesion={sesion} />
}

function BandejaDe({ sesion }: { sesion: Sesion }) {
  const eligeArea = sesion.rol === 'OF' || sesion.rol === 'DI'
  const [idArea, setIdArea] = useState(sesion.id_area ?? undefined)
  const [seleccion, setSeleccion] = useState<PendienteBandeja>()
  const areas = useAreas()
  const todos = useBandeja({ id_area: idArea })
  const duplicados = usePosiblesDuplicados(sesion.rol === 'OF')

  const elementos = todos.data?.elementos ?? []
  const responsable = elementos.filter((p) => p.rol === 'responsable').length
  const masAntiguo = Math.max(0, ...elementos.map((p) => p.antiguedad_dias))
  const totalDuplicados = duplicados.data?.total ?? 0
  // Mientras carga, los indicadores muestran una raya en lugar de un cero que confundiría.
  const cifra = (valor: string | number) => (todos.isPending ? '—' : valor)

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina
        titulo="Bandeja"
        descripcion={sesion.rol === 'PE' ? DESCRIPCION_PERSONAL : DESCRIPCION}
        acciones={
          <>
            {eligeArea ? (
              <Selector
                variante="hundido"
                prefijo="Área:"
                valor={idArea}
                opciones={(areas.data?.elementos ?? []).map((a) => ({ valor: a.id, texto: a.nombre }))}
                alCambiar={(valor) => {
                  setIdArea(valor)
                  setSeleccion(undefined)
                }}
              />
            ) : (
              <p className={estilos.areaFija}>
                <span>Área:</span> <span>{sesion.nombre_area}</span>
              </p>
            )}
            {sesion.rol === 'OF' && (
              <BotonEnlace to={OPCIONES.registrar.ruta} icono="registrar">
                Registrar documento
              </BotonEnlace>
            )}
          </>
        }
      />

      <div className={estilos.indicadores}>
        <Indicador destacado etiqueta="Pendientes en el área" valor={cifra(elementos.length)} nota="Como responsable o apoyo" />
        <Indicador etiqueta="Como responsable" valor={cifra(responsable)} nota="Los atiende y concluye tu área" />
        <Indicador etiqueta="Como apoyo" valor={cifra(elementos.length - responsable)} nota="Otra área es la responsable" />
        <Indicador etiqueta="Más antiguo" valor={cifra(dias(masAntiguo))} nota="Días naturales desde que llegó" />
      </div>

      {totalDuplicados > 0 && (
        <Aviso
          tono="duplicado"
          accion={
            <BotonEnlace variante="secundario" to={OPCIONES.duplicados.ruta}>
              Revisar
            </BotonEnlace>
          }
        >
          {totalDuplicados === 1
            ? '1 documento sin número o sin fecha está marcado como posible duplicado y espera revisión.'
            : `${totalDuplicados} documentos sin número o sin fecha están marcados como posible duplicado y esperan revisión.`}
        </Aviso>
      )}

      <div className={estilos.bento}>
        <TablaPendientes idArea={idArea} seleccion={seleccion} alSeleccionar={setSeleccion} />
        <div className={estilos.columna}>
          <VistaPreviaRecorrido pendiente={seleccion ?? todos.data?.elementos[0]} />
          {eligeArea ? <TarjetaRebotes /> : <TarjetaAcuses />}
        </div>
      </div>
    </div>
  )
}
