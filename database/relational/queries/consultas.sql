-- Consultas representativas sobre la semilla (PostgreSQL). Uso, desde la raíz:
--   docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < database/relational/queries/consultas.sql
-- Ids de la semilla: Oficialía de partes = …101, Compras = …103.

-- 1. Bandeja de Oficialía de partes (D-42, AR-06): el área recibió el documento como responsable o apoyo y después
--    no salió de ella (ningún movimiento con esa área como origen) ni se concluyó o canceló.
WITH llegadas AS (
  SELECT m.id_documento, m.id_area_destino AS id_area, m.rol, m.fecha_hora,
         row_number() OVER (PARTITION BY m.id_documento, m.id_area_destino ORDER BY m.fecha_hora DESC) AS orden
  FROM movimiento m
  WHERE m.rol IN ('responsable', 'apoyo') AND m.tipo <> 'conclusion'
)
SELECT f.folio, d.sintesis, l.rol, l.fecha_hora AS llego, current_date - l.fecha_hora::date AS dias
FROM llegadas l
JOIN documento d ON d.id_documento = l.id_documento
JOIN folio f ON f.id_documento = d.id_documento
WHERE l.orden = 1
  AND l.id_area = '00000000-0000-4000-8000-000000000101'
  AND d.estado = 'en_tramite'
  AND NOT EXISTS (
    SELECT 1 FROM movimiento s
    LEFT JOIN movimiento_origen o ON o.id_movimiento = s.id_movimiento
    WHERE s.id_documento = l.id_documento AND s.fecha_hora > l.fecha_hora
      AND (s.id_area_origen = l.id_area OR o.id_area = l.id_area)
  )
ORDER BY l.fecha_hora;

-- 2. Bitácora de un documento por folio (O-11): cada movimiento con sus áreas y quién lo hizo.
SELECT m.fecha_hora, m.tipo, ao.siglas AS desde, ad.siglas AS hacia, m.rol, m.motivo, p.nombre AS realizo
FROM folio f
JOIN movimiento m ON m.id_documento = f.id_documento
LEFT JOIN area ao ON ao.id_area = m.id_area_origen
JOIN area ad ON ad.id_area = m.id_area_destino
JOIN persona p ON p.id_persona = m.id_persona
WHERE f.folio = 'OP-2026-0139'
ORDER BY m.fecha_hora, ad.siglas;

-- 3. Documentos con devoluciones (base de C3 Rebotes, D-32): cuántas y desde cuántas áreas distintas.
SELECT f.folio, count(*) AS devoluciones, count(DISTINCT m.id_area_origen) AS areas,
       bool_or(m.motivo = 'no_competencia') AS no_competencia
FROM movimiento m JOIN folio f ON f.id_documento = m.id_documento
WHERE m.tipo = 'devolucion'
GROUP BY f.folio
ORDER BY devoluciones DESC, f.folio;

-- 4. Salidas externas con su acuse (O-20, O-21).
SELECT f.folio, ae.siglas AS emisora, ax.nombre AS destinatario, fr.folio AS responde_a, a.fecha_hora AS acuse, a.recibio
FROM documento d
JOIN folio f ON f.id_documento = d.id_documento
JOIN area ae ON ae.id_area = d.id_area_emisora
JOIN actor_externo ax ON ax.id_actor = d.id_actor_destinatario
LEFT JOIN folio fr ON fr.id_documento = d.id_responde_a
LEFT JOIN acuse a ON a.id_documento = d.id_documento
WHERE d.sentido = 'salida'
ORDER BY f.folio;
