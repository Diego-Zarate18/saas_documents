"""O-39. Sincronizar el outbox: un proceso, en orden de id, entrega al menos una vez con escrituras idempotentes."""

import logging
from datetime import datetime

from neo4j import AsyncDriver
from psycopg_pool import AsyncConnectionPool
from pymongo.asynchronous.database import AsyncDatabase

from app.infra.postgres import transaccion
from app.repositorios.documental import expedientes
from app.repositorios.grafo import replica
from app.repositorios.relacional import outbox

registro = logging.getLogger('sigedoc.outbox')
LOTE = 50


async def entregar(evento: dict, db: AsyncDatabase, grafo: AsyncDriver) -> None:
    """Escribe un evento en su destino: upsert en MongoDB (AD-01) o MERGE en Neo4j (AG-06)."""
    datos = evento['datos']
    match evento['destino'], evento['tipo_evento']:
        case 'mongodb', 'expediente':
            await expedientes.crear(db, {k: v for k, v in datos.items() if k != 'id_documento'})
        case 'neo4j', 'documento':
            await replica.documento(grafo, datos)
        case 'mongodb', 'nota':
            nota = {**datos['nota'], 'fecha_hora': datetime.fromisoformat(datos['nota']['fecha_hora'])}
            if not await expedientes.agregar_nota(db, datos['id_documento'], nota, nota['fecha_hora']):
                raise LookupError('El expediente aún no existe')
        case 'neo4j', 'movimiento':
            await replica.movimiento(grafo, datos)
        case 'neo4j', 'estado':
            await replica.estado(grafo, datos)
        case 'neo4j', 'referencia':
            await replica.referencia(grafo, datos)
        case 'neo4j', 'area':
            await replica.area(grafo, datos)
        case 'neo4j', 'persona':
            await replica.persona(grafo, datos)
        case destino, tipo:
            raise ValueError(f'Evento desconocido: {destino}/{tipo}')


async def procesar_lote(pool: AsyncConnectionPool, db: AsyncDatabase, grafo: AsyncDriver, max_intentos: int) -> int:
    """O-39. Toma un lote (AR-05) y lo entrega en orden. Si un evento falla, queda para reintento con espera creciente;
    los demás eventos de ese destino esperan a la siguiente vuelta (una base caída no frena a la otra) y los posteriores
    del mismo documento, a que ese se entregue (tomar_lote). Devuelve cuántos se enviaron."""
    enviados = 0
    async with transaccion(pool) as con:
        detenidos: set[str] = set()
        for evento in await outbox.tomar_lote(con, LOTE):
            if evento['destino'] in detenidos:
                continue
            try:
                await entregar(evento, db, grafo)
            except Exception as error:
                detenidos.add(evento['destino'])
                registro.warning('evento %s (%s) falló: %s', evento['id'], evento['tipo_evento'], type(error).__name__)
                await outbox.marcar_fallo(con, evento['id'], f'{type(error).__name__}: {error}', max_intentos)
            else:
                await outbox.marcar_enviado(con, evento['id'])
                enviados += 1
    return enviados


async def procesar_todo(pool: AsyncConnectionPool, db: AsyncDatabase, grafo: AsyncDriver, max_intentos: int) -> int:
    """Procesa lotes hasta que no quede nada listo para enviar."""
    total = 0
    while enviados := await procesar_lote(pool, db, grafo, max_intentos):
        total += enviados
    return total
