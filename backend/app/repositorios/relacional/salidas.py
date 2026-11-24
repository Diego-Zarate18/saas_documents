"""AR-01, AR-11. Salidas externas y sus acuses (O-20, O-21, D-58, D-101)."""

from uuid import UUID

from psycopg import AsyncConnection


async def insertar_salida(con: AsyncConnection, salida: dict) -> None:
    """AR-01. Documento de salida: emisor interno, destinatario externo y número (D-101)."""
    await con.execute(
        """INSERT INTO documento (id_documento, sentido, tipo, numero_emisor, id_area_emisora, id_actor_destinatario,
                                  fecha_documento, sintesis, id_responde_a, fecha_registro)
           VALUES (%(id_documento)s, 'salida', %(tipo)s, %(numero_emisor)s, %(id_area_emisora)s,
                   %(id_actor_destinatario)s, %(fecha_documento)s, %(sintesis)s, %(id_responde_a)s,
                   %(fecha_registro)s)""",
        salida,
    )


async def listar(con: AsyncConnection, acuse: str | None, limite: int, desde: int) -> list[dict]:
    """AR-11. Salidas con su acuse; la más reciente primero."""
    cursor = await con.execute(
        """SELECT d.id_documento AS id, f.folio, d.sintesis, x.nombre AS destinatario, d.id_responde_a,
                  fr.folio AS folio_responde_a, a.nombre AS area_emisora, d.fecha_registro AS fecha_hora,
                  ac.fecha_hora AS acuse_fecha_hora, ac.recibio AS acuse_recibio, count(*) OVER () AS total
           FROM documento d
           JOIN folio f ON f.id_documento = d.id_documento
           JOIN area a ON a.id_area = d.id_area_emisora
           JOIN actor_externo x ON x.id_actor = d.id_actor_destinatario
           LEFT JOIN folio fr ON fr.id_documento = d.id_responde_a
           LEFT JOIN acuse ac ON ac.id_documento = d.id_documento
           WHERE d.sentido = 'salida'
             AND (%(acuse)s::text IS NULL OR (%(acuse)s = 'con') = (ac.id_documento IS NOT NULL))
           ORDER BY d.fecha_registro DESC, f.folio DESC
           LIMIT %(limite)s OFFSET %(desde)s""",
        {'acuse': acuse, 'limite': limite, 'desde': desde},
    )
    return await cursor.fetchall()


async def bloquear_salida(con: AsyncConnection, id_documento: UUID) -> dict | None:
    """AR-11. La salida con su fila bloqueada y si ya tiene acuse."""
    cursor = await con.execute(
        """SELECT d.id_documento, EXISTS (SELECT 1 FROM acuse a WHERE a.id_documento = d.id_documento) AS con_acuse
           FROM documento d WHERE d.id_documento = %s AND d.sentido = 'salida' FOR UPDATE""",
        (id_documento,),
    )
    return await cursor.fetchone()


async def insertar_acuse(con: AsyncConnection, id_documento: UUID, fecha_hora, recibio: str, id_persona: UUID):
    """AR-11. O-21: un acuse por salida; el disparador rechaza el de un documento recibido."""
    await con.execute(
        'INSERT INTO acuse (id_documento, fecha_hora, recibio, id_persona) VALUES (%s, %s, %s, %s)',
        (id_documento, fecha_hora, recibio, id_persona),
    )


async def acuses_del_area(con: AsyncConnection, id_area: UUID) -> list[dict]:
    """AR-11. D-58: salidas con acuse cuyo documento de origen está pendiente en el área como responsable."""
    cursor = await con.execute(
        """SELECT s.id_documento AS id_salida, fs.folio AS folio_salida, d.id_documento, fd.folio AS folio_documento,
                  ac.recibio AS acusado_por
           FROM documento s
           JOIN acuse ac ON ac.id_documento = s.id_documento
           JOIN folio fs ON fs.id_documento = s.id_documento
           JOIN documento d ON d.id_documento = s.id_responde_a
           JOIN folio fd ON fd.id_documento = d.id_documento
           JOIN pendiente p ON p.id_documento = d.id_documento AND p.id_area = %s AND p.rol = 'responsable'
           WHERE s.sentido = 'salida'
           ORDER BY ac.fecha_hora DESC, fs.folio DESC""",
        (id_area,),
    )
    return await cursor.fetchall()
