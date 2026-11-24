"""GET /api/salud: conectividad con las tres bases (guía, sección 9; arquitectura, sección 7).

Sin sesión. Consulta las tres bases en paralelo con un tiempo límite por base y responde 200 si todas responden
o 503 si alguna falla. El texto de error es breve y fijo: nunca lleva credenciales, cadenas de conexión ni trazas.
El conteo de pendientes del outbox (arquitectura, sección 3.2) se agrega en T-08.
"""

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable, Mapping
from typing import Literal

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel

TIEMPO_LIMITE_S = 2.0

type Verificacion = Callable[[], Awaitable[object]]
type ErrorBase = Literal['sin conexión', 'tiempo agotado']

registro = logging.getLogger('sigedoc.salud')
router = APIRouter(tags=['salud'])


class EstadoBase(BaseModel):
    ok: bool
    ms: int
    error: ErrorBase | None


class Bases(BaseModel):
    postgres: EstadoBase
    mongo: EstadoBase
    neo4j: EstadoBase


BASES = tuple(Bases.model_fields)


class Salud(BaseModel):
    estado: Literal['ok', 'degradado']
    bases: Bases


async def medir(nombre: str, verificar: Verificacion) -> EstadoBase:
    """Corre una verificación con tiempo límite y la traduce a un estado sin detalles del error."""
    inicio = time.perf_counter()
    error: ErrorBase | None = None
    try:
        async with asyncio.timeout(TIEMPO_LIMITE_S):
            await verificar()
    except TimeoutError:
        error = 'tiempo agotado'
        registro.warning('%s no responde (tiempo agotado tras %.1f s)', nombre, TIEMPO_LIMITE_S)
    except Exception as excepcion:
        error = 'sin conexión'
        # Solo el tipo: el mensaje de un driver puede incluir el host o la cadena de conexión.
        registro.warning('%s no responde (%s)', nombre, type(excepcion).__name__)
    ms = round((time.perf_counter() - inicio) * 1000)
    return EstadoBase(ok=error is None, ms=ms, error=error)


async def medir_bases(verificaciones: Mapping[str, Verificacion]) -> Salud:
    """Mide las tres bases en paralelo."""
    estados = await asyncio.gather(*(medir(nombre, verificaciones[nombre]) for nombre in BASES))
    bases = Bases(**dict(zip(BASES, estados, strict=True)))
    return Salud(estado='ok' if all(e.ok for e in estados) else 'degradado', bases=bases)


@router.get(
    '/salud',
    summary='Estado de la conexión con PostgreSQL, MongoDB y Neo4j',
    responses={503: {'model': Salud, 'description': 'Alguna base no respondió'}},
)
async def salud(request: Request, response: Response) -> Salud:
    # app.state.verificaciones: una por base, las abre el lifespan de main.py.
    resultado = await medir_bases(request.app.state.verificaciones)
    response.status_code = 200 if resultado.estado == 'ok' else 503
    return resultado
