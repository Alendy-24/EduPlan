package com.eduplan.integration;

import com.eduplan.integration.dto.FullSyncReport;

public class SyncFailedException extends RuntimeException {
    private final FullSyncReport progress;
    public SyncFailedException(String message, Throwable cause, FullSyncReport progress) {
        super(message, cause);
        this.progress = progress;
    }
    public FullSyncReport getProgress() { return progress; }
}

