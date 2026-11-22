---
name: implementar-operacion
description: Lista de verificación para implementar una operación O-xx de SIGEDOC de punta a punta (repositorio, servicio, router, outbox y pruebas). Úsala cada vez que una tarea pida implementar o modificar una operación del catálogo.
---

# Implementar una operación

## 1. Entender

- `uv run python .claude/skills/consultar-grafo/scripts/grafo.py --operacion O-xx`: qué recibe, qué devuelve, reglas, roles, bases, patrones y decisiones.
- Consulta también cada RI-xx y D-xx que aparezca en sus reglas.
- Ubica su endpoint en `docs/arquitectura.md`, sección 4, y su flujo en la sección 3 (3.1 a 3.5 según la fuente de verdad del dato).

## 2. Implementar, de abajo hacia arriba

1. **Repositorio**: una función por patrón (`"""AR-xx. …"""`). Parametrizada. Si lee documentos, recibe `ctx: ContextoUsuario` sin valor por defecto.
2. **Servicio**: una función `"""O-xx. …"""`. Verifica rol y visibilidad, aplica cada regla del catálogo, abre la unidad de trabajo si escribe en PostgreSQL y encola el outbox en la misma transacción si el dato se replica.
3. **Modelos**: entrada y salida en `dominio/` con Pydantic. Si el contenido va a MongoDB, valida contra el modelo por tipo.
4. **Router**: valida, llama al servicio y traduce errores de dominio al código de error de la arquitectura (sección 4). Sin lógica.

## 3. Probar

Como mínimo:

- [ ] Caso normal.
- [ ] Caso límite (el borde de una regla: último folio del año, grupo de turno con un solo responsable, recorrido de 6 saltos…).
- [ ] Caso de error por cada regla que pueda rechazar la operación.
- [ ] Rol no autorizado → `SIN_PERMISO`.
- [ ] Si lee documentos: usuario sin visibilidad no ve el contenido.
- [ ] Si escribe en el outbox: el registro queda en la misma transacción (si la transacción falla, no hay registro).

## 4. Verificar antes de reportar

- [ ] `uv run ruff check` y `uv run ruff format --check` sin errores.
- [ ] `uv run pytest` en verde.
- [ ] El endpoint aparece en `/docs` (OpenAPI) con sus modelos.
- [ ] Ninguna capa importa una capa superior y solo los repositorios importan drivers.
- [ ] En el reporte, una línea por regla del catálogo diciendo dónde se cumple (archivo y función) y qué prueba la cubre.
