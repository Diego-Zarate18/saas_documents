"""O-33 a O-35. Áreas, personas y usuarios, y actores externos. Nada se borra (D-20)."""

import re
import uuid
from uuid import UUID

from psycopg_pool import AsyncConnectionPool

from app.dominio import modelos as m
from app.dominio.errores import ErrorApi, estado_invalido, no_encontrado, sin_permiso, validacion
from app.infra.postgres import transaccion
from app.repositorios.relacional import administracion as adm
from app.seguridad import contrasenas
from app.servicios import replicas

# Contraseña inicial de una cuenta nueva (solo desarrollo, la misma de la semilla): no hay flujo de cambio aún.
CONTRASENA_INICIAL = 'sigedoc-dev'


def conflicto(titulo: str) -> ErrorApi:
    return ErrorApi('CONFLICTO', titulo, 409)


def _exigir(ctx: m.ContextoUsuario, roles: set[str]) -> None:
    if ctx.rol not in roles:
        raise sin_permiso()


# ── O-33 Áreas ─────────────────────────────────────────────────────────────────


async def guardar_area(
    pool: AsyncConnectionPool, ctx: m.ContextoUsuario, datos: m.DatosArea, id_area: UUID | None = None
) -> m.Area:
    """O-33. Alta (sin id) o cambio. Sin ciclos: se sube desde el padre propuesto con la tabla bloqueada (D-47,
    AR-09); siglas fijas si el área ya emitió folios (D-61); el titular debe estar adscrito al área."""
    _exigir(ctx, {'AD'})
    siglas, nombre = datos.siglas.strip().upper(), datos.nombre.strip()
    if not siglas:
        raise validacion('Escribe las siglas.')
    if not nombre:
        raise validacion('Escribe el nombre del área.')
    if not re.fullmatch(r'[A-Z]{2,5}', siglas):
        raise validacion('Las siglas son de 2 a 5 letras, sin acentos.')
    async with transaccion(pool) as con:
        await adm.bloquear_areas(con)
        actual = await adm.area(con, id_area) if id_area else None
        if id_area and actual is None:
            raise no_encontrado('El área no existe.')
        es_raiz = actual is not None and actual['id_area_padre'] is None
        if datos.id_padre is None and not es_raiz:
            raise validacion('Elige el área de la que depende.')
        if datos.id_padre is not None:
            padre = await adm.area(con, datos.id_padre)
            if padre is None or not padre['activa']:
                raise validacion('El área de la que depende no existe o está inactiva.')
            if id_area and (datos.id_padre == id_area or await adm.crearia_ciclo(con, id_area, datos.id_padre)):
                raise validacion('No puede depender de un área que depende de ella.')
        if datos.id_titular is not None:
            titular = await adm.persona(con, datos.id_titular)
            if id_area is None or titular is None or not titular['activa'] or titular['id_area'] != id_area:
                raise validacion('El titular debe estar adscrito al área.')
        if await adm.siglas_ocupadas(con, siglas, id_area):
            raise conflicto('Ya existe un área con esas siglas.')
        if actual and actual['siglas'] != siglas and actual['con_folios']:
            raise conflicto('Las siglas no cambian: el área ya tiene folios emitidos (D-61).')
        id_area = id_area or uuid.uuid4()
        await adm.guardar_area(
            con,
            {
                'id_area': id_area,
                'siglas': siglas,
                'nombre': nombre,
                'id_padre': datos.id_padre,
                'id_titular': datos.id_titular,
            },
        )
        await replicas.encolar_area(con, id_area, siglas)
        return m.Area(**await adm.area_publica(con, id_area))


async def desactivar_area(pool: AsyncConnectionPool, ctx: m.ContextoUsuario, id_area: UUID) -> None:
    """O-33. Se desactiva, no se borra (D-20); no con documentos pendientes (D-42) ni con áreas activas que dependan
    de ella."""
    _exigir(ctx, {'AD'})
    async with transaccion(pool) as con:
        await adm.bloquear_areas(con)
        if await adm.area(con, id_area) is None:
            raise no_encontrado('El área no existe.')
        if pendientes := await adm.pendientes_del_area(con, id_area):
            raise conflicto(
                f'No se puede desactivar: tiene {pendientes} documentos pendientes. '
                'Turna o concluye esos documentos primero.'
            )
        if await adm.hijas_activas(con, id_area):
            raise conflicto('No se puede desactivar: tiene áreas activas que dependen de ella.')
        await adm.desactivar_area(con, id_area)


# ── O-34 Personas y usuarios ───────────────────────────────────────────────────


async def personas(pool: AsyncConnectionPool, ctx: m.ContextoUsuario) -> m.Listado[m.Persona]:
    """O-34. Todas, incluidas las dadas de baja."""
    _exigir(ctx, {'AD'})
    async with pool.connection() as con:
        filas = await adm.personas(con)
    return m.Listado[m.Persona](elementos=[m.Persona(**f) for f in filas], total=len(filas))


