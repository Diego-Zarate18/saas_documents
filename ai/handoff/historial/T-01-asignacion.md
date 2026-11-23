# T-01: Interfaz base desde el maquetado de Figma

- Asignada: 2026-11-21
- Depende de: maquetado aprobado (Figma «SIGEDOC»)
- Fuentes:
  - `docs/arquitectura.md`, secciones 2, 4 y 8.
  - Grafo: D-29, D-36, D-38, D-44, D-53, D-57 a D-64; roles ROL-OF, ROL-DI, ROL-TI, ROL-PE y ROL-AD; operaciones O-03, O-11, O-14, O-36 y O-37.
  - `docs/operaciones/catalogo.json`: qué recibe y qué devuelve O-03, O-11 y O-14.
  - Figma, archivo `9yljMLMqWHlIHQqRCsXEjV`.

## Objetivo

Levantar el frontend de SIGEDOC con su arquitectura definitiva, el sistema visual del Figma convertido en código, el marco de la aplicación por rol y las vistas núcleo funcionando con datos simulados (D-63). Lo que se construya aquí se reutiliza tal cual en T-02 (el resto de las vistas) y en T-15 (conexión a la API real), así que la estructura importa tanto como el resultado visual.

## Forma de trabajo

### Skills

Carga las skills en la fase que les corresponde, no todas al inicio:

| Skill | Uso en esta tarea |
| --- | --- |
| `handoff`, `consultar-grafo` | Protocolo y consulta de los ids citados |
| Figma (`figma-design-to-code` antes de `get_design_context`) | Leer cada vista, las variables (`get_variable_defs`), los componentes y los íconos |
| `impeccable` | Contexto del producto y del sistema visual (PRODUCT.md y DESIGN.md en la raíz), y `audit` y `polish` al cerrar. Modo **Operate**. **El Figma es el brief aprobado: refinas, no rediseñas.** No cambies paleta, tipografía, composición ni textos; si crees que algo del Figma debe cambiar, va a «Dudas». |
| `accesslint` | Revisión de accesibilidad de cada vista al cerrar |
| `ponytail` | Nivel por fase (tabla siguiente) y `/ponytail-review` del cambio completo al final |

Si la conexión de Figma no está disponible en tu sesión, detente con estado `bloqueada`: sin ella no puedes cumplir la fidelidad que pide la tarea. No trabajes con capturas.

### Fases y nivel de ponytail

Al empezar cada fase escribe en el chat una línea como `Fase 2 · Ponytail → off` y espera a que Diego confirme que lo cambió.

| Fase | Contenido | Ponytail | Por qué |
| --- | --- | --- | --- |
| 0. Preparación | Leer la asignación, el grafo y el Figma. Ejecutar `impeccable` para dejar PRODUCT.md y DESIGN.md a partir del Figma (identidad «Señal Guinda»). No se escribe código todavía. | **off** | Es lectura y documentación de diseño |
| 1. Proyecto y arquitectura | Plantilla de Vite, dependencias, TypeScript, ESLint, Vitest, estructura de carpetas, rutas, TanStack Query, capa `src/api` con su fuente simulada y sesión simulada | **full** | Evita abstracciones y configuración que nadie pidió |
| 2. Sistema visual | `tokens.css`, tipografía, efectos, íconos y componentes base y compuestos | **off** | La fidelidad al Figma manda; ponytail tendería a cambiar componentes por controles nativos |
| 3. Vistas | Las vistas del alcance, compuestas con el sistema visual y los datos simulados | **full** | Páginas delgadas, sin duplicar lógica |
| 4. Verificación y cierre | `impeccable audit` y `polish`, `accesslint`, comparación con el Figma, criterios de aceptación y reporte. Al final, `/ponytail-review` sobre todo el cambio. | **off** (full solo para `/ponytail-review`) | Pulido y revisión completos |

### Dudas

Si una duda no te impide avanzar, toma la opción más conservadora (la que respeta el Figma y el grafo), sigue trabajando y escríbela en «Dudas y huecos propuestos» con la opción que tomaste. Detente solo si no puedes avanzar sin una respuesta.

## Referencias del Figma

Página «03 · Vistas» (`30:3`); sistema en «02 · Sistema» (`30:2`); identidad en `0:1`. Debajo de cada vista hay un recuadro «Notas · V-xx» con las operaciones y decisiones que la respaldan, y el frame `32:2` es el mapa de todas las vistas.

| Vista | Nodo | Rol |
| --- | --- | --- |
| V-01 Inicio de sesión | `34:115` | Todos |
| V-02 Bandeja (oficialía) | `34:157` | OF, DI |
| V-02b Bandeja (titular de área) | `62:3141` | TI |
| V-02c Bandeja (personal del área) | `62:3523` | PE |
| V-04 Ficha del documento (oficialía) | `37:231` | OF |
| V-04b Ficha (titular de área) | `45:537` | TI |
| V-04e Ficha (personal del área) | `65:2638` | PE |
| V-05 Turnar (modal) | `39:320` | OF, DI, TI |

