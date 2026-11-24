#!/usr/bin/env bash
# Escanea con accesslint cada vista de T-01 en el Chrome administrado (puerto 9222).
cd "$(dirname "$0")"
cerrar() { node --input-type=module -e 'const l=await (await fetch("http://127.0.0.1:9222/json/list")).json(); for (const t of l) if (t.type==="page" && t.url.includes("5173")) await fetch("http://127.0.0.1:9222/json/close/"+t.id)'; }
escanear() { nombre=$1; shift; cerrar; url=$(node abrir.mjs "$@"); npx -y @accesslint/cli@latest scan "$url" --attach --port 9222 --format json > "a11y-$nombre.json" 2>>a11y-err.txt
  node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1]));const c={};for(const v of r.violations)c[v.impact]=(c[v.impact]||0)+1;console.log(process.argv[2].padEnd(6), r.url.replace("http://localhost:5173","").padEnd(52), "reglas:",r.ruleCount,"violaciones:", r.violations.length, JSON.stringify(c), r.violations.map(v=>v.ruleId+" @ "+v.selector).join(" | "))' "a11y-$nombre.json" "$nombre"; }
npx -y @accesslint/cli@latest scan http://localhost:5173/iniciar-sesion --port 9222 --format json > a11y-v01.json && node -e 'const r=JSON.parse(require("fs").readFileSync("a11y-v01.json"));console.log("v01   ", "/iniciar-sesion".padEnd(52), "reglas:", r.ruleCount, "violaciones:", r.violations.length)'
escanear v02 mflores@institucion.gob.mx
escanear v02-di alopez@institucion.gob.mx
escanear v02b rperez@institucion.gob.mx
escanear v02c jruiz@institucion.gob.mx
escanear v04 mflores@institucion.gob.mx OP-2026-0139
escanear v04b rperez@institucion.gob.mx OP-2026-0152
escanear v04e jruiz@institucion.gob.mx OP-2026-0152
escanear v05 mflores@institucion.gob.mx OP-2026-0139 Turnar
cerrar
