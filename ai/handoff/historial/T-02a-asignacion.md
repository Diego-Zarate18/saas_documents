# T-02a: Flujo del documento en la interfaz (con datos simulados)

- Asignada: 2026-11-23
- Depende de: T-01 y T-01b (integradas en `develop`)
- Fuentes:
  - `ai/handoff/historial/T-01-*` y `T-01b-*`: lo que ya existe.
  - `PRODUCT.md` y `DESIGN.md` en la raíz.
  - Grafo (skill `consultar-grafo`): D-29, D-42, D-44, D-58, D-59, D-60, D-62, D-63, D-65, D-66, RI-10, O-01, O-03, O-04, O-05, O-06, O-07, O-08, O-09, O-10, O-11, O-12, O-13, O-21. Catálogo: `docs/operaciones/catalogo.json`.
  - Figma, archivo `9yljMLMqWHlIHQqRCsXEjV` (el brief aprobado). Vistas de esta tarea: V-03 `36:128`, V-07 `46:707`, V-07b `46:961`, V-08 `47:880`, V-09 `47:1192`, V-09b `47:1426`, V-10 `48:1119`, V-04d `51:1778`, V-13b `51:1600`, V-15a `51:2048`, V-15b `51:2255`, V-15c `51:2489`. Cada una tiene al lado su marco «Notas · V-xx».

## Objetivo

Completar en la interfaz, con la API simulada (D-63), todo lo que se puede hacer con un documento: registrarlo, devolverlo o returnarlo, atraerlo, concluirlo, relacionarlo, cancelarlo, corregir un movimiento, registrar una segunda recepción y registrar una salida externa. Al terminar, el flujo completo de un documento se recorre sin tocar el backend. Consulta, asuntos y administración quedan para T-02b.

## Forma de trabajo

### Skills

| Skill | Uso |
| --- | --- |
| `handoff` | Protocolo, cierre y reporte |
| `consultar-grafo` | Reglas citadas arriba; no leas `grafo.json` completo |
| `impeccable` | Modo **Operate**; `audit` y `polish` al cerrar. El Figma manda: no cambies paleta, tipografía, composición ni textos |
| `accesslint` | Cada modal y cada estado de error al cerrar |
| `ponytail` | Nivel por fase (tabla siguiente) y `/ponytail-review` al final |
| Figma | Para leer cada vista y sus notas; si no está disponible, avisa y trabaja con el reporte de la T-01 |

### Fases y nivel de ponytail

Al empezar cada fase escribe `Fase N · Ponytail → X` y espera a que Diego confirme el cambio.

| Fase | Contenido | Ponytail |
| --- | --- | --- |
| 0. Preparación | Leer esta asignación, `DESIGN.md`, reportes previos y las vistas del Figma | **off** |
| 1. Correcciones | Parte 0 | **full** |
| 2. Datos y reglas simuladas | Parte B: tipos, campos y operaciones del servidor simulado | **full** |
| 3. Vistas | Parte A: registrar y modales | **off** |
| 4. Auditoría y cierre | Pruebas, accesibilidad, reporte; `/ponytail-review` al final | **off** (full solo para `/ponytail-review`) |

### Dudas

Si una duda no te impide avanzar, toma la opción más conservadora, sigue y anótala en «Dudas y huecos propuestos». Detente solo si no puedes avanzar sin respuesta.

## Alcance

### Parte 0. Pendientes de la T-01b

1. `Turnar.tsx`: el `Select` pasa de no controlado a controlado (`valor={f.id_area || undefined}`) y React lo advierte en las pruebas. Deja el valor siempre controlado (cadena vacía) y que **ninguna prueba imprima advertencias**.
2. Al cambiar un filtro de la bandeja, la columna lateral no debe volver a mostrar esqueleto: solo se esqueletiza en la carga inicial sin filtros; la tarjeta «Recorrido» muestra su propio esqueleto al cambiar de documento.
3. `@keyframes aparecer` está duplicado: déjalo una sola vez en `base.css`.
4. `TarjetasLaterales.tsx`: pasa `cargando` a `EstadoConsulta` en vez de `{...consulta, isPending}`.
5. Precarga las fuentes latinas en `woff2` (Unbounded, Geist, Geist Mono) si se puede con `<link rel="preload">` sin dependencias nuevas.
6. `.claude/settings.json`: quita la regla obsoleta `npx eslint *` de `allow`.

