"""AR-06. Bandeja de pendientes de un área (D-42, O-14), calculada sobre la vista `pendiente`."""

from uuid import UUID

from psycopg import AsyncConnection


async def listar(
    con: AsyncConnection,
    id_area: UUID,
    tipo: str | None,
    antiguedad_minima: int | None,
    limite: int,
    desde: int,
    id_persona: UUID,
    mi_area: UUID | None,
) -> list[dict]:
    """AR-06. Pendientes del área; menor antigüedad primero y, a igual antigüedad, folio descendente.
    Cada fila trae `total` (filas antes de paginar) y lo que necesita la visibilidad del contenido (D-29): si quien
    consulta tiene un movimiento en el documento y si su área está involucrada."""
    cursor = await con.execute(
        """SELECT *, count(*) OVER () AS total FROM (
             SELECT p.id_documento, f.folio, d.sintesis AS asunto, d.tipo, coalesce(ae.nombre, ax.nombre) AS emisor,
                    p.rol,
                    (now() AT TIME ZONE 'America/Mexico_City')::date
                      - (p.fecha_hora AT TIME ZONE 'America/Mexico_City')::date AS antiguedad_dias,
                    t.nombre AS titular_al_turnar,
                    (t.id_persona IS NOT NULL AND t.id_area IS NULL) AS titular_ya_no_adscrito,
                    m.tipo AS tipo_movimiento, mo.nombre AS motivo, ao.nombre AS area_origen, ad.nombre AS area_destino,
                    d.canal_inicial,
                    d.posible_duplicado, d.confidencial,
                    EXISTS (SELECT 1 FROM movimiento x WHERE x.id_documento = p.id_documento
                              AND (x.id_persona = %(persona)s OR x.id_titular_al_turnar = %(persona)s))
                      AS persona_involucrada,
                    EXISTS (SELECT 1 FROM movimiento x
                            LEFT JOIN movimiento_origen xo ON xo.id_movimiento = x.id_movimiento
                            WHERE x.id_documento = p.id_documento
                              AND (x.id_area_origen = %(mi_area)s OR x.id_area_destino = %(mi_area)s
                                   OR xo.id_area = %(mi_area)s)) AS area_involucrada
             FROM pendiente p
             JOIN documento d ON d.id_documento = p.id_documento
             JOIN folio f ON f.id_documento = d.id_documento
             JOIN movimiento m ON m.id_movimiento = p.id_movimiento
             LEFT JOIN area ae ON ae.id_area = d.id_area_emisora
             LEFT JOIN actor_externo ax ON ax.id_actor = d.id_actor_emisor
             LEFT JOIN persona t ON t.id_persona = m.id_titular_al_turnar
             LEFT JOIN area ao ON ao.id_area = m.id_area_origen
             JOIN area ad ON ad.id_area = m.id_area_destino
             LEFT JOIN motivo_devolucion mo ON mo.clave = m.motivo
             WHERE p.id_area = %(area)s AND (%(tipo)s::text IS NULL OR d.tipo = %(tipo)s)
           ) filas
           WHERE %(minima)s::int IS NULL OR antiguedad_dias >= %(minima)s
           ORDER BY antiguedad_dias, folio DESC
           LIMIT %(limite)s OFFSET %(desde)s""",
        {
            'area': id_area,
            'tipo': tipo,
            'minima': antiguedad_minima,
            'limite': limite,
            'desde': desde,
            'persona': id_persona,
            'mi_area': mi_area,
        },
    )
    return await cursor.fetchall()
