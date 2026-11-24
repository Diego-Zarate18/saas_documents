"""AR-09, AR-10. Administración: áreas sin ciclos (D-47), personas y usuarios (O-34) y actores externos (O-35)."""

from uuid import UUID

from psycopg import AsyncConnection

# ── Áreas ──────────────────────────────────────────────────────────────────────


async def bloquear_areas(con: AsyncConnection) -> None:
    """AR-09. D-47: la revisión de ciclos se hace con la tabla bloqueada frente a otros cambios de estructura."""
    await con.execute('LOCK TABLE area IN SHARE ROW EXCLUSIVE MODE')


async def area(con: AsyncConnection, id_area: UUID) -> dict | None:
    cursor = await con.execute(
        """SELECT a.*, EXISTS (SELECT 1 FROM folio f WHERE f.id_area = a.id_area) AS con_folios
           FROM area a WHERE a.id_area = %s""",
        (id_area,),
    )
    return await cursor.fetchone()


async def area_publica(con: AsyncConnection, id_area: UUID) -> dict:
    cursor = await con.execute(
        """SELECT a.id_area AS id, a.nombre, a.siglas, a.id_titular, t.nombre AS nombre_titular
           FROM area a LEFT JOIN persona t ON t.id_persona = a.id_titular WHERE a.id_area = %s""",
        (id_area,),
    )
    return await cursor.fetchone()


async def crearia_ciclo(con: AsyncConnection, id_area: UUID, id_padre: UUID) -> bool:
    """AR-09. Sube desde el padre propuesto con una consulta recursiva: si llega al área, habría ciclo."""
    cursor = await con.execute(
        """WITH RECURSIVE sube AS (
             SELECT id_area, id_area_padre FROM area WHERE id_area = %(padre)s
             UNION
             SELECT a.id_area, a.id_area_padre FROM area a JOIN sube s ON a.id_area = s.id_area_padre
           )
           SELECT EXISTS (SELECT 1 FROM sube WHERE id_area = %(id)s) AS ciclo""",
        {'padre': id_padre, 'id': id_area},
    )
    return (await cursor.fetchone())['ciclo']


async def siglas_ocupadas(con: AsyncConnection, siglas: str, excepto: UUID | None) -> bool:
    cursor = await con.execute(
        'SELECT EXISTS (SELECT 1 FROM area WHERE siglas = %s AND id_area IS DISTINCT FROM %s) AS ocupadas',
        (siglas, excepto),
    )
    return (await cursor.fetchone())['ocupadas']


async def guardar_area(con: AsyncConnection, datos: dict) -> None:
    """AR-09. Alta o cambio de un área (las siglas con folios las protege también un disparador, D-61)."""
    await con.execute(
        """INSERT INTO area (id_area, siglas, nombre, id_area_padre, id_titular)
           VALUES (%(id_area)s, %(siglas)s, %(nombre)s, %(id_padre)s, %(id_titular)s)
           ON CONFLICT (id_area) DO UPDATE
           SET siglas = EXCLUDED.siglas, nombre = EXCLUDED.nombre, id_area_padre = EXCLUDED.id_area_padre,
               id_titular = EXCLUDED.id_titular""",
        datos,
    )


async def pendientes_del_area(con: AsyncConnection, id_area: UUID) -> int:
    cursor = await con.execute('SELECT count(*) AS n FROM pendiente WHERE id_area = %s', (id_area,))
    return (await cursor.fetchone())['n']


async def hijas_activas(con: AsyncConnection, id_area: UUID) -> int:
    cursor = await con.execute('SELECT count(*) AS n FROM area WHERE id_area_padre = %s AND activa', (id_area,))
    return (await cursor.fetchone())['n']


async def desactivar_area(con: AsyncConnection, id_area: UUID) -> None:
    await con.execute('UPDATE area SET activa = false WHERE id_area = %s', (id_area,))


async def dejar_vacante(con: AsyncConnection, id_persona: UUID, salvo_area: UUID | None = None) -> None:
    """O-34: el área de la que era titular queda vacante (D-31)."""
    await con.execute(
        'UPDATE area SET id_titular = NULL WHERE id_titular = %s AND id_area IS DISTINCT FROM %s',
        (id_persona, salvo_area),
    )


# ── Personas y usuarios ────────────────────────────────────────────────────────

