package com.eduplan.programlinks;

import com.eduplan.BackendApplication;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.*;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ProgramLinksIntegrationTest {
    private EmbeddedPostgres postgres;
    private ConfigurableApplicationContext context;
    private String base;
    private static final String SECRET="test-program-links-secret-at-least-32-bytes";
    private final HttpClient http=HttpClient.newHttpClient();
    private final JsonMapper json=new JsonMapper();
    @BeforeAll void start() throws Exception {
        postgres=EmbeddedPostgres.builder().setPort(0).start();
        context=new SpringApplicationBuilder(BackendApplication.class).run(
            "--spring.datasource.url="+postgres.getJdbcUrl("postgres","postgres"),"--spring.datasource.username=postgres","--spring.datasource.password=postgres",
            "--server.port=0","--server.address=127.0.0.1",
            "--eduplan.jwt.secret=Y2ktdGVzdC1qd3Qtc2VjcmV0LXNob3VsZC1iZS1sb25nLWVub3VnaC0zMi1ieXRlcw==",
            "--eduplan.program-links.admin-token="+SECRET,"--logging.level.org.springframework=WARN");
        base="http://127.0.0.1:"+context.getEnvironment().getProperty("local.server.port");
    }
    @AfterAll void stop() throws Exception { if(context!=null)context.close();if(postgres!=null)postgres.close(); }
    private HttpResponse<String> request(String method,String path,String token,Object body) throws Exception {
        var builder=HttpRequest.newBuilder(URI.create(base+path)).header("Content-Type","application/json");
        if(token!=null)builder.header("X-Program-Links-Token",token);
        builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return http.send(builder.build(),HttpResponse.BodyHandlers.ofString());
    }
    private JsonNode node(HttpResponse<String> response) { return json.readTree(response.body()); }
    private Map<String,Object> candidate(String source,String url,String status,Instant checked) {
        return Map.of("sourceId",source,"institutionCode","1813","url",url,"status",status,"checkedAt",checked.toString(),"evidence",Map.of("matchedNames",List.of("Administración"),"reason","Evidencia de prueba"));
    }
    private String register(String suffix,String status) throws Exception {
        assertEquals(200,request("POST","/api/admin/program-links/domains",SECRET,List.of(Map.of("institutionCode","1813","domain","uniandes.edu.co"))).statusCode());
        String source="upr9-nkiz:row-"+suffix+"~a_1.b";
        var response=request("POST","/api/admin/program-links/import",SECRET,List.of(candidate(source,"https://uniandes.edu.co/programas/"+suffix,status,Instant.now().minusSeconds(20))));
        assertEquals(200,response.statusCode(),response.body());return source;
    }
    @Test void publicAndAdministrativeAuthorizationAreIndependent() throws Exception {
        String source=register("public","VERIFIED");
        var response=request("GET","/api/program-links?sourceId="+source,null,null);
        assertEquals(200,response.statusCode());assertEquals("VERIFIED",node(response).get("status").asText());assertFalse(node(response).has("evidence"));
        assertEquals(401,request("GET","/api/admin/program-links",null,null).statusCode());
        assertEquals(401,request("GET","/api/admin/program-links","wrong-sync-token",null).statusCode());
        assertEquals(200,request("GET","/api/admin/program-links",SECRET,null).statusCode());
        assertEquals("NOT_FOUND",node(request("GET","/api/program-links?sourceId=upr9-nkiz:row-absent",null,null)).get("status").asText());
        assertEquals(400,request("GET","/api/program-links?sourceId=bad",null,null).statusCode());
    }
    @Test void idempotenceManualDecisionsAndHistory() throws Exception {
        String source=register("manual","PENDING");var db=context.getBean(JdbcTemplate.class);
        String id=db.queryForObject("SELECT id FROM programa_enlace WHERE fuente_id=?",String.class,source);
        var batch=List.of(candidate(source,"https://uniandes.edu.co/programas/manual","VERIFIED",Instant.now().minusSeconds(30)));
        assertEquals(0,node(request("POST","/api/admin/program-links/import",SECRET,batch)).get("imported").asInt());
        assertEquals(200,request("POST","/api/admin/program-links/"+id+"/decision",SECRET,Map.of("status","REJECTED","reason","Sede incorrecta")).statusCode());
        batch=List.of(candidate(source,"https://uniandes.edu.co/programas/manual","VERIFIED",Instant.now()));
        assertEquals(200,request("POST","/api/admin/program-links/import",SECRET,batch).statusCode());
        assertEquals("REJECTED",db.queryForObject("SELECT estado FROM programa_enlace WHERE id=?",String.class,id));
        assertEquals(1,db.queryForObject("SELECT count(*) FROM programa_enlace WHERE fuente_id=?",Integer.class,source));
        assertTrue(node(request("GET","/api/admin/program-links/"+id+"/history",SECRET,null)).get("data").size()>=3);
    }
    @Test void ambiguityApprovalAndWithdrawal() throws Exception {
        String source=register("choose","VERIFIED");
        assertEquals(200,request("POST","/api/admin/program-links/import",SECRET,List.of(candidate(source,"https://uniandes.edu.co/programas/alternative","VERIFIED",Instant.now().minusSeconds(10)))).statusCode());
        assertEquals("PENDING",node(request("GET","/api/program-links?sourceId="+source,null,null)).get("status").asText());
        String id=context.getBean(JdbcTemplate.class).queryForObject("SELECT id FROM programa_enlace WHERE fuente_id=? AND url LIKE '%alternative'",String.class,source);
        assertEquals(200,request("POST","/api/admin/program-links/"+id+"/decision",SECRET,Map.of("status","VERIFIED","reason","Revisado")).statusCode());
        assertEquals("VERIFIED",node(request("GET","/api/program-links?sourceId="+source,null,null)).get("status").asText());
        request("POST","/api/admin/program-links/import",SECRET,List.of(candidate(source,"https://uniandes.edu.co/programas/alternative","UNAVAILABLE",Instant.now())));
        assertFalse(node(request("GET","/api/program-links?sourceId="+source,null,null)).has("url"));
    }
    @Test void officialProgramNameIsPublishedOnlyForAnUnambiguousVerifiedPage() throws Exception {
        String source=register("name","PENDING");
        var row=new HashMap<String,Object>(candidate(source,"https://uniandes.edu.co/programas/name","VERIFIED",Instant.now()));
        row.put("evidence",Map.of("primaryHeadings",List.of("Arquitectura"),"pageTitle","Pregrado en Arquitectura | Universidad de los Andes","awardedTitle","Arquitecto","reason","Identidad contrastada"));
        assertEquals(200,request("POST","/api/admin/program-links/import",SECRET,List.of(row)).statusCode());
        var data=node(request("GET","/api/program-links?sourceId="+source,null,null));
        assertEquals("Arquitectura",data.get("officialName").asText());assertFalse(data.has("evidence"));assertFalse(data.has("awardedTitle"));
        var batch=request("GET","/api/program-links/batch?sourceId="+source+"&sourceId=upr9-nkiz:row-missing",null,null);
        assertEquals(200,batch.statusCode());assertEquals(2,node(batch).get("data").size());assertEquals("Arquitectura",node(batch).get("data").get(0).get("officialName").asText());
        assertEquals(400,request("GET","/api/program-links/batch?sourceId=bad",null,null).statusCode());
        assertEquals(400,request("GET","/api/program-links/batch?"+String.join("&",Collections.nCopies(101,"sourceId="+source)),null,null).statusCode());
        row.put("checkedAt",Instant.now().plusSeconds(1).toString());row.put("evidence",Map.of("primaryHeadings",List.of("Arquitectura","Programas relacionados")));
        request("POST","/api/admin/program-links/import",SECRET,List.of(row));
        assertFalse(node(request("GET","/api/program-links?sourceId="+source,null,null)).has("officialName"));
        row.put("checkedAt",Instant.now().plusSeconds(2).toString());row.put("status","PENDING");row.put("evidence",Map.of("primaryHeadings",List.of("Arquitectura")));
        request("POST","/api/admin/program-links/import",SECRET,List.of(row));
        assertFalse(node(request("GET","/api/program-links?sourceId="+source,null,null)).has("officialName"));
    }
    @Test void pendingRecrawlCannotReplaceTheNameOrVerificationOfAManualApproval() throws Exception {
        String source=register("manual-name","PENDING");
        var row=new HashMap<String,Object>(candidate(source,"https://uniandes.edu.co/programas/manual-name","VERIFIED",Instant.now()));
        row.put("evidence",Map.of("primaryHeadings",List.of("Arquitectura"),"pageTitle","Arquitectura | Universidad de los Andes"));
        request("POST","/api/admin/program-links/import",SECRET,List.of(row));
        String id=context.getBean(JdbcTemplate.class).queryForObject("SELECT id FROM programa_enlace WHERE fuente_id=?",String.class,source);
        request("POST","/api/admin/program-links/"+id+"/decision",SECRET,Map.of("status","VERIFIED","reason","Identidad revisada manualmente"));
        var original=node(request("GET","/api/program-links?sourceId="+source,null,null));
        row.put("checkedAt",Instant.now().plusSeconds(1).toString());row.put("status","PENDING");
        row.put("evidence",Map.of("primaryHeadings",List.of("Economía"),"pageTitle","Economía | Universidad de los Andes","reason","Contradicción"));
        assertEquals(200,request("POST","/api/admin/program-links/import",SECRET,List.of(row)).statusCode());
        var result=node(request("GET","/api/program-links?sourceId="+source,null,null));
        assertEquals("Arquitectura",result.get("officialName").asText());assertEquals(original.get("checkedAt").asText(),result.get("checkedAt").asText());
    }
    @Test void unsafeUrlsAndPartialBatchesAreRejected() throws Exception {
        register("validation","PENDING");
        for(String url:List.of("https://evil.example/p","http://127.0.0.1/a","https://uniandes.edu.co:9000/a","https://u:p@uniandes.edu.co/a"))
            assertEquals(400,request("POST","/api/admin/program-links/import",SECRET,List.of(candidate("upr9-nkiz:row-invalid",url,"VERIFIED",Instant.now()))).statusCode(),url);
        var batch=List.of(candidate("upr9-nkiz:row-rollback","https://uniandes.edu.co/programas/a","PENDING",Instant.now()),candidate("bad","https://uniandes.edu.co/programas/b","PENDING",Instant.now()));
        assertEquals(400,request("POST","/api/admin/program-links/import",SECRET,batch).statusCode());
        assertEquals(0,context.getBean(JdbcTemplate.class).queryForObject("SELECT count(*) FROM programa_enlace WHERE fuente_id='upr9-nkiz:row-rollback'",Integer.class));
    }
}
