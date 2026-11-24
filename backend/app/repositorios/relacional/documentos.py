"""AR-01, AR-02. Documento, folio y contador de folios (D-21, D-27, D-101)."""

from datetime import date
from uuid import UUID

from psycopg import AsyncConnection, sql


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


async def registro(con: AsyncConnection, id_documento: UUID) -> dict | None:
    """AR-07. Datos de registro de un documento recibido para la ficha (O-11)."""
    cursor = await con.execute(
        """SELECT d.id_documento AS id, f.folio, d.sintesis AS asunto, d.tipo, d.estado, d.confidencial,
                  d.posible_duplicado, d.extemporaneo, d.numero_emisor, coalesce(a.nombre, x.nombre) AS emisor,
                  CASE WHEN d.id_area_emisora IS NULL THEN 'externo' ELSE 'area' END AS tipo_emisor,
                  d.fecha_documento, d.canal_inicial AS canal, d.fecha_recepcion_inicial AS fecha_recepcion,
                  d.canal_segunda, d.fecha_recepcion_segunda, d.fecha_recepcion_oficial AS fecha_oficial,
                  CASE WHEN 'papel' IN (d.canal_inicial, d.canal_segunda) THEN 'sello' ELSE 'correo' END
                    AS origen_fecha_oficial,
                  d.sintesis
           FROM documento d
           JOIN folio f ON f.id_documento = d.id_documento
           LEFT JOIN area a ON a.id_area = d.id_area_emisora
           LEFT JOIN actor_externo x ON x.id_actor = d.id_actor_emisor
           WHERE d.id_documento = %s AND d.sentido = 'entrada'""",
        (id_documento,),
    )
    return await cursor.fetchone()


async def ubicacion(con: AsyncConnection, id_documento: UUID) -> list[dict]:
    """AR-06. Una fila por área que tiene el documento pendiente (D-42), con cómo llegó."""
    cursor = await con.execute(
        """SELECT a.nombre AS area, p.rol, p.fecha_hora AS desde,
                  (now() AT TIME ZONE 'America/Mexico_City')::date
                    - (p.fecha_hora AT TIME ZONE 'America/Mexico_City')::date AS antiguedad_dias,
                  m.tipo AS tipo_movimiento, mo.nombre AS motivo, ao.nombre AS area_origen, d.canal_inicial
           FROM pendiente p
           JOIN area a ON a.id_area = p.id_area
           JOIN movimiento m ON m.id_movimiento = p.id_movimiento
           JOIN documento d ON d.id_documento = p.id_documento
           LEFT JOIN area ao ON ao.id_area = m.id_area_origen
           LEFT JOIN motivo_devolucion mo ON mo.clave = m.motivo
           WHERE p.id_documento = %s
           ORDER BY p.fecha_hora""",
        (id_documento,),
    )
    return await cursor.fetchall()


async def resumen(con: AsyncConnection, ids: list[UUID]) -> dict[UUID, dict]:
    """AR-07. Folio, síntesis, estado y sentido de varios documentos (relaciones, conclusiones)."""
    cursor = await con.execute(
        """SELECT d.id_documento AS id, f.folio, d.sintesis, d.estado, d.sentido, d.confidencial,
                  d.fecha_registro, d.id_responde_a
           FROM documento d JOIN folio f ON f.id_documento = d.id_documento
           WHERE d.id_documento = ANY(%s)""",
        (ids,),
    )
    return {f['id']: f for f in await cursor.fetchall()}


async def bloquear_cualquiera(con: AsyncConnection, id_documento: UUID) -> dict | None:
    """AR-03. Documento recibido con su fila bloqueada y los datos que validan O-05, O-19, O-24 y O-26."""
    cursor = await con.execute(
        """SELECT d.*, f.folio FROM documento d JOIN folio f ON f.id_documento = d.id_documento
           WHERE d.id_documento = %s AND d.sentido = 'entrada' FOR UPDATE OF d""",
        (id_documento,),
    )
    return await cursor.fetchone()


async def actualizar_estado(con: AsyncConnection, id_documento: UUID, cambios: dict) -> None:
    """AR-07. Cambia el estado y los datos que lo acompañan; el documento nunca se borra (D-20)."""
    permitidas = {'estado', 'motivo_cancelacion', 'duplicado_de', 'posible_duplicado'}
    if not cambios or not set(cambios) <= permitidas:
        raise ValueError(cambios)
    await con.execute(
        sql.SQL('UPDATE documento SET {} WHERE id_documento = %(id)s').format(
            sql.SQL(', ').join(sql.SQL('{} = {}').format(sql.Identifier(c), sql.Placeholder(c)) for c in cambios)
        ),
        {**cambios, 'id': id_documento},
    )


