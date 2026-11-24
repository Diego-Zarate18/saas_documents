// Esqueleto de la ficha (T-01b, diseño propio): las mismas tarjetas y líneas que V-04, con formas.
import type { CSSProperties } from 'react'
import { Boton } from '../../componentes/base/Boton'
import { Estado } from '../../componentes/base/Estado'
import { EncabezadoPagina } from '../../componentes/compuestos/EncabezadoPagina'
import { Forma } from '../../componentes/compuestos/Esqueleto'
import { PasoRecorrido } from '../../componentes/compuestos/PasoRecorrido'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import estilos from './Ficha.module.css'
import propios from './Laterales.module.css'

function Cabecera({ titulo }: { titulo: string }) {
  return (
    <div className={estilos.cabecera}>
      <h2>
        <Forma ancho={titulo} />
      </h2>
      <span className={estilos.origen}>
        <Forma ancho="10ch" />
      </span>
    </div>
  )
}

function Dato({ ancho }: { ancho: string }) {
  return (
    <div className={estilos.dato}>
      <dt>
        <Forma ancho="12ch" />
      </dt>
      <dd>
        <Forma ancho={ancho} />
      </dd>
    </div>
  )
}

function Paso({ actual }: { actual?: boolean }) {
  return (
    <PasoRecorrido actual={actual}>
      <p className={propios.lugar}>
        <Forma ancho="16ch" />
      </p>
      <p className={propios.que}>
        <Forma ancho="22ch" />
      </p>
      <p className={propios.quien}>
        <Forma ancho="18ch" />
      </p>
    </PasoRecorrido>
  )
}

/** Encabezado, registro, ubicación actual, expediente y recorrido mientras se lee la ficha (O-11). */
export function FichaEsqueleto() {
  return (
    <div className={estilos.pagina} aria-busy="true">
      <EncabezadoPagina
        migas={<Forma ancho="22ch" />}
        titulo={
          <>
            <span className="solo-lector">Ficha del documento</span>
            <Forma ancho="18ch" />
          </>
        }
        descripcion={
          <p className={estilos.meta}>
            <Forma radio="var(--radio-pildora)">
              <Estado estado="en_tramite" />
            </Forma>
            <span>
              <Forma ancho="34ch" />
            </span>
          </p>
        }
        acciones={
          <Forma radio="var(--radio-control)">
            <Boton icono="turnar">Turnar</Boton>
          </Forma>
        }
      />
      <div className={estilos.cuerpo} aria-hidden="true">
        <div className={estilos.columna}>
          <Tarjeta material="relieve" className={estilos.seccion}>
            <Cabecera titulo="8ch" />
            <dl className={estilos.datos}>
              {['11ch', '13ch', '18ch', '14ch', '20ch', '16ch'].map((ancho) => (
                <Dato key={ancho} ancho={ancho} />
              ))}
            </dl>
          </Tarjeta>
          <Tarjeta material="solida" className={estilos.seccion}>
            <Cabecera titulo="10ch" />
            <dl className={estilos.datos} style={{ '--columnas': 2 } as CSSProperties}>
              <Dato ancho="26ch" />
              <Dato ancho="14ch" />
            </dl>
            <p className={estilos.anexo}>
              <span>
                <Forma ancho="24ch" />
              </span>
              <span>
                <Forma ancho="32ch" />
              </span>
            </p>
          </Tarjeta>
        </div>
        <div className={estilos.columna}>
          <Tarjeta material="vidrio" className={`${estilos.seccion} ${propios.recorrido}`}>
            <Cabecera titulo="10ch" />
            <ol className={propios.pasos}>
              <Paso />
              <Paso />
              <Paso actual />
            </ol>
          </Tarjeta>
        </div>
      </div>
    </div>
  )
}
