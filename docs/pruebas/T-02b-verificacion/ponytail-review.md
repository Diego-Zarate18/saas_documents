# `/ponytail-review` de la T-02b (criterio 9)

Nivel **full**, sobre el cambio completo de la T-02b (Parte 0, Parte B y Parte A). Carga supuesta: una persona por navegador con la fuente simulada; muchas personas con la API real desde T-15.

El revisor dio **8 hallazgos**: 1 *must fix*, 4 *should fix* y 3 *nice to have*. Diego pidió corregirlos todos; los 8 están corregidos y, cuando aplica, tienen prueba. Las pruebas de 6 y 7 se comprobaron por mutación: fallan con el código anterior.

| # | Grupo | Hallazgo | Corrección | Prueba |
| --- | --- | --- | --- | --- |
| 1 | Must fix | Desactivar un área con hijas activas las dejaba fuera del organigrama de V-16 | `desactivarArea` rechaza con `CONFLICTO` si hay áreas activas que dependen de ella | `o33_d42_no_se_desactiva_con_pendientes` (área madre con hija) |
| 2 | Should fix | Renombrar un área rompía la liga con los documentos que emitió (la semilla los liga por nombre) | `guardarArea` actualiza el emisor de esos documentos, como ya hacía `guardarActor`; lleva su comentario `shortcut:` | `o33_d47_sin_ciclos_y_d61_siglas_fijas_con_folios` (busca por el nombre nuevo) |
| 3 | Should fix | `tipo_emisor` no se validaba: un valor desconocido saltaba RI-06 | `exigirEmisor` rechaza cualquier valor que no sea `area` o `externo` | `o01_ri06_el_emisor_es_un_area_o_un_actor_activo_del_catalogo` |
| 4 | Should fix | El paginador de V-06 dibujaba un botón por página (500 con 10 000 documentos) | `paginasVisibles`: primera, última y vecinas de la actual, con «…» en los saltos | `o30_paginador_muestra_extremos_y_vecinas_con_saltos` |
| 5 | Should fix | En V-11b, una búsqueda nueva ocultaba el asunto elegido pero «Asignar» seguía activo | Cambiar el texto de búsqueda quita la elección | `o08_v11b_una_busqueda_nueva_quita_el_asunto_elegido` |
| 6 | Nice to have | Intro durante la espera de 250 ms elegía un resultado de la búsqueda anterior | Intro no elige mientras se busca | `o30_intro_durante_la_espera_no_elige_un_resultado_viejo` (falla sin la corrección) |
| 7 | Nice to have | Tras «Son el mismo», la comparación se releía y mostraba un instante «No se pudo cargar la comparación» | Mientras se resuelve, la consulta de la comparación queda deshabilitada | `o26_v14_son_el_mismo_cancela_el_marcado_y_sale_de_la_lista` cuenta las lecturas (falla sin la corrección: 2 en lugar de ≤ 1) |
| 8 | Nice to have | Los campos `vista`, `nodo` y `variantes` del menú ya no los leía nadie | Borrados de `rutas/menu.ts` (≈20 líneas) | — (lo cubren typecheck y la prueba del menú por rol) |

Veredicto después de las correcciones: sin hallazgos pendientes.
