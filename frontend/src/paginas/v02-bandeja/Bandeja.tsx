import { useState, type ReactNode } from 'react'
import { useAreas, useBandeja, usePosiblesDuplicados, useRecorrido } from '../../api/consultas'
import type { PendienteBandeja, Sesion } from '../../api/tipos'
import { Boton, BotonEnlace } from '../../componentes/base/Boton'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { Indicador } from '../../componentes/compuestos/Indicador'
import { Selector } from '../../componentes/compuestos/Selector'
import { OPCIONES } from '../../rutas/menu'
import { useSesion } from '../../sesion/sesion'
import { dias } from '../formato'
import estilos from './Bandeja.module.css'
import { TablaPendientes, TODOS } from './TablaPendientes'
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
  const [tipo, setTipo] = useState(TODOS)
  const [antiguedad, setAntiguedad] = useState('0')
  const areas = useAreas()
  const todos = useBandeja({ id_area: idArea })
  // Sin filtros es la misma consulta que `todos` (las claves sin valor no cuentan): una sola lectura.
  const filtrada = useBandeja({
    id_area: idArea,
    tipo: tipo === TODOS ? undefined : tipo,
    antiguedad_minima: antiguedad === '0' ? undefined : Number(antiguedad),
  })
  // La fila elegida por el usuario si sigue en la lista filtrada; si no, la primera de la lista.
  const lista = filtrada.data?.elementos ?? []
  const elegida = lista.find((p) => p.id_documento === seleccion?.id_documento) ?? lista[0]
  // En la carga inicial la columna lateral entera queda en esqueleto hasta que llega el recorrido
  // elegido por omisión: su alto depende de cuántos pasos tenga, y la tarjeta de abajo se movería.
  // Sin pendiente la consulta está deshabilitada y TanStack la da por pendiente: no hay nada que esperar.
  const recorrido = useRecorrido(elegida?.id_documento)
  const columnaCargando =
    filtrada.isPending || (seleccion === undefined && elegida !== undefined && recorrido.isPending)
  const duplicados = usePosiblesDuplicados(sesion.rol === 'OF')

  const elementos = todos.data?.elementos ?? []
  const responsable = elementos.filter((p) => p.rol === 'responsable').length
  const masAntiguo = Math.max(0, ...elementos.map((p) => p.antiguedad_dias))
  const totalDuplicados = duplicados.data?.total ?? 0
  // Mientras carga, cada cifra es una forma del esqueleto en lugar de un cero que confundiría.
  const cifra = (valor: ReactNode) => (todos.isPending ? <Forma ancho="1.6em" /> : valor)

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
                cargando={areas.isPending}
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

      <div className={estilos.indicadores} aria-busy={todos.isPending || undefined}>
        <Indicador destacado etiqueta="Pendientes en el área" valor={cifra(elementos.length)} nota="Como responsable o apoyo" />
        <Indicador etiqueta="Como responsable" valor={cifra(responsable)} nota="Los atiende y concluye tu área" />
        <Indicador etiqueta="Como apoyo" valor={cifra(elementos.length - responsable)} nota="Otra área es la responsable" />
        <Indicador etiqueta="Más antiguo" valor={cifra(dias(masAntiguo))} nota="Días naturales desde que llegó" />
      </div>

      {sesion.rol === 'OF' && duplicados.isPending && (
        <div aria-busy="true">
          <Aviso
            tono="duplicado"
            accion={
              <Forma radio="var(--radio-control)">
                <Boton variante="secundario">Revisar</Boton>
              </Forma>
            }
          >
            <Forma ancho="60%" />
          </Aviso>
        </div>
      )}
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
        <TablaPendientes
          bandeja={filtrada}
          tipo={tipo}
          alCambiarTipo={setTipo}
          antiguedad={antiguedad}
          alCambiarAntiguedad={setAntiguedad}
          elegida={elegida}
          alSeleccionar={setSeleccion}
        />
        {/* La clave cambia al terminar la carga: el esqueleto se sustituye de una vez, sin deslizarse. */}
        <div className={estilos.columna} key={columnaCargando ? 'esqueleto' : 'datos'}>
          <VistaPreviaRecorrido pendiente={columnaCargando ? undefined : elegida} cargando={columnaCargando} />
          {eligeArea ? <TarjetaRebotes cargando={columnaCargando} /> : <TarjetaAcuses cargando={columnaCargando} />}
        </div>
      </div>
    </div>
  )
}
