# /ponytail-review de la T-02c (criterio 9)

- Fecha: 2026-11-24. Nivel: full (Diego lo confirmó para la revisión).
- Alcance: los cambios sin commit de la T-02c sobre `develop`, es decir el código de `frontend/src` y las pruebas nuevas.
- Carga supuesta: una aplicación de oficina con datos simulados en un navegador.

**Qué hace el cambio:** alinea las siglas de V-16 en una sola columna, saca de las páginas las listas fijas y las pide a O-31, y cambia el error de la API a un solo tipo, `ErrorApi`. También pone la interfaz `ApiSigedoc` entre las páginas y el simulador, muestra un aviso en el modo `real` y agrega las pruebas de aislamiento y de inventario.

## Hallazgos

| # | Grupo | Hallazgo | Estado |
| --- | --- | --- | --- |
| 1 | Should fix | **Si O-31 falla, los modales quedan sin opciones y sin aviso.** V-05, V-07, V-09, V-10, V-15b, V-15c, V-18 y V-19 leían `useCatalogos().data ?? []`. Con la consulta fallida (sin reintento), el grupo quedaba vacío; en V-07 «Devolver» quedaba deshabilitado para siempre. | **Corregido.** Cada vista muestra `<ErrorOperacion error={catalogos.error} que="cargar las opciones del catálogo" />`. Prueba `o31_si_el_catalogo_falla_el_modal_lo_avisa` (`src/paginas/catalogos.test.tsx`, con O-31 simulado en falla). Comprobada por mutación: sin la línea en `Devolver.tsx` falla; restaurada, pasa. |
| 2 | Nice to have | **`contrato_inventario_cubre_todas_las_funciones` lee el inventario relativo a `process.cwd()`.** Corrida desde otra carpeta, daría «archivo no encontrado». | No se cambió: `npm test` corre desde `frontend/` y el comentario de la prueba lo dice. Va al reporte como deuda. |

Sin hallazgos «must fix».

**Veredicto después de la corrección:** listo para entregar.

**No revisado:** cuánto tarda en aparecer cada lista en desarrollo (450 ms de latencia simulada) cuando el catálogo aún no está en caché.
