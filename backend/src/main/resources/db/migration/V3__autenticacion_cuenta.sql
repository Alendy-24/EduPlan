ALTER TABLE cuenta
    ALTER COLUMN correo DROP NOT NULL;

ALTER TABLE cuenta
    ALTER COLUMN contrasena TYPE varchar(255);

ALTER TABLE cuenta
    ADD COLUMN IF NOT EXISTS telefono varchar(30);

ALTER TABLE cuenta
    ADD CONSTRAINT ck_cuenta_correo_o_telefono
    CHECK (
        NULLIF(trim(correo), '') IS NOT NULL
        OR NULLIF(trim(telefono), '') IS NOT NULL
    );

CREATE UNIQUE INDEX IF NOT EXISTS ux_cuenta_correo
    ON cuenta (lower(correo))
    WHERE correo IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_cuenta_telefono
    ON cuenta (telefono)
      WHERE telefono IS NOT NULL;
