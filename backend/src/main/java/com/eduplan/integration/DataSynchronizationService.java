package com.eduplan.integration;

import com.eduplan.integration.dto.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.function.BiFunction;
import java.util.function.Function;

@Service
public class DataSynchronizationService {
    private final DataIntegrationClient client;
    private final DataPagePersistenceService persistence;
    private final SyncLock lock;
    private final int pageSize;
    private final int maxPages;

    public DataSynchronizationService(DataIntegrationClient client, DataPagePersistenceService persistence,
            SyncLock lock, @Value("${eduplan.data-integration.page-size:100}") int pageSize,
            @Value("${eduplan.data-integration.max-pages:5000}") int maxPages) {
        if (pageSize < 1 || pageSize > 100 || maxPages < 1 || maxPages > 100000) {
            throw new IllegalArgumentException("Configuración de paginación fuera de rango");
        }
        this.client = client;
        this.persistence = persistence;
        this.lock = lock;
        this.pageSize = pageSize;
        this.maxPages = maxPages;
    }

    public FullSyncReport synchronizeAll() {
        return lock.execute(() -> {
            SyncReport institutions = synchronize("institutions", client::getInstitutions, persistence::saveInstitutions);
            try {
                SyncReport programs = synchronize("programs", client::getPrograms, persistence::savePrograms);
                return new FullSyncReport(institutions, programs);
            } catch (SyncFailedException failure) {
                throw new SyncFailedException(failure.getMessage(), failure.getCause(),
                        new FullSyncReport(institutions, failure.getProgress().programs()));
            }
        });
    }

    public SyncReport synchronizeInstitutions() {
        return lock.execute(() -> synchronize("institutions", client::getInstitutions, persistence::saveInstitutions));
    }

    public SyncReport synchronizePrograms() {
        return lock.execute(() -> synchronize("programs", client::getPrograms, persistence::savePrograms));
    }

    private <T> SyncReport synchronize(String dataset, BiFunction<Integer, Integer, IntegrationPage<T>> fetch,
            Function<List<T>, SyncReport> save) {
        SyncReport total = SyncReport.empty(dataset);
        try {
            // Check once per run, not once per page as the catalog grows.
            if (dataset.equals("programs")) persistence.assertCompatibleSourceIdentities();
            for (int pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
                IntegrationPage<T> page = fetch.apply(pageNumber, pageSize);
                if (page.page() != pageNumber || page.limit() != pageSize
                        || page.returned() != page.data().size() || page.data().size() > pageSize) {
                    throw new DataIntegrationException("La API devolvió metadatos de paginación inconsistentes");
                }
                if (page.data().isEmpty()) return total;
                // Separate proxied bean: commit completes before progress is counted.
                total = total.plus(save.apply(page.data()));
                if (page.data().size() < pageSize) return total;
            }
            throw new DataIntegrationException("Se alcanzó max-pages; revise el catálogo antes de ampliar el límite");
        } catch (RuntimeException failure) {
            FullSyncReport progress = new FullSyncReport(
                    dataset.equals("institutions") ? total : SyncReport.empty("institutions"),
                    dataset.equals("programs") ? total : SyncReport.empty("programs"));
            throw new SyncFailedException("Falló " + dataset + " en la página " + (total.pages() + 1)
                    + ". Las páginas previas permanecen guardadas; se puede reintentar.", failure, progress);
        }
    }
}
