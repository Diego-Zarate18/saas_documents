# Reporte T-01b: Correcciones y movimiento de la interfaz base

- Estado: completa
- Fecha: 2026-11-23

## Qué hice

Seguí las cuatro fases y anuncié en cada una el nivel de ponytail; Diego confirmó cada cambio (ver Desviaciones sobre la Fase 1). La evidencia completa está en `docs/pruebas/T-01b-correcciones.md`.

1. **Comandos.** `npm ci`, `lint`, `typecheck`, `test` y `build` terminan con código 0 y sin advertencias. Hay 52 pruebas; antes eran 45.
2. **Parte A.**
   - **Fila elegida.** `Bandeja` guarda ahora los filtros y calcula una sola fila elegida: la que eligió el usuario si sigue en la lista filtrada; si no, la primera de la lista filtrada. La reciben como prop la tabla y la tarjeta «Recorrido», y borré el cálculo propio de la tabla. Lo comprueban la prueba `o14_filtro_tipo_…` y el navegador (`parte-a.mjs`).
   - **`Tarjeta`:** sin la opción `como`; siempre es `section`.
   - **`.claude/launch.json`:** versionado.
   - **`--borde-campo`:** vale #6B6461 y da de 4.63 a 5.80:1 contra los fondos de los controles; está anotado en `DESIGN.md`.
3. **Esqueletos.**
   - **Dónde:** bandeja (indicadores, aviso de duplicados, 6 filas, columna de recorrido y rebotes o acuses), ficha, lista de áreas de V-05 y pantalla de sesión con el isotipo y «Cargando…».
   - **Accesibilidad:** los contenedores llevan `aria-busy` y las formas `aria-hidden`; cada vista tiene un único `role="status"`.
   - **CLS:** como máximo 0.0031 en el flujo normal y 0.0057 al recargar, en bandeja y ficha.
   - **Pruebas:** `o14_…` y `o11_…` para el esqueleto; `o03_…` para el botón pendiente y el modal.
4. **Movimiento.**
   - **Tokens** `--mov-*` y `--curva-*`, y la sección «Movimiento» en `DESIGN.md`.
   - **Tabla aprobada:** aplicadas sus 14 filas, sin agregar otras.
   - **`grep`:** ningún tiempo ni curva fuera de los tokens.
   - **Duraciones:** ninguna animación pasa de `--mov-medio`, salvo el brillo y el spinner.
5. **Movimiento reducido** (emulado por CDP): el brillo se detiene y desaparecen los desplazamientos, las escalas y los giros. El modal y los avisos quedan solo con `opacity` y 0.01 ms, y el spinner sigue a 1.6 s.
6. **Accesibilidad.** 42 escaneos con accesslint e impeccable: 0 hallazgos críticos.
   - Lo único grave es el falso positivo documentado `aria-hidden-focus`, en los estados con diálogo o lista abierta de Radix.
   - Corregí cuatro hallazgos que aparecieron: la pantalla de sesión sin `main` ni `h1`, la lista del selector cargando (2 críticos) y el límite del campo «Instrucción».
7. **Colores y dependencias:** ningún color fuera de `tokens.css` y `package.json` sin cambios.
8. **`/ponytail-review`:** hecho en nivel full. Corregí el único «must fix»; el resto queda listado en Deuda.
9. **Commit:** uno solo, `T-01b: …`, sin coautoría (verificado abajo).

## Archivos

Creados:

