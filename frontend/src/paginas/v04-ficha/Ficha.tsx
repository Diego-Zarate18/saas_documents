import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useFicha } from '../../api/consultas'
import type { Ficha as DatosFicha, Sesion } from '../../api/tipos'
import { Boton } from '../../componentes/base/Boton'
import { Estado } from '../../componentes/base/Estado'
import { TEXTO_TIPO } from '../../componentes/base/textos'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { EstadoConsulta } from '../../componentes/compuestos/EstadoConsulta'
import { Menu, type OpcionMenu } from '../../componentes/compuestos/Menu'
import { Icono } from '../../iconos/Icono'
import { OPCIONES } from '../../rutas/menu'
import { accionesFicha } from '../../sesion/permisos'
import { useSesion } from '../../sesion/sesion'
import { dias } from '../formato'
import { AsignarAsunto } from '../v11-asuntos/Asignar'
import { Turnar } from '../v05-turnar/Turnar'
import { Devolver } from '../v07-devolver/Devolver'
import { Atraer } from '../v08-atraer/Atraer'
import { Concluir } from '../v09-concluir/Concluir'
import { Relacionar } from '../v10-relacionar/Relacionar'
import { Cancelar } from '../v15-oficialia/Cancelar'
import { Corregir } from '../v15-oficialia/Corregir'
import { SegundaRecepcion } from '../v15-oficialia/SegundaRecepcion'
import { AgregarAnexo, AgregarNota } from './AgregarAlExpediente'
import estilos from './Ficha.module.css'
import { FichaEsqueleto } from './FichaEsqueleto'
import { RecorridoFicha, RelacionesFicha } from './Laterales'
import { Expediente, Registro } from './Secciones'

type Accion =
  | 'turnar'
  | 'devolver'
  | 'atraer'
  | 'concluir'
  | 'relacionar'
  | 'cancelar'
  | 'corregir'
  | 'recepcion'
  | 'anexo'
  | 'nota'
  | 'asunto'

/** V-04 (oficialía), V-04b (titular), V-04d («Más acciones») y V-04e (personal): O-11. */
export function Ficha() {
  const { id = '' } = useParams()
  const sesion = useSesion().data
  const ficha = useFicha(id)
  if (!sesion) return null
  return (
    <EstadoConsulta consulta={ficha} que="la ficha del documento" esqueleto={<FichaEsqueleto />}>
      {(datos) => <FichaDe ficha={datos} sesion={sesion} />}
    </EstadoConsulta>
  )
}

