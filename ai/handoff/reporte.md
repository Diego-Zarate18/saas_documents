# Reporte T-01: Interfaz base desde el maquetado de Figma

- Estado: completa
- Fecha: 2026-11-22

## Qué hice

Seguí las cinco fases de la asignación y anuncié cada cambio de nivel de ponytail; Diego confirmó cada uno.

1. **Proyecto** (`frontend/`): plantilla `react-ts` de Vite; TypeScript estricto con `noUncheckedIndexedAccess`; `engines.node >= 24`; scripts `dev`, `build`, `preview`, `lint`, `typecheck` y `test`. Solo las dependencias permitidas, salvo ESLint (ver Desviaciones).
2. **Arquitectura** (sección 2 y 8):
   - `src/api/`: tipos del contrato de la sección 4, una función por operación y hooks de TanStack Query.
   - `src/api/simulado/`: semilla con los folios, áreas, personas y recorridos del Figma; latencia de 250 ms; visibilidad D-29; regla de pendiente D-42; permisos D-44 y RI-10. `turnar` cambia los datos en memoria e invalida las consultas.
   - `VITE_API_MODO` elige la fuente (solo `simulado`).
   - `src/sesion/`: sesión simulada en `sessionStorage` con try/catch.
   - `src/rutas/`: rutas protegidas, menú por rol según el Figma y D-62, «Vista en construcción» con la vista y el nodo del Figma, y aviso «Sin permiso».
3. **Sistema visual** (D-64):
   - `src/estilos/tokens.css` con todas las variables del Figma.
   - Fuentes autoalojadas con Fontsource.
   - Los 26 íconos y el isotipo exportados del Figma.
   - Componentes base: Botón, Estado, Rol de turno, Campo y Elemento de navegación.
   - Compuestos: tarjeta (vidrio, relieve, hundida, sólida), indicador, aviso, chip, tabla, selector, opción de radio, segmentado, modal con velo, encabezado de página y marco con barra lateral; además, el paso del recorrido y el estado de la consulta.
4. **Vistas:** V-01, V-02, V-02b, V-02c, V-04, V-04b, V-04e y V-05, con los estados de cargando, vacío y error.
5. **Pruebas:** 45 con Vitest y Testing Library: menú por rol, protección de rutas, visibilidad, `turnar` y RI-10, y teclado y foco del modal.
6. **Documentación:** PRODUCT.md y DESIGN.md (fase 0, con `impeccable`); sección «Interfaz (modo simulado)» en README.md; sección «Comandos» de CLAUDE.md.

Por criterio de aceptación:

1. `npm ci`, `lint`, `typecheck`, `test` y `build` terminan sin errores ni advertencias.
2. Los seis usuarios entran, ven su menú y su bandeja, abren una ficha y cierran sesión. El flujo oficialía → Turnar → bandeja de Compras funciona en `npm run dev`.
3. Hay 8 pares de capturas a 1440 px (Figma y aplicación), con una tabla de diferencias conocidas.
4. accesslint da 0 violaciones en 7 de 8 vistas; las de V-05 son un falso positivo documentado. impeccable no tiene hallazgos en el código. El contraste cumple AA tras un ajuste aprobado; queda un hallazgo menor en el borde de los campos.
5. El grep de colores solo encuentra resultados en `tokens.css`.
6. `/ponytail-review` no encontró nada «must fix».
7. Un solo commit, sin coautoría (ver Evidencia).

## Archivos

Creados:

