"""AR-07. O-30: búsqueda de documentos recibidos y selector de documentos, con la visibilidad de D-29 en SQL."""

from datetime import date
from uuid import UUID

from psycopg import AsyncConnection, sql

from app.repositorios.relacional.consultas import INVOLUCRAMIENTO, RESPONSABLE_HOY

BASE = sql.SQL(
    """WITH base AS (
         SELECT d.id_documento AS id, f.folio, d.numero_emisor, d.sintesis, d.tipo, d.estado, d.confidencial,
                d.fecha_recepcion_inicial, coalesce(ae.nombre, ax.nombre) AS emisor,
                {responsable} AS area_responsable, {involucramiento}
         FROM documento d
         JOIN folio f ON f.id_documento = d.id_documento
         LEFT JOIN area ae ON ae.id_area = d.id_area_emisora
         LEFT JOIN actor_externo ax ON ax.id_actor = d.id_actor_emisor
         WHERE d.sentido = 'entrada'
       ), vis AS (
         SELECT *, (%(todo)s OR area_involucrada) AS completo,
                (%(todo)s OR area_involucrada)
                  AND (NOT confidencial OR persona_involucrada OR (%(es_ti)s AND area_involucrada)) AS visible
         FROM base
       )
       SELECT *, count(*) OVER () AS total FROM vis WHERE {condiciones}
       ORDER BY fecha_recepcion_inicial DESC, folio DESC LIMIT %(limite)s OFFSET %(desde)s"""
)


def _contiene(texto: str) -> str:
    """Patrón ILIKE de «contiene», sin que % o _ del usuario actúen como comodines."""
    return '%' + texto.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'


async def buscar(
    con: AsyncConnection,
    filtros: dict,
    ids_campo: list[UUID] | None,
    contexto: dict,
    limite: int,
    desde: int,
) -> list[dict]:
    """AR-07. Los filtros por número, texto y campo del tipo no coinciden con lo que el usuario no ve (D-29)."""
    condiciones = [sql.SQL('TRUE')]
    parametros = {**contexto, 'limite': limite, 'desde': desde}
    if filtros.get('folio'):
        condiciones.append(sql.SQL('folio ILIKE %(folio)s'))
        parametros['folio'] = _contiene(filtros['folio'])
    if filtros.get('numero'):
        condiciones.append(sql.SQL('completo AND numero_emisor ILIKE %(numero)s'))
        parametros['numero'] = _contiene(filtros['numero'])
    if filtros.get('texto'):
        condiciones.append(sql.SQL('visible AND sintesis ILIKE %(texto)s'))
        parametros['texto'] = _contiene(filtros['texto'])
    for campo in ('emisor', 'tipo', 'estado'):
        if filtros.get(campo):
            condiciones.append(sql.SQL('{} = {}').format(sql.Identifier(campo), sql.Placeholder(campo)))
            parametros[campo] = filtros[campo]
    dia = sql.SQL("(fecha_recepcion_inicial AT TIME ZONE 'America/Mexico_City')::date")
    if isinstance(filtros.get('desde'), date):
        condiciones.append(sql.SQL('{} >= %(dia_desde)s').format(dia))
        parametros['dia_desde'] = filtros['desde']
    if isinstance(filtros.get('hasta'), date):
        condiciones.append(sql.SQL('{} <= %(dia_hasta)s').format(dia))
        parametros['dia_hasta'] = filtros['hasta']
    if ids_campo is not None:
        condiciones.append(sql.SQL('visible AND id = ANY(%(ids_campo)s)'))
        parametros['ids_campo'] = ids_campo
    consulta = BASE.format(
        responsable=sql.SQL(RESPONSABLE_HOY),
        involucramiento=sql.SQL(INVOLUCRAMIENTO),
        condiciones=sql.SQL(' AND ').join(condiciones),
    )
    cursor = await con.execute(consulta, parametros)
    return await cursor.fetchall()


async def selector(con: AsyncConnection, texto: str, contexto: dict, ve_todas_las_salidas: bool) -> list[dict]:
    """AR-07. Hasta 8: primero las salidas que ve (OF y DI todas; los demás, las de su área) y luego los documentos
    con contenido visible, cuyo folio o síntesis contienen el texto."""
    cursor = await con.execute(
        sql.SQL(
            """SELECT * FROM (
                 SELECT d.id_documento AS id, f.folio, d.sintesis AS asunto, d.fecha_registro AS fecha,
                        d.sentido = 'salida' AS salida,
                        CASE WHEN d.sentido = 'salida'
                             THEN %(todas)s OR d.id_area_emisora = %(mi_area)s
                             ELSE (%(todo)s OR area_involucrada)
                                  AND (NOT confidencial OR persona_involucrada OR (%(es_ti)s AND area_involucrada))
                        END AS visible
                 FROM (SELECT d.*, {involucramiento} FROM documento d) d
                 JOIN folio f ON f.id_documento = d.id_documento
                 WHERE f.folio ILIKE %(patron)s OR d.sintesis ILIKE %(patron)s
               ) x
               WHERE visible
               ORDER BY salida DESC, fecha DESC, folio DESC
               LIMIT 8"""
        ).format(involucramiento=sql.SQL(INVOLUCRAMIENTO)),
        {**contexto, 'todas': ve_todas_las_salidas, 'patron': _contiene(texto)},
    )
    return await cursor.fetchall()


def contexto_sql(id_persona: UUID, mi_area: UUID | None, todo: bool, es_ti: bool) -> dict:
    """Parámetros de visibilidad que esperan BASE y el selector."""
    return {'persona': id_persona, 'mi_area': mi_area, 'todo': todo, 'es_ti': es_ti}
