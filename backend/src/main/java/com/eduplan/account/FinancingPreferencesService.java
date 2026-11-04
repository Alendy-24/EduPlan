package com.eduplan.account;

import com.eduplan.auth.CuentaPrincipal;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class FinancingPreferencesService {
    private final AccountExplorationService accounts;
    private final JdbcTemplate db;

    public FinancingPreferencesService(AccountExplorationService accounts, JdbcTemplate db) {
        this.accounts = accounts;
        this.db = db;
    }

    @Transactional(readOnly = true)
    public FinancingPreferences get(CuentaPrincipal principal) {
        long id = accounts.requireAccount(principal, false).getIdCuenta();
        return db.query("SELECT student_stage,support,repayment,international,admission,nationality FROM account_financing_preferences WHERE id_cuenta=?",
                (rs, row) -> new FinancingPreferences(rs.getString(1), rs.getString(2), rs.getString(3),
                        rs.getString(4), rs.getString(5), rs.getString(6)), id)
                .stream().findFirst().orElse(FinancingPreferences.empty());
    }

    @Transactional
    public FinancingPreferences put(CuentaPrincipal principal, Map<String, Object> request) {
        long id = accounts.requireAccount(principal, true).getIdCuenta();
        var value = FinancingPreferences.from(request);
        db.update("INSERT INTO account_financing_preferences(id_cuenta,student_stage,support,repayment,international,admission,nationality) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id_cuenta) DO UPDATE SET student_stage=excluded.student_stage,support=excluded.support,repayment=excluded.repayment,international=excluded.international,admission=excluded.admission,nationality=excluded.nationality,updated_at=now()",
                id, value.studentStage(), value.support(), value.repayment(), value.international(), value.admission(), value.nationality());
        return value;
    }
}
