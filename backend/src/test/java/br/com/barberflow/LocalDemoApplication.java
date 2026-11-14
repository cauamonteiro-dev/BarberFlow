package br.com.barberflow;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.nio.file.*;
import java.util.*;
import org.springframework.boot.SpringApplication;

/** Local development only: persistent, isolated PostgreSQL without personal credentials. */
public class LocalDemoApplication {
    public static void main(String[] args) throws Exception {
        Path data=Path.of(System.getProperty("barberflow.data", "../.local/postgres")).toAbsolutePath().normalize();
        Files.createDirectories(data.getParent());
        var postgres=EmbeddedPostgres.builder().setPort(Integer.parseInt(System.getProperty("barberflow.dbPort","55432")))
            .setDataDirectory(data).setCleanDataDirectory(false)
            .setServerConfig("listen_addresses","127.0.0.1")
            .setServerConfig("unix_socket_directories", "").setLocaleConfig("locale","C").start();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> { try { postgres.close(); } catch(Exception e) { e.printStackTrace(); } }));
        // Command line properties take precedence over existing DB_* variables.
        var properties=new ArrayList<String>(List.of(args));
        properties.add("--spring.datasource.url="+postgres.getJdbcUrl("postgres","postgres"));
        properties.add("--spring.datasource.username=postgres");
        properties.add("--spring.datasource.password=postgres");
        properties.add("--spring.flyway.locations=classpath:db/migration,classpath:db/demo");
        properties.add("--server.address=127.0.0.1");
        properties.add("--server.port="+System.getProperty("barberflow.port","8080"));
        SpringApplication.run(BarberFlowApplication.class,properties.toArray(String[]::new));
    }
}
