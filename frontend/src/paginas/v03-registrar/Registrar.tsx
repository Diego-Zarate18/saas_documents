import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAreas, useCatalogos, useFolioSiguiente, useRegistrarDocumento } from '../../api/consultas'
import { validarDatosTipo } from '../../api/reglas'
import { ErrorDeApi, type Canal, type DatosTipo, type TipoDocumento } from '../../api/tipos'
import { Boton, BotonEnlace } from '../../componentes/base/Boton'
import { Campo } from '../../componentes/base/Campo'
import { Interruptor } from '../../componentes/base/Interruptor'
import { TEXTO_CANAL, TEXTO_TIPO } from '../../componentes/base/textos'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { Segmentado } from '../../componentes/compuestos/Segmentado'
import { CampoSelector } from '../../componentes/compuestos/Selector'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import { Icono } from '../../iconos/Icono'
import { OPCIONES } from '../../rutas/menu'
import { useSesion } from '../../sesion/sesion'
import { SegundaRecepcion } from '../v15-oficialia/SegundaRecepcion'
import { aHoraLocal, deHoraLocal, fechaHora } from '../formato'
import { Puntos } from './Puntos'
import estilos from './Registrar.module.css'

type Errores = Partial<Record<'tipo' | 'emisor' | 'fecha_recepcion' | 'sintesis', string>> & { datos?: Record<string, string> }

