import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAreas, useBusqueda, useCatalogos } from '../../api/consultas'
import type { CampoBuscable, EstadoDocumento, FiltrosBusqueda, ResultadoBusqueda, TipoDocumento } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { Campo } from '../../componentes/base/Campo'
import { Estado } from '../../componentes/base/Estado'
import { TEXTO_ESTADO, TEXTO_TIPO } from '../../componentes/base/textos'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { EstadoConsulta } from '../../componentes/compuestos/EstadoConsulta'
import { Selector } from '../../componentes/compuestos/Selector'
import { Tabla } from '../../componentes/compuestos/Tabla'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import { Icono } from '../../iconos/Icono'
import { aHoraLocal } from '../formato'
import listado from '../listado.module.css'
import { paginasVisibles } from './paginas'
import estilos from './Buscar.module.css'

const TODOS = 'todos'
const POR_PAGINA = 20

const COLUMNAS = [
  { titulo: 'Folio', ancho: 106 },
  { titulo: 'Número', ancho: 140 },
  { titulo: 'Síntesis' },
  { titulo: 'Tipo', ancho: 170 },
  { titulo: 'Estado', ancho: 112 },
  { titulo: 'Área responsable', ancho: 150 },
]

/** Los dos campos con índice parcial (D-46). */
const CAMPO_DEL_TIPO: Partial<Record<TipoDocumento, { clave: CampoBuscable; etiqueta: string }>> = {
  requerimiento_auditoria: { clave: 'ente_auditor', etiqueta: 'Ente auditor' },
  solicitud_transparencia: { clave: 'solicitante', etiqueta: 'Solicitante' },
}

const ESTADOS: EstadoDocumento[] = ['en_tramite', 'concluido', 'cancelado', 'sin_efecto']

// Diseño propio: el Figma dibuja «Recibido: 01/01/2026 – 21/11/2026» sin selector; se ofrecen periodos fijos.
const hoy = aHoraLocal(new Date().toISOString()).slice(0, 10)
const anio = hoy.slice(0, 4)
const mes = hoy.slice(0, 7)
const PERIODOS: { valor: string; texto: string; desde?: string; hasta?: string }[] = [
  { valor: TODOS, texto: 'Cualquier fecha' },
  { valor: 'mes', texto: 'Este mes', desde: `${mes}-01`, hasta: hoy },
  { valor: 'anio', texto: `En ${anio}`, desde: `${anio}-01-01`, hasta: `${anio}-12-31` },
]

interface Borrador {
  texto: string
  folio: string
  numero: string
  emisor: string
  tipo: string
  estado: string
  periodo: string
  campo: string
}

const VACIO: Borrador = { texto: '', folio: '', numero: '', emisor: TODOS, tipo: TODOS, estado: TODOS, periodo: TODOS, campo: '' }

function aFiltros(b: Borrador): FiltrosBusqueda {
  const periodo = PERIODOS.find((p) => p.valor === b.periodo)
  const campo = b.tipo === TODOS ? undefined : CAMPO_DEL_TIPO[b.tipo as TipoDocumento]
  return {
    texto: b.texto.trim() || undefined,
    folio: b.folio.trim() || undefined,
    numero: b.numero.trim() || undefined,
    emisor: b.emisor === TODOS ? undefined : b.emisor,
    tipo: b.tipo === TODOS ? undefined : (b.tipo as TipoDocumento),
    estado: b.estado === TODOS ? undefined : (b.estado as EstadoDocumento),
    desde: periodo?.desde,
    hasta: periodo?.hasta,
    campo_tipo: campo && b.campo.trim() ? { clave: campo.clave, valor: b.campo.trim() } : undefined,
  }
}

