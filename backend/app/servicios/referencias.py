"""O-07 y O-18. Relacionar documentos y quitar una referencia (D-05, D-14, D-24, D-33)."""

import uuid
from datetime import UTC, datetime
from uuid import UUID

from neo4j import AsyncDriver
from psycopg_pool import AsyncConnectionPool

from app.dominio import modelos as m
from app.dominio.errores import ErrorApi, no_encontrado, sin_permiso, validacion
from app.infra.postgres import transaccion
from app.repositorios.grafo import referencias
from app.repositorios.grafo.replica import REFERENCIAS
from app.repositorios.relacional import documentos
from app.servicios import replicas
from app.servicios.ficha import SIN_CONTENIDO, acceso

ROLES = {'OF', 'TI', 'PE'}
SUSTITUYE = 'SUSTITUYE_A'


def normalizar_emisor(emisor: str) -> str:
    """D-33: el emisor del no registrado se guarda sin espacios de más para que la unicidad no dependa de la captura."""
    return ' '.join(emisor.split())


def grafo_atrasado() -> ErrorApi:
    return ErrorApi('BASE_NO_DISPONIBLE', 'El grafo aún no tiene el documento; inténtalo en unos segundos.', 503)


async def _origen(pool: AsyncConnectionPool, ctx: m.ContextoUsuario, id_documento: UUID, tipo: str) -> str:
    """Rol, tipo de relación y contenido visible del documento de origen."""
    if ctx.rol not in ROLES:
        raise sin_permiso()
    tipo = tipo.strip().upper()
    if tipo not in REFERENCIAS:
        raise validacion('Elige el tipo de relación.')
    async with pool.connection() as con:
        _, _, visible = await acceso(con, ctx, id_documento)
    if not visible:
        raise sin_permiso(SIN_CONTENIDO)
    return tipo


async def relacionar(
    pool: AsyncConnectionPool,
    grafo: AsyncDriver,
    ctx: m.ContextoUsuario,
    id_documento: UUID,
    datos: m.NuevaRelacion,
    ahora: datetime | None = None,
) -> None:
    """O-07. Escribe la relación en Neo4j, su fuente. SUSTITUYE_A solo entre registrados: primero Neo4j y después
    el otro queda `sin_efecto` en PostgreSQL con su estado anterior (D-14); si falla a medias, lo detecta la
    reconciliación (O-40)."""
    tipo = await _origen(pool, ctx, id_documento, datos.tipo)
    destino = datos.destino
    id_destino = numero = emisor = None
    if destino.id_documento:
        if destino.id_documento == id_documento:
            raise validacion('Un documento no se relaciona consigo mismo.')
        async with pool.connection() as con:
            otro = (await documentos.resumen(con, [destino.id_documento])).get(destino.id_documento)
        if otro is None:
            raise no_encontrado()
        if tipo == SUSTITUYE and otro['estado'] not in ('en_tramite', 'concluido'):
            raise validacion('El documento sustituido ya no está vigente.')
        id_destino = str(destino.id_documento)
    else:
        if tipo == SUSTITUYE:
            raise validacion('«Sustituye a» solo se usa entre documentos registrados.')
        numero = (destino.numero or '').strip()
        emisor = normalizar_emisor(destino.emisor or '')
        if not numero:
            raise validacion('Escribe el número del documento.')
        if not emisor:
            raise validacion('Escribe el emisor del documento.')

    if await referencias.existe(grafo, str(id_documento), tipo, id_destino, numero, emisor):
        raise ErrorApi('CONFLICTO', 'Esa relación ya existe.', 409)
    propiedades = {
        'id': str(uuid.uuid4()),
        'id_persona': str(ctx.id_persona),
        'fecha_hora': ahora or datetime.now(UTC),
    }
    if not await referencias.crear(grafo, str(id_documento), tipo, id_destino, numero, emisor, propiedades):
        raise grafo_atrasado()
    if tipo == SUSTITUYE:
        async with transaccion(pool) as con:
            if await documentos.dejar_sin_efecto(con, destino.id_documento):
                await replicas.encolar_estado(con, destino.id_documento, 'sin_efecto')


async def quitar(
    pool: AsyncConnectionPool,
    grafo: AsyncDriver,
    ctx: m.ContextoUsuario,
    id_documento: UUID,
    tipo: str,
    referencia: str,
    emisor: str | None,
) -> None:
    """O-18. Quita una referencia capturada por error (D-20). El no registrado se identifica por número y emisor
    (D-33); quitar SUSTITUYE_A devuelve al otro su estado anterior (D-14)."""
    tipo = await _origen(pool, ctx, id_documento, tipo)
    id_destino = numero = None
    if emisor:
        numero, emisor = referencia.strip(), normalizar_emisor(emisor)
    else:
        async with pool.connection() as con:
            otro = await documentos.id_por_folio(con, referencia.strip())
        if otro is None:
            raise no_encontrado('La relación no existe.')
        id_destino = str(otro)
    if not await referencias.quitar(grafo, str(id_documento), tipo, id_destino, numero, emisor):
        raise no_encontrado('La relación no existe.')
    if tipo == SUSTITUYE:
        async with transaccion(pool) as con:
            estado = await documentos.restaurar_estado(con, UUID(id_destino))
            if estado:
                await replicas.encolar_estado(con, UUID(id_destino), estado)
