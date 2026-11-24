import { useState, type CSSProperties, type ReactNode } from 'react'
import { useAreas, useRebotes, useRecorrido } from '../../api/consultas'
import type { Rebote, ReglaRebote } from '../../api/tipos'
import { BotonEnlace } from '../../componentes/base/Boton'
import { TEXTO_MOTIVO, TEXTO_REGLA_REBOTE } from '../../componentes/base/textos'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { EstadoConsulta } from '../../componentes/compuestos/EstadoConsulta'
import { Selector } from '../../componentes/compuestos/Selector'
import { Tabla } from '../../componentes/compuestos/Tabla'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import { aHoraLocal, diaMes } from '../formato'
import listado from '../listado.module.css'
import estilos from './Rebotes.module.css'

const TODAS = 'todas'

const COLUMNAS = [
  { titulo: 'Folio', ancho: 104 },
  { titulo: 'Documento' },
  { titulo: 'Regla', ancho: 170 },
  { titulo: 'Áreas', ancho: 48 },
  { titulo: 'Ubicación', ancho: 120 },
]

// Diseño propio: la explicación de cada regla en el detalle (el Figma escribe una por caso).
const EXPLICACION: Record<ReglaRebote, string> = {
  no_competencia_sin_area: 'Un área dijo que no le corresponde y no sugirió a quién turnarlo.',
  tres_devoluciones: 'Se devolvió tres veces o más en el periodo sin que nadie lo atendiera.',
  tres_areas: 'Pasó por tres áreas o más como responsable sin concluirse.',
}

/** Los últimos doce meses, del actual hacia atrás, como «Noviembre 2026». */
function periodos() {
  const hoy = aHoraLocal(new Date().toISOString())
  const nombre = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return Array.from({ length: 12 }, (_, i) => {
    const fecha = new Date(Date.UTC(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1 - i, 1))
    const texto = nombre.format(fecha).replace(' de ', ' ')
    return { valor: fecha.toISOString().slice(0, 7), texto: texto.charAt(0).toUpperCase() + texto.slice(1) }
  })
}

const PERIODOS = periodos()

