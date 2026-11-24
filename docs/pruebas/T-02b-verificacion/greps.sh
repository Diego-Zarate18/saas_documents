#!/usr/bin/env bash
# Criterio 8 de T-02b (copiado de T-02a): ningún color fuera de tokens.css, ningún tiempo ni curva fuera de los tokens de movimiento,
# sin dependencias nuevas y capas respetadas (solo src/api/index.ts importa la fuente simulada).
# Se ejecuta desde cualquier carpeta; trabaja sobre la raíz del repositorio.
cd "$(dirname "$0")/../../.."
echo "== Colores escritos fuera de tokens.css =="
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(" frontend/src --include=*.css --include=*.tsx --include=*.ts \
  | grep -v "frontend/src/estilos/tokens.css" || echo "(ninguno)"
echo
echo "== Literales de tiempo (ms, s) o curvas fuera de tokens.css =="
grep -rnE "\b[0-9.]+m?s\b|cubic-bezier|\b(ease|ease-in|ease-out|ease-in-out|linear)\b" frontend/src --include=*.css \
  | grep -v "tokens.css" | grep -v "linear-gradient" || echo "(ninguno)"
echo
echo "== Dependencias de package.json frente a develop =="
git diff --quiet develop -- frontend/package.json frontend/package-lock.json && echo "(sin cambios)" \
  || git diff develop -- frontend/package.json | head -20
echo
echo "== Importaciones de api/simulado fuera de la capa de acceso a la API (src/api/index.ts) y de las pruebas =="
grep -rnE "from ['\"][./]*(api/)?simulado/" frontend/src --include=*.ts --include=*.tsx \
  | grep -v "^frontend/src/api/index.ts:" | grep -vE "\.test\.tsx?:" || echo "(ninguna)"
echo
echo "== Las páginas y componentes solo hablan con la API por src/api (index.ts y consultas.ts) =="
grep -rnE "from ['\"][./]*api/simulado" frontend/src/paginas frontend/src/componentes frontend/src/rutas frontend/src/sesion \
  | grep -vE "\.test\.tsx?:" || echo "(ninguna)"
