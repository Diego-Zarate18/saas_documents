# Reporte T-02a: Flujo del documento en la interfaz (con datos simulados)

- Estado: completa
- Fecha: 2026-11-23

## Qué hice

Seguí las cinco fases y anuncié en cada una el nivel de ponytail; Diego confirmó cada cambio (ver Desviaciones sobre los niveles). La evidencia completa está en `docs/pruebas/T-02a-flujo.md`.

1. **Comandos.** `npm ci`, `lint`, `typecheck`, `test` y `build` terminan con código 0 y sin advertencias, incluida la de `Select`. Hay 107 pruebas; en la T-01b había 52.
2. **Parte 0.** Los seis puntos, cada uno con su comprobación:
   - `Select` siempre controlado. `preparar.ts` hace fallar cualquier prueba que imprima en `console.error` o `console.warn`; con el código anterior fallan dos pruebas de Turnar.
   - La columna lateral solo se pone en esqueleto en la carga inicial. Una prueba nueva lo comprueba y falla con el código anterior.
   - `@keyframes aparecer` existe una sola vez, en `base.css`.
   - `EstadoConsulta` recibe `cargando`.
   - Precarga de las tres fuentes latinas: en el build, cada `href` coincide con la `url()` de su `@font-face`.
   - Quité `npx eslint *` de `.claude/settings.json`.
3. **Pruebas por operación y por regla.** Están en `operaciones.test.ts` (36), `modales.test.tsx` (16), `Ficha.test.tsx` y `Bandeja.test.tsx`, con los ids del catálogo (ver Desviaciones). Cubren:
   - folio consecutivo sin huecos aunque falle un registro;
   - duplicado detectado y segunda recepción;
   - confidencial visible solo al titular y a quien tiene movimiento;
   - las cinco formas de concluir y sus requisitos;
   - quién concluye (D-44, D-58);
   - campos obligatorios por tipo;
   - el bloque «Datos del tipo» solo en tres tipos (servidor e interfaz);
   - el turno de OF o DI sobre un pendiente de otra área no lo cierra (D-42).

   Además desactivé a propósito dos reglas (la corrección de O-25 y la salida del área anterior al atraer) y en cada caso falló su prueba.
4. **Modales.** Los ocho modales nuevos tienen foco atrapado, Esc, foco devuelto, botón pendiente y error en línea. Hay una prueba por modal, más una del buscador de documento dentro del modal (Esc cierra su lista sin cerrar el modal), y lo revisé en el navegador.
5. **Recorrido completo** con capturas, en Chrome sin interfaz y con los usuarios de prueba: registrar → turnar → devolver → atraer → relacionar → salida con acuse → concluir con respuesta. Las 14 comprobaciones de bandeja, ficha y acuses pasan con el código final (`T-02a-verificacion/recorrido-resultado.md`).
6. **accesslint e impeccable** en los 20 estados (vistas, modales y estados de error nuevos): **0 hallazgos críticos.**
   - Las vistas sin modal tienen 0 violaciones.
   - En los modales y el menú solo aparecen los falsos positivos de Radix y del fondo inerte ya conocidos de la T-01: `aria-hidden-focus`, `focus-visible` y `focus-order` (graves o moderados), y `landmarks/region` (moderado). En V-10 comprobé que cada elemento marcado está dentro de `#root` inerte o es una guarda de foco de Radix.
   - impeccable no tiene hallazgos en el código. En la página, el único hallazgo real fue el contraste del aviso informativo, ya corregido; el resto son avisos explicados.
7. **Colores, dependencias y capas:** ningún color, duración ni curva fuera de los tokens; `package.json` sin cambios; nada fuera de `src/api/index.ts` importa `api/simulado` (`greps-resultado.txt`).
8. **`/ponytail-review`** (nivel full): dio 9 hallazgos. Corregí el 1 y el 2, los dos «must fix»:
   - «Relacionar» aparecía sin ver el contenido.
   - Los documentos no registrados se identificaban solo por número.

   Corregí también el 3, el 4, el 5 y el 8. La prueba del 5 encontró un defecto real: Esc en el buscador cerraba todo el modal. El 6 queda como duda y el 7 y el 9 como deuda, como pidió Diego (`ponytail-review.md`).
