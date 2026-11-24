"""O-11 y C1. Ficha integrada de un documento y su recorrido (D-29, D-53).

PostgreSQL primero (existencia, visibilidad, registro y ubicación). Después MongoDB (expediente) y Neo4j (recorrido,
referencias y asuntos) en paralelo, con un tiempo límite por base: si una no responde, la ficha devuelve lo demás y
marca la sección en `secciones_no_disponibles`.
"""

import asyncio
from uuid import UUID

from neo4j import AsyncDriver
from psycopg import AsyncConnection
from psycopg_pool import AsyncConnectionPool
from pymongo.asynchronous.database import AsyncDatabase

from app.dominio import modelos as m
from app.dominio.errores import ErrorApi, no_encontrado, sin_permiso
from app.repositorios.documental import expedientes
from app.repositorios.grafo import consultas
from app.repositorios.relacional import catalogos, documentos, movimientos
from app.seguridad import visibilidad
from app.servicios.bandeja import describir

ROLES_LECTURA = {'OF', 'DI', 'TI', 'PE'}
TIEMPO_LIMITE_S = 2.0
SIN_CONTENIDO = 'No tienes visibilidad sobre el contenido de este documento.'


def base_no_disponible(base: str) -> ErrorApi:
    return ErrorApi('BASE_NO_DISPONIBLE', f'{base} no responde; inténtalo en unos segundos.', 503)


async def acceso(con: AsyncConnection, ctx: m.ContextoUsuario, id_documento: UUID) -> tuple[dict, bool, bool]:
    """D-29: el registro del documento, si el acceso es completo y si el contenido es visible para `ctx`."""
    if ctx.rol not in ROLES_LECTURA:
        raise sin_permiso()
    registro = await documentos.registro(con, id_documento)
    if registro is None:
        raise no_encontrado()
    involucra = await movimientos.involucramiento(con, id_documento, ctx.id_area, ctx.id_persona)
    completo = visibilidad.acceso_completo(ctx, involucra['area'])
    visible = completo and visibilidad.contenido_visible(
        ctx, registro['confidencial'], involucra['persona'], involucra['area']
    )
    return registro, completo, visible


async def expediente_con_nombres(con: AsyncConnection, crudo: dict) -> m.Expediente:
    """El expediente de MongoDB con los nombres de autores y áreas que muestra la interfaz."""
    personas, areas = await catalogos.nombres(
        con, [n['id_persona'] for n in crudo['notas']], [n['id_area'] for n in crudo['notas']]
    )
    return m.Expediente(
        datos_tipo=crudo['datos_tipo'],
        anexos=[m.Anexo(**a) for a in crudo['anexos']],
        notas=[
            m.Nota(
                id=n['id'],
                tipo=n['tipo'],
                area=areas.get(n['id_area'], ''),
                autor=personas.get(n['id_persona'], ''),
                fecha_hora=n['fecha_hora'],
                texto=n['texto'],
            )
            for n in crudo['notas']
        ],
    )


async def recorrido_con_detalle(con: AsyncConnection, ids: list[str]) -> list[m.MovimientoRecorrido]:
    """C1: el orden sale del grafo y los detalles (nombres, instrucción, forma) de PostgreSQL, la fuente."""
    detalle = await movimientos.detalle(con, [UUID(i) for i in ids])
    return [m.MovimientoRecorrido(**detalle[UUID(i)]) for i in ids if UUID(i) in detalle]


async def _con_limite(corrutina):
    async with asyncio.timeout(TIEMPO_LIMITE_S):
        return await corrutina


async def _nada():
    return None


