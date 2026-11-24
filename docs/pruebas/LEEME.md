# Pruebas y evidencia (E-8 y evidencia de E-5)

- `evidencia.md`: resultados medidos de los tipos de prueba de la guía (sección 9): conectividad, funcional, integridad, integración, consistencia, errores, rendimiento y la comparación del recorrido en grafo y en SQL. Lo genera `uv run python -m herramientas.medir` (desde `backend/`) contra el despliegue; cada número sale de esa ejecución.
- Las pruebas automatizadas viven en `tests/` (backend) y `frontend/src/**/*.test.ts*` (interfaz); las consultas de validación de cada base, en `database/*/queries/`.