9. **Commit:** uno solo, `T-02a: …`, sin coautoría.

## Archivos

Creados:

- **Vistas:**
  - `frontend/src/paginas/v03-registrar/`: `Registrar.tsx`, `Puntos.tsx` y `Registrar.module.css` (V-03).
  - `v07-devolver/Devolver.tsx` (V-07 y V-07b).
  - `v08-atraer/Atraer.tsx` y `.module.css` (V-08).
  - `v09-concluir/Concluir.tsx` (V-09 y V-09b).
  - `v10-relacionar/Relacionar.tsx` y `.module.css` (V-10, con O-18).
  - `v15-oficialia/`: `Cancelar.tsx`, `Corregir.tsx` con su `.module.css`, y `SegundaRecepcion.tsx` (V-15a, b y c).
  - `v13b-salida/`: `RegistrarSalida.tsx`, `Salidas.tsx` y `Salidas.module.css` (V-13b y el panel de acuse).
- **Componentes:**
  - `componentes/base/Interruptor.tsx`: interruptor de V-03.
  - `componentes/compuestos/`:
    - `BuscadorDocumento.tsx`: combobox para elegir un documento o una salida.
    - `GrupoOpciones.tsx`: catálogo de opciones de radio con leyenda.
    - `Menu.tsx`: «Más acciones» y «Más» (Radix DropdownMenu).
    - `Resumen.tsx`: cajas «Al concluir», «Al cancelar» y similares.
    - `ErrorOperacion.tsx`: error en línea de una operación.
    - Cada uno con su `.module.css`.
- **Pruebas:** `frontend/src/api/simulado/operaciones.test.ts` y `frontend/src/paginas/modales.test.tsx`.
- **Evidencia:**
  - `docs/pruebas/T-02a-flujo.md`.
  - `docs/pruebas/T-02a-verificacion/`:
    - scripts de CDP y del DOM (`cdp.mjs`, `dom.mjs`), `recorrido.mjs`, `auditar.mjs` y `greps.sh`;
    - `inerte.mjs`: comprueba el falso positivo `aria-hidden-focus`.
    - Sus resultados: `criterio1-resultado.txt`, `recorrido-resultado.md`, `greps-resultado.txt`, `inerte-resultado.md` y `auditoria/` (un JSON por estado y `resumen.md`).
    - Los informes `impeccable-informe.md` y `ponytail-review.md`.
  - `docs/pruebas/T-02a-capturas/`: capturas del Figma (`figma-*.png`), de las vistas (`app-*.png`) y del recorrido (`app-recorrido-*.png`).
- `ai/handoff/historial/T-02a-asignacion.md` y `T-02a-reporte.md`.

Modificados:

- **API:**
  - `tipos.ts`: siete tipos, tabla de campos, canal, movimientos nuevos y los datos de cada operación.
  - `reglas.ts`: `validarDatosTipo` y `validarConclusion`, que comparten el servidor y los formularios.
  - `index.ts` y `consultas.ts`: operaciones nuevas y `useEscritura`.
  - `simulado/datos.ts`: ids de tipo, `camposTipo`, canal y salidas con acuse.
  - `simulado/servidor.ts`: las operaciones de la Parte B.
- **Componentes:**
  - `Campo` (`AreaTexto` y variante blanca), `Selector` (`CampoSelector`), `Segmentado` (ancho, ícono y deshabilitado) y `OpcionRadio` (código).
  - `EstadoConsulta` (`cargando`), `Aviso`, `Modal` y `base.css` (`@keyframes aparecer`), y `textos.ts` (tipos, canales, formas y `textoMovimiento`).
