# T-08: Interfaz conectada a la API real y retiro del simulador

- Asignada: 2026-11-24
- Depende de: T-07 (`5cef832`)
- Entrega: miércoles 25. La aplicación debe funcionar de punta a punta con las tres bases; no queda ningún dato simulado.

## Fuentes

- `frontend/src/api/contrato.ts` (`ApiSigedoc`), `tipos.ts` e `index.ts`: la frontera que se conecta.
- `docs/api/openapi.json` o `GET /openapi.json` del backend: rutas reales (D-106).
- D-36, D-38, D-63, D-108.

## Alcance

1. **Cliente real**: `src/api/real.ts` implementa `ApiSigedoc` con `fetch` sobre `/api` (proxy de Vite), `credentials: 'include'`, y convierte los errores RFC 9457 al mismo error con `codigo` que hoy usan las páginas. Se escribe a mano con los tipos de `tipos.ts` (D-108); no se agrega generador.
2. **Retiro del simulador**: `index.ts` usa solo el cliente real. Se borran `src/api/simulado/`, `VITE_API_MODO`, `API_DISPONIBLE`, `AvisoApiReal` y `usuariosDePrueba` (V-01 queda con correo y contraseña). El indicador de salud de T-03 se conserva solo si sigue teniendo sentido sin el modo simulado; si no, se borra.
3. **Pruebas del frontend**: las que dependen del simulador se borran; las que prueban componentes o reglas puras (`reglas.ts`) se quedan. No se escriben pruebas nuevas.
4. **Semilla**: se borra `database/semilla.mjs`, que leía `datos.ts`; los JSON generados quedan como fuente de la semilla.
5. **Recorrido de las pantallas** con la API real, usuario por rol (contraseña `sigedoc-dev`): iniciar sesión, bandeja, registrar, turnar, devolver, atraer, concluir, ficha, relacionar, asuntos e hilo, búsqueda, rebotes, salidas y acuse, administración. Corrige lo que falle por diferencias entre el contrato y la API; si la diferencia está en el backend, corrígela ahí.
6. `README.md` y `CLAUDE.md`: comandos sin el modo simulado.

## Fuera de alcance

Reconciliación, respaldo, servicio `web`, mediciones y evidencia (T-09).

## Criterios de aceptación

1. `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` en verde; `uv run pytest ../tests` en verde.
2. `grep -ri "simulad" frontend/src` no devuelve nada.
3. En el reporte, una tabla con cada pantalla del punto 5: funciona o qué se corrigió. Sin capturas.
4. Un solo commit `T-08: …` sin coautoría.
