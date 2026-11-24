"""O-41. Respaldo y restauración de las tres bases con sus herramientas nativas, dentro de los contenedores.

Uso, desde backend/ (con docker compose y las bases levantadas):

    uv run python -m herramientas.respaldo                       # respaldos/AAAAMMDD-HHMMSS/
    uv run python -m herramientas.respaldo --restaurar respaldos/20261124-120000

PostgreSQL con pg_dump (formato custom) y pg_restore; MongoDB con mongodump y mongorestore (archivo gzip); Neo4j con
neo4j-admin database dump y load, que en Community exigen la base detenida: el contenedor se detiene unos segundos.
`respaldos/` está en .gitignore.
"""

import argparse
import subprocess
import time
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CARPETA = RAIZ / 'respaldos'

PG_DUMP = 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc'
PG_RESTORE = 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --single-transaction'
MONGO_AUTH = '-u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin'
MONGO_DUMP = f'mongodump {MONGO_AUTH} --archive --gzip --quiet'
MONGO_RESTORE = f'mongorestore {MONGO_AUTH} --archive --gzip --drop --quiet'
NEO4J_DUMP = 'neo4j-admin database dump neo4j --to-stdout'
NEO4J_LOAD = 'neo4j-admin database load neo4j --from-stdin --overwrite-destination=true'


def compose(*argumentos: str, entrada: Path | None = None, salida: Path | None = None) -> None:
    """Ejecuta `docker compose …` desde la raíz; la entrada o la salida estándar pueden ir a un archivo."""
    fin = entrada.open('rb') if entrada else None
    fout = salida.open('wb') if salida else None
    try:
        subprocess.run(  # noqa: S603 - argumentos fijos de este módulo
            ['docker', 'compose', *argumentos],  # noqa: S607
            cwd=RAIZ,
            stdin=fin or subprocess.DEVNULL,
            stdout=fout or subprocess.DEVNULL,
            check=True,
        )
    finally:
        for archivo in (fin, fout):
            if archivo:
                archivo.close()


def _sh(servicio: str, comando: str, **archivos) -> None:
    compose('exec', '-T', servicio, 'sh', '-c', comando, **archivos)


def _esperar_neo4j() -> None:
    for _ in range(120):
        estado = subprocess.run(
            ['docker', 'compose', 'ps', 'neo4j', '--format', '{{.Status}}'],  # noqa: S607
            cwd=RAIZ,
            capture_output=True,
            text=True,
            check=True,
        ).stdout
        if '(healthy)' in estado:
            return
        time.sleep(1)
    raise TimeoutError('Neo4j no volvió a estar disponible')


def _neo4j_detenido(comando: str, **archivos) -> None:
    """neo4j-admin en Community necesita la base detenida: se usa un contenedor de un solo uso con el mismo volumen."""
    compose('stop', 'neo4j')
    try:
        compose('run', '--rm', '-T', '--no-deps', 'neo4j', 'sh', '-c', comando, **archivos)
    finally:
        compose('start', 'neo4j')
        _esperar_neo4j()


def respaldar() -> Path:
    destino = CARPETA / datetime.now().strftime('%Y%m%d-%H%M%S')
    destino.mkdir(parents=True)
    _sh('postgres', PG_DUMP, salida=destino / 'postgres.dump')
    _sh('mongo', MONGO_DUMP, salida=destino / 'mongo.archive.gz')
    _neo4j_detenido(NEO4J_DUMP, salida=destino / 'neo4j.dump')
    return destino


def restaurar(origen: Path) -> None:
    _sh('postgres', PG_RESTORE, entrada=origen / 'postgres.dump')
    _sh('mongo', MONGO_RESTORE, entrada=origen / 'mongo.archive.gz')
    _neo4j_detenido(NEO4J_LOAD, entrada=origen / 'neo4j.dump')


def main(argumentos: list[str] | None = None) -> None:
    analizador = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    analizador.add_argument('--restaurar', type=Path, help='carpeta de un respaldo anterior')
    opciones = analizador.parse_args(argumentos)
    if opciones.restaurar:
        origen = opciones.restaurar if opciones.restaurar.is_absolute() else RAIZ / opciones.restaurar
        restaurar(origen)
        print(f'Restaurado desde {origen}')
    else:
        destino = respaldar()
        tamanos = ', '.join(f'{a.name} {a.stat().st_size // 1024} KB' for a in sorted(destino.iterdir()))
        print(f'Respaldo en {destino}: {tamanos}')


if __name__ == '__main__':
    main()
