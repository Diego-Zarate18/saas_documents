"""O-14. /api/bandeja."""

from uuid import UUID

from fastapi import APIRouter

from app.api.dependencias import Contexto, Pool
from app.dominio.modelos import Listado, PendienteBandeja
from app.servicios import bandeja

router = APIRouter(tags=['bandeja'])


@router.get('/bandeja', summary='O-14 Pendientes por área')
async def obtener_bandeja(
    ctx: Contexto,
    pool: Pool,
    id_area: UUID | None = None,
    tipo: str | None = None,
    antiguedad_minima: int | None = None,
    pagina: int = 1,
    tamano: int = 100,
) -> Listado[PendienteBandeja]:
    return await bandeja.consultar(pool, ctx, id_area, tipo, antiguedad_minima, pagina, tamano)
