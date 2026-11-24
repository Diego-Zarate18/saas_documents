"""AR-03. Bitácora de movimientos, solo INSERT (D-102), y pendientes de un documento (D-42)."""

from uuid import UUID

from psycopg import AsyncConnection


async def insertar(con: AsyncConnection, movimiento: dict, otros_origenes: list[UUID] = ()) -> None:
    """AR-03. Inserta un movimiento y, en una atracción, sus otros orígenes (D-68)."""
    await con.execute(
        """INSERT INTO movimiento (id_movimiento, id_documento, tipo, fecha_hora, id_grupo_turno, id_area_origen,
                                   id_area_destino, rol, instruccion, motivo, id_area_sugerida, id_persona,
                                   id_titular_al_turnar)
           VALUES (%(id_movimiento)s, %(id_documento)s, %(tipo)s, %(fecha_hora)s, %(id_grupo_turno)s,
                   %(id_area_origen)s, %(id_area_destino)s, %(rol)s, %(instruccion)s, %(motivo)s,
                   %(id_area_sugerida)s, %(id_persona)s, %(id_titular_al_turnar)s)""",
        movimiento,
    )
    for id_area in otros_origenes:
        await con.execute(
            'INSERT INTO movimiento_origen (id_movimiento, id_area) VALUES (%s, %s)',
            (movimiento['id_movimiento'], id_area),
        )


async def pendientes(con: AsyncConnection, id_documento: UUID) -> list[dict]:
    """AR-06. Áreas que tienen pendiente el documento (vista `pendiente`), de la llegada más antigua a la más nueva."""
    cursor = await con.execute(
        'SELECT id_area, rol, fecha_hora, id_area_origen FROM pendiente WHERE id_documento = %s ORDER BY fecha_hora',
        (id_documento,),
    )
    return await cursor.fetchall()


async def area_involucrada(con: AsyncConnection, id_documento: UUID, id_area: UUID) -> bool:
    """AR-03. El área tiene algún movimiento en el documento, como origen o destino (D-29)."""
    cursor = await con.execute(
        """SELECT EXISTS (
             SELECT 1 FROM movimiento m LEFT JOIN movimiento_origen o ON o.id_movimiento = m.id_movimiento
             WHERE m.id_documento = %(doc)s
               AND (m.id_area_origen = %(area)s OR m.id_area_destino = %(area)s OR o.id_area = %(area)s)
           ) AS involucrada""",
        {'doc': id_documento, 'area': id_area},
    )
    return (await cursor.fetchone())['involucrada']


async def ultimo_destino(con: AsyncConnection, id_documento: UUID) -> UUID:
    """AR-03. Área destino del movimiento más reciente del documento."""
    cursor = await con.execute(
        """SELECT id_area_destino FROM movimiento WHERE id_documento = %s AND tipo <> 'correccion'
           ORDER BY fecha_hora DESC, fecha_registro DESC LIMIT 1""",
        (id_documento,),
    )
    return (await cursor.fetchone())['id_area_destino']


async def titulares(con: AsyncConnection, ids: list[UUID]) -> dict[UUID, UUID | None]:
    """AR-09. Titular actual de cada área existente (D-31: nulo si está vacante)."""
    cursor = await con.execute('SELECT id_area, id_titular FROM area WHERE id_area = ANY(%s)', (ids,))
    return {fila['id_area']: fila['id_titular'] for fila in await cursor.fetchall()}
