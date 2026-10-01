-- Account-owned refinements; preserve all existing academic profile fields.
ALTER TABLE estudiante ADD COLUMN tipo_formacion varchar(30);
CREATE TABLE account_matching_preferences (
    id_cuenta bigint PRIMARY KEY REFERENCES cuenta(id_cuenta) ON DELETE CASCADE,
    preferences jsonb NOT NULL CHECK (jsonb_typeof(preferences) = 'object'),
    taxonomy_version varchar(40) NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
