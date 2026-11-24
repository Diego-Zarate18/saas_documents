"""O-03, O-22 y O-23. Turnar, devolver o returnar y atraer (RI-10, D-18, D-31, D-42, D-44, D-67, D-68, D-69)."""

import uuid
from datetime import UTC, datetime
from uuid import UUID

from psycopg import AsyncConnection
from psycopg_pool import AsyncConnectionPool

from app.dominio.errores import estado_invalido, no_encontrado, sin_permiso, validacion
from app.dominio.modelos import (
    Atraccion,
    ContextoUsuario,
    Devolucion,
    Movimiento,
    ResultadoTurno,
    Turno,
)
from app.infra.postgres import transaccion
from app.repositorios.relacional import catalogos, documentos, movimientos
from app.servicios import replicas


async def en_tramite(con: AsyncConnection, id_documento: UUID, mensaje: str) -> None:
    """Bloquea el documento (un movimiento a la vez) y exige que exista y esté en trámite."""
    fila = await documentos.bloquear_documento(con, id_documento)
    if fila is None:
        raise no_encontrado()
    if fila['estado'] != 'en_tramite':
        raise estado_invalido(mensaje)


def nuevo_movimiento(ctx: ContextoUsuario, id_documento: UUID, ahora: datetime, **campos) -> dict:
    return {
        'id_movimiento': uuid.uuid4(),
        'id_documento': id_documento,
        'fecha_hora': ahora,
        'id_grupo_turno': None,
        'id_area_origen': ctx.id_area,
        'rol': 'responsable',
        'instruccion': None,
        'motivo': None,
        'id_area_sugerida': None,
        'id_persona': ctx.id_persona,
        **campos,
    }


def a_salida(fila: dict, otros_origenes: list[UUID] = ()) -> Movimiento:
    campos = {k: v for k, v in fila.items() if k not in ('id_movimiento', 'id_movimiento_corregido')}
    return Movimiento(
        **campos,
        id=fila['id_movimiento'],
        id_corrige=fila.get('id_movimiento_corregido'),
        otros_origenes=list(otros_origenes),
    )


def validar_grupo(turno: Turno) -> None:
    """RI-10 y D-18: al menos un área, sin repetir, con un solo responsable."""
    destinos = turno.destinos
    if not destinos:
        raise validacion('Agrega al menos un área.')
    if any(d.id_area is None for d in destinos):
        raise validacion('Elige el área de cada fila.')
    if any(d.rol not in ('responsable', 'apoyo', 'conocimiento') for d in destinos):
        raise validacion('Elige el rol de cada área.')
    if len({d.id_area for d in destinos}) != len(destinos):
        raise validacion('Cada área puede aparecer una sola vez.')
    responsables = sum(d.rol == 'responsable' for d in destinos)
    if responsables == 0:
        raise validacion('Falta un responsable en el grupo.')
    if responsables > 1:
        raise validacion('Solo puede haber un responsable en el grupo.')


async def turnar(
    pool: AsyncConnectionPool, ctx: ContextoUsuario, id_documento: UUID, turno: Turno, ahora: datetime | None = None
) -> ResultadoTurno:
    """O-03. Un movimiento `turno` por destino con el mismo grupo; el origen es el área de quien turna. OF y DI turnan
    cualquier documento en trámite; TI solo lo que tiene pendiente en su área. El turno de OF o DI no cierra el
    pendiente de otra área (D-67)."""
    if ctx.rol not in ('OF', 'DI', 'TI') or ctx.id_area is None:
        raise sin_permiso()
    validar_grupo(turno)
    ahora = ahora or datetime.now(UTC)
    grupo = uuid.uuid4()
    async with transaccion(pool) as con:
        await en_tramite(con, id_documento, 'No se turnan documentos concluidos ni cancelados.')
        if ctx.rol == 'TI' and not any(
            p['id_area'] == ctx.id_area for p in await movimientos.pendientes(con, id_documento)
        ):
            raise sin_permiso('El titular solo turna lo que tiene pendiente en su área.')
        titulares = await movimientos.titulares(con, [d.id_area for d in turno.destinos])
        if len(titulares) != len(turno.destinos):
            raise validacion('Un área destino no existe.')
        filas = []
        for destino in turno.destinos:
            fila = nuevo_movimiento(
                ctx,
                id_documento,
                ahora,
                tipo='turno',
                id_grupo_turno=grupo,
                id_area_destino=destino.id_area,
                rol=destino.rol,
                instruccion=(destino.instruccion or '').strip() or None,
                id_titular_al_turnar=titulares[destino.id_area],  # D-31
            )
            await movimientos.insertar(con, fila)
            await replicas.encolar_movimiento(con, fila)
            filas.append(fila)
    return ResultadoTurno(id_grupo_turno=grupo, movimientos=[a_salida(f) for f in filas])


