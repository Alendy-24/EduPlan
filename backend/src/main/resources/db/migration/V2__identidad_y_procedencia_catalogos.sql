-- Additive migration; never deletes rows or rewrites existing source identities.
ALTER TABLE institucion ADD COLUMN IF NOT EXISTS codigo_fuente varchar(30);
ALTER TABLE institucion ADD COLUMN IF NOT EXISTS caracter_academico varchar(100);
ALTER TABLE institucion ADD COLUMN IF NOT EXISTS telefono varchar(100);
ALTER TABLE institucion ADD COLUMN IF NOT EXISTS estado varchar(100);
ALTER TABLE institucion ALTER COLUMN nombre TYPE text;
CREATE UNIQUE INDEX IF NOT EXISTS ux_institucion_codigo_fuente ON institucion(codigo_fuente);

ALTER TABLE programa_academico ADD COLUMN IF NOT EXISTS codigo_fuente varchar(30);
ALTER TABLE programa_academico ADD COLUMN IF NOT EXISTS clave_fuente varchar(128);
ALTER TABLE programa_academico ALTER COLUMN clave_fuente TYPE varchar(128);
ALTER TABLE programa_academico ALTER COLUMN nombre TYPE text;
ALTER TABLE programa_academico ADD COLUMN IF NOT EXISTS municipio varchar(100);
ALTER TABLE programa_academico ADD COLUMN IF NOT EXISTS departamento varchar(100);
ALTER TABLE programa_academico ADD COLUMN IF NOT EXISTS estado varchar(100);
ALTER TABLE programa_academico ADD COLUMN IF NOT EXISTS nivel_academico varchar(100);
ALTER TABLE programa_academico ADD COLUMN IF NOT EXISTS periodicidad varchar(100);
ALTER TABLE programa_academico ADD COLUMN IF NOT EXISTS nombre_original text;
ALTER TABLE programa_academico ADD COLUMN IF NOT EXISTS titulo_otorgado text;
ALTER TABLE programa_academico ADD COLUMN IF NOT EXISTS area_conocimiento text;
ALTER TABLE programa_academico ADD COLUMN IF NOT EXISTS origen_nombre varchar(30);
ALTER TABLE programa_academico ADD COLUMN IF NOT EXISTS requiere_revision boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS ux_programa_clave_fuente ON programa_academico(clave_fuente);
CREATE INDEX IF NOT EXISTS ix_programa_codigo_fuente ON programa_academico(codigo_fuente);
CREATE INDEX IF NOT EXISTS ix_programa_institucion ON programa_academico(id_institucion);
