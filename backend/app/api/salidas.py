"""O-20 y O-21. /api/salidas."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter

from app.api.dependencias import Contexto, Pool
from app.dominio import modelos as m
from app.servicios import salidas

router = APIRouter(prefix='/salidas', tags=['salidas'])


@router.get('', summary='Salidas externas')
async def listar(
    ctx: Contexto, pool: Pool, acuse: Literal['con', 'sin'] | None = None, pagina: int = 1, tamano: int = 100
) -> m.Listado[m.Salida]:
    return await salidas.listar(pool, ctx, acuse, pagina, tamano)


@router.post('', status_code=201, summary='O-20 Registrar salida externa')
async def registrar(nueva: m.NuevaSalida, ctx: Contexto, pool: Pool) -> m.DocumentoRegistrado:
    return await salidas.registrar(pool, ctx, nueva)


@router.post('/{id_salida}/acuses', status_code=204, summary='O-21 Registrar acuse')
async def registrar_acuse(id_salida: UUID, acuse: m.NuevoAcuse, ctx: Contexto, pool: Pool) -> None:
    await salidas.registrar_acuse(pool, ctx, id_salida, acuse)
