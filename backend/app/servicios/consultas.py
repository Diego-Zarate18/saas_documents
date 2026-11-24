"""C3 rebotes, O-30 búsqueda y selector de documentos, y acuses del área responsable (D-58)."""

import asyncio
import re
from collections import defaultdict
from datetime import UTC, date, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from neo4j import AsyncDriver
from psycopg_pool import AsyncConnectionPool
from pymongo.asynchronous.database import AsyncDatabase

from app.dominio import modelos as m
from app.dominio.errores import sin_permiso, validacion
from app.repositorios.documental import expedientes
from app.repositorios.grafo import consultas as grafo_consultas
from app.repositorios.relacional import busqueda, salidas
from app.repositorios.relacional import consultas as datos
from app.seguridad import visibilidad
from app.servicios.ficha import base_no_disponible

ZONA = ZoneInfo('America/Mexico_City')
ROLES_LECTURA = {'OF', 'DI', 'TI', 'PE'}


# ── C3 Rebotes ─────────────────────────────────────────────────────────────────


def _mes(periodo: str | None) -> tuple[datetime, datetime]:
    if periodo is None:
        hoy = datetime.now(UTC).astimezone(ZONA)
        periodo = f'{hoy.year:04d}-{hoy.month:02d}'
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', periodo):
        raise validacion('El periodo es un mes AAAA-MM.')
    anio, mes = map(int, periodo.split('-'))
    desde = datetime(anio, mes, 1, tzinfo=ZONA)
    hasta = datetime(anio + (mes == 12), mes % 12 + 1, 1, tzinfo=ZONA)
    # En UTC: el driver de Neo4j falla en Windows al serializar un datetime con zona ZoneInfo.
    return desde.astimezone(UTC), hasta.astimezone(UTC)


async def rebotes(
    pool: AsyncConnectionPool, grafo: AsyncDriver, ctx: m.ContextoUsuario, periodo: str | None, id_area: UUID | None
) -> m.Listado[m.Rebote]:
    """C3 (AG-03) con las reglas de D-32 sobre los movimientos del periodo de documentos en trámite: «no competencia»
    sin área sugerida, tres o más devoluciones y tres o más áreas responsables distintas sin contar oficialía ni el
    registro (HU-F1). Parte de los movimientos del periodo, nunca de un área (D-50)."""
    if ctx.rol not in ('OF', 'DI'):
        raise sin_permiso()
    desde, hasta = _mes(periodo)
    try:
        movimientos = await grafo_consultas.movimientos_del_periodo(grafo, desde, hasta)
    except Exception:
        raise base_no_disponible('Neo4j') from None
    async with pool.connection() as con:
        oficialia = {str(a) for a in await datos.areas_de_oficialia(con)}
    por_documento: dict[str, dict] = defaultdict(
        lambda: {'devoluciones': 0, 'sin_area': False, 'responsables': set(), 'tocadas': set()}
    )
    for mov in movimientos:
        d = por_documento[mov['id_documento']]
        d['tocadas'].update([mov['hacia'], *mov['desde']])
        if mov['tipo'] == 'devolucion':
            d['devoluciones'] += 1
            d['sin_area'] |= mov['motivo'] == 'no_competencia' and mov['id_area_sugerida'] is None
        if mov['rol'] == 'responsable' and mov['tipo'] != 'registro' and mov['hacia'] not in oficialia:
            d['responsables'].add(mov['hacia'])
    candidatos = {}
    for id_doc, d in por_documento.items():
        if id_area and str(id_area) not in d['tocadas']:
            continue
        reglas = [
            regla
            for regla, cumple in (
                ('no_competencia_sin_area', d['sin_area']),
                ('tres_devoluciones', d['devoluciones'] >= 3),
                ('tres_areas', len(d['responsables']) >= 3),
            )
            if cumple
        ]
        if reglas:
            candidatos[UUID(id_doc)] = (reglas, len(d['responsables']))
    async with pool.connection() as con:
        filas = await datos.documentos(con, list(candidatos), ctx.id_persona, ctx.id_area)
    elementos = []
    for id_doc, (reglas, areas) in candidatos.items():
        fila = filas.get(id_doc)
        if fila is None or fila['estado'] != 'en_tramite':
            continue
        visible = visibilidad.acceso_completo(ctx, fila['area_involucrada']) and visibilidad.contenido_visible(
            ctx, fila['confidencial'], fila['persona_involucrada'], fila['area_involucrada']
        )
        elementos.append(
            m.Rebote(
                id_documento=id_doc,
                folio=fila['folio'],
                asunto=fila['sintesis'] if visible else None,
                reglas=reglas,
                areas=areas,
                ubicacion=fila['responsable'],
            )
        )
    elementos.sort(key=lambda r: r.folio, reverse=True)
    return m.Listado[m.Rebote](elementos=elementos, total=len(elementos))


