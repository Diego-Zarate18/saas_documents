"""O-36 a O-38. Inicio, validación y cierre de sesión (D-29, D-44, D-49, D-107)."""

import asyncio
import hashlib
import secrets

from psycopg_pool import AsyncConnectionPool

from app.dominio.errores import ErrorApi, no_autenticado
from app.dominio.modelos import ContextoUsuario, Sesion
from app.infra.postgres import transaccion
from app.repositorios.relacional import sesiones
from app.seguridad import contrasenas

MAX_INTENTOS = 5
MINUTOS_BLOQUEO = 15
INCORRECTAS = 'Correo o contraseña incorrectos.'
BLOQUEADA = 'Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.'


def huella(codigo: str) -> bytes:
    """D-49: en la base solo se guarda el SHA-256 del código de la cookie."""
    return hashlib.sha256(codigo.encode()).digest()


async def iniciar(pool: AsyncConnectionPool, correo: str, contrasena: str) -> tuple[str, Sesion]:
    """O-36. Devuelve el código de la cookie y la sesión. Mensaje genérico ante credenciales incorrectas; tras 5
    intentos fallidos seguidos la cuenta queda bloqueada 15 minutos y un inicio correcto reinicia el contador."""
    correo = correo.strip().lower()
    async with transaccion(pool) as con:
        cuenta = await sesiones.buscar_cuenta(con, correo) if correo and contrasena else None
        if cuenta is None or not cuenta['activa']:
            raise no_autenticado(INCORRECTAS)
        if cuenta['bloqueado']:
            raise no_autenticado(BLOQUEADA)
        correcta = await asyncio.to_thread(contrasenas.verificar, contrasena, cuenta['hash_contrasena'])
        if not correcta:
            await sesiones.registrar_fallo(con, cuenta['id_persona'], MAX_INTENTOS, MINUTOS_BLOQUEO)
            error: ErrorApi = no_autenticado(INCORRECTAS)
        else:
            await sesiones.reiniciar_intentos(con, cuenta['id_persona'])
            codigo = secrets.token_urlsafe(32)
            await sesiones.crear_sesion(con, huella(codigo), cuenta['id_persona'])
            return codigo, Sesion(**{k: cuenta[k] for k in Sesion.model_fields})
    # Fuera del bloque: el intento fallido queda guardado antes de responder con el error.
    raise error


async def contexto(pool: AsyncConnectionPool, codigo: str | None, minutos: int) -> ContextoUsuario:
    """O-38. Valida la sesión, renueva su actividad y calcula la visibilidad (D-29): oficialía y dirección ven
    todas las áreas y el recorrido completo; los demás, su área."""
    if not codigo:
        raise no_autenticado()
    async with transaccion(pool) as con:
        fila = await sesiones.validar_sesion(con, huella(codigo), minutos)
        if fila is None:
            raise no_autenticado()
        completo = fila['rol'] in ('OF', 'DI')
        visibles = await sesiones.ids_areas(con) if completo else [fila['id_area']] if fila['id_area'] else []
    return ContextoUsuario(
        id_persona=fila['id_persona'],
        nombre=fila['nombre'],
        rol=fila['rol'],
        id_area=fila['id_area'],
        nombre_area=fila['nombre_area'],
        areas_visibles=frozenset(visibles),
        ve_recorrido_completo=completo,
    )


async def cerrar(pool: AsyncConnectionPool, codigo: str | None) -> None:
    """O-37. Revoca la sesión; sin sesión no falla."""
    if codigo:
        async with transaccion(pool) as con:
            await sesiones.revocar_sesion(con, huella(codigo))
