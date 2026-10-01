package com.eduplan.account;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Explicit exploration preferences, not a psychological or aptitude assessment. */
public record MatchingPreferences(
    @NotNull @Size(max=8) List<@NotNull @Size(max=150) String> specificNbcs,
    @NotNull @Size(max=8) List<@NotNull @Size(max=80) String> activities,
    @NotNull @Size(max=5) List<@NotNull @Size(max=80) String> contexts,
    @NotNull @Size(max=8) List<@NotNull @Size(max=150) String> excludedNbcs,
    @NotNull @Size(max=20) String locationImportance,
    @NotNull @Size(max=20) String modalityImportance,
    @NotNull @Size(max=20) String duration,
    @NotNull @Size(max=20) String sector,
    boolean exclusionsReviewed) {
    public static MatchingPreferences empty() { return new MatchingPreferences(List.of(),List.of(),List.of(),List.of(),"","","","",false); }
}
