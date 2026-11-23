# /ponytail-review del cambio T-01b (nivel full)

Revisado: el cambio completo sin commit (`git diff` y archivos nuevos en `frontend/src`, `.claude/launch.json`, `DESIGN.md`, `README.md` y `frontend/.env.example`). Carga supuesta: una persona por pestaña, en modo simulado; no hay concurrencia entre usuarios.

**Qué hace el cambio:** la bandeja calcula una sola fila elegida para la tabla y el recorrido. Agrega tokens de movimiento, esqueletos de carga con las medidas del contenido, un spinner en las acciones pendientes y la ruta de movimiento reducido. También versiona `.claude/launch.json` y oscurece el borde de los controles.

## Must fix

1. **La columna lateral se quedaba en esqueleto con la bandeja vacía** (`frontend/src/paginas/v02-bandeja/Bandeja.tsx`, `columnaCargando`). **Corregido.**
   - **Qué es:** en la carga inicial, la columna lateral espera al recorrido del pendiente elegido por omisión.
   - **Problema:** sin pendientes, la consulta del recorrido queda deshabilitada y TanStack la da por `isPending` para siempre. Por ejemplo, si Dirección elige «Área: Sistemas» (0 pendientes), «Rebotes» se queda en esqueleto con `aria-busy` y nunca muestra sus datos.
   - **Arreglo:** esperar solo si hay pendiente elegido (`elegida !== undefined &&`). La prueba `o14_area_sin_pendientes_no_deja_la_columna_en_esqueleto` falló antes del arreglo y pasa después.

## Should fix

2. **Un filtro vuelve a poner en esqueleto la columna lateral completa** (`Bandeja.tsx`, `columnaCargando` y la `key` de la columna).
   - **Qué es:** `filtrada.isPending` también vale cuando cambia «Tipo» o «Antigüedad».
   - **Problema:** al filtrar, «Rebotes» o «Acuses» parpadean 450 ms en esqueleto aunque sus datos no cambiaron. No cuenta para CLS, porque es una respuesta a la entrada del usuario.
   - **Arreglo:** retener la columna solo en la carga sin filtros (`todos.isPending`, o `tipo === TODOS && antiguedad === '0'`), y que la tarjeta del recorrido muestre su propio esqueleto mientras `filtrada` carga.
   - **Si se omite:** queda un parpadeo de una tarjeta ajena al filtro. No se pierde información.

## Nice to have

3. **El fotograma `aparecer` está copiado en tres módulos** (`Aviso.module.css`, `EstadoConsulta.module.css`, `Modal.module.css`; `desplegar` en `Selector.module.css` es el mismo).
   - **Qué es:** CSS Modules renombra los `@keyframes` por archivo, por eso cada módulo trae el suyo.
   - **Arreglo:** un solo `@keyframes aparecer` en `base.css`, referido con `:global(aparecer)`. Unas 12 líneas menos.
4. **`{ ...consulta, isPending }` en `TarjetasLaterales.tsx`.**
   - **Qué es:** copia el resultado de TanStack Query para forzar el esqueleto.
   - **Problema:** al copiarlo se leen todas sus propiedades, así que la tarjeta se vuelve a pintar ante cualquier cambio de la consulta (por ejemplo, `isFetching` en una relectura de fondo). Es un costo mínimo con tres elementos.
   - **Arreglo:** pasar `cargando` a `EstadoConsulta` en lugar de copiar la consulta.

Verdict: Ship (el 1 ya está corregido).
Lean: -12 líneas posibles.
Not checked: el parpadeo del punto 2 en el navegador real (solo se razonó desde el código).
