"""O-05, O-19, O-24, O-25 y O-26. Concluir, segunda recepción, cancelar, corregir un turno y resolver duplicados."""

import math
import re
import unicodedata
import uuid
from datetime import UTC, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from psycopg import AsyncConnection
from psycopg_pool import AsyncConnectionPool

from app.dominio import modelos as m
from app.dominio.errores import ErrorApi, estado_invalido, no_encontrado, sin_permiso, validacion
from app.infra.postgres import transaccion
from app.repositorios.relacional import catalogos, documentos, movimientos
from app.servicios import replicas
from app.servicios.recorrido import a_salida, nuevo_movimiento

ZONA = ZoneInfo('America/Mexico_City')
NO_TRAMITE = 'El documento ya no está en trámite.'
SIN_REVISION = 'El documento ya no espera revisión.'


async def _bloquear(con: AsyncConnection, id_documento: UUID) -> dict:
    documento = await documentos.bloquear_cualquiera(con, id_documento)
    if documento is None:
        raise no_encontrado()
    return documento


def _exigir_oficialia(ctx: m.ContextoUsuario) -> None:
    if ctx.rol != 'OF':
        raise sin_permiso()


# ── O-05 Concluir ──────────────────────────────────────────────────────────────

NOTA_OBLIGATORIA = {
    'atencion_sin_oficio': 'Escribe la evidencia de la atención.',
    'no_procede': 'Escribe el motivo.',
    'duplicado': 'Escribe el motivo.',
}


async def concluir(
    pool: AsyncConnectionPool,
    ctx: m.ContextoUsuario,
    id_documento: UUID,
    conclusion: m.Conclusion,
    ahora: datetime | None = None,
) -> m.Movimiento:
    """O-05. El área responsable con el pendiente lo concluye con una forma de D-59 y sus requisitos. En la misma
    transacción: movimiento `conclusion`, estado `concluido` (RI-14) y eventos de outbox (estado, nota al expediente
    y, con respuesta, RESPONDE_A desde la respuesta hacia este documento, D-05)."""
    no_puede = 'Solo lo concluye el área responsable que lo tiene pendiente.'
    if ctx.rol not in ('TI', 'PE') or ctx.id_area is None:
        raise sin_permiso(no_puede)
    ahora = ahora or datetime.now(UTC)
    nota = (conclusion.nota or '').strip()
    async with transaccion(pool) as con:
        documento = await _bloquear(con, id_documento)
        if documento['estado'] != 'en_tramite':
            raise estado_invalido(NO_TRAMITE)
        if not any(
            p['id_area'] == ctx.id_area and p['rol'] == 'responsable'
            for p in await movimientos.pendientes(con, id_documento)
        ):
            raise sin_permiso(no_puede)
        if conclusion.forma not in await catalogos.claves_activas(con, 'forma_conclusion'):
            raise validacion('Elige la forma de conclusión del catálogo.')

        enlazado = None
        requerido = {'con_respuesta': conclusion.id_respuesta, 'duplicado': conclusion.id_original}
        if conclusion.forma in requerido:
            id_enlazado = requerido[conclusion.forma]
            if id_enlazado is None:
                con_respuesta = conclusion.forma == 'con_respuesta'
                raise validacion(
                    'Elige el documento de respuesta.' if con_respuesta else 'Elige el documento original.'
                )
            enlazado = (await documentos.resumen(con, [id_enlazado])).get(id_enlazado)
            if enlazado is None or id_enlazado == id_documento:
                raise validacion('Elige otro documento registrado.')
        if conclusion.forma in NOTA_OBLIGATORIA and not nota:
            raise validacion(NOTA_OBLIGATORIA[conclusion.forma])

        fila = nuevo_movimiento(
            ctx,
            id_documento,
            ahora,
            tipo='conclusion',
            id_area_destino=ctx.id_area,
            forma_conclusion=conclusion.forma,
            instruccion=enlazado['folio'] if enlazado else None,
            id_titular_al_turnar=None,
        )
        await movimientos.insertar(con, fila)
        cambios = {'estado': 'concluido'}
        if conclusion.forma == 'duplicado':
            cambios['duplicado_de'] = enlazado['id']
        await documentos.actualizar_estado(con, id_documento, cambios)
        await replicas.encolar_movimiento(con, fila)
        await replicas.encolar_estado(con, id_documento, 'concluido')

        if conclusion.forma == 'con_respuesta':
            if enlazado['sentido'] == 'salida':
                await documentos.responder_con_salida(con, enlazado['id'], id_documento)
            await replicas.encolar_referencia(
                con,
                {
                    'id': uuid.uuid4(),
                    'tipo': 'RESPONDE_A',
                    'id_origen': enlazado['id'],
                    'id_destino': id_documento,
                    'id_persona': ctx.id_persona,
                    'fecha_hora': ahora,
                },
                espera_a=id_documento,
            )
        if nota:
            evidencia = conclusion.forma == 'atencion_sin_oficio'
            await replicas.encolar_nota(
                con,
                id_documento,
                {
                    'id': uuid.uuid4(),
                    'tipo': 'evidencia_atencion' if evidencia else 'general',
                    'texto': nota,
                    'id_persona': ctx.id_persona,
                    'id_area': ctx.id_area,
                    'fecha_hora': ahora,
                    **({'id_movimiento': fila['id_movimiento']} if evidencia else {}),  # D-19
                },
            )
    return a_salida(fila)