Componentes del Figma, que deben tener su equivalente en código:

| Componente | Nodo |
| --- | --- |
| Íconos | `31:2` a `31:95` |
| Botón | `31:119` |
| Estado | `31:144` |
| Rol de turno | `31:151` |
| Campo | `31:172` |
| Navegación | `31:187` |

Usuarios de prueba, tomados del Figma:

| Rol | Usuario | Área |
| --- | --- | --- |
| OF | Marta Flores | Oficialía de partes |
| DI | Lic. Ana López | Dirección General |
| TI | Ing. Raúl Pérez | Compras |
| TI | C.P. Elena Díaz | Finanzas |
| PE | Jorge Ruiz | Compras |
| AD | Mtro. Luis Gómez | Administración |

## Alcance

1. **Proyecto** en `frontend/` con la plantilla `react-ts` de Vite:
   - TypeScript estricto, con `noUncheckedIndexedAccess`.
   - `engines.node >= 24`.
   - Scripts `dev`, `build`, `preview`, `lint`, `typecheck` y `test`.
   - Dependencias permitidas, y ninguna otra:
     - Ejecución: las de la plantilla, `react-router`, `@tanstack/react-query`, `radix-ui`, `@fontsource-variable/unbounded`, `@fontsource-variable/geist` y `@fontsource-variable/geist-mono`.
     - Desarrollo: las de la plantilla, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` y `eslint-plugin-jsx-a11y`.
   - Si un paquete no existe o no sirve, no lo sustituyas por tu cuenta: repórtalo.
2. **Arquitectura** según `docs/arquitectura.md`, sección 2 (árbol de `frontend/src/`) y sección 8:
   - **`src/api/`:**
     - Tipos escritos a mano que siguen el contrato de la sección 4: `snake_case`, UUID, fechas ISO, errores con `codigo` y listados `{ elementos, total }`. Se reemplazan por los generados en T-15.
     - Una función por lectura o escritura, por ejemplo `obtenerBandeja` (O-14), `obtenerFicha` (O-11) y `turnar` (O-03).
     - Hooks de TanStack Query que las envuelven.
   - **`src/api/simulado/`:**
     - Un conjunto de datos coherente: los mismos folios, áreas, personas y recorridos que muestra el Figma.
     - Latencia simulada corta.
     - `turnar` modifica los datos en memoria e invalida las consultas, para que el flujo turnar → bandeja → ficha se vea completo.
     - `VITE_API_MODO` elige la fuente; en esta tarea solo existe `simulado`.
   - **Visibilidad:** la capa simulada aplica la visibilidad de D-29 por rol y área, como lo hará el servicio real. Por ejemplo, el personal de Compras no ve el contenido de un documento confidencial ajeno.
   - **`src/sesion/`:**
     - Sesión simulada: V-01 permite entrar como cualquiera de los usuarios de prueba y «Cerrar sesión» vuelve a V-01.
     - Guarda la sesión en `sessionStorage`, envuelto en `try/catch`.
   - **`src/rutas/`:**
     - Rutas protegidas.
     - El menú por rol según el Figma y D-62:
       - OF: 9 opciones.
       - DI: Bandeja, Buscar, Asuntos, Rebotes y Organización.
       - TI y PE: Bandeja, Buscar, Asuntos y Organización.
       - AD: Organización, Áreas, Personas y usuarios, y Actores externos.
     - Las opciones cuyas vistas llegan en T-02 abren una página «Vista en construcción» con el id de la vista y su nodo en el Figma.
     - Un rol que entra a una ruta que no le corresponde ve un aviso de «sin permiso», no una página rota.
3. **Sistema visual** (D-64):
   - `src/estilos/tokens.css` con todas las variables del Figma: colores de fondo, texto, borde y estados; estilos de texto; efectos `glass`, `glassDark`, `relief`, `inset` y `solid`; radios y espaciados. Usa los nombres del Figma en kebab-case (`--fondo-marca`, `--estado-rebote`…).
   - Fuentes autoalojadas.
   - Los 26 íconos exportados del Figma como componentes.
   - Componentes base equivalentes a los del Figma, con sus variantes y estados. Estado y Rol se basan en las variantes de D-32 y D-44; Campo, en sus estados normal, foco, error y deshabilitado.
   - Componentes compuestos que se repiten en las vistas: tarjeta (glass, relieve y hundida), indicador, aviso, chip, tabla, selector, opción de radio, segmentado, modal con velo, encabezado de página y marco con barra lateral.
   - Cada componente con foco visible, roles ARIA correctos y navegación por teclado. Los modales usan el diálogo de Radix: atrapan el foco, cierran con Esc y devuelven el foco al botón que los abrió.
4. **Vistas** V-01, V-02, V-02b, V-02c, V-04, V-04b, V-04e y V-05, fieles al Figma en composición, tipografía, colores, espaciado y textos:
   - La bandeja muestra lo que corresponde a cada rol: oficialía con selector de área, aviso de duplicados y tarjeta de rebotes; titular y personal con el área fija y la tarjeta «Acuses» (D-58).
   - La ficha muestra las acciones de cada rol (D-44, D-62).
   - V-05 Turnar funciona con los datos simulados y respeta un solo responsable por grupo de turno (RI-10).
   - Agrega solo los estados que el Figma no dibuja y que la vista necesita: cargando, lista vacía y error de la fuente. Hazlos sobrios, con los tokens existentes, y anótalos en el reporte como diseño propio para revisar.
5. **Pruebas** con Vitest y Testing Library, solo de lo que tiene lógica:
   - Menú por rol.
   - Protección de rutas.
   - Visibilidad en la fuente simulada.
   - `turnar` con un solo responsable por grupo.
   - Teclado y foco del modal.
   - Nombra las pruebas con su id: `o14_…`, `o03_…`, `d29_…`.
6. **Documentación:**
   - PRODUCT.md y DESIGN.md en la raíz (fase 0, con `impeccable`).
   - Sección «Interfaz (modo simulado)» en `README.md`, con requisitos e instrucciones para Windows.
   - Sección «Comandos» de `CLAUDE.md` con los comandos reales del frontend; no cambies nada más de `CLAUDE.md`.

## Fuera de alcance

- El resto de las vistas y sus variantes (T-02).
- Backend, docker-compose, bases de datos, proxy a la API y cliente generado del OpenAPI (T-03 y T-15).
- Diseño para móvil.
- Modo oscuro.
- Animaciones que el Figma no muestra.
- Pruebas en navegador con Playwright (T-16).
- Cualquier cambio a los documentos que la regla 1 del handoff protege.

## Criterios de aceptación

Ejecuta cada uno y pon su resultado resumido en el reporte. La evidencia va en `docs/pruebas/T-01-interfaz.md`.

1. En `frontend/`: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`, todos sin errores ni advertencias.
2. Con `npm run dev`, cada uno de los seis usuarios de prueba:
   - entra, ve su menú exacto y su bandeja;
   - abre una ficha;
   - cierra la sesión.
   Además, el flujo oficialía → Turnar → bandeja de Compras muestra el documento turnado.
