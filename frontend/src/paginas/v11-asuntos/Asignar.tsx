import { useState } from 'react'
import { useAsignarAsunto, useAsuntos, useCrearAsunto } from '../../api/consultas'
import type { AsuntoResumen, DocumentoEncontrado, Uuid } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { AreaTexto, Campo } from '../../componentes/base/Campo'
import { BuscadorDocumento } from '../../componentes/compuestos/BuscadorDocumento'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { Modal } from '../../componentes/compuestos/Modal'
import { Icono } from '../../iconos/Icono'
import estilos from './Asuntos.module.css'

interface Props {
  abierto: boolean
  alCambiar: (abierto: boolean) => void
}

interface PropsAsunto extends Props {
  idDocumento: Uuid
  folio: string
  /** Asuntos a los que ya pertenece: se muestran deshabilitados con «Ya pertenece». */
  asuntos: AsuntoResumen[]
}

/**
 * V-11b Asignar a un asunto (O-08) desde la ficha, con «Crea un asunto nuevo» (O-27): el documento queda
 * asignado al crearlo. Un documento puede estar en varios asuntos (D-30).
 */
export function AsignarAsunto({ idDocumento, folio, asuntos, abierto, alCambiar }: PropsAsunto) {
  const [texto, setTexto] = useState('')
  const [elegido, setElegido] = useState<Uuid>()
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tocado, setTocado] = useState({ nombre: false, descripcion: false })
  const lista = useAsuntos(texto.trim())
  const asignar = useAsignarAsunto(idDocumento)
  const crear = useCrearAsunto(idDocumento)
  const operacion = creando ? crear : asignar
  const nombreElegido = lista.data?.elementos.find((a) => a.id === elegido)?.nombre
  const valido = creando ? nombre.trim() !== '' && descripcion.trim() !== '' : elegido !== undefined

  function cerrar(abrir: boolean) {
    if (!abrir) {
      setTexto('')
      setElegido(undefined)
      setCreando(false)
      setNombre('')
      setDescripcion('')
      setTocado({ nombre: false, descripcion: false })
      asignar.reset()
      crear.reset()
    }
    alCambiar(abrir)
  }

  function enviar() {
    if (creando) crear.mutate({ nombre, descripcion }, { onSuccess: () => cerrar(false) })
    else if (elegido) asignar.mutate(elegido, { onSuccess: () => cerrar(false) })
  }

  return (
    <Modal
      abierto={abierto}
      alCambiar={cerrar}
      folio={folio}
      titulo="Asignar a un asunto"
      descripcion="Agrupa documentos que forman parte del mismo tema. Un documento puede estar en varios asuntos."
      ancho={600}
      pie={
        <>
          <Boton variante="fantasma" onClick={() => cerrar(false)}>
            Cancelar
          </Boton>
          <Boton icono="asunto" disabled={!valido} pendiente={operacion.isPending} onClick={enviar}>
            {creando ? 'Crear y asignar' : nombreElegido ? `Asignar a «${nombreElegido}»` : 'Asignar'}
          </Boton>
        </>
      }
    >
      {!creando && (
        <>
          <div className={estilos.buscarAsunto}>
            <Campo
              blanco
              etiqueta="Buscar asunto por nombre"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value)
                // Una búsqueda nueva puede ocultar el elegido: no se asigna a un asunto que ya no se ve.
                setElegido(undefined)
              }}
            />
            <Icono nombre="buscar" tamano={16} className={estilos.lupa} />
          </div>
          <fieldset className={estilos.asuntos} aria-busy={lista.isPending || undefined}>
            <legend className={estilos.leyenda}>Asuntos</legend>
            {lista.isPending && <Forma ancho="80%" />}
            {lista.data?.elementos.length === 0 && <p className={estilos.vacio}>Ningún asunto coincide.</p>}
            {lista.data?.elementos.map((a) => {
              const pertenece = asuntos.some((x) => x.id === a.id)
              return (
                <label key={a.id} className={estilos.opcionAsunto} data-pertenece={pertenece || undefined}>
                  <input
                    type="radio"
                    name="asunto"
                    aria-label={a.nombre}
                    aria-describedby={`meta-${a.id}`}
                    className={estilos.circulo}
                    checked={elegido === a.id}
                    disabled={pertenece}
                    onChange={() => setElegido(a.id)}
                  />
                  <span className={estilos.textosAsunto}>
                    <span className={estilos.nombreAsunto}>{a.nombre}</span>
                    <span id={`meta-${a.id}`} className={estilos.metaAsunto}>
                      {a.documentos} {a.documentos === 1 ? 'documento' : 'documentos'}
                      {a.areas.length > 0 && ` · ${a.areas.join(', ')}`}
                    </span>
                  </span>
                  {pertenece && <span className={estilos.yaPertenece}>Ya pertenece</span>}
                </label>
              )
            })}
          </fieldset>
        </>
      )}
      {creando ? (
        // Diseño propio: el Figma dibuja solo el enlace «Crea un asunto nuevo», no el formulario.
        <div className={estilos.nuevo}>
          <Campo
            blanco
            etiqueta="Nombre del asunto"
            value={nombre}
            error={tocado.nombre && !nombre.trim() ? 'Escribe el nombre del asunto.' : undefined}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => setTocado((t) => ({ ...t, nombre: true }))}
          />
          <AreaTexto
            blanco
            etiqueta="Descripción"
            value={descripcion}
            error={tocado.descripcion && !descripcion.trim() ? 'Escribe la descripción del asunto.' : undefined}
            onChange={(e) => setDescripcion(e.target.value)}
            onBlur={() => setTocado((t) => ({ ...t, descripcion: true }))}
          />
          <Boton variante="fantasma" icono="flecha" onClick={() => setCreando(false)}>
            Elegir un asunto existente
          </Boton>
        </div>
      ) : (
        <button type="button" className={estilos.crear} onClick={() => setCreando(true)}>
          <span className={estilos.crearTitulo}>
            <Icono nombre="mas" tamano={16} />
            ¿No existe? Crea un asunto nuevo
          </span>
          <span className={estilos.metaAsunto}>Nombre y descripción; el documento queda asignado al crearlo.</span>
        </button>
      )}
      <ErrorOperacion error={operacion.error} que={creando ? 'crear el asunto' : 'asignar el documento'} />
    </Modal>
  )
}

