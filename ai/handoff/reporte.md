# Reporte T-02b: Consulta, asuntos y administración en la interfaz (con datos simulados)

- Estado: completa
- Fecha: 2026-11-23

## Qué hice

Seguí las cinco fases y anuncié en cada una el nivel de ponytail; Diego confirmó cada cambio (ver Desviaciones). La evidencia completa está en `docs/pruebas/T-02b-consulta-administracion.md`.

1. **Comandos:** `npm ci`, `lint`, `typecheck`, `test` y `build` terminan con código 0 y sin advertencias. Hay **166 pruebas** en 13 archivos (la T-02a dejó 107).
2. **Parte 0:** los cinco puntos, cada uno con su prueba:
   - **D-67:** la prueba `d42_…` ya cubría el caso; ahora se llama `d67_…`.
   - **D-68:** atraer saca a todas las áreas responsables y las registra como orígenes del movimiento («Compras y Jurídico»). Probado con OP-2026-0152; la prueba falla sin la regla.
   - **«Regresa a…»:** V-07 usa los roles corregidos (O-25), como el servidor.
   - **Buscador:** espera 250 ms tras la última tecla antes de consultar O-30; probado con temporizadores simulados.
   - **Anexo y nota:** ya son modales, con el patrón de la T-02a.
3. **Parte B:** son las operaciones y consultas simuladas, con las convenciones de la T-02a (latencia, errores del contrato, D-29, D-44):
   - O-30 completo;
   - O-08, O-27 y la parte de O-18 que saca un documento de un asunto;
   - C2 (hilo), C3 (rebotes, ahora también en la tarjeta de la bandeja) y C5 (alcance);
   - O-26 con la comparación con el candidato;
   - el listado de salidas;
   - O-32 a O-35.

   Ya había un administrador (Mtro. Luis Gómez). Hay más de 50 pruebas nuevas con el id del catálogo en el nombre: `o30_`, `o08_`, `o26_`, `o27_`, `o18`, `o28_`, `o29_`, `o32_` a `o35_`, `c2_`, `c3_` y `c5_`.
4. **Parte A:** construí las once vistas como están en el Figma y el emisor y el destinatario ahora se eligen del catálogo:
   - V-06, V-11, V-11b, V-11c, V-12, V-13 (absorbe `/salidas`), V-14 y V-16 a V-19;
   - emisor y destinatario en V-03, V-10 y V-13b son selectores del catálogo (RI-06), y el servidor rechaza los que no son un área o un actor activo.
5. **Menú:** borré `EnConstruccion`. TypeScript exige una vista por opción, y la prueba `t02b_ninguna_opcion_del_menu_<ROL>_esta_en_construccion` recorre el menú de los cinco roles.
6. **Modales nuevos** (anexo, nota, V-11b y «Asignar documento»): foco atrapado, Esc, foco devuelto, botón pendiente y error en línea, con prueba y revisados en el navegador.
7. **Recorrido en el navegador:** 17 de 17 comprobaciones, con 17 capturas (`recorrido-resultado.md`).
8. **accesslint e impeccable** en 27 estados: **0 hallazgos críticos.**
   - Los graves que quedan son el falso positivo de la T-01 en los modales: `#root` inerte y guardas de Radix, comprobado en `inerte-resultado.md`.
   - Corregí un `link-in-text-block` grave en el hilo de V-11 y un contraste de 4.46:1 en V-14.
   - impeccable no tiene hallazgos en el código; el audit da 14/20, «Bueno», y los menores están listados.
9. **Colores, dependencias y capas:** ningún color, duración ni curva fuera de los tokens; `package.json` sin cambios; nada fuera de `api/index.ts` importa `api/simulado` (`greps-resultado.txt`).
10. **`/ponytail-review`** (full): dio 8 hallazgos, todos corregidos por pedido de Diego y con su prueba (`ponytail-review.md`).
    - El *must fix* era que desactivar un área con hijas activas las sacaba del organigrama.
    - Las pruebas del Intro durante la espera y de la relectura en V-14 se comprobaron por mutación.

## Archivos

Creados:

- **Vistas:**
  - `frontend/src/paginas/v06-buscar/` (`Buscar.tsx`, `.module.css` y `paginas.ts` con su prueba);
  - `v11-asuntos/` (`Asuntos.tsx`, `Asignar.tsx` y `.module.css`): V-11, V-11c, V-11b y «Asignar documento»;
  - `v12-rebotes/`, `v14-duplicados/`, `v16-organizacion/`, `v17-areas/`, `v18-personas/` y `v19-actores/`;
  - `v04-ficha/AgregarAlExpediente.tsx`: O-28 y O-29;
  - `paginas/listado.module.css`: piezas comunes de los listados con panel.