3. Fidelidad al Figma: cada vista del alcance capturada a 1440 px de ancho junto a la captura del mismo nodo del Figma, en `docs/pruebas/T-01-capturas/`. Usa el navegador de vista previa de Claude Code; si no puedes capturar el navegador, dilo en el reporte y Diego hará esa parte. En `T-01-interfaz.md`, una tabla de vista, nodo del Figma, capturas y diferencias conocidas.
4. Accesibilidad:
   - `accesslint` y `impeccable audit` sin hallazgos críticos ni graves en ninguna vista; los menores quedan listados.
   - Todo se puede usar con teclado y el contraste cumple WCAG 2.2 AA.
5. Ningún color escrito fuera de los tokens: `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" frontend/src --include=*.css --include=*.tsx --include=*.ts` solo encuentra resultados en `src/estilos/tokens.css` (y en los SVG de íconos, si usan `currentColor` no cuentan).
6. `/ponytail-review` sobre el cambio completo. Corrige lo que marque como «must fix» y lista el resto en el reporte.
7. Un solo commit `T-01: …` sin líneas de coautoría (verifícalo con `git log -1 --format=%B`). `git status` queda limpio y `git ls-files` no incluye `node_modules`, `dist` ni `.env`.

## Notas del revisor

- Diego trabaja en Windows y usa Claude Code desde la aplicación de escritorio. Usa comandos que funcionen en PowerShell.
- **Validación en dos pasos.** Primero el revisor revisa el código y el reporte contra esta asignación y el grafo. Después Diego valida visualmente en el navegador. Las correcciones llegan como una asignación nueva; no las adelantes.
- **Textos.** Son los del Figma, en español, con acentos en la interfaz. Los nombres de código siguen la regla 12 del handoff (sin acentos ni ñ).
- **Datos simulados.** El conjunto simulado es la semilla que usará la interfaz hasta T-15. Hazlo legible y en un solo lugar, no repartido por las páginas.
- **Dependencias del Figma.** Si una vista depende de algo que el Figma no resuelve, como el comportamiento de un filtro, elige lo más simple que respete el grafo y anótalo.