interface PropsDocumento extends Props {
  idAsunto: Uuid
  nombre: string
}

/** Diseño propio: «Asignar documento» desde V-11 elige el documento y lo asigna a este asunto (O-08). */
export function AsignarDocumento({ idAsunto, nombre, abierto, alCambiar }: PropsDocumento) {
  const [documento, setDocumento] = useState<DocumentoEncontrado | null>(null)
  const asignar = useAsignarAsunto(documento?.id ?? '')

  function cerrar(abrir: boolean) {
    if (!abrir) {
      setDocumento(null)
      asignar.reset()
    }
    alCambiar(abrir)
  }

  return (
    <Modal
      abierto={abierto}
      alCambiar={cerrar}
      titulo="Asignar documento"
      descripcion={`El documento pasa a pertenecer a «${nombre}». Puede estar también en otros asuntos.`}
      ancho={600}
      pie={
        <>
          <Boton variante="fantasma" onClick={() => cerrar(false)}>
            Cancelar
          </Boton>
          <Boton
            icono="asunto"
            disabled={!documento}
            pendiente={asignar.isPending}
            onClick={() => asignar.mutate(idAsunto, { onSuccess: () => cerrar(false) })}
          >
            Asignar documento
          </Boton>
        </>
      }
    >
      <BuscadorDocumento
        etiqueta="Documento"
        ayuda="Solo documentos registrados cuyo contenido ves."
        elegido={documento}
        alElegir={(d) => {
          setDocumento(d)
          asignar.reset()
        }}
        soloDocumentos
      />
      <ErrorOperacion error={asignar.error} que="asignar el documento" />
    </Modal>
  )
}
