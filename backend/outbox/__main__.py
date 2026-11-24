"""O-39. `python -m outbox` (desde backend/): procesa el outbox cada OUTBOX_INTERVALO_MS hasta que lo detengan."""

import asyncio
import logging

from app.config import cargar_ajustes
from app.infra import mongo, neo4j, postgres
from outbox.procesador import procesar_todo

logging.basicConfig(level=logging.INFO, format='%(levelname)s:     %(name)s: %(message)s')
registro = logging.getLogger('sigedoc.outbox')


async def main() -> None:
    ajustes = cargar_ajustes()
    pool = postgres.crear_pool(ajustes, max_size=2)
    await pool.open(wait=False)
    cliente = mongo.crear_cliente(ajustes)
    grafo = neo4j.crear_driver(ajustes)
    db = cliente[ajustes.mongo_db]
    registro.info(
        'outbox en marcha: cada %d ms, hasta %d intentos', ajustes.outbox_intervalo_ms, ajustes.outbox_max_intentos
    )
    try:
        while True:
            try:
                enviados = await procesar_todo(pool, db, grafo, ajustes.outbox_max_intentos)
                if enviados:
                    registro.info('%d eventos enviados', enviados)
            except Exception as error:
                # Una base caída no detiene el proceso: se reintenta en la siguiente vuelta.
                registro.warning('vuelta sin completar: %s', type(error).__name__)
            await asyncio.sleep(ajustes.outbox_intervalo_ms / 1000)
    finally:
        await grafo.close()
        await cliente.close()
        await pool.close()


if __name__ == '__main__':
    # psycopg necesita SelectorEventLoop (en Windows el predeterminado es Proactor).
    asyncio.run(main(), loop_factory=asyncio.SelectorEventLoop)
