"""O-26. /api/consultas/posibles-duplicados."""

from uuid import UUID

from fastapi import APIRouter

from app.api.dependencias import Contexto, Pool
from app.dominio.modelos import ComparacionDuplicado, Listado, ResumenDocumento
from app.servicios import cierre

router = APIRouter(prefix='/consultas', tags=['consultas'])


@router.get('/posibles-duplicados', summary='O-26 Posibles duplicados')
async def posibles_duplicados(
    ctx: Contexto, pool: Pool, pagina: int = 1, tamano: int = 100
) -> Listado[ResumenDocumento]:
    return await cierre.posibles_duplicados(pool, ctx, pagina, tamano)


@router.get('/posibles-duplicados/{id_documento}/comparacion', summary='O-26 Comparación')
async def comparacion(id_documento: UUID, ctx: Contexto, pool: Pool) -> ComparacionDuplicado:
    return await cierre.comparar(pool, ctx, id_documento)
