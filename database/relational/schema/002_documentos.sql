-- E-2.2: documento, folio, contador de folios, acuse y destinatarios internos (D-101, D-105).

CREATE TABLE documento (
  id_documento            uuid         PRIMARY KEY,
  sentido                 varchar(7)   NOT NULL CHECK (sentido IN ('entrada', 'salida')),
  tipo                    varchar(30)  NOT NULL REFERENCES tipo_documento,
  numero_emisor           varchar(60),
  id_area_emisora         uuid         REFERENCES area,
  id_actor_emisor         uuid         REFERENCES actor_externo,
  id_actor_destinatario   uuid         REFERENCES actor_externo,
  fecha_documento         date,
  sintesis                varchar(500) NOT NULL,
  confidencial            boolean      NOT NULL DEFAULT false,
  estado                  varchar(10)  NOT NULL DEFAULT 'en_tramite'
                          CHECK (estado IN ('en_tramite', 'concluido', 'cancelado', 'sin_efecto')),
  estado_previo           varchar(10)  CHECK (estado_previo IN ('en_tramite', 'concluido')),
  posible_duplicado       boolean      NOT NULL DEFAULT false,
  duplicado_de            uuid         REFERENCES documento,
  motivo_cancelacion      varchar(300),
  extemporaneo            boolean      NOT NULL DEFAULT false,
  canal_inicial           varchar(6)   CHECK (canal_inicial IN ('correo', 'papel')),
  fecha_recepcion_inicial timestamptz,
  canal_segunda           varchar(6)   CHECK (canal_segunda IN ('correo', 'papel')),
  fecha_recepcion_segunda timestamptz,
  fecha_recepcion_oficial date,
  id_responde_a           uuid         REFERENCES documento,
  fecha_registro          timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT documento_duplicado_de_distinto CHECK (duplicado_de <> id_documento),
  CONSTRAINT documento_responde_a_distinto CHECK (id_responde_a <> id_documento),
  CONSTRAINT documento_segunda_distinta CHECK (canal_segunda <> canal_inicial),
  CONSTRAINT documento_segunda_posterior CHECK (fecha_recepcion_segunda >= fecha_recepcion_inicial),
  -- Entrada (RI-06): un solo emisor, interno o externo, y los datos de recepción.
  CONSTRAINT documento_entrada CHECK (
    sentido <> 'entrada' OR (
      (id_area_emisora IS NULL) <> (id_actor_emisor IS NULL)
      AND canal_inicial IS NOT NULL AND fecha_recepcion_inicial IS NOT NULL AND fecha_recepcion_oficial IS NOT NULL
      AND id_actor_destinatario IS NULL AND id_responde_a IS NULL
    )
  ),
  -- Salida: área emisora, actor destinatario y número; sin datos de recepción.
  CONSTRAINT documento_salida CHECK (
    sentido <> 'salida' OR (
      id_area_emisora IS NOT NULL AND id_actor_destinatario IS NOT NULL AND numero_emisor IS NOT NULL
      AND id_actor_emisor IS NULL AND canal_inicial IS NULL AND fecha_recepcion_inicial IS NULL
      AND canal_segunda IS NULL AND fecha_recepcion_segunda IS NULL AND fecha_recepcion_oficial IS NULL
    )
  ),
  CONSTRAINT documento_segunda_completa CHECK ((canal_segunda IS NULL) = (fecha_recepcion_segunda IS NULL)),
  CONSTRAINT documento_estado_previo CHECK ((estado = 'sin_efecto') = (estado_previo IS NOT NULL)),
  CONSTRAINT documento_motivo_cancelacion CHECK (estado <> 'cancelado' OR motivo_cancelacion IS NOT NULL)
);

-- Duplicados (D-27, AR-02)
CREATE UNIQUE INDEX ux_documento_duplicado ON documento
  (numero_emisor, COALESCE(id_area_emisora, id_actor_emisor), (EXTRACT(YEAR FROM fecha_documento)))
  WHERE sentido = 'entrada' AND numero_emisor IS NOT NULL AND fecha_documento IS NOT NULL;

CREATE TABLE folio (
  folio        varchar(30) PRIMARY KEY,
  id_documento uuid        NOT NULL UNIQUE REFERENCES documento,
  id_area      uuid        NOT NULL REFERENCES area,
  anio         smallint    NOT NULL,
  consecutivo  integer     NOT NULL CHECK (consecutivo > 0),
  UNIQUE (id_area, anio, consecutivo)
);

-- D-21, AR-01: se lee con SELECT … FOR UPDATE en la transacción que registra.
CREATE TABLE contador_folio (
  id_area uuid     NOT NULL REFERENCES area,
  anio    smallint NOT NULL,
  ultimo  integer  NOT NULL DEFAULT 0,
  PRIMARY KEY (id_area, anio)
);

CREATE TABLE acuse (
  id_documento   uuid         PRIMARY KEY REFERENCES documento,
  fecha_hora     timestamptz  NOT NULL,
  recibio        varchar(200) NOT NULL,
  id_persona     uuid         NOT NULL REFERENCES persona,
  fecha_registro timestamptz  NOT NULL DEFAULT now()
);

-- D-04; HU-DEST abierto: ninguna operación la llena todavía.
CREATE TABLE documento_destinatario (
  id_documento uuid       NOT NULL REFERENCES documento,
  id_area      uuid       NOT NULL REFERENCES area,
  tipo         varchar(8) NOT NULL CHECK (tipo IN ('dirigido', 'copia')),
  PRIMARY KEY (id_documento, id_area)
);