- **Componentes:** `componentes/compuestos/CampoBusqueda.tsx` y `.module.css` (el buscador en píldora de V-16 a V-19).
- **Pruebas:**
  - `api/simulado/consultas.test.ts` (Parte B);
  - `paginas/consulta.test.tsx` (vistas de consulta y asuntos);
  - `paginas/administracion.test.tsx` (V-16 a V-19);
  - `componentes/compuestos/BuscadorDocumento.test.tsx`;
  - `paginas/v06-buscar/paginas.test.ts`.
- **Evidencia:**
  - `docs/pruebas/T-02b-consulta-administracion.md`;
  - `docs/pruebas/T-02b-verificacion/`:
    - scripts: `cdp.mjs`, `dom.mjs`, `recorrido.mjs`, `auditar.mjs`, `inerte.mjs` y `greps.sh`;
    - resultados: `criterio1-resultado.txt`, `recorrido-resultado.md`, `greps-resultado.txt`, `inerte-resultado.md`, `auditoria/` e `impeccable-fuente.json`;
    - informes: `impeccable-informe.md` y `ponytail-review.md`.
  - `docs/pruebas/T-02b-capturas/`: `figma-*.png`, `app-*.png` y `app-recorrido-*.png`.
- **Historial:** `ai/handoff/historial/T-02b-asignacion.md` y `T-02b-reporte.md`.

Modificados:

- **API:**
  - `tipos.ts`: tipos de O-30, asuntos, C2, C3, C5, O-26, salidas y O-32 a O-35; los actores externos van en O-31.
  - `index.ts` y `consultas.ts`: operaciones y hooks nuevos.
  - `simulado/servidor.ts`: D-68, RI-06 y la Parte B.
  - `simulado/datos.ts`: jerarquía y estado de áreas, baja de personas, actores, asuntos, OP-2026-0140, OP-2026-0109 y salidas de V-13.
- **Vistas:**
  - `Ficha.tsx`: modales de anexo, nota y V-11b; «Regresa a…» con roles corregidos.
  - `Salidas.tsx`: el listado V-13.
  - `RegistrarSalida.tsx`, `Registrar.tsx` y `Relacionar.tsx`: selectores del catálogo.
  - `TarjetasLaterales.tsx`: la tarjeta «Rebotes» usa C3.
- **Componentes:** `BuscadorDocumento.tsx` (espera y solo documentos) y `textos.ts` (reglas de rebote, tipos de actor y roles).
- **Rutas:** `rutas.tsx` (una vista por opción) y `menu.ts` (sin los datos del Figma que ya nadie leía).
- **Configuración de pruebas:** `vite.config.ts` y `pruebas/preparar.ts` (ver Desviaciones).
- **Pruebas de la T-02a ajustadas:** `operaciones.test.ts`, `modales.test.tsx`, `Ficha.test.tsx` y `rutas.test.tsx`.
- **Borrado:** `paginas/en-construccion/EnConstruccion.tsx`.
- `ai/handoff/reporte.md`: este reporte.

## Evidencia

Detalle en `docs/pruebas/T-02b-consulta-administracion.md`.

- **Criterio 1:**
  - `npm ci`: 0 vulnerabilidades.
  - `lint`: sin hallazgos.
  - `typecheck`: sin errores.
  - `test`: 13 archivos, 166 pruebas pasadas.
  - `build`: sin advertencias.
  - Todos con código 0 (`criterio1-resultado.txt`).
- **Criterio 2:** tabla de la Parte 0, con una comprobación por punto.
- **Criterio 3:** tabla de lo que pide la asignación frente a las pruebas.
- **Criterio 4:** la prueba del menú por rol, más el recorrido de todas las opciones en el navegador.
- **Criterio 5:** las cuatro filas de foco nuevas en `modales.test.tsx`, las pruebas de pendiente y error, y capturas.
- **Criterio 6:** `recorrido-resultado.md`, 17 de 17.
- **Criterio 7:** `auditoria/resumen.md`, `inerte-resultado.md` e `impeccable-informe.md`.
- **Criterio 8:** `greps-resultado.txt`.
- **Criterio 9:** `ponytail-review.md`.
- **Criterio 10:** `git log -1 --format=%B` muestra solo `T-02b: …`. `git status` queda limpio y `git ls-files` no incluye `node_modules`, `dist` ni `.env` (lo comprobé tras el commit).

## Decisiones que tomé