/** V-06 Buscar documentos (O-30): para todos los roles; la visibilidad la filtra el servicio (D-29, D-62). */
export function Buscar() {
  const [borrador, setBorrador] = useState(VACIO)
  const [aplicado, setAplicado] = useState(VACIO)
  const [pagina, setPagina] = useState(1)
  const busqueda = useBusqueda({ ...aFiltros(aplicado), pagina, tamano: POR_PAGINA })
  const catalogos = useCatalogos()
  const areas = useAreas()
  const cambiar = (cambio: Partial<Borrador>) => setBorrador((b) => ({ ...b, ...cambio }))
  const campo = borrador.tipo === TODOS ? undefined : CAMPO_DEL_TIPO[borrador.tipo as TipoDocumento]
  const campoAplicado = aFiltros(aplicado).campo_tipo

  function aplicar(nuevo: Borrador) {
    setAplicado(nuevo)
    setPagina(1)
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    aplicar(borrador)
  }

  const emisores = [
    ...(areas.data?.elementos ?? []).map((a) => a.nombre),
    ...(catalogos.data?.actores_externos ?? []).map((a) => a.nombre),
  ].sort((a, b) => a.localeCompare(b))

  return (
    <div className={listado.pagina}>
      <EncabezadoPagina
        titulo="Buscar documentos"
        descripcion="Busca en todo el registro. Lo confidencial de otras áreas solo muestra el estado y quién lo atiende."
      />

      <Tarjeta material="vidrio" className={estilos.filtros}>
        <form onSubmit={enviar} aria-label="Filtros de búsqueda">
          <div className={estilos.campos}>
            <Campo etiqueta="Texto en la síntesis" value={borrador.texto} onChange={(e) => cambiar({ texto: e.target.value })} />
            <Campo etiqueta="Folio" placeholder="OP-2026-…" value={borrador.folio} onChange={(e) => cambiar({ folio: e.target.value })} />
            <Campo
              etiqueta="Número del emisor"
              placeholder="—"
              value={borrador.numero}
              onChange={(e) => cambiar({ numero: e.target.value })}
            />
          </div>
          <div className={estilos.pildoras}>
            <Selector
              variante="pildora"
              prefijo="Emisor:"
              valor={borrador.emisor}
              cargando={areas.isPending || catalogos.isPending}
              opciones={[{ valor: TODOS, texto: 'Cualquiera' }, ...emisores.map((e) => ({ valor: e, texto: e }))]}
              alCambiar={(emisor) => cambiar({ emisor })}
            />
            <Selector
              variante="pildora"
              prefijo="Tipo:"
              valor={borrador.tipo}
              opciones={[
                { valor: TODOS, texto: 'Todos' },
                ...(catalogos.data?.tipos_documento ?? []).map((t) => ({ valor: t, texto: TEXTO_TIPO[t] })),
              ]}
              alCambiar={(tipo) => cambiar({ tipo, campo: '' })}
            />
            <Selector
              variante="pildora"
              prefijo="Estado:"
              valor={borrador.estado}
              opciones={[{ valor: TODOS, texto: 'Todos' }, ...ESTADOS.map((e) => ({ valor: e, texto: TEXTO_ESTADO[e] }))]}
              alCambiar={(estado) => cambiar({ estado })}
            />
            <Selector
              variante="pildora"
              prefijo="Recibido:"
              valor={borrador.periodo}
              opciones={PERIODOS}
              alCambiar={(periodo) => cambiar({ periodo })}
            />
          </div>
          <div className={estilos.pie}>
            <div className={estilos.campoTipo}>
              {campo && (
                <Campo
                  etiqueta={`${campo.etiqueta} contiene`}
                  ayuda="Campo propio del tipo (D-46)."
                  value={borrador.campo}
                  onChange={(e) => cambiar({ campo: e.target.value })}
                />
              )}
              {campoAplicado && (
                <span className={estilos.chip}>
                  <Icono nombre="filtro" tamano={14} />
                  Campo del tipo · {CAMPO_DEL_TIPO[aplicado.tipo as TipoDocumento]?.etiqueta} contiene “{campoAplicado.valor}”
                  <button
                    type="button"
                    className={estilos.quitar}
                    aria-label="Quitar el filtro por campo del tipo"
                    onClick={() => {
                      cambiar({ campo: '' })
                      aplicar({ ...aplicado, campo: '' })
                    }}
                  >
                    <Icono nombre="cerrar" tamano={12} />
                  </button>
                </span>
              )}
            </div>
            <Boton
              variante="fantasma"
              onClick={() => {
                setBorrador(VACIO)
                aplicar(VACIO)
              }}
            >
              Limpiar
            </Boton>
            <Boton type="submit" icono="buscar">
              Buscar
            </Boton>
          </div>
        </form>
      </Tarjeta>

      <Tarjeta material="solida" className={listado.tarjeta} aria-labelledby="titulo-resultados" aria-busy={busqueda.isPending || undefined}>
        <div className={listado.cabecera}>
          <h2 id="titulo-resultados" className={listado.titulo}>
            {busqueda.data ? `${busqueda.data.total} ${busqueda.data.total === 1 ? 'resultado' : 'resultados'}` : <Forma ancho="9ch" />}
          </h2>
          <p className={listado.pie}>Ordenar por: fecha de recepción ↓</p>
        </div>
        <EstadoConsulta
          consulta={busqueda}
          que="los resultados"
          esqueleto={<Esqueleto />}
          vacio={(d) => (d.total === 0 ? 'Ningún documento coincide con esos filtros.' : null)}
        >
          {({ elementos, total }) => (
            <>
              <Tabla titulo="Documentos encontrados" columnas={COLUMNAS}>
                {elementos.map((r) => (
                  <Fila key={r.id} r={r} />
                ))}
              </Tabla>
              <Paginador pagina={pagina} total={total} alCambiar={setPagina} mostrados={elementos.length} />
            </>
          )}
        </EstadoConsulta>
      </Tarjeta>
    </div>
  )
}