/** V-03 Registrar documento recibido y asignar folio (O-01, D-21, D-27, D-28, D-66). Solo oficialía. */
export function Registrar() {
  const navegar = useNavigate()
  const areaPropia = useSesion().data?.nombre_area ?? ''
  const catalogos = useCatalogos()
  const areas = useAreas()
  const folio = useFolioSiguiente()
  const registrar = useRegistrarDocumento()

  const [tipo, setTipo] = useState<TipoDocumento | ''>('')
  const [numero, setNumero] = useState('')
  const [tipoEmisor, setTipoEmisor] = useState<'area' | 'externo'>('externo')
  const [emisor, setEmisor] = useState('')
  const [fechaDocumento, setFechaDocumento] = useState('')
  const [canal, setCanal] = useState<Canal>('papel')
  const [recepcion, setRecepcion] = useState(() => aHoraLocal(new Date().toISOString()))
  const [sintesis, setSintesis] = useState('')
  const [confidencial, setConfidencial] = useState(false)
  const [extemporaneo, setExtemporaneo] = useState(false)
  const [datos, setDatos] = useState<DatosTipo>({})
  const [errores, setErrores] = useState<Errores>({})
  const [segunda, setSegunda] = useState(false)
  // Cada envío inválido lleva el foco al primer campo con error, para que el lector de pantalla lo anuncie.
  const [intentos, setIntentos] = useState(0)
  useEffect(() => {
    if (intentos) document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus()
  }, [intentos])

  const campos = tipo ? (catalogos.data?.campos_tipo[tipo] ?? []) : []
  const existente = registrar.error instanceof ErrorDeApi ? registrar.error.problema.existente : undefined

  function validar(): Errores {
    const e: Errores = {}
    if (!tipo) e.tipo = 'Elige el tipo de documento.'
    if (!emisor.trim()) e.emisor = tipoEmisor === 'area' ? 'Elige el área emisora.' : 'Escribe el actor externo.'
    if (!recepcion) e.fecha_recepcion = 'Escribe la fecha y hora de recepción.'
    if (!sintesis.trim()) e.sintesis = 'Escribe la síntesis.'
    const deTipo = validarDatosTipo(campos, datos)
    if (Object.keys(deTipo).length) e.datos = deTipo
    return e
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const e = validar()
    setErrores(e)
    if (Object.keys(e).length || !tipo) {
      setIntentos((n) => n + 1)
      return
    }
    registrar.mutate(
      {
        tipo,
        numero_emisor: numero.trim() || null,
        tipo_emisor: tipoEmisor,
        emisor,
        fecha_documento: fechaDocumento || null,
        canal,
        fecha_recepcion: deHoraLocal(recepcion),
        sintesis,
        confidencial,
        extemporaneo,
        datos_tipo: datos,
      },
      { onSuccess: ({ id }) => navegar(`/documentos/${id}`) },
    )
  }

  // Al cambiar el tipo, el bloque «Datos del tipo» cambia y sus valores anteriores no aplican (D-66).
  function cambiarTipo(t: string) {
    setTipo(t as TipoDocumento)
    setDatos({})
    setErrores((e) => ({ ...e, tipo: undefined, datos: undefined }))
  }

  return (
    <form className={estilos.pagina} onSubmit={enviar} noValidate>
      <EncabezadoPagina
        migas={
          <>
            <Link to={OPCIONES.bandeja.ruta}>Bandeja</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Registrar</span>
          </>
        }
        titulo="Registrar documento"
        descripcion="El folio se asigna al guardar: consecutivo por área y año, sin huecos."
        acciones={
          <>
            <BotonEnlace variante="fantasma" to={OPCIONES.bandeja.ruta}>
              Cancelar
            </BotonEnlace>
            <Boton type="submit" icono="check" pendiente={registrar.isPending}>
              Registrar y asignar folio
            </Boton>
          </>
        }
      />

      <div className={estilos.cuerpo}>
        <Tarjeta material="solida" className={estilos.formulario} aria-labelledby="titulo-datos">
          <div className={estilos.cabecera}>
            <h2 id="titulo-datos">Datos del documento</h2>
            <span className={estilos.origen}>Registro oficial</span>
          </div>
          <div className={estilos.dos}>
            <CampoSelector
              etiqueta="Tipo de documento"
              ayuda="El tipo no cambia después del registro."
              error={errores.tipo}
              marcador="Elige un tipo"
              valor={tipo}
              cargando={catalogos.isPending}
              opciones={(catalogos.data?.tipos_documento ?? []).map((t) => ({ valor: t, texto: TEXTO_TIPO[t] }))}
              alCambiar={cambiarTipo}
            />
            <Campo
              etiqueta="Número del emisor"
              ayuda="Opcional. Sin número se marca posible duplicado."
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </div>
          <div className={estilos.emisor}>
            <div className={estilos.grupo}>
              <span className={estilos.etiqueta} aria-hidden="true">
                Emisor
              </span>
              <Segmentado
                etiqueta="Emisor"
                valor={tipoEmisor}
                alCambiar={(t) => {
                  setTipoEmisor(t)
                  setEmisor('')
                }}
                opciones={[
                  { valor: 'area', texto: 'Área interna' },
                  { valor: 'externo', texto: 'Actor externo' },
                ]}
              />
            </div>
            {tipoEmisor === 'area' ? (
              <CampoSelector
                etiqueta="Área interna"
                error={errores.emisor}
                marcador="Elige un área"
                valor={(areas.data?.elementos ?? []).find((a) => a.nombre === emisor)?.id ?? ''}
                cargando={areas.isPending}
                opciones={(areas.data?.elementos ?? []).map((a) => ({ valor: a.id, texto: a.nombre }))}
                alCambiar={(id) => setEmisor(areas.data?.elementos.find((a) => a.id === id)?.nombre ?? '')}
              />
            ) : (
              <Campo etiqueta="Actor externo" error={errores.emisor} value={emisor} onChange={(e) => setEmisor(e.target.value)} />
            )}
          </div>
          <div className={estilos.fechas}>
            <Campo
              type="date"
              etiqueta="Fecha del documento"
              ayuda={fechaDocumento ? undefined : 'Sin fecha se marca posible duplicado.'}
              value={fechaDocumento}
              onChange={(e) => setFechaDocumento(e.target.value)}
            />
            <div className={estilos.grupo}>
              <span className={estilos.etiqueta} aria-hidden="true">
                Canal de recepción
              </span>
              <Segmentado
                etiqueta="Canal de recepción"
                valor={canal}
                alCambiar={setCanal}
                opciones={(['correo', 'papel'] as const).map((c) => ({ valor: c, texto: TEXTO_CANAL[c] }))}
              />
            </div>
            <Campo
              type="datetime-local"
              etiqueta="Fecha y hora de recepción"
              error={errores.fecha_recepcion}
              value={recepcion}
              onChange={(e) => setRecepcion(e.target.value)}
            />
          </div>
          <Campo
            etiqueta="Síntesis"
            ayuda="Texto corto para listados y búsqueda. El contenido completo va abajo."
            error={errores.sintesis}
            value={sintesis}
            onChange={(e) => setSintesis(e.target.value)}
          />
          <div className={estilos.dos}>
            <Interruptor
              texto="Confidencial"
              descripcion="Solo lo verán el titular del área y quien tenga movimiento sobre él."
              activo={confidencial}
              alCambiar={setConfidencial}
            />
            <Interruptor
              texto="Registro extemporáneo"
              descripcion="Se recibió antes; el folio sigue el orden de registro y se guarda la fecha real."
              activo={extemporaneo}
              alCambiar={setExtemporaneo}
            />
          </div>

          {tipo && campos.length > 0 && (
            <section className={estilos.contenido} aria-labelledby="titulo-contenido">
              <div className={estilos.cabecera}>
                <h2 id="titulo-contenido">Contenido · {TEXTO_TIPO[tipo]}</h2>
                <span className={estilos.origen}>Expediente</span>
              </div>
              <p className={estilos.nota}>Los campos cambian según el tipo de documento y se validan con su esquema.</p>
              <div className={estilos.dos}>
                {campos
                  .filter((c) => c.forma === 'texto')
                  .map((c) => (
                    <Campo
                      key={c.clave}
                      etiqueta={c.obligatorio ? c.etiqueta : `${c.etiqueta} (opcional)`}
                      error={errores.datos?.[c.clave]}
                      value={(datos[c.clave] as string | undefined) ?? ''}
                      onChange={(e) => setDatos({ ...datos, [c.clave]: e.target.value })}
                    />
                  ))}
              </div>
              {campos
                .filter((c) => c.forma === 'lista')
                .map((c) => (
                  <Puntos
                    key={c.clave}
                    etiqueta={c.etiqueta}
                    valores={(datos[c.clave] as string[] | undefined) ?? []}
                    alCambiar={(valores) => setDatos({ ...datos, [c.clave]: valores })}
                  />
                ))}
            </section>
          )}
          <ErrorOperacion error={existente ? null : registrar.error} que="registrar el documento" />
        </Tarjeta>

        <div className={estilos.lateral}>
          <Tarjeta material="vidrio" className={estilos.folio} aria-labelledby="titulo-folio" aria-busy={folio.isPending || undefined}>
            <h2 id="titulo-folio" className={estilos.origen}>
              Folio que se asignará
            </h2>
            <p className={estilos.numero}>{folio.data ?? <Forma ancho="12ch" />}</p>
            <p className={estilos.nota}>
              {areaPropia} · {(folio.data ?? '').split('-')[1] ?? ''}. El consecutivo se reserva al guardar y no deja huecos aunque
              dos personas registren al mismo tiempo.
            </p>
          </Tarjeta>

          {existente && (
            <Tarjeta material="relieve" className={estilos.duplicado} aria-labelledby="titulo-duplicado">
              <div role="alert" className={estilos.alerta}>
                <h2 id="titulo-duplicado" className={estilos.tituloDuplicado}>
                  <Icono nombre="alerta" tamano={18} />
                  Ya existe este documento
                </h2>
                <p>Mismo número, mismo emisor y mismo año del documento. No se creará otro registro.</p>
              </div>
              <div className={estilos.existente}>
                <p className={estilos.folioExistente}>{existente.folio}</p>
                <p>
                  {existente.numero_emisor} · {existente.emisor}
                </p>
                <p className={estilos.nota}>
                  Recibido por {TEXTO_CANAL[existente.canal].toLowerCase()} · {fechaHora(existente.fecha_recepcion)}
                </p>
              </div>
              <p className={estilos.nota}>
                Si es el mismo oficio que ahora llega en {TEXTO_CANAL[canal].toLowerCase()}, regístralo como segunda recepción: el
                folio no cambia y el sello fija la fecha oficial.
              </p>
              <div className={estilos.botones}>
                <Boton variante="secundario" onClick={() => setSegunda(true)}>
                  Segunda recepción
                </Boton>
                <BotonEnlace variante="fantasma" to={`/documentos/${existente.id}`}>
                  Ver ficha
                </BotonEnlace>
              </div>
              <SegundaRecepcion
                idDocumento={existente.id}
                abierto={segunda}
                alCambiar={setSegunda}
                alRegistrar={() => navegar(`/documentos/${existente.id}`)}
              />
            </Tarjeta>
          )}

          <Tarjeta material="hundida" className={estilos.recordatorio} aria-labelledby="titulo-despues">
            <h2 id="titulo-despues">Después de registrar</h2>
            <p className={estilos.nota}>El documento queda pendiente en {areaPropia} como responsable hasta que lo turnes.</p>
          </Tarjeta>
        </div>
      </div>
    </form>
  )
}