- `frontend/`: proyecto completo.
  - `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `.oxlintrc.json`, `.env.example`, `index.html` y `public/favicon.svg` (el isotipo).
  - `src/api/`: `tipos.ts`, `index.ts` (elige la fuente), `consultas.ts` (hooks), `reglas.ts` (RI-10), `simulado/datos.ts` (semilla) y `simulado/servidor.ts` (fuente simulada).
  - `src/sesion/`: `almacen.ts` (sessionStorage), `sesion.ts` (hooks O-36, O-37, O-38) y `permisos.ts` (acciones de la ficha por rol).
  - `src/rutas/`: `menu.ts` (menú y permisos), `rutas.tsx` y `RutaProtegida.tsx`.
  - `src/estilos/`: `tokens.css` y `base.css`.
  - `src/iconos/`: `Icono.tsx` (26 íconos) e `Isotipo.tsx`.
  - `src/componentes/base/` y `src/componentes/compuestos/`: el sistema visual.
  - `src/componentes/marco/`: el marco con la barra lateral.
  - `src/paginas/`: una carpeta por vista (`v01-inicio-sesion`, `v02-bandeja`, `v04-ficha`, `v05-turnar`), más `en-construccion`, `sin-permiso` y `formato.ts`.
  - `src/pruebas/`: preparación de Vitest y utilidades.
- `PRODUCT.md` y `DESIGN.md`: contexto de producto y sistema visual para `impeccable`.
- `docs/pruebas/T-01-interfaz.md`: evidencia de ejecución.
- `docs/pruebas/T-01-capturas/`: 16 capturas (Figma y aplicación).
- `docs/pruebas/T-01-verificacion/`: los scripts de recorrido, accesibilidad y capturas, con sus resultados.
- `ai/handoff/historial/T-01-asignacion.md` y `T-01-reporte.md`.

Modificados:

- `README.md`: sección «Interfaz (modo simulado)».
- `CLAUDE.md`: solo la sección «Comandos».
- `ai/handoff/reporte.md`: este reporte.

## Evidencia

Detalle completo en `docs/pruebas/T-01-interfaz.md`.

- `npm ci`: 183 paquetes, 0 vulnerabilidades. `npm run lint`: sin hallazgos. `npm run typecheck`: sin errores. `npm test`: 4 archivos, 45 pruebas pasadas. `npm run build`: sin advertencias. Todos con código 0.
- **Prueba de las reglas de accesibilidad del linter:** agregué un `<img src="x.png" />` temporal. `npm run lint` respondió `error jsx-a11y(alt-text): Missing alt attribute` con código 1, y borré el archivo.
- **Recorrido de los seis usuarios** (`docs/pruebas/T-01-verificacion/recorrido-resultado.txt`): menús exactos; bandejas de 24 (oficialía), 1 (Dirección General), 8 (Compras, antes del turno) y 2 (Finanzas); acciones de ficha por rol. El administrador entra a Organización y no abre fichas. Todos vuelven a `/iniciar-sesion` al cerrar sesión.
- **Flujo de turnar:** Marta Flores turnó OP-2026-0139 a Compras (responsable) y a Finanzas (apoyo). Con Ing. Raúl Pérez, la bandeja de Compras muestra 9 / 7 / 2 / 8 días y la fila «Turnado por Oficialía · Responsable», como V-02b.
- **accesslint** (94 reglas):
  - 0 violaciones en V-01, V-02 (OF y DI), V-02b, V-02c, V-04, V-04b y V-04e.
  - En V-05 quedan 19 `aria-hidden-focus`: falso positivo, porque `#root` está `inert` mientras el modal está abierto. También 1 `landmarks/region`, que es menor.
- **Contraste:** todo el texto ≥ 4.5:1 (mínimo 4.58 en las pastillas, tras el ajuste aprobado). El borde de los campos tiene 1.36:1 (hallazgo menor).
- **Grep de colores:** 49 resultados, todos en `frontend/src/estilos/tokens.css`.
- **Commit:** `git log -1 --format=%B` muestra solo `T-01: …`, sin líneas de coautoría. `git status` queda limpio salvo los archivos ajenos a la tarea (ver Desviaciones), y `git ls-files` no incluye `node_modules`, `dist` ni `.env`.

## Decisiones que tomé

Sistema visual:

