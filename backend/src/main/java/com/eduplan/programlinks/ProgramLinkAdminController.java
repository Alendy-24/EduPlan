package com.eduplan.programlinks;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/program-links")
public class ProgramLinkAdminController {
    private final ProgramLinkService service;
    public ProgramLinkAdminController(ProgramLinkService service) { this.service = service; }
    public record Domain(String institutionCode, String domain) {}
    public record Candidate(String sourceId, String institutionCode, String url, String status, Map<String,Object> evidence, String checkedAt) {}
    public record Decision(String status, String reason) {}
    @PostMapping("/domains") public Map<String,Object> domains(@RequestBody List<Domain> domains) { service.domains(domains); return Map.of("registered", domains.size()); }
    @PostMapping("/import") public Map<String,Object> importCandidates(@RequestBody List<Candidate> rows) { return Map.of("imported", service.importCandidates(rows)); }
    @GetMapping public Map<String,Object> list(@RequestParam(defaultValue="PENDING") String status, @RequestParam(defaultValue="0") int offset) { return Map.of("data", service.list(status, offset)); }
    @PostMapping("/{id}/decision") public Map<String,Object> decide(@PathVariable String id, @RequestBody Decision decision) { service.decide(id, decision); return Map.of("id", id, "status", decision.status()); }
    @GetMapping("/{id}/history") public Map<String,Object> history(@PathVariable String id) { return Map.of("data", service.history(id)); }
}
