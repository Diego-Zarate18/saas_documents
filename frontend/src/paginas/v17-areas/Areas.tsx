import { useState } from 'react'
import { useDesactivarArea, useGuardarArea, useOrganizacion } from '../../api/consultas'
import type { AreaOrganizacion } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { Campo } from '../../componentes/base/Campo'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { CampoBusqueda } from '../../componentes/compuestos/CampoBusqueda'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { EstadoConsulta } from '../../componentes/compuestos/EstadoConsulta'
import { CampoSelector } from '../../componentes/compuestos/Selector'
import { Tabla } from '../../componentes/compuestos/Tabla'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import listado from '../listado.module.css'

const NUEVA = 'nueva'
const SIN_TITULAR = 'sin-titular'

const COLUMNAS = [
  { titulo: 'Siglas', ancho: 56 },
  { titulo: 'Nombre' },
  { titulo: 'Depende de', ancho: 90 },
  { titulo: 'Titular', ancho: 140 },
  { titulo: 'Pendientes', ancho: 80 },
  { titulo: 'Estado', ancho: 76 },
]

/** V-17 Administrar áreas (O-33): alta, edición y desactivación; la jerarquía no admite ciclos (D-47). */
export function Areas() {
  const organizacion = useOrganizacion()
  const [texto, setTexto] = useState('')
  const [elegida, setElegida] = useState<string>()
  const todas = organizacion.data?.elementos ?? []
  const buscado = texto.trim().toLowerCase()
  const visibles = todas.filter((a) => !buscado || a.nombre.toLowerCase().includes(buscado) || a.siglas.toLowerCase().includes(buscado))
  const actual = elegida === NUEVA ? undefined : (todas.find((a) => a.id === elegida) ?? visibles[0])
  const activas = todas.filter((a) => a.activa).length

  return (
    <div className={listado.pagina}>
      <EncabezadoPagina
        titulo="Áreas"
        descripcion="Alta, edición y desactivación de áreas. La jerarquía no admite ciclos."
        acciones={
          <>
            <CampoBusqueda etiqueta="Buscar área" valor={texto} alCambiar={setTexto} />
            <Boton icono="mas" onClick={() => setElegida(NUEVA)}>
              Nueva área
            </Boton>
          </>
        }
      />
      <div className={listado.cuerpo}>
        <Tarjeta material="vidrio" className={listado.tarjeta} aria-labelledby="titulo-areas" aria-busy={organizacion.isPending || undefined}>
          <div className={listado.cabecera}>
            <h2 id="titulo-areas" className={listado.titulo}>
              {organizacion.data ? `${activas} ${activas === 1 ? 'área activa' : 'áreas activas'}` : <Forma ancho="12ch" />}
            </h2>
            <p className={listado.origen}>PostgreSQL</p>
          </div>
          <EstadoConsulta
            consulta={organizacion}
            que="las áreas"
            esqueleto={<Forma ancho="80%" />}
            vacio={() => (visibles.length === 0 ? 'Ninguna área coincide.' : null)}
          >
            {() => (
              <Tabla titulo="Áreas" columnas={COLUMNAS}>
                {visibles.map((a) => (
                  <tr key={a.id} className={[a === actual && listado.elegida, !a.activa && listado.inactiva].filter(Boolean).join(' ') || undefined}>
                    <td>
                      <button type="button" className={`${listado.elegir} ${listado.siglas}`} aria-pressed={a === actual} onClick={() => setElegida(a.id)}>
                        {a.siglas}
                      </button>
                    </td>
                    <td className={listado.texto}>{a.nombre}</td>
                    <td className={listado.secundario}>{todas.find((p) => p.id === a.id_padre)?.siglas ?? '—'}</td>
                    <td className={listado.texto}>
                      {a.nombre_titular ?? (a.activa ? <span className={`${listado.pildora} ${listado.vacante}`}>Vacante</span> : '—')}
                    </td>
                    <td className={listado.dato}>{a.pendientes}</td>
                    <td>
                      <span className={`${listado.pildora} ${a.activa ? listado.activo : ''}`}>{a.activa ? 'Activa' : 'Inactiva'}</span>
                    </td>
                  </tr>
                ))}
              </Tabla>
            )}
          </EstadoConsulta>
        </Tarjeta>
        {organizacion.data && (elegida === NUEVA || actual) && (
          <Formulario
            key={actual?.id ?? NUEVA}
            area={actual}
            areas={todas}
            alGuardar={(id) => setElegida(id)}
            alCancelar={() => setElegida(undefined)}
          />
        )}
      </div>
    </div>
  )
}

interface PropsFormulario {
  /** Sin área, el formulario crea una nueva. */
  area: AreaOrganizacion | undefined
  areas: AreaOrganizacion[]
  alGuardar: (id: string) => void
  alCancelar: () => void
}