- `.claude/launch.json`: configuración del navegador de vista previa (Parte A.3).
- `frontend/src/componentes/compuestos/Esqueleto.tsx` y `.module.css`: `Forma`, la forma del esqueleto (de línea o molde), y `AnuncioCarga`, el único «Cargando…» de la vista.
- `frontend/src/iconos/Giro.tsx` y `.module.css`: el spinner, un anillo SVG con `currentColor`.
- `frontend/src/paginas/v04-ficha/FichaEsqueleto.tsx`: el esqueleto de la ficha.
- `frontend/src/rutas/RutaProtegida.module.css`: la pantalla neutra de sesión.
- `frontend/src/componentes/base/Boton.test.tsx` y `frontend/src/paginas/v02-bandeja/Bandeja.test.tsx`: pruebas nuevas.
- `docs/pruebas/T-01b-correcciones.md`: la evidencia.
- `docs/pruebas/T-01b-verificacion/`: los scripts de CDP (`cdp.mjs`, `cls.mjs`, `cls-flujo.mjs`, `movimiento.mjs`, `auditar.mjs`, `parte-a.mjs`, `contraste.mjs`, `greps.sh`), sus resultados, `impeccable-informe.md`, `ponytail-review.md` y `auditoria/` con el JSON de cada escaneo.
- `docs/pruebas/T-01b-capturas/`: capturas de los esqueletos, el contenido, el modal (normal y reducido) y la Parte A.
- `ai/handoff/historial/T-01b-asignacion.md` y `T-01b-reporte.md`.

Modificados:

- `frontend/src/estilos/tokens.css`: `--borde-campo` y los tokens de movimiento.
- `frontend/src/estilos/base.css`: el bloque `prefers-reduced-motion` se conserva y ahora usa `--mov-nulo` y no repite bucles.
- **Componentes:**
  - `Boton`: prop `pendiente`, transiciones, `:active` y la flecha.
  - `ElementoNavegacion`: hover, barra arena con `scaleY` y spinner en «Cerrar sesión».
  - `Campo`, `OpcionRadio`, `Segmentado` y `Selector`: borde de campo.
  - `Selector`: además, chevron, lista animada y estado `cargando`.
  - `Modal`: animación con `data-state`.
  - `Aviso`: fundido.
  - `EstadoConsulta`: prop `esqueleto` y fundido del contenido.
  - `Indicador` y `EncabezadoPagina`: aceptan formas.
  - `Tabla`: transición del fondo de la fila.
  - `Tarjeta`: sin `como`.
  - `Marco`: `AnuncioCarga` y «Cerrar sesión» pendiente.
- **Vistas:**
  - `Bandeja`, `TablaPendientes`, `VistaPreviaRecorrido` y `TarjetasLaterales`: la Parte A y los esqueletos.
  - `Ficha`: esqueleto.
  - `Turnar`: botón pendiente, áreas cargando y anillo del campo «Instrucción».
  - `InicioSesion`: botón pendiente.
  - `RutaProtegida`: pantalla de sesión.
- `frontend/src/api/simulado/servidor.ts`: `VITE_API_LATENCIA_MS` (450 por omisión; 0 en pruebas).
- `frontend/.env.example` y `README.md`: documentan `VITE_API_LATENCIA_MS`.
- `DESIGN.md`: `borde-campo` y la sección «Movimiento».
- **Pruebas:**
  - `Ficha.test.tsx`: la ayuda ignora los `h1` de la pantalla de sesión y del esqueleto; prueba `o11_…` nueva.
  - `Turnar.test.tsx`: prueba `o03_modal_…` nueva.
  - `pruebas/preparar.ts`: espera de `findBy` a 3 s.
- `ai/handoff/reporte.md`: este reporte.

## Evidencia

Detalle en `docs/pruebas/T-01b-correcciones.md`.

- **Criterio 1:**
  - `npm ci`: 183 paquetes, 0 vulnerabilidades.
  - `lint`: sin hallazgos.
  - `typecheck`: sin errores.
  - `test`: 6 archivos, 52 pruebas pasadas.
  - `build`: sin advertencias.
  - Todos con código 0 (`criterio1-resultado.txt`).
