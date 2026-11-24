# T-01b: Correcciones y movimiento de la interfaz base

- Asignada: 2026-11-22
- Depende de: T-01 (commit `993c254`, ya integrado en `develop`)
- Fuentes:
  - `ai/handoff/historial/T-01-asignacion.md` y `T-01-reporte.md`: lo que se pidió y lo que se hizo.
  - `PRODUCT.md` y `DESIGN.md` en la raíz.
  - Grafo: D-63, D-64 (sistema visual); `docs/arquitectura.md`, sección 8.
  - Figma, archivo `9yljMLMqWHlIHQqRCsXEjV` (solo para comparar; no se modifica).

## Objetivo

Cerrar lo que dejó la revisión de la T-01, agregar a la interfaz un movimiento sobrio (esqueletos de carga, estados pendientes, transiciones e íconos con micro-movimiento) y auditarla completa con las skills instaladas. No se agregan vistas nuevas: eso es T-02.

## Forma de trabajo

### Skills

| Skill | Uso en esta tarea |
| --- | --- |
| `handoff` | Protocolo, cierre y reporte |
| `impeccable` | Modo **Operate**. En la fase 2, su guía de movimiento (su comando de animación, si tu versión lo trae). En la fase 3, `audit`, `critique` (si existe) y `polish`. El Figma sigue siendo el brief aprobado: no cambies paleta, tipografía, composición ni textos. |
| `accesslint` | Revisión de accesibilidad de cada vista y de sus estados nuevos, al cerrar |
| `ponytail` | Nivel por fase (tabla siguiente) y `/ponytail-review` al final |
| Figma | Solo para comparar; si no está disponible, no es motivo de bloqueo en esta tarea |

### Fases y nivel de ponytail

Al empezar cada fase escribe en el chat una línea como `Fase 2 · Ponytail → off` y espera a que Diego confirme que lo cambió.

| Fase | Contenido | Ponytail | Por qué |
| --- | --- | --- | --- |
| 0. Preparación | Leer esta asignación, `DESIGN.md`, el reporte y la revisión de la T-01 | **off** | Es lectura |
| 1. Correcciones | Parte A | **full** | Son arreglos pequeños; sin abstracciones nuevas |
| 2. Movimiento | Parte B | **off** | Es diseño de interacción; ponytail tendería a quitar lo que se pide |
| 3. Auditoría y cierre | Parte C, criterios de aceptación y reporte. Al final, `/ponytail-review`. | **off** (full solo para `/ponytail-review`) | Revisión completa |

### Dudas

Si una duda no te impide avanzar, toma la opción más conservadora, sigue y escríbela en «Dudas y huecos propuestos» con la opción que tomaste. Detente solo si no puedes avanzar sin una respuesta.

## Alcance

### Parte A. Correcciones de la revisión

1. **Bandeja: fila resaltada y recorrido coherentes.** Hoy la tabla resalta la primera fila de la lista filtrada, pero la tarjeta «Recorrido» muestra el primer pendiente sin filtrar.
   - Calcula la fila elegida una sola vez en `Bandeja` y pásala a la tabla y a la vista previa como prop.
   - Regla: es la fila que el usuario eligió si sigue en la lista filtrada; si no, la primera de la lista filtrada.
   - Borra el cálculo propio de la tabla.
   - Prueba `o14_…` que lo demuestre con el filtro «Tipo».
2. **`Tarjeta`:** quita la opción `como` (nadie la usa) y deja `section` fijo.
3. **`.claude/launch.json`:** versiónalo. Es la configuración del navegador de vista previa. Contenido:
   ```json
   {
     "version": "0.0.1",
     "configurations": [
       {
         "name": "frontend",
         "runtimeExecutable": "npm",
         "runtimeArgs": ["run", "dev", "--prefix", "frontend", "--", "--port", "5173", "--strictPort"],
         "port": 5173
       }
     ]
   }
   ```
4. **Contraste del borde de los campos** (WCAG 1.4.11 pide 3:1; hoy es 1.36:1).
   - Crea el token `--borde-campo` con un valor que alcance 3:1 contra el fondo contiguo del campo, y úsalo en el borde de Campo, Selector, opción de radio y segmentado.
   - No cambies `--borde-sutil` de tarjetas y tablas.
   - Parte de los colores del Figma: el más oscuro de la paleta que cumpla; si ninguno, calcula uno de la misma familia. Anota el valor y su contraste en `DESIGN.md` y en el reporte. El revisor ajusta el Figma después.
5. **No toques** las diferencias con el Figma que ya reportaste (3 días contra 1 día, la vista previa por omisión, los estados de la identidad, el color de las pastillas, las superficies en gris): las corrige el revisor en el Figma.

El bloque `prefers-reduced-motion` de `base.css` **se conserva**: la Parte B lo usa.

