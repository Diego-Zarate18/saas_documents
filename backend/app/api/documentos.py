"""O-01, O-03, O-22 y O-23. /api/documentos."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter

from app.api.dependencias import Contexto, Documental, Grafo, Pool
from app.dominio import modelos as m
from app.dominio.modelos import (
    Atraccion,
    Devolucion,
    DocumentoRegistrado,
    Movimiento,
    NuevoDocumento,
    ResultadoTurno,
    Turno,
)
from app.servicios import cierre, documentos, expediente, ficha, recorrido

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


@router.get('/{id_documento}', summary='O-11 Ficha completa')
async def obtener_ficha(id_documento: UUID, ctx: Contexto, pool: Pool, db: Documental, grafo: Grafo) -> m.Ficha:
    return await ficha.obtener(pool, db, grafo, ctx, id_documento)


@router.get('/{id_documento}/recorrido', summary='C1 Recorrido')
async def obtener_recorrido(id_documento: UUID, ctx: Contexto, pool: Pool, grafo: Grafo) -> list[m.MovimientoRecorrido]:
    return await ficha.obtener_recorrido(pool, grafo, ctx, id_documento)


@router.get('/{id_documento}/expediente', summary='O-09 Consultar expediente')
async def obtener_expediente(id_documento: UUID, ctx: Contexto, pool: Pool, db: Documental) -> m.Expediente:
    return await ficha.obtener_expediente(pool, db, ctx, id_documento)


@router.patch('/{id_documento}/expediente', summary='O-09 Actualizar datos del tipo')
async def actualizar_expediente(
    id_documento: UUID, datos: m.DatosExpediente, ctx: Contexto, pool: Pool, db: Documental
) -> m.Expediente:
    return await expediente.actualizar_datos_tipo(pool, db, ctx, id_documento, datos)


@router.post('/{id_documento}/expediente/anexos', status_code=204, summary='O-28 Agregar anexo')
async def agregar_anexo(id_documento: UUID, anexo: m.NuevoAnexo, ctx: Contexto, pool: Pool, db: Documental) -> None:
    await expediente.agregar_anexo(pool, db, ctx, id_documento, anexo)


@router.post('/{id_documento}/expediente/notas', status_code=204, summary='O-29 Agregar nota')
async def agregar_nota(id_documento: UUID, nota: m.NuevaNota, ctx: Contexto, pool: Pool, db: Documental) -> None:
    await expediente.agregar_nota(pool, db, ctx, id_documento, nota)


@router.delete('/{id_documento}/expediente/{coleccion}/{id_elemento}', status_code=204, summary='O-17 Quitar')
async def quitar_del_expediente(
    id_documento: UUID,
    coleccion: Literal['anexos', 'notas'],
    id_elemento: UUID,
    ctx: Contexto,
    pool: Pool,
    db: Documental,
) -> None:
    await expediente.quitar(pool, db, ctx, id_documento, coleccion, id_elemento)


@router.post('/{id_documento}/conclusion', status_code=201, summary='O-05 Concluir')
async def concluir(id_documento: UUID, conclusion: m.Conclusion, ctx: Contexto, pool: Pool) -> Movimiento:
    return await cierre.concluir(pool, ctx, id_documento, conclusion)


@router.post('/{id_documento}/cancelacion', status_code=204, summary='O-24 Cancelar')
async def cancelar(id_documento: UUID, datos: m.Cancelacion, ctx: Contexto, pool: Pool) -> None:
    await cierre.cancelar(pool, ctx, id_documento, datos)


@router.post('/{id_documento}/recepciones', status_code=204, summary='O-19 Segunda recepción')
async def segunda_recepcion(id_documento: UUID, datos: m.SegundaRecepcion, ctx: Contexto, pool: Pool) -> None:
    await cierre.segunda_recepcion(pool, ctx, id_documento, datos)


@router.post('/{id_documento}/resolucion-duplicado', status_code=204, summary='O-26 Resolver posible duplicado')
async def resolver_duplicado(id_documento: UUID, datos: m.ResolucionDuplicado, ctx: Contexto, pool: Pool) -> None:
    await cierre.resolver(pool, ctx, id_documento, datos)
