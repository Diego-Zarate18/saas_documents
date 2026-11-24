# T-02b: Consulta, asuntos y administración en la interfaz (con datos simulados)

- Asignada: 2026-11-23
- Depende de: T-02a (commit `8688fbf`, integrado en `develop`)
- Fuentes:
  - `ai/handoff/historial/T-02a-asignacion.md` y `T-02a-reporte.md`: lo que ya existe y las dudas que dejó.
  - `PRODUCT.md` y `DESIGN.md` en la raíz.
  - Grafo (skill `consultar-grafo`): D-08, D-20, D-21, D-25, D-27, D-29, D-30, D-32, D-33, D-42, D-44, D-46, D-47, D-49, D-50, D-52, D-58, D-61, D-62, D-63, D-66, D-67, D-68, RI-06, RI-10, HU-F1, HU-JER. Catálogo: `docs/operaciones/catalogo.json` (los ids del catálogo mandan sobre cualquier otro).
  - Figma, archivo `9yljMLMqWHlIHQqRCsXEjV`, página «03 · Vistas». Cada vista tiene al lado su marco «Notas · V-xx» con operaciones, reglas y fuentes: léelo antes de construirla.

| Vista | Nodo | Vista | Nodo |
| --- | --- | --- | --- |
| V-06 Buscar | `39:593` | V-14 Posibles duplicados | `50:1648` |
| V-11 Asunto | `49:1318` | V-16 Organización | `52:2118` |
| V-11b Asignar a un asunto (modal) | `48:1407` | V-17 Administrar áreas | `52:2315` |
| V-11c Asuntos (Dirección) | `65:2922` | V-18 Personas y usuarios | `52:2531` |
| V-12 Rebotes | `49:1577` | V-19 Actores externos | `52:2751` |
| V-13 Salidas externas y acuses | `50:1425` | | |

## Objetivo

Construir las vistas que quedaron «en construcción» (V-06, V-11, V-12, V-13, V-14, V-16 a V-19), con la API simulada, y cerrar lo que dejó la T-02a. Al terminar, ninguna opción del menú de ningún rol muestra «Vista en construcción».

## Forma de trabajo

### Skills

| Skill | Uso |
| --- | --- |
| `handoff` | Protocolo, cierre y reporte |
| `consultar-grafo` | Reglas citadas arriba; no leas `grafo.json` completo |
| `impeccable` | Modo **Operate**; `audit` y `polish` al cerrar. El Figma manda: no cambies paleta, tipografía, composición ni textos |
| `accesslint` | Cada vista nueva y cada modal al cerrar |
| `ponytail` | Nivel por fase (tabla siguiente) y `/ponytail-review` al final |
| Figma | Para leer cada vista y sus notas |

### Fases y nivel de ponytail

Al empezar cada fase escribe `Fase N · Ponytail → X` y espera a que Diego confirme el cambio.

| Fase | Contenido | Ponytail |
| --- | --- | --- |
| 0. Preparación | Leer esta asignación, `DESIGN.md`, los reportes de la T-02a y las vistas y notas del Figma | **off** |
| 1. Reglas y datos | Parte 0 y Parte B: reglas D-67 y D-68, datos y operaciones simuladas | **full** |
| 2. Vistas de consulta y asuntos | Parte A, bloques 1 y 2 | **off** |
| 3. Vistas de administración y actores | Parte A, bloques 3 y 4, y el reemplazo de los campos de texto libre | **off** |
| 4. Auditoría y cierre | Pruebas, accesibilidad, reporte; `/ponytail-review` al final | **off** (full solo para `/ponytail-review`) |

### Dudas

Si una duda no te impide avanzar, toma la opción más conservadora, sigue y anótala en «Dudas y huecos propuestos». Detente solo si no puedes avanzar sin respuesta.

## Alcance

### Parte 0. Reglas nuevas y pendientes de la T-02a

