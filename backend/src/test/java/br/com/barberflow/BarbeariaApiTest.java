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