async def guardar_persona(
    pool: AsyncConnectionPool, ctx: m.ContextoUsuario, datos: m.DatosPersona, id_persona: UUID | None = None
) -> m.Persona:
    """O-34. Alta o cambio de una persona con su usuario. Correo único; si un titular cambia de área, la suya queda
    vacante. Una cuenta nueva recibe la contraseña inicial con hash (D-49, D-107)."""
    _exigir(ctx, {'AD'})
    nombre, correo = datos.nombre.strip(), datos.correo.strip().lower()
    if not nombre:
        raise validacion('Escribe el nombre completo.')
    if not correo:
        raise validacion('Escribe el correo.')
    if not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', correo):
        raise validacion('Escribe un correo válido.')
    if datos.id_area is None:
        raise validacion('Elige el área de adscripción.')
    if datos.rol not in m.ROLES:
        raise validacion('Elige el rol.')
    async with transaccion(pool) as con:
        area = await adm.area(con, datos.id_area)
        if area is None or not area['activa']:
            raise validacion('Elige el área de adscripción.')
        if id_persona:
            actual = await adm.persona(con, id_persona)
            if actual is None:
                raise no_encontrado('La persona no existe.')
            if not actual['activa']:
                raise estado_invalido('La persona está dada de baja.')
        if await adm.correo_ocupado(con, correo, id_persona):
            raise conflicto('Ya existe un usuario con este correo.')
        id_persona = id_persona or uuid.uuid4()
        await adm.dejar_vacante(con, id_persona, salvo_area=datos.id_area)
        await adm.guardar_persona(
            con,
            {'id': id_persona, 'nombre': nombre, 'correo': correo, 'id_area': datos.id_area, 'rol': datos.rol},
            contrasenas.cifrar(CONTRASENA_INICIAL),
        )
        await replicas.encolar_persona(con, id_persona, nombre)
        return m.Persona(**await adm.persona(con, id_persona))


async def dar_de_baja(pool: AsyncConnectionPool, ctx: m.ContextoUsuario, id_persona: UUID) -> None:
    """O-34. Baja lógica: conserva sus movimientos y, si era titular, el área queda vacante."""
    _exigir(ctx, {'AD'})
    if id_persona == ctx.id_persona:
        raise validacion('No puedes darte de baja a ti mismo.')
    async with transaccion(pool) as con:
        if await adm.persona(con, id_persona) is None:
            raise no_encontrado('La persona no existe.')
        await adm.dejar_vacante(con, id_persona)
        await adm.dar_de_baja(con, id_persona)


# ── O-35 Actores externos ──────────────────────────────────────────────────────


async def actores(pool: AsyncConnectionPool, ctx: m.ContextoUsuario) -> m.Listado[m.ActorExterno]:
    """O-35. Todos, incluidos los inactivos, con cuántos documentos emitieron o recibieron."""
    _exigir(ctx, {'OF', 'AD'})
    async with pool.connection() as con:
        filas = await adm.actores(con)
    return m.Listado[m.ActorExterno](elementos=[m.ActorExterno(**f) for f in filas], total=len(filas))


async def guardar_actor(
    pool: AsyncConnectionPool, ctx: m.ContextoUsuario, datos: m.DatosActor, id_actor: UUID | None = None
) -> m.ActorExterno:
    """O-35. Nombre único sin distinguir mayúsculas (decisión de T-02b)."""
    _exigir(ctx, {'OF', 'AD'})
    nombre = datos.nombre.strip()
    if not nombre:
        raise validacion('Escribe el nombre del actor.')
    if datos.tipo not in m.TIPOS_ACTOR:
        raise validacion('Elige el tipo de actor.')
    async with transaccion(pool) as con:
        if id_actor and await adm.actor(con, id_actor) is None:
            raise no_encontrado('El actor no existe.')
        if await adm.nombre_de_actor_ocupado(con, nombre, id_actor):
            raise conflicto('Ya existe un actor con ese nombre.')
        id_actor = id_actor or uuid.uuid4()
        await adm.guardar_actor(
            con,
            {
                'id': id_actor,
                'nombre': nombre,
                'tipo': datos.tipo,
                'correo': (datos.correo or '').strip() or None,
                'telefono': (datos.telefono or '').strip() or None,
            },
        )
        return m.ActorExterno(**await adm.actor(con, id_actor))


async def desactivar_actor(pool: AsyncConnectionPool, ctx: m.ContextoUsuario, id_actor: UUID) -> None:
    """O-35. Deja de ofrecerse al registrar y conserva sus documentos (D-20)."""
    _exigir(ctx, {'OF', 'AD'})
    async with transaccion(pool) as con:
        if await adm.actor(con, id_actor) is None:
            raise no_encontrado('El actor no existe.')
        await adm.desactivar_actor(con, id_actor)
