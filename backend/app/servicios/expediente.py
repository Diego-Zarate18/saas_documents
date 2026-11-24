"""O-09, O-17, O-28 y O-29. Escrituras del expediente directo en MongoDB, su fuente (D-16, D-104)."""

import uuid
from datetime import UTC, datetime
from uuid import UUID

from psycopg_pool import AsyncConnectionPool
from pymongo.asynchronous.database import AsyncDatabase

from app.dominio import modelos as m
from app.dominio.errores import ErrorApi, estado_invalido, no_encontrado, sin_permiso, validacion
from app.repositorios.documental import expedientes
from app.servicios.documentos import limpiar_datos_tipo
from app.servicios.ficha import SIN_CONTENIDO, acceso, base_no_disponible, obtener_expediente

SOLO_LECTURA = 'Un documento cancelado es de solo lectura.'


async def _editable(pool: AsyncConnectionPool, ctx: m.ContextoUsuario, id_documento: UUID, roles: set[str]) -> dict:
    """Rol permitido, contenido visible (D-29) y documento no cancelado (O-09)."""
    if ctx.rol not in roles:
        raise sin_permiso()
    async with pool.connection() as con:
        registro, _, visible = await acceso(con, ctx, id_documento)
    if not visible:
        raise sin_permiso(SIN_CONTENIDO)
    if registro['estado'] == 'cancelado':
        raise estado_invalido(SOLO_LECTURA)
    return registro


def _sin_expediente() -> ErrorApi:
    return base_no_disponible('El expediente')


async def actualizar_datos_tipo(
    pool: AsyncConnectionPool, db: AsyncDatabase, ctx: m.ContextoUsuario, id_documento: UUID, datos: m.DatosExpediente
) -> m.Expediente:
    """O-09. Reemplaza los datos del tipo, limpios y con sus obligatorios (D-66); el tipo no cambia (D-26)."""
    registro = await _editable(pool, ctx, id_documento, {'OF', 'TI', 'PE'})
    limpios = limpiar_datos_tipo(registro['tipo'], datos.datos_tipo)
    if not await expedientes.actualizar_datos_tipo(db, str(id_documento), registro['tipo'], limpios, datetime.now(UTC)):
        raise _sin_expediente()
    return await obtener_expediente(pool, db, ctx, id_documento)


async def agregar_anexo(
    pool: AsyncConnectionPool, db: AsyncDatabase, ctx: m.ContextoUsuario, id_documento: UUID, anexo: m.NuevoAnexo
) -> None:
    """O-28. Anexo descriptivo, sin archivo (DT-03); autor y fecha los pone el servidor."""
    await _editable(pool, ctx, id_documento, {'OF', 'PE'})
    titulo, ubicacion = anexo.titulo.strip(), anexo.ubicacion.strip()
    if not titulo:
        raise validacion('Escribe la descripción del anexo.')
    if anexo.hojas is None or anexo.hojas < 1:
        raise validacion('El número de hojas debe ser 1 o más.')
    if not ubicacion:
        raise validacion('Escribe la ubicación física.')
    ahora = datetime.now(UTC)
    nuevo = {
        'id': str(uuid.uuid4()),
        'titulo': titulo,
        'hojas': anexo.hojas,
        'ubicacion': ubicacion,
        'id_persona': str(ctx.id_persona),
        'fecha_hora': ahora,
    }
    if not await expedientes.agregar_anexo(db, str(id_documento), nuevo, ahora):
        raise _sin_expediente()


async def agregar_nota(
    pool: AsyncConnectionPool, db: AsyncDatabase, ctx: m.ContextoUsuario, id_documento: UUID, nota: m.NuevaNota
) -> None:
    """O-29. Nota general; autor, área y fecha los pone el servidor."""
    await _editable(pool, ctx, id_documento, {'OF', 'DI', 'TI', 'PE'})
    texto = nota.texto.strip()
    if not texto:
        raise validacion('Escribe la nota.')
    ahora = datetime.now(UTC)
    nueva = {
        'id': str(uuid.uuid4()),
        'tipo': 'general',
        'texto': texto,
        'id_persona': str(ctx.id_persona),
        'id_area': str(ctx.id_area),
        'fecha_hora': ahora,
    }
    if not await expedientes.agregar_nota(db, str(id_documento), nueva, ahora):
        raise _sin_expediente()


async def quitar(
    pool: AsyncConnectionPool,
    db: AsyncDatabase,
    ctx: m.ContextoUsuario,
    id_documento: UUID,
    coleccion: str,
    id_elemento: UUID,
) -> None:
    """O-17. Quita un anexo o una nota capturados por error: solo su autor u oficialía (D-20). La evidencia de
    atención de una conclusión no se elimina (RF-10)."""
    await _editable(pool, ctx, id_documento, {'OF', 'PE'})
    crudo = await expedientes.leer(db, str(id_documento))
    if crudo is None:
        raise _sin_expediente()
    elemento = next((e for e in crudo[coleccion] if e['id'] == str(id_elemento)), None)
    if elemento is None:
        raise no_encontrado('El anexo no existe.' if coleccion == 'anexos' else 'La nota no existe.')
    if elemento.get('tipo') == 'evidencia_atencion':
        raise estado_invalido('La evidencia de atención de una conclusión no se elimina.')
    if ctx.rol != 'OF' and elemento['id_persona'] != str(ctx.id_persona):
        raise sin_permiso('Solo quita un anexo o una nota su autor u oficialía.')
    quitar_de = expedientes.quitar_anexo if coleccion == 'anexos' else expedientes.quitar_nota
    await quitar_de(db, str(id_documento), str(id_elemento), datetime.now(UTC))
