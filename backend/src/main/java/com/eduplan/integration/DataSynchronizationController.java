package com.eduplan.integration;

import com.eduplan.integration.dto.FullSyncReport;
import com.eduplan.integration.dto.SyncReport;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/data-sync")
public class DataSynchronizationController {
    private final DataSynchronizationService synchronizationService;

    public DataSynchronizationController(DataSynchronizationService synchronizationService) {
        this.synchronizationService = synchronizationService;
    }

    @PostMapping
    public ResponseEntity<FullSyncReport> synchronizeAll() {
        return ResponseEntity.ok(synchronizationService.synchronizeAll());
    }

    @PostMapping("/institutions")
    public ResponseEntity<SyncReport> synchronizeInstitutions() {
        return ResponseEntity.ok(synchronizationService.synchronizeInstitutions());
    }

    @PostMapping("/programs")
    public ResponseEntity<SyncReport> synchronizePrograms() {
        return ResponseEntity.ok(synchronizationService.synchronizePrograms());
    }
}
