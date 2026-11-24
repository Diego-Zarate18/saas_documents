Reloj fijo de la semilla: `HOY = 2026-11-22T12:00:00-06:00`. Los UUID son deterministas: `00000000-0000-4000-8000-<n en 12 dígitos>`.

### Áreas

| id | siglas | nombre | depende de | titular | activa |
| --- | --- | --- | --- | --- | --- |
| 00000000-0000-4000-8000-000000000101 | OP | Oficialía de partes | DG | — | sí |
| 00000000-0000-4000-8000-000000000102 | DG | Dirección General | — | Lic. Ana López | sí |
| 00000000-0000-4000-8000-000000000103 | CO | Compras | DG | Ing. Raúl Pérez | sí |
| 00000000-0000-4000-8000-000000000104 | FI | Finanzas | DG | C.P. Elena Díaz | sí |
| 00000000-0000-4000-8000-000000000105 | SIS | Sistemas | DG | — | sí |
| 00000000-0000-4000-8000-000000000106 | JU | Jurídico | DG | — | sí |
| 00000000-0000-4000-8000-000000000107 | AD | Administración | DG | Mtro. Luis Gómez | sí |
| 00000000-0000-4000-8000-000000000108 | RH | Recursos Humanos | DG | — | sí |
| 00000000-0000-4000-8000-000000000109 | SG | Servicios Generales | DG | Arq. Pedro Mena | sí |
| 00000000-0000-4000-8000-000000000110 | UT | Unidad de Transparencia | JU | Mtra. Laura Ortiz | sí |
| 00000000-0000-4000-8000-000000000111 | VI | Vinculación | DG | — | sí |
| 00000000-0000-4000-8000-000000000112 | CI | Contraloría interna | DG | C.P. Hugo Ramos | sí |
| 00000000-0000-4000-8000-000000000113 | AR | Archivo de concentración | DG | — | no |

### Personas y usuarios

Todas entran con cualquier contraseña no vacía. Las marcadas en V-01 se sugieren en el inicio de sesión.

| id | nombre | correo | rol | área | activa | V-01 |
| --- | --- | --- | --- | --- | --- | --- |
| 00000000-0000-4000-8000-000000000201 | Marta Flores | mflores@institucion.gob.mx | OF | OP | sí | sí |
| 00000000-0000-4000-8000-000000000202 | Lic. Ana López | alopez@institucion.gob.mx | DI | DG | sí | sí |
| 00000000-0000-4000-8000-000000000203 | Ing. Raúl Pérez | rperez@institucion.gob.mx | TI | CO | sí | sí |
| 00000000-0000-4000-8000-000000000204 | C.P. Elena Díaz | ediaz@institucion.gob.mx | TI | FI | sí | sí |
| 00000000-0000-4000-8000-000000000205 | Jorge Ruiz | jruiz@institucion.gob.mx | PE | CO | sí | sí |
| 00000000-0000-4000-8000-000000000206 | Mtro. Luis Gómez | lgomez@institucion.gob.mx | AD | AD | sí | sí |
| 00000000-0000-4000-8000-000000000207 | Lic. Sergio Ruiz | — | — | — | no |  |
| 00000000-0000-4000-8000-000000000208 | Arq. Pedro Mena | pmena@institucion.gob.mx | TI | SG | sí |  |
| 00000000-0000-4000-8000-000000000209 | Mtra. Laura Ortiz | lortiz@institucion.gob.mx | TI | UT | sí |  |
| 00000000-0000-4000-8000-000000000210 | C.P. Hugo Ramos | hramos@institucion.gob.mx | TI | CI | sí |  |
| 00000000-0000-4000-8000-000000000211 | Lic. Irma Vela | ivela@institucion.gob.mx | PE | VI | sí |  |
| 00000000-0000-4000-8000-000000000212 | Ing. Óscar Paz | opaz@institucion.gob.mx | PE | VI | sí |  |
| 00000000-0000-4000-8000-000000000214 | Lic. Carmen Ruiz | cruiz@institucion.gob.mx | OF | OP | sí |  |
| 00000000-0000-4000-8000-000000000213 | Lic. Pablo Rangel | prangel@institucion.gob.mx | TI | VI | no |  |

### Actores externos