# ── O-30 Búsqueda y selector ───────────────────────────────────────────────────


def _contexto(ctx: m.ContextoUsuario) -> dict:
    return busqueda.contexto_sql(ctx.id_persona, ctx.id_area, ctx.ve_recorrido_completo, ctx.rol == 'TI')


async def buscar(
    pool: AsyncConnectionPool,
    db: AsyncDatabase,
    ctx: m.ContextoUsuario,
    filtros: dict,
    campo_tipo: str | None,
    valor_campo: str | None,
    pagina: int,
    tamano: int,
) -> m.Listado[m.ResultadoBusqueda]:
    """O-30. Todos los documentos recibidos aparecen, con la visibilidad de D-29; el campo del tipo se busca en
    MongoDB y la visibilidad se filtra en PostgreSQL (D-46)."""
    if ctx.rol not in ROLES_LECTURA:
        raise sin_permiso()
    tamano, pagina = min(max(tamano, 1), 100), max(pagina, 1)
    ids_campo = None
    if campo_tipo or valor_campo:
        if campo_tipo not in expedientes.TIPO_DEL_CAMPO:
            raise validacion('Solo se busca por ente auditor o solicitante (D-46).')
        if (valor_campo or '').strip():
            try:
                async with asyncio.timeout(2.0):
                    ids = await expedientes.buscar_por_campo(db, campo_tipo, valor_campo.strip())
            except Exception:
                raise base_no_disponible('MongoDB') from None
            ids_campo = [UUID(i) for i in ids]
    limpios = {k: v.strip() if isinstance(v, str) else v for k, v in filtros.items() if v not in (None, '')}
    async with pool.connection() as con:
        filas = await busqueda.buscar(con, limpios, ids_campo, _contexto(ctx), tamano, (pagina - 1) * tamano)
    elementos = []
    for f in filas:
        nivel = 'restringida' if not f['completo'] else 'completa' if f['visible'] else 'confidencial'
        elementos.append(
            m.ResultadoBusqueda(
                id=f['id'],
                folio=f['folio'],
                numero_emisor=None if nivel == 'restringida' else f['numero_emisor'],
                sintesis=f['sintesis'] if nivel == 'completa' else None,
                tipo=f['tipo'],
                estado=f['estado'],
                area_responsable=f['area_responsable'],
                visibilidad=nivel,
            )
        )
    return m.Listado[m.ResultadoBusqueda](elementos=elementos, total=filas[0]['total'] if filas else 0)


async def selector(pool: AsyncConnectionPool, ctx: m.ContextoUsuario, texto: str) -> m.Listado[m.DocumentoEncontrado]:
    """O-30 reducido a los selectores de documento: hasta 8, primero las salidas."""
    if ctx.rol not in ROLES_LECTURA:
        raise sin_permiso()
    if not texto.strip():
        return m.Listado[m.DocumentoEncontrado](elementos=[], total=0)
    async with pool.connection() as con:
        filas = await busqueda.selector(con, texto.strip(), _contexto(ctx), ctx.ve_recorrido_completo)
    elementos = [m.DocumentoEncontrado(**{k: f[k] for k in m.DocumentoEncontrado.model_fields}) for f in filas]
    return m.Listado[m.DocumentoEncontrado](elementos=elementos, total=len(elementos))


# ── Acuses del área (D-58) ─────────────────────────────────────────────────────


async def acuses(pool: AsyncConnectionPool, ctx: m.ContextoUsuario) -> m.Listado[m.Acuse]:
    """D-58: salidas con acuse cuyo documento de origen está pendiente en el área del usuario como responsable."""
    if ctx.rol not in ('TI', 'PE') or ctx.id_area is None:
        raise sin_permiso()
    async with pool.connection() as con:
        filas = await salidas.acuses_del_area(con, ctx.id_area)
    return m.Listado[m.Acuse](elementos=[m.Acuse(**f) for f in filas], total=len(filas))


def filtros_de_busqueda(
    texto: str | None,
    folio: str | None,
    numero: str | None,
    emisor: str | None,
    tipo: str | None,
    estado: str | None,
    desde: date | None,
    hasta: date | None,
) -> dict:
    return {
        'texto': texto,
        'folio': folio,
        'numero': numero,
        'emisor': emisor,
        'tipo': tipo,
        'estado': estado,
        'desde': desde,
        'hasta': hasta,
    }
