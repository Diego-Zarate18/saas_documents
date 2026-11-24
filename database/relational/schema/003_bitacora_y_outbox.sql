-- E-2.2: bitácora de movimientos (D-102, AR-03), orígenes de una atracción (D-68) y outbox (D-13, D-48).

CREATE TABLE movimiento (
  id_movimiento           uuid         PRIMARY KEY,
  id_documento            uuid         NOT NULL REFERENCES documento,
  tipo                    varchar(11)  NOT NULL
                          CHECK (tipo IN ('registro', 'turno', 'devolucion', 'atraccion', 'conclusion', 'correccion')),
  fecha_hora              timestamptz  NOT NULL DEFAULT now(),
  id_grupo_turno          uuid,
  id_area_origen          uuid         REFERENCES area,
  id_area_destino         uuid         NOT NULL REFERENCES area,
  rol                     varchar(12)  NOT NULL CHECK (rol IN ('responsable', 'apoyo', 'conocimiento')),
  instruccion             varchar(500),
  motivo                  varchar(30)  REFERENCES motivo_devolucion,
  id_area_sugerida        uuid         REFERENCES area,
  forma_conclusion        varchar(30)  REFERENCES forma_conclusion,
  id_persona              uuid         NOT NULL REFERENCES persona,
  id_titular_al_turnar    uuid         REFERENCES persona,
  id_movimiento_corregido uuid         REFERENCES movimiento,
  fecha_registro          timestamptz  NOT NULL DEFAULT now(),

  -- Restricciones por tipo (RI-11, D-69)
  CONSTRAINT movimiento_origen_registro CHECK ((tipo = 'registro') = (id_area_origen IS NULL)),
  CONSTRAINT movimiento_motivo_devolucion CHECK ((tipo = 'devolucion') = (motivo IS NOT NULL)),
  CONSTRAINT movimiento_area_sugerida CHECK (id_area_sugerida IS NULL OR motivo = 'no_competencia'),
  CONSTRAINT movimiento_forma_conclusion CHECK ((tipo = 'conclusion') = (forma_conclusion IS NOT NULL)),
  CONSTRAINT movimiento_correccion CHECK ((tipo = 'correccion') = (id_movimiento_corregido IS NOT NULL)),
  CONSTRAINT movimiento_grupo_turno CHECK (tipo NOT IN ('turno', 'correccion') OR id_grupo_turno IS NOT NULL)
);

-- RI-10: a lo más un responsable por grupo de turno.
CREATE UNIQUE INDEX ux_responsable_por_grupo ON movimiento (id_grupo_turno)
  WHERE tipo = 'turno' AND rol = 'responsable';
-- Bandeja (AR-06, D-42) y ficha/outbox.
CREATE INDEX ix_movimiento_bandeja ON movimiento (id_documento, id_area_destino, fecha_hora);
CREATE INDEX ix_movimiento_documento ON movimiento (id_documento, fecha_hora);

CREATE TABLE movimiento_origen (
  id_movimiento uuid NOT NULL REFERENCES movimiento,
  id_area       uuid NOT NULL REFERENCES area,
  PRIMARY KEY (id_movimiento, id_area)
);

CREATE TABLE outbox (
  id              bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  destino         varchar(7)  NOT NULL CHECK (destino IN ('neo4j', 'mongodb')),
  tipo_evento     varchar(40) NOT NULL,
  id_entidad      uuid        NOT NULL,
  datos           jsonb       NOT NULL,
  estado          varchar(9)  NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'error')),
  intentos        smallint    NOT NULL DEFAULT 0,
  proximo_intento timestamptz NOT NULL DEFAULT now(),
  ultimo_error    text,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  enviado_en      timestamptz
);
CREATE INDEX ix_outbox_pendiente ON outbox (id) WHERE estado = 'pendiente';