# ── O-24 Cancelar y O-19 Segunda recepción ─────────────────────────────────────


async def cancelar(pool: AsyncConnectionPool, ctx: m.ContextoUsuario, id_documento: UUID, datos: m.Cancelacion) -> None:
    """O-24. Estado `cancelado` con su motivo; nunca se borra (D-20) y sale de todas las bandejas (D-42)."""
    _exigir_oficialia(ctx)
    motivo = datos.motivo.strip()
    if not motivo:
        raise validacion('Escribe el motivo de la cancelación.')
    async with transaccion(pool) as con:
        if (await _bloquear(con, id_documento))['estado'] != 'en_tramite':
            raise estado_invalido(NO_TRAMITE)
        await documentos.actualizar_estado(con, id_documento, {'estado': 'cancelado', 'motivo_cancelacion': motivo})
        await replicas.encolar_estado(con, id_documento, 'cancelado')


async def segunda_recepcion(
    pool: AsyncConnectionPool, ctx: m.ContextoUsuario, id_documento: UUID, datos: m.SegundaRecepcion
) -> None:
    """O-19. Segunda recepción por el otro canal; en papel el sello fija la fecha oficial y el folio no cambia
    (D-28)."""
    _exigir_oficialia(ctx)
    if datos.canal not in ('correo', 'papel'):
        raise validacion('Elige el canal de recepción.')
    if datos.fecha_recepcion is None or datos.fecha_recepcion.tzinfo is None:
        raise validacion('Escribe la fecha y hora de recepción.')
    async with transaccion(pool) as con:
        documento = await _bloquear(con, id_documento)
        if datos.canal == documento['canal_inicial'] or documento['canal_segunda'] is not None:
            raise ErrorApi('CONFLICTO', 'Ya hay una recepción registrada por ese canal.', 409)
        if datos.fecha_recepcion < documento['fecha_recepcion_inicial']:
            raise validacion('La segunda recepción no puede ser anterior a la primera.')
        oficial = datos.fecha_recepcion.astimezone(ZONA).date() if datos.canal == 'papel' else None
        await documentos.segunda_recepcion(con, id_documento, datos.canal, datos.fecha_recepcion, oficial)


# ── O-25 Corregir un turno ─────────────────────────────────────────────────────


async def corregir(
    pool: AsyncConnectionPool,
    ctx: m.ContextoUsuario,
    id_movimiento: UUID,
    correccion: m.Correccion,
    ahora: datetime | None = None,
) -> m.Movimiento:
    """O-25. Inserta un movimiento `correccion` con el rol nuevo; el original queda intacto (RF-15) y los pendientes
    se recalculan con el rol corregido (vista `pendiente`). El grupo sigue con un solo responsable (RI-10)."""
    _exigir_oficialia(ctx)
    if correccion.rol not in m.ROLES_TURNO:
        raise validacion('Elige el rol corregido.')
    motivo = correccion.motivo.strip()
    if not motivo:
        raise validacion('Escribe el motivo de la corrección.')
    ahora = ahora or datetime.now(UTC)
    async with transaccion(pool) as con:
        original = await movimientos.buscar(con, id_movimiento)
        if original is None:
            raise no_encontrado('El movimiento no existe.')
        if original['tipo'] != 'turno':
            raise validacion('Solo se corrige el rol de un turno.')
        if (await _bloquear(con, original['id_documento']))['estado'] != 'en_tramite':
            raise estado_invalido(NO_TRAMITE)
        if correccion.rol == original['rol_vigente']:
            raise validacion('El valor corregido es igual al actual.')
        roles = await movimientos.roles_vigentes_del_grupo(con, original['id_grupo_turno'])
        roles[id_movimiento] = correccion.rol
        responsables = sum(r == 'responsable' for r in roles.values())
        if responsables == 0:
            raise validacion('Falta un responsable en el grupo.')
        if responsables > 1:
            raise validacion('Solo puede haber un responsable en el grupo.')
        fila = nuevo_movimiento(
            ctx,
            original['id_documento'],
            ahora,
            tipo='correccion',
            id_grupo_turno=original['id_grupo_turno'],
            id_area_origen=original['id_area_origen'],
            id_area_destino=original['id_area_destino'],
            rol=correccion.rol,
            instruccion=motivo,
            id_titular_al_turnar=original['id_titular_al_turnar'],
            id_movimiento_corregido=id_movimiento,
        )
        await movimientos.insertar(con, fila)
        await replicas.encolar_movimiento(con, fila)
    return a_salida(fila)