function FichaDe({ ficha, sesion }: { ficha: DatosFicha; sesion: Sesion }) {
  const [accion, setAccion] = useState<Accion>()
  const puede = accionesFicha(sesion, ficha)
  const r = ficha.registro
  const areaPropia = sesion.nombre_area ?? ''
  const ubicacion = ficha.ubicacion_actual.find((u) => u.rol === 'responsable') ?? ficha.ubicacion_actual[0]
  // Devolver regresa al área que lo envió en el último movimiento que llegó a la propia (O-22),
  // con los roles corregidos por O-25, como los calcula el servidor.
  const corregido = new Map(ficha.recorrido?.filter((m) => m.id_corrige).map((m) => [m.id_corrige, m.rol]))
  const origen =
    ficha.recorrido?.findLast(
      (m) => m.area_destino === areaPropia && m.tipo !== 'correccion' && (corregido.get(m.id) ?? m.rol) !== 'conocimiento',
    )?.area_origen ?? null
  const abrir = (a: Accion) => () => setAccion(a)
  const modal = (a: Accion) => ({ abierto: accion === a, alCambiar: (abierto: boolean) => setAccion(abierto ? a : undefined) })

  const relacionar: OpcionMenu = { texto: 'Relacionar con otro documento', icono: 'enlace', operacion: 'O-07', alElegir: abrir('relacionar') }
  const menu: OpcionMenu[] =
    puede.menu === 'oficialia'
      ? [
          ...(puede.relacionar ? [relacionar] : []),
          {
            texto: 'Registrar segunda recepción',
            icono: 'registrar',
            operacion: 'O-19',
            alElegir: abrir('recepcion'),
            deshabilitado: r.segunda_recepcion !== null,
          },
          { texto: 'Corregir un movimiento', icono: 'reloj', operacion: 'O-25', alElegir: abrir('corregir') },
          { texto: 'Cancelar documento', icono: 'cerrar', operacion: 'O-24', alElegir: abrir('cancelar'), peligro: true },
        ]
      : [relacionar, { texto: 'Asignar a un asunto', icono: 'asunto', operacion: 'O-08', alElegir: abrir('asunto') }]
  // Una sola acción primaria (DESIGN.md): concluir; si no, atraer cuando no se puede turnar; si no, turnar.
  const primaria = puede.concluir ? 'concluir' : puede.atraer && !puede.turnar ? 'atraer' : 'turnar'
  const variante = (a: Accion) => (a === primaria ? 'primario' : 'secundario')

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina
        migas={
          <>
            <Link to={OPCIONES.bandeja.ruta}>Bandeja</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{r.folio}</span>
          </>
        }
        titulo={r.asunto ?? r.folio}
        descripcion={
          <p className={estilos.meta}>
            <Estado estado={r.estado} />
            {r.confidencial && <Estado estado="confidencial" />}
            {r.posible_duplicado && <Estado estado="posible_duplicado" />}
            {r.extemporaneo && <Estado estado="extemporaneo" />}
            <span className={estilos.secundario}>{TEXTO_TIPO[r.tipo]}</span>
            {ubicacion && (
              <>
                <span className={estilos.secundario} aria-hidden="true">
                  ·
                </span>
                <Icono nombre="reloj" tamano={14} />
                <span>
                  Pendiente en {ubicacion.area} como {ubicacion.rol} · {dias(ubicacion.antiguedad_dias)}
                </span>
              </>
            )}
          </p>
        }
        acciones={
          <>
            {puede.menu && <Menu texto={puede.menu === 'oficialia' ? 'Más acciones' : 'Más'} opciones={menu} />}
            {puede.relacionar && puede.menu === 'oficialia' && (
              <Boton variante="secundario" icono="enlace" onClick={abrir('relacionar')}>
                Relacionar
              </Boton>
            )}
            {puede.devolver && (
              <Boton variante="secundario" icono="devolver" onClick={abrir('devolver')}>
                Devolver
              </Boton>
            )}
            {puede.turnar && (
              <Boton variante={variante('turnar')} icono="turnar" onClick={abrir('turnar')}>
                Turnar
              </Boton>
            )}
            {puede.atraer && (
              <Boton variante={variante('atraer')} icono="atraer" onClick={abrir('atraer')}>
                Atraer
              </Boton>
            )}
            {puede.concluir && (
              <Boton icono="check" onClick={abrir('concluir')}>
                Concluir
              </Boton>
            )}
          </>
        }
      />

      <div className={estilos.cuerpo}>
        <div className={estilos.columna}>
          <Registro ficha={ficha} />
          {ficha.acceso === 'completo' && (
            <Expediente
              ficha={ficha}
              agregarAnexo={puede.agregarAnexo ? abrir('anexo') : undefined}
              agregarNota={puede.agregarNota ? abrir('nota') : undefined}
            />
          )}
        </div>
        <div className={estilos.columna}>
          <RecorridoFicha ficha={ficha} />
          {ficha.acceso === 'completo' && <RelacionesFicha ficha={ficha} />}
        </div>
      </div>

      {puede.turnar && <Turnar idDocumento={r.id} folio={r.folio} {...modal('turnar')} />}
      {puede.devolver && <Devolver ficha={ficha} areaPropia={areaPropia} origen={origen} {...modal('devolver')} />}
      {puede.atraer && <Atraer ficha={ficha} areaPropia={areaPropia} {...modal('atraer')} />}
      {puede.concluir && <Concluir ficha={ficha} areaPropia={areaPropia} {...modal('concluir')} />}
      {puede.relacionar && <Relacionar ficha={ficha} {...modal('relacionar')} />}
      {puede.agregarAnexo && <AgregarAnexo ficha={ficha} {...modal('anexo')} />}
      {puede.agregarNota && <AgregarNota ficha={ficha} {...modal('nota')} />}
      {puede.menu === 'area' && <AsignarAsunto idDocumento={r.id} folio={r.folio} asuntos={ficha.asuntos ?? []} {...modal('asunto')} />}
      {puede.menu === 'oficialia' && (
        <>
          <SegundaRecepcion idDocumento={r.id} {...modal('recepcion')} />
          <Corregir ficha={ficha} {...modal('corregir')} />
          <Cancelar ficha={ficha} {...modal('cancelar')} />
        </>
      )}
    </div>
  )
}
