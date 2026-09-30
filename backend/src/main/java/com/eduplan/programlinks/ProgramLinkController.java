package com.eduplan.programlinks;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/program-links")
public class ProgramLinkController {
    private final ProgramLinkService service;
    public ProgramLinkController(ProgramLinkService service) { this.service = service; }
    @GetMapping public Map<String,Object> get(@RequestParam String sourceId) { return service.publicLink(sourceId); }
    @GetMapping("/batch") public Map<String,Object> batch(@RequestParam List<String> sourceId) { return Map.of("data",service.publicLinks(sourceId)); }
}
