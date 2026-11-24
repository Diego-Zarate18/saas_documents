# T-03 · Conectividad, entorno y verificación

- Fecha: 2026-11-24
- Tipo de prueba de la guía (sección 9): **conectividad**. El backend se conecta a los tres motores con configuración segura. La evidencia es el registro de conexión de cada arranque y una prueba automatizada.
- Entorno: Windows 11 Home 10.0.26300, Docker Desktop. Comandos en PowerShell; las salidas se capturaron con Git Bash.
- Salidas completas: `T-03-verificacion/`. Capturas: `T-03-capturas/`. Los criterios 1 a 5 se reproducen con `bash docs/pruebas/T-03-verificacion/verificar-backend.sh` (Git Bash). Todas las salidas son de la versión final del código, después de la revisión del criterio 9.

## Versiones

| Componente | Versión |
| --- | --- |
| PostgreSQL | `postgres:17.12` (17.12, Debian 17.12-1.pgdg13+1) |
| MongoDB | `mongo:8.0.38` (8.0.38) |
| Neo4j | `neo4j:5.26.34-community` (5.26.34) |
| Docker / Compose | 29.1.3 / v2.40.3-desktop.1 |
| Python / uv | 3.13.18 (gestionado por uv) / 0.13.9 |
| Imagen de la API | `python:3.13.18-slim` con uv 0.13.9 |
| FastAPI / Starlette / uvicorn | 0.165.0 / 1.10.0 / 0.54.0 |
| pydantic / pydantic-settings | 2.14.4 / 2.16.3 |
| psycopg (binary) / psycopg-pool | 3.3.9 / 3.3.3 |
| PyMongo | 4.20.1 |
| Driver de Neo4j | 6.4.1 |
| pytest / pytest-asyncio / httpx / ruff | 9.2.0 / 1.5.0 / 0.28.1 / 0.17.6 |
| Node / npm | 24.22.3 / 11.7.0 |

## Criterios de aceptación