function Formulario({ area, areas, alGuardar, alCancelar }: PropsFormulario) {
  const [siglas, setSiglas] = useState(area?.siglas ?? '')
  const [nombre, setNombre] = useState(area?.nombre ?? '')
  const [idPadre, setIdPadre] = useState(area?.id_padre ?? '')
  const [idTitular, setIdTitular] = useState(area?.id_titular ?? SIN_TITULAR)
  const [tocado, setTocado] = useState({ siglas: false, nombre: false })
  const guardar = useGuardarArea()
  const desactivar = useDesactivarArea()
  const esRaiz = area !== undefined && area.id_padre === null
  const valido = siglas.trim() !== '' && nombre.trim() !== '' && (idPadre !== '' || esRaiz)
  const adscritas = area?.personas ?? []

  function enviar() {
    guardar.mutate(
      { id: area?.id ?? null, siglas, nombre, id_padre: idPadre || null, id_titular: idTitular === SIN_TITULAR ? null : idTitular },
      { onSuccess: (a) => alGuardar(a.id) },
    )
  }

  return (
    <Tarjeta material="vidrio" className={listado.panel} aria-labelledby="titulo-formulario-area">
      <div>
        <p className={listado.etiquetaPanel}>{area ? 'Editar área' : 'Nueva área'}</p>
        <h2 id="titulo-formulario-area" className={listado.tituloPanel}>
          {area?.nombre ?? (nombre.trim() || 'Área nueva')}
        </h2>
      </div>
      <div>
        <div className={listado.dosColumnas}>
          <Campo
            blanco
            etiqueta="Siglas"
            value={siglas}
            disabled={area?.con_folios}
            error={tocado.siglas && !siglas.trim() ? 'Escribe las siglas.' : undefined}
            onChange={(e) => setSiglas(e.target.value.toUpperCase())}
            onBlur={() => setTocado((t) => ({ ...t, siglas: true }))}
          />
          <Campo
            blanco
            etiqueta="Nombre"
            value={nombre}
            error={tocado.nombre && !nombre.trim() ? 'Escribe el nombre del área.' : undefined}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => setTocado((t) => ({ ...t, nombre: true }))}
          />
        </div>
        <p className={listado.pie}>
          {area?.con_folios ? 'Fijas mientras el área tenga folios emitidos (D-61).' : 'Forman el folio de cada documento del área (D-21).'}
        </p>
      </div>
      <CampoSelector
        blanco
        etiqueta="Depende de"
        ayuda={esRaiz ? 'Es la raíz de la estructura.' : 'No puede depender de un área que depende de ella.'}
        marcador={esRaiz ? 'Ninguna (raíz)' : 'Elige un área'}
        valor={idPadre}
        deshabilitado={esRaiz}
        opciones={areas.filter((a) => a.activa && a.id !== area?.id).map((a) => ({ valor: a.id, texto: a.nombre }))}
        alCambiar={setIdPadre}
      />
      <CampoSelector
        blanco
        etiqueta="Titular"
        ayuda={
          adscritas.length > 0
            ? `Solo personas adscritas a ${area?.nombre}: ${adscritas.map((p) => p.nombre).join(', ')}.`
            : 'Sin personas adscritas: el área queda vacante hasta que tenga una.'
        }
        valor={idTitular}
        deshabilitado={adscritas.length === 0}
        opciones={[{ valor: SIN_TITULAR, texto: 'Sin titular · vacante' }, ...adscritas.map((p) => ({ valor: p.id, texto: p.nombre }))]}
        alCambiar={setIdTitular}
      />
      {area && area.activa && area.pendientes > 0 && (
        <Aviso tono="error">
          No se puede desactivar: tiene {area.pendientes} {area.pendientes === 1 ? 'documento pendiente' : 'documentos pendientes'}. Turna o
          concluye esos documentos primero.
        </Aviso>
      )}
      <ErrorOperacion error={guardar.error} que="guardar el área" />
      <ErrorOperacion error={desactivar.error} que="desactivar el área" />
      <div className={listado.acciones}>
        {area ? (
          area.activa && (
            <Boton
              variante="secundario"
              icono="cerrar"
              disabled={area.pendientes > 0}
              pendiente={desactivar.isPending}
              onClick={() => desactivar.mutate(area.id)}
            >
              Desactivar
            </Boton>
          )
        ) : (
          <Boton variante="fantasma" onClick={alCancelar}>
            Cancelar
          </Boton>
        )}
        <Boton icono="check" disabled={!valido} pendiente={guardar.isPending} onClick={enviar}>
          Guardar
        </Boton>
      </div>
    </Tarjeta>
  )
}
