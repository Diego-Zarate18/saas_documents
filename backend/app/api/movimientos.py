"""O-25. /api/movimientos."""

from uuid import UUID

from fastapi import APIRouter

from app.api.dependencias import Contexto, Pool
from app.dominio.modelos import Correccion, Movimiento
from app.servicios import cierre

router = APIRouter(prefix='/movimientos', tags=['movimientos'])


@router.post('/{id_movimiento}/correcciones', status_code=201, summary='O-25 Corregir un movimiento')
async def corregir(id_movimiento: UUID, correccion: Correccion, ctx: Contexto, pool: Pool) -> Movimiento:
    return await cierre.corregir(pool, ctx, id_movimiento, correccion)
