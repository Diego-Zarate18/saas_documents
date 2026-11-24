"""O-14. Pendientes por área (D-42, D-67, D-68, D-07, D-31), calculados en PostgreSQL (AR-06)."""

from uuid import UUID

from psycopg_pool import AsyncConnectionPool

from app.dominio.errores import sin_permiso
from app.dominio.modelos import ContextoUsuario, Listado, PendienteBandeja, UltimoMovimiento
from app.repositorios.relacional import bandeja
from app.seguridad import visibilidad


def describir(fila: dict) -> str:
    """Texto de la columna «Documento» de V-02: cómo llegó al área."""
    match fila['tipo_movimiento']:
        case 'registro':
            return 'Registro por correo' if fila['canal_inicial'] == 'correo' else 'Registro en ventanilla'
        case 'devolucion':
            motivo = fila['motivo'] or ''
            return f'Devuelto por {fila["area_origen"]} · {motivo[:1].lower()}{motivo[1:]}'
        case 'atraccion':
            return f'Atraído por {fila["area_destino"]}'  # el área que lo atrajo
        case _:
            return f'Turnado por {fila["area_origen"]}'


async def consultar(
    pool: AsyncConnectionPool,
    ctx: ContextoUsuario,
    id_area: UUID | None,
    tipo: str | None,
    antiguedad_minima: int | None,
    pagina: int,
    tamano: int,
) -> Listado[PendienteBandeja]:
    """O-14. OF y DI ven cualquier área; TI y PE, la suya; AD no tiene bandeja."""
    if ctx.rol == 'AD':
        raise sin_permiso()
    id_area = id_area or ctx.id_area
    if id_area is None or id_area not in ctx.areas_visibles:
        raise sin_permiso('No puedes ver la bandeja de esa área.')
    tamano = min(max(tamano, 1), 100)
    pagina = max(pagina, 1)
    async with pool.connection() as con:
        filas = await bandeja.listar(
            con, id_area, tipo, antiguedad_minima, tamano, (pagina - 1) * tamano, ctx.id_persona, ctx.id_area
        )
    elementos = []
    for f in filas:
        # D-29: en la bandeja de su propia área se muestra; si no, decide la función central de visibilidad.
        visible = id_area == ctx.id_area or visibilidad.contenido_visible(
            ctx, f['confidencial'], f['persona_involucrada'], f['area_involucrada']
        )
        elementos.append(
            PendienteBandeja(
                **{k: f[k] for k in PendienteBandeja.model_fields if k in f and k != 'asunto'},
                asunto=f['asunto'] if visible else None,
                ultimo_movimiento=UltimoMovimiento(tipo=f['tipo_movimiento'], descripcion=describir(f)),
            )
        )
    return Listado[PendienteBandeja](elementos=elementos, total=filas[0]['total'] if filas else 0)
