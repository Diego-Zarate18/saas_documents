-- E-2.2: versiones de esquema, catálogos (O-31), estructura organizacional, usuarios, sesiones y actores externos.

CREATE TABLE IF NOT EXISTS esquema_version (
  base        varchar(8)  NOT NULL CHECK (base IN ('postgres', 'mongodb', 'neo4j')),
  version     integer     NOT NULL,
  nombre      text        NOT NULL,
  aplicado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (base, version)
);

-- Catálogos administrables (D-65, D-32, D-59)
CREATE TABLE tipo_documento (
  clave  varchar(30)  PRIMARY KEY,
  nombre varchar(100) NOT NULL,
  activo boolean      NOT NULL DEFAULT true
);

CREATE TABLE motivo_devolucion (
  clave  varchar(30)  PRIMARY KEY,
  nombre varchar(100) NOT NULL,
  activo boolean      NOT NULL DEFAULT true
);

CREATE TABLE forma_conclusion (
  clave  varchar(30)  PRIMARY KEY,
  nombre varchar(100) NOT NULL,
  activo boolean      NOT NULL DEFAULT true
);

INSERT INTO tipo_documento (clave, nombre) VALUES
  ('oficio', 'Oficio'),
  ('solicitud_material_pago', 'Solicitud de material o pago'),
  ('requerimiento_auditoria', 'Requerimiento de auditoría'),
  ('solicitud_transparencia', 'Solicitud de transparencia'),
  ('memorandum', 'Memorándum'),
  ('circular', 'Circular'),
  ('informe', 'Informe');

INSERT INTO motivo_devolucion (clave, nombre) VALUES
  ('falta_informacion', 'Falta información'),
  ('falta_firma', 'Falta firma'),
  ('falta_anexo', 'Falta anexo'),
  ('corregir_dato', 'Corregir un dato'),
  ('no_competencia', 'No es de su competencia');

INSERT INTO forma_conclusion (clave, nombre) VALUES
  ('con_respuesta', 'Con respuesta'),
  ('atencion_sin_oficio', 'Atención sin oficio'),
  ('enterado', 'Enterado'),
  ('no_procede', 'No procede'),
  ('duplicado', 'Duplicado');

-- Estructura organizacional (D-08, D-47)
CREATE TABLE area (
  id_area       uuid         PRIMARY KEY,
  siglas        varchar(10)  NOT NULL UNIQUE,
  nombre        varchar(200) NOT NULL,
  id_area_padre uuid         REFERENCES area DEFERRABLE INITIALLY DEFERRED,
  id_titular    uuid         UNIQUE,
  activa        boolean      NOT NULL DEFAULT true,
  CHECK (id_area_padre IS NULL OR id_area_padre <> id_area)
);

CREATE TABLE persona (
  id_persona uuid         PRIMARY KEY,
  nombre     varchar(200) NOT NULL,
  correo     varchar(150),
  id_area    uuid         REFERENCES area,
  activa     boolean      NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX ux_persona_correo ON persona (lower(correo));

-- area y persona se referencian entre sí: el titular se valida al confirmar la transacción.
ALTER TABLE area ADD CONSTRAINT area_id_titular_fkey
  FOREIGN KEY (id_titular) REFERENCES persona DEFERRABLE INITIALLY DEFERRED;

-- Usuarios y sesiones (D-44, D-49, D-105)
CREATE TABLE usuario (
  id_persona        uuid     PRIMARY KEY REFERENCES persona,
  rol               char(2)  NOT NULL CHECK (rol IN ('OF', 'DI', 'TI', 'PE', 'AD')),
  hash_contrasena   text     NOT NULL,
  intentos_fallidos smallint NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
  bloqueado_hasta   timestamptz
);

CREATE TABLE sesion (
  huella           bytea       PRIMARY KEY CHECK (octet_length(huella) = 32),
  id_persona       uuid        NOT NULL REFERENCES usuario,
  creada_en        timestamptz NOT NULL DEFAULT now(),
  ultima_actividad timestamptz NOT NULL DEFAULT now(),
  revocada_en      timestamptz
);
CREATE INDEX ix_sesion_persona ON sesion (id_persona);

-- Actores externos (O-35)
CREATE TABLE actor_externo (
  id_actor uuid         PRIMARY KEY,
  nombre   varchar(200) NOT NULL,
  tipo     varchar(11)  NOT NULL CHECK (tipo IN ('institucion', 'municipio', 'proveedor', 'ciudadano')),
  correo   varchar(150),
  telefono varchar(30),
  activo   boolean      NOT NULL DEFAULT true
);
