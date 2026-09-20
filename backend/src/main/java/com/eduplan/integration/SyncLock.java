package com.eduplan.integration;

import org.springframework.stereotype.Component;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.function.Supplier;

/** Session-scoped PostgreSQL lock: serializes syncs even across backend instances.
 * No transaction is held while waiting on HTTP. One pooled connection is reserved.
 */
@Component
public class SyncLock {
    private static final long LOCK_ID = 74190261031L;
    private final DataSource dataSource;

    public SyncLock(DataSource dataSource) { this.dataSource = dataSource; }

    public <T> T execute(Supplier<T> action) {
        try (Connection connection = dataSource.getConnection()) {
            try (var query = connection.prepareStatement("select pg_try_advisory_lock(?)")) {
                query.setLong(1, LOCK_ID);
                query.setQueryTimeout(5);
                try (var result = query.executeQuery()) {
                    result.next();
                    if (!result.getBoolean(1)) throw new SyncBusyException();
                }
            }
            try {
                return action.get();
            } finally {
                try (var query = connection.prepareStatement("select pg_advisory_unlock(?)")) {
                    query.setLong(1, LOCK_ID);
                    query.setQueryTimeout(5);
                    query.execute();
                } catch (SQLException releaseFailure) {
                    // Do not return a possibly locked physical connection to the pool.
                    connection.abort(Runnable::run);
                    throw releaseFailure;
                }
            }
        } catch (SQLException exception) {
            throw new DataIntegrationException("No fue posible adquirir/liberar el bloqueo de sincronización", exception);
        }
    }
}