- **Radios y espaciados:** el Figma no tiene variables para ellos. Los tomé de los componentes (10, 20, 6, 999 y 2 px; rellenos de 10 × 16, 11 × 12 y 24 px) y les di nombres propios: `--radio-*` y `--espacio-*`.
- **Nombres de los efectos:** uso los del Figma en kebab-case (vidrio, vidrio oscuro, relieve, hundida, sólida) en lugar de glass, glassDark, relief, inset y solid, que menciona la asignación, porque la misma asignación pide los nombres del Figma.
- **Otros tokens propios donde el Figma no tiene variable:** `--vidrio-*`, `--relieve-sombra`, `--hundida-sombra`, `--solida-sombra`, `--destacado-*`, `--velo-*`, `--sobre-marca-*`, `--brillo-*` y `--foco-*`. Los valores son los del Figma.
- **Fondo de las pastillas de estado y de la navegación activa:** el color del token al 12 %, con `color-mix` sobre el token y sin literales.
- **Íconos e isotipo:** los exporté del Figma como SVG con `exportAsync`. En código el trazo pasa a `currentColor` y quité el recorte, que coincide con el lienzo; el resultado visual es el mismo.
- **Conversiones del Figma a CSS:** el desenfoque queda a la mitad en CSS (radio 28 → `blur(14px)`), como hace el propio Figma al generar código. El espaciado de letras del Figma está en porcentaje y pasa a `em`.

Datos simulados:

- **Documentos de relleno:** agregué documentos con asuntos genéricos para que los indicadores salgan de los datos y coincidan con el Figma: oficialía 24 (18 + 6), el más antiguo de 12 días; Compras 9 (7 + 2) después del turno de V-05.
- **Reloj fijo** en `HOY = 2026-11-22 12:00`, Ciudad de México, para que las antigüedades y las capturas coincidan con el Figma. Lleva un comentario `shortcut:` y se va con la API real.
- **Estado inicial de OP-2026-0139:** el de V-02 y V-04, devuelto a oficialía. El turno de V-05 lo deja como muestran V-02b, V-04b y V-04e.
- **Usuarios de prueba:** correos `<inicial><apellido>@institucion.gob.mx`, siguiendo el `mflores@institucion.gob.mx` del Figma. Cualquier contraseña no vacía entra, y el campo de correo los sugiere con un `datalist`.
- **Sesión simulada:** la «cookie» vive en `src/sesion/almacen.ts` y la fuente simulada la lee, como el servidor leerá la cookie en T-15.

Permisos y reglas:

- **Permisos de ruta:** coinciden con el menú del rol (`src/rutas/menu.ts`). La ficha la abren OF, DI, TI y PE.
- **Origen de un turno:** el área de quien turna.
- **RI-10:** la regla vive en `src/api/reglas.ts` y la usan la fuente simulada y V-05. El botón «Turnar a N áreas» se deshabilita sin un solo responsable y el aviso pasa a rojo, como pide la nota de V-05.

Vistas:

- **Bandeja:**
  - El título de cada pendiente elige la fila para la vista previa del recorrido; el folio abre la ficha.
  - Por omisión, la vista previa muestra el primer pendiente.
  - Filtro de antigüedad: «Cualquiera», «3 días o más» y «8 días o más»; el Figma no define las opciones.
  - «Ver todos» despliega la lista en la misma tarjeta.
  - El botón «Abrir ficha» de la tarjeta de acuses abre la ficha del primer acuse.
- **Ficha:**
  - Las acciones cuyas vistas son de T-02 (Más acciones, Más, Relacionar, Devolver, Concluir, Agregar anexo y Agregar nota) abren un aviso «Vista en construcción» con la vista y el nodo del Figma.
  - Dirección solo ve «Turnar», porque O-07 es de OF, TI y PE.
  - «Agregar» en anexos solo para oficialía, y en notas para OF, TI y PE, como dibujan V-04, V-04b y V-04e.
  - La acción primaria es Concluir cuando existe; si no, Turnar.
- **Diseño propio para revisar**, porque el Figma no lo dibuja:
  - estados al pasar el cursor; botón deshabilitado al 50 %;
  - anillo de foco guinda, y arena sobre la barra lateral;
  - lista desplegada del selector en vidrio;
  - estados de cargando, vacío y error con reintento; indicadores con «—» mientras cargan;
  - fila elegida resaltada en guinda suave;
  - páginas «Sin permiso» y «Vista en construcción»;
  - aviso rojo de credenciales en V-01 y la opción de radio.
  - No hay transiciones ni animaciones.
- **Por debajo de 1280 px**, las columnas laterales de la bandeja y de la ficha bajan, para cumplir la legibilidad a 1024 px de la sección 8.

