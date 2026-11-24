-- La vista `pendiente` (006) busca la corrección más reciente de cada turno (O-25). Sin este índice esa subconsulta
-- recorre toda la bitácora por cada movimiento: con 4 semanas de temporada alta la bandeja tardaba 700 ms (T-09).
CREATE INDEX ix_movimiento_corregido ON movimiento (id_movimiento_corregido, fecha_hora DESC)
  WHERE id_movimiento_corregido IS NOT NULL;
