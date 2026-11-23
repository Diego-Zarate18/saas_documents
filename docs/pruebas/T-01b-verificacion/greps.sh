#!/usr/bin/env bash
# Criterios 4 y 7: toda duración y curva sale de un token; ningún color fuera de tokens.css; sin
# dependencias nuevas. Se ejecuta desde la raíz del repositorio.
cd "$(dirname "$0")/../../.."
echo "== Declaraciones transition/animation en src/**/*.css (fuera de tokens.css) =="
grep -rnE "^\s*(transition|animation)[a-z-]*\s*:" frontend/src --include=*.css | grep -v "tokens.css"
echo
echo "== Literales de tiempo (ms, s) o curvas (cubic-bezier, ease, linear) fuera de tokens.css =="
grep -rnE "\b[0-9.]+m?s\b|cubic-bezier|\b(ease|ease-in|ease-out|ease-in-out|linear)\b" frontend/src --include=*.css \
  | grep -v "tokens.css" | grep -v "linear-gradient" || echo "(ninguno)"
echo
echo "== Duraciones de los tokens de movimiento =="
grep -nE "^\s*--(mov|curva)-" frontend/src/estilos/tokens.css
echo
echo "== Colores escritos fuera de tokens.css (mismo grep de la T-01) =="
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(" frontend/src --include=*.css --include=*.tsx --include=*.ts \
  | grep -v "frontend/src/estilos/tokens.css" || echo "(ninguno)"
echo
echo "== Dependencias de package.json frente a develop =="
git diff develop -- frontend/package.json frontend/package-lock.json | head -5
git diff --quiet develop -- frontend/package.json frontend/package-lock.json && echo "(sin cambios)"
