-- D-42 con O-25: el rol de un turno es el de su corrección más reciente, si la hay (Apéndice A, regla de pendiente).
-- Mismas columnas que la versión de 005; solo cambia de dónde sale el rol.
CREATE OR REPLACE VIEW pendiente AS
SELECT l.id_documento, l.id_area_destino AS id_area, l.id_movimiento, l.rol, l.fecha_hora, l.id_area_origen
FROM (
  SELECT e.*,
         row_number() OVER (PARTITION BY e.id_documento, e.id_area_destino
                            ORDER BY e.fecha_hora DESC, e.fecha_registro DESC) AS orden
  FROM (
    SELECT m.id_documento, m.id_area_destino, m.id_movimiento, m.fecha_hora, m.fecha_registro, m.id_area_origen,
           coalesce(
             (SELECT c.rol FROM movimiento c
              WHERE c.id_movimiento_corregido = m.id_movimiento
              ORDER BY c.fecha_hora DESC, c.fecha_registro DESC LIMIT 1),
             m.rol
           )::varchar(12) AS rol
    FROM movimiento m
    WHERE m.tipo NOT IN ('conclusion', 'correccion')
  ) e
  WHERE e.rol IN ('responsable', 'apoyo')
) l
JOIN documento d ON d.id_documento = l.id_documento AND d.estado = 'en_tramite'
WHERE l.orden = 1
  AND NOT EXISTS (
    SELECT 1
    FROM movimiento s
    LEFT JOIN movimiento_origen o ON o.id_movimiento = s.id_movimiento
    WHERE s.id_documento = l.id_documento
      AND s.tipo <> 'correccion'
      AND s.fecha_hora > l.fecha_hora
      AND (s.id_area_origen = l.id_area_destino OR o.id_area = l.id_area_destino)
  );
