"""Configuración de la API con pydantic-settings (arquitectura, sección 6).

Se lee de las variables de entorno y, en desarrollo, del `.env` de la raíz del repositorio. Si falta una variable
obligatoria la API no arranca, y el mensaje nombra la variable sin mostrar ningún valor.
"""

from pathlib import Path
from typing import Annotated

from pydantic import Field, SecretStr, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

ARCHIVO_ENV = Path(__file__).resolve().parents[2] / '.env'

# Una variable presente pero vacía cuenta como faltante.
Texto = Annotated[str, Field(min_length=1)]
Secreto = Annotated[SecretStr, Field(min_length=1)]


class ErrorConfiguracion(RuntimeError):
    """Falta una variable obligatoria o tiene un valor inválido. El mensaje no incluye valores."""


class Ajustes(BaseSettings):
    """Variables que la API usa hoy. Las de sesión y outbox se agregan con T-07 y T-08."""

    model_config = SettingsConfigDict(env_file_encoding='utf-8', extra='ignore', frozen=True)

    postgres_host: Texto
    postgres_port: int
    postgres_db: Texto
    postgres_user: Texto
    postgres_password: Secreto

    mongo_uri: Secreto
    mongo_db: Texto
    mongo_user: Texto
    mongo_password: Secreto

    neo4j_uri: Texto
    neo4j_user: Texto
    neo4j_password: Secreto

    api_cors_origen: Texto


def cargar_ajustes(archivo_env: Path | None = ARCHIVO_ENV) -> Ajustes:
    """Lee la configuración; ante un error lanza ErrorConfiguracion con solo los nombres de las variables."""
    try:
        return Ajustes(_env_file=archivo_env)
    except ValidationError as error:
        faltan: set[str] = set()
        invalidas: set[str] = set()
        for detalle in error.errors(include_input=False, include_context=False, include_url=False):
            variable = str(detalle['loc'][0]).upper()
            (faltan if detalle['type'] in {'missing', 'string_too_short', 'too_short'} else invalidas).add(variable)
        partes = []
        if faltan:
            partes.append('faltan o están vacías ' + ', '.join(sorted(faltan)))
        if invalidas:
            partes.append('tienen un valor inválido ' + ', '.join(sorted(invalidas)))
        # from None: la traza no arrastra el ValidationError, que sí incluiría los valores leídos.
        raise ErrorConfiguracion('Configuración incompleta: ' + '; '.join(partes) + '.') from None