1. **D-67.** Un turno de oficialía o dirección sobre un pendiente de otra área no cierra el de esa área (D-42 literal). Ya hay una prueba `d42_…`; confirma que cubre este caso y deja el nombre `d67_…`.
2. **D-68.** `atraer` (O-23): el área que atrae queda como única responsable; dejan de tenerlo pendiente como responsable **todas** las demás áreas que lo tenían así, y el movimiento de atracción las registra como orígenes. Las áreas con conocimiento o apoyo no cambian. Prueba `d68_…` con el caso OP-2026-0152 (Compras y Jurídico responsables, atrae Finanzas). Quita la duda de la T-02a de tu reporte.
3. **«Regresa a…» con correcciones** (T-02a, `/ponytail-review` 7): el texto y el botón de V-07 usan los roles corregidos (`efectivos`), como el servidor.
4. **Buscador de documento** (T-02a, `/ponytail-review` 9): espera unos 250 ms tras la última tecla antes de consultar O-30. Una prueba con temporizadores simulados.
5. **Anexo y nota** (O-28, O-29): hoy la ficha muestra «en construcción». El Figma solo dibuja «+ Agregar»; impleméntalos como modales con el mismo patrón de la T-02a y anótalos en el reporte como «diseño propio para revisar».

### Parte B. Datos y operaciones simuladas

Las que falten, con las mismas convenciones de la T-02a (latencia simulada, errores con la forma del contrato, visibilidad D-29, roles D-44):

- O-30 Buscar documentos completo: filtros por folio, número, emisor, tipo, estado, fechas, texto de la síntesis y campo propio del tipo (solo `ente_auditor` y `solicitante`, D-46); lista paginada; fuera de la visibilidad solo estado y responsable.
- O-08 Asignar a un asunto, O-27 Crear asunto, O-18 en su parte de «sacar de un asunto» (la parte de quitar relación ya existe).
- Consultas C2 (hilo del asunto, hasta 6 saltos, D-50), C3 (rebotes, D-32), C5 (alcance de un asunto). C3 reemplaza los datos fijos de la tarjeta «Rebotes» de la bandeja.
- O-26 Resolver posible duplicado.
- O-32 a O-35: estructura organizacional, áreas, personas y usuarios, actores externos. Datos de semilla coherentes con los documentos que ya existen. Si falta un usuario administrador (AD) para entrar, agrégalo y anótalo.

### Parte A. Vistas

Cada vista **como está en el Figma**, con los componentes de la T-01 y la T-02a, y con su ruta bajo el menú del rol (`rutas/menu.ts`). Los estados de carga, vacío y error siguen el patrón existente.

1. **Consulta:** V-06 Buscar (filtros, chip de campo propio del tipo, paginación, filas fuera de visibilidad con solo estado y responsable); V-12 Rebotes; V-14 Posibles duplicados con la acción de O-26; V-13 Salidas externas y acuses, el listado completo: absorbe lo que la T-02a dejó en `/salidas` (botón «Registrar salida», panel de acuse). El folio de salida usa las siglas del área emisora (`FI-2026-0001`, D-21).
2. **Asuntos:** V-11 (hilo y alcance, con «Asignar documento» y «Sacar del asunto» para quien tiene O-08 y O-18); V-11b (asignar y crear asunto); V-11c (Dirección, solo consulta). Conecta «Asignar a un asunto» de la ficha, que hoy abre el aviso en construcción.
3. **Administración:** V-16 Organización (todos los roles), V-17 Áreas (las reglas de las notas: sin ciclos, siglas fijas con folios emitidos, no se desactiva con pendientes), V-18 Personas y usuarios (correo único, baja lógica, área vacante si era titular).
4. **Actores externos:** V-19, y reemplaza los campos de texto libre de emisor y destinatario de V-03, V-10 y V-13b por selectores del catálogo (RI-06). Sin esa pieza, no se cierra la tarea.

## Fuera de alcance

- Backend, bases de datos, cliente generado del OpenAPI.
- Dependencias nuevas.
- Modificar `docs/` ni los archivos protegidos del handoff. Las discrepancias con el grafo o el catálogo van en «Dudas y huecos propuestos».
- Corregir el Figma (lo hace el revisor).
- V-15b desde un paso del recorrido y el contenido por tipo en V-13b: siguen fuera.

