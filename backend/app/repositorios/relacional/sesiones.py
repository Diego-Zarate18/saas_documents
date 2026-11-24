"""AR-08. Cuentas y sesiones (D-49, D-107)."""

from uuid import UUID

from psycopg import AsyncConnection


async def buscar_cuenta(con: AsyncConnection, correo: str) -> dict | None:
    """AR-08. Persona con usuario por correo (sin distinguir mayúsculas)."""
    cursor = await con.execute(
        """SELECT p.id_persona, p.nombre, p.activa, p.id_area, a.nombre AS nombre_area, u.rol, u.hash_contrasena,
                  u.bloqueado_hasta > now() AS bloqueado
           FROM persona p
           JOIN usuario u ON u.id_persona = p.id_persona
           LEFT JOIN area a ON a.id_area = p.id_area
           WHERE lower(p.correo) = lower(%s)
           FOR UPDATE OF u""",
        (correo,),
    )
    return await cursor.fetchone()


async def registrar_fallo(con: AsyncConnection, id_persona: UUID, maximo: int, minutos_bloqueo: int) -> None:
    """AR-08. Suma un intento fallido; al llegar al máximo bloquea la cuenta y reinicia el contador (D-107)."""
    await con.execute(
        """UPDATE usuario
           SET bloqueado_hasta = CASE WHEN intentos_fallidos + 1 >= %(maximo)s
                                      THEN now() + make_interval(mins => %(minutos)s) ELSE bloqueado_hasta END,
               intentos_fallidos = CASE WHEN intentos_fallidos + 1 >= %(maximo)s THEN 0 ELSE intentos_fallidos + 1 END
           WHERE id_persona = %(id)s""",
        {'maximo': maximo, 'minutos': minutos_bloqueo, 'id': id_persona},
    )


async def reiniciar_intentos(con: AsyncConnection, id_persona: UUID) -> None:
    """AR-08. Un inicio correcto reinicia el contador (D-107)."""
    await con.execute(
        'UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_persona = %s', (id_persona,)
    )


async def crear_sesion(con: AsyncConnection, huella: bytes, id_persona: UUID) -> None:
    """AR-08. Guarda solo la huella SHA-256 del código de la cookie."""
    await con.execute('INSERT INTO sesion (huella, id_persona) VALUES (%s, %s)', (huella, id_persona))


async def validar_sesion(con: AsyncConnection, huella: bytes, minutos: int) -> dict | None:
    """AR-08. Sesión vigente de una persona activa con rol; renueva la última actividad (O-38)."""
    cursor = await con.execute(
        """UPDATE sesion s SET ultima_actividad = now()
           FROM usuario u
           JOIN persona p ON p.id_persona = u.id_persona
           LEFT JOIN area a ON a.id_area = p.id_area
           WHERE s.huella = %s AND s.id_persona = u.id_persona AND s.revocada_en IS NULL AND p.activa
             AND s.ultima_actividad > now() - make_interval(mins => %s)
           RETURNING p.id_persona, p.nombre, u.rol, p.id_area, a.nombre AS nombre_area""",
        (huella, minutos),
    )
    return await cursor.fetchone()


async def revocar_sesion(con: AsyncConnection, huella: bytes) -> None:
    """AR-08. O-37: la sesión queda revocada."""
    await con.execute('UPDATE sesion SET revocada_en = now() WHERE huella = %s AND revocada_en IS NULL', (huella,))


async def ids_areas(con: AsyncConnection) -> list[UUID]:
    """Todas las áreas: las ven oficialía y dirección (D-29)."""
    cursor = await con.execute('SELECT id_area FROM area')
    return [fila['id_area'] for fila in await cursor.fetchall()]
