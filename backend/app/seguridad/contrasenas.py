"""D-107. Contraseñas con scrypt de la biblioteca estándar, en formato scrypt$n$r$p$sal$hash."""

import base64
import hashlib
import hmac
import secrets

N, R, P = 2**14, 8, 1


def cifrar(contrasena: str) -> str:
    sal = secrets.token_bytes(16)
    clave = hashlib.scrypt(contrasena.encode(), salt=sal, n=N, r=R, p=P)
    return f'scrypt${N}${R}${P}${base64.b64encode(sal).decode()}${base64.b64encode(clave).decode()}'


def verificar(contrasena: str, guardado: str) -> bool:
    try:
        esquema, n, r, p, sal, clave = guardado.split('$')
    except ValueError:
        return False
    if esquema != 'scrypt':
        return False
    calculada = hashlib.scrypt(
        contrasena.encode(), salt=base64.b64decode(sal), n=int(n), r=int(r), p=int(p), maxmem=2**26
    )
    return hmac.compare_digest(calculada, base64.b64decode(clave))