### Parte B. Datos y reglas simuladas

1. **Siete tipos (D-65).** `tiposDocumento` pasa a los siete: `oficio`, `solicitud_material_pago`, `requerimiento_auditoria`, `solicitud_transparencia`, `memorandum`, `circular`, `informe`. Nombres para la interfaz: Oficio, Solicitud de material o pago, Requerimiento de auditoría, Solicitud de transparencia, Memorándum, Circular, Informe.
2. **Campos propios (D-66).** Solo tres tipos los tienen:

   | Tipo | Campo | Forma | Obligatorio |
   | --- | --- | --- | --- |
   | `requerimiento_auditoria` | `ente_auditor` | texto | sí |
   | `requerimiento_auditoria` | `puntos` | lista de textos | no |
   | `solicitud_transparencia` | `solicitante` | texto | sí |
   | `solicitud_material_pago` | `concepto` | texto | no |

   Los otros cuatro no tienen bloque. Define las descripciones de estos campos como datos (una tabla por tipo), no como ramas `if` dispersas: el formulario y la ficha se dibujan a partir de ella, y T-05 la reemplazará por el esquema versionado de MongoDB (D-55). Sin montos, fechas ni estados por tipo.
3. **Operaciones del servidor simulado** (las que falten; mismas convenciones que `turnar`, con latencia simulada y errores con la forma del contrato): registrar (O-01, con folio consecutivo por área y año, duplicado detectado, confidencial y extemporáneo), devolver y returnar (O-06, O-07), atraer (O-08), concluir con las cinco formas de D-59 (O-05), relacionar (O-09), cancelar (O-10), corregir movimiento (O-11), segunda recepción (O-12), registrar salida externa y acuse (O-13, O-21, D-58), anexar y nota. Cada una aplica la visibilidad de D-29 y los roles de D-44; el recálculo del pendiente sigue D-42 y la regla RI-10 ya existente.
4. `obtenerFicha` devuelve los datos del tipo cuando existen, y la ficha los muestra en un bloque «Datos del tipo» solo para esos tres tipos.

### Parte A. Vistas

Construye cada vista **como está en el Figma** (composición, textos y estados), con los componentes de la T-01. Todo modal usa el patrón de `Turnar`: Radix Dialog, foco atrapado, Esc cierra, devuelve el foco, botón con estado pendiente y errores en línea (T-01b).

1. **V-03 Registrar documento.** Los siete tipos en el selector; bloque «Datos del tipo» (título y textos como en el Figma: «Contenido · Requerimiento de auditoría», nota «Los campos cambian según el tipo…») que cambia con el tipo y desaparece en los cuatro que no tienen campos; `puntos` como lista editable con alta y baja; interruptores confidencial y extemporáneo; folio reservado al guardar; el panel «duplicado detectado» con la salida a V-15c; recordatorio «Después de registrar». Validación en línea; al guardar con éxito, navega a la ficha.
2. **V-07 / V-07b** devolver y returnar (con área sugerida); **V-08** atraer; **V-09 / V-09b** concluir (con oficio de respuesta y las demás formas, D-59); **V-10** relacionar; **V-15a** cancelar; **V-15b** corregir un movimiento; **V-15c** segunda recepción; **V-13b** registrar salida externa (O-13; el acuse lo registra oficialía, el área responsable concluye, D-58).
3. **Ficha (V-04, V-04b, V-04d, V-04e).** Las acciones salen de `accionesFicha`: conéctalas a sus modales según el rol. «Más acciones» (V-04d, oficialía) agrupa cancelar, corregir y segunda recepción. Tras cada operación, la ficha, el recorrido y la bandeja se refrescan (invalida las consultas de TanStack Query afectadas).
4. **Anexo y nota** en la ficha: según el Figma; si V-04 no los dibuja, anótalo en «Dudas y huecos propuestos» y no los inventes.
5. Las rutas de T-02b siguen siendo «Vista en construcción».

