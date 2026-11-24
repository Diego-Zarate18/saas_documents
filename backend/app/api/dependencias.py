"""Dependencias comunes de los routers: pool, ajustes y contexto del usuario (O-38)."""

from typing import Annotated

from fastapi import Depends, Request
from neo4j import AsyncDriver
from psycopg_pool import AsyncConnectionPool
from pymongo.asynchronous.database import AsyncDatabase

from app.dominio.modelos import ContextoUsuario
from app.servicios import sesiones

COOKIE_SESION = 'sigedoc_sesion'


def pool(request: Request) -> AsyncConnectionPool:
    return request.app.state.pool


def documental(request: Request) -> AsyncDatabase:
    return request.app.state.documental


def grafo(request: Request) -> AsyncDriver:
    return request.app.state.grafo


async def contexto_usuario(request: Request) -> ContextoUsuario:
    """O-38 en cada petición: sin sesión vigente responde NO_AUTENTICADO."""
    return await sesiones.contexto(
        request.app.state.pool,
        request.cookies.get(COOKIE_SESION),
        request.app.state.ajustes.sesion_minutos_inactividad,
    )


Pool = Annotated[AsyncConnectionPool, Depends(pool)]
Documental = Annotated[AsyncDatabase, Depends(documental)]
Grafo = Annotated[AsyncDriver, Depends(grafo)]
Contexto = Annotated[ContextoUsuario, Depends(contexto_usuario)]
