"""O-27, O-08, O-18, C2 y C5. /api/asuntos."""

from uuid import UUID

from fastapi import APIRouter

from app.api.dependencias import Contexto, Grafo, Pool
from app.dominio import modelos as m
from app.servicios import asuntos

router = APIRouter(prefix='/asuntos', tags=['asuntos'])


@router.get('', summary='Asuntos')
async def listar(
    ctx: Contexto, pool: Pool, grafo: Grafo, texto: str = '', pagina: int = 1, tamano: int = 100
) -> m.Listado[m.Asunto]:
    return await asuntos.listar(pool, grafo, ctx, texto, pagina, tamano)


@router.post('', status_code=201, summary='O-27 Crear asunto')
async def crear(nuevo: m.NuevoAsunto, ctx: Contexto, pool: Pool, grafo: Grafo) -> m.Asunto:
    return await asuntos.crear(pool, grafo, ctx, nuevo)


@router.post('/{id_asunto}/documentos', status_code=204, summary='O-08 Asignar documento')
async def asignar(id_asunto: UUID, asignacion: m.AsignacionAsunto, ctx: Contexto, pool: Pool, grafo: Grafo) -> None:
    await asuntos.asignar(pool, grafo, ctx, id_asunto, asignacion)


@router.delete('/{id_asunto}/documentos/{id_documento}', status_code=204, summary='O-18 Sacar de un asunto')
async def sacar(id_asunto: UUID, id_documento: UUID, ctx: Contexto, pool: Pool, grafo: Grafo) -> None:
    await asuntos.sacar(pool, grafo, ctx, id_asunto, id_documento)


@router.get('/{id_asunto}/hilo', summary='C2 Hilo de un asunto')
async def hilo(id_asunto: UUID, ctx: Contexto, pool: Pool, grafo: Grafo) -> m.HiloAsunto:
    return await asuntos.hilo(pool, grafo, ctx, id_asunto)


@router.get('/{id_asunto}/alcance', summary='C5 Alcance de un asunto')
async def alcance(id_asunto: UUID, ctx: Contexto, pool: Pool, grafo: Grafo) -> m.AlcanceAsunto:
    return await asuntos.alcance(pool, grafo, ctx, id_asunto)
