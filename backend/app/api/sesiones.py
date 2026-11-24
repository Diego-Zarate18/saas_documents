"""O-36 a O-38. /api/sesiones: la cookie es httpOnly y SameSite=Lax (D-49)."""

from fastapi import APIRouter, Request, Response

from app.api.dependencias import COOKIE_SESION, Contexto, Pool
from app.dominio.modelos import Credenciales, Sesion
from app.servicios import sesiones

router = APIRouter(prefix='/sesiones', tags=['sesiones'])


@router.post('', status_code=201, summary='O-36 Iniciar sesión')
async def iniciar_sesion(credenciales: Credenciales, response: Response, pool: Pool) -> Sesion:
    codigo, sesion = await sesiones.iniciar(pool, credenciales.correo, credenciales.contrasena)
    response.set_cookie(COOKIE_SESION, codigo, httponly=True, samesite='lax', path='/')
    return sesion


@router.get('/actual', summary='O-38 Sesión actual')
async def sesion_actual(ctx: Contexto) -> Sesion:
    return Sesion(
        id_persona=ctx.id_persona, nombre=ctx.nombre, rol=ctx.rol, id_area=ctx.id_area, nombre_area=ctx.nombre_area
    )


@router.delete('/actual', status_code=204, summary='O-37 Cerrar sesión')
async def cerrar_sesion(request: Request, response: Response, pool: Pool) -> None:
    await sesiones.cerrar(pool, request.cookies.get(COOKIE_SESION))
    response.delete_cookie(COOKIE_SESION, path='/')