Accesibilidad y build:

- **Foco al cerrar los modales:** Radix solo devuelve el foco a su `Dialog.Trigger`. `Modal` guarda el control que lo abrió y se lo devuelve al cerrar. Además, el fondo queda `inert` mientras el modal está abierto.
- **Nombre del selector:** se forma con `aria-labelledby` (prefijo o etiqueta más el valor visible), por WCAG 2.5.3.
- **Pastillas de estado:** el texto lleva un 20 % de tinta para pasar 4.5:1; el punto y el tinte conservan el color del Figma. Lo aprobó Diego.
- **Build:** las dependencias van en un fragmento propio (`codeSplitting` de Vite 8), para que ningún fragmento pase de 500 kB y el build salga sin advertencias.
- **oxlint:** `control-has-associated-label` ignora `td`, porque una celda no es un control (falso positivo).

## Desviaciones

- **Linter: oxlint en lugar de ESLint.**
  - Motivo: la plantilla `react-ts` actual (create-vite 9.3) ya no trae ESLint sino oxlint, y trae TypeScript 7. `typescript-eslint` solo admite TypeScript menor que 6.1, así que ESLint con `eslint-plugin-jsx-a11y` obligaba a meter paquetes fuera de la lista y a bajar TypeScript.
  - Con la aprobación de Diego uso el oxlint de la plantilla con los plugins `jsx-a11y`, `react` (incluidas `rules-of-hooks` y `exhaustive-deps`), `typescript`, `oxc` y `vitest`. Las categorías `correctness` y `suspicious` y las reglas de accesibilidad están en `error`, y `npm run lint` corre con `--deny-warnings`.
  - No instalé ESLint ni `eslint-plugin-jsx-a11y`.
  - **Propuesta:** ajustar `docs/arquitectura.md`, sección 8, que habla de ESLint.
- **Versiones de la plantilla:** React 19.3, Vite 8.3 y TypeScript 7.0, más Vitest 5.1.
- **Ubicación del trabajo:** la sesión abrió en el worktree `claude/cool-maxwell-106860`, que partía del commit viejo `2f69384`. Un hook de la aplicación bloquea escribir en el checkout principal, así que, con aprobación de Diego, hice un avance rápido del worktree a `develop`. El commit T-01 queda en `claude/cool-maxwell-106860` y Diego lo integra en `develop`.
- **Asignación y configuración:** al principio, la asignación vigente y la configuración sin coautoría solo existían sin commit en el checkout principal. Diego las subió a `develop` (`0bbaa95` y `642cc1d`) y las traje con `git merge develop`, un avance rápido, a mitad de la fase 4. No edité esos archivos.
- **impeccable:**
  - No escribí su archivo auxiliar `.impeccable/design.json`, porque la tarea pide solo PRODUCT.md y DESIGN.md. No hice la entrevista de `impeccable init`: PRODUCT.md sale del grafo y del Figma.
  - Su hook creó la carpeta `.impeccable/` en la raíz. No la versioné; tampoco `.claude/launch.json`, que es la configuración de la vista previa. Quedan sin seguimiento en el worktree.
- **accesslint:** su servidor MCP no conectó en la sesión (se agotó el tiempo de espera), así que usé la CLI que trae la propia skill (`@accesslint/cli`) sobre un Chrome sin interfaz.
- **Capturas:** las de la aplicación se tomaron con Chrome sin interfaz por CDP, porque el panel del navegador de Claude Code estaba oculto y recortaba a 1440 px. Para V-02b, V-04b y V-04e, el turno de OP-2026-0139 se hizo llamando a `turnar` de la fuente simulada, porque el selector de Radix no responde a eventos sintéticos en Chrome sin interfaz. El mismo turno se hizo con clics reales en el navegador de vista previa.
- **V-05:** la captura muestra el modal recién abierto y no con las tres filas llenas del Figma, por la misma limitación.

## Dudas y huecos propuestos