/** V-12 Rebotes (C3, D-32): oficialía y dirección. */
export function Rebotes() {
  const [periodo, setPeriodo] = useState(PERIODOS[0]?.valor ?? '')
  const [idArea, setIdArea] = useState(TODAS)
  const [elegido, setElegido] = useState<string>()
  const rebotes = useRebotes(true, { periodo, id_area: idArea === TODAS ? undefined : idArea })
  const areas = useAreas()
  const lista = rebotes.data?.elementos ?? []
  const actual = lista.find((r) => r.id_documento === elegido) ?? lista[0]
  const cuenta = (regla: ReglaRebote) => (rebotes.isPending ? <Forma ancho="1ch" /> : lista.filter((r) => r.reglas.includes(regla)).length)

  return (
    <div className={listado.pagina}>
      <EncabezadoPagina
        titulo="Rebotes"
        descripcion="Documentos que circulan entre áreas sin avanzar, detectados en su recorrido. Una devolución con motivo concreto no cuenta."
        acciones={
          <>
            <Selector variante="pildora" prefijo="Periodo:" valor={periodo} opciones={PERIODOS} alCambiar={setPeriodo} />
            <Selector
              variante="pildora"
              prefijo="Área:"
              valor={idArea}
              cargando={areas.isPending}
              opciones={[{ valor: TODAS, texto: 'Todas' }, ...(areas.data?.elementos ?? []).map((a) => ({ valor: a.id, texto: a.nombre }))]}
              alCambiar={setIdArea}
            />
          </>
        }
      />

      <div className={estilos.indicadores} aria-busy={rebotes.isPending || undefined}>
        <Cifra valor={cuenta('no_competencia_sin_area')} nota="«No es de nuestra competencia» sin área sugerida" />
        <Cifra valor={cuenta('tres_devoluciones')} nota="Tres o más devoluciones del mismo documento" />
        <Cifra valor={cuenta('tres_areas')} nota="Tres o más áreas distintas sin avanzar" />
        <Cifra valor={0} nota="Devoluciones sin motivo (el motivo es obligatorio)" />
      </div>

      <div className={listado.cuerpo} style={{ '--ancho-panel': '360px' } as CSSProperties}>
        <Tarjeta material="vidrio" className={listado.tarjeta} aria-labelledby="titulo-rebotes" aria-busy={rebotes.isPending || undefined}>
          <div className={listado.cabecera}>
            <h2 id="titulo-rebotes" className={listado.titulo}>
              {rebotes.data ? `${rebotes.data.total} ${rebotes.data.total === 1 ? 'documento' : 'documentos'}` : <Forma ancho="9ch" />}
            </h2>
            <p className={listado.origen}>C3 · Neo4j</p>
          </div>
          <EstadoConsulta
            consulta={rebotes}
            que="los rebotes"
            esqueleto={<EsqueletoTabla />}
            vacio={(d) => (d.total === 0 ? 'Sin rebotes en este periodo.' : null)}
          >
            {({ elementos }) => (
              <Tabla titulo="Documentos con rebote" columnas={COLUMNAS}>
                {elementos.map((r) => (
                  <tr key={r.id_documento} className={r === actual ? listado.elegida : undefined}>
                    <td>
                      <button
                        type="button"
                        className={`${listado.elegir} ${listado.folio}`}
                        aria-pressed={r === actual}
                        onClick={() => setElegido(r.id_documento)}
                      >
                        {r.folio}
                      </button>
                    </td>
                    <td className={listado.texto}>{r.asunto ?? <span className={listado.secundario}>Contenido confidencial</span>}</td>
                    <td>
                      <span className={estilos.reglas}>
                        {r.reglas.map((regla) => (
                          <span key={regla} className={estilos.regla}>
                            {TEXTO_REGLA_REBOTE[regla]}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className={listado.dato}>{r.areas}</td>
                    <td className={listado.secundario}>{r.ubicacion ?? '—'}</td>
                  </tr>
                ))}
              </Tabla>
            )}
          </EstadoConsulta>
        </Tarjeta>
        {actual && <Detalle key={actual.id_documento} rebote={actual} />}
      </div>
    </div>
  )
}

function Cifra({ valor, nota }: { valor: ReactNode; nota: string }) {
  return (
    <Tarjeta material="relieve" className={estilos.cifra}>
      <p className={estilos.valor}>{valor}</p>
      <p className={estilos.nota}>{nota}</p>
    </Tarjeta>
  )
}

/** Detalle del rebote elegido: su recorrido (C1) y la regla que lo detectó. */
function Detalle({ rebote }: { rebote: Rebote }) {
  const recorrido = useRecorrido(rebote.id_documento)
  const pasos = (recorrido.data ?? []).filter((m) => m.tipo !== 'registro' && m.tipo !== 'correccion')
  return (
    <Tarjeta material="vidrio" className={listado.panel} aria-labelledby="titulo-detalle-rebote">
      <div>
        <p className={listado.folio}>{rebote.folio}</p>
        <h2 id="titulo-detalle-rebote" className={listado.tituloPanel}>
          {rebote.asunto ?? 'Contenido confidencial'}
        </h2>
      </div>
      <p className={estilos.reglas}>
        {rebote.reglas.map((regla) => (
          <span key={regla} className={estilos.regla}>
            Regla: {TEXTO_REGLA_REBOTE[regla].toLowerCase()}
          </span>
        ))}
      </p>
      <EstadoConsulta consulta={recorrido} que="el recorrido" esqueleto={<Forma ancho="80%" />}>
        {() => (
          <ol className={estilos.pasos}>
            {pasos.map((m) => (
              <li key={m.id} className={m.tipo === 'devolucion' ? estilos.devolucion : undefined}>
                <p className={estilos.ruta}>
                  {m.area_origen ?? '—'} → {m.area_destino}
                </p>
                <p className={estilos.detalle}>
                  {m.tipo === 'devolucion'
                    ? `Devolución · ${m.motivo ? TEXTO_MOTIVO[m.motivo] : ''}`
                    : m.tipo === 'atraccion'
                      ? 'Atracción'
                      : `${m.tipo === 'conclusion' ? 'Conclusión' : 'Turno'} · ${m.rol}`}{' '}
                  · {diaMes(m.fecha_hora)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </EstadoConsulta>
      <p className={listado.secundario}>{rebote.reglas.map((r) => EXPLICACION[r]).join(' ')}</p>
      <BotonEnlace variante="secundario" icono="flecha" to={`/documentos/${rebote.id_documento}`} className={estilos.abrir}>
        Abrir ficha
      </BotonEnlace>
    </Tarjeta>
  )
}

function EsqueletoTabla() {
  return (
    <div aria-hidden="true">
      <Tabla titulo="Documentos con rebote" columnas={COLUMNAS}>
        {[26, 30, 22, 28].map((ancho) => (
          <tr key={ancho}>
            <td>
              <span className={listado.folio}>
                <Forma ancho="11ch" />
              </span>
            </td>
            <td className={listado.texto}>
              <Forma ancho={`${ancho}ch`} />
            </td>
            <td>
              <Forma ancho="18ch" />
            </td>
            <td className={listado.dato}>
              <Forma ancho="1ch" />
            </td>
            <td className={listado.secundario}>
              <Forma ancho="10ch" />
            </td>
          </tr>
        ))}
      </Tabla>
    </div>
  )
}