### Parte B. Movimiento sobrio

SIGEDOC es de una institución gubernamental: el movimiento informa (que algo carga, que algo respondió, qué cambió de estado) y no decora.

**Reglas generales**

- Solo CSS. Sin bibliotecas ni dependencias nuevas.
- Se anima `opacity` y `transform`. Solo en hover y foco se permiten además `background-color`, `border-color` y `box-shadow`.
- Sin rebotes ni curvas elásticas. Sin animaciones de entrada de página ni transiciones entre rutas.
- Ninguna animación provoca desplazamiento del diseño.
- Tokens en `tokens.css` con nombres propios en kebab-case, por ejemplo:
  - `--mov-instantaneo: 100ms`, `--mov-corto: 150ms`, `--mov-medio: 220ms`;
  - `--curva-salida: cubic-bezier(0.2, 0, 0, 1)` y `--curva-estandar: cubic-bezier(0.4, 0, 0.2, 1)`.
- Ningún valor de duración ni de curva escrito fuera de los tokens.
- Todo es diseño propio, porque el Figma no dibuja movimiento: anótalo en el reporte «para revisar».

**Animaciones aprobadas.** No agregues otras.

| Elemento | Qué se mueve | Duración | Curva |
| --- | --- | --- | --- |
| Esqueleto | Brillo que lo recorre (`translateX` de un pseudoelemento), en bucle | 1400 ms | lineal |
| Contenido tras el esqueleto | `opacity` 0 → 1 | `--mov-corto` | salida |
| Botón (hover y foco) | Fondo y sombra | `--mov-corto` | estándar |
| Botón (`:active`) | `scale(0.98)` | `--mov-instantaneo` | estándar |
| Spinner de botón pendiente | `rotate` en bucle | 800 ms | lineal |
| Navegación lateral (hover) | Fondo; el ícono se desplaza `translateX(2px)` | `--mov-corto` | estándar |
| Navegación lateral (activa) | La barra arena aparece con `scaleY` 0 → 1 | `--mov-corto` | salida |
| Fila de tabla (hover y elegida) | Fondo | `--mov-corto` | estándar |
| Chevron de selector y de «Ver todos» | `rotate` 0 → 180° | `--mov-corto` | estándar |
| Lista desplegable del selector | `opacity` y `translateY(-4px → 0)` | `--mov-corto` | salida |
| Modal: velo | `opacity` | `--mov-medio` (al cerrar, `--mov-corto`) | salida |
| Modal: panel | `opacity` y `translateY(8px → 0)` | `--mov-medio` (al cerrar, `--mov-corto`) | salida |
| Avisos (errores, RI-10) | `opacity` | `--mov-corto` | salida |
| Flecha de «Cerrar sesión» y de botones con flecha (hover) | `translateX(2px)` | `--mov-corto` | estándar |

Los modales siguen siendo de Radix: anima con sus atributos `data-state`, de modo que el cierre espere a que termine la animación y el foco siga volviendo al control que lo abrió.

**Esqueletos de carga**

Reemplazan los «—» y cualquier estado de carga vacío. Cubren:

- Bandeja: los cuatro indicadores, la tabla de pendientes (6 filas), la tarjeta «Recorrido» y la tarjeta «Acuses».
- Ficha: encabezado, registro, ubicación actual, expediente y recorrido.
- Turnar (V-05): la lista de áreas del selector mientras carga.
- Ruta protegida mientras se resuelve la sesión: pantalla neutra con el isotipo y «Cargando…».

Cada esqueleto:

- Tiene las mismas dimensiones y esquinas que el contenido real, para que al llegar los datos nada se mueva (CLS ≤ 0.01).
- Usa solo tokens existentes, con `color-mix`.
- Marca su contenedor con `aria-busy="true"`, lleva un único `role="status"` con el texto «Cargando…» y oculta las formas con `aria-hidden`.

**Estado pendiente de las acciones**

- «Turnar a N áreas», «Entrar» (V-01) y «Cerrar sesión» muestran un spinner dentro del botón mientras la operación está en curso: `aria-busy`, deshabilitado, texto conservado y el mismo ancho.
- El spinner es un anillo SVG con `currentColor`, sin importarlo del Figma (diseño propio).
- Los errores de la fuente siguen con su reintento actual.

**Íconos con micro-movimiento.** Solo los de la tabla anterior: navegación lateral, chevrons, flechas y spinner. Ningún movimiento de ícono pasa de 2 px de desplazamiento o 180° de giro.

**Movimiento reducido**

Con `prefers-reduced-motion: reduce`:

- El brillo del esqueleto se detiene; el esqueleto queda estático y visible.
- Se anulan los desplazamientos, escalas y giros.
- Los modales y avisos aparecen solo con `opacity`, sin duración perceptible.
- El spinner se conserva, porque indica trabajo en curso, pero a 1600 ms.

