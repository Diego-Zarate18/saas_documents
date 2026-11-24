"""O-20 y O-21. Salidas externas y acuses (D-21, D-58, D-101, RI-06)."""

import uuid
from datetime import UTC, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from psycopg_pool import AsyncConnectionPool

from app.dominio import modelos as m
from app.dominio.errores import ErrorApi, no_encontrado, sin_permiso, validacion
from app.infra.postgres import transaccion
from app.repositorios.relacional import catalogos, documentos, salidas
from app.servicios import replicas

ZONA = ZoneInfo('America/Mexico_City')


def _oficialia(ctx: m.ContextoUsuario) -> None:
    if ctx.rol != 'OF':
        raise sin_permiso()


async def registrar(
    pool: AsyncConnectionPool, ctx: m.ContextoUsuario, nueva: m.NuevaSalida, ahora: datetime | None = None
) -> m.DocumentoRegistrado:
    """O-20. Folio con las siglas del área emisora, en la misma secuencia que sus documentos (D-21). Si responde a un
    documento, crea RESPONDE_A por el outbox (C2 la recorre)."""
    _oficialia(ctx)
    tipo, numero, sintesis = nueva.tipo.strip(), nueva.numero.strip(), nueva.sintesis.strip()
    destinatario = nueva.destinatario.strip()
    ahora = ahora or datetime.now(UTC)
    async with pool.connection() as con:
        if tipo not in await catalogos.claves_activas(con, 'tipo_documento'):
            raise validacion('Elige un tipo de documento del catálogo.')
        if any(c['obligatorio'] for c in m.CAMPOS_TIPO.get(tipo, [])):
            # El expediente de una salida no lleva campos del tipo, y el validador exige los obligatorios (D-66).
            raise validacion('Ese tipo de documento no se usa en una salida.')
        if nueva.id_area_emisora is None:
            raise validacion('Elige el área emisora.')
        cursor = await con.execute('SELECT 1 FROM area WHERE id_area = %s', (nueva.id_area_emisora,))
        if await cursor.fetchone() is None:
            raise validacion('Elige el área emisora.')
        if not numero:
            raise validacion('Escribe el número del documento.')
        if not destinatario:
            raise validacion('Elige el destinatario externo.')
        id_actor = await documentos.actor_activo_por_nombre(con, destinatario)
        if id_actor is None:
            raise validacion('Elige un actor externo activo del catálogo.')
        if not sintesis:
            raise validacion('Escribe la síntesis.')
        if nueva.id_responde_a and (await documentos.registro(con, nueva.id_responde_a)) is None:
            raise no_encontrado()

    id_salida = uuid.uuid4()
    anio = ahora.astimezone(ZONA).year
    async with transaccion(pool) as con:
        consecutivo = await documentos.reservar_consecutivo(con, nueva.id_area_emisora, anio)
        folio = f'{await documentos.siglas(con, nueva.id_area_emisora)}-{anio}-{consecutivo:04d}'
        salida = {
            'id_documento': id_salida,
            'tipo': tipo,
            'numero_emisor': numero,
            'id_area_emisora': nueva.id_area_emisora,
            'id_actor_destinatario': id_actor,
            'fecha_documento': ahora.astimezone(ZONA).date(),
            'sintesis': sintesis,
            'id_responde_a': nueva.id_responde_a,
            'fecha_registro': ahora,
            'confidencial': False,
        }
        await salidas.insertar_salida(con, salida)
        await documentos.insertar_folio(con, folio, id_salida, nueva.id_area_emisora, anio, consecutivo)
        expediente = {
            '_id': str(id_salida),
            'tipo': tipo,
            'datos_tipo': {},
            'referencias_citadas': [],
            'anexos': [],
            'notas': [],
            'creado_en': ahora.isoformat(),
            'actualizado_en': ahora.isoformat(),
        }
        await replicas.encolar_documento(con, salida, expediente)
        if nueva.id_responde_a:
            await replicas.encolar_referencia(
                con,
                {
                    'id': uuid.uuid4(),
                    'tipo': 'RESPONDE_A',
                    'id_origen': id_salida,
                    'id_destino': nueva.id_responde_a,
                    'id_persona': ctx.id_persona,
                    'fecha_hora': ahora,
                },
                espera_a=id_salida,
            )
    return m.DocumentoRegistrado(id=id_salida, folio=folio)


async def listar(pool: AsyncConnectionPool, ctx: m.ContextoUsuario, acuse: str | None, pagina: int, tamano: int):
    """Salidas de V-13, con o sin acuse; la más reciente primero."""
    _oficialia(ctx)
    if acuse not in (None, 'con', 'sin'):
        raise validacion('El filtro de acuse es «con» o «sin».')
    tamano, pagina = min(max(tamano, 1), 100), max(pagina, 1)
    async with pool.connection() as con:
        filas = await salidas.listar(con, acuse, tamano, (pagina - 1) * tamano)
    elementos = [
        m.Salida(
            **{k: f[k] for k in m.Salida.model_fields if k in f},
            acuse=m.AcuseSalida(fecha_hora=f['acuse_fecha_hora'], recibio=f['acuse_recibio'])
            if f['acuse_fecha_hora']
            else None,
        )
        for f in filas
    ]
    return m.Listado[m.Salida](elementos=elementos, total=filas[0]['total'] if filas else 0)


async def registrar_acuse(pool: AsyncConnectionPool, ctx: m.ContextoUsuario, id_salida: UUID, acuse: m.NuevoAcuse):
    """O-21. Un acuse por salida; oficialía lo registra y el área responsable concluye (D-58)."""
    _oficialia(ctx)
    recibio = acuse.recibio.strip()
    if acuse.fecha_hora is None or acuse.fecha_hora.tzinfo is None:
        raise validacion('Escribe la fecha y hora del acuse.')
    if not recibio:
        raise validacion('Escribe quién recibió.')
    async with transaccion(pool) as con:
        salida = await salidas.bloquear_salida(con, id_salida)
        if salida is None:
            raise no_encontrado('Solo se registra el acuse de un documento de salida.')
        if salida['con_acuse']:
            raise ErrorApi('CONFLICTO', 'La salida ya tiene acuse.', 409)
        await salidas.insertar_acuse(con, id_salida, acuse.fecha_hora, recibio, ctx.id_persona)
