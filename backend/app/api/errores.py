"""Problem details (RFC 9457) con `codigo` (arquitectura, sección 4)."""

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.dominio.errores import ErrorApi


def problema(codigo: str, titulo: str, estado: int, detalle: str | None = None, **extra) -> JSONResponse:
    cuerpo = {'type': 'about:blank', 'title': titulo, 'status': estado, 'detail': detalle, 'codigo': codigo, **extra}
    return JSONResponse(jsonable_encoder(cuerpo), status_code=estado, media_type='application/problem+json')


def registrar(app: FastAPI) -> None:
    @app.exception_handler(ErrorApi)
    async def error_api(_: Request, error: ErrorApi) -> JSONResponse:
        extra = {'existente': error.existente} if error.existente is not None else {}
        return problema(error.codigo, error.titulo, error.estado, **extra)

    @app.exception_handler(RequestValidationError)
    async def error_validacion(_: Request, error: RequestValidationError) -> JSONResponse:
        # Solo dice qué campo y por qué; nunca repite el valor recibido.
        detalle = '; '.join(f'{".".join(map(str, e["loc"][1:]))}: {e["msg"]}' for e in error.errors())
        return problema('VALIDACION', 'Revisa los datos enviados.', 422, detalle)