- **Vistas:**
  - `Ficha.tsx` (acciones y menús), `Laterales.tsx` (recorrido y «corregido») y `Secciones.tsx` («Datos del tipo», canal y segunda recepción).
  - `Bandeja.tsx`, `TarjetasLaterales.tsx`, `TablaPendientes.tsx` y `VistaPreviaRecorrido.tsx` (Parte 0 y tipos).
  - `Turnar.tsx` (`Select` controlado), `EnConstruccion.tsx` (acciones) y `formato.ts` (fechas).
- **Rutas y permisos:** `rutas.tsx` (`/registrar` y `/salidas`) y `permisos.ts` (Atraer y menús).
- **Otros:**
  - `preparar.ts`: falla ante advertencias.
  - `index.html`: precarga de fuentes.
  - `.claude/settings.json`: sin la regla de eslint.
  - Pruebas de la T-01 actualizadas en `servidor.test.ts`, `Ficha.test.tsx` y `Bandeja.test.tsx`.
  - `Modal.tsx`: Esc desde un combobox abierto no cierra el modal.
  - `Aviso.module.css`: fondo opaco del aviso informativo, por contraste.
- `ai/handoff/reporte.md`: este reporte.

## Evidencia

Detalle en `docs/pruebas/T-02a-flujo.md`.

- **Criterio 1:**
  - `npm ci`: 0 vulnerabilidades.
  - `lint`: sin hallazgos.
  - `typecheck`: sin errores.
  - `test`: 8 archivos, 107 pruebas pasadas, ninguna advertencia impresa (el control de `preparar.ts` hace fallar cualquier prueba que imprima una).
  - `build`: sin advertencias.
  - Todos con código 0 (`criterio1-resultado.txt`).
- **Criterio 2:** tabla de la Parte 0 en `T-02a-flujo.md`, con la comprobación de cada punto.
- **Criterio 3:** `operaciones.test.ts`, `modales.test.tsx` y las dos comprobaciones por mutación.
- **Criterio 4:** `modales.test.tsx`:
  - foco, Esc y foco devuelto en los ocho modales;
  - botón pendiente y refresco tras devolver;
  - error del servidor en línea en V-10;
  - campo con error en V-09b y V-03;
  - teclado del buscador.

  Capturas `app-v*-modal.png` y `app-recorrido-*.png`.
- **Criterio 5:** `recorrido-resultado.md`, 14 de 14 comprobaciones y 17 capturas `app-recorrido-*`.
- **Criterio 6:**
  - `auditoria/resumen.md`, con un JSON de accesslint y otro de impeccable por estado.
  - `inerte-resultado.md`: `#root.inert` es verdadero y los 19 elementos marcados en V-10 son el falso positivo.
  - `impeccable-informe.md`: audit (14/20, «Bueno»), polish y la lista de hallazgos menores.
  - En el menú V-04d, las 5 violaciones están sobre las dos guardas de foco de Radix (spans invisibles con `tabindex="0"` que solo devuelven el foco al menú) y el envoltorio del menú flotante.
- **Criterio 7:** `greps-resultado.txt`: sin colores ni tiempos fuera de los tokens, sin cambios en las dependencias y sin importaciones de `api/simulado` fuera de `api/index.ts`.
- **Criterio 8:** `ponytail-review.md`, con el resultado de cada hallazgo.
- **Criterio 9:** `git log -1 --format=%B` muestra solo `T-02a: …`. `git status` queda limpio y `git ls-files` no incluye `node_modules`, `dist` ni `.env` (lo compruebo tras el commit).

## Decisiones que tomé

