package com.eduplan.account;

import com.eduplan.auth.CuentaPrincipal;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
public class MatchingPreferencesService {
    private final AccountExplorationService accounts;
    private final JdbcTemplate db;
    private final MatchingCatalog catalog;
    private final JsonMapper json=new JsonMapper();
    public MatchingPreferencesService(AccountExplorationService accounts,JdbcTemplate db,MatchingCatalog catalog) {this.accounts=accounts;this.db=db;this.catalog=catalog;}
    @Transactional(readOnly=true)
    public MatchingPreferences get(CuentaPrincipal principal) {
        long id=accounts.requireAccount(principal,false).getIdCuenta();
        return db.query("SELECT preferences::text FROM account_matching_preferences WHERE id_cuenta=?",(rs,row)->json.readValue(rs.getString(1),MatchingPreferences.class),id).stream().findFirst().orElse(MatchingPreferences.empty());
    }
    @Transactional
    public MatchingPreferences put(CuentaPrincipal principal,MatchingPreferences request) {
        long id=accounts.requireAccount(principal,true).getIdCuenta();
        var value=catalog.normalize(request);
        db.update("INSERT INTO account_matching_preferences(id_cuenta,preferences,taxonomy_version) VALUES (?,?::jsonb,?) ON CONFLICT(id_cuenta) DO UPDATE SET preferences=excluded.preferences,taxonomy_version=excluded.taxonomy_version,updated_at=now()",id,json.writeValueAsString(value),catalog.version());
        return value;
    }
}