async def devolver(
    pool: AsyncConnectionPool,
    ctx: ContextoUsuario,
    id_documento: UUID,
    devolucion: Devolucion,
    ahora: datetime | None = None,
) -> Movimiento:
    """O-22. El titular con el documento pendiente lo devuelve al área de la que lo recibió o, con
    `no_competencia`, lo returna al área sugerida (D-69). La nota va en `instruccion`."""
    if ctx.rol != 'TI' or ctx.id_area is None:
        raise sin_permiso('Solo devuelve el titular del área que tiene el documento pendiente.')
    ahora = ahora or datetime.now(UTC)
    async with transaccion(pool) as con:
        await en_tramite(con, id_documento, 'El documento ya no está en trámite.')
        mio = next((p for p in await movimientos.pendientes(con, id_documento) if p['id_area'] == ctx.id_area), None)
        if mio is None:
            raise sin_permiso('Solo devuelve el titular del área que tiene el documento pendiente.')
        if devolucion.motivo not in await catalogos.claves_activas(con, 'motivo_devolucion'):
            raise validacion('Elige el motivo del catálogo.')
        sugerida = devolucion.id_area_sugerida
        if sugerida is not None and devolucion.motivo != 'no_competencia':
            raise validacion('Solo se sugiere otra área cuando no es de su competencia.')
        destino = sugerida or mio['id_area_origen']
        titulares = await movimientos.titulares(con, [destino]) if destino else {}
        if destino is None or destino == ctx.id_area or destino not in titulares:
            raise validacion('Elige otra área para returnarlo.')
        fila = nuevo_movimiento(
            ctx,
            id_documento,
            ahora,
            tipo='devolucion',
            id_area_destino=destino,
            motivo=devolucion.motivo,
            id_area_sugerida=sugerida,
            instruccion=(devolucion.nota or '').strip() or None,
            id_titular_al_turnar=titulares[destino],
        )
        await movimientos.insertar(con, fila)
        await replicas.encolar_movimiento(con, fila)
    return a_salida(fila)


async def atraer(
    pool: AsyncConnectionPool,
    ctx: ContextoUsuario,
    id_documento: UUID,
    atraccion: Atraccion,
    ahora: datetime | None = None,
) -> Movimiento:
    """O-23. El área del titular queda como única responsable (D-68): las demás áreas responsables son los orígenes
    (la primera en `id_area_origen` y el resto en `movimiento_origen`) y dejan de tenerlo pendiente; apoyo y
    conocimiento no cambian. Requiere que su área tenga algún movimiento en el documento (D-29)."""
    if ctx.rol != 'TI' or ctx.id_area is None:
        raise sin_permiso()
    justificacion = atraccion.justificacion.strip()
    if not justificacion:
        raise validacion('Escribe la justificación.')
    ahora = ahora or datetime.now(UTC)
    async with transaccion(pool) as con:
        await en_tramite(con, id_documento, 'El documento ya no está en trámite.')
        if not await movimientos.area_involucrada(con, id_documento, ctx.id_area):
            raise sin_permiso('Tu área no tiene visibilidad sobre el documento.')
        responsables = [
            p['id_area'] for p in await movimientos.pendientes(con, id_documento) if p['rol'] == 'responsable'
        ]
        otras = [a for a in responsables if a != ctx.id_area]
        if not otras and ctx.id_area in responsables:
            raise estado_invalido('Tu área ya es la responsable.')
        # Sin otra área responsable pendiente, el origen es el área del último movimiento.
        origen = otras[0] if otras else await movimientos.ultimo_destino(con, id_documento)
        if origen == ctx.id_area:
            raise estado_invalido('Tu área ya es la responsable.')
        titular = (await movimientos.titulares(con, [ctx.id_area]))[ctx.id_area]
        fila = nuevo_movimiento(
            ctx,
            id_documento,
            ahora,
            tipo='atraccion',
            id_area_origen=origen,
            id_area_destino=ctx.id_area,
            instruccion=justificacion,
            id_titular_al_turnar=titular,
        )
        await movimientos.insertar(con, fila, otras[1:])
        await replicas.encolar_movimiento(con, fila, otras[1:])
    return a_salida(fila, otras[1:])
