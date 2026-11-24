# T-02c: Corrección de V-16, simulador aislado y contrato de la API

- Asignada: 2026-11-24
- Depende de: T-02b (commit `a57b776`, integrada en `develop`)
- Fuentes:
  - `ai/handoff/historial/T-02b-asignacion.md` y `T-02b-reporte.md`: lo que existe y las dudas que dejó.
  - `docs/arquitectura.md`: secciones 4 (contrato de la API) y 8 (frontend, D-63).
  - `docs/guia-implementacion-backend.md`: la guía que el revisor escribe a partir de tu inventario. Léela: te dice qué se espera del inventario.
  - Grafo (skill `consultar-grafo`): D-39, D-63, D-64.
  - Figma, archivo `9yljMLMqWHlIHQqRCsXEjV`: V-16 `52:2118` y su marco «Notas · V-16».

## Objetivo

Tres cosas cortas que dejan la interfaz lista para conectarse al backend cuando exista (T-15), sin tocar el backend:

1. Corregir la alineación de las siglas en V-16 (Organización).
2. Dejar el simulador completamente aislado: ninguna página, componente ni texto depende de datos fijos que no pasen por la API.
3. Entregar el inventario del contrato: la lista exacta de lo que el simulador hace hoy, operación por operación, para que el backend lo implemente igual.

No hay vistas nuevas ni reglas nuevas.

## Forma de trabajo

### Skills

| Skill | Uso |
| --- | --- |
| `handoff` | Protocolo, cierre y reporte |
| `consultar-grafo` | Reglas citadas; no leas `grafo.json` completo |
| `impeccable` | Modo **Operate**, solo en la Parte A: el Figma manda, no cambies paleta, tipografía ni textos |
| `accesslint` | Solo V-16, al cerrar la Parte A |
| `ponytail` | Nivel por fase (tabla siguiente) y `/ponytail-review` al final |
| Figma | Para comparar V-16 |

### Fases y nivel de ponytail

Al empezar cada fase escribe `Fase N · Ponytail → X` y espera a que Diego confirme el cambio.

| Fase | Contenido | Ponytail |
| --- | --- | --- |
| 0. Preparación | Leer esta asignación, `docs/arquitectura.md` secciones 4 y 8, la guía y el reporte de la T-02b | **off** |
| 1. V-16 y desacople | Partes A y B | **full** |
| 2. Inventario | Parte C | **off** |
| 3. Cierre | Pruebas, reporte; `/ponytail-review` al final | **off** (full solo para `/ponytail-review`) |

### Dudas

Si una duda no te impide avanzar, toma la opción más conservadora, sigue y anótala en «Dudas y huecos propuestos». Detente solo si no puedes avanzar sin respuesta.

## Alcance

### Parte A. V-16 Organización

Las siglas de cada área (DG, OP, CO, FI, SIS, JU, UT…) van en **una sola columna fija** a la izquierda. Solo el nombre se sangra según el nivel de la jerarquía. Hoy la sigla se desplaza junto con el nombre y las de segundo nivel (por ejemplo «UT», bajo Jurídico) quedan fuera de la columna.

- Compara con V-16 en el Figma; si el Figma sangra también la sigla, repórtalo y deja la columna fija (es lo que pidió Diego).
- Prueba de vista: las siglas de todos los niveles comparten el mismo desplazamiento horizontal.
- Revisa que V-17 (Áreas) no tenga el mismo desfase; si lo tiene, corrígelo igual.

### Parte B. Simulador aislado y adaptador listo

1. **Sin datos fijos fuera del simulador.** Busca en `src/paginas`, `src/componentes`, `src/sesion` y `src/rutas` cualquier lista, catálogo o dato de negocio escrito en el código (tipos de documento, motivos de devolución, formas de concluir, canales, roles, áreas, nombres de usuarios de prueba). Los **textos de la interfaz** (etiquetas, ayudas) se quedan en `textos.ts`; las **listas de opciones** salen de `obtenerCatalogos` (O-31) o de la consulta que corresponda. Lo que encuentres y mueves, va en el reporte en una tabla (de dónde → a dónde).
2. **Frontera de la API.** Define en `src/api/` una interfaz TypeScript (`ApiSigedoc`) con todas las funciones de `index.ts` y sus tipos, y haz que `index.ts` exporte el simulador a través de ella. Así el cliente real de T-15 solo tiene que implementarla. No implementes HTTP real.
3. **Errores y paginación con la forma del contrato** (arquitectura sección 4):
   - Los errores llegan a las páginas como un único tipo (`ErrorApi` con `codigo`, `titulo`, `detalle`, `estado_http`). Verifica que todas las vistas lo manejen igual y que ninguna lea textos de error a mano.
   - Todo listado paginado responde `{ elementos, total }`. Si algún listado del simulador no lo hace, corrígelo.
4. **Modo.** `VITE_API_MODO` queda con el valor por omisión `simulado` (T-15 lo cambia a `real`). Si es `real`, la aplicación muestra el mensaje claro «La API real aún no está disponible» en lugar de una excepción al importar.
5. **Prueba de aislamiento:** una prueba falla si algún archivo fuera de `src/api/simulado` y de las pruebas importa de `src/api/simulado`, o si cualquier archivo de `src/paginas` o `src/componentes` contiene un id de semilla (por ejemplo `OP-2026-` o `@institucion.gob.mx`).

