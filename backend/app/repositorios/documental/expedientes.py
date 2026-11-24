"""AD-01. Expedientes en MongoDB."""

from datetime import datetime

from pymongo.asynchronous.database import AsyncDatabase


def a_bson(expediente: dict) -> dict:
    """Convierte las fechas ISO del evento del outbox a fechas BSON (el validador exige `date`)."""
    fecha = datetime.fromisoformat
    return {
        **expediente,
        'anexos': [{**a, 'fecha_hora': fecha(a['fecha_hora'])} for a in expediente['anexos']],
        'notas': [{**n, 'fecha_hora': fecha(n['fecha_hora'])} for n in expediente['notas']],
        'creado_en': fecha(expediente['creado_en']),
        'actualizado_en': fecha(expediente['actualizado_en']),
    }


async def crear(db: AsyncDatabase, expediente: dict) -> None:
    """AD-01. Upsert por _id con $setOnInsert: repetirlo desde el outbox no duplica ni pisa cambios posteriores."""
    await db.expedientes.update_one({'_id': expediente['_id']}, {'$setOnInsert': a_bson(expediente)}, upsert=True)