- **Tipo de documento:** en el contrato es el id (`TipoDocumento`, D-65). Los nombres viven en `TEXTO_TIPO`, como `TEXTO_MOTIVO`.
- **Tabla de campos por tipo (D-66):** es un dato de la semilla servido por O-31 (`campos_tipo`). El formulario, la ficha y el servidor la leen, y la validación es una sola función (`validarDatosTipo`). `Expediente.campos` (etiqueta y valor) pasa a `Expediente.datos_tipo`.
- **O-01:**
  - El asunto es la síntesis, porque V-03 no tiene campo de asunto y O-01 solo recibe síntesis.
  - El folio usa las siglas del área de quien registra y el año del reloj simulado: es el máximo más uno entre documentos y salidas de esas siglas.
  - La fecha oficial es el día de la recepción; su origen es «sello» si llegó en papel y «correo» si llegó por correo.
- **Recepción:** `medio_recepcion` (texto) pasa a `canal` (`papel` o `correo`) más `segunda_recepcion`.
- **O-22:** devolver y returnar son una sola operación. Sin área sugerida regresa al área que lo envió; con área, esa área lo recibe como responsable con su titular (D-31). Ambos dejan un movimiento «devolucion».
- **O-23:** el movimiento «atraccion» tiene como origen el área responsable actual, así la regla de D-42 la deja sin pendiente. Atraer aparece al titular con acceso completo cuya área no es la responsable; eso incluye al área de apoyo, aunque el Figma solo dibuja el caso de conocimiento.
- **O-05:**
  - Deja un movimiento «conclusion» con `forma_conclusion`.
  - Con respuesta, crea RESPONDE_A desde la respuesta; si la respuesta es una salida, usa su `id_responde_a`.
  - La evidencia es una nota tipada `evidencia_atencion`.
  - El duplicado también lleva nota, porque D-59 exige nota en toda forma salvo con respuesta y enterado.
- **O-25:**
  - Solo corrige el rol de un turno, que es lo que dibuja V-15b.
  - Deja un movimiento «correccion» con `id_corrige`.
  - Los pendientes se calculan con el rol corregido (`efectivos()`), y el original se marca «corregido» en el recorrido.
- **O-24:** guarda `motivo_cancelacion`. Un documento cancelado no admite anexos ni notas (regla de O-09).
- **Salidas:** `SalidaSemilla` con acuse (`fecha_hora`, `recibio`). El folio usa las siglas del área emisora (`CO-2026-…`, `FI-2026-…`).
- **Caché tras escribir (`useEscritura`):** las consultas que no están en pantalla se descartan y las que sí están se releen antes de cerrar el modal. Sin esto, al volver a la bandeja se veía un instante la lista anterior a la operación; lo descubrí en el recorrido.
- **Menú:** al elegir una opción, el foco pasa a «Más acciones» antes de abrir el modal, así el modal lo devuelve al cerrar.
- **Relacionar (O-07):** se ofrece solo a quien ve el contenido (D-29). Sin verlo, el «Más» del área no aparece, porque sus dos acciones (relacionar y asunto) son sobre el contenido.
- **No registrados (D-33):** se identifican por número y emisor; el emisor va en `descripcion`. La relación de la semilla `SIS/0198/2026` ahora lleva su emisor, «Sistemas».
- **Esc en el modal:** si Esc viene de un combobox con la lista abierta (`aria-expanded="true"`), `Modal` no se cierra; Esc cierra primero la lista.
- **Aviso informativo:** su fondo es `--fondo-base` opaco. Al 80 % sobre el vidrio del modal, el texto quedaba en 4.4:1; opaco da 5.06:1.
- **Fechas:** los campos `datetime-local` se capturan en hora de Ciudad de México con −06:00 fijo; lleva su comentario `shortcut:`.

**Diseño propio para revisar** (el Figma no lo dibuja o lo dibuja de otra forma):

- **`/salidas`:**
  - Sigue «en construcción», pero ya tiene la acción «Registrar salida» del encabezado de V-13, que abre V-13b.
  - Al guardar la salida aparece el panel «Registrar acuse» de V-13 para esa salida.
- **V-13b:** quité el aviso «El contenido según el tipo… se definirá con el modelo de datos (E-2)», porque D-66 ya lo cerró. El destinatario es un campo de texto y su ayuda no lleva «Proveedor.».
- **V-10:**
  - El emisor del documento no registrado es un campo de texto; el Figma dibuja un selector.
  - Hay un aviso rojo al elegir «Sustituye a» y el campo «Documento» para elegir un registrado.
