"""O-01. Registrar documento recibido y asignar folio (D-21, D-27, D-28, D-34, D-66, RI-06)."""

import uuid
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from psycopg import errors
from psycopg_pool import AsyncConnectionPool

from app.dominio.errores import ErrorApi, sin_permiso, validacion
from app.dominio.modelos import CAMPOS_TIPO, ContextoUsuario, DocumentoRegistrado, NuevoDocumento
from app.infra.postgres import transaccion
from app.repositorios.relacional import catalogos, documentos, movimientos
from app.servicios import replicas

ZONA = ZoneInfo('America/Mexico_City')
DUPLICADO = 'Ya existe este documento: mismo número, mismo emisor y mismo año del documento.'


def exigir_oficialia(ctx: ContextoUsuario) -> None:
    if ctx.rol != 'OF' or ctx.id_area is None:
        raise sin_permiso()


def limpiar_datos_tipo(tipo: str, datos: dict) -> dict:
    """D-66: solo los campos del tipo, recortados; los obligatorios no pueden faltar y las listas sin vacíos."""
    limpios = {}
    for campo in CAMPOS_TIPO.get(tipo, []):
        valor = datos.get(campo['clave'])
        if campo['forma'] == 'lista':
            valor = [str(v).strip() for v in valor or [] if str(v).strip()] or None
        else:
            valor = str(valor).strip() if valor is not None else ''
            valor = valor or None
        if valor is None and campo['obligatorio']:
            raise validacion(f'Escribe el campo «{campo["etiqueta"]}».')
        if valor is not None:
            limpios[campo['clave']] = valor
    return limpios


async def folio_siguiente(pool: AsyncConnectionPool, ctx: ContextoUsuario, ahora: datetime | None = None) -> str:
    """Vista previa del folio (V-03): estimación; el definitivo se reserva al guardar (D-21)."""
    exigir_oficialia(ctx)
    anio = (ahora or datetime.now(UTC)).astimezone(ZONA).year
    async with pool.connection() as con:
        siglas = await documentos.siglas(con, ctx.id_area)
        consecutivo = await documentos.consecutivo_siguiente(con, ctx.id_area, anio)
    return f'{siglas}-{anio}-{consecutivo:04d}'


async def registrar(
    pool: AsyncConnectionPool, ctx: ContextoUsuario, datos: NuevoDocumento, ahora: datetime | None = None
) -> DocumentoRegistrado:
    """O-01. Una transacción: folio con el contador bloqueado, documento, movimiento `registro` hacia el área de
    quien registra como responsable y eventos de outbox (expediente, nodo y movimiento). Un duplicado (D-27) no crea
    nada y devuelve el existente."""
    exigir_oficialia(ctx)
    ahora = ahora or datetime.now(UTC)
    tipo = datos.tipo.strip()
    emisor = datos.emisor.strip()
    sintesis = datos.sintesis.strip()
    numero = (datos.numero_emisor or '').strip() or None

    async with pool.connection() as con:
        if tipo not in await catalogos.claves_activas(con, 'tipo_documento'):
            raise validacion('Elige un tipo de documento del catálogo.')
        if not emisor:
            raise validacion('Escribe el emisor del documento.')
        if datos.tipo_emisor not in ('area', 'externo'):
            raise validacion('Elige si el emisor es un área interna o un actor externo.')
        id_area_emisora = id_actor_emisor = None
        if datos.tipo_emisor == 'area':
            id_area_emisora = await documentos.area_activa_por_nombre(con, emisor)
            if id_area_emisora is None:
                raise validacion('Elige un área interna del catálogo.')
        else:
            id_actor_emisor = await documentos.actor_activo_por_nombre(con, emisor)
            if id_actor_emisor is None:
                raise validacion('Elige un actor externo activo del catálogo.')
    if not sintesis:
        raise validacion('Escribe la síntesis del documento.')
    if datos.fecha_recepcion is None or datos.fecha_recepcion.tzinfo is None:
        raise validacion('Escribe la fecha y hora de recepción.')
    if datos.canal not in ('correo', 'papel'):
        raise validacion('Elige el canal de recepción.')
    datos_tipo = limpiar_datos_tipo(tipo, datos.datos_tipo)

    id_documento = uuid.uuid4()
    documento = {
        'id_documento': id_documento,
        'tipo': tipo,
        'numero_emisor': numero,
        'id_area_emisora': id_area_emisora,
        'id_actor_emisor': id_actor_emisor,
        'fecha_documento': datos.fecha_documento,
        'sintesis': sintesis,
        'confidencial': datos.confidencial,
        'posible_duplicado': numero is None or datos.fecha_documento is None,  # D-27
        'extemporaneo': datos.extemporaneo,
        'canal_inicial': datos.canal,
        'fecha_recepcion_inicial': datos.fecha_recepcion,
        'fecha_recepcion_oficial': datos.fecha_recepcion.astimezone(ZONA).date(),  # D-28
        'fecha_registro': ahora,
    }
    movimiento = {
        'id_movimiento': uuid.uuid4(),
        'id_documento': id_documento,
        'tipo': 'registro',
        'fecha_hora': ahora,
        'id_grupo_turno': None,
        'id_area_origen': None,
        'id_area_destino': ctx.id_area,
        'rol': 'responsable',
        'instruccion': None,
        'motivo': None,
        'id_area_sugerida': None,
        'id_persona': ctx.id_persona,
        'id_titular_al_turnar': None,
    }
    expediente = {
        '_id': str(id_documento),
        'tipo': tipo,
        'datos_tipo': datos_tipo,
        'referencias_citadas': [],
        'anexos': [],
        'notas': [],
        'creado_en': ahora.isoformat(),
        'actualizado_en': ahora.isoformat(),
    }
    anio = ahora.astimezone(ZONA).year  # D-34: año de registro, no del documento
    try:
        async with transaccion(pool) as con:
            consecutivo = await documentos.reservar_consecutivo(con, ctx.id_area, anio)
            folio = f'{await documentos.siglas(con, ctx.id_area)}-{anio}-{consecutivo:04d}'
            await documentos.insertar_documento(con, documento)
            await documentos.insertar_folio(con, folio, id_documento, ctx.id_area, anio, consecutivo)
            await movimientos.insertar(con, movimiento)
            await replicas.encolar_documento(con, documento, expediente)
            await replicas.encolar_movimiento(con, movimiento)
    except errors.UniqueViolation as error:
        if error.diag.constraint_name != 'ux_documento_duplicado':
            raise
        async with pool.connection() as con:
            existente = await documentos.buscar_duplicado(
                con, numero, id_area_emisora, id_actor_emisor, datos.fecha_documento
            )
        raise ErrorApi('DUPLICADO', DUPLICADO, 409, existente=existente) from None
    return DocumentoRegistrado(id=id_documento, folio=folio)
