"""config.py: sin una variable obligatoria la API no arranca y el mensaje la nombra sin mostrar valores."""

import pytest

from app.config import Ajustes, ErrorConfiguracion, cargar_ajustes

VALOR = 'valor-que-no-debe-aparecer'
VARIABLES = [nombre.upper() for nombre in Ajustes.model_fields]


@pytest.fixture
def entorno(monkeypatch):
    """Todas las variables con un valor reconocible; las numéricas necesitan un número."""
    for variable in VARIABLES:
        monkeypatch.setenv(variable, VALOR)
    for variable in ('POSTGRES_PORT', 'SESION_MINUTOS_INACTIVIDAD', 'OUTBOX_INTERVALO_MS', 'OUTBOX_MAX_INTENTOS'):
        monkeypatch.setenv(variable, '5433')
    return monkeypatch


def test_config_completa_se_carga(entorno):
    ajustes = cargar_ajustes(archivo_env=None)
    assert ajustes.postgres_port == 5433
    assert VALOR not in repr(ajustes.postgres_password)


@pytest.mark.parametrize('variable', ['POSTGRES_PASSWORD', 'MONGO_URI', 'NEO4J_USER', 'API_CORS_ORIGEN'])
def test_config_sin_una_variable_obligatoria_la_nombra_sin_valores(entorno, variable):
    entorno.delenv(variable)
    with pytest.raises(ErrorConfiguracion) as error:
        cargar_ajustes(archivo_env=None)
    mensaje = str(error.value)
    assert variable in mensaje
    assert VALOR not in mensaje
    # La traza no arrastra el ValidationError de pydantic, que sí mostraría los valores leídos.
    assert error.value.__cause__ is None
    assert error.value.__suppress_context__ is True


def test_config_una_variable_vacia_cuenta_como_faltante(entorno):
    entorno.setenv('NEO4J_PASSWORD', '')
    with pytest.raises(ErrorConfiguracion, match='faltan o están vacías NEO4J_PASSWORD'):
        cargar_ajustes(archivo_env=None)


def test_config_un_puerto_invalido_se_nombra_sin_su_valor(entorno):
    entorno.setenv('POSTGRES_PORT', VALOR)
    with pytest.raises(ErrorConfiguracion) as error:
        cargar_ajustes(archivo_env=None)
    assert 'tienen un valor inválido POSTGRES_PORT' in str(error.value)
    assert VALOR not in str(error.value)
