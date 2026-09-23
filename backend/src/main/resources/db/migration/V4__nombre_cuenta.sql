ALTER TABLE cuenta
    ADD COLUMN IF NOT EXISTS nombre varchar(120);

UPDATE cuenta
SET nombre = 'Usuario'
WHERE nombre IS NULL OR trim(nombre) = '';

ALTER TABLE cuenta
    ALTER COLUMN nombre SET NOT NULL;
