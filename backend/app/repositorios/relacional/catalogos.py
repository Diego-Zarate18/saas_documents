"""AR-10. Catálogos (O-31) y estructura organizacional (O-32)."""

from psycopg import AsyncConnection, sql

TABLAS_CATALOGO = {'tipo_documento', 'motivo_devolucion', 'forma_conclusion'}


async def claves_activas(con: AsyncConnection, tabla: str) -> set[str]:
    """AR-10. Claves activas de un catálogo administrable."""
    if tabla not in TABLAS_CATALOGO:
        raise ValueError(tabla)
    cursor = await con.execute(sql.SQL('SELECT clave FROM {} WHERE activo').format(sql.Identifier(tabla)))
    return {fila['clave'] for fila in await cursor.fetchall()}


async def actores_activos(con: AsyncConnection) -> list[dict]:
    """AR-10. Actores externos activos, para captura (RI-06)."""
    cursor = await con.execute('SELECT id_actor AS id, nombre, tipo FROM actor_externo WHERE activo ORDER BY id_actor')
    return await cursor.fetchall()


async def areas(con: AsyncConnection, solo_activas: bool) -> list[dict]:
    """AR-10. Áreas con su titular (D-31: nulo si está vacante)."""
    cursor = await con.execute(
        """SELECT a.id_area AS id, a.nombre, a.siglas, a.id_titular, t.nombre AS nombre_titular,
                  a.id_area_padre AS id_padre, a.activa,
                  EXISTS (SELECT 1 FROM folio f WHERE f.id_area = a.id_area) AS con_folios,
                  (SELECT count(*) FROM pendiente p WHERE p.id_area = a.id_area) AS pendientes
           FROM area a
           LEFT JOIN persona t ON t.id_persona = a.id_titular
           WHERE a.activa OR NOT %s
           ORDER BY a.id_area""",
        (solo_activas,),
    )
    return await cursor.fetchall()


async def personas_activas(con: AsyncConnection) -> list[dict]:
    """AR-10. Personas activas con su área y rol (O-32)."""
    cursor = await con.execute(
        """SELECT p.id_persona AS id, p.nombre, u.rol, p.id_area
           FROM persona p LEFT JOIN usuario u ON u.id_persona = p.id_persona
           WHERE p.activa AND p.id_area IS NOT NULL
           ORDER BY p.id_persona"""
    )
    return await cursor.fetchall()
