import { useState } from 'react'
import { useAreas, useDarDeBajaPersona, useGuardarPersona, useOrganizacion, usePersonas } from '../../api/consultas'
import { ErrorDeApi, type Persona, type Rol } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { Campo } from '../../componentes/base/Campo'
import { DESCRIPCION_ROL, TEXTO_ROL_USUARIO } from '../../componentes/base/textos'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { CampoBusqueda } from '../../componentes/compuestos/CampoBusqueda'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { EstadoConsulta } from '../../componentes/compuestos/EstadoConsulta'
import { Segmentado } from '../../componentes/compuestos/Segmentado'
import { CampoSelector } from '../../componentes/compuestos/Selector'
import { Tabla } from '../../componentes/compuestos/Tabla'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import { useSesion } from '../../sesion/sesion'
import listado from '../listado.module.css'
import estilos from './Personas.module.css'

const NUEVA = 'nueva'
const ROLES: Rol[] = ['OF', 'DI', 'TI', 'PE', 'AD']

const COLUMNAS = [
  { titulo: 'Nombre', ancho: 130 },
  { titulo: 'Correo' },
  { titulo: 'Área', ancho: 110 },
  { titulo: 'Rol', ancho: 110 },
  { titulo: 'Estado', ancho: 64 },
]

/** V-18 Personas y usuarios (O-34): cada persona con un usuario y un rol; la baja conserva sus movimientos. */
export function Personas() {
  const personas = usePersonas()
  const [texto, setTexto] = useState('')
  const [elegida, setElegida] = useState(NUEVA)
  const todas = personas.data?.elementos ?? []
  const buscado = texto.trim().toLowerCase()
  const visibles = todas.filter(
    (p) => !buscado || p.nombre.toLowerCase().includes(buscado) || (p.correo ?? '').toLowerCase().includes(buscado),
  )
  const actual = todas.find((p) => p.id === elegida)

  return (
    <div className={listado.pagina}>
      <EncabezadoPagina
        titulo="Personas y usuarios"
        descripcion="Cada persona tiene un usuario con un rol. Dar de baja conserva sus movimientos."
        acciones={
          <>
            <CampoBusqueda etiqueta="Buscar por nombre o correo" valor={texto} alCambiar={setTexto} />
            <Boton icono="mas" onClick={() => setElegida(NUEVA)}>
              Nueva persona
            </Boton>
          </>
        }
      />
      <div className={listado.cuerpo}>
        <Tarjeta material="vidrio" className={listado.tarjeta} aria-labelledby="titulo-personas" aria-busy={personas.isPending || undefined}>
          <div className={listado.cabecera}>
            <h2 id="titulo-personas" className={listado.titulo}>
              {personas.data ? `${todas.length} ${todas.length === 1 ? 'persona' : 'personas'}` : <Forma ancho="10ch" />}
            </h2>
            <p className={listado.origen}>PostgreSQL</p>
          </div>
          <EstadoConsulta
            consulta={personas}
            que="las personas"
            esqueleto={<Forma ancho="80%" />}
            vacio={() => (visibles.length === 0 ? 'Ninguna persona coincide.' : null)}
          >
            {() => (
              <Tabla titulo="Personas y usuarios" columnas={COLUMNAS}>
                {visibles.map((p) => (
                  <tr key={p.id} className={[p === actual && listado.elegida, !p.activa && listado.inactiva].filter(Boolean).join(' ') || undefined}>
                    <td>
                      <button type="button" className={`${listado.elegir} ${listado.texto}`} aria-pressed={p === actual} onClick={() => setElegida(p.id)}>
                        {p.nombre}
                      </button>
                    </td>
                    <td className={listado.secundario}>{p.correo ?? '—'}</td>
                    <td className={listado.secundario}>{p.nombre_area ?? '—'}</td>
                    <td>{p.rol ? <span className={p.activa ? estilos.rol : listado.pildora}>{TEXTO_ROL_USUARIO[p.rol]}</span> : '—'}</td>
                    <td>
                      <span className={`${listado.pildora} ${p.activa ? listado.activo : ''}`}>{p.activa ? 'Activo' : 'Baja'}</span>
                    </td>
                  </tr>
                ))}
              </Tabla>
            )}
          </EstadoConsulta>
        </Tarjeta>
        {personas.data && <Formulario key={actual?.id ?? NUEVA} persona={actual} alGuardar={setElegida} alCancelar={() => setElegida(NUEVA)} />}
      </div>
    </div>
  )
}

interface PropsFormulario {
  /** Sin persona, el formulario crea una nueva. */
  persona: Persona | undefined
  alGuardar: (id: string) => void
  alCancelar: () => void
}

