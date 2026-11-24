"""Dependencias comunes de los routers: pool, ajustes y contexto del usuario (O-38)."""

from typing import Annotated

from fastapi import Depends, Request
from psycopg_pool import AsyncConnectionPool

from app.dominio.modelos import ContextoUsuario
from app.servicios import sesiones

COOKIE_SESION = 'sigedoc_sesion'


def pool(request: Request) -> AsyncConnectionPool:
    return request.app.state.pool


async def contexto_usuario(request: Request) -> ContextoUsuario:
    """O-38 en cada petición: sin sesión vigente responde NO_AUTENTICADO."""
    return await sesiones.contexto(
        request.app.state.pool,
        request.cookies.get(COOKIE_SESION),
        request.app.state.ajustes.sesion_minutos_inactividad,
    )


Pool = Annotated[AsyncConnectionPool, Depends(pool)]
Contexto = Annotated[ContextoUsuario, Depends(contexto_usuario)]
