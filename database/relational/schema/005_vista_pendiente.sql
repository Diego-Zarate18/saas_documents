-- D-42, D-67, D-68 (AR-06): un documento en trámite está pendiente en un área si el último movimiento que le llegó
-- como responsable o apoyo no tiene después una salida desde ella (como origen o como otro origen de una
-- atracción). Conocimiento nunca queda pendiente. Es cálculo sobre la bitácora, no una tabla de estado.
CREATE VIEW pendiente AS
SELECT l.id_documento, l.id_area_destino AS id_area, l.id_movimiento, l.rol, l.fecha_hora, l.id_area_origen
FROM (
  SELECT m.*,
         row_number() OVER (PARTITION BY m.id_documento, m.id_area_destino
                            ORDER BY m.fecha_hora DESC, m.fecha_registro DESC) AS orden
  FROM movimiento m
  WHERE m.rol IN ('responsable', 'apoyo') AND m.tipo NOT IN ('conclusion', 'correccion')
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
