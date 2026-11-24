"""E-6. Exporta el contrato de la API a docs/api/openapi.json (D-71, D-106).

Uso, desde backend/:  uv run python -m herramientas.openapi
"""

import json
from pathlib import Path

DESTINO = Path(__file__).resolve().parents[2] / 'docs' / 'api' / 'openapi.json'


def main() -> None:
    from app.main import app  # importarla lee el .env

    DESTINO.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    rutas = sum(len(operaciones) for operaciones in app.openapi()['paths'].values())
    print(f'{DESTINO}: {rutas} operaciones')


if __name__ == '__main__':
    main()
