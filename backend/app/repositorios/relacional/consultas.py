"""AR-07. Datos y visibilidad de varios documentos a la vez (hilo, alcance, rebotes, selector), para D-29."""

from uuid import UUID

from psycopg import AsyncConnection, sql

# Para quien consulta: si su área tiene algún movimiento en el documento y si la persona hizo uno o era titular al
# turnar. Los usan las listas que aplican la función central de visibilidad (app/seguridad/visibilidad.py).
INVOLUCRAMIENTO = """
  EXISTS (SELECT 1 FROM movimiento vm LEFT JOIN movimiento_origen vo ON vo.id_movimiento = vm.id_movimiento
          WHERE vm.id_documento = d.id_documento
            AND (vm.id_area_origen = %(mi_area)s OR vm.id_area_destino = %(mi_area)s OR vo.id_area = %(mi_area)s))
    AS area_involucrada,
  EXISTS (SELECT 1 FROM movimiento vm WHERE vm.id_documento = d.id_documento
            AND (vm.id_persona = %(persona)s OR vm.id_titular_al_turnar = %(persona)s)) AS persona_involucrada
"""

RESPONSABLE_HOY = """
  (SELECT a.nombre FROM pendiente p JOIN area a ON a.id_area = p.id_area
   WHERE p.id_documento = d.id_documento AND p.rol = 'responsable' ORDER BY p.fecha_hora LIMIT 1)
"""


async def documentos(con: AsyncConnection, ids: list[UUID], id_persona: UUID, mi_area: UUID | None) -> dict[UUID, dict]:
    """AR-07. Folio, síntesis, estado, sentido, emisora, responsable hoy e involucramiento de cada documento."""
    cursor = await con.execute(
        sql.SQL(
            """SELECT d.id_documento AS id, f.folio, d.sintesis, d.estado, d.sentido, d.confidencial,
                      d.id_area_emisora, {responsable} AS responsable, {involucramiento}
               FROM documento d JOIN folio f ON f.id_documento = d.id_documento
               WHERE d.id_documento = ANY(%(ids)s)"""
        ).format(responsable=sql.SQL(RESPONSABLE_HOY), involucramiento=sql.SQL(INVOLUCRAMIENTO)),
        {'ids': ids, 'persona': id_persona, 'mi_area': mi_area},
    )
    return {f['id']: f for f in await cursor.fetchall()}


async def responsables_hoy(con: AsyncConnection, ids: list[UUID]) -> dict[UUID, list[str]]:
    """AR-06. Áreas responsables hoy de cada documento (D-42)."""
    cursor = await con.execute(
        """SELECT p.id_documento, array_agg(DISTINCT a.nombre ORDER BY a.nombre) AS areas
           FROM pendiente p JOIN area a ON a.id_area = p.id_area
           WHERE p.id_documento = ANY(%s) AND p.rol = 'responsable' GROUP BY p.id_documento""",
        (ids,),
    )
    return {f['id_documento']: f['areas'] for f in await cursor.fetchall()}


async def areas_de_oficialia(con: AsyncConnection) -> set[UUID]:
    """Áreas de las personas con rol de oficialía: no cuentan como área responsable en C3 (HU-F1)."""
    cursor = await con.execute(
        'SELECT DISTINCT p.id_area FROM persona p JOIN usuario u ON u.id_persona = p.id_persona '
        "WHERE u.rol = 'OF' AND p.id_area IS NOT NULL"
    )
    return {f['id_area'] for f in await cursor.fetchall()}


async def nombres_de_areas(con: AsyncConnection, ids: list[UUID]) -> dict[UUID, str]:
    cursor = await con.execute('SELECT id_area, nombre FROM area WHERE id_area = ANY(%s)', (ids,))
    return {f['id_area']: f['nombre'] for f in await cursor.fetchall()}


async def nombres_de_personas(con: AsyncConnection, ids: list[UUID]) -> dict[UUID, str]:
    cursor = await con.execute('SELECT id_persona, nombre FROM persona WHERE id_persona = ANY(%s)', (ids,))
    return {f['id_persona']: f['nombre'] for f in await cursor.fetchall()}
