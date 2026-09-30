package com.eduplan.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;

public record SavedOptionRequest(
        @NotBlank @Size(max = 30) String type,
        @NotBlank @Size(max = 500) String name,
        @NotBlank @Size(max = 1000) String href,
        Map<String, Object> snapshot
) {}
