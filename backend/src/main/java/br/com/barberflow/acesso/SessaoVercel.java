package br.com.barberflow.acesso;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.session.jdbc.config.annotation.web.http.EnableJdbcHttpSession;
import org.springframework.session.web.http.DefaultCookieSerializer;

@Configuration(proxyBeanMethods = false)
@Profile("vercel")
@EnableJdbcHttpSession(maxInactiveIntervalInSeconds = 1800)
public class SessaoVercel {
    @Bean
    DefaultCookieSerializer cookieSerializer() {
        var cookie = new DefaultCookieSerializer();
        cookie.setCookieName("JSESSIONID");
        cookie.setCookiePath("/");
        cookie.setUseHttpOnlyCookie(true);
        cookie.setUseSecureCookie(true);
        cookie.setSameSite("Lax");
        return cookie;
    }
}