- **Estados en la identidad:** la página de identidad (`0:1`) muestra los estados «Pendiente» y «En tránsito»; el componente Estado (`31:144`) usa «En trámite». Tomé el componente.
- **Nombre de la tarjeta de acuses:** D-58 la llama «Salida con acuse»; la asignación y el Figma (V-02b, V-02c), «Acuses». Usé «Acuses». Conviene alinear D-58.
- **Biblioteca de superficies:** la de `22:7` está en gris neutro, mientras que las vistas usan los tokens «Señal Guinda». Tomé los tokens.
- **Antigüedad de OP-2026-0139:** el Figma lo muestra en momentos distintos: «3 días» en la bandeja de V-02 y «1 día» en V-04 (devolución del 21 nov). Los datos dan 1 día.
- **«Titular al turnar»:** en V-02 muestra al titular del área que turnó (Lic. Ana López en OP-2026-0137, Ing. Raúl Pérez en OP-2026-0139); en V-02b, al del área destino, que es lo que dice D-31. La semilla copia los valores del Figma y los turnos nuevos guardan al titular del destino.
- **HU-propuesto · Endpoint de acuses:**
  - Qué falta: la tarjeta «Acuses» (D-58) no tiene endpoint en el mapa de la sección 4.
  - Qué afecta: T-15.
  - Opciones: `GET /consultas/acuses` o incluirlo en `GET /bandeja`. Usé `obtenerAcuses()` sobre la sesión.
- **HU-propuesto · Nombres de los 7 tipos de documento (D-17):**
  - Qué falta: el grafo solo nombra tres.
  - Qué afecta: el filtro «Tipo» y E-2.
  - Opciones: cerrarlos en E-2. Uso los cuatro del Figma: Oficio, Solicitud de material o pago, Requerimiento de auditoría y Solicitud de transparencia.
- **O-21 en el catálogo:** dice que oficialía «ofrece concluirlo»; D-58 lo corrige. Seguí D-58, porque manda el grafo. Conviene actualizar `catalogo.json`.
- **D-29 para titular y personal:**
  - En documentos de otra área devuelvo solo folio, tipo, estado y ubicación, sin asunto ni recorrido.
  - En lo confidencial sin permiso oculto síntesis, expediente, relaciones y asuntos, pero dejo el asunto y el recorrido, como V-02 los muestra a oficialía.
  - Confirmar si el asunto (título) también debe ocultarse.
- **Turno de Dirección:** el origen del turno es el área de quien turna. Si Dirección turna un documento pendiente en Oficialía, sigue pendiente en Oficialía. Confirmar si debe salir de allí.
- **Borde de los campos:** tiene 1.36:1 sobre marfil (WCAG 1.4.11 pide 3:1). Por decisión de Diego se deja como el Figma; lo compensan la etiqueta, la sombra hundida y el foco guinda. Propuesta para el revisor: oscurecer `--borde-sutil` solo en los campos.
- **Contraste de las pastillas:** con los colores del Figma, Rebote, Posible duplicado y Cancelado no llegaban a 4.5:1. Ajusté el texto (aprobado por Diego); convendría ajustar la paleta en el Figma.
- **Falso positivo de impeccable:** el detector marca `cream-palette` por el marfil `#F2EFEA` de la paleta aprobada. No se puede ignorar ese valor de forma puntual; lo dejé visible.

## Deuda detectada

Hallazgos de `/ponytail-review` que no son «must fix»:

1. **Should fix:** con un filtro activo, la bandeja resalta la primera fila filtrada, pero la tarjeta «Recorrido» muestra el primer pendiente sin filtrar. Arreglo: calcular la fila elegida en `Bandeja` y pasarla a la tabla.
2. **Nice to have:** el bloque `prefers-reduced-motion` de `base.css` ya no hace nada, porque no hay animaciones. Se puede borrar.
3. **Nice to have:** la opción `como` de `Tarjeta` no se usa. Se puede quitar.

Otros riesgos:

- `aria-hidden-focus` en V-05 es un falso positivo de accesslint, que no considera `inert`. Si cambia el motor, hay que revisarlo.
- El reloj fijo y los datos en memoria son simulados y desaparecen con T-15.

## Siguiente paso sugerido

T-02, con las vistas restantes y las acciones que hoy abren «Vista en construcción», reutilizando el sistema visual y la fuente simulada.
