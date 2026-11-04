-- Optional account preferences only. No eligibility documents, residence or academic data are copied here.
CREATE TABLE account_financing_preferences (
    id_cuenta bigint PRIMARY KEY REFERENCES cuenta(id_cuenta) ON DELETE CASCADE,
    student_stage varchar(20) NOT NULL DEFAULT '' CHECK (student_stage IN ('','entry','enrolled')),
    support varchar(20) NOT NULL DEFAULT '' CHECK (support IN ('','tuition','living','mobility')),
    repayment varchar(20) NOT NULL DEFAULT '' CHECK (repayment IN ('','no','accepted')),
    international varchar(20) NOT NULL DEFAULT '' CHECK (international IN ('','yes','no')),
    admission varchar(20) NOT NULL DEFAULT '' CHECK (admission IN ('','yes','no')),
    nationality varchar(20) NOT NULL DEFAULT '' CHECK (nationality IN ('','Colombianos','Extranjeros')),
    updated_at timestamptz NOT NULL DEFAULT now()
);
