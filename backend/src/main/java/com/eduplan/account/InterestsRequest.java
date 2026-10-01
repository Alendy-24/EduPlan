package com.eduplan.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record InterestsRequest(
        @NotNull @Size(max = 7) List<@NotBlank @Size(max = 100) String> areas,
        @NotNull @Size(max = 6) List<@NotBlank @Size(max = 100) String> motivations
) {}
