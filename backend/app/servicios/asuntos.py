"""O-27, O-08 y O-18 (asuntos), C2 hilo y C5 alcance (D-24, D-25, D-29, D-30, D-50)."""

import uuid
from collections import Counter
from datetime import UTC, datetime
from uuid import UUID

from neo4j import AsyncDriver
from psycopg import AsyncConnection
from psycopg_pool import AsyncConnectionPool

from app.dominio import modelos as m
from app.dominio.errores import ErrorApi, no_encontrado, sin_permiso, validacion
from app.repositorios.grafo import asuntos, consultas
from app.repositorios.relacional import consultas as datos
from app.repositorios.relacional import documentos
from app.seguridad import visibilidad
from app.servicios.ficha import SIN_CONTENIDO, acceso
from app.servicios.referencias import grafo_atrasado

ROLES_LECTURA = {'OF', 'DI', 'TI', 'PE'}
NO_EXISTE = 'El asunto no existe.'


def _leer(ctx: m.ContextoUsuario) -> None:
    if ctx.rol not in ROLES_LECTURA:
        raise sin_permiso()


async def _modelo(con: AsyncConnection, crudo: dict, responsables: dict[UUID, list[str]]) -> m.Asunto:
    creador = await datos.nombres_de_personas(con, [UUID(crudo['id_persona'])])
    areas = sorted({a for d in crudo['documentos'] for a in responsables.get(UUID(d), [])})
    return m.Asunto(
        id=crudo['id'],
        nombre=crudo['nombre'],
        descripcion=crudo['descripcion'],
        creador=creador.get(UUID(crudo['id_persona']), ''),
        fecha=crudo['fecha'].to_native(),
        documentos=len(crudo['documentos']),
        areas=areas,
    )


async def _asunto(pool: AsyncConnectionPool, grafo: AsyncDriver, id_asunto: UUID) -> m.Asunto:
    crudo = await asuntos.obtener(grafo, str(id_asunto))
    if crudo is None:
        raise no_encontrado(NO_EXISTE)
    async with pool.connection() as con:
        responsables = await datos.responsables_hoy(con, [UUID(d) for d in crudo['documentos']])
        return await _modelo(con, crudo, responsables)


async def listar(
    pool: AsyncConnectionPool, grafo: AsyncDriver, ctx: m.ContextoUsuario, texto: str, pagina: int, tamano: int
) -> m.Listado[m.Asunto]:
    """Asuntos cuyo nombre contiene el texto, con cuántos documentos tienen y las áreas responsables hoy."""
    _leer(ctx)
    todos = await asuntos.listar(grafo, texto.strip())
    tamano, pagina = min(max(tamano, 1), 100), max(pagina, 1)
    pagina_actual = todos[(pagina - 1) * tamano : pagina * tamano]
    async with pool.connection() as con:
        responsables = await datos.responsables_hoy(con, [UUID(d) for a in pagina_actual for d in a['documentos']])
        elementos = [await _modelo(con, a, responsables) for a in pagina_actual]
    return m.Listado[m.Asunto](elementos=elementos, total=len(todos))


async def _documento_visible(pool: AsyncConnectionPool, ctx: m.ContextoUsuario, id_documento: UUID) -> None:
    async with pool.connection() as con:
        _, _, visible = await acceso(con, ctx, id_documento)
    if not visible:
        raise sin_permiso(SIN_CONTENIDO)


def _propiedades(ctx: m.ContextoUsuario, ahora: datetime) -> dict:
    return {'id': str(uuid.uuid4()), 'id_persona': str(ctx.id_persona), 'fecha_hora': ahora}


async def crear(
    pool: AsyncConnectionPool,
    grafo: AsyncDriver,
    ctx: m.ContextoUsuario,
    nuevo: m.NuevoAsunto,
    ahora: datetime | None = None,
) -> m.Asunto:
    """O-27 (y O-08 con documento). La visibilidad del documento se revisa antes de crear el asunto, para no dejarlo
    a medias."""
    if ctx.rol not in ({'TI', 'PE'} if nuevo.id_documento else {'OF', 'TI', 'PE'}):
        raise sin_permiso()
    nombre, descripcion = nuevo.nombre.strip(), nuevo.descripcion.strip()
    if not nombre:
        raise validacion('Escribe el nombre del asunto.')
    if not descripcion:
        raise validacion('Escribe la descripción del asunto.')
    if nuevo.id_documento:
        await _documento_visible(pool, ctx, nuevo.id_documento)
    ahora = ahora or datetime.now(UTC)
    id_asunto = uuid.uuid4()
    await asuntos.crear(
        grafo,
        {
            'id': str(id_asunto),
            'nombre': nombre,
            'descripcion': descripcion,
            'id_persona': str(ctx.id_persona),
            'fecha_hora': ahora,
        },
    )
    if nuevo.id_documento and not await asuntos.asignar(
        grafo, str(nuevo.id_documento), str(id_asunto), _propiedades(ctx, ahora)
    ):
        raise grafo_atrasado()
    return await _asunto(pool, grafo, id_asunto)


