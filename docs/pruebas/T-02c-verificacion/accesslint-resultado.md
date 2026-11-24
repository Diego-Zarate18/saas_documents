# accesslint en V-16 y V-17 (criterio 8 de T-02c)

Fecha: 2026-11-24. Herramienta: `audit_live` del plugin accesslint (motor @accesslint/core sobre el DOM vivo), con el Chrome sin interfaz del puerto 9222 a 1440 × 960.

Preparación: `node preparar-auditoria.mjs` deja dos pestañas con sesión de Mtro. Luis Gómez (AD), en `/organizacion` y en `/areas`. accesslint reutiliza la pestaña que tiene la URL auditada. Para comprobar que no auditó la pantalla de inicio de sesión, cada auditoría esperó un texto que solo existe con sesión: «Dirección General» en V-16 y «Contraloría interna» en V-17.

| Vista | URL | Resultado |
| --- | --- | --- |
| V-16 Organización | http://localhost:5174/organizacion | No accessibility violations found. |
| V-17 Áreas | http://localhost:5174/areas | No accessibility violations found. |

Sin hallazgos críticos, graves, moderados ni menores.