**Latencia de la fuente simulada**

Para que los esqueletos se vean en desarrollo, agrega `VITE_API_LATENCIA_MS` (por omisión 450; en pruebas, 0). Documéntala en `.env.example` y en el README.

### Parte C. Auditoría con las skills

Al cerrar, y con el movimiento ya incorporado:

1. `impeccable audit`, `critique` (si existe) y `polish` sobre las 8 vistas. Corrige lo crítico y lo grave; lista lo demás.
2. `accesslint` sobre cada una de las 8 vistas en tres estados: cargando (esqueleto), con datos y con el modal abierto (V-05, y la ficha con su aviso «Vista en construcción»). Repite el escaneo con `prefers-reduced-motion` activo.
3. Contraste: texto ≥ 4.5:1; bordes de controles y anillo de foco ≥ 3:1.
4. Desplazamiento del diseño: mide el `layout-shift` (CLS) en bandeja y ficha, de la carga hasta el contenido, con Chrome sin interfaz.
5. `/ponytail-review` sobre el cambio completo. Corrige lo «must fix» y lista el resto.

## Fuera de alcance

- Vistas nuevas y las acciones que abren «Vista en construcción» (T-02).
- Cambios al Figma.
- Dependencias nuevas, modo oscuro, diseño para móvil.
- Transiciones entre rutas y animaciones fuera de la tabla de arriba.
- Backend y API real (T-03 y T-15).
- Cualquier cambio a los documentos que la regla 1 del handoff protege.

## Criterios de aceptación

Ejecuta cada uno y pon su resultado resumido en el reporte. La evidencia va en `docs/pruebas/T-01b-correcciones.md`, con los scripts en `docs/pruebas/T-01b-verificacion/` y las capturas de los estados de carga en `docs/pruebas/T-01b-capturas/`.

1. En `frontend/`: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`, todos sin errores ni advertencias. El número de pruebas no baja de 45.
2. Parte A:
   - Con el filtro «Tipo» en la bandeja de oficialía, la fila resaltada y el recorrido corresponden al mismo documento (prueba `o14_…` y comprobación en el navegador).
   - `Tarjeta` sin la opción `como`.
   - `.claude/launch.json` versionado.
   - `--borde-campo` ≥ 3:1, con su valor y su contraste en `DESIGN.md`.
3. Esqueletos: cada vista de la lista muestra su esqueleto con `aria-busy` y un único `role="status"`; al llegar los datos el contenido aparece sin desplazamiento (CLS ≤ 0.01 en bandeja y ficha). Pruebas con nombre `o14_…`, `o11_…` y `o03_…` para esqueleto, botón pendiente y modal.
4. Movimiento:
   - `DESIGN.md` tiene una sección «Movimiento» con los tokens y la tabla de animaciones aprobadas.
   - `grep` de `transition` y `animation` en `src/**/*.css`: toda duración y curva sale de un token.
   - Ninguna animación sobrepasa `--mov-medio`, salvo el brillo del esqueleto y el spinner.
5. Movimiento reducido: con `prefers-reduced-motion: reduce` emulado (por CDP), el brillo y los desplazamientos quedan anulados. Déjalo como captura o salida en la evidencia.
6. Accesibilidad: `accesslint` e `impeccable audit` sin hallazgos críticos ni graves en las 8 vistas y en los tres estados; los menores quedan listados. El falso positivo de V-05 (`aria-hidden-focus` con `#root` inerte) se mantiene documentado.
7. Ningún color escrito fuera de los tokens (el mismo `grep` de la T-01) y sin dependencias nuevas en `package.json`.
8. `/ponytail-review` hecho y lo «must fix» corregido.
9. Un solo commit `T-01b: …` sin líneas de coautoría (verifícalo con `git log -1 --format=%B`). `git status` queda limpio y `git ls-files` no incluye `node_modules`, `dist` ni `.env`.

## Notas del revisor

- Diego trabaja en Windows y usa Claude Code desde la aplicación de escritorio. Usa comandos que funcionen en PowerShell.
- La sesión puede abrir en un worktree. Si el commit queda en la rama del worktree, dilo en el reporte; Diego lo integra en `develop`.
- **Validación en dos pasos**, como en la T-01: primero el revisor revisa el código y el reporte; después Diego valida visualmente. Las correcciones llegan como una asignación nueva; no las adelantes.
- **Textos.** Son los del Figma, en español, con acentos en la interfaz. Los nombres de código siguen la regla 12 del handoff (sin acentos ni ñ).
- Todo lo que el Figma no dibuja y se agrega aquí (esqueletos, spinner, movimiento) va en el reporte como «diseño propio para revisar».