async def obtener(
    pool: AsyncConnectionPool, db: AsyncDatabase, grafo: AsyncDriver, ctx: m.ContextoUsuario, id_documento: UUID
) -> m.Ficha:
    """O-11. Ficha completa; restringida (solo estado y responsable) para un documento de otra área; sin contenido
    para un confidencial ajeno (el recorrido sí se ve)."""
    async with pool.connection() as con:
        fila, completo, visible = await acceso(con, ctx, id_documento)
        ubicacion = [
            m.UbicacionActual(**{k: u[k] for k in ('area', 'rol', 'desde', 'antiguedad_dias')}, llegada=describir(u))
            for u in await documentos.ubicacion(con, id_documento)
        ]
    segunda = (
        m.Recepcion(canal=fila['canal_segunda'], fecha_recepcion=fila['fecha_recepcion_segunda'])
        if fila['canal_segunda']
        else None
    )
    registro = m.RegistroDocumento(
        **{k: v for k, v in fila.items() if k in m.RegistroDocumento.model_fields and k not in ('asunto', 'sintesis')},
        # El asunto es la síntesis (D-43): con el contenido oculto tampoco se muestra.
        asunto=fila['asunto'] if visible else None,
        sintesis=fila['sintesis'] if visible else None,
        segunda_recepcion=segunda,
    )
    if not completo:
        # D-29 (igual que O-30): de otra área solo folio, tipo, estado y ubicación actual.
        solo = {'id', 'folio', 'tipo', 'estado', 'confidencial', 'posible_duplicado', 'extemporaneo'}
        restringido = m.RegistroDocumento(**{k: (v if k in solo else None) for k, v in registro.model_dump().items()})
        return m.Ficha(
            acceso='restringido',
            contenido_oculto=False,
            registro=restringido,
            ubicacion_actual=ubicacion,
            expediente=None,
            recorrido=None,
            relaciones=None,
            asuntos=None,
            secciones_no_disponibles=[],
        )

    crudo, del_grafo = await asyncio.gather(
        _con_limite(expedientes.leer(db, str(id_documento))) if visible else _nada(),
        _con_limite(consultas.ficha(grafo, str(id_documento))),
        return_exceptions=True,
    )
    faltan: list = []
    expediente = recorrido = relaciones = asuntos = None
    async with pool.connection() as con:
        if visible:
            if isinstance(crudo, BaseException) or crudo is None:
                faltan.append('expediente')  # sin respuesta, o el outbox aún no lo crea
            else:
                expediente = await expediente_con_nombres(con, crudo)
        if isinstance(del_grafo, BaseException):
            faltan += ['recorrido', 'relaciones']
        else:
            recorrido = await recorrido_con_detalle(con, del_grafo['movimientos'])
            if visible:
                relaciones = await _relaciones(con, del_grafo['referencias'])
                asuntos = [m.AsuntoResumen(**a) for a in del_grafo['asuntos']]
    return m.Ficha(
        acceso='completo',
        contenido_oculto=not visible,
        registro=registro,
        ubicacion_actual=ubicacion,
        expediente=expediente,
        recorrido=recorrido,
        relaciones=relaciones,
        asuntos=asuntos,
        secciones_no_disponibles=faltan,
    )


async def _relaciones(con: AsyncConnection, referencias: list[dict]) -> list[m.Relacion]:
    """Referencias del grafo con el folio, el asunto y el estado de los documentos registrados (D-33)."""
    registrados = await documentos.resumen(con, [UUID(r['id_documento']) for r in referencias if r['id_documento']])
    relaciones = []
    for r in referencias:
        otro = registrados.get(UUID(r['id_documento'])) if r['id_documento'] else None
        relaciones.append(
            m.Relacion(
                tipo=r['tipo'].lower(),
                sentido='sale' if r['sale'] else 'entra',
                id_documento=r['id_documento'],
                referencia=otro['folio'] if otro else r['numero'] or '',
                descripcion=otro['sintesis'] if otro else r['emisor'],
                estado=otro['estado'] if otro else None,
            )
        )
    return relaciones


async def obtener_recorrido(
    pool: AsyncConnectionPool, grafo: AsyncDriver, ctx: m.ContextoUsuario, id_documento: UUID
) -> list[m.MovimientoRecorrido]:
    """C1. El recorrido no se pagina; con acceso restringido no se ve."""
    async with pool.connection() as con:
        _, completo, _ = await acceso(con, ctx, id_documento)
        if not completo:
            raise sin_permiso('No puedes ver el recorrido de este documento.')
    try:
        del_grafo = await _con_limite(consultas.ficha(grafo, str(id_documento)))
    except Exception:
        raise base_no_disponible('Neo4j') from None
    async with pool.connection() as con:
        return await recorrido_con_detalle(con, del_grafo['movimientos'])


async def obtener_expediente(
    pool: AsyncConnectionPool, db: AsyncDatabase, ctx: m.ContextoUsuario, id_documento: UUID
) -> m.Expediente:
    """O-09 (lectura). Exige ver el contenido."""
    async with pool.connection() as con:
        _, _, visible = await acceso(con, ctx, id_documento)
        if not visible:
            raise sin_permiso(SIN_CONTENIDO)
        try:
            crudo = await _con_limite(expedientes.leer(db, str(id_documento)))
        except Exception:
            raise base_no_disponible('MongoDB') from None
        if crudo is None:
            raise base_no_disponible('El expediente')
        return await expediente_con_nombres(con, crudo)
