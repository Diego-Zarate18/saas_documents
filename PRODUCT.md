# Product

<!-- impeccable:product-schema 1 -->

<!-- Redactado en T-01 a partir del grafo de conocimiento (docs/grafo-conocimiento/), docs/arquitectura.md y el Figma «SIGEDOC». El grafo manda sobre este archivo; si cambia, este se actualiza. -->

## Platform

web

## Users

Personal de una sola organización pública (D-01) que mueve documentos oficiales entre departamentos. Cinco roles (D-44):

- **Oficialía de partes (OF):** registra entradas y salidas, turna, cancela, corrige y resuelve posibles duplicados. Ve el recorrido de todo, sin el contenido de lo confidencial ajeno.
- **Dirección (DI):** turna y consulta el recorrido de todo; consulta asuntos sin modificarlos (D-62).
- **Titular de área (TI):** atiende lo que llega a su área, turna de forma directa lo que tiene pendiente, devuelve, returna, atrae y concluye. Ve lo suyo completo.
- **Personal del área (PE):** atiende y concluye solo cuando su área es la responsable; agrega notas y anexos.
- **Administrador (AD):** gestiona áreas, personas, usuarios y actores externos.

Trabajan en escritorio, en jornada de oficina, con la bandeja abierta como pantalla principal.

## Product Purpose

Resolver «no se sabe dónde está un documento ni quién debe atenderlo» (P-01). SIGEDOC registra cada documento con su folio, lo turna a una o varias áreas con un rol claro (responsable, apoyo o conocimiento), guarda cada movimiento en una bitácora que no se edita ni se borra, y muestra en todo momento la ubicación actual, el recorrido completo y lo pendiente de cada área.

Éxito: cualquiera con permiso responde en segundos dónde está un documento, quién lo tiene como responsable y desde cuándo.

## Positioning

El documento es el protagonista (D-02) y cada movimiento es un hecho registrado, no un estado que se sobrescribe. El recorrido, las devoluciones y los rebotes se reconstruyen de la bitácora; por eso la interfaz puede mostrar con precisión de dónde vino y por qué regresó un documento.

Es también un proyecto final de bases de datos: integra PostgreSQL (registro oficial), MongoDB (expedientes) y Neo4j (recorridos, referencias y asuntos), y la ficha del documento muestra de qué base viene cada sección.

## Operating Context

- Flujo central: registro en oficialía → turno a áreas → atención, devolución o returno → conclusión con una forma del catálogo cerrado (D-59).
- Folios con siglas de área y año (por ejemplo `OP-2026-0139`); se leen y se dictan, por eso van en tipografía monoespaciada.
- Documentos en papel con anexos físicos; el expediente registra hojas y ubicación (gaveta, archivo).
- Visibilidad por rol y área aplicada en el servicio (D-29): de otras áreas solo estado y responsable; lo confidencial solo lo ven el titular y quien tiene movimiento.
- Fechas en `America/Mexico_City`, formato `es-MX`.

## Capabilities and Constraints

- Aplicación web de una sola página que solo consume la API; nunca se conecta a las bases (D-36, D-38).
- Interfaz primero con datos simulados hasta T-15 (D-63); la sesión y el rol también se simulan.
- Sin plazos ni vencimientos: RF-09 se retiró (D-06). Sin notificaciones ni actividad reciente: lo que no tiene operación no se dibuja.
- Rebote es una detección de C3, no un estado del documento.
- Escritorio primero: diseño a 1440 px, garantizado de 1280 a 1920 px y legible a 1024 px. Móvil y modo oscuro fuera de alcance.
- Textos de la interfaz en español con acentos; nombres de código en español sin acentos ni ñ.

## Brand Commitments

- Identidad «Señal Guinda» aprobada en el Figma «SIGEDOC» (archivo `9yljMLMqWHlIHQqRCsXEjV`, página «01 · Identidad»). El Figma es el brief aprobado: se refina, no se rediseña (D-64).
- Logotipo: isotipo de doble chevrón que avanza («el documento se turna de un departamento al siguiente») y la palabra SIGEDOC.
- Tono sobrio de administración pública: textos directos, sin exclamaciones ni lenguaje de marketing.

## Evidence on Hand

- Maquetado de las vistas V-01 a V-19 y sus variantes en el Figma, página «03 · Vistas», con notas por vista que citan operaciones y decisiones.
- Usuarios, áreas y folios de prueba del Figma (Marta Flores, Lic. Ana López, Ing. Raúl Pérez, C.P. Elena Díaz, Jorge Ruiz, Mtro. Luis Gómez). Son datos ficticios de demostración.
- No hay usuarios reales, métricas de uso ni testimonios; no se inventan.

## Product Principles

1. **El documento primero.** Cada pantalla responde dónde está, quién lo atiende y qué sigue.
2. **Lo registrado no se reescribe.** Correcciones y devoluciones se muestran como movimientos nuevos, nunca como ediciones.
3. **Cada rol ve lo suyo.** La interfaz muestra solo las acciones que el rol puede ejecutar y nunca filtra contenido confidencial.
4. **Sin pantallas sin operación.** Toda vista y acción se respalda en una operación del catálogo o una consulta C1–C5.

## Accessibility & Inclusion

WCAG 2.2 AA: contraste, foco visible, navegación completa por teclado y roles ARIA correctos. Los modales atrapan el foco, cierran con Esc y devuelven el foco al control que los abrió.