# ── O-26 Posibles duplicados ───────────────────────────────────────────────────


async def posibles_duplicados(
    pool: AsyncConnectionPool, ctx: m.ContextoUsuario, pagina: int, tamano: int
) -> m.Listado[m.ResumenDocumento]:
    """O-26. Documentos marcados (sin número o sin fecha, D-27) que esperan revisión."""
    _exigir_oficialia(ctx)
    tamano, pagina = min(max(tamano, 1), 100), max(pagina, 1)
    async with pool.connection() as con:
        filas = await documentos.posibles_duplicados(con, tamano, (pagina - 1) * tamano)
    return m.Listado[m.ResumenDocumento](
        elementos=[m.ResumenDocumento(**f) for f in filas], total=filas[0]['total'] if filas else 0
    )


def _palabras(texto: str) -> set[str]:
    sin_acentos = unicodedata.normalize('NFD', texto.lower()).encode('ascii', 'ignore').decode()
    return {p for p in re.findall(r'[a-z0-9]+', sin_acentos) if len(p) >= 4}


def sintesis_coincide(a: str, b: str) -> bool:
    """Comparten al menos la mitad de las palabras de 4 letras o más, sin acentos (Apéndice A)."""
    pa, pb = _palabras(a), _palabras(b)
    if not pa or not pb:
        return False
    return len(pa & pb) >= math.ceil(min(len(pa), len(pb)) / 2)


async def _marcado(con: AsyncConnection, id_documento: UUID) -> dict:
    documento = await _bloquear(con, id_documento)
    if not documento['posible_duplicado'] or documento['estado'] != 'en_tramite':
        raise estado_invalido(SIN_REVISION)
    return documento


async def comparar(pool: AsyncConnectionPool, ctx: m.ContextoUsuario, id_documento: UUID) -> m.ComparacionDuplicado:
    """O-26. El marcado frente al candidato registrado antes, del mismo emisor."""
    _exigir_oficialia(ctx)
    async with transaccion(pool) as con:
        marcado = await _marcado(con, id_documento)
        posterior = await documentos.comparado(con, id_documento)
        candidato = await documentos.candidato_duplicado(con, marcado)
    coincidencias = []
    if candidato:
        if posterior['numero_emisor'] and posterior['numero_emisor'] == candidato['numero_emisor']:
            coincidencias.append('numero_emisor')
        coincidencias.append('emisor')
        if posterior['fecha_documento'] and posterior['fecha_documento'] == candidato['fecha_documento']:
            coincidencias.append('fecha_documento')
        if sintesis_coincide(posterior['sintesis'], candidato['sintesis']):
            coincidencias.append('sintesis')
    return m.ComparacionDuplicado(
        posterior=m.DocumentoComparado(**posterior),
        candidato=m.DocumentoComparado(**candidato) if candidato else None,
        coincidencias=coincidencias,
    )


async def resolver(
    pool: AsyncConnectionPool, ctx: m.ContextoUsuario, id_documento: UUID, datos: m.ResolucionDuplicado
) -> None:
    """O-26. «Son el mismo»: el posterior queda cancelado con `duplicado_de` y conserva sus movimientos (D-20).
    «Son distintos»: solo se retira la marca."""
    _exigir_oficialia(ctx)
    if datos.decision not in ('mismo', 'distintos'):
        raise validacion('Elige «son el mismo» o «son distintos».')
    async with transaccion(pool) as con:
        posterior = await _marcado(con, id_documento)
        if datos.decision == 'distintos':
            await documentos.actualizar_estado(con, id_documento, {'posible_duplicado': False})
            return
        otro = (await documentos.resumen(con, [datos.id_otro])).get(datos.id_otro) if datos.id_otro else None
        if otro is None:
            raise no_encontrado()
        if otro['sentido'] != 'entrada' or otro['fecha_registro'] >= posterior['fecha_registro']:
            raise validacion('Compara con un documento registrado antes.')
        if otro['estado'] == 'cancelado':
            raise validacion('El original está cancelado.')
        await documentos.actualizar_estado(
            con,
            id_documento,
            {
                'estado': 'cancelado',
                'duplicado_de': otro['id'],
                'motivo_cancelacion': f'Duplicado de {otro["folio"]}',
                'posible_duplicado': False,
            },
        )
        await replicas.encolar_estado(con, id_documento, 'cancelado')
