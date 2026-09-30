package com.eduplan.programlinks;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Service
public class ProgramLinkService {
    private final JdbcTemplate db;
    private final JsonMapper json = new JsonMapper();
    private static final Set<String> STATES = Set.of("PENDING", "VERIFIED", "REJECTED", "UNAVAILABLE");
    public ProgramLinkService(JdbcTemplate db) { this.db = db; }
    private ResponseStatusException bad(String reason) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason); }
    private void source(String value) { if (value == null || !value.matches("upr9-nkiz:[A-Za-z0-9_.~-]{1,170}")) throw bad("sourceId no válido"); }
    private void institution(String value) { if (value == null || !value.matches("[0-9]{1,30}")) throw bad("Institución no válida"); }
    private void domain(String value) {
        if (value == null || value.length() > 253 || !value.matches("(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,63}")
            || Set.of("edu.co","com.co","gov.co","org.co","net.co").contains(value) || value.equals("localhost") || value.endsWith(".local") || value.endsWith(".internal")) throw bad("Dominio no válido");
    }
    private String url(String value, String institution) {
        try {
            URI uri = URI.create(value);
            if (value.length() > 2000 || !Set.of("http", "https").contains(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                || uri.getFragment() != null || uri.getPort() != -1 && uri.getPort() != 80 && uri.getPort() != 443) throw bad("URL no válida");
            String host = uri.getHost().toLowerCase(Locale.ROOT); domain(host);
            var domains = db.queryForList("SELECT dominio FROM programa_enlace_dominio WHERE institucion=?", String.class, institution);
            if (domains.stream().noneMatch(allowed -> host.equals(allowed) || host.endsWith("." + allowed))) throw bad("URL fuera de los dominios aprobados");
            return uri.toString();
        } catch (IllegalArgumentException | NullPointerException exception) { throw bad("URL no válida"); }
    }
    @Transactional public void domains(List<ProgramLinkAdminController.Domain> rows) {
        if (rows == null || rows.size() > 1000) throw bad("Máximo 1000 dominios por lote");
        for (var row : rows) { if (row == null) throw bad("Dominio no válido"); institution(row.institutionCode()); domain(row.domain()); db.update("INSERT INTO programa_enlace_dominio VALUES (?,?) ON CONFLICT DO NOTHING", row.institutionCode(), row.domain()); }
    }
    @Transactional public int importCandidates(List<ProgramLinkAdminController.Candidate> rows) {
        if (rows == null || rows.size() > 100) throw bad("Máximo 100 candidatos por lote");
        int imported = 0;
        for (var row : rows) {
            if (row == null) throw bad("Candidato no válido");
            source(row.sourceId()); institution(row.institutionCode()); String url = url(row.url(), row.institutionCode());
            if (!Set.of("PENDING", "VERIFIED", "UNAVAILABLE").contains(Objects.toString(row.status(), ""))) throw bad("Estado de importación no válido");
            if (row.evidence() == null) throw bad("Falta evidencia");
            String evidence = json.writeValueAsString(row.evidence()); if (evidence.getBytes(StandardCharsets.UTF_8).length > 16000) throw bad("Evidencia demasiado grande");
            Instant checked;
            try { checked = Instant.parse(row.checkedAt()); } catch (Exception exception) { throw bad("Fecha no válida"); }
            if (checked.isAfter(Instant.now().plusSeconds(300))) throw bad("Fecha futura no válida");
            String id;
            try { id = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((row.sourceId() + "\n" + url).getBytes(StandardCharsets.UTF_8))); }
            catch (Exception exception) { throw new IllegalStateException(exception); }
            // Serialize per source, including concurrent approval/import, without touching catalog locks.
            db.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", Object.class, row.sourceId());
            var existing = db.queryForList("SELECT * FROM programa_enlace WHERE id=?", id);
            if (!existing.isEmpty() && !row.institutionCode().equals(existing.get(0).get("institucion"))) throw bad("La institución del registro no puede cambiar");
            if (!existing.isEmpty() && !checked.isAfter(((Timestamp)existing.get(0).get("comprobado")).toInstant())) continue;
            boolean manual = !existing.isEmpty() && (Boolean)existing.get(0).get("manual");
            // A crawler may withdraw a broken manual link, but never approve/reject it anew.
            String state = manual && !row.status().equals("UNAVAILABLE") ? (String)existing.get(0).get("estado") : row.status();
            if (state.equals("VERIFIED") && !manual) {
                var manualSource = db.queryForList("SELECT id FROM programa_enlace WHERE fuente_id=? AND manual=true", row.sourceId());
                if (!manualSource.isEmpty()) state = "PENDING";
            }
            String reason = manual ? Objects.toString(existing.get(0).get("motivo"), "") : "Recopilación automática";
            boolean keepManualEvidence = manual && !row.status().equals("VERIFIED") && !row.status().equals("UNAVAILABLE");
            String storedEvidence = keepManualEvidence ? (String)existing.get(0).get("evidencia") : evidence;
            Timestamp verified = state.equals("VERIFIED") ? keepManualEvidence ? (Timestamp)existing.get(0).get("verificado") : Timestamp.from(checked) : null;
            db.update("INSERT INTO programa_enlace(id,fuente_id,institucion,url,estado,evidencia,manual,motivo,comprobado,verificado,actualizado) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET estado=excluded.estado,evidencia=excluded.evidencia,comprobado=excluded.comprobado,verificado=excluded.verificado,actualizado=excluded.actualizado",
                id,row.sourceId(),row.institutionCode(),url,state,storedEvidence,manual,reason,Timestamp.from(checked),verified,Timestamp.from(Instant.now()));
            audit(id,"IMPORT",state,evidence,reason); imported++;
        }
        return imported;
    }
    private void audit(String id,String action,String state,String evidence,String reason) { db.update("INSERT INTO programa_enlace_historial(enlace_id,accion,estado,evidencia,motivo,fecha) VALUES (?,?,?,?,?,?)",id,action,state,evidence,reason,Timestamp.from(Instant.now())); }
    public Map<String,Object> publicLink(String sourceId) {
        source(sourceId);
        var rows = db.queryForList("SELECT estado,url,verificado,evidencia FROM programa_enlace WHERE fuente_id=? ORDER BY manual DESC,actualizado DESC", sourceId);
        return publicResult(sourceId, rows);
    }
    public List<Map<String,Object>> publicLinks(List<String> sourceIds) {
        if (sourceIds == null || sourceIds.isEmpty() || sourceIds.size() > 100) throw bad("Entre 1 y 100 registros por consulta");
        sourceIds.forEach(this::source);
        var ids = sourceIds.stream().distinct().toList();
        var rows = db.queryForList("SELECT fuente_id,estado,url,verificado,evidencia FROM programa_enlace WHERE fuente_id IN (" + String.join(",", Collections.nCopies(ids.size(), "?")) + ") ORDER BY manual DESC,actualizado DESC", ids.toArray());
        return ids.stream().map(id -> publicResult(id, rows.stream().filter(row -> id.equals(row.get("fuente_id"))).toList())).toList();
    }
    private Map<String,Object> publicResult(String sourceId, List<Map<String,Object>> rows) {
        var verified = rows.stream().filter(row -> row.get("estado").equals("VERIFIED")).toList();
        // Ambiguous multiple URLs must never silently resolve to the first one.
        if (verified.size() == 1) {
            var row = verified.get(0);
            Map<String,Object> result = new LinkedHashMap<>(Map.of("sourceId",sourceId,"status","VERIFIED","url",row.get("url"),"checkedAt",((Timestamp)row.get("verificado")).toInstant().toString()));
            // A single explicit heading on a verified page identifies the program,
            // separately from its awarded title. Candidate evidence remains private.
            try {
                var evidence = json.readTree((String)row.get("evidencia"));
                var headings = evidence.get("primaryHeadings");
                if (headings != null && headings.isArray() && headings.size() == 1 && headings.get(0).isString()) {
                    String name = headings.get(0).asText().strip();
                    var pageTitle = evidence.get("pageTitle");
                    boolean titleConfirmsName = pageTitle != null && pageTitle.isString() && foldName(pageTitle.asText()).contains(foldName(name));
                    if (titleConfirmsName && name.length() >= 3 && name.length() <= 240 && !name.matches("(?i)(programas?|oferta acad[eé]mica|inicio|bienvenidos?|universidad.*|admisiones?|costos|plan de estudios|perfil del egresado|descripci[oó]n)")) result.put("officialName", name);
                }
            } catch (RuntimeException ignored) { /* Legacy evidence keeps the catalog label. */ }
            return result;
        }
        String state = verified.size() > 1 || rows.stream().anyMatch(row -> row.get("estado").equals("PENDING")) ? "PENDING" : rows.isEmpty() ? "NOT_FOUND" : "UNAVAILABLE";
        return Map.of("sourceId",sourceId,"status",state);
    }
    private String foldName(String value) { return java.text.Normalizer.normalize(value,java.text.Normalizer.Form.NFKD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+"," ").strip(); }
    public List<Map<String,Object>> list(String status,int offset) {
        if (!STATES.contains(status) || offset < 0) throw bad("Consulta no válida");
        return db.queryForList("SELECT id,fuente_id AS \"sourceId\",institucion AS \"institutionCode\",url,estado AS status,evidencia AS evidence,manual,motivo AS reason,comprobado AS \"checkedAt\" FROM programa_enlace WHERE estado=? ORDER BY fuente_id,id LIMIT 100 OFFSET ?",status,offset);
    }
    @Transactional public void decide(String id,ProgramLinkAdminController.Decision decision) {
        if (decision == null || !Set.of("VERIFIED","REJECTED").contains(Objects.toString(decision.status(),"")) || decision.reason() == null || decision.reason().isBlank() || decision.reason().length() > 1000) throw bad("Decisión y motivo requeridos");
        var rows = db.queryForList("SELECT * FROM programa_enlace WHERE id=?",id); if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Candidato no encontrado");
        var row = rows.get(0); String sourceId = (String)row.get("fuente_id");
        db.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",Object.class,sourceId);
        url((String)row.get("url"),(String)row.get("institucion"));
        if (decision.status().equals("VERIFIED")) {
            for (var other : db.queryForList("SELECT id,evidencia FROM programa_enlace WHERE fuente_id=? AND id<>? AND estado='VERIFIED'",sourceId,id)) {
                db.update("UPDATE programa_enlace SET estado='PENDING',actualizado=? WHERE id=?",Timestamp.from(Instant.now()),other.get("id"));
                audit((String)other.get("id"),"SUPERSEDED","PENDING",(String)other.get("evidencia"),"Otro enlace aprobado manualmente");
            }
        }
        db.update("UPDATE programa_enlace SET estado=?,manual=true,motivo=?,verificado=?,actualizado=? WHERE id=?",decision.status(),decision.reason(),decision.status().equals("VERIFIED") ? Timestamp.from(Instant.now()) : null,Timestamp.from(Instant.now()),id);
        audit(id,"DECISION",decision.status(),(String)row.get("evidencia"),decision.reason());
    }
    public List<Map<String,Object>> history(String id) { return db.queryForList("SELECT accion,estado,evidencia,motivo,fecha FROM programa_enlace_historial WHERE enlace_id=? ORDER BY id",id); }
}