### Parte C. Inventario del contrato

Escribe `ai/handoff/borradores/contrato-api.md` (lo lee el revisor y de él sale la guía de implementación del backend; no es un entregable final). Para **cada función exportada por `src/api/index.ts`**:

| Campo | Contenido |
| --- | --- |
| Función y operación | Nombre y id del catálogo (O-xx o C-x) |
| Método y ruta | Propuestos, según la sección 4 de la arquitectura; si el simulador necesita algo que el mapa no tiene, márcalo «nuevo» |
| Entrada | Campos, tipos, cuáles son obligatorios y cómo se validan (`reglas.ts`, servidor) |
| Salida | Campos y tipos; forma de los errores |
| Roles | Quién puede llamarla, como la aplica el simulador |
| Visibilidad | Cómo la aplica el simulador (D-29) y qué devuelve cuando no se ve el contenido |
| Reglas | Ids del grafo que el simulador aplica (D-xx, RI-xx), una línea por regla |
| Errores | Códigos que puede devolver y en qué caso (`VALIDACION`, `DUPLICADO`, `SIN_PERMISO`, `ESTADO_INVALIDO`, `CONFLICTO`…) |
| Pruebas | Los nombres de las pruebas del frontend que la cubren; son los casos de aceptación del backend |

Además, al final del archivo:

- **Diferencias simulador ↔ API real** que ya conoces (reloj fijo, −06:00 fijo, vínculos por nombre, contraseña, folio siguiente, etc.), con la propuesta de qué hacer en cada una.
- **Datos de semilla que el backend debe reproducir** para que las pruebas de aceptación sirvan: lista de documentos, áreas, personas y actores con sus ids, resumida.
- **Una prueba** (`contrato_inventario_cubre_todas_las_funciones`) que falla si una función exportada por `index.ts` no aparece en el archivo.

## Fuera de alcance

- Backend, bases de datos, cliente generado, implementación HTTP real.
- Vistas nuevas o reglas nuevas; dependencias nuevas.
- Modificar `docs/` ni los archivos protegidos del handoff. Las discrepancias con el grafo o el catálogo van en «Dudas y huecos propuestos».
- Corregir el Figma (lo hace el revisor).
- Las dudas de la T-02b que quedaron para otras tareas (semilla de salidas con destinatario interno, Carmen Ruiz como titular, contraste del vidrio de los modales): **el contraste del vidrio sí entra** en esta tarea: sube la opacidad de `--vidrio-fondo-modal` hasta que el texto secundario llegue a 4.5:1 y anota el valor en `DESIGN.md`.

## Criterios de aceptación

Ejecuta cada uno y resume el resultado en el reporte. Evidencia en `docs/pruebas/T-02c-contrato.md`, scripts en `docs/pruebas/T-02c-verificacion/` y capturas en `docs/pruebas/T-02c-capturas/`.

1. En `frontend/`: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`, sin errores **ni advertencias**. El número de pruebas no baja de las de la T-02b (166).
2. V-16: las siglas de todos los niveles en una columna fija, con prueba y captura antes y después. V-17 revisada.
3. La tabla de datos movidos al simulador o a O-31, y la prueba de aislamiento (Parte B.5) pasando. Muestra que falla si introduces a propósito un id de semilla en una página.
4. `ApiSigedoc` definida y usada por `index.ts`; todas las vistas manejan `ErrorApi`; todos los listados paginados responden `{ elementos, total }`.
5. Con `VITE_API_MODO=real` la aplicación muestra el mensaje, sin excepción en consola.
6. `ai/handoff/borradores/contrato-api.md` cubre todas las funciones de `index.ts` (la prueba lo comprueba) con los nueve campos de la tabla.
7. Contraste del texto secundario sobre el vidrio de los modales ≥ 4.5:1, medido en dos modales, con el valor en `DESIGN.md`.
8. `accesslint` sin hallazgos críticos ni graves en V-16 y V-17. Ningún color fuera de los tokens, sin dependencias nuevas en `package.json`.
9. `/ponytail-review` hecho y lo «must fix» corregido.
10. Un solo commit `T-02c: …` sin líneas de coautoría (`git log -1 --format=%B`). `git status` limpio; `git ls-files` sin `node_modules`, `dist` ni `.env`. Sin push.

## Notas del revisor

- Diego trabaja en Windows y usa Claude Code desde la aplicación de escritorio: comandos para PowerShell.
- La sesión puede abrir en un worktree. **Antes de empezar, comprueba que el worktree parte de `develop`** (`git log -1` debe mostrar el commit de esta asignación o uno posterior) y que `ai/handoff/` existe. Si no, dilo y no empieces.
- **Validación en dos pasos:** primero el revisor revisa código y reporte; después Diego valida visualmente. Las correcciones llegan como asignación nueva.
- **Textos** del Figma, en español con acentos; nombres de código sin acentos ni ñ (regla 12 del handoff).
- El inventario es la parte que más valor tiene: sé exacto, no resumas. Si algo del simulador te parece una decisión dudosa, anótalo, no lo cambies.
