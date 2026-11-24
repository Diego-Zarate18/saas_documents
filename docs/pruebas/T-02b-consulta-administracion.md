# Evidencia T-02b: consulta, asuntos y administración en la interfaz

- Fecha: 2026-11-23
- Rama: `claude/sigedoc-t-02b-handoff-c55429`, sobre `develop` (`043b476`).
- Scripts en `docs/pruebas/T-02b-verificacion/` y capturas en `docs/pruebas/T-02b-capturas/`:
  - `figma-*.png`: las 11 vistas del Figma;
  - `app-*.png`: los estados auditados;
  - `app-recorrido-*.png`: el recorrido.

Los scripts usan Chrome sin interfaz en el puerto 9222 y `npm run dev` en `http://localhost:5174`:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --remote-debugging-port=9222 --user-data-dir="$env:TEMP\sigedoc-chrome"
```

```powershell
node docs/pruebas/T-02b-verificacion/recorrido.mjs
```

## Criterio 1. Comandos de `frontend/`

`criterio1-resultado.txt` tiene la salida completa.

| Comando | Resultado |
| --- | --- |
| `npm ci` | 183 paquetes, 0 vulnerabilidades, código 0 |
| `npm run lint` | `oxlint --deny-warnings`, sin hallazgos, código 0 |
| `npm run typecheck` | `tsc -b` sin errores, código 0 |
| `npm test` | 13 archivos, **166 pruebas pasadas** (T-02a: 107), código 0 |
| `npm run build` | 364 módulos, código 0, sin advertencias |

Ninguna prueba imprime advertencias: `preparar.ts` hace fallar la prueba que lo haga.

## Criterio 2. Parte 0

| Punto | Comprobación |
| --- | --- |
| D-67 | `d67_turno_de_oficialia_o_direccion_sobre_un_pendiente_de_otra_area_no_lo_cierra` (era la prueba `d42_…`, que ya cubría el caso) |
| D-68 | `d68_atraer_con_dos_responsables_saca_a_ambas_y_no_toca_apoyo_ni_conocimiento` usa el caso OP-2026-0152: Compras y Jurídico son responsables, Sistemas es apoyo, Finanzas tiene conocimiento y atrae. Sin la regla, la prueba falla |
| «Regresa a…» | `o22_o25_regresa_a_usa_los_roles_corregidos_como_el_servidor`: con un turno corregido de conocimiento a apoyo, V-07 dice «Regresa a Dirección General» y no «Oficialía de partes» |
| Buscador con espera | `o30_consulta_250_ms_despues_de_la_ultima_tecla` (temporizadores simulados: nada a los 249 ms, una consulta a los 250). Además, `o30_intro_durante_la_espera_no_elige_un_resultado_viejo` |
| Anexo y nota | Modales `AgregarAnexo` y `AgregarNota`, con foco, Esc, error en línea y botón pendiente: `o28_hojas_invalidas_en_linea_…`, `o29_nota_vacia_en_linea_…` y las filas `o28` y `o29` de la prueba de foco |

## Criterio 3. Pruebas por operación y por consulta

| Pide la asignación | Pruebas |
| --- | --- |
| Paginación de O-30 | `o30_paginacion_obligatoria`, `o30_paginador_muestra_extremos_y_vecinas_con_saltos`, `o30_v06_busca_por_sintesis_pagina_…` |
| Visibilidad fuera del área (D-29) | `o30_d29_fuera_de_la_visibilidad_solo_estado_y_responsable` |
| Confidencial de otra área para oficialía | `o30_d29_confidencial_de_otra_area_para_oficialia` (OP-2026-0109 lo registró Lic. Carmen Ruiz; Marta no tiene movimiento en él) |
| Campo propio solo en los dos tipos con índice | `o30_d46_campo_propio_solo_en_los_dos_tipos_con_indice`, `o30_v06_campo_propio_…` |
| Hilo hasta 6 saltos y no registrados | `c2_d50_hasta_6_saltos`, `c2_hilo_con_relaciones_en_ambos_sentidos_y_no_registrados`, `c2_v11_hilo_con_no_registrado_y_o18_sacar` |
| Dirección sin acciones en V-11c | `d62_v11c_direccion_solo_consulta`, `o08_o27_d44_permisos_por_rol` |
| Tres casos de rebote; una devolución con motivo no aparece | `c3_los_tres_casos_de_rebote`, `c3_devolucion_con_motivo_y_returno_con_area_no_son_rebote` |
| O-26 «son el mismo» y «son distintos» | `o26_son_el_mismo_cancela_el_posterior_con_duplicado_de_y_conserva_movimientos`, `o26_son_distintos_solo_retira_la_marca`, `o26_v14_…` |
| Sin ciclos, siglas fijas con folios, no desactivar con pendientes | `o33_d47_sin_ciclos_y_d61_siglas_fijas_con_folios`, `o33_d42_no_se_desactiva_con_pendientes`, `o33_v17_…` |
| Correo único; baja de un titular deja el área vacante | `o34_correo_unico`, `o34_baja_de_un_titular_deja_el_area_vacante_y_conserva_sus_movimientos`, `o34_v18_…` |
| Actor con documentos se desactiva, no se borra | `o35_actor_con_documentos_se_desactiva_no_se_borra`, `o35_v19_…` |
| O-08, O-27, O-18 | `o27_o08_crear_con_documento_lo_asigna_y_o18_lo_saca`, `o08_asignar_documento_desde_v11_con_error_en_linea`, `o27_o08_v11b_crea_un_asunto_…` |
| O-28, O-29 | `o28_o29_agregar_anexo_y_nota_con_permisos` (T-02a) y las dos pruebas de los modales |
| O-32 | `o32_estructura_actual_para_todos_los_roles`, `o32_v16_…` |
| C5 | `c5_alcance_areas_y_personas_con_contacto`, `c2_c5_d29_sin_visibilidad_solo_area_sin_contenido_ni_personas` |
| RI-06 | `o01_ri06_el_emisor_es_un_area_o_un_actor_activo_del_catalogo`, `o35_v19_crea_un_actor_y_se_ofrece_al_registrar` |

Las pruebas de operación están en `api/simulado/consultas.test.ts` y `operaciones.test.ts`. Las de vista, en `paginas/consulta.test.tsx`, `paginas/administracion.test.tsx` y `paginas/modales.test.tsx`.

## Criterio 4. Ninguna opción del menú en construcción

- **Código:** borré `EnConstruccion.tsx`. `rutas.tsx` declara `VISTAS` como `Record<Exclude<ClaveOpcion, 'bandeja' | 'registrar'>, ReactNode>`, así que TypeScript exige una vista por opción.
- **Prueba:** `t02b_ninguna_opcion_del_menu_%s_esta_en_construccion` (`rutas.test.tsx`) monta cada opción del menú de los cinco roles y comprueba que se pinta su título y que no aparece «en construcción».
- **Navegador:** recorrí todas las opciones de oficialía, titular, dirección y administración (capturas `app-v*.png`).

## Criterio 5. Modales nuevos

| Modal | Foco atrapado, Esc, foco devuelto | Pendiente y error en línea |
| --- | --- | --- |
| Agregar anexo (O-28) | fila `o28` de `modales.test.tsx` | `o28_hojas_invalidas_en_linea_boton_pendiente_…` |
| Agregar nota (O-29) | fila `o29` | `o29_nota_vacia_en_linea_…` |
| V-11b Asignar a un asunto | fila `o08` (ficha) | `o27_o08_v11b_crea_un_asunto_…` (campo con error y botón pendiente) |
| Asignar documento (V-11) | fila `o08` (`/asuntos`) | `o08_asignar_documento_desde_v11_con_error_en_linea` |

En el navegador: capturas `app-v04-anexo-error.png`, `app-v04-nota-modal.png`, `app-v11b-modal.png`, `app-v11b-crear-error.png` y `app-v11-asignar-documento.png`.

## Criterio 6. Recorrido en el navegador

`recorrido.mjs` → `recorrido-resultado.md`: **17 de 17 comprobaciones**, con capturas `app-recorrido-01` a `-17`:

1. Buscar «convenio» y abrir la ficha de OP-2026-0097.
2. Raúl crea el asunto «Papelería 2027» desde V-11b, con OP-2026-0152. Lo ve en V-11; Ana lo ve en V-11c, sin acciones.
3. Rebote OP-2026-0118 en V-12, con su recorrido.
4. «Son el mismo» en V-14 cancela OP-2026-0141.
5. Se crea el actor «Colegio de Arquitectos de Chiapas» en V-19 y se usa como emisor en V-03.
6. El administrador crea el área «PL · Planeación» y la persona «Mariana Solís Aguilar», que aparecen en V-17, V-18 y V-16.

## Criterio 7. accesslint e impeccable

`auditar.mjs` → `auditoria/resumen.md`, con un JSON de accesslint y otro de impeccable por estado; son 27 estados.

- **accesslint: 0 hallazgos críticos.**
  - Las vistas sin modal tienen 0 violaciones.
  - En los 7 estados con modal solo aparecen los falsos positivos de la T-01: `aria-hidden-focus` (grave) y `landmarks/region` (moderado).
  - `inerte.mjs` → `inerte-resultado.md`: con V-11b abierto, `#root.inert` es verdadero y los 12 elementos marcados son 10 dentro de `#root` inerte y 2 guardas de foco de Radix.
  - Durante la auditoría apareció un `link-in-text-block` grave en el hilo de V-11 y V-11c, y ya está corregido.
- **impeccable:**
  - `detect` sobre el código fuente: 0 hallazgos.
  - Audit 14/20, «Bueno». Corregí los dos hallazgos P1: el enlace del hilo y el contraste de V-14.
  - Los menores quedan listados en `impeccable-informe.md`: `low-contrast` (advisory) sobre el vidrio de los modales, `cramped-padding` de la tabla de la T-01, `kicker-above-heading`, `straggler`, `nested-cards` y `cream-palette`.

## Criterio 8. Tokens, dependencias y capas

`greps.sh` → `greps-resultado.txt`: ningún color, duración ni curva fuera de `tokens.css`; `package.json` y `package-lock.json` sin cambios frente a `develop`; ninguna importación de `api/simulado` fuera de `src/api/index.ts` y de las pruebas.

## Criterio 9. `/ponytail-review`

Dio 8 hallazgos: 1 *must fix*, 4 *should fix* y 3 *nice to have*. Diego pidió corregirlos todos y están corregidos con su prueba (`T-02b-verificacion/ponytail-review.md`).

## Criterio 10. Commit

Un solo commit `T-02b: …` sin líneas de coautoría. Lo comprueban `git log -1 --format=%B`, `git status` y `git ls-files`; el resultado está en el reporte.
