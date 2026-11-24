import { useState } from 'react'
import { useAreas, useCatalogos, useQuitarRelacion, useRelacionar } from '../../api/consultas'
import type { DocumentoEncontrado, Ficha, TipoRelacion } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { Campo } from '../../componentes/base/Campo'
import { CampoSelector } from '../../componentes/compuestos/Selector'
import { DESCRIPCION_RELACION, TEXTO_ESTADO, TEXTO_RELACION } from '../../componentes/base/textos'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { BuscadorDocumento } from '../../componentes/compuestos/BuscadorDocumento'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { GrupoOpciones } from '../../componentes/compuestos/GrupoOpciones'
import { Modal } from '../../componentes/compuestos/Modal'
import { OpcionRadio } from '../../componentes/compuestos/OpcionRadio'
import { Segmentado } from '../../componentes/compuestos/Segmentado'
import estilos from './Relacionar.module.css'

type Destino = 'registrado' | 'no_registrado'

interface Props {
  ficha: Ficha
  abierto: boolean
  alCambiar: (abierto: boolean) => void
}

/** V-10 Relacionar documentos (O-07) y quitar una relación capturada por error (O-18). */
export function Relacionar({ ficha, abierto, alCambiar }: Props) {
  const [tipo, setTipo] = useState<TipoRelacion>()
  const [destino, setDestino] = useState<Destino>('registrado')
  const [documento, setDocumento] = useState<DocumentoEncontrado | null>(null)
  const [numero, setNumero] = useState('')
  const [emisor, setEmisor] = useState('')
  const relacionar = useRelacionar(ficha.registro.id)
  const quitar = useQuitarRelacion(ficha.registro.id)
  const areas = useAreas()
  const catalogos = useCatalogos()
  const emisores = [
    ...new Set([...(areas.data?.elementos ?? []).map((a) => a.nombre), ...(catalogos.data?.actores_externos ?? []).map((a) => a.nombre)]),
  ].sort((a, b) => a.localeCompare(b))
  const noRegistrado = destino === 'no_registrado'
  const listo = tipo !== undefined && (noRegistrado ? numero.trim() !== '' && emisor.trim() !== '' : documento !== null)

  function cerrar(abrir: boolean) {
    if (!abrir) {
      setTipo(undefined)
      setDestino('registrado')
      setDocumento(null)
      setNumero('')
      setEmisor('')
      relacionar.reset()
      quitar.reset()
    }
    alCambiar(abrir)
  }

  function elegirDestino(d: Destino) {
    setDestino(d)
    // «Sustituye a» solo entre registrados (D-14).
    if (d === 'no_registrado' && tipo === 'sustituye_a') setTipo(undefined)
  }

  function enviar() {
    if (!tipo) return
    relacionar.mutate(
      { tipo, destino: noRegistrado ? { numero, emisor } : { id_documento: documento?.id ?? '' } },
      { onSuccess: () => cerrar(false) },
    )
  }

  const relaciones = ficha.relaciones ?? []

  return (
    <Modal
      abierto={abierto}
      alCambiar={cerrar}
      folio={ficha.registro.folio}
      titulo="Relacionar documentos"
      descripcion="La relación sale de este documento hacia otro y se guarda en el grafo. Sirve para seguir el hilo de un asunto."
      ancho={660}
      pie={
        <>
          {relaciones.length > 0 && <p className={estilos.notaPie}>Quitar corrige solo capturas por error.</p>}
          <Boton variante="fantasma" onClick={() => cerrar(false)}>
            Cancelar
          </Boton>
          <Boton icono="enlace" disabled={!listo} pendiente={relacionar.isPending} onClick={enviar}>
            Relacionar
          </Boton>
        </>
      }
    >
      <GrupoOpciones leyenda="Tipo de relación" columnas={2}>
        {(catalogos.data?.tipos_relacion ?? []).map((t) => (
          <OpcionRadio
            key={t}
            name="tipo-relacion"
            texto={TEXTO_RELACION[t]}
            codigo={t.toUpperCase()}
            descripcion={DESCRIPCION_RELACION[t]}
            checked={tipo === t}
            disabled={t === 'sustituye_a' && noRegistrado}
            onChange={() => setTipo(t)}
          />
        ))}
      </GrupoOpciones>
      <div className={estilos.seccion}>
        <p className={estilos.leyenda} aria-hidden="true">
          Documento destino
        </p>
        <Segmentado
          ancho
          etiqueta="Documento destino"
          valor={destino}
          alCambiar={elegirDestino}
          opciones={[
            { valor: 'registrado', texto: 'Registrado en SIGEDOC' },
            { valor: 'no_registrado', texto: 'No registrado' },
          ]}
        />
        {noRegistrado ? (
          <div className={estilos.columnas}>
            <Campo blanco etiqueta="Número del documento" value={numero} onChange={(e) => setNumero(e.target.value)} />
            {/* El Figma dibuja un selector: áreas internas y actores externos activos del catálogo (RI-06). */}
            <CampoSelector
              blanco
              etiqueta="Emisor"
              marcador="Elige el emisor"
              valor={emisor}
              cargando={areas.isPending || catalogos.isPending}
              opciones={emisores.map((e) => ({ valor: e, texto: e }))}
              alCambiar={setEmisor}
            />
          </div>
        ) : (
          <BuscadorDocumento etiqueta="Documento" elegido={documento} alElegir={setDocumento} excluir={ficha.registro.id} />
        )}
      </div>
      {noRegistrado && (
        <Aviso tono="info" icono="enlace">
          Se crea o reutiliza un documento no registrado con el mismo número y emisor. Si después se registra, se liga a mano.
          «Sustituye a» no está disponible: cambia el estado del otro documento.
        </Aviso>
      )}
      {tipo === 'sustituye_a' && (
        <Aviso tono="error" rol="status">
          «Sustituye a» deja al otro documento sin efecto.
        </Aviso>
      )}
      {relaciones.length > 0 && (
        <div className={estilos.seccion}>
          <h3 className={estilos.leyenda}>Relaciones actuales</h3>
          <ul className={estilos.actuales}>
            {relaciones.map((r) => (
              <li key={`${r.tipo} ${r.referencia} ${r.descripcion}`} className={estilos.actual}>
                <div className={estilos.textos}>
                  <p className={estilos.tipo}>
                    {TEXTO_RELACION[r.tipo]} <span className={estilos.referencia}>{r.referencia}</span>
                  </p>
                  {r.id_documento ? (
                    <p className={estilos.descripcion}>
                      {r.descripcion}
                      {r.estado && ` · ${TEXTO_ESTADO[r.estado]}`}
                    </p>
                  ) : (
                    <p className={estilos.noRegistrado}>No registrado: citado en el oficio</p>
                  )}
                </div>
                <Boton
                  variante="fantasma"
                  icono="cerrar"
                  aria-label={`Quitar ${TEXTO_RELACION[r.tipo].toLowerCase()} ${r.referencia}`}
                  pendiente={quitar.isPending && quitar.variables.referencia === r.referencia}
                  disabled={quitar.isPending}
                  onClick={() => quitar.mutate({ tipo: r.tipo, referencia: r.referencia, emisor: r.id_documento ? null : r.descripcion })}
                >
                  Quitar
                </Boton>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ErrorOperacion error={catalogos.error} que="cargar las opciones del catálogo" />
      <ErrorOperacion error={relacionar.error ?? quitar.error} que="guardar la relación" />
    </Modal>
  )
}
