"""AD-01 a AD-06. Expedientes en MongoDB, fuente del contenido del tipo, los anexos y las notas (D-104)."""

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


async def leer(db: AsyncDatabase, id_documento: str) -> dict | None:
    """AD-02. El expediente completo."""
    return await db.expedientes.find_one({'_id': id_documento})


async def actualizar_datos_tipo(db: AsyncDatabase, id_documento: str, tipo: str, datos: dict, ahora: datetime) -> bool:
    """AD-03. Reemplaza los datos del tipo; el filtro por tipo impide cambiarlo (D-26)."""
    resultado = await db.expedientes.update_one(
        {'_id': id_documento, 'tipo': tipo}, {'$set': {'datos_tipo': datos, 'actualizado_en': ahora}}
    )
    return resultado.matched_count == 1


async def agregar_anexo(db: AsyncDatabase, id_documento: str, anexo: dict, ahora: datetime) -> bool:
    """AD-04. Agrega un anexo descriptivo (sin archivo, DT-03)."""
    resultado = await db.expedientes.update_one(
        {'_id': id_documento}, {'$push': {'anexos': anexo}, '$set': {'actualizado_en': ahora}}
    )
    return resultado.matched_count == 1


async def agregar_nota(db: AsyncDatabase, id_documento: str, nota: dict, ahora: datetime) -> bool:
    """AD-05. Agrega una nota si su id no está ya: el reintento del outbox no la duplica."""
    resultado = await db.expedientes.update_one(
        {'_id': id_documento, 'notas.id': {'$ne': nota['id']}},
        {'$push': {'notas': nota}, '$set': {'actualizado_en': ahora}},
    )
    if resultado.matched_count == 1:
        return True
    return await db.expedientes.count_documents({'_id': id_documento}) == 1


async def quitar_anexo(db: AsyncDatabase, id_documento: str, id_anexo: str, ahora: datetime) -> bool:
    """AD-06. Quita un anexo capturado por error."""
    resultado = await db.expedientes.update_one(
        {'_id': id_documento}, {'$pull': {'anexos': {'id': id_anexo}}, '$set': {'actualizado_en': ahora}}
    )
    return resultado.modified_count == 1


async def quitar_nota(db: AsyncDatabase, id_documento: str, id_nota: str, ahora: datetime) -> bool:
    """AD-06. Quita una nota capturada por error; la evidencia de atención nunca (RF-10)."""
    resultado = await db.expedientes.update_one(
        {'_id': id_documento},
        {
            '$pull': {'notas': {'id': id_nota, 'tipo': {'$ne': 'evidencia_atencion'}}},
            '$set': {'actualizado_en': ahora},
        },
    )
    return resultado.modified_count == 1
