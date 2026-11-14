package br.com.barberflow;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import java.sql.Connection;
import java.sql.Statement;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Integra controller, validação, service, JPA, Flyway e PostgreSQL real temporário.
@SpringBootTest
@AutoConfigureMockMvc
class BarbeariaApiTest {
    private static final EmbeddedPostgres POSTGRES = startPostgres();

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> POSTGRES.getJdbcUrl("postgres", "postgres"));
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
        registry.add("spring.flyway.locations", () -> "classpath:db/migration");
    }

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired Flyway flyway;

    @BeforeEach
    void cleanData() {
        jdbc.execute("TRUNCATE barbearia, cliente RESTART IDENTITY CASCADE");
    }

    @Test
    void migratesAllEightTablesWithoutLoadingDemoData() {
        Integer count = jdbc.queryForObject("""
                SELECT count(*) FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name IN
                ('barbearia','cliente','cliente_barbearia','barbeiro',
                 'servico','agendamento','plano','assinatura')
                """, Integer.class);
        assertThat(count).isEqualTo(8);
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM barbearia", Integer.class)).isZero();
    }

    @Test
    void createsTrimsPersistsAndRetrievesBarbearia() throws Exception {
        String body = mvc.perform(post("/api/barbearias")
                        .contentType("application/json")
                        .content(""" 
                                {"nome":"  BarberFlow Nova Lima  ","ativa":true}
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/barbearias/1"))
                .andExpect(jsonPath("nome").value("BarberFlow Nova Lima"))
                .andExpect(jsonPath("ativa").value(true))
                .andReturn().getResponse().getContentAsString();
        JsonNode created = mapper.readTree(body);
        assertThat(jdbc.queryForObject("SELECT nome FROM barbearia WHERE id = ?",
                String.class, created.get("id").asLong())).isEqualTo("BarberFlow Nova Lima");
        mvc.perform(get("/api/barbearias/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("id").value(1))
                .andExpect(jsonPath("nome").value("BarberFlow Nova Lima"));
    }

    @Test
    void listsActiveAndInactiveBarbeariasInIdOrder() throws Exception {
        jdbc.update("INSERT INTO barbearia (nome, ativa) VALUES (?, ?)", "Central", true);
        jdbc.update("INSERT INTO barbearia (nome, ativa) VALUES (?, ?)", "Filial", false);
        mvc.perform(get("/api/barbearias"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].nome").value("Central"))
                .andExpect(jsonPath("$[1].ativa").value(false));
    }

    @Test
    void returnsEmptyList() throws Exception {
        mvc.perform(get("/api/barbearias"))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{}", "{\"nome\":null,\"ativa\":true}",
            "{\"nome\":\"   \",\"ativa\":true}",
            "{\"nome\":\"Central\"}", "{\"nome\":\"Central\",\"ativa\":null}"
    })
    void rejectsMissingOrBlankFieldsWithoutPersisting(String body) throws Exception {
        mvc.perform(post("/api/barbearias").contentType("application/json").content(body))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("errors").isMap());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM barbearia", Integer.class)).isZero();
    }

    @Test
    void rejectsNamesBeyondDatabaseLimit() throws Exception {
        mvc.perform(post("/api/barbearias").contentType("application/json")
                        .content(mapper.writeValueAsString(java.util.Map.of("nome", "A".repeat(101), "ativa", true))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("errors.nome").exists());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{", "{\"nome\":\"Central\",\"ativa\":true,\"id\":99}",
            "{\"nome\":\"Central\",\"ativa\":{}}"})
    void rejectsMalformedOrUnexpectedJson(String body) throws Exception {
        mvc.perform(post("/api/barbearias").contentType("application/json").content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("status").value(400));
    }

    @Test
    void returnsNotFoundForUnknownId() throws Exception {
        mvc.perform(get("/api/barbearias/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("detail").value("Barbearia não encontrada."));
    }

    @Test
    void rejectsNonNumericId() throws Exception {
        mvc.perform(get("/api/barbearias/abc"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("status").value(400));
    }

    @Test
    void demoMigratesOnceAndKeepsIdentityReadyForNewRecords() throws Exception {
        // Banco separado: não altera o schema usado pela API durante os demais testes.
        try (Connection connection = POSTGRES.getPostgresDatabase().getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("CREATE DATABASE barberflow_demo_test");
        }
        String url = POSTGRES.getJdbcUrl("postgres", "barberflow_demo_test");
        Flyway demo = Flyway.configure().dataSource(url, "postgres", "postgres")
                .locations("classpath:db/migration", "classpath:db/demo").load();
        assertThat(demo.migrate().migrationsExecuted).isEqualTo(2);
        assertThat(demo.migrate().migrationsExecuted).isZero();
        try (Connection connection = java.sql.DriverManager.getConnection(url, "postgres", "postgres");
             Statement statement = connection.createStatement()) {
            try (var result = statement.executeQuery("""
                    SELECT (SELECT count(*) FROM barbearia) + (SELECT count(*) FROM cliente)
                    + (SELECT count(*) FROM cliente_barbearia) + (SELECT count(*) FROM barbeiro)
                    + (SELECT count(*) FROM servico) + (SELECT count(*) FROM plano)
                    + (SELECT count(*) FROM agendamento) + (SELECT count(*) FROM assinatura)
                    """)) {
                result.next();
                assertThat(result.getInt(1)).isEqualTo(200);
            }
            try (var result = statement.executeQuery("""
                    INSERT INTO barbearia (nome, ativa) VALUES ('Nova após seed', true) RETURNING id
                    """)) {
                result.next();
                assertThat(result.getLong(1)).isEqualTo(6L);
            }
        }
    }


    private void fixture() {
        jdbc.update("INSERT INTO barbearia(id,nome,ativa) VALUES (1,'Central',true),(2,'Filial',true)");
        jdbc.update("INSERT INTO cliente(id,nome) VALUES (1,'Ana'),(2,'Bruno')");
        jdbc.update("INSERT INTO cliente_barbearia(cliente_id,barbearia_id,status) VALUES (1,1,'ATIVO'),(1,2,'ATIVO')");
        jdbc.update("INSERT INTO barbeiro(id,barbearia_id,nome,status) VALUES (1,1,'João','ATIVO'),(2,2,'Pedro','ATIVO')");
        jdbc.update("INSERT INTO servico(id,barbearia_id,nome,preco,duracao_min,status) VALUES (1,1,'Corte',40,30,'ATIVO'),(2,2,'Barba',25,20,'ATIVO')");
        jdbc.execute("select setval(pg_get_serial_sequence('cliente','id'),2,true)");
        jdbc.update("INSERT INTO plano(id,barbearia_id,nome,preco,status) VALUES (1,1,'Mensal',100,'ATIVO'),(2,2,'Premium',150,'ATIVO')");
    }

    private String booking(String time,String status) {
        return "{\"barbeariaId\":1,\"clienteId\":1,\"barbeiroId\":1,\"servicoId\":1,\"inicio\":\"2027-01-10T"+time+":00\",\"status\":\""+status+"\"}";
    }

    @Test
    void updatesShopAndPreventsNewBookingsWhenInactive() throws Exception {
        fixture();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/barbearias/1")
            .contentType("application/json").content("{\"nome\":\"Central nova\",\"ativa\":false}"))
            .andExpect(status().isOk()).andExpect(jsonPath("ativa").value(false));
        mvc.perform(post("/api/agendamentos").contentType("application/json").content(booking("10:00","AGENDADO")))
            .andExpect(status().isConflict());
    }

    @Test
    void scopedClientCreationIsAtomicAndValidatesEmail() throws Exception {
        fixture();
        mvc.perform(post("/api/barbearias/1/clientes/cadastro").contentType("application/json")
            .content("{\"nome\":\"Maria\",\"email\":\"maria@exemplo.com\",\"status\":\"ATIVO\"}"))
            .andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("select count(*) from cliente_barbearia where barbearia_id=1",Long.class)).isEqualTo(2);
        mvc.perform(post("/api/clientes").contentType("application/json").content("{\"nome\":\"Inválido\",\"email\":\"invalido\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/clientes").contentType("application/json").content("{\"nome\":\"Duplicado\",\"email\":\"MARIA@EXEMPLO.COM\"}"))
            .andExpect(status().isConflict());
        jdbc.update("update barbearia set ativa=false where id=1");
        mvc.perform(post("/api/barbearias/1/clientes/cadastro").contentType("application/json")
            .content("{\"nome\":\"Não persistir\",\"status\":\"ATIVO\"}"))
            .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("select count(*) from cliente where nome='Não persistir'",Long.class)).isZero();
    }

    @Test
    void reactivatesSameLinkAndKeepsOtherShopIndependent() throws Exception {
        fixture();
        Long original=jdbc.queryForObject("select id from cliente_barbearia where cliente_id=1 and barbearia_id=1",Long.class);
        for(String value: new String[]{"INATIVO","ATIVO","ATIVO"}) {
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/barbearias/1/clientes")
                .contentType("application/json").content("{\"clienteId\":1,\"status\":\""+value+"\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("id").value(original));
        }
        assertThat(jdbc.queryForObject("select count(*) from cliente_barbearia where cliente_id=1",Long.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("select status from cliente_barbearia where cliente_id=1 and barbearia_id=2",String.class)).isEqualTo("ATIVO");
    }

    @ParameterizedTest
    @ValueSource(strings={"09:45","10:00","10:15"})
    void rejectsEveryOverlappingInterval(String start) throws Exception {
        fixture();
        mvc.perform(post("/api/agendamentos").contentType("application/json").content(booking("10:00","AGENDADO")))
            .andExpect(status().isCreated()).andExpect(jsonPath("fim").value("2027-01-10T10:30:00"));
        mvc.perform(post("/api/agendamentos").contentType("application/json").content(booking(start,"CONFIRMADO")))
            .andExpect(status().isConflict()).andExpect(jsonPath("detail").value("O barbeiro já possui um agendamento nesse intervalo."));
    }

    @Test
    void permitsAdjacentBookingsAndReusesCancelledSlot() throws Exception {
        fixture();
        var body=mvc.perform(post("/api/agendamentos").contentType("application/json").content(booking("10:00","AGENDADO")))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id=mapper.readTree(body).get("id").asLong();
        mvc.perform(post("/api/agendamentos").contentType("application/json").content(booking("10:30","AGENDADO")))
            .andExpect(status().isCreated());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/agendamentos/"+id)
            .contentType("application/json").content(booking("10:00","CANCELADO"))).andExpect(status().isOk());
        mvc.perform(post("/api/agendamentos").contentType("application/json").content(booking("10:00","CONFIRMADO")))
            .andExpect(status().isCreated());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/agendamentos/"+id)
            .contentType("application/json").content(booking("10:00","AGENDADO"))).andExpect(status().isConflict());
    }

    @Test
    void preventsConcurrentDoubleBooking() throws Exception {
        fixture();
        var executor=java.util.concurrent.Executors.newFixedThreadPool(2);
        var ready=new java.util.concurrent.CountDownLatch(2);
        var start=new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.Callable<Integer> request=() -> {
            ready.countDown();start.await();
            return mvc.perform(post("/api/agendamentos").contentType("application/json").content(booking("11:00","AGENDADO")))
                .andReturn().getResponse().getStatus();
        };
        try {
            var a=executor.submit(request);var b=executor.submit(request);
            assertThat(ready.await(10,java.util.concurrent.TimeUnit.SECONDS)).isTrue();start.countDown();
            assertThat(java.util.List.of(a.get(20,java.util.concurrent.TimeUnit.SECONDS),b.get(20,java.util.concurrent.TimeUnit.SECONDS)))
                .containsExactlyInAnyOrder(201,409);
        }finally{start.countDown();executor.shutdownNow();}
        assertThat(jdbc.queryForObject("select count(*) from agendamento",Long.class)).isEqualTo(1);
    }

    @Test
    void rejectsCrossShopResourcesAndUnlinkedOrInactiveClients() throws Exception {
        fixture();
        mvc.perform(post("/api/agendamentos").contentType("application/json").content(booking("10:00","AGENDADO").replace("\"barbeiroId\":1","\"barbeiroId\":2")))
            .andExpect(status().isConflict());
        mvc.perform(post("/api/agendamentos").contentType("application/json").content(booking("10:00","AGENDADO").replace("\"servicoId\":1","\"servicoId\":2")))
            .andExpect(status().isConflict());
        mvc.perform(post("/api/agendamentos").contentType("application/json").content(booking("10:00","AGENDADO").replace("\"clienteId\":1","\"clienteId\":2")))
            .andExpect(status().isConflict());
        jdbc.update("update cliente_barbearia set status='INATIVO' where barbearia_id=1");
        mvc.perform(post("/api/agendamentos").contentType("application/json").content(booking("10:00","AGENDADO")))
            .andExpect(status().isConflict());
    }

    @Test
    void validatesCatalogAndPreservesBookedDurationOnStatusChange() throws Exception {
        fixture();
        mvc.perform(post("/api/servicos").contentType("application/json")
            .content("{\"barbeariaId\":1,\"nome\":\"Corte\",\"preco\":-1,\"duracaoMin\":0,\"status\":\"ATIVO\"}"))
            .andExpect(status().isBadRequest());
        var body=mvc.perform(post("/api/agendamentos").contentType("application/json").content(booking("10:00","AGENDADO")))
            .andReturn().getResponse().getContentAsString();
        long id=mapper.readTree(body).get("id").asLong();
        jdbc.update("update servico set duracao_min=60,status='INATIVO' where id=1");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/agendamentos/"+id)
            .contentType("application/json").content(booking("10:00","CONCLUIDO")))
            .andExpect(status().isOk()).andExpect(jsonPath("fim").value("2027-01-10T10:30:00"));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/barbeiros/1")
            .contentType("application/json").content("{\"barbeariaId\":2,\"nome\":\"Movido\",\"status\":\"ATIVO\"}"))
            .andExpect(status().isConflict());
    }

    @Test
    void validatesSubscriptionsAndExcludesExpiredFromCurrentTotals() throws Exception {
        fixture();
        String valid="{\"clienteId\":1,\"planoId\":1,\"dataInicio\":\"2000-01-01\",\"dataFim\":\"2001-01-01\",\"status\":\"ATIVA\"}";
        mvc.perform(post("/api/assinaturas").contentType("application/json").content(valid))
            .andExpect(status().isCreated());
        mvc.perform(post("/api/assinaturas").contentType("application/json").content(valid.replace("2001-01-01","1999-01-01")))
            .andExpect(status().isConflict());
        mvc.perform(post("/api/assinaturas").contentType("application/json").content(valid.replace("\"clienteId\":1","\"clienteId\":2")))
            .andExpect(status().isConflict());
        mvc.perform(get("/api/relatorios").param("barbeariaId","1"))
            .andExpect(status().isOk()).andExpect(jsonPath("resumo.assinaturasVigentes").value(0));
        mvc.perform(get("/api/assinaturas").param("barbeariaId","2"))
            .andExpect(status().isOk()).andExpect(content().json("[]"));
    }

    @Test
    void reportsJoinsAggregationsFiltersAndAvailability() throws Exception {
        fixture();
        mvc.perform(post("/api/agendamentos").contentType("application/json").content(booking("10:00","CONCLUIDO")))
            .andExpect(status().isCreated());
        mvc.perform(get("/api/relatorios").param("barbeariaId","1").param("de","2027-01-10").param("ate","2027-01-10"))
            .andExpect(status().isOk()).andExpect(jsonPath("resumo.concluidos").value(1))
            .andExpect(jsonPath("resumo.valorServicosConcluidos").value(40))
            .andExpect(jsonPath("barbeiros[0].nome").value("João"));
        mvc.perform(get("/api/relatorios").param("barbeariaId","2"))
            .andExpect(jsonPath("resumo.agendamentos").value(0));
        mvc.perform(get("/api/relatorios").param("barbeariaId","1").param("de","2027-02-01").param("ate","2027-01-01"))
            .andExpect(status().isConflict());
        mvc.perform(get("/api/disponibilidade").param("barbeariaId","1").param("barbeiroId","1").param("servicoId","1").param("inicio","2027-01-10T10:00:00"))
            .andExpect(status().isOk()).andExpect(jsonPath("disponivel").value(false));
        mvc.perform(get("/api/agendamentos").param("barbeariaId","1").param("de","2027-02-01"))
            .andExpect(content().json("[]"));
        mvc.perform(get("/api/servicos").param("barbeariaId","9999"))
            .andExpect(status().isNotFound());
    }


    @Test
    void academicQueriesRunOnTheImplementedSchema() throws Exception {
        fixture();
        String script=java.nio.file.Files.readString(java.nio.file.Path.of("../database/consultas.sql"));
        var queries=java.util.Arrays.stream(script.replaceAll("(?m)^--.*$", "").split(";"))
            .map(String::strip).filter(q -> !q.isBlank()).toList();
        assertThat(queries).hasSize(15);
        for(String query:queries) jdbc.queryForList(query);
    }

    @Test
    void databaseRejectsInvalidForeignKeysChecksAndDuplicateLinks() {
        fixture();
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update(
            "insert into cliente_barbearia(cliente_id,barbearia_id,status) values (1,999999,'ATIVO')"))
            .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update(
            "insert into cliente_barbearia(cliente_id,barbearia_id,status) values (1,1,'ATIVO')"))
            .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update(
            "insert into servico(barbearia_id,nome,preco,duracao_min,status) values (1,'Inválido',-10,30,'ATIVO')"))
            .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void explicitRollbackPreservesOriginalClientData() throws Exception {
        fixture();
        try(var connection=java.sql.DriverManager.getConnection(POSTGRES.getJdbcUrl("postgres","postgres"),"postgres","postgres")) {
            connection.setAutoCommit(false);
            try(var statement=connection.createStatement()) {
                statement.executeUpdate("update cliente set nome='Alterado na transação' where id=1");
                try(var result=statement.executeQuery("select nome from cliente where id=1")) {
                    result.next();assertThat(result.getString(1)).isEqualTo("Alterado na transação");
                }
            }finally{connection.rollback();}
        }
        assertThat(jdbc.queryForObject("select nome from cliente where id=1",String.class)).isEqualTo("Ana");
    }

    private static EmbeddedPostgres startPostgres() {
        try {
            EmbeddedPostgres postgres = EmbeddedPostgres.builder()
                    .setServerConfig("unix_socket_directories", "")
                    .setLocaleConfig("locale", "C").start();
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    postgres.close();
                } catch (IOException exception) {
                    throw new java.io.UncheckedIOException(exception);
                }
            }));
            return postgres;
        } catch (IOException exception) {
            throw new java.io.UncheckedIOException(exception);
        }
    }
}
