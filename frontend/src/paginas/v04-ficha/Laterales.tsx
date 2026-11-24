// Columna derecha de la ficha: Recorrido (C1, Neo4j) y Relaciones y asuntos (Neo4j).
import { Link } from 'react-router'
import type { Ficha, Movimiento } from '../../api/tipos'
import { RolTurno } from '../../componentes/base/RolTurno'
import { TEXTO_ESTADO, TEXTO_RELACION, textoMovimiento } from '../../componentes/base/textos'
import { Chip } from '../../componentes/compuestos/Chip'
import { PasoRecorrido } from '../../componentes/compuestos/PasoRecorrido'
import { Tarjeta } from '../../componentes/compuestos/Tarjeta'
import { Icono } from '../../iconos/Icono'
import { diaHora, dias } from '../formato'
import estilos from './Ficha.module.css'
import propios from './Laterales.module.css'
import { Cabecera, OCULTO } from './Secciones'

/** Agrupa los turnos simultáneos (D-18); una corrección del mismo grupo es un paso aparte (O-25). */
function agrupar(movimientos: Movimiento[]) {
  const grupos: Movimiento[][] = []
  for (const m of movimientos) {
    const ultimo = grupos.at(-1)
    if (m.tipo === 'turno' && m.id_grupo_turno && ultimo?.[0]?.tipo === 'turno' && ultimo[0].id_grupo_turno === m.id_grupo_turno)
      ultimo.push(m)
    else grupos.push([m])
  }
  return grupos
}

function Paso({ grupo, corregidos }: { grupo: Movimiento[]; corregidos: Set<string> }) {
  const [m] = grupo
  if (!m) return null
  const quien = `${m.persona} · ${diaHora(m.fecha_hora)}`
  if (grupo.length > 1)
    return (
      <PasoRecorrido>
        <p className={propios.lugar}>{grupo.map((g) => g.area_destino).join('  +  ')}</p>
        <p className={propios.que}>Turno en un solo grupo</p>
        <p className={propios.quien}>{quien}</p>
        <ul className={propios.grupo}>
          {grupo.map((g) => (
            <li key={g.id}>
              {g.area_destino}
              <RolTurno rol={g.rol} />
              {corregidos.has(g.id) && <span className={propios.corregido}>corregido</span>}
            </li>
          ))}
        </ul>
      </PasoRecorrido>
    )
  const conOrigen = (m.tipo === 'devolucion' || m.tipo === 'atraccion') && m.area_origen
  const lugar = conOrigen ? `${m.area_origen} → ${m.area_destino}` : m.area_destino
  return (
    <PasoRecorrido>
      <p className={propios.lugar}>{lugar}</p>
      <p className={propios.que}>
        {textoMovimiento(m)}
        {corregidos.has(m.id) && <span className={propios.corregido}>corregido</span>}
      </p>
      <p className={propios.quien}>{quien}</p>
    </PasoRecorrido>
  )
}

export function RecorridoFicha({ ficha }: { ficha: Ficha }) {
  // O-25: el original queda en el recorrido marcado como corregido.
  const corregidos = new Set(ficha.recorrido?.flatMap((m) => (m.id_corrige ? [m.id_corrige] : [])))
  const ultimoTurno = ficha.recorrido?.findLast((m) => m.tipo === 'turno' && m.rol === 'responsable')
  return (
    <Tarjeta material="vidrio" className={`${estilos.seccion} ${propios.recorrido}`} aria-labelledby="titulo-recorrido">
      <Cabecera id="titulo-recorrido" titulo="Recorrido" origen="NEO4J" />
      {!ficha.recorrido ? (
        <p className={estilos.vacio}>Solo ves el estado y el responsable de los documentos de otras áreas.</p>
      ) : (
        <ol className={propios.pasos}>
          {agrupar(ficha.recorrido).map((grupo) => (
            <Paso key={grupo[0]?.id} grupo={grupo} corregidos={corregidos} />
          ))}
          {ficha.ubicacion_actual.map((u) => (
            <PasoRecorrido key={u.area} actual>
              <p className={propios.lugar}>{u.area}</p>
              <p className={`${propios.que} ${propios.actual}`}>Ubicación actual · {u.rol}</p>
              <p className={propios.quien}>Desde hace {dias(u.antiguedad_dias)}</p>
            </PasoRecorrido>
          ))}
        </ol>
      )}
      {ultimoTurno && (
        <p className={propios.titular}>
          <Icono nombre="personas" tamano={14} />
          Titular de {ultimoTurno.area_destino} al turnar: {ultimoTurno.titular_al_turnar ?? 'puesto vacante'}
        </p>
      )}
    </Tarjeta>
  )
}

export function RelacionesFicha({ ficha }: { ficha: Ficha }) {
  return (
    <Tarjeta material="relieve" className={`${estilos.seccion} ${propios.relaciones}`} aria-labelledby="titulo-relaciones">
      <Cabecera id="titulo-relaciones" titulo="Relaciones y asuntos" origen="NEO4J" />
      {!ficha.relaciones || !ficha.asuntos ? (
        <p className={estilos.vacio}>
          {ficha.contenido_oculto ? OCULTO : 'Solo ves el estado y el responsable de los documentos de otras áreas.'}
        </p>
      ) : (
        <>
          {ficha.relaciones.length === 0 && <p className={estilos.vacio}>Sin relaciones con otros documentos.</p>}
          {ficha.relaciones.map((r) => (
            <div key={`${r.tipo} ${r.referencia} ${r.descripcion}`} className={propios.relacion}>
              <p className={propios.tipoRelacion}>
                {TEXTO_RELACION[r.tipo]}
                {r.id_documento ? (
                  <Link to={`/documentos/${r.id_documento}`} className={propios.referencia}>
                    {r.referencia}
                  </Link>
                ) : (
                  <span className={propios.referencia}>{r.referencia}</span>
                )}
              </p>
              {r.id_documento ? (
                <p>
                  {r.descripcion}
                  {r.estado && ` · ${TEXTO_ESTADO[r.estado]}`}
                </p>
              ) : (
                <p className={propios.noRegistrado}>
                  No registrado: citado en el oficio; si se registra después, se liga a mano.
                </p>
              )}
            </div>
          ))}
          <div className={estilos.subseccion}>
            <Icono nombre="asunto" tamano={16} />
            <h3>Asuntos</h3>
          </div>
          {ficha.asuntos.length > 0 && (
            <ul className={propios.asuntos}>
              {ficha.asuntos.map((a) => (
                <li key={a.id}>
                  <Chip>{a.nombre}</Chip>
                </li>
              ))}
            </ul>
          )}
          <p className={propios.nota}>Lo asigna quien atiende, en cualquier momento.</p>
        </>
      )}
    </Tarjeta>
  )
}
