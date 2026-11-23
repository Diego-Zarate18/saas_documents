import { useId, useState, type KeyboardEvent } from 'react'
import { useBuscarDocumentos } from '../../api/consultas'
import type { DocumentoEncontrado, Uuid } from '../../api/tipos'
import { Icono } from '../../iconos/Icono'
import { fecha } from '../../paginas/formato'
import estilos from './BuscadorDocumento.module.css'

interface Props {
  etiqueta: string
  ayuda?: string
  error?: string
  elegido: DocumentoEncontrado | null
  alElegir: (documento: DocumentoEncontrado | null) => void
  /** Documento que no se puede elegir (el propio). */
  excluir?: Uuid
}

/**
 * Combobox para elegir un documento registrado o una salida por folio o asunto (V-09, V-10, V-13b).
 * Patrón ARIA de combobox con lista: flechas, Intro elige y Esc cierra la lista sin cerrar el modal.
 */
export function BuscadorDocumento({ etiqueta, ayuda, error, elegido, alElegir, excluir }: Props) {
  const id = useId()
  const [texto, setTexto] = useState('')
  const [abierta, setAbierta] = useState(false)
  const [activo, setActivo] = useState(0)
  const busqueda = useBuscarDocumentos(elegido ? '' : texto)
  const resultados = (busqueda.data?.elementos ?? []).filter((d) => d.id !== excluir)
  const mostrar = abierta && !elegido && texto.trim() !== ''
  const nota = error ?? ayuda

  function elegir(d: DocumentoEncontrado) {
    alElegir(d)
    setTexto('')
    setAbierta(false)
  }

  function teclado(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setAbierta(true)
      const paso = e.key === 'ArrowDown' ? 1 : -1
      setActivo((a) => (resultados.length ? (a + paso + resultados.length) % resultados.length : 0))
    } else if (e.key === 'Enter' && mostrar && resultados[activo]) {
      e.preventDefault()
      elegir(resultados[activo])
    } else if (e.key === 'Escape' && mostrar) {
      // Cierra la lista; el modal no se cierra (Modal ve aria-expanded) y el siguiente Esc ya lo cierra.
      e.preventDefault()
      setAbierta(false)
    } else if (e.key === 'Backspace' && elegido) {
      alElegir(null)
    }
  }

  return (
    <div className={estilos.campo}>
      <label id={`${id}-etiqueta`} htmlFor={id} className={estilos.etiqueta}>
        {etiqueta}
      </label>
      <div className={estilos.caja} data-invalido={error ? true : undefined}>
        {elegido && (
          <span className={estilos.elegido} aria-hidden="true">
            <span className={estilos.folio}>{elegido.folio}</span>
            <span className={estilos.asunto}>
              {elegido.asunto} · {fecha(elegido.fecha.slice(0, 10))}
            </span>
          </span>
        )}
        <input
          id={id}
          role="combobox"
          aria-labelledby={`${id}-etiqueta`}
          aria-autocomplete="list"
          aria-expanded={mostrar}
          aria-controls={`${id}-lista`}
          aria-activedescendant={mostrar && resultados[activo] ? `${id}-${activo}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={nota ? `${id}-nota` : undefined}
          autoComplete="off"
          placeholder={elegido ? undefined : 'Busca por folio o asunto'}
          // Elegido, el valor accesible es el documento; las teclas lo borran para buscar otro.
          value={elegido ? `${elegido.folio} ${elegido.asunto}` : texto}
          className={elegido ? estilos.oculto : undefined}
          onChange={(e) => {
            // Con un documento elegido, lo que se escribe empieza una búsqueda nueva: se conserva solo lo tecleado.
            if (elegido) alElegir(null)
            setTexto(elegido ? e.target.value.replace(`${elegido.folio} ${elegido.asunto}`, '') : e.target.value)
            setAbierta(true)
            setActivo(0)
          }}
          onKeyDown={teclado}
          onBlur={() => setAbierta(false)}
        />
        <Icono nombre="buscar" tamano={16} className={estilos.lupa} />
      </div>
      {/* Patrón ARIA de combobox: datalist no puede mostrar el folio en mono junto al asunto. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/prefer-tag-over-role */}
      <ul id={`${id}-lista`} role="listbox" aria-label={etiqueta} className={estilos.lista} hidden={!mostrar}>
        {mostrar && busqueda.isFetching && resultados.length === 0 && <li className={estilos.vacio}>Buscando…</li>}
        {mostrar && !busqueda.isFetching && resultados.length === 0 && <li className={estilos.vacio}>Sin resultados.</li>}
        {resultados.map((d, i) => (
          <li
            key={d.id}
            id={`${id}-${i}`}
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/prefer-tag-over-role
            role="option"
            aria-selected={i === activo}
            className={estilos.opcion}
            // mousedown en lugar de click: el input no pierde el foco antes de elegir.
            onMouseDown={(e) => {
              e.preventDefault()
              elegir(d)
            }}
          >
            <span className={estilos.folio}>{d.folio}</span>
            <span className={estilos.asunto}>{d.asunto}</span>
          </li>
        ))}
      </ul>
      {nota && (
        <p id={`${id}-nota`} className={error ? estilos.error : estilos.ayuda}>
          {nota}
        </p>
      )}
    </div>
  )
}
