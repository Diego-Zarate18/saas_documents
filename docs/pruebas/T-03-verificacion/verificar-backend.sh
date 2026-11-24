#!/usr/bin/env bash
# Criterios 1 a 5 de T-03 de principio a fin; cada salida va a su archivo en esta carpeta.
# Uso (Git Bash, desde la raíz del repositorio, con .env creado): bash docs/pruebas/T-03-verificacion/verificar-backend.sh
# Requiere docker, uv y curl. El puerto 8000 debe estar libre.
set -u
cd "$(dirname "$0")/../../.."
D=docs/pruebas/T-03-verificacion
UV=${UV:-uv}
salud() { echo '$ curl -s -w "HTTP %{http_code}" http://127.0.0.1:8000/api/salud'; curl -s -w '\nHTTP %{http_code}\n' http://127.0.0.1:8000/api/salud; echo; }
sanas() { for _ in $(seq 120); do [ "$(docker compose ps "$@" --format '{{.Status}}' | grep -c '(healthy)')" = "$#" ] && return; sleep 1; done; }
esperar_api() { for _ in $(seq 60); do curl -s -o /dev/null http://127.0.0.1:8000/api/salud && return; sleep 1; done; }

# Criterio 1: las tres bases desde cero (los volúmenes se conservan).
{
  echo "# Criterio 1 · $(date -u +%FT%TZ) · $(docker --version) · $(docker compose version)"; echo
  echo '$ docker compose down'; docker compose down 2>&1; echo
  echo '$ docker compose up -d postgres mongo neo4j'; docker compose up -d postgres mongo neo4j 2>&1; echo "código de salida: $?"; echo
  sanas postgres mongo neo4j
  echo '$ docker compose ps'; docker compose ps --format 'table {{.Service}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'; echo
  echo 'Versión que reporta cada base:'
  echo "- PostgreSQL: $(docker compose exec -T postgres postgres --version)"
  echo "- MongoDB: $(docker compose exec -T mongo mongod --version | head -1)"
  echo "- Neo4j: $(docker compose exec -T neo4j neo4j --version 2>/dev/null | tail -1)"
} > $D/criterio1-bases.txt 2>&1

# Criterio 2: calidad y pruebas del backend (más ruff sobre ../tests, que ruff no descubre solo).
{
  echo "# Criterio 2 · $(date -u +%FT%TZ) · $(cd backend && $UV --version) · $(cd backend && $UV run python --version)"; echo
  for c in "uv sync" "uv run ruff check" "uv run ruff format --check" "uv run ruff check ../tests" "uv run ruff format --check ../tests" "uv run pytest ../tests -v"; do
    echo "\$ $c"; (cd backend && ${c/#uv/$UV} 2>&1); echo "código de salida: $?"; echo
  done
} > $D/criterio2-backend.txt 2>&1

# Criterios 3 y 4: la API en local; Neo4j se detiene y se levanta sin reiniciar la API.
REGISTRO=$(mktemp)
(cd backend && PYTHONUTF8=1 exec $UV run uvicorn app.main:app --loop asyncio:SelectorEventLoop > "$REGISTRO" 2>&1) &
esperar_api
{
  echo "# Criterio 3 · $(date -u +%FT%TZ)"; echo
  echo '$ uv run uvicorn app.main:app --loop asyncio:SelectorEventLoop   (desde backend/; --loop solo en Windows)'; echo
  echo 'Registro de arranque (registro de conexión):'; echo
  sed '/Uvicorn running/q' "$REGISTRO"; echo
  salud
} > $D/criterio3-salud-local.txt 2>&1
{
  echo "# Criterio 4 · $(date -u +%FT%TZ) · la misma API local, sin reiniciarla entre pasos"; echo
  echo '$ docker compose stop neo4j'; docker compose stop neo4j 2>&1; echo
  salud
  echo '$ docker compose start neo4j   (y espera a que esté healthy)'; docker compose start neo4j 2>&1; sanas neo4j
  docker compose ps neo4j --format '{{.Service}} {{.Status}}'; echo
  salud
  echo 'Registro de la API durante el criterio:'; echo
  sed '1,/Uvicorn running/d' "$REGISTRO" | grep -v '"GET /api/salud'; echo
  echo 'Valores de .env (contraseñas y URIs), «password» o «://» en las respuestas y el registro:'
  python - "$D/criterio4-neo4j-detenida.txt" "$REGISTRO" <<'EOF'
import sys
env = dict(l.split('=', 1) for l in open('.env', encoding='utf-8').read().splitlines() if '=' in l and not l.startswith('#'))
texto = ''.join(l for l in open(sys.argv[1], encoding='utf-8') if l.startswith('{')) + open(sys.argv[2], encoding='utf-8').read()
claves = ('POSTGRES_PASSWORD', 'MONGO_PASSWORD', 'NEO4J_PASSWORD', 'MONGO_URI', 'NEO4J_URI')
hallados = [k for k in claves if env[k] in texto] + [x for x in ('password', '://') if x in texto.replace('http://127.0.0.1:8000', '')]
print('ninguno' if not hallados else 'ENCONTRADOS: ' + ', '.join(hallados))
EOF
} > $D/criterio4-neo4j-detenida.txt 2>&1
for p in $(netstat -ano | grep LISTENING | grep ':8000 ' | awk '{print $5}' | sort -u); do taskkill //PID "$p" //T //F > /dev/null; done
rm -f "$REGISTRO"

# Criterio 5: la API en contenedor.
{
  echo "# Criterio 5 · $(date -u +%FT%TZ)"; echo
  echo '$ docker compose up -d --build api'; docker compose up -d --build api 2>&1 | grep -E '^ (Container|Image|Network)|naming|DONE|ERROR' ; echo
  esperar_api
  echo '$ docker compose ps api'; docker compose ps api --format 'table {{.Service}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'; echo
  echo '$ docker compose logs api'; docker compose logs api 2>&1; echo
  salud
  echo '$ docker compose exec api sh -c "id; command -v uv; python -c \"import pytest\""   (sin uv ni dependencias de desarrollo)'
  docker compose exec -T api sh -c 'id; command -v uv || echo "uv: no está"; /opt/venv/bin/python -c "import pytest" 2>&1 | tail -1'; echo
  echo '$ docker image ls sigedoc-api'; docker image ls sigedoc-api --format '{{.Repository}} {{.Size}}'
  docker compose stop api > /dev/null 2>&1
} > $D/criterio5-api-contenedor.txt 2>&1

grep -hE '^# Criterio|HTTP [0-9]|healthy|passed|failed|código de salida: [1-9]' $D/criterio[1-5]-*.txt
