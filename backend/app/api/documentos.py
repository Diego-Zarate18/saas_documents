"""O-01, O-03, O-22 y O-23. /api/documentos."""

from uuid import UUID

from fastapi import APIRouter

from app.api.dependencias import Contexto, Pool
from app.dominio.modelos import (
    Atraccion,
    Devolucion,
    DocumentoRegistrado,
    Movimiento,
    NuevoDocumento,
    ResultadoTurno,
    Turno,
)
from app.servicios import documentos, recorrido

router = APIRouter(prefix='/documentos', tags=['documentos'])


@router.get('/folio-siguiente', summary='Vista previa del folio (D-21)')
async def folio_siguiente(ctx: Contexto, pool: Pool) -> str:
    return await documentos.folio_siguiente(pool, ctx)


@router.post('', status_code=201, summary='O-01 Registrar documento')
async def registrar_documento(datos: NuevoDocumento, ctx: Contexto, pool: Pool) -> DocumentoRegistrado:
    return await documentos.registrar(pool, ctx, datos)


@router.post('/{id_documento}/turnos', status_code=201, summary='O-03 Turnar')
async def turnar(id_documento: UUID, turno: Turno, ctx: Contexto, pool: Pool) -> ResultadoTurno:
    return await recorrido.turnar(pool, ctx, id_documento, turno)


@router.post('/{id_documento}/devoluciones', status_code=201, summary='O-22 Devolver o returnar')
async def devolver(id_documento: UUID, devolucion: Devolucion, ctx: Contexto, pool: Pool) -> Movimiento:
    return await recorrido.devolver(pool, ctx, id_documento, devolucion)


@router.post('/{id_documento}/atracciones', status_code=201, summary='O-23 Atraer')
async def atraer(id_documento: UUID, atraccion: Atraccion, ctx: Contexto, pool: Pool) -> Movimiento:
    return await recorrido.atraer(pool, ctx, id_documento, atraccion)
