import { useState, type ReactNode } from 'react'
import { useComparacionDuplicado, usePosiblesDuplicados, useResolverDuplicado } from '../../api/consultas'
import type { Coincidencia, ComparacionDuplicado, DocumentoComparado } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { Estado } from '../../componentes/base/Estado'
import { TEXTO_CANAL, TEXTO_ESTADO } from '../../componentes/base/textos'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { EstadoConsulta } from '../../componentes/compuestos/EstadoConsulta'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import { Icono } from '../../iconos/Icono'
import { fecha, fechaHora } from '../formato'
import listado from '../listado.module.css'
import estilos from './Duplicados.module.css'

const FALTA = { numero: 'Sin número de oficio', fecha: 'Sin fecha del documento' }

/** V-14 Posibles duplicados (O-26): oficialía compara el marcado con su candidato y decide. */
export function Duplicados() {
  const posibles = usePosiblesDuplicados(true)
  const [elegido, setElegido] = useState<string>()
  const lista = posibles.data?.elementos ?? []
  const actual = lista.find((d) => d.id === elegido) ?? lista[0]

  return (
    <div className={listado.pagina}>
      <EncabezadoPagina
        titulo="Posibles duplicados"
        descripcion="Documentos marcados al registrar porque no traen número o fecha del documento. Compáralos y decide si son el mismo."
      />
      <div className={estilos.cuerpo}>
        <Tarjeta material="vidrio" className={estilos.lista} aria-labelledby="titulo-por-revisar" aria-busy={posibles.isPending || undefined}>
          <h2 id="titulo-por-revisar" className={listado.titulo}>
            Por revisar · {posibles.data ? posibles.data.total : <Forma ancho="1ch" />}
          </h2>
          <EstadoConsulta
            consulta={posibles}
            que="los posibles duplicados"
            esqueleto={<Forma ancho="90%" />}
            vacio={(d) => (d.total === 0 ? 'No hay documentos por revisar.' : null)}
          >
            {({ elementos }) => (
              <ul className={estilos.marcados}>
                {elementos.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className={estilos.marcado}
                      aria-pressed={d === actual}
                      onClick={() => setElegido(d.id)}
                    >
                      <span className={listado.folio}>{d.folio}</span>
                      <span className={estilos.asunto}>{d.asunto}</span>
                      <Estado estado="posible_duplicado" />
                      <span className={listado.pie}>{FALTA[d.falta]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </EstadoConsulta>
        </Tarjeta>
        {actual && <Comparar key={actual.id} id={actual.id} alResolver={() => setElegido(undefined)} />}
      </div>
    </div>
  )
}

function Comparar({ id, alResolver }: { id: string; alResolver: () => void }) {
  // Mientras se resuelve, la comparación no se vuelve a leer: el servidor ya no la daría (ESTADO_INVALIDO)
  // y se vería un error un instante antes de que la lista pase al siguiente.
  const [resolviendo, setResolviendo] = useState(false)
  const comparacion = useComparacionDuplicado(id, !resolviendo)
  return (
    <Tarjeta material="vidrio" className={estilos.comparar} aria-labelledby="titulo-comparar" aria-busy={comparacion.isPending || undefined}>
      <div className={listado.cabecera}>
        <h2 id="titulo-comparar" className={listado.titulo}>
          Comparar con el candidato
        </h2>
        <p className={listado.origen}>PostgreSQL</p>
      </div>
      <EstadoConsulta consulta={comparacion} que="la comparación" esqueleto={<Forma ancho="80%" />}>
        {(c) => <Decision comparacion={c} alResolver={alResolver} alEnviar={setResolviendo} />}
      </EstadoConsulta>
    </Tarjeta>
  )
}

interface PropsDecision {
  comparacion: ComparacionDuplicado
  alResolver: () => void
  /** Avisa que la decisión está en curso (true) o falló (false). */
  alEnviar: (resolviendo: boolean) => void
}

function Decision({ comparacion: c, alResolver, alEnviar }: PropsDecision) {
  const resolver = useResolverDuplicado()
  const [decision, setDecision] = useState<'mismo' | 'distintos'>()
  const enviar = (d: 'mismo' | 'distintos') => {
    setDecision(d)
    alEnviar(true)
    resolver.mutate(
      { id_posterior: c.posterior.id, id_otro: c.candidato?.id ?? null, decision: d },
      { onSuccess: alResolver, onError: () => alEnviar(false) },
    )
  }
  return (
    <div className={estilos.decision}>
      <div className={estilos.lados}>
        {c.candidato ? (
          <Lado titulo="Registrado primero" doc={c.candidato} coincidencias={c.coincidencias} />
        ) : (
          <div className={`${estilos.lado} ${estilos.sinCandidato}`}>
            <p className={listado.etiquetaPanel}>Registrado primero</p>
            <p className={listado.secundario}>No hay un documento anterior del mismo emisor con la misma fecha o número.</p>
          </div>
        )}
        <Lado titulo="Marcado · posterior" doc={c.posterior} coincidencias={c.coincidencias} marcado />
      </div>
      <Aviso tono="info" icono="alerta">
        {c.candidato
          ? `${resumen(c.coincidencias)} Si son el mismo, el marcado se cancela como duplicado del primero y sus movimientos se conservan en la bitácora. Si son distintos, solo se retira la marca.`
          : 'Sin candidato, solo puedes retirar la marca si es un documento distinto.'}
      </Aviso>
      <ErrorOperacion error={resolver.error} que="resolver el posible duplicado" />
      <div className={listado.acciones}>
        <Boton
          variante="secundario"
          icono="cerrar"
          pendiente={resolver.isPending && decision === 'distintos'}
          disabled={resolver.isPending}
          onClick={() => enviar('distintos')}
        >
          Son distintos
        </Boton>
        {c.candidato && (
          <Boton icono="check" pendiente={resolver.isPending && decision === 'mismo'} disabled={resolver.isPending} onClick={() => enviar('mismo')}>
            Son el mismo: cancelar {c.posterior.folio}
          </Boton>
        )}
      </div>
    </div>
  )
}

const NOMBRE: Record<Coincidencia, string> = { numero_emisor: 'número', emisor: 'emisor', fecha_documento: 'fecha', sintesis: 'síntesis' }

function resumen(coincidencias: Coincidencia[]) {
  const nombres = coincidencias.map((x) => NOMBRE[x])
  if (nombres.length === 0) return ''
  const lista = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
  return `Coinciden ${lista}.`
}

function Lado({ titulo, doc, coincidencias, marcado }: { titulo: string; doc: DocumentoComparado; coincidencias: Coincidencia[]; marcado?: boolean }) {
  const dato = (clave: Coincidencia | null, etiqueta: string, valor: ReactNode, mono?: boolean) => {
    const coincide = clave !== null && coincidencias.includes(clave)
    return (
      <div className={`${estilos.dato} ${coincide ? estilos.coincide : ''}`}>
        <dt>
          {etiqueta}
          {coincide && (
            <>
              <Icono nombre="check" tamano={12} />
              <span className="solo-lector"> (coincide)</span>
            </>
          )}
        </dt>
        <dd className={mono ? listado.dato : undefined}>{valor}</dd>
      </div>
    )
  }
  return (
    <section className={`${estilos.lado} ${marcado ? estilos.marcadoLado : ''}`} aria-label={titulo}>
      <p className={`${listado.etiquetaPanel} ${marcado ? estilos.etiquetaMarca : ''}`}>{titulo}</p>
      <dl>
        {dato(null, 'Folio', <span className={listado.folio}>{doc.folio}</span>)}
        {dato('numero_emisor', 'Número del emisor', doc.numero_emisor ?? '— (no trae)', true)}
        {dato('emisor', 'Emisor', doc.emisor)}
        {dato('fecha_documento', 'Fecha del documento', doc.fecha_documento ? fecha(doc.fecha_documento) : '— (no trae)')}
        {dato(null, 'Recepción', `${TEXTO_CANAL[doc.canal]} · ${fechaHora(doc.fecha_recepcion)}`)}
        {dato('sintesis', 'Síntesis', doc.sintesis)}
        {dato(null, 'Estado y ubicación', `${TEXTO_ESTADO[doc.estado]}${doc.ubicacion ? ` · ${doc.ubicacion}, responsable` : ''}`)}
      </dl>
    </section>
  )
}