- **D-68:** el movimiento de atracción guarda las áreas responsables adicionales en `otros_origenes`. `area_origen` las nombra juntas («Compras y Jurídico»). Si el área que atrae ya era una de dos responsables, atraer la deja como la única.
- **C3:**
  - Las «áreas distintas» cuentan las áreas que tuvieron el documento como responsables, sin oficialía, que es paso obligado (HU-F1). Si contara oficialía, el flujo normal oficialía → Dirección → área ya sería un rebote. Por eso OP-2026-0118 da 1 área y no las 3 del Figma.
  - Solo cuenta documentos en trámite, con los movimientos del mes elegido.
  - La devolución guarda `con_area_sugerida` para distinguir el returno de la «no competencia» sin área.
- **O-26:**
  - El candidato es el último documento registrado antes del mismo emisor con la misma fecha del documento, o con el mismo número si lo trae.
  - La síntesis «coincide» si comparte la mitad de las palabras de cuatro letras o más.
  - Sin candidato solo se puede decir «son distintos».
- **O-30:** los filtros sobre lo que el usuario no ve (síntesis, campo propio, número de un documento de otra área) no se aplican a esos documentos, para no revelar su contenido.
  - Fuera de la visibilidad se muestran folio, tipo, estado y responsable.
  - En un confidencial ajeno también se muestra el número, como dibuja el Figma.
- **C2:** las salidas que responden a un documento del hilo son nodos con RESPONDE_A.
- **C5:** las personas salen solo de los documentos cuyo contenido se ve.
- **O-27 desde V-11b:** crear con documento exige O-08 (TI o PE) y se valida antes de crear, para no dejar un asunto a medias.
- **O-33:**
  - Las siglas son de 2 a 5 letras.
  - Un área nueva debe depender de otra; solo la raíz actual puede no depender de nadie.
  - No se desactiva un área con áreas activas que dependan de ella (`/ponytail-review` 1).
  - Renombrar un área actualiza el emisor de sus documentos, porque la semilla los liga por nombre; lleva comentario `shortcut:`.
- **O-34:** el administrador no puede darse de baja a sí mismo. Un titular que cambia de área o se da de baja deja su área vacante. Una persona dada de baja ya no entra.
- **O-35:** el nombre del actor es único. Renombrarlo actualiza documentos y salidas. No hay operación de borrar, solo desactivar.
- **Semilla:**
  - Agregué las áreas del Figma (Servicios Generales, Unidad de Transparencia bajo Jurídico, Vinculación vacante, Contraloría interna y Archivo de concentración inactiva) y sus titulares.
  - Agregué a Lic. Carmen Ruiz como segunda persona de oficialía, sin ser titular.
  - Agregué los actores de V-19 y como actores los emisores que ya usaban los documentos («Ciudadano», «Proveedor externo», «Órgano Interno de Control»…).
  - Agregué tres asuntos, OP-2026-0140 (candidato de OP-2026-0141), OP-2026-0109 (confidencial de Jurídico) y cuatro salidas de V-13 con las siglas de su área.
  - Se conservan los 24 pendientes de oficialía y los 9 de Compras.
  - Pedro, Laura, Hugo, Irma y Óscar tienen usuario y entran con cualquier contraseña, como los demás.
- **Pruebas:** con 13 archivos en paralelo, cuatro pruebas de la T-02a fallaban solo por tiempo. Subí el tiempo por prueba a 15 s (`vite.config.ts`) y la espera de `findBy` de 3 a 5 s (`preparar.ts`).

**Diseño propio para revisar** (el Figma no lo dibuja o lo dibuja de otra forma):

- **Anexo y nota:** los modales completos.
- **V-06:**
  - «Recibido» ofrece periodos fijos («Este mes», «En 2026»), porque el Figma dibuja un rango sin selector.
  - El campo «Ente auditor contiene» / «Solicitante contiene» aparece al elegir uno de los dos tipos.
  - El paginador muestra la primera, la última y las vecinas, con «…».
  - La fila de otra área dice «De otra área: solo estado y responsable».
- **V-11:**
  - El selector «Asunto:» del encabezado y la dirección `?id=`: el Figma no dibuja una lista de asuntos.
  - El modal «Asignar documento».
  - El folio enlazado del hilo va subrayado (accesibilidad).
  - Las barras de C5 van en guinda si el área tiene más de la mitad del máximo.
- **V-11b:** el formulario «Crea un asunto nuevo» y el botón «Elegir un asunto existente».
- **V-12:** la explicación de cada regla en el detalle y el filtro de periodo con los últimos doce meses.
- **V-13:**
  - El panel «Acuse registrado» de una salida que ya lo tiene.
  - Una tarjeta por mes.
- **V-14:** el texto cuando no hay candidato y la etiqueta en tinta sobre el verde (contraste).
- **V-17 y V-19:** las ayudas de siglas y titular, y el aviso de actor inactivo.
- **V-18:** el modo «Editar persona», «Dar de baja» y su aviso para un titular. El formulario abre en «Nueva persona», como el Figma.
- **V-19:** el segmentado de tipo sin ancho completo, porque con ancho completo no cabía en el panel.

