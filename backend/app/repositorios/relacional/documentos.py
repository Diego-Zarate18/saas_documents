"""AR-01, AR-02. Documento, folio y contador de folios (D-21, D-27, D-101)."""

from datetime import date
from uuid import UUID

from psycopg import AsyncConnection


async def area_activa_por_nombre(con: AsyncConnection, nombre: str) -> UUID | None:
    cursor = await con.execute('SELECT id_area FROM area WHERE activa AND nombre = %s', (nombre,))
    fila = await cursor.fetchone()
    return fila['id_area'] if fila else None


async def actor_activo_por_nombre(con: AsyncConnection, nombre: str) -> UUID | None:
    cursor = await con.execute('SELECT id_actor FROM actor_externo WHERE activo AND nombre = %s', (nombre,))
    fila = await cursor.fetchone()
    return fila['id_actor'] if fila else None


async def siglas(con: AsyncConnection, id_area: UUID) -> str:
    cursor = await con.execute('SELECT siglas FROM area WHERE id_area = %s', (id_area,))
    return (await cursor.fetchone())['siglas']


async def reservar_consecutivo(con: AsyncConnection, id_area: UUID, anio: int) -> int:
    """AR-01. Siguiente consecutivo del área y año. El UPDATE bloquea la fila del contador hasta el fin de la
    transacción: los registros simultáneos esperan su turno y, si la transacción falla, el número no se consume."""
    await con.execute(
        'INSERT INTO contador_folio (id_area, anio) VALUES (%s, %s) ON CONFLICT DO NOTHING', (id_area, anio)
    )
    cursor = await con.execute(
        'UPDATE contador_folio SET ultimo = ultimo + 1 WHERE id_area = %s AND anio = %s RETURNING ultimo',
        (id_area, anio),
    )
    return (await cursor.fetchone())['ultimo']


async def consecutivo_siguiente(con: AsyncConnection, id_area: UUID, anio: int) -> int:
    """AR-01. Estimación sin reservar (vista previa de V-03)."""
    cursor = await con.execute('SELECT ultimo FROM contador_folio WHERE id_area = %s AND anio = %s', (id_area, anio))
    fila = await cursor.fetchone()
    return (fila['ultimo'] if fila else 0) + 1


async def insertar_documento(con: AsyncConnection, documento: dict) -> None:
    """AR-02. Inserta el documento; el índice ux_documento_duplicado rechaza un duplicado (D-27)."""
    await con.execute(
        """INSERT INTO documento (id_documento, sentido, tipo, numero_emisor, id_area_emisora, id_actor_emisor,
                                  fecha_documento, sintesis, confidencial, posible_duplicado, extemporaneo,
                                  canal_inicial, fecha_recepcion_inicial, fecha_recepcion_oficial, fecha_registro)
           VALUES (%(id_documento)s, 'entrada', %(tipo)s, %(numero_emisor)s, %(id_area_emisora)s,
                   %(id_actor_emisor)s, %(fecha_documento)s, %(sintesis)s, %(confidencial)s, %(posible_duplicado)s,
                   %(extemporaneo)s, %(canal_inicial)s, %(fecha_recepcion_inicial)s, %(fecha_recepcion_oficial)s,
                   %(fecha_registro)s)""",
        documento,
    )


async def insertar_folio(con: AsyncConnection, folio: str, id_documento: UUID, id_area: UUID, anio: int, n: int):
    """AR-01. Folio del documento (inmutable)."""
    await con.execute(
        'INSERT INTO folio (folio, id_documento, id_area, anio, consecutivo) VALUES (%s, %s, %s, %s, %s)',
        (folio, id_documento, id_area, anio, n),
    )


async def buscar_duplicado(
    con: AsyncConnection, numero: str, id_area: UUID | None, id_actor: UUID | None, fecha: date
) -> dict | None:
    """AR-02. El documento ya registrado con el mismo número, emisor y año del documento (D-27)."""
    cursor = await con.execute(
        """SELECT d.id_documento AS id, f.folio, d.numero_emisor, coalesce(a.nombre, x.nombre) AS emisor,
                  d.canal_inicial AS canal, d.fecha_recepcion_inicial AS fecha_recepcion
           FROM documento d
           JOIN folio f ON f.id_documento = d.id_documento
           LEFT JOIN area a ON a.id_area = d.id_area_emisora
           LEFT JOIN actor_externo x ON x.id_actor = d.id_actor_emisor
           WHERE d.sentido = 'entrada' AND d.numero_emisor = %s
             AND coalesce(d.id_area_emisora, d.id_actor_emisor) = coalesce(%s, %s)
             AND EXTRACT(YEAR FROM d.fecha_documento) = %s""",
        (numero, id_area, id_actor, fecha.year),
    )
    return await cursor.fetchone()


async def bloquear_documento(con: AsyncConnection, id_documento: UUID) -> dict | None:
    """AR-03. Estado del documento con la fila bloqueada: los movimientos de un documento se escriben de uno en uno."""
    cursor = await con.execute(
        "SELECT id_documento, estado FROM documento WHERE id_documento = %s AND sentido = 'entrada' FOR UPDATE",
        (id_documento,),
    )
    return await cursor.fetchone()