function Fila({ r }: { r: ResultadoBusqueda }) {
  return (
    <tr>
      <td>
        <Link to={`/documentos/${r.id}`} className={listado.folio}>
          {r.folio}
        </Link>
      </td>
      <td className={listado.dato}>{r.numero_emisor ?? '—'}</td>
      <td>
        {r.sintesis !== null ? (
          <p className={estilos.sintesis} title={r.sintesis}>
            {r.sintesis}
          </p>
        ) : (
          <p className={estilos.oculta}>
            <Icono nombre="candado" tamano={14} />
            {r.visibilidad === 'confidencial' ? 'Contenido confidencial de otra área' : 'De otra área: solo estado y responsable'}
          </p>
        )}
      </td>
      <td className={listado.secundario}>{TEXTO_TIPO[r.tipo]}</td>
      <td>
        <Estado estado={r.estado} />
      </td>
      <td className={listado.texto}>{r.area_responsable ?? '—'}</td>
    </tr>
  )
}

/** «1–7 de 7 · 20 por página» y los botones de página. */
function Paginador({ pagina, total, mostrados, alCambiar }: { pagina: number; total: number; mostrados: number; alCambiar: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const desde = (pagina - 1) * POR_PAGINA + 1
  return (
    <nav className={estilos.paginador} aria-label="Páginas de resultados">
      <p>
        {desde}–{desde + mostrados - 1} de {total} · {POR_PAGINA} por página
      </p>
      <button type="button" className={estilos.pagina} aria-label="Página anterior" disabled={pagina === 1} onClick={() => alCambiar(pagina - 1)}>
        ‹
      </button>
      {paginasVisibles(pagina, paginas).map((p, i) =>
        p === null ? (
          <span key={`salto-${i}`} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={estilos.pagina}
            aria-label={`Página ${p}`}
            aria-current={p === pagina ? 'page' : undefined}
            onClick={() => alCambiar(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className={estilos.pagina}
        aria-label="Página siguiente"
        disabled={pagina === paginas}
        onClick={() => alCambiar(pagina + 1)}
      >
        ›
      </button>
    </nav>
  )
}

function Esqueleto() {
  return (
    <div aria-hidden="true">
      <Tabla titulo="Documentos encontrados" columnas={COLUMNAS}>
        {[30, 24, 34, 28, 26, 32, 22].map((ancho) => (
          <tr key={ancho}>
            <td>
              <span className={listado.folio}>
                <Forma ancho="11ch" />
              </span>
            </td>
            <td className={listado.dato}>
              <Forma ancho="12ch" />
            </td>
            <td>
              <p className={estilos.sintesis}>
                <Forma ancho={`${ancho}ch`} />
              </p>
            </td>
            <td className={listado.secundario}>
              <Forma ancho="16ch" />
            </td>
            <td>
              <Forma>
                <Estado estado="en_tramite" />
              </Forma>
            </td>
            <td className={listado.texto}>
              <Forma ancho="12ch" />
            </td>
          </tr>
        ))}
      </Tabla>
    </div>
  )
}
