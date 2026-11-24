"""Errores del dominio: la API los traduce a problem details (RFC 9457) con `codigo` (arquitectura, sección 4)."""

from typing import Any


class ErrorApi(Exception):
    """Error esperado de una operación. `titulo` es el texto que la interfaz muestra tal cual (Apéndice A)."""

    def __init__(self, codigo: str, titulo: str, estado: int, existente: dict[str, Any] | None = None):
        super().__init__(titulo)
        self.codigo = codigo
        self.titulo = titulo
        self.estado = estado
        self.existente = existente


def no_autenticado(titulo: str = 'Inicia sesión para continuar.') -> ErrorApi:
    return ErrorApi('NO_AUTENTICADO', titulo, 401)


def sin_permiso(titulo: str = 'Tu rol no permite esta operación.') -> ErrorApi:
    return ErrorApi('SIN_PERMISO', titulo, 403)


def no_encontrado(titulo: str = 'El documento no existe.') -> ErrorApi:
    return ErrorApi('NO_ENCONTRADO', titulo, 404)


def validacion(titulo: str) -> ErrorApi:
    return ErrorApi('VALIDACION', titulo, 422)


def estado_invalido(titulo: str) -> ErrorApi:
    return ErrorApi('ESTADO_INVALIDO', titulo, 409)