## Fuera de alcance

- Consulta, asuntos, rebotes, salidas externas (listado), duplicados, organización, áreas, personas, actores: T-02b.
- Backend, bases de datos, cliente generado del OpenAPI.
- Dependencias nuevas.
- Modificar `docs/` ni los archivos protegidos del handoff. Cualquier discrepancia con el grafo o el catálogo va en «Dudas y huecos propuestos».
- Corregir el Figma (lo hace el revisor).

## Criterios de aceptación

Ejecuta cada uno y resume el resultado en el reporte. Evidencia en `docs/pruebas/T-02a-flujo.md`, scripts en `docs/pruebas/T-02a-verificacion/` y capturas en `docs/pruebas/T-02a-capturas/`.

1. En `frontend/`: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`, sin errores **ni advertencias** (incluida la de `Select`). El número de pruebas no baja de las de la T-01b.
2. Parte 0 cumplida, cada punto con su comprobación.
3. Pruebas por operación, con el id de la operación en el nombre (`o01_…`, `o05_…`, `o06_…`, `o07_…`, `o08_…`, `o09_…`, `o10_…`, `o11_…`, `o12_…`, `o13_…`) y por regla (`d29_…`, `d42_…`, `d44_…`, `d58_…`, `d59_…`, `d65_…`, `d66_…`). Cubren al menos: folio consecutivo sin huecos; duplicado detectado y segunda recepción; confidencial visible solo al titular y a quien tiene movimiento; cada una de las cinco formas de concluir; quién puede concluir (D-44, D-58); campos obligatorios por tipo; el bloque «Datos del tipo» solo en los tres tipos; el turno de OF/DI sobre un pendiente de otra área no lo cierra (D-42, literal).
4. Cada modal: foco atrapado, Esc, foco devuelto, estado pendiente y error en línea. Verificado con prueba y en el navegador.
5. Un recorrido completo en el navegador, con usuarios de prueba, documentado con capturas: registrar → turnar → devolver → atraer → relacionar → concluir con acuse, y la bandeja correcta en cada paso.
6. `accesslint` e `impeccable audit` sin hallazgos críticos ni graves en cada vista y modal nuevos; los menores quedan listados.
7. Ningún color fuera de los tokens, sin dependencias nuevas en `package.json`, capas respetadas (nada de la interfaz importa de `api/simulado` salvo la capa de acceso a la API).
8. `/ponytail-review` hecho y lo «must fix» corregido.
9. Un solo commit `T-02a: …` sin líneas de coautoría (`git log -1 --format=%B`). `git status` limpio; `git ls-files` sin `node_modules`, `dist` ni `.env`. Sin push.

## Notas del revisor

- Diego trabaja en Windows y usa Claude Code desde la aplicación de escritorio: comandos para PowerShell.
- La sesión puede abrir en un worktree. Si el commit queda en la rama del worktree, dilo en el reporte; Diego lo integra en `develop`.
- **Validación en dos pasos:** primero el revisor revisa código y reporte; después Diego valida visualmente. Las correcciones llegan como asignación nueva.
- **Textos** del Figma, en español con acentos; nombres de código sin acentos ni ñ (regla 12 del handoff).
- Lo que el Figma no dibuja y se agrega aquí va en el reporte como «diseño propio para revisar».
- Usuarios de prueba: `mflores`, `alopez`, `rperez`, `ediaz`, `jruiz`, `lgomez` @institucion.gob.mx, cualquier contraseña no vacía.