- **V-09:**
  - El aviso «puedes concluirlo» y el resumen «Al concluir» aparecen en todas las formas; V-09b los omite.
  - Los campos de «No procede» (motivo) y «Duplicado» (documento original y nota) no tienen dibujo.
- **V-07:**
  - El botón lleva el nombre del área tal cual («Devolver a Oficialía de partes»); el Figma dice «Devolver a oficialía».
  - El aviso rojo de rebote sin área sugerida usa texto propio.
- **V-15b:** los roles que romperían RI-10 se deshabilitan, con la ayuda para el caso del responsable.
- **V-03:**
  - Ayuda «Sin fecha se marca posible duplicado.».
  - Actor externo como campo de texto (actores externos es T-02b).
  - La fecha y hora de recepción toma por omisión la hora actual.
  - Al enviar con errores, el foco va al primer campo con error.
- **Componentes y estilos:**
  - Interruptor encendido en guinda, con la pista apagada en gris cálido para cumplir 3:1.
  - La lista desplegada del buscador de documentos.
  - El menú «Más» de titular y personal (Relacionar y «Asignar a un asunto», que abre el aviso en construcción de V-11b).
  - El folio grande de V-03 en mono de 28 px.

## Desviaciones

- **Ponytail en la Fase 1:** la tabla pedía full y Diego respondió `/ponytail off`, así que se hizo en off, con cambios mínimos. Las demás fases siguieron la tabla: la 2 en full, la 3 y la 4 en off, y `/ponytail-review` en full.
- **Ids de operación:** la asignación usa O-06 a O-13 para devolver, returnar, atraer, relacionar, cancelar, corregir, segunda recepción y salida. Esos ids no corresponden al catálogo ni a `arquitectura.md`, que mandan sobre `siguiente.md`. Usé los del catálogo, también en los nombres de las pruebas:

  | Operación | Catálogo |
  | --- | --- |
  | Devolver o returnar | O-22 |
  | Atraer | O-23 |
  | Relacionar | O-07 |
  | Quitar relación | O-18 |
  | Cancelar | O-24 |
  | Corregir movimiento | O-25 |
  | Segunda recepción | O-19 |
  | Salida externa | O-20 |
  | Acuse | O-21 |
  | Anexo y nota | O-28 y O-29 |

  O-01 y O-05 coinciden.
- **D-66 sobre el Figma:**
  - V-03 dibuja «Número de auditoría» y V-04 «Monto estimado» de ejemplo. D-66 no los incluye, así que no los implementé.
  - La semilla de OP-2026-0139 solo tiene «Concepto».
- **Operaciones agregadas:**
  - O-18 (Quitar relación): no está en la lista de la asignación, pero V-10 la dibuja.
  - O-30 reducido (`buscarDocumentos`): lo necesitan los selectores de V-09, V-10 y V-13b. La vista V-06 sigue en T-02b.
  - `obtenerFolioSiguiente`: lectura que V-03 necesita para mostrar el folio antes de guardar (ver huecos).
- **Pruebas de la T-01 actualizadas:**
  - `o11_acciones_TI apoyo` ahora espera también «Atraer».
  - Hay un caso nuevo para el titular con el documento para conocimiento (V-08).
  - El aviso en construcción se prueba con «Asignar a un asunto», porque Relacionar ya tiene modal.
- **Worktree:** la sesión abrió en `claude/sigedoc-t-02a-handoff-dbedc5`, que partía de `main` (`2f69384`). Hice un avance rápido a `develop` (`b5ccdb5`). **El commit queda en esa rama**; Diego lo integra en `develop`.

## Dudas y huecos propuestos

