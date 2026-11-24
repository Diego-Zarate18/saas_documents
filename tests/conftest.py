"""Configuración común de las pruebas del backend."""

import asyncio
import sys

# psycopg no funciona en modo asíncrono con ProactorEventLoop, el bucle por omisión en Windows. Vale para
# pytest-asyncio y para el bucle que abre TestClient. set_event_loop_policy es obsoleta desde Python 3.14: al
# subir de versión (requires-python fija <3.14), cambiar por un loop_factory, o filterwarnings = error la vuelve fallo.
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
