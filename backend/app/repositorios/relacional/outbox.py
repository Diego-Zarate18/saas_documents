"""AR-04, AR-05. Outbox: se encola en la misma transacción que el registro oficial (D-13) y lo consume un solo
proceso en orden de id (D-48)."""

from uuid import UUID

from psycopg import AsyncConnection
from psycopg.types.json import Jsonb


async def encolar(con: AsyncConnection, destino: str, tipo_evento: str, id_entidad: UUID, datos: dict) -> None:
    """AR-04. Un evento por destino con todo lo que la réplica necesita. `datos.id_documento` ordena la espera."""
    await con.execute(
        'INSERT INTO outbox (destino, tipo_evento, id_entidad, datos) VALUES (%s, %s, %s, %s)',
        (destino, tipo_evento, id_entidad, Jsonb(datos)),
    )


async def tomar_lote(con: AsyncConnection, limite: int) -> list[dict]:
    """AR-05. Pendientes listos, en orden de id, con FOR UPDATE SKIP LOCKED. Un registro espera mientras haya otro
    anterior del mismo documento y destino sin enviar (el orden importa para SIGUIENTE)."""
    cursor = await con.execute(
        """SELECT o.id, o.destino, o.tipo_evento, o.id_entidad, o.datos, o.intentos
           FROM outbox o
           WHERE o.estado = 'pendiente' AND o.proximo_intento <= now()
             AND NOT EXISTS (
               SELECT 1 FROM outbox a
               WHERE a.id < o.id AND a.destino = o.destino AND a.estado <> 'enviado'
                 AND a.datos->>'id_documento' = o.datos->>'id_documento'
             )
           ORDER BY o.id
           LIMIT %s
           FOR UPDATE SKIP LOCKED""",
        (limite,),
    )
    return await cursor.fetchall()


async def marcar_enviado(con: AsyncConnection, id_evento: int) -> None:
    """AR-05. El destino ya tiene el evento."""
    await con.execute("UPDATE outbox SET estado = 'enviado', enviado_en = now() WHERE id = %s", (id_evento,))


async def marcar_fallo(con: AsyncConnection, id_evento: int, error: str, maximo: int) -> None:
    """AR-05. Reintento con espera creciente (2^intentos segundos); al llegar al máximo queda en `error`."""
    await con.execute(
        """UPDATE outbox
           SET intentos = intentos + 1,
               ultimo_error = %(error)s,
               proximo_intento = now() + make_interval(secs => power(2, intentos + 1)),
               estado = CASE WHEN intentos + 1 >= %(maximo)s THEN 'error' ELSE 'pendiente' END
           WHERE id = %(id)s""",
        {'error': error[:1000], 'maximo': maximo, 'id': id_evento},
    )


async def conteo(con: AsyncConnection) -> dict[str, int]:
    """AR-05. Pendientes y con error (para /api/salud)."""
    cursor = await con.execute(
        "SELECT count(*) FILTER (WHERE estado = 'pendiente') AS pendientes, "
        "count(*) FILTER (WHERE estado = 'error') AS errores FROM outbox"
    )
    return await cursor.fetchone()