PERSONA = """SELECT p.id_persona AS id, p.nombre, p.correo, p.id_area, a.nombre AS nombre_area, u.rol, p.activa
             FROM persona p LEFT JOIN usuario u ON u.id_persona = p.id_persona
             LEFT JOIN area a ON a.id_area = p.id_area"""


async def personas(con: AsyncConnection) -> list[dict]:
    cursor = await con.execute(PERSONA + ' ORDER BY p.id_persona')
    return await cursor.fetchall()


async def persona(con: AsyncConnection, id_persona: UUID) -> dict | None:
    cursor = await con.execute(PERSONA + ' WHERE p.id_persona = %s', (id_persona,))
    return await cursor.fetchone()


async def correo_ocupado(con: AsyncConnection, correo: str, excepto: UUID | None) -> bool:
    cursor = await con.execute(
        'SELECT EXISTS (SELECT 1 FROM persona WHERE lower(correo) = %s AND id_persona IS DISTINCT FROM %s) AS hay',
        (correo, excepto),
    )
    return (await cursor.fetchone())['hay']


async def guardar_persona(con: AsyncConnection, datos: dict, hash_inicial: str) -> None:
    """AR-10. Persona y su usuario; una cuenta nueva recibe la contraseña inicial (ya cifrada)."""
    await con.execute(
        """INSERT INTO persona (id_persona, nombre, correo, id_area)
           VALUES (%(id)s, %(nombre)s, %(correo)s, %(id_area)s)
           ON CONFLICT (id_persona) DO UPDATE
           SET nombre = EXCLUDED.nombre, correo = EXCLUDED.correo, id_area = EXCLUDED.id_area""",
        datos,
    )
    await con.execute(
        """INSERT INTO usuario (id_persona, rol, hash_contrasena) VALUES (%s, %s, %s)
           ON CONFLICT (id_persona) DO UPDATE SET rol = EXCLUDED.rol""",
        (datos['id'], datos['rol'], hash_inicial),
    )


async def dar_de_baja(con: AsyncConnection, id_persona: UUID) -> None:
    """AR-10. Baja lógica (conserva sus movimientos) y revoca sus sesiones."""
    await con.execute('UPDATE persona SET activa = false WHERE id_persona = %s', (id_persona,))
    await con.execute(
        'UPDATE sesion SET revocada_en = now() WHERE id_persona = %s AND revocada_en IS NULL', (id_persona,)
    )


# ── Actores externos ───────────────────────────────────────────────────────────

ACTOR = """SELECT x.id_actor AS id, x.nombre, x.tipo, x.correo, x.telefono, x.activo,
                  (SELECT count(*) FROM documento d
                   WHERE d.id_actor_emisor = x.id_actor OR d.id_actor_destinatario = x.id_actor) AS documentos
           FROM actor_externo x"""


async def actores(con: AsyncConnection) -> list[dict]:
    cursor = await con.execute(ACTOR + ' ORDER BY x.id_actor')
    return await cursor.fetchall()


async def actor(con: AsyncConnection, id_actor: UUID) -> dict | None:
    cursor = await con.execute(ACTOR + ' WHERE x.id_actor = %s', (id_actor,))
    return await cursor.fetchone()


async def nombre_de_actor_ocupado(con: AsyncConnection, nombre: str, excepto: UUID | None) -> bool:
    cursor = await con.execute(
        'SELECT EXISTS (SELECT 1 FROM actor_externo WHERE lower(nombre) = lower(%s) AND id_actor IS DISTINCT FROM %s)'
        ' AS hay',
        (nombre, excepto),
    )
    return (await cursor.fetchone())['hay']


async def guardar_actor(con: AsyncConnection, datos: dict) -> None:
    await con.execute(
        """INSERT INTO actor_externo (id_actor, nombre, tipo, correo, telefono)
           VALUES (%(id)s, %(nombre)s, %(tipo)s, %(correo)s, %(telefono)s)
           ON CONFLICT (id_actor) DO UPDATE
           SET nombre = EXCLUDED.nombre, tipo = EXCLUDED.tipo, correo = EXCLUDED.correo,
               telefono = EXCLUDED.telefono""",
        datos,
    )


async def desactivar_actor(con: AsyncConnection, id_actor: UUID) -> None:
    await con.execute('UPDATE actor_externo SET activo = false WHERE id_actor = %s', (id_actor,))
