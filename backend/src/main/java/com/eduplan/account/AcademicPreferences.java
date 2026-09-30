package com.eduplan.account;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Preferences only: municipio/departamento describe the student's preferred location. */
public record AcademicPreferences(
        @NotNull @Size(max = 30) String academicLevel,
        @NotNull @Size(max = 100) String modality,
        @NotNull @Size(max = 100) String municipality,
        @NotNull @Size(max = 100) String department,
        @NotNull @Size(max = 30) String mobility) {
    public static AcademicPreferences empty() { return new AcademicPreferences("", "", "", "", ""); }
}
