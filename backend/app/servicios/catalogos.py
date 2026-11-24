"""O-31 y O-32. Catálogos y estructura organizacional (lectura)."""

from psycopg_pool import AsyncConnectionPool

from app.dominio import modelos as m
from app.repositorios.relacional import catalogos


async def consultar_catalogos(pool: AsyncConnectionPool) -> m.Catalogos:
    """O-31. Solo elementos activos para captura, en el orden en que se muestran."""
    async with pool.connection() as con:
        tipos = await catalogos.claves_activas(con, 'tipo_documento')
        motivos = await catalogos.claves_activas(con, 'motivo_devolucion')
        formas = await catalogos.claves_activas(con, 'forma_conclusion')
        actores = await catalogos.actores_activos(con)
    return m.Catalogos(
        tipos_documento=[t for t in m.TIPOS_DOCUMENTO if t in tipos],
        campos_tipo={t: c for t, c in m.CAMPOS_TIPO.items() if t in tipos},
        actores_externos=[m.ActorCatalogo(**a) for a in actores],
        motivos_devolucion=[x for x in m.MOTIVOS_DEVOLUCION if x in motivos],
        formas_conclusion=[x for x in m.FORMAS_CONCLUSION if x in formas],
        canales=m.CANALES,
        roles=m.ROLES,
        roles_turno=m.ROLES_TURNO,
        estados_documento=m.ESTADOS_DOCUMENTO,
        tipos_relacion=m.TIPOS_RELACION,
        tipos_actor=m.TIPOS_ACTOR,
    )


async def consultar_areas(pool: AsyncConnectionPool, solo_activas: bool) -> m.Listado[m.Area]:
    """O-32 reducido a los selectores: áreas con su titular."""
    async with pool.connection() as con:
        filas = await catalogos.areas(con, solo_activas)
    elementos = [m.Area(**f) for f in filas]
    return m.Listado[m.Area](elementos=elementos, total=len(elementos))


async def consultar_organizacion(pool: AsyncConnectionPool) -> m.Listado[m.AreaOrganizacion]:
    """O-32. Todas las áreas con personas activas, pendientes (D-42) y si ya tienen folios (D-61)."""
    async with pool.connection() as con:
        filas = await catalogos.areas(con, solo_activas=False)
        personas = await catalogos.personas_activas(con)
    elementos = [
        m.AreaOrganizacion(**f, personas=[m.PersonaArea(**p) for p in personas if p['id_area'] == f['id']])
        for f in filas
    ]
    return m.Listado[m.AreaOrganizacion](elementos=elementos, total=len(elementos))