| id | nombre | tipo | activo |
| --- | --- | --- | --- |
| 00000000-0000-4000-8000-000000000601 | Auditoría Superior de la Federación | institucion | sí |
| 00000000-0000-4000-8000-000000000602 | Municipio de Tuxtla · Sec. de Economía | municipio | sí |
| 00000000-0000-4000-8000-000000000603 | Dell México, S.A. de C.V. | proveedor | sí |
| 00000000-0000-4000-8000-000000000604 | Juan Hernández Gómez | ciudadano | sí |
| 00000000-0000-4000-8000-000000000605 | Mobiliario del Sur | proveedor | sí |
| 00000000-0000-4000-8000-000000000606 | Papelería Central | proveedor | no |
| 00000000-0000-4000-8000-000000000607 | Órgano Interno de Control | institucion | sí |
| 00000000-0000-4000-8000-000000000608 | Universidad Tecnológica | institucion | sí |
| 00000000-0000-4000-8000-000000000609 | Gobierno del estado | institucion | sí |
| 00000000-0000-4000-8000-000000000610 | Proveedor externo | proveedor | sí |
| 00000000-0000-4000-8000-000000000611 | Ciudadano | ciudadano | sí |

### Documentos recibidos

Responsable y pendientes se calculan de los movimientos (D-42); aquí van el estado y el último movimiento.

| id | folio | tipo | estado | emisor | número | canal | conf. | pos. dup. | movs. | último movimiento |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 00000000-0000-4000-8000-000000001000 | OP-2026-0087 | oficio | concluido | Sistemas | — | papel |  |  | 2 | turno OP→CO (responsable) |
| 00000000-0000-4000-8000-000000001049 | OP-2026-0097 | oficio | en_tramite | Universidad Tecnológica | — | papel |  |  | 5 | turno FI→DG (responsable) |
| 00000000-0000-4000-8000-000000001078 | OP-2026-0101 | oficio | en_tramite | Ciudadano | — | papel |  | sí | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001082 | OP-2026-0102 | oficio | en_tramite | Proveedor externo | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001080 | OP-2026-0103 | solicitud_transparencia | en_tramite | Ciudadano | — | papel |  | sí | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001086 | OP-2026-0104 | solicitud_material_pago | en_tramite | Recursos Humanos | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001084 | OP-2026-0105 | solicitud_material_pago | en_tramite | Proveedor externo | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001088 | OP-2026-0106 | oficio | en_tramite | Proveedor externo | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001090 | OP-2026-0107 | solicitud_transparencia | en_tramite | Ciudadano | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001092 | OP-2026-0108 | requerimiento_auditoria | en_tramite | Órgano Interno de Control | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001070 | OP-2026-0109 | oficio | en_tramite | Ciudadano | DEN-0045 | papel | sí |  | 2 | turno OP→JU (responsable) |
| 00000000-0000-4000-8000-000000001094 | OP-2026-0110 | oficio | en_tramite | Gobierno del estado | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001096 | OP-2026-0111 | solicitud_material_pago | en_tramite | Proveedor externo | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001098 | OP-2026-0112 | oficio | en_tramite | Ciudadano | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001100 | OP-2026-0113 | solicitud_material_pago | en_tramite | Recursos Humanos | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001102 | OP-2026-0114 | oficio | en_tramite | Dirección General | — | papel |  |  | 4 | turno DG→OP (apoyo) |
| 00000000-0000-4000-8000-000000001109 | OP-2026-0115 | oficio | en_tramite | Dirección General | — | papel |  |  | 4 | turno DG→OP (apoyo) |
| 00000000-0000-4000-8000-000000001116 | OP-2026-0116 | oficio | en_tramite | Dirección General | — | papel |  |  | 4 | turno DG→OP (apoyo) |
| 00000000-0000-4000-8000-000000001123 | OP-2026-0117 | oficio | en_tramite | Dirección General | — | papel |  |  | 4 | turno DG→OP (apoyo) |
| 00000000-0000-4000-8000-000000001044 | OP-2026-0118 | oficio | en_tramite | Recursos Humanos | — | papel |  |  | 3 | devolucion AD→OP (responsable) |
| 00000000-0000-4000-8000-000000001130 | OP-2026-0119 | oficio | en_tramite | Dirección General | — | papel |  |  | 4 | turno DG→OP (apoyo) |
| 00000000-0000-4000-8000-000000001137 | OP-2026-0121 | solicitud_material_pago | en_tramite | Proveedor externo | — | papel |  |  | 2 | turno OP→CO (responsable) |
| 00000000-0000-4000-8000-000000001141 | OP-2026-0123 | solicitud_material_pago | en_tramite | Proveedor externo | — | papel |  |  | 2 | turno OP→CO (responsable) |
| 00000000-0000-4000-8000-000000001145 | OP-2026-0124 | solicitud_material_pago | en_tramite | Proveedor externo | — | papel | sí |  | 2 | turno OP→CO (responsable) |
| 00000000-0000-4000-8000-000000001149 | OP-2026-0126 | solicitud_material_pago | en_tramite | Proveedor externo | — | papel |  |  | 2 | turno OP→CO (responsable) |
| 00000000-0000-4000-8000-000000001153 | OP-2026-0127 | solicitud_material_pago | en_tramite | Sistemas | — | papel |  |  | 2 | turno OP→FI (responsable) |
| 00000000-0000-4000-8000-000000001157 | OP-2026-0128 | solicitud_material_pago | en_tramite | Sistemas | — | papel |  |  | 2 | turno OP→FI (responsable) |
| 00000000-0000-4000-8000-000000001022 | OP-2026-0129 | oficio | en_tramite | Ciudadano | — | papel | sí |  | 3 | devolucion JU→OP (responsable) |
| 00000000-0000-4000-8000-000000001059 | OP-2026-0131 | oficio | en_tramite | Ciudadano | — | papel |  |  | 7 | devolucion FI→OP (responsable) |
| 00000000-0000-4000-8000-000000001038 | OP-2026-0133 | requerimiento_auditoria | en_tramite | Órgano Interno de Control | — | papel |  |  | 3 | turno DG→CO (responsable) |
| 00000000-0000-4000-8000-000000001014 | OP-2026-0137 | oficio | en_tramite | Dirección General | — | papel |  |  | 5 | turno DG→CO (apoyo) |
| 00000000-0000-4000-8000-000000001004 | OP-2026-0139 | solicitud_material_pago | en_tramite | Sistemas | SIS/0231/2026 | papel |  |  | 4 | devolucion CO→OP (responsable) |
| 00000000-0000-4000-8000-000000001074 | OP-2026-0140 | solicitud_transparencia | en_tramite | Ciudadano | SAI-0233 | papel |  |  | 2 | turno OP→UT (responsable) |
| 00000000-0000-4000-8000-000000001012 | OP-2026-0141 | solicitud_transparencia | en_tramite | Ciudadano | — | correo |  | sí | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001010 | OP-2026-0143 | requerimiento_auditoria | en_tramite | Órgano Interno de Control | — | papel |  |  | 1 | registro ·→OP (responsable) |
| 00000000-0000-4000-8000-000000001031 | OP-2026-0148 | oficio | en_tramite | Finanzas | — | papel |  |  | 4 | turno FI→CO (apoyo) |
| 00000000-0000-4000-8000-000000001027 | OP-2026-0152 | solicitud_material_pago | en_tramite | Administración | — | papel |  |  | 2 | turno OP→CO (responsable) |

