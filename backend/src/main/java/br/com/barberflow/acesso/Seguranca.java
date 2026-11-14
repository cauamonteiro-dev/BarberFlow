package br.com.barberflow.acesso;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.*;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

@Configuration
public class Seguranca {
 @Bean PasswordEncoder encoder(){return new BCryptPasswordEncoder(12);}
 @Bean SecurityContextRepository contextRepository(){return new HttpSessionSecurityContextRepository();}
 @Bean UserDetailsService users(JdbcTemplate db){return email->db.query("select email,senha_hash,ativo from usuario where email=?",(rs,n)->User.withUsername(rs.getString(1)).password(rs.getString(2)).roles("USUARIO").disabled(!rs.getBoolean(3)).build(),email.toLowerCase(java.util.Locale.ROOT)).stream().findFirst().orElseThrow(()->new UsernameNotFoundException("Credenciais inválidas."));}
 @Bean SecurityFilterChain filter(HttpSecurity http,SecurityContextRepository repo)throws Exception{
   return http.securityContext(c->c.securityContextRepository(repo))
    .csrf(c->c.csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
    .authorizeHttpRequests(a->a.requestMatchers("/api/auth/csrf","/api/auth/login","/api/auth/cadastro").permitAll().requestMatchers("/api/**").authenticated().anyRequest().permitAll())
    .exceptionHandling(e->e.authenticationEntryPoint((req,res,ex)->{res.setStatus(401);res.setContentType("application/problem+json");res.setCharacterEncoding("UTF-8");res.getWriter().write("{\"status\":401,\"detail\":\"Faça login para continuar.\"}");})
      .accessDeniedHandler((req,res,ex)->{res.setStatus(403);res.setContentType("application/problem+json");res.setCharacterEncoding("UTF-8");res.getWriter().write("{\"status\":403,\"detail\":\"Acesso negado ou sessão de formulário expirada. Atualize a página.\"}");}))
    .logout(l->l.logoutUrl("/api/auth/logout").logoutSuccessHandler((req,res,a)->res.setStatus(204)).deleteCookies("JSESSIONID"))
    .build();
 }
}
