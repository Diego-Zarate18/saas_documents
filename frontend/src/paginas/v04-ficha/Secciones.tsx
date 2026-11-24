// Columna izquierda de la ficha: Registro (PostgreSQL) y Expediente (MongoDB).
import type { CSSProperties, ReactNode } from 'react'
import { useCatalogos } from '../../api/consultas'
import type { Ficha } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { TEXTO_CANAL } from '../../componentes/base/textos'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import { Icono, type NombreIcono } from '../../iconos/Icono'
import { diaHora, fecha, fechaHora } from '../formato'
import estilos from './Ficha.module.css'

export const OCULTO = 'Contenido confidencial: solo lo ven el titular del área y quien tiene movimiento en el documento.'

export function Cabecera({ id, titulo, origen }: { id: string; titulo: string; origen: string }) {
  return (
    <div className={estilos.cabecera}>
      <h2 id={id}>{titulo}</h2>
      <span className={estilos.origen}>{origen}</span>
    </div>
  )
}

function Dato({ etiqueta, children, folio, ancho }: { etiqueta: string; children: ReactNode; folio?: boolean; ancho?: boolean }) {
  return (
    <div className={[estilos.dato, ancho && estilos.ancho].filter(Boolean).join(' ')}>
      <dt>{etiqueta}</dt>
      <dd className={folio ? estilos.folio : undefined}>{children}</dd>
    </div>
  )
}

export function Registro({ ficha }: { ficha: Ficha }) {
  const r = ficha.registro
  return (
    <Tarjeta material="relieve" className={estilos.seccion} aria-labelledby="titulo-registro">
      <Cabecera id="titulo-registro" titulo="Registro" origen="POSTGRESQL" />
      <dl className={estilos.datos}>
        <Dato etiqueta="Folio de recepción" folio>
          {r.folio}
        </Dato>
        <Dato etiqueta="Número del emisor" folio>
          {r.numero_emisor ?? '—'}
        </Dato>
        <Dato etiqueta="Emisor">
          {r.emisor ? `${r.emisor} · ${r.tipo_emisor === 'area' ? 'área interna' : 'externo'}` : '—'}
        </Dato>
        <Dato etiqueta="Fecha del documento">{r.fecha_documento ? fecha(r.fecha_documento) : '—'}</Dato>
        <Dato etiqueta="Recepción">
          {r.canal && r.fecha_recepcion ? `${TEXTO_CANAL[r.canal]} · ${fechaHora(r.fecha_recepcion)}` : '—'}
          {r.segunda_recepcion && (
            <>
              <br />
              {TEXTO_CANAL[r.segunda_recepcion.canal]} · {fechaHora(r.segunda_recepcion.fecha_recepcion)}
            </>
          )}
        </Dato>
        <Dato etiqueta="Fecha oficial">
          {r.fecha_oficial ? `${fecha(r.fecha_oficial)} (${r.origen_fecha_oficial})` : '—'}
        </Dato>
        {ficha.acceso === 'completo' && (
          <Dato etiqueta="Síntesis" ancho>
            {r.sintesis ?? OCULTO}
          </Dato>
        )}
      </dl>
    </Tarjeta>
  )
}

function Subseccion({ icono, titulo, agregar }: { icono: NombreIcono; titulo: string; agregar?: () => void }) {
  return (
    <div className={estilos.subseccion}>
      <Icono nombre={icono} tamano={16} />
      <h3>{titulo}</h3>
      {agregar && (
        <Boton variante="fantasma" icono="mas" onClick={agregar} aria-label={`Agregar a ${titulo.split(' ·')[0]}`}>
          Agregar
        </Boton>
      )}
    </div>
  )
}

interface PropsExpediente {
  ficha: Ficha
  agregarAnexo?: () => void
  agregarNota?: () => void
}

export function Expediente({ ficha, agregarAnexo, agregarNota }: PropsExpediente) {
  const e = ficha.expediente
  // D-66: el bloque «Datos del tipo» sale de la tabla de campos del catálogo; los tipos sin campos no lo tienen.
  const campos = useCatalogos().data?.campos_tipo[ficha.registro.tipo] ?? []
  return (
    <Tarjeta material="solida" className={estilos.seccion} aria-labelledby="titulo-expediente">
      <Cabecera id="titulo-expediente" titulo="Expediente" origen="MONGODB" />
      {!e ? (
        <p className={estilos.vacio}>{ficha.contenido_oculto ? OCULTO : 'Solo ves el estado y el responsable de los documentos de otras áreas.'}</p>
      ) : (
        <>
          {campos.length > 0 && (
            <section aria-labelledby="titulo-datos-tipo" className={estilos.elementos}>
              <h3 id="titulo-datos-tipo" className="solo-lector">
                Datos del tipo
              </h3>
              <dl className={estilos.datos} style={{ '--columnas': 2 } as CSSProperties}>
                {campos.map((c) => {
                  const valor = e.datos_tipo[c.clave]
                  return (
                    <Dato key={c.clave} etiqueta={c.etiqueta} ancho={c.forma === 'lista'}>
                      {Array.isArray(valor) ? (
                        <ol className={estilos.puntos}>
                          {valor.map((v) => (
                            <li key={v}>{v}</li>
                          ))}
                        </ol>
                      ) : (
                        (valor ?? '—')
                      )}
                    </Dato>
                  )
                })}
              </dl>
            </section>
          )}
          <Subseccion icono="anexo" titulo={`Anexos · ${e.anexos.length}`} agregar={agregarAnexo} />
          {e.anexos.length === 0 && <p className={estilos.vacio}>Sin anexos.</p>}
          {e.anexos.map((a) => (
            <p key={a.id} className={estilos.anexo}>
              <span>{a.titulo}</span>
              <span className={estilos.secundario}>
                {a.hojas} {a.hojas === 1 ? 'hoja' : 'hojas'} · {a.ubicacion}
              </span>
            </p>
          ))}
          <Subseccion icono="nota" titulo={`Notas · ${e.notas.length}`} agregar={agregarNota} />
          {e.notas.length === 0 && <p className={estilos.vacio}>Sin notas.</p>}
          {e.notas.map((n) => (
            <p key={n.id} className={estilos.nota}>
              <span>
                {n.area} · {n.autor} · {diaHora(n.fecha_hora)}
              </span>
              <span>{n.texto}</span>
            </p>
          ))}
        </>
      )}
    </Tarjeta>
  )
}
