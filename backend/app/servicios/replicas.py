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
    datos = {k: _texto(v) for k, v in movimiento.items() if k not in ('instruccion', 'id_movimiento_corregido')}
    datos['id_corrige'] = _texto(movimiento.get('id_movimiento_corregido'))
    datos['origenes'] = [str(o) for o in origenes]
    await outbox.encolar(con, 'neo4j', 'movimiento', movimiento['id_movimiento'], datos)


async def encolar_estado(con: AsyncConnection, id_documento: UUID, estado: str) -> None:
    """Cambio de estado en el nodo Documento."""
    await outbox.encolar(con, 'neo4j', 'estado', id_documento, {'id_documento': str(id_documento), 'estado': estado})


async def encolar_nota(con: AsyncConnection, id_documento: UUID, nota: dict) -> None:
    """Nota del expediente que nace de una operación de PostgreSQL (la de una conclusión, D-19)."""
    datos = {'id_documento': str(id_documento), 'nota': {k: _texto(v) for k, v in nota.items()}}
    await outbox.encolar(con, 'mongodb', 'nota', id_documento, datos)


async def encolar_referencia(con: AsyncConnection, referencia: dict, espera_a: UUID) -> None:
    """RESPONDE_A que nace en PostgreSQL: una conclusión con respuesta (O-05) o una salida que responde (O-20).
    `espera_a` es el documento cuyos eventos anteriores deben entregarse antes (D-48)."""
    datos = {k: _texto(v) for k, v in referencia.items()}
    datos['id_documento'] = str(espera_a)
    await outbox.encolar(con, 'neo4j', 'referencia', referencia['id'], datos)


async def encolar_area(con: AsyncConnection, id_area: UUID, siglas: str) -> None:
    """Nodo Area (O-33)."""
    await outbox.encolar(con, 'neo4j', 'area', id_area, {'id_area': str(id_area), 'siglas': siglas})


async def encolar_persona(con: AsyncConnection, id_persona: UUID, nombre: str) -> None:
    """Nodo Persona (O-34)."""
    await outbox.encolar(con, 'neo4j', 'persona', id_persona, {'id_persona': str(id_persona), 'nombre': nombre})
