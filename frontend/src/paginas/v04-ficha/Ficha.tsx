import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useFicha } from '../../api/consultas'
import type { Ficha as DatosFicha, Sesion } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { Estado } from '../../componentes/base/Estado'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { EstadoConsulta } from '../../componentes/compuestos/EstadoConsulta'
import { Modal } from '../../componentes/compuestos/Modal'
import { Icono } from '../../iconos/Icono'
import { OPCIONES } from '../../rutas/menu'
import { accionesFicha } from '../../sesion/permisos'
import { useSesion } from '../../sesion/sesion'
import { dias } from '../formato'
import { Turnar } from '../v05-turnar/Turnar'
import estilos from './Ficha.module.css'
import { FichaEsqueleto } from './FichaEsqueleto'
import { RecorridoFicha, RelacionesFicha } from './Laterales'
import { Expediente, Registro } from './Secciones'

/** Acciones cuyas vistas llegan en T-02: abren un aviso con la vista y el nodo del Figma. */
interface Pendiente {
  titulo: string
  vistas: string
}

const PENDIENTES = {
  masOficialia: { titulo: 'Más acciones', vistas: 'V-04d · nodo del Figma 51:1778' },
  mas: { titulo: 'Más', vistas: 'V-10 · nodo del Figma 48:1119 y V-11b · nodo del Figma 48:1407' },
  relacionar: { titulo: 'Relacionar', vistas: 'V-10 · nodo del Figma 48:1119' },
  devolver: { titulo: 'Devolver', vistas: 'V-07 · nodo del Figma 46:707' },
  concluir: { titulo: 'Concluir', vistas: 'V-09 · nodo del Figma 47:1192' },
  anexo: { titulo: 'Agregar anexo', vistas: 'O-28 (sin vista propia en el Figma)' },
  nota: { titulo: 'Agregar nota', vistas: 'O-29 (sin vista propia en el Figma)' },
} satisfies Record<string, Pendiente>

/** V-04 (oficialía), V-04b (titular) y V-04e (personal): O-11. */
export function Ficha() {
  const { id = '' } = useParams()
  const sesion = useSesion().data
  const ficha = useFicha(id)
  if (!sesion) return null
  return (
    <EstadoConsulta consulta={ficha} que="la ficha del documento" esqueleto={<FichaEsqueleto />}>
      {(datos) => <FichaDe ficha={datos} sesion={sesion} />}
    </EstadoConsulta>
  )
}

function FichaDe({ ficha, sesion }: { ficha: DatosFicha; sesion: Sesion }) {
  const [turnando, setTurnando] = useState(false)
  const [pendiente, setPendiente] = useState<Pendiente>()
  const puede = accionesFicha(sesion, ficha)
  const r = ficha.registro
  const ubicacion = ficha.ubicacion_actual.find((u) => u.rol === 'responsable') ?? ficha.ubicacion_actual[0]
  const abrir = (p: Pendiente) => () => setPendiente(p)

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina
        migas={
          <>
            <Link to={OPCIONES.bandeja.ruta}>Bandeja</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{r.folio}</span>
          </>
        }
        titulo={r.asunto ?? r.folio}
        descripcion={
          <p className={estilos.meta}>
            <Estado estado={r.estado} />
            {r.confidencial && <Estado estado="confidencial" />}
            {r.posible_duplicado && <Estado estado="posible_duplicado" />}
            <span className={estilos.secundario}>{r.tipo}</span>
            {ubicacion && (
              <>
                <span className={estilos.secundario} aria-hidden="true">
                  ·
                </span>
                <Icono nombre="reloj" tamano={14} />
                <span>
                  Pendiente en {ubicacion.area} como {ubicacion.rol} · {dias(ubicacion.antiguedad_dias)}
                </span>
              </>
            )}
          </p>
        }
        acciones={
          <>
            {puede.masAcciones && (
              <Boton variante="fantasma" icono="abajo" onClick={abrir(sesion.rol === 'OF' ? PENDIENTES.masOficialia : PENDIENTES.mas)}>
                {sesion.rol === 'OF' ? 'Más acciones' : 'Más'}
              </Boton>
            )}
            {puede.relacionar && (
              <Boton variante="secundario" icono="enlace" onClick={abrir(PENDIENTES.relacionar)}>
                Relacionar
              </Boton>
            )}
            {puede.devolver && (
              <Boton variante="secundario" icono="devolver" onClick={abrir(PENDIENTES.devolver)}>
                Devolver
              </Boton>
            )}
            {puede.turnar && (
              <Boton variante={puede.concluir ? 'secundario' : 'primario'} icono="turnar" onClick={() => setTurnando(true)}>
                Turnar
              </Boton>
            )}
            {puede.concluir && (
              <Boton icono="check" onClick={abrir(PENDIENTES.concluir)}>
                Concluir
              </Boton>
            )}
          </>
        }
      />

      <div className={estilos.cuerpo}>
        <div className={estilos.columna}>
          <Registro ficha={ficha} />
          {ficha.acceso === 'completo' && (
            <Expediente
              ficha={ficha}
              agregarAnexo={puede.agregarAnexo ? abrir(PENDIENTES.anexo) : undefined}
              agregarNota={puede.agregarNota ? abrir(PENDIENTES.nota) : undefined}
            />
          )}
        </div>
        <div className={estilos.columna}>
          <RecorridoFicha ficha={ficha} />
          {ficha.acceso === 'completo' && <RelacionesFicha ficha={ficha} />}
        </div>
      </div>

      {puede.turnar && <Turnar idDocumento={r.id} folio={r.folio} abierto={turnando} alCambiar={setTurnando} />}
      <Modal
        abierto={pendiente !== undefined}
        alCambiar={(abierto) => !abierto && setPendiente(undefined)}
        folio={r.folio}
        titulo={pendiente?.titulo ?? ''}
        descripcion="Vista en construcción: llega en T-02."
        ancho={480}
        pie={
          <Boton variante="secundario" onClick={() => setPendiente(undefined)}>
            Entendido
          </Boton>
        }
      >
        <p className={estilos.secundario}>{pendiente?.vistas}</p>
      </Modal>
    </div>
  )
}
