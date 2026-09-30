package com.eduplan.account;

import java.time.Instant;
import java.util.List;

public record InterestsResponse(List<String> areas, List<String> motivations, Instant updatedAt) {}