async def asignar(
    pool: AsyncConnectionPool,
    grafo: AsyncDriver,
    ctx: m.ContextoUsuario,
    id_asunto: UUID,
    asignacion: m.AsignacionAsunto,
    ahora: datetime | None = None,
) -> None:
    """O-08. El documento puede estar en varios asuntos (D-30). Los 404 se revisan antes que el rol."""
    id_documento = asignacion.id_documento
    async with pool.connection() as con:
        existe = id_documento and (await documentos.resumen(con, [id_documento])).get(id_documento)
    if not existe:
        raise no_encontrado()
    if await asuntos.obtener(grafo, str(id_asunto)) is None:
        raise no_encontrado(NO_EXISTE)
    if ctx.rol not in ('TI', 'PE'):
        raise sin_permiso()
    await _documento_visible(pool, ctx, id_documento)
    if await asuntos.pertenece(grafo, str(id_documento), str(id_asunto)):
        raise ErrorApi('CONFLICTO', 'El documento ya pertenece a ese asunto.', 409)
    if not await asuntos.asignar(
        grafo, str(id_documento), str(id_asunto), _propiedades(ctx, ahora or datetime.now(UTC))
    ):
        raise grafo_atrasado()


async def sacar(
    pool: AsyncConnectionPool, grafo: AsyncDriver, ctx: m.ContextoUsuario, id_asunto: UUID, id_documento: UUID
) -> None:
    """O-18. Borra la pertenencia, nunca el asunto (AG-09, D-25)."""
    if ctx.rol not in ('OF', 'TI', 'PE'):
        raise sin_permiso()
    await _documento_visible(pool, ctx, id_documento)
    if not await asuntos.sacar(grafo, str(id_documento), str(id_asunto)):
        raise no_encontrado('El documento no pertenece a ese asunto.')


def _descripcion_visible(ctx: m.ContextoUsuario, fila: dict) -> bool:
    """D-29 en el hilo: una salida solo la describen OF, DI y su área emisora; un documento, quien ve su contenido."""
    if fila['sentido'] == 'salida':
        return ctx.ve_recorrido_completo or fila['id_area_emisora'] == ctx.id_area
    completo = visibilidad.acceso_completo(ctx, fila['area_involucrada'])
    return completo and visibilidad.contenido_visible(
        ctx, fila['confidencial'], fila['persona_involucrada'], fila['area_involucrada']
    )


async def hilo(pool: AsyncConnectionPool, grafo: AsyncDriver, ctx: m.ContextoUsuario, id_asunto: UUID) -> m.HiloAsunto:
    """C2 (AG-02). Primero los documentos del asunto, por folio; después lo que llega por referencias, de menor a
    mayor profundidad (hasta 6 saltos, D-50)."""
    _leer(ctx)
    asunto = await _asunto(pool, grafo, id_asunto)
    del_grafo = await consultas.hilo(grafo, str(id_asunto))
    registrados = [UUID(i) for i in del_grafo['raices']] + [
        UUID(n['id']) for n in del_grafo['alcanzados'] if not n['no_registrado']
    ]
    async with pool.connection() as con:
        filas = await datos.documentos(con, registrados, ctx.id_persona, ctx.id_area)

    def nodo_registrado(id_doc: str, **extra) -> m.NodoHilo | None:
        fila = filas.get(UUID(id_doc))
        if fila is None:
            return None
        return m.NodoHilo(
            id_documento=None if fila['sentido'] == 'salida' else fila['id'],
            referencia=fila['folio'],
            descripcion=fila['sintesis'] if _descripcion_visible(ctx, fila) else None,
            estado=fila['estado'],
            registrado=True,
            **extra,
        )

    raices = [n for i in del_grafo['raices'] if (n := nodo_registrado(i, pertenece=True, relacion=None, profundidad=0))]
    otros = []
    for x in del_grafo['alcanzados']:
        relacion = m.RelacionHilo(tipo=x['tipo'].lower(), sentido='entra' if x['entra'] else 'sale')
        if x['no_registrado']:
            otros.append(
                m.NodoHilo(
                    id_documento=None,
                    referencia=x['numero'],
                    descripcion=x['emisor'],
                    estado=None,
                    registrado=False,
                    pertenece=False,
                    relacion=relacion,
                    profundidad=x['profundidad'],
                )
            )
        elif n := nodo_registrado(x['id'], pertenece=False, relacion=relacion, profundidad=x['profundidad']):
            otros.append(n)
    raices.sort(key=lambda n: n.referencia)
    otros.sort(key=lambda n: (n.profundidad, n.referencia))
    return m.HiloAsunto(asunto=asunto, nodos=raices + otros)


async def alcance(
    pool: AsyncConnectionPool, grafo: AsyncDriver, ctx: m.ContextoUsuario, id_asunto: UUID
) -> m.AlcanceAsunto:
    """C5 (AG-04). Por área, cuántos documentos del asunto pasaron por ella; personas de los documentos que el
    usuario ve (los que no ve cuentan en las áreas, pero no aportan personas)."""
    _leer(ctx)
    if await asuntos.obtener(grafo, str(id_asunto)) is None:
        raise no_encontrado(NO_EXISTE)
    por_documento = await consultas.alcance(grafo, str(id_asunto))
    conteo = Counter(a for d in por_documento for a in set(d['areas']))
    async with pool.connection() as con:
        filas = await datos.documentos(
            con, [UUID(d['id_documento']) for d in por_documento], ctx.id_persona, ctx.id_area
        )
        personas = {
            UUID(p)
            for d in por_documento
            if (f := filas.get(UUID(d['id_documento']))) and _descripcion_visible(ctx, f)
            for p in d['personas']
            if p
        }
        nombres_areas = await datos.nombres_de_areas(con, [UUID(a) for a in conteo])
        nombres_personas = await datos.nombres_de_personas(con, list(personas))
    areas = sorted(
        (
            m.AreaAlcance(area=nombres_areas[UUID(a)], documentos=n)
            for a, n in conteo.items()
            if UUID(a) in nombres_areas
        ),
        key=lambda x: (-x.documentos, x.area),
    )
    return m.AlcanceAsunto(areas=areas, personas=sorted(set(nombres_personas.values())))
