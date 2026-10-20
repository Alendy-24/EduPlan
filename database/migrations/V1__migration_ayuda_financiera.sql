ALTER TABLE ayuda_financiera DROP CONSTRAINT ck_ayuda_tipos_apoyo;
ALTER TABLE ayuda_financiera ADD CONSTRAINT ck_ayuda_tipos_apoyo
  CHECK (tipos_apoyo <@ ARRAY['beca','credito_condonable','descuento','sostenimiento','programa','credito']::text[]);