## Criterios de aceptación

Ejecuta cada uno y resume el resultado en el reporte. Evidencia en `docs/pruebas/T-02b-consulta-administracion.md`, scripts en `docs/pruebas/T-02b-verificacion/` y capturas en `docs/pruebas/T-02b-capturas/`.

1. En `frontend/`: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`, sin errores **ni advertencias**. El número de pruebas no baja de las de la T-02a (107).
2. Parte 0 cumplida, cada punto con su comprobación (`d67_…`, `d68_…`, el buscador con espera, «Regresa a…», anexo y nota).
3. Pruebas por operación, con el id del catálogo en el nombre (`o30_…`, `o08_…`, `o26_…`, `o27_…`, `o18_…`, `o28_…`, `o29_…`, `o32_…` a `o35_…`) y por consulta (`c2_…`, `c3_…`, `c5_…`). Cubren al menos: paginación de O-30; visibilidad fuera del área (D-29), incluido el confidencial de otra área para oficialía; filtro por campo propio solo en los dos tipos con índice; hilo hasta 6 saltos y nodos no registrados; Dirección sin acciones en V-11c; los tres casos de rebote y que una devolución con motivo no aparece; O-26 «son el mismo» (posterior cancelado con `duplicado_de`) y «son distintos»; sin ciclos en áreas, siglas fijas con folios, no desactivar con pendientes; correo único y baja de un titular que deja el área vacante; actor con documentos se desactiva, no se borra.
4. Ninguna opción del menú de ningún rol muestra «Vista en construcción». Verificado con una prueba que recorre `OPCIONES` por rol y en el navegador.
5. Cada modal nuevo: foco atrapado, Esc, foco devuelto, estado pendiente y error en línea, con prueba y en el navegador.
6. Un recorrido en el navegador con capturas, como mínimo: buscar un documento y abrir su ficha; asignarlo a un asunto nuevo y verlo en V-11 y en V-11c; resolver un posible duplicado; ver un rebote en V-12; crear un actor externo y usarlo al registrar una entrada; administrador crea un área y una persona.
7. `accesslint` e `impeccable audit` sin hallazgos críticos ni graves en cada vista y modal nuevos; los menores quedan listados. Los falsos positivos conocidos de Radix e inert se mantienen documentados.
8. Ningún color, duración ni curva fuera de los tokens; sin dependencias nuevas en `package.json`; capas respetadas (nada fuera de `api/index.ts` importa `api/simulado`).
9. `/ponytail-review` hecho y lo «must fix» corregido.
10. Un solo commit `T-02b: …` sin líneas de coautoría (`git log -1 --format=%B`). `git status` limpio; `git ls-files` sin `node_modules`, `dist` ni `.env`. Sin push.

## Notas del revisor

- Diego trabaja en Windows y usa Claude Code desde la aplicación de escritorio: comandos para PowerShell.
- La sesión puede abrir en un worktree. Si el commit queda en la rama del worktree, dilo en el reporte; Diego lo integra en `develop`.
- **Validación en dos pasos:** primero el revisor revisa código y reporte; después Diego valida visualmente. Las correcciones llegan como asignación nueva.
- **Ids de operación:** los del catálogo mandan sobre cualquier lista de esta asignación; si alguno no coincide, usa el del catálogo y dilo.
- **Textos** del Figma, en español con acentos; nombres de código sin acentos ni ñ (regla 12 del handoff).
- Lo que el Figma no dibuja y se agrega aquí va en el reporte como «diseño propio para revisar».
- Es la tarea más grande de la interfaz. Si a mitad de camino ves que no cabe con calidad, detente al cerrar una fase completa, deja el commit de lo hecho como `T-02b (parcial): …` y dilo en el reporte; no recortes la auditoría.
- Usuarios de prueba: `mflores`, `alopez`, `rperez`, `ediaz`, `jruiz`, `lgomez` @institucion.gob.mx, cualquier contraseña no vacía.
