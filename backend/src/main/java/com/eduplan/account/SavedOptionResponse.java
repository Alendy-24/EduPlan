package com.eduplan.account;

import java.time.Instant;
import java.util.Map;

public record SavedOptionResponse(String id, String type, String name, String href,
                                  Map<String, String> snapshot, Instant savedAt, Instant updatedAt) {}