- **HU-propuesto · Folio siguiente:**
  - Qué falta: V-03 muestra el folio antes de guardar y el mapa de la API no tiene esa lectura.
  - Qué afecta: T-15.
  - Opciones: `GET /documentos/folio-siguiente`, o dejar de mostrarlo hasta guardar. Hoy es `obtenerFolioSiguiente()`.
- **HU-propuesto · Punto de entrada de V-13b y del acuse:**
  - Qué falta: V-13b y el panel «Registrar acuse» viven en V-13 (el listado, T-02b).
  - Qué afecta: T-02b.
  - Opciones: que T-02b absorba lo que hoy está en `/salidas`, o abrir V-13b también desde la ficha.
- **HU-propuesto · Contenido por tipo en las salidas:**
  - Qué falta: O-20 recibe «contenido», pero V-13b no lo captura.
  - Opciones: reutilizar el bloque «Datos del tipo» de V-03 en V-13b.
- **Folio de salida:** V-02b y V-09 usan `CO-2026-0048` (siglas del área) y V-13 usa `SAL-2026-0061`. Seguí las siglas del área (D-21). ¿Cuál es el correcto?
- **Anexo y nota:** el Figma solo dibuja «+ Agregar». Las operaciones O-28 y O-29 existen en la fuente simulada y tienen pruebas, pero la interfaz sigue con el aviso en construcción.
- **Rebotes (C3):** la tarjeta usa datos fijos. Una devolución `no_competencia` sin área sugerida no aparece ahí hasta que C3 se calcule (T-02b).
- **V-04:** sus notas ponen «Relacionar» en «Más acciones» y además el dibujo lo muestra como botón. Seguí el dibujo (hay ambos).
- **V-15b:** sus notas dicen que también se abre «desde un paso del recorrido». No lo hice, porque el Figma no lo dibuja.
- **Emisor y destinatario:** son texto libre hasta que exista el catálogo de actores externos (O-35, T-02b).
- **Atraer con dos responsables** (`/ponytail-review` 6): con el D-42 literal, un turno de OF o DI sobre un pendiente de otra área deja dos áreas responsables. Si después un titular atrae el documento, solo la primera deja de tenerlo pendiente, porque el movimiento tiene un único origen. Caso: OP-2026-0152 en Compras; oficialía lo turna a Jurídico como responsable; Finanzas lo atrae y Jurídico sigue con él. ¿Qué es «el área anterior» de O-23 cuando hay dos? Es la misma pregunta abierta desde la T-01 sobre el turno de Dirección. No lo parcheé.

## Deuda detectada

- `shortcut:` quitar SUSTITUYE_A devuelve el documento a «en trámite» sin guardar el estado anterior; el servicio real lo leerá de la reconciliación (D-14).
- `shortcut:` las fechas de `datetime-local` usan −06:00 fijo.
- Reloj simulado: la recepción por omisión de V-03 es la hora real (23 nov), mientras los movimientos usan `HOY` fijo (22 nov); en el recorrido se ve la recepción un día después del registro. Desaparece con la API real (T-15).
- **`/ponytail-review` 7:** el texto «Regresa a…» de V-07 y el área del botón se calculan con los roles sin corregir, y el servidor usa los corregidos. Solo cambia la etiqueta cuando el turno que llegó al área fue corregido de conocimiento a apoyo; el documento va al área correcta.
- **`/ponytail-review` 9:** el buscador de documento consulta en cada tecla. En T-15, contra la API real, conviene esperar unos 250 ms tras la última tecla.
- **Avisos que quedan del detector de impeccable**, explicados en `impeccable-informe.md`:
  - `nested-cards`, por el bloque del usuario, el segmentado y el panel de duplicado, como dibuja el Figma;
  - `cream-palette`, por el marfil de la paleta aprobada;
  - `low-contrast` en los segmentos deshabilitados (WCAG exime los controles inactivos);
  - `line-length` en un aviso de V-10.

## Siguiente paso sugerido

Validación visual de Diego (V-03, los nueve modales y el recorrido); después, T-02b (consulta, asuntos, salidas y administración).
