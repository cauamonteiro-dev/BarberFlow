package br.com.barberflow;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.nio.file.*;
import java.util.*;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

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
        properties.add("--barberflow.demo-acessos=true");
        SpringApplication.run(new Class<?>[]{BarberFlowApplication.class,LocalControl.class},properties.toArray(String[]::new));
    }

    /** Só integra o iniciador de demonstração, nunca o artefato de produção. */
    @Configuration(proxyBeanMethods=false)
    static class LocalControl {
        @Bean ServletRegistrationBean<HttpServlet> encerrarDemo(ConfigurableApplicationContext context) {
            var servlet=new HttpServlet(){
                @Override protected void doPost(HttpServletRequest request,HttpServletResponse response)throws IOException {
                    String expected=System.getProperty("barberflow.controlToken", "");
                    String received=Objects.toString(request.getHeader("X-BarberFlow-Local-Control"), "");
                    boolean allowed=!expected.isBlank() && MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),received.getBytes(StandardCharsets.UTF_8))
                        && InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress()
                        && request.getUserPrincipal()!=null && request.getUserPrincipal().getName().equals("admin@barberflow.local");
                    if(!allowed){response.sendError(403);return;}
                    response.setStatus(202);
                    new Thread(()->{try{Thread.sleep(300);context.close();System.exit(0);}catch(InterruptedException e){Thread.currentThread().interrupt();}},"encerrar-demo").start();
                }
            };
            return new ServletRegistrationBean<>(servlet,"/api/local-demo/encerrar");
        }
    }
}
