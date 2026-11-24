import { useState } from 'react'
import { useActores, useCatalogos, useDesactivarActor, useGuardarActor } from '../../api/consultas'
import type { ActorExterno, TipoActor } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { Campo } from '../../componentes/base/Campo'
import { TEXTO_TIPO_ACTOR } from '../../componentes/base/textos'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { CampoBusqueda } from '../../componentes/compuestos/CampoBusqueda'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { EstadoConsulta } from '../../componentes/compuestos/EstadoConsulta'
import { Segmentado } from '../../componentes/compuestos/Segmentado'
import { Tabla } from '../../componentes/compuestos/Tabla'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import listado from '../listado.module.css'

const NUEVO = 'nuevo'

const COLUMNAS = [
  { titulo: 'Nombre' },
  { titulo: 'Tipo', ancho: 100 },
  { titulo: 'Contacto', ancho: 160 },
  { titulo: 'Docs.', ancho: 40 },
  { titulo: 'Estado', ancho: 70 },
]

/** V-19 Actores externos (O-35): emisores de entradas y destinatarios de salidas (RI-06). Oficialía y administración. */
export function Actores() {
  const actores = useActores()
  const [texto, setTexto] = useState('')
  const [elegido, setElegido] = useState<string>()
  const todos = actores.data?.elementos ?? []
  const buscado = texto.trim().toLowerCase()
  const visibles = todos.filter((a) => !buscado || a.nombre.toLowerCase().includes(buscado))
  const actual = elegido === NUEVO ? undefined : (todos.find((a) => a.id === elegido) ?? visibles[0])

  return (
    <div className={listado.pagina}>
      <EncabezadoPagina
        titulo="Actores externos"
        descripcion="Instituciones, municipios, proveedores y ciudadanos que envían o reciben documentos."
        acciones={
          <>
            <CampoBusqueda etiqueta="Buscar actor" valor={texto} alCambiar={setTexto} />
            <Boton icono="mas" onClick={() => setElegido(NUEVO)}>
              Nuevo actor
            </Boton>
          </>
        }
      />
      <div className={listado.cuerpo}>
        <Tarjeta material="vidrio" className={listado.tarjeta} aria-labelledby="titulo-actores" aria-busy={actores.isPending || undefined}>
          <div className={listado.cabecera}>
            <h2 id="titulo-actores" className={listado.titulo}>
              {actores.data ? `${todos.length} ${todos.length === 1 ? 'actor' : 'actores'}` : <Forma ancho="10ch" />}
            </h2>
            <p className={listado.origen}>PostgreSQL</p>
          </div>
          <EstadoConsulta
            consulta={actores}
            que="los actores externos"
            esqueleto={<Forma ancho="80%" />}
            vacio={() => (visibles.length === 0 ? 'Ningún actor coincide.' : null)}
          >
            {() => (
              <Tabla titulo="Actores externos" columnas={COLUMNAS}>
                {visibles.map((a) => (
                  <tr key={a.id} className={[a === actual && listado.elegida, !a.activo && listado.inactiva].filter(Boolean).join(' ') || undefined}>
                    <td>
                      <button type="button" className={`${listado.elegir} ${listado.texto}`} aria-pressed={a === actual} onClick={() => setElegido(a.id)}>
                        {a.nombre}
                      </button>
                    </td>
                    <td>
                      <span className={listado.pildora}>{TEXTO_TIPO_ACTOR[a.tipo]}</span>
                    </td>
                    <td className={listado.secundario}>{a.correo ?? a.telefono ?? '—'}</td>
                    <td className={listado.dato}>{a.documentos}</td>
                    <td>
                      <span className={`${listado.pildora} ${a.activo ? listado.activo : ''}`}>{a.activo ? 'Activo' : 'Inactivo'}</span>
                    </td>
                  </tr>
                ))}
              </Tabla>
            )}
          </EstadoConsulta>
        </Tarjeta>
        {actores.data && (elegido === NUEVO || actual) && (
          <Formulario key={actual?.id ?? NUEVO} actor={actual} alGuardar={setElegido} alCancelar={() => setElegido(undefined)} />
        )}
      </div>
    </div>
  )
}

interface PropsFormulario {
  actor: ActorExterno | undefined
  alGuardar: (id: string) => void
  alCancelar: () => void
}

function Formulario({ actor, alGuardar, alCancelar }: PropsFormulario) {
  const [nombre, setNombre] = useState(actor?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoActor>(actor?.tipo ?? 'institucion')
  const [correo, setCorreo] = useState(actor?.correo ?? '')
  const [telefono, setTelefono] = useState(actor?.telefono ?? '')
  const [tocado, setTocado] = useState(false)
  const guardar = useGuardarActor()
  const desactivar = useDesactivarActor()
  const catalogos = useCatalogos()
  const tipos = catalogos.data?.tipos_actor ?? []

  function enviar() {
    guardar.mutate({ id: actor?.id ?? null, nombre, tipo, correo, telefono }, { onSuccess: (a) => alGuardar(a.id) })
  }

  return (
    <Tarjeta material="vidrio" className={listado.panel} aria-labelledby="titulo-formulario-actor">
      <div>
        <p className={listado.etiquetaPanel}>{actor ? 'Editar actor' : 'Nuevo actor'}</p>
        <h2 id="titulo-formulario-actor" className={listado.tituloPanel}>
          {actor?.nombre ?? (nombre.trim() || 'Actor nuevo')}
        </h2>
      </div>
      <Campo
        blanco
        etiqueta="Nombre"
        value={nombre}
        error={tocado && !nombre.trim() ? 'Escribe el nombre del actor.' : undefined}
        onChange={(e) => setNombre(e.target.value)}
        onBlur={() => setTocado(true)}
      />
      <div className={listado.campoSegmentado}>
        <span className={listado.etiquetaCampo} aria-hidden="true">
          Tipo
        </span>
        <Segmentado etiqueta="Tipo" valor={tipo} alCambiar={setTipo} opciones={tipos.map((t) => ({ valor: t, texto: TEXTO_TIPO_ACTOR[t] }))} />
      </div>
      <Campo blanco type="email" etiqueta="Correo de contacto" value={correo} onChange={(e) => setCorreo(e.target.value)} />
      <Campo blanco type="tel" etiqueta="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      {actor && actor.documentos > 0 && (
        <Aviso tono="info" icono="alerta">
          Tiene {actor.documentos} {actor.documentos === 1 ? 'documento' : 'documentos'}: no se puede eliminar, solo desactivar. Desactivado
          deja de aparecer al registrar.
        </Aviso>
      )}
      {actor && !actor.activo && <Aviso tono="info">Inactivo: ya no se ofrece como emisor ni como destinatario.</Aviso>}
      <ErrorOperacion error={guardar.error} que="guardar el actor" />
      <ErrorOperacion error={catalogos.error} que="cargar las opciones del catálogo" />
      <ErrorOperacion error={desactivar.error} que="desactivar el actor" />
      <div className={listado.acciones}>
        {actor ? (
          actor.activo && (
            <Boton variante="secundario" icono="cerrar" pendiente={desactivar.isPending} onClick={() => desactivar.mutate(actor.id)}>
              Desactivar
            </Boton>
          )
        ) : (
          <Boton variante="fantasma" onClick={alCancelar}>
            Cancelar
          </Boton>
        )}
        <Boton icono="check" disabled={!nombre.trim()} pendiente={guardar.isPending} onClick={enviar}>
          Guardar
        </Boton>
      </div>
    </Tarjeta>
  )
}
