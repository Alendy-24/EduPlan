package com.eduplan.account;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SavedOptionRepository extends JpaRepository<SavedOption, Long> {
    List<SavedOption> findByAccountIdOrderBySavedAtDescDatabaseIdDesc(Long accountId);
    Optional<SavedOption> findByAccountIdAndReference(Long accountId, String reference);
    void deleteByAccountIdAndReference(Long accountId, String reference);
}