- **Criterio 2:** la prueba `o14_…` pasa, y en el navegador fila resaltada y recorrido coinciden en los 4 pasos: sin filtro, con la fila elegida, con un filtro que la conserva y con uno que la deja fuera. `Tarjeta` sin `como`, `launch.json` en el commit y `--borde-campo` de 4.63 a 5.80:1.
- **Criterio 3:** esqueletos con `aria-busy`, un único `status` y formas ocultas (pruebas `o14_` y `o11_`, y navegador). CLS en el flujo normal: OF 0.0004 y 0.0031, DI 0.0022, TI y PE 0.0001 y 0.0000. Al recargar, como máximo 0.0057.
- **Criterio 4:** la sección «Movimiento» está en `DESIGN.md`. El `grep` no encuentra literales de tiempo ni de curva fuera de `tokens.css`, y la duración máxima de las transiciones es 220 ms.
- **Criterio 5:** la tabla de estilos calculados normal contra `reduce` está en `movimiento-resultado.md`, más las capturas en modo reducido.
- **Criterio 6:** 42 escaneos, 0 críticos. `aria-hidden-focus` (falso positivo de V-05, ahora también en los otros diálogos y en el selector abierto) y `region` (moderado) quedan documentados. impeccable solo deja avisos explicados.
- **Criterio 7:** `grep` de colores sin resultados y `package.json` sin cambios.
- **Criterio 8:** `ponytail-review.md`, con el «must fix» corregido.
- **Criterio 9:** `git log -1 --format=%B` muestra solo `T-01b: …`; `git status` queda limpio; `git ls-files` no incluye `node_modules`, `dist` ni `.env` (comprobado tras el commit).

## Decisiones que tomé

- **Valor de `--borde-campo`.** Tomé el gris cálido de la paleta, `#6B6461` (`--texto-secundario`): es el color del Figma que cumple 3:1, y en todos los fondos de los controles da 4.63:1 o más. La asignación pedía «el más oscuro de la paleta que cumpla»; la tinta casi negra también cumple, pero sería un borde demasiado fuerte para el sistema.
- **Selector hundido, selector de fila, segmentado y campo «Instrucción».** No tienen borde en el Figma. Les puse un anillo interior de 1 px (`inset box-shadow`) con `--borde-campo`, para no cambiar sus medidas.
- **Un `role="status"` por vista** (`AnuncioCarga`, en el marco) y no uno por esqueleto: la bandeja carga cuatro bloques a la vez y habría cuatro anuncios. El anuncio existe siempre y su texto cambia a «Cargando…» mientras alguna consulta se lee por primera vez; así el lector de pantalla lo anuncia. La lista del selector, que vive fuera del fondo inerte del modal, lleva el suyo.
- **Columna lateral de la bandeja.** En la carga inicial espera al recorrido elegido por omisión y se sustituye de una vez. Sin esto, Dirección daba un CLS de 0.0465: la tarjeta «Rebotes» ya cargada bajaba 192 px.
- **Forma del esqueleto.** La forma de línea mide 0.8 em y va dentro del mismo elemento de texto que sustituye, así que el alto de línea lo pone la fuente. Para botones y píldoras uso un «molde» que envuelve el control real oculto, de modo que las medidas sean exactas.
- **Botón pendiente.** Conserva su color (sin el 50 % de deshabilitado) y cambia el cursor a `progress`. Sin ícono, el spinner va fuera del flujo, a la izquierda.
- **Hover de las filas de la tabla:** la tabla aprobada lo pide y el Figma no lo dibuja. Usé guinda suave al 35 %; la fila elegida sigue al 60 %.
- **Flecha de los botones:** la regla queda para el ícono `flecha`, aunque hoy no lo usa ningún botón. «Cerrar sesión» (ícono `salir`) sí se mueve.
- **Pantalla de sesión:** es un `main` con un `h1` «SIGEDOC» solo para lectores de pantalla, porque accesslint marcaba `bypass` y `page-has-heading-one`.
- **Pruebas:** subí la espera de `findBy` a 3 s y el límite de una prueba de la bandeja a 15 s. Con toda la suite en paralelo y la latencia en 0, montar la aplicación a veces pasaba de 1 s.

**Diseño propio para revisar** (el Figma no lo dibuja):