| # | Comando | Resultado | Salida |
| --- | --- | --- | --- |
| 1 | `docker compose up -d postgres mongo neo4j` y `docker compose ps` | Las tres `(healthy)`, puertos solo en `127.0.0.1` (5433, 27018, 7474 y 7687) | `criterio1-bases.txt` |
| 2 | En `backend/`: `uv sync`, `uv run ruff check`, `uv run ruff format --check`, `uv run pytest ../tests` | Código 0 en todos. **18 pruebas pasadas**: 14 unitarias y 4 de integración. También `ruff check ../tests` y `ruff format --check ../tests` en verde | `criterio2-backend.txt` |
| 3 | `uv run uvicorn app.main:app --loop asyncio:SelectorEventLoop` y `GET /api/salud` | 200 y `estado: ok` con las tres bases. El registro de arranque dice «conectada» por base | `criterio3-salud-local.txt` |
| 4 | `docker compose stop neo4j` → `GET /api/salud` → `docker compose start neo4j` → `GET /api/salud` | 503, `degradado` y solo `neo4j.ok = false` (`"tiempo agotado"`). Tras el arranque, 200 y `ok` sin reiniciar la API. Ningún valor de `.env`, `password` ni `://` en las respuestas | `criterio4-neo4j-detenida.txt` |
| 5 | `docker compose up -d --build api` y `GET /api/salud` | El contenedor arranca (usuario `sigedoc`, sin uv ni `pytest` en la imagen, 277 MB) y responde 200 y `ok` | `criterio5-api-contenedor.txt` |
| 6 | `.env` sin `API_CORS_ORIGEN` y `uv run uvicorn …` | No arranca (código 1): `ErrorConfiguracion: Configuración incompleta: faltan o están vacías API_CORS_ORIGEN.` Ningún valor de `.env` en la salida | `criterio6-variable-faltante.txt` |
| 7 | En `frontend/`: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` ×5, `npm run build` | Código 0 en todos. **175 pruebas** en 17 archivos (171 en T-02c), cinco corridas seguidas en verde | `criterio7-frontend.txt`, `npm-test-1.txt` a `npm-test-5.txt` |
| 8 | `VITE_API_MODO=real` con el backend arriba; Neo4j detenida; modo por omisión | El aviso muestra las tres bases en `ok`; con Neo4j detenida, «Neo4j: tiempo agotado». En modo simulado se entra como Marta Flores y la bandeja carga 5 filas, como en T-02c | `salud-interfaz.md`, `modo-simulado.md` y las capturas |
| 9 | `/ponytail-review` | **No se hizo**: el plugin no está en esta sesión y Diego pidió omitirlo. En su lugar corrió `/simplify` (reutilización, simplificación, eficiencia y altitud) y se aplicaron sus hallazgos; ver el reporte | — |

### Notas

- **Criterio 4.** Con Neo4j detenida, el error es «tiempo agotado» y no «sin conexión»: el driver reintenta la conexión hasta que vence el límite de 2 s por base.
- **Criterio 7.** En una corrida anterior a la revisión, `npm run build` imprimió una vez el aviso de rendimiento `[PLUGIN_TIMINGS]` de rolldown (`vite:css-post` tardó 2.7 s con Docker y las pruebas en paralelo). No se repitió en tres builds más, incluido el de `criterio7-frontend.txt`.
- **Criterio 8.** `modo-simulado.md` y su captura son de antes de la revisión. Después, el modo simulado solo cambió en que `QueryClientProvider` envuelve las dos ramas de `main.tsx`, y lo cubren las 175 pruebas del criterio 7.
- **Criterio 7, `npm ci`.** Con el `package-lock.json` de T-02c, `npm ci` fallaba con npm 11.7 y 11.19 (`Missing: @emnapi/core@2.0.0-beta.2 from lock file`). Se regeneró el lock: no cambia la versión de ningún paquete instalado; agrega dos entradas opcionales de wasm32 que no se instalan en Windows x64 y corrige el nombre y los `engines`.
- **Windows y psycopg.** En Windows uvicorn usa `ProactorEventLoop` y psycopg no funciona en modo asíncrono con él (PostgreSQL salía como «tiempo agotado»). Por eso el comando local lleva `--loop asyncio:SelectorEventLoop` y `tests/conftest.py` fija la política del bucle. Sin la opción, la API no arranca y el mensaje dice cuál falta. En el contenedor (Linux) no hace falta.

## Pruebas del backend

| Prueba | Archivo | Qué verifica |
| --- | --- | --- |
| `test_salud_las_tres_bases_responden_200_ok` | `tests/unit/test_salud.py` | Todas bien: 200, `ok`, `error: null` |
| `test_salud_una_base_caida_503_degradado_y_solo_esa_falla[postgres\|mongo\|neo4j]` | ídem | Una caída: 503, `degradado` y solo esa base falla, con «sin conexión» |
| `test_salud_una_base_que_excede_el_tiempo_limite` | ídem | Una lenta: «tiempo agotado» al vencer el límite |
| `test_salud_las_bases_se_consultan_en_paralelo` | ídem | Tres lentas tardan lo que una |
| `test_salud_el_error_no_contiene_credenciales_ni_cadenas_de_conexion` | ídem | Ni la respuesta ni el registro llevan la contraseña, `password`, `://` ni la traza |
| `test_config_*` (7) | `tests/unit/test_config.py` | La configuración completa carga; sin una variable, vacía o con un puerto inválido, el error la nombra sin valores y sin arrastrar el `ValidationError` |
| `test_conectividad_postgres\|mongo\|neo4j` | `tests/integration/test_conectividad.py` (`-m integracion`) | Conexión real con el `.env` y versión mayor esperada (17, 8.0, 5.26) |
| `test_salud_de_extremo_a_extremo_con_las_tres_bases` | ídem | La aplicación completa (lifespan con los tres clientes) responde 200 y `ok` |

## Pruebas del frontend (nuevas o cambiadas)

| Prueba | Archivo |
| --- | --- |
| `t03_salud_ok_muestra_las_tres_bases_en_ok`, `t03_salud_degradado_muestra_el_error_de_la_base_que_falla`, `t03_sin_respuesta_de_la_api_lo_dice`, `t03_una_respuesta_que_no_es_de_salud_cuenta_como_sin_respuesta` | `src/componentes/compuestos/AvisoApiReal.test.tsx` |
| `o27_o08_v11b_crea_un_asunto_y_el_documento_queda_asignado` (la que nombraba la tarea) | `src/paginas/consulta.test.tsx` |
| `o22_motivo_obligatorio_boton_pendiente_y_la_ficha_se_refresca`, `o28_hojas_invalidas_en_linea_boton_pendiente_y_el_anexo_aparece` (mismo defecto: fallaron en la primera tanda de cinco corridas) | `src/paginas/modales.test.tsx` |
