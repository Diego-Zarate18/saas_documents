"""O-31 y O-32. /api/catalogos, /api/areas y /api/organizacion."""

from fastapi import APIRouter

from app.api.dependencias import Contexto, Pool
from app.dominio.modelos import Area, AreaOrganizacion, Catalogos, Listado
from app.servicios import catalogos

router = APIRouter(tags=['catalogos'])


@router.get('/catalogos', summary='O-31 Consultar catálogos')
async def obtener_catalogos(_: Contexto, pool: Pool) -> Catalogos:
    return await catalogos.consultar_catalogos(pool)


@router.get('/areas', summary='O-32 Áreas para los selectores')
async def obtener_areas(_: Contexto, pool: Pool, activas: bool = True) -> Listado[Area]:
    return await catalogos.consultar_areas(pool, activas)


@router.get('/organizacion', summary='O-32 Estructura organizacional')
async def obtener_organizacion(_: Contexto, pool: Pool) -> Listado[AreaOrganizacion]:
    return await catalogos.consultar_organizacion(pool)