- los esqueletos (formas, brillo y colores);
- el spinner;
- toda la tabla de movimiento y sus tokens;
- el hover de las filas;
- la pantalla de sesión;
- el anillo de `--borde-campo` en los controles sin borde.

## Desviaciones

- **Ponytail en la Fase 1.** La tabla pedía full; Diego respondió dos veces `/ponytail off`, así que la Fase 1 se hizo en off. Las correcciones se mantuvieron mínimas.
- **Worktree.** La sesión abrió en `claude/sigedoc-t-01b-handoff-dd8f22`, que partía de `main` (`2f69384`) y no tenía el proyecto. Hice un avance rápido a `develop` (`04fee03`). **El commit queda en esa rama**; Diego lo integra en `develop`.
- **«Ver todos» sin chevron.** La tabla aprobada pide girar el chevron de «Ver todos», pero el Figma no le dibuja uno y el botón desaparece al pulsarlo, así que no tiene un estado abierto que girar. No agregué ícono.
- **critique en un solo contexto.** impeccable pide dos subagentes; no los lancé sin que Diego lo pidiera. El informe lleva el aviso de modo degradado.
- **Eventos sintéticos en los scripts.** En el Chrome sin interfaz, los eventos de ratón y teclado de CDP no llegan a la página, ni con la emulación de foco. Los scripts usan eventos del DOM (`keydown`, `.click()`).
- **Campo «Instrucción» de V-05.** La Parte A.4 no lo nombra, pero es un control con el mismo estilo que el selector de su fila. Le puse el mismo anillo para que cumpla 1.4.11.

## Dudas y huecos propuestos

- **«El más oscuro de la paleta que cumpla».** ¿Se refería a la tinta o al gris cálido? Tomé el gris cálido (ver Decisiones). Si el revisor prefiere un borde más cercano al Figma, un valor calculado de la misma familia, de alrededor de 3:1, también cumple.
- **Anuncio «Cargando…».** También dice «Cargando…» cuando se lee algo sin esqueleto, como las áreas que la ficha precarga para el modal. ¿Debe limitarse a lo que tiene esqueleto? Tomé lo más simple y honesto: anuncia toda lectura inicial.
- **«Ver todos».** ¿Debe convertirse en un control que se pliega, con «Ver menos» y chevron? Hoy no existe ese estado.
- **`aria-hidden-focus` en los selectores abiertos.** Es el mismo falso positivo que en el modal: Radix oculta lo demás y atrapa el foco. ¿Conviene que el `inert` del modal también se aplique mientras hay una lista abierta, para dejar limpio el escaneo? No lo hice porque no lo pide la tarea.
- **Fuentes.** Al recargar sobre una vista, Unbounded llega después del primer pintado y desplaza ≈0.003. Propuesta: precargar los `woff2` latinos (Fontsource con Vite) en una tarea posterior.

## Deuda detectada

De `/ponytail-review` (no son «must fix»):

1. **Should fix:** un cambio de filtro vuelve a poner en esqueleto toda la columna lateral, y «Rebotes» o «Acuses» parpadean 450 ms. Arreglo: retener la columna solo en la carga sin filtros y dejar que la tarjeta del recorrido muestre su propio esqueleto.
2. **Nice to have:** el `@keyframes aparecer` está repetido en tres módulos CSS; podría quedar uno global en `base.css`, unas 12 líneas menos.
3. **Nice to have:** `{ ...consulta, isPending }` en `TarjetasLaterales.tsx` hace que la tarjeta se vuelva a pintar ante cualquier cambio de la consulta; conviene pasar `cargando` a `EstadoConsulta`.

Otros:

- La regla de la flecha en `Boton.module.css` no tiene usuarios hasta que algún botón use el ícono `flecha`.
- `landmarks/region` (moderado) en los portales de Radix viene de la T-01.

## Siguiente paso sugerido

Validación visual de Diego (esqueletos, movimiento y el borde de campo más oscuro); después, T-02 con estos componentes.
