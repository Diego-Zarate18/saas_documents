"""AR-04. Eventos de outbox que los servicios encolan en su transacción (D-13): todo lo que la réplica necesita."""

from datetime import datetime
from uuid import UUID

from psycopg import AsyncConnection

from app.repositorios.relacional import outbox


def _texto(valor) -> str | None:
    if valor is None:
        return None
    return valor.isoformat() if isinstance(valor, datetime) else str(valor)


async def encolar_documento(con: AsyncConnection, documento: dict, expediente: dict) -> None:
    """Nodo Documento en Neo4j y expediente en MongoDB (O-01)."""
    id_doc = str(documento['id_documento'])
    await outbox.encolar(
        con,
        'neo4j',
        'documento',
        documento['id_documento'],
        {
            'id_documento': id_doc,
            'tipo': documento['tipo'],
            'estado': 'en_tramite',
            'confidencial': documento['confidencial'],
            'id_area_emisora': _texto(documento['id_area_emisora']),
        },
    )
    await outbox.encolar(
        con, 'mongodb', 'expediente', documento['id_documento'], {'id_documento': id_doc, **expediente}
    )


async def encolar_movimiento(con: AsyncConnection, movimiento: dict, otros_origenes: list[UUID] = ()) -> None:
    """Nodo Movimiento con sus relaciones y SIGUIENTE (AG-06)."""
    origenes = [movimiento['id_area_origen'], *otros_origenes] if movimiento['id_area_origen'] else []
    datos = {k: _texto(v) for k, v in movimiento.items() if k != 'instruccion'}
    datos['origenes'] = [str(o) for o in origenes]
    await outbox.encolar(con, 'neo4j', 'movimiento', movimiento['id_movimiento'], datos)
