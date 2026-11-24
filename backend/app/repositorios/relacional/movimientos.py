"""AR-03. Bitácora de movimientos, solo INSERT (D-102), y pendientes de un documento (D-42)."""

from uuid import UUID

from psycopg import AsyncConnection


async def insertar(con: AsyncConnection, movimiento: dict, otros_origenes: list[UUID] = ()) -> None:
    """AR-03. Inserta un movimiento y, en una atracción, sus otros orígenes (D-68)."""
    await con.execute(
        """INSERT INTO movimiento (id_movimiento, id_documento, tipo, fecha_hora, id_grupo_turno, id_area_origen,
                                   id_area_destino, rol, instruccion, motivo, id_area_sugerida, forma_conclusion,
                                   id_persona, id_titular_al_turnar, id_movimiento_corregido)
           VALUES (%(id_movimiento)s, %(id_documento)s, %(tipo)s, %(fecha_hora)s, %(id_grupo_turno)s,
                   %(id_area_origen)s, %(id_area_destino)s, %(rol)s, %(instruccion)s, %(motivo)s,
                   %(id_area_sugerida)s, %(forma_conclusion)s, %(id_persona)s, %(id_titular_al_turnar)s,
                   %(id_movimiento_corregido)s)""",
        {'forma_conclusion': None, 'id_movimiento_corregido': None, **movimiento},
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


async def involucramiento(con: AsyncConnection, id_documento: UUID, id_area: UUID | None, id_persona: UUID) -> dict:
    """AR-07. Si el área tiene algún movimiento en el documento y si la persona lo hizo o era titular al
    turnar (D-29)."""
    cursor = await con.execute(
        """SELECT
             EXISTS (SELECT 1 FROM movimiento m LEFT JOIN movimiento_origen o ON o.id_movimiento = m.id_movimiento
                     WHERE m.id_documento = %(doc)s
                       AND (m.id_area_origen = %(area)s OR m.id_area_destino = %(area)s OR o.id_area = %(area)s))
               AS area,
             EXISTS (SELECT 1 FROM movimiento m WHERE m.id_documento = %(doc)s
                       AND (m.id_persona = %(persona)s OR m.id_titular_al_turnar = %(persona)s)) AS persona""",
        {'doc': id_documento, 'area': id_area, 'persona': id_persona},
    )
    return await cursor.fetchone()


async def buscar(con: AsyncConnection, id_movimiento: UUID) -> dict | None:
    """AR-03. Un movimiento con su rol vigente (el de su corrección más reciente, O-25)."""
    cursor = await con.execute(
        """SELECT m.*, coalesce((SELECT c.rol FROM movimiento c WHERE c.id_movimiento_corregido = m.id_movimiento
                                 ORDER BY c.fecha_hora DESC, c.fecha_registro DESC LIMIT 1), m.rol) AS rol_vigente
           FROM movimiento m WHERE m.id_movimiento = %s""",
        (id_movimiento,),
    )
    return await cursor.fetchone()


async def roles_vigentes_del_grupo(con: AsyncConnection, id_grupo_turno: UUID) -> dict[UUID, str]:
    """AR-03. Rol vigente de cada turno de un grupo (RI-10 sobre los roles corregidos)."""
    cursor = await con.execute(
        """SELECT m.id_movimiento,
                  coalesce((SELECT c.rol FROM movimiento c WHERE c.id_movimiento_corregido = m.id_movimiento
                            ORDER BY c.fecha_hora DESC, c.fecha_registro DESC LIMIT 1), m.rol) AS rol
           FROM movimiento m WHERE m.id_grupo_turno = %s AND m.tipo = 'turno'""",
        (id_grupo_turno,),
    )
    return {f['id_movimiento']: f['rol'] for f in await cursor.fetchall()}


async def detalle(con: AsyncConnection, ids: list[UUID]) -> dict[UUID, dict]:
    """AR-03. Movimientos con los nombres que muestra el recorrido; los orígenes de una atracción van juntos."""
    cursor = await con.execute(
        """SELECT m.id_movimiento AS id, m.tipo, m.id_movimiento_corregido AS id_corrige, m.id_grupo_turno,
                  (SELECT string_agg(a.nombre, ' y ' ORDER BY x.orden)
                   FROM (SELECT m.id_area_origen AS id_area, 0 AS orden
                         UNION ALL SELECT o.id_area, 1 FROM movimiento_origen o
                         WHERE o.id_movimiento = m.id_movimiento) x
                   JOIN area a ON a.id_area = x.id_area) AS area_origen,
                  ad.nombre AS area_destino, m.rol, m.instruccion, m.motivo, m.forma_conclusion,
                  p.nombre AS persona, t.nombre AS titular_al_turnar, m.fecha_hora
           FROM movimiento m
           JOIN area ad ON ad.id_area = m.id_area_destino
           JOIN persona p ON p.id_persona = m.id_persona
           LEFT JOIN persona t ON t.id_persona = m.id_titular_al_turnar
           WHERE m.id_movimiento = ANY(%s)""",
        (ids,),
    )
    return {f['id']: f for f in await cursor.fetchall()}