## Desviaciones

- **Ponytail:**
  - La Fase 1 se hizo en full, como pedía la tabla. Diego respondió primero `off` y lo corrigió a `full`.
  - Las fases 0, 2 y 3 se hicieron en off.
  - La Fase 4 se hizo en full: la tabla pedía off con full solo para `/ponytail-review`, y Diego respondió `full`.
- **Ids de operación:** los de la asignación coinciden con el catálogo.
- **O-08 y oficialía:** el catálogo da O-08 solo a TI y PE. Oficialía ve V-11 con «Sacar» (O-18) pero sin «Asignar documento». Desde V-11b crea asuntos sin documento.
- **Folio de salida:** V-13 dibuja `SAL-2026-0061`. Seguí la asignación: las siglas del área emisora (`UT-2026-0001`, D-21).
- **Campo propio en V-06:** el Figma usa «Proveedor» de ejemplo. Seguí D-46: solo `ente_auditor` y `solicitante`.
- **Rebote «sin motivo»:** su cifra es siempre 0, porque O-22 exige motivo, como dicen las notas de V-12. Los «tres casos» del criterio 3 son los otros tres.
- **Pruebas de la T-02a ajustadas:**
  - Las que verificaban el aviso «en construcción» ahora verifican V-11b y el menú por rol.
  - Las que escribían emisores libres ahora los eligen del catálogo.
  - `o21_solo_documentos_de_salida` comprueba las siglas del área emisora, porque ya hay salidas de varias áreas.
- **Worktree:** la sesión abrió en `claude/sigedoc-t-02b-handoff-c55429`, que partía de `2f69384`. Hice un avance rápido a `develop` (`043b476`). **El commit queda en esa rama**; Diego lo integra en `develop`.

## Dudas y huecos propuestos

- **HU-propuesto · Lista de asuntos.**
  - Qué falta: el menú «Asuntos» lleva a V-11, que es un solo asunto, y no hay operación ni vista para listarlos.
  - Qué afecta: T-15 (API) y el Figma.
  - Opciones: dibujar un índice de asuntos, o quedarse con el selector del encabezado. Hoy es `obtenerAsuntos()`, que también usa V-11b.
- **HU-propuesto · Borrar actores sin documentos.**
  - Qué falta: O-35 dice que no se eliminan si ya tienen documentos, lo que sugiere que sin documentos sí; el Figma solo dibuja «Desactivar».
  - Opciones: agregar «Eliminar» cuando no tiene documentos, o solo desactivar. Hoy solo se desactiva.
- **Rebotes, «tres áreas»:** ¿cuenta oficialía? Ver Decisiones; el Figma parece contarla.
- **Salidas de la T-02a con destinatario interno:** CO-2026-0048, 0049 y 0046 tienen como destinatario «Sistemas», «Administración» y «el OIC», que no son actores externos. No las cambié, porque la bandeja de la T-02a las usa. ¿Se corrige la semilla?
- **Oficialía sin titular:** V-16 dibuja a Lic. Carmen Ruiz como titular de Oficialía de partes; en la semilla está como persona de oficialía, no como titular, para no cambiar los titulares al turnar de los documentos de la T-01. ¿La hago titular?
- **Contraste sobre el vidrio de los modales:** el texto secundario medido sobre el vidrio da 4.47 a 4.49:1. Viene de `--vidrio-fondo-modal` (T-01). ¿Se sube su opacidad?
- **Relacionar con salidas:** el buscador de V-10 ofrece salidas, pero O-07 solo relaciona documentos registrados. Agregué `soloDocumentos` al buscador y lo uso en «Asignar documento»; ¿lo uso también en V-10?

## Deuda detectada

- `shortcut:` la semilla liga emisor y destinatario por nombre (áreas y actores); el servicio real usa ids.
- `shortcut:` la contraseña inicial y su hash no se simulan (O-34).
- Los periodos de V-12 y V-06 usan el reloj real, mientras la semilla usa `HOY` fijo (22 nov 2026). En diciembre, V-12 abre en un mes sin rebotes hasta que se elija noviembre. Desaparece con la API real (T-15).
- Las pruebas de vista montan la aplicación completa y alargan la suite; por eso subí los tiempos de espera.
- `cramped-padding` (7 px) en las tablas y `low-contrast` (advisory) sobre el vidrio de los modales: vienen de componentes de la T-01; están listados en `impeccable-informe.md`.

## Siguiente paso sugerido

Validación visual de Diego de las once vistas y los cuatro modales nuevos; después, la siguiente tarea del plan de `docs/arquitectura.md`.