async def responder_con_salida(con: AsyncConnection, id_salida: UUID, id_documento: UUID) -> None:
    """AR-07. Una salida responde al documento (D-101)."""
    await con.execute('UPDATE documento SET id_responde_a = %s WHERE id_documento = %s', (id_documento, id_salida))


async def segunda_recepcion(con: AsyncConnection, id_documento: UUID, canal: str, fecha, fecha_oficial) -> None:
    """AR-07. O-19: la segunda recepción por el otro canal; en papel fija la fecha oficial (D-28)."""
    await con.execute(
        """UPDATE documento SET canal_segunda = %s, fecha_recepcion_segunda = %s,
                                fecha_recepcion_oficial = coalesce(%s, fecha_recepcion_oficial)
           WHERE id_documento = %s""",
        (canal, fecha, fecha_oficial, id_documento),
    )


async def posibles_duplicados(con: AsyncConnection, limite: int, desde: int) -> list[dict]:
    """AR-02. Documentos marcados como posible duplicado y en trámite, folio descendente (O-26)."""
    cursor = await con.execute(
        """SELECT d.id_documento AS id, f.folio, d.sintesis AS asunto,
                  CASE WHEN d.numero_emisor IS NULL THEN 'numero' ELSE 'fecha' END AS falta, count(*) OVER () AS total
           FROM documento d JOIN folio f ON f.id_documento = d.id_documento
           WHERE d.posible_duplicado AND d.estado = 'en_tramite' AND d.sentido = 'entrada'
           ORDER BY f.folio DESC LIMIT %s OFFSET %s""",
        (limite, desde),
    )
    return await cursor.fetchall()


COMPARADO = """
SELECT d.id_documento AS id, f.folio, d.numero_emisor, coalesce(a.nombre, x.nombre) AS emisor, d.fecha_documento,
       d.canal_inicial AS canal, d.fecha_recepcion_inicial AS fecha_recepcion, d.sintesis, d.estado,
       (SELECT ap.nombre FROM pendiente p JOIN area ap ON ap.id_area = p.id_area
        WHERE p.id_documento = d.id_documento AND p.rol = 'responsable' ORDER BY p.fecha_hora LIMIT 1) AS ubicacion
FROM documento d
JOIN folio f ON f.id_documento = d.id_documento
LEFT JOIN area a ON a.id_area = d.id_area_emisora
LEFT JOIN actor_externo x ON x.id_actor = d.id_actor_emisor
"""


async def comparado(con: AsyncConnection, id_documento: UUID) -> dict | None:
    """AR-02. Un lado de la comparación de V-14."""
    cursor = await con.execute(sql.SQL(COMPARADO + 'WHERE d.id_documento = %s'), (id_documento,))
    return await cursor.fetchone()


async def candidato_duplicado(con: AsyncConnection, marcado: dict) -> dict | None:
    """AR-02. El último documento no cancelado del mismo emisor registrado antes, con el mismo número si el marcado
    lo trae o con la misma fecha del documento (decisión de T-02b, Apéndice A)."""
    cursor = await con.execute(
        sql.SQL(
            COMPARADO
            + """WHERE d.sentido = 'entrada' AND d.estado <> 'cancelado' AND d.id_documento <> %(id)s
                   AND coalesce(d.id_area_emisora, d.id_actor_emisor) = %(emisor)s
                   AND (d.fecha_recepcion_inicial, f.folio) < (%(recepcion)s, %(folio)s)
                   AND ((%(numero)s::text IS NOT NULL AND d.numero_emisor = %(numero)s)
                        OR (%(fecha)s::date IS NOT NULL AND d.fecha_documento = %(fecha)s))
                 ORDER BY d.fecha_recepcion_inicial DESC, f.folio DESC LIMIT 1"""
        ),
        {
            'id': marcado['id_documento'],
            'emisor': marcado['id_area_emisora'] or marcado['id_actor_emisor'],
            'recepcion': marcado['fecha_recepcion_inicial'],
            'folio': marcado['folio'],
            'numero': marcado['numero_emisor'],
            'fecha': marcado['fecha_documento'],
        },
    )
    return await cursor.fetchone()
