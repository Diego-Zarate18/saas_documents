# aria-hidden-focus con el modal abierto (V-10)

- `#root.inert`: true
- Elementos marcados: 19; dentro de #root inerte: 17; guardas de foco de Radix: 2
- Todos son el falso positivo documentado: sí

- `body > span:nth-of-type(1)` → guarda de foco de Radix
- `li:nth-of-type(1) > a[href="/bandeja"]` → dentro de #root inerte
- `li:nth-of-type(2) > a[href="/registrar"]` → dentro de #root inerte
- `li:nth-of-type(3) > a[href="/buscar"]` → dentro de #root inerte
- `li:nth-of-type(4) > a[href="/salidas"]` → dentro de #root inerte
- `li:nth-of-type(5) > a[href="/posibles-duplicados"]` → dentro de #root inerte
- `li:nth-of-type(6) > a[href="/asuntos"]` → dentro de #root inerte
- `li:nth-of-type(7) > a[href="/rebotes"]` → dentro de #root inerte
- `li:nth-of-type(8) > a[href="/actores-externos"]` → dentro de #root inerte
- `li:nth-of-type(9) > a[href="/organizacion"]` → dentro de #root inerte
- `aside > button` → dentro de #root inerte
- `nav[aria-label="Ruta de navegación"] > a[href="/bandeja"]` → dentro de #root inerte
- `header > div:nth-of-type(2) > button:nth-of-type(1)` → dentro de #root inerte
- `div:nth-of-type(2) > button:nth-of-type(2)` → dentro de #root inerte
- `div:nth-of-type(2) > button:nth-of-type(3)` → dentro de #root inerte
- `div:nth-of-type(2) > button[aria-label="Agregar a Anexos"]` → dentro de #root inerte
- `div:nth-of-type(3) > button[aria-label="Agregar a Notas"]` → dentro de #root inerte
- `p:nth-of-type(1) > a[href="/documentos/00000000-0000-4000-8000-000000001000"]` → dentro de #root inerte
- `body > span:nth-of-type(2)` → guarda de foco de Radix
