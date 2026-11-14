package br.com.barberflow.acesso;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController @RequestMapping("/api/auth")
public class AuthController {
 private final JdbcTemplate db;private final PasswordEncoder encoder;private final UserDetailsService users;private final SecurityContextRepository repo;private final Acesso acesso;
 public AuthController(JdbcTemplate db,PasswordEncoder encoder,UserDetailsService users,SecurityContextRepository repo,Acesso acesso){this.db=db;this.encoder=encoder;this.users=users;this.repo=repo;this.acesso=acesso;}
 public record Login(@NotBlank @Email String email,@NotBlank @Size(max=72) String senha){}
 public record Cadastro(@NotBlank @Size(max=100) String nome,@NotBlank @Email @Size(max=120) String email,@NotBlank @Size(min=10,max=72) String senha){}
 @GetMapping("/csrf") public Map<String,String> csrf(CsrfToken token){return Map.of("token",token.getToken(),"header",token.getHeaderName());}
 @PostMapping("/login") public Object login(@Valid @RequestBody Login r,HttpServletRequest request,HttpServletResponse response){
   org.springframework.security.core.userdetails.UserDetails user;
   try{user=users.loadUserByUsername(r.email().strip().toLowerCase(Locale.ROOT));}catch(Exception e){throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"E-mail ou senha inválidos.");}
   if(!user.isEnabled() || !encoder.matches(r.senha(),user.getPassword()))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"E-mail ou senha inválidos.");
   request.getSession(true);request.changeSessionId();
   new org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository().saveToken(null,request,response);
   var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user,null,user.getAuthorities()));
   SecurityContextHolder.setContext(context);repo.saveContext(context,request,response);return me();
 }
 @GetMapping("/me") public Map<String,Object> me(){var c=acesso.conta();var out=new LinkedHashMap<String,Object>();out.put("id",c.id());out.put("nome",c.nome());out.put("email",c.email());out.put("clienteId",c.clienteId());out.put("papeis",acesso.papeis());return out;}
 @PostMapping("/cadastro") @ResponseStatus(HttpStatus.CREATED) @Transactional public void cadastrar(@Valid @RequestBody Cadastro r){
   if(r.senha().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"A senha deve ter no máximo 72 bytes em UTF-8.");
   String email=r.email().strip().toLowerCase(Locale.ROOT);
   if(db.queryForObject("select count(*) from usuario where email=?",Long.class,email)>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"E-mail já utilizado.");
   // Existing client profiles must be linked by an administrator; registration never claims them by email alone.
   if(db.queryForObject("select count(*) from cliente where lower(email)=?",Long.class,email)>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Este cadastro já existe. Solicite à barbearia a criação do seu acesso.");
   Long cliente=db.queryForObject("insert into cliente(nome,email) values (?,?) returning id",Long.class,r.nome().strip(),email);
   db.update("insert into usuario(nome,email,senha_hash,cliente_id) values (?,?,?,?)",r.nome().strip(),email,encoder.encode(r.senha()),cliente);
 }
}
