# /ponytail-review de la T-02a (nivel full)

Revisión del cambio sin commit en `frontend/` frente a `develop`. Carga supuesta: una persona en el navegador contra datos en memoria (D-63); el backend real llega en T-15.

**Qué hace el cambio:** completa en la interfaz el flujo del documento con la API simulada: siete tipos con su tabla de campos, todas las operaciones simuladas, V-03, nueve modales conectados a la ficha por rol, las correcciones de la Parte 0 y 52 pruebas nuevas.

## Hallazgos y qué se hizo

| # | Grupo | Hallazgo | Resultado |
| --- | --- | --- | --- |
| 1 | Must fix | «Relacionar» aparecía en documentos cuyo contenido el usuario no ve (D-29): el servidor lo rechazaba al final. Caso: Jorge Ruiz en OP-2026-0124. | **Corregido.** `accionesFicha.relacionar` exige `!contenido_oculto` y el «Más» del área no aparece sin contenido visible. Prueba `o11_acciones_PE confidencial`. |
| 2 | Must fix | Dos documentos no registrados con el mismo número y distinto emisor contaban como el mismo (D-33): CONFLICTO falso y «Quitar» ambiguo. | **Corregido.** `mismaRelacion` compara número y emisor en los no registrados; `quitarRelacion` recibe el emisor. Prueba `o07_o18_d33_no_registrado_se_identifica_por_numero_y_emisor`. |
| 3 | Should fix | «Devolver a dirección general»: el nombre del área se pasaba a minúsculas. | **Corregido.** Va tal cual; la prueba de V-07 busca «Devolver a Oficialía de partes». |
| 4 | Should fix | El buscador de documento perdía la primera letra al escribir sobre un documento elegido. | **Corregido** en `BuscadorDocumento.tsx`; cubierto por la prueba del punto 5. |
| 5 | Should fix | El teclado del buscador no tenía prueba (flechas, Intro, Esc). | **Corregido.** Prueba `o30_flechas_e_intro_eligen_escribir_busca_de_nuevo_y_esc_solo_cierra_la_lista`. **Encontró un defecto real:** Esc cerraba todo el modal, porque Radix oye Esc en la fase de captura, antes que el campo. `Modal` ahora no se cierra con Esc cuando viene de un combobox con la lista abierta (`aria-expanded="true"`). |
| 6 | Should fix | Atraer con dos áreas responsables (posible con el D-42 literal) solo quita el pendiente de la primera. | **No se parchea:** queda como duda en el reporte, porque la regla no dice cuál es «el área anterior» cuando hay dos. |
| 7 | Nice to have | El texto «Regresa a…» de V-07 usa los roles sin corrección; el servidor usa los corregidos. Solo afecta la etiqueta en un caso raro. | **Deuda anotada** en el reporte. |
| 8 | Nice to have | `Turnar` repetía el error en línea que ya da `ErrorOperacion`. | **Corregido:** usa `ErrorOperacion` (−4 líneas). |
| 9 | Nice to have | El buscador consulta en cada tecla; contra la API real conviene esperar ~250 ms. | **Deuda anotada** para T-15. |

Veredicto inicial: «fix 1 and 2 first». Diego pidió corregir 1, 2, 3, 4, 5 y 8, dejar el 6 como duda y el 7 y el 9 como deuda. Tras las correcciones: `lint`, `typecheck`, `test` (107) y `build` con código 0 y sin advertencias.
