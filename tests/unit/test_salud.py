"""GET /api/salud con las bases simuladas: todas bien, una caída, una que excede el tiempo y sin filtrar secretos."""

import asyncio
import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import salud

SECRETO = 'clave-secreta-de-prueba'
CADENA = f'postgresql://sigedoc:{SECRETO}@127.0.0.1:5433/sigedoc'


async def bien() -> None:
    return None


async def caida() -> None:
    raise ConnectionError(f'connection to {CADENA} failed: password={SECRETO}')


async def lenta() -> None:
    await asyncio.sleep(5)


def cliente(**verificaciones) -> TestClient:
    """La API solo con el router de salud y las verificaciones dadas (las que falten responden bien)."""
    app = FastAPI()
    app.include_router(salud.router, prefix='/api')
    app.state.verificaciones = {base: verificaciones.get(base, bien) for base in salud.BASES}
    return TestClient(app)


def test_salud_las_tres_bases_responden_200_ok():
    respuesta = cliente().get('/api/salud')
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo['estado'] == 'ok'
    assert set(cuerpo['bases']) == {'postgres', 'mongo', 'neo4j'}
    for base in cuerpo['bases'].values():
        assert base['ok'] is True
        assert base['error'] is None
        assert isinstance(base['ms'], int)


@pytest.mark.parametrize('caida_en', salud.BASES)
def test_salud_una_base_caida_503_degradado_y_solo_esa_falla(caida_en):
    respuesta = cliente(**{caida_en: caida}).get('/api/salud')
    assert respuesta.status_code == 503
    cuerpo = respuesta.json()
    assert cuerpo['estado'] == 'degradado'
    for nombre, base in cuerpo['bases'].items():
        assert base['ok'] is (nombre != caida_en)
    assert cuerpo['bases'][caida_en]['error'] == 'sin conexión'


def test_salud_una_base_que_excede_el_tiempo_limite(monkeypatch):
    monkeypatch.setattr(salud, 'TIEMPO_LIMITE_S', 0.05)
    respuesta = cliente(mongo=lenta).get('/api/salud')
    assert respuesta.status_code == 503
    mongo = respuesta.json()['bases']['mongo']
    assert mongo == {'ok': False, 'ms': mongo['ms'], 'error': 'tiempo agotado'}
    assert mongo['ms'] < 1000  # se cortó al vencer el límite, no esperó los 5 s


def test_salud_las_bases_se_consultan_en_paralelo(monkeypatch):
    monkeypatch.setattr(salud, 'TIEMPO_LIMITE_S', 0.3)
    # Tres bases lentas: en serie tardaría unos 0.9 s; en paralelo, el límite de una.
    respuesta = cliente(postgres=lenta, mongo=lenta, neo4j=lenta).get('/api/salud')
    assert all(b['error'] == 'tiempo agotado' for b in respuesta.json()['bases'].values())
    assert respuesta.elapsed.total_seconds() < 0.8


def test_salud_el_error_no_contiene_credenciales_ni_cadenas_de_conexion(caplog):
    caplog.set_level(logging.DEBUG)
    respuesta = cliente(postgres=caida, mongo=caida, neo4j=caida).get('/api/salud')
    registro = '\n'.join(r.getMessage() for r in caplog.records if r.name.startswith('sigedoc'))
    assert 'postgres no responde (ConnectionError)' in registro
    for prohibido in (SECRETO, 'password', '://', 'sigedoc:', 'Traceback', 'ConnectionError('):
        assert prohibido not in respuesta.text
        assert prohibido not in registro
    assert {b['error'] for b in respuesta.json()['bases'].values()} == {'sin conexión'}
