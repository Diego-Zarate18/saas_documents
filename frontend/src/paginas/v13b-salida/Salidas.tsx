import { useState } from 'react'
import { useCatalogos, useRegistrarAcuse, useSalidas } from '../../api/consultas'
import type { Salida } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { Campo } from '../../componentes/base/Campo'
import { TEXTO_TIPO_ACTOR } from '../../componentes/base/textos'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { EstadoConsulta } from '../../componentes/compuestos/EstadoConsulta'
import { Selector } from '../../componentes/compuestos/Selector'
import { Tabla } from '../../componentes/compuestos/Tabla'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import { aHoraLocal, deHoraLocal, diaMes, fechaHora } from '../formato'
import listado from '../listado.module.css'
import { RegistrarSalida } from './RegistrarSalida'
import estilos from './Salidas.module.css'

const TODAS = 'todas'

const COLUMNAS = [
  { titulo: 'Folio', ancho: 110 },
  { titulo: 'Documento' },
  { titulo: 'Destinatario', ancho: 150 },
  { titulo: 'Acuse', ancho: 120 },
]

const mesDe = (iso: string) => {
  const texto = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' })
    .format(new Date(iso))
    .replace(' de ', ' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * V-13 Salidas externas y acuses (O-20, O-21): el listado de oficialía. «Registrar salida» abre V-13b y la
 * salida elegida muestra el panel «Registrar acuse» (D-58: oficialía registra el acuse, el área concluye).
 */
export function Salidas() {
  const [acuse, setAcuse] = useState(TODAS)
  const [abierto, setAbierto] = useState(false)
  const [elegida, setElegida] = useState<string>()
  const salidas = useSalidas(acuse === TODAS ? null : (acuse as 'con' | 'sin'))
  const catalogos = useCatalogos()
  const lista = salidas.data?.elementos ?? []
  const actual = lista.find((s) => s.id === elegida) ?? lista[0]
  const tipoDe = (nombre: string) => catalogos.data?.actores_externos.find((a) => a.nombre === nombre)?.tipo
  const meses = [...new Set(lista.map((s) => mesDe(s.fecha_hora)))]

  return (
    <div className={listado.pagina}>
      <EncabezadoPagina
        titulo="Salidas externas"
        descripcion="Documentos que salen hacia instituciones, proveedores o ciudadanos, y su acuse de recibo."
        acciones={
          <>
            <Selector
              variante="pildora"
              prefijo="Acuse:"
              valor={acuse}
              opciones={[
                { valor: TODAS, texto: 'Todos' },
                { valor: 'sin', texto: 'Sin acuse' },
                { valor: 'con', texto: 'Con acuse' },
              ]}
              alCambiar={setAcuse}
            />
            <Boton icono="salida" onClick={() => setAbierto(true)}>
              Registrar salida
            </Boton>
          </>
        }
      />
      <div className={listado.cuerpo}>
        <div className={estilos.meses}>
          <EstadoConsulta
            consulta={salidas}
            que="las salidas"
            esqueleto={<EsqueletoSalidas />}
            vacio={(d) => (d.total === 0 ? 'No hay salidas con ese filtro.' : null)}
          >
            {() =>
              meses.map((mes) => (
                <Tarjeta key={mes} material="vidrio" className={listado.tarjeta} aria-label={`Salidas de ${mes}`}>
                  <div className={listado.cabecera}>
                    <h2 className={listado.titulo}>{mes}</h2>
                    <p className={listado.origen}>PostgreSQL</p>
                  </div>
                  <Tabla titulo={`Salidas externas de ${mes}`} columnas={COLUMNAS}>
                    {lista
                      .filter((s) => mesDe(s.fecha_hora) === mes)
                      .map((s) => {
                        const tipo = tipoDe(s.destinatario)
                        return (
                          <tr key={s.id} className={s === actual ? listado.elegida : undefined}>
                            <td>
                              <button
                                type="button"
                                className={`${listado.elegir} ${listado.folio}`}
                                aria-pressed={s === actual}
                                onClick={() => setElegida(s.id)}
                              >
                                {s.folio}
                              </button>
                            </td>
                            <td>
                              <p className={listado.texto}>{s.sintesis}</p>
                              {s.folio_responde_a && <p className={estilos.responde}>Responde a {s.folio_responde_a}</p>}
                            </td>
                            <td className={listado.secundario}>
                              {s.destinatario}
                              {tipo && ` · ${TEXTO_TIPO_ACTOR[tipo].toLowerCase()}`}
                            </td>
                            <td>
                              <span className={`${estilos.acuse} ${s.acuse ? estilos.conAcuse : estilos.sinAcuse}`}>
                                {s.acuse ? `Con acuse · ${diaMes(s.acuse.fecha_hora)}` : 'Sin acuse'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                  </Tabla>
                </Tarjeta>
              ))
            }
          </EstadoConsulta>
        </div>
        {actual && <PanelAcuse key={actual.id} salida={actual} />}
      </div>
      <RegistrarSalida abierto={abierto} alCambiar={setAbierto} alRegistrar={(s) => setElegida(s.id)} />
    </div>
  )
}

/** Panel «Registrar acuse» de V-13 para la salida elegida; si ya tiene acuse, lo muestra. */
function PanelAcuse({ salida }: { salida: Salida }) {
  const [hora, setHora] = useState(() => aHoraLocal(new Date().toISOString()))
  const [recibio, setRecibio] = useState('')
  const acuse = useRegistrarAcuse()
  const listo = hora && recibio.trim()
  return (
    <Tarjeta material="vidrio" className={listado.panel} aria-labelledby="titulo-acuse">
      <div>
        <p className={listado.folio}>{salida.folio}</p>
        <h2 id="titulo-acuse" className={listado.tituloPanel}>
          {salida.acuse ? 'Acuse registrado' : 'Registrar acuse'}
        </h2>
        <p className={estilos.secundario}>
          {salida.sintesis} · para {salida.destinatario}
        </p>
      </div>
      {salida.acuse ? (
        // Diseño propio: el Figma solo dibuja el panel de una salida sin acuse.
        <dl className={estilos.acuseRegistrado}>
          <div>
            <dt>Fecha y hora del acuse</dt>
            <dd>{fechaHora(salida.acuse.fecha_hora)}</dd>
          </div>
          <div>
            <dt>Quién recibió</dt>
            <dd>{salida.acuse.recibio}</dd>
          </div>
        </dl>
      ) : (
        <>
          <Campo blanco type="datetime-local" etiqueta="Fecha y hora del acuse" value={hora} onChange={(e) => setHora(e.target.value)} />
          <Campo blanco etiqueta="Quién recibió" value={recibio} onChange={(e) => setRecibio(e.target.value)} />
          {salida.folio_responde_a && (
            <Aviso tono="info" icono="enlace">
              Esta salida responde a {salida.folio_responde_a}. Concluirlo le toca al área responsable: lo verá en su bandeja con la
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

function EsqueletoSalidas() {
  return (
    <Tarjeta material="vidrio" className={listado.tarjeta} aria-hidden="true">
      <div className={listado.cabecera}>
        <p className={listado.titulo}>
          <Forma ancho="12ch" />
        </p>
      </div>
      <Tabla titulo="Salidas externas" columnas={COLUMNAS}>
        {[30, 24, 34, 28].map((ancho) => (
          <tr key={ancho}>
            <td>
              <span className={listado.folio}>
                <Forma ancho="12ch" />
              </span>
            </td>
            <td className={listado.texto}>
              <Forma ancho={`${ancho}ch`} />
            </td>
            <td className={listado.secundario}>
              <Forma ancho="14ch" />
            </td>
            <td>
              <Forma ancho="9ch" />
            </td>
          </tr>
        ))}
      </Tabla>
    </Tarjeta>
  )
}
