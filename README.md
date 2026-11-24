# SIGEDOC

Sistema de Seguimiento de Documentos entre Departamentos. Proyecto final de bases de datos: PostgreSQL, MongoDB y Neo4j integradas en una aplicación web.

- Contexto, decisiones y alcance: [`docs/grafo-conocimiento/`](docs/grafo-conocimiento/README.md) (abre `grafo.html` en el navegador).
- Arquitectura: [`docs/arquitectura.md`](docs/arquitectura.md).
- Operaciones y patrones de acceso: [`docs/operaciones/`](docs/operaciones/).
- Método de trabajo con Claude Code: [`ai/handoff/README.md`](ai/handoff/README.md).

Las instrucciones se agregan con cada tarea: la interfaz en T-01 y las bases y el backend en T-03.

## Interfaz (modo simulado)

La interfaz vive en [`frontend/`](frontend/) (React, Vite y TypeScript). Hasta T-15 no se conecta a la API: lee datos simulados de `frontend/src/api/simulado/` que siguen el contrato de la API (D-63). Los datos viven en la memoria de la pestaña; al recargar la página vuelven a su estado inicial.

### Requisitos

- Windows 10 u 11.
- [Node.js 24 LTS](https://nodejs.org/) (incluye npm). Comprueba la versión en PowerShell con `node --version`; debe ser 24 o mayor.

### Instalación y ejecución (PowerShell)

```powershell
cd frontend
npm ci
npm run dev
```

Abre <http://localhost:5173> y entra con cualquiera de los usuarios de prueba. En modo simulado cualquier contraseña no vacía es válida; el campo de correo los sugiere al escribir.

| Rol | Usuario | Correo | Área |
| --- | --- | --- | --- |
| Oficialía de partes | Marta Flores | `mflores@institucion.gob.mx` | Oficialía de partes |
| Dirección | Lic. Ana López | `alopez@institucion.gob.mx` | Dirección General |
| Titular de área | Ing. Raúl Pérez | `rperez@institucion.gob.mx` | Compras |
| Titular de área | C.P. Elena Díaz | `ediaz@institucion.gob.mx` | Finanzas |
| Personal del área | Jorge Ruiz | `jruiz@institucion.gob.mx` | Compras |
| Administrador | Mtro. Luis Gómez | `lgomez@institucion.gob.mx` | Administración |

### Otros comandos

| Comando | Qué hace |
| --- | --- |
| `npm run lint` | oxlint con las reglas de React, hooks y accesibilidad (jsx-a11y); falla ante cualquier aviso |
| `npm run typecheck` | Revisión de tipos con TypeScript estricto |
| `npm test` | Pruebas con Vitest y Testing Library |
| `npm run build` | Compila a `frontend/dist/` |
| `npm run preview` | Sirve la versión compilada en <http://localhost:4173> |

`VITE_API_MODO` elige la fuente de datos (ver `frontend/.env.example`); por ahora solo existe `simulado`, que es el valor por omisión.

`VITE_API_LATENCIA_MS` fija la latencia de la fuente simulada en milisegundos (450 por omisión) para que se vean los esqueletos de carga; en las pruebas siempre es 0. Para cambiarla, crea `frontend/.env.local` con, por ejemplo, `VITE_API_LATENCIA_MS=1500` y reinicia `npm run dev`.