function Formulario({ persona, alGuardar, alCancelar }: PropsFormulario) {
  const sesion = useSesion().data
  const areas = useAreas()
  const organizacion = useOrganizacion()
  const [nombre, setNombre] = useState(persona?.nombre ?? '')
  const [correo, setCorreo] = useState(persona?.correo ?? '')
  const [idArea, setIdArea] = useState(persona?.id_area ?? '')
  const [rol, setRol] = useState<Rol>(persona?.rol ?? 'PE')
  const [tocado, setTocado] = useState({ nombre: false, correo: false })
  const guardar = useGuardarPersona()
  const baja = useDarDeBajaPersona()
  const valido = nombre.trim() !== '' && correo.trim() !== '' && idArea !== ''
  const soloLectura = persona !== undefined && !persona.activa
  // El correo repetido se marca en el campo (estado Error del componente Campo, notas de V-18).
  const correoRepetido = guardar.error instanceof ErrorDeApi && guardar.error.problema.codigo === 'CONFLICTO'
  const titularDe = organizacion.data?.elementos.find((a) => persona && a.id_titular === persona.id)

  function enviar() {
    guardar.mutate({ id: persona?.id ?? null, nombre, correo, id_area: idArea, rol }, { onSuccess: (p) => alGuardar(p.id) })
  }

  return (
    <Tarjeta material="vidrio" className={listado.panel} aria-labelledby="titulo-formulario-persona">
      <div>
        <p className={listado.etiquetaPanel}>{persona ? (soloLectura ? 'Dada de baja' : 'Editar persona') : 'Nueva persona'}</p>
        {persona && (
          <h2 id="titulo-formulario-persona" className={listado.tituloPanel}>
            {persona.nombre}
          </h2>
        )}
        {!persona && (
          <h2 id="titulo-formulario-persona" className="solo-lector">
            Nueva persona
          </h2>
        )}
      </div>
      <Campo
        blanco
        etiqueta="Nombre completo"
        value={nombre}
        disabled={soloLectura}
        error={tocado.nombre && !nombre.trim() ? 'Escribe el nombre completo.' : undefined}
        onChange={(e) => setNombre(e.target.value)}
        onBlur={() => setTocado((t) => ({ ...t, nombre: true }))}
      />
      <Campo
        blanco
        type="email"
        etiqueta="Correo"
        value={correo}
        disabled={soloLectura}
        error={correoRepetido ? guardar.error?.message : tocado.correo && !correo.trim() ? 'Escribe el correo.' : undefined}
        onChange={(e) => {
          setCorreo(e.target.value)
          if (correoRepetido) guardar.reset()
        }}
        onBlur={() => setTocado((t) => ({ ...t, correo: true }))}
      />
      <CampoSelector
        blanco
        etiqueta="Área de adscripción"
        marcador="Elige un área"
        valor={idArea}
        deshabilitado={soloLectura}
        cargando={areas.isPending}
        opciones={(areas.data?.elementos ?? []).map((a) => ({ valor: a.id, texto: a.nombre }))}
        alCambiar={setIdArea}
      />
      <div className={listado.campoSegmentado}>
        <span className={listado.etiquetaCampo} aria-hidden="true">
          Rol
        </span>
        <Segmentado
          ancho
          etiqueta="Rol"
          valor={rol}
          alCambiar={setRol}
          opciones={ROLES.map((r) => ({ valor: r, texto: r, deshabilitado: soloLectura }))}
        />
        <p className={listado.pie}>{DESCRIPCION_ROL[rol]}</p>
      </div>
      {!persona && (
        <Aviso tono="info" icono="candado">
          La contraseña inicial se envía a la persona y se guarda solo como hash.
        </Aviso>
      )}
      {persona && !soloLectura && titularDe && (
        // Diseño propio: el Figma no dibuja la baja; avisa que el área quedará vacante (O-34).
        <Aviso tono="info">Es titular de {titularDe.nombre}: si la das de baja, el área queda vacante.</Aviso>
      )}
      {!correoRepetido && <ErrorOperacion error={guardar.error} que="guardar la persona" />}
      <ErrorOperacion error={baja.error} que="dar de baja a la persona" />
      {!soloLectura && (
        <div className={listado.acciones}>
          {persona ? (
            persona.id !== sesion?.id_persona && (
              <Boton variante="secundario" icono="cerrar" pendiente={baja.isPending} onClick={() => baja.mutate(persona.id)}>
                Dar de baja
              </Boton>
            )
          ) : (
            <Boton variante="fantasma" onClick={alCancelar}>
              Cancelar
            </Boton>
          )}
          <Boton icono="check" disabled={!valido} pendiente={guardar.isPending} onClick={enviar}>
            {persona ? 'Guardar' : 'Crear persona'}
          </Boton>
        </div>
      )}
    </Tarjeta>
  )
}
