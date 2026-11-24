"""O-26. /api/consultas/posibles-duplicados."""

from uuid import UUID

from fastapi import APIRouter

from app.api.dependencias import Contexto, Grafo, Pool
from app.dominio import modelos as m
from app.dominio.modelos import ComparacionDuplicado, Listado, ResumenDocumento
from app.servicios import cierre, consultas

router = APIRouter(prefix='/consultas', tags=['consultas'])


@router.get('/posibles-duplicados', summary='O-26 Posibles duplicados')
async def posibles_duplicados(
    ctx: Contexto, pool: Pool, pagina: int = 1, tamano: int = 100
) -> Listado[ResumenDocumento]:
    return await cierre.posibles_duplicados(pool, ctx, pagina, tamano)


@router.get('/posibles-duplicados/{id_documento}/comparacion', summary='O-26 Comparación')
async def comparacion(id_documento: UUID, ctx: Contexto, pool: Pool) -> ComparacionDuplicado:
    return await cierre.comparar(pool, ctx, id_documento)


@router.get('/rebotes', summary='C3 Rebotes entre áreas')
async def rebotes(
    ctx: Contexto, pool: Pool, grafo: Grafo, periodo: str | None = None, id_area: UUID | None = None
) -> Listado[m.Rebote]:
    return await consultas.rebotes(pool, grafo, ctx, periodo, id_area)


@router.get('/selector-documentos', summary='O-30 Selector de documentos')
async def selector_documentos(ctx: Contexto, pool: Pool, texto: str = '') -> Listado[m.DocumentoEncontrado]:
    return await consultas.selector(pool, ctx, texto)


@router.get('/acuses', summary='D-58 Acuses del área responsable')
async def acuses(ctx: Contexto, pool: Pool) -> Listado[m.Acuse]:
    return await consultas.acuses(pool, ctx)
