-- Reuse estudiante and its unique account relationship; preserve existing data.
ALTER TABLE estudiante ADD COLUMN nivel_buscado varchar(30);
ALTER TABLE estudiante ADD COLUMN movilidad varchar(30);