### Salidas externas

| id | folio | área emisora | destinatario | responde a | acuse |
| --- | --- | --- | --- | --- | --- |
| 00000000-0000-4000-8000-000000000501 | CO-2026-0048 | CO | Sistemas | OP-2026-0139 | Sistemas |
| 00000000-0000-4000-8000-000000000502 | CO-2026-0049 | CO | Administración | OP-2026-0152 | Administración |
| 00000000-0000-4000-8000-000000000503 | CO-2026-0046 | CO | el OIC | OP-2026-0133 | el OIC |
| 00000000-0000-4000-8000-000000000504 | UT-2026-0001 | UT | Ciudadano | OP-2026-0140 |  |
| 00000000-0000-4000-8000-000000000505 | SG-2026-0001 | SG | Mobiliario del Sur | — | Mobiliario del Sur |
| 00000000-0000-4000-8000-000000000506 | CI-2026-0001 | CI | Auditoría Superior de la Federación | — | Auditoría Superior de la Federación |
| 00000000-0000-4000-8000-000000000507 | VI-2026-0001 | VI | Municipio de Tuxtla · Sec. de Economía | — |  |

### Asuntos

| id | nombre | creador | documentos |
| --- | --- | --- | --- |
| 00000000-0000-4000-8000-000000000401 | Equipamiento de laboratorios 2026 | Ing. Raúl Pérez | OP-2026-0087, OP-2026-0139 |
| 00000000-0000-4000-8000-000000000402 | Presupuesto de inversión 2026 | C.P. Elena Díaz | OP-2026-0148, OP-2026-0127 |
| 00000000-0000-4000-8000-000000000403 | Auditoría ASF 2025 · cuenta pública | Ing. Raúl Pérez | OP-2026-0143, OP-2026-0133 |

Totales: 13 áreas, 14 personas, 11 actores, 37 documentos, 88 movimientos, 7 salidas, 3 asuntos.
