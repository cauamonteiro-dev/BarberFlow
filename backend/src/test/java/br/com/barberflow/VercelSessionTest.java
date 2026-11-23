package br.com.barberflow;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

class VercelSessionTest {
    private final HttpClient client = HttpClient.newHttpClient();
    private final ObjectMapper json = new ObjectMapper();

    @Test
    void loginAndLogoutWorkAcrossTwoInstances() throws Exception {
        try (var postgres = EmbeddedPostgres.builder().setServerConfig("unix_socket_directories", "")
                    .setLocaleConfig("locale", "C").start();
                var first = instance(postgres);
                var second = instance(postgres)) {
            var password = first.getBean(PasswordEncoder.class).encode("TesteSessao!2026");
            first.getBean(JdbcTemplate.class).update("""
                insert into usuario(nome,email,senha_hash,admin_global) values ('Conta teste',?,?,true)
                """, "sessao@example.test", password);

            var initial = get(first, "/api/auth/csrf", null);
            assertThat(initial.statusCode()).isEqualTo(200);
            var originalCookie = cookie(initial);
            var login = post(first, "/api/auth/login", originalCookie, json.readTree(initial.body()), """
                {"email":"sessao@example.test","senha":"TesteSessao!2026"}
                """);
            assertThat(login.statusCode()).isEqualTo(200);
            var session = cookie(login);
            assertThat(session).isNotEqualTo(originalCookie);

            var identity = get(second, "/api/auth/me", session);
            assertThat(identity.statusCode()).isEqualTo(200);
            assertThat(json.readTree(identity.body()).path("email").asText()).isEqualTo("sessao@example.test");
            assertThat(get(second, "/api/auth/me", originalCookie).statusCode()).isEqualTo(401);

            var renewed = get(first, "/api/auth/csrf", session);
            assertThat(renewed.statusCode()).isEqualTo(200);
            assertThat(post(second, "/api/auth/logout", session, json.readTree(renewed.body()), "").statusCode()).isEqualTo(204);
            assertThat(get(first, "/api/auth/me", session).statusCode()).isEqualTo(401);
        }
    }

    private ConfigurableApplicationContext instance(EmbeddedPostgres postgres) {
        return new SpringApplicationBuilder(BarberFlowApplication.class).profiles("vercel").run(
            "--server.port=0", "--server.address=127.0.0.1",
            "--spring.datasource.url=" + postgres.getJdbcUrl("postgres", "postgres"),
            "--spring.datasource.username=postgres", "--spring.datasource.password=postgres");
    }

    private HttpResponse<String> get(ConfigurableApplicationContext context, String path, String cookie) throws Exception {
        return client.send(request(context, path, cookie).GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(ConfigurableApplicationContext context, String path, String cookie, JsonNode token, String body) throws Exception {
        var request = request(context, path, cookie).header(token.path("header").asText(), token.path("token").asText())
            .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private HttpRequest.Builder request(ConfigurableApplicationContext context, String path, String cookie) {
        int port = ((ServletWebServerApplicationContext) context).getWebServer().getPort();
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(15));
        // Os dois servidores de teste são locais. O envio explícito permite verificar o cookie Secure.
        if (cookie != null) request.header("Cookie", cookie);
        return request;
    }

    private String cookie(HttpResponse<String> response) {
        var header = response.headers().allValues("set-cookie").stream().filter(v -> v.startsWith("JSESSIONID=")).findFirst().orElseThrow();
        assertThat(header).contains("Secure", "HttpOnly", "SameSite=Lax");
        return header.split(";", 2)[0];
    }
}
