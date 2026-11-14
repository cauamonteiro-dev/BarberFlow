package br.com.barberflow.acesso;
import java.util.*;
import br.com.barberflow.acesso.HorariosService.Faixa;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import br.com.barberflow.barbearia.BarbeariaRepository;
import br.com.barberflow.shared.*;

@RestController @RequestMapping("/api/administracao")
public class AdministracaoController {
 private final Acesso acesso;private final JdbcTemplate db;private final PasswordEncoder encoder;private final HorariosService horarios;private final BarbeariaRepository lojas;
 public AdministracaoController(Acesso a,JdbcTemplate d,PasswordEncoder e,HorariosService h,BarbeariaRepository l){acesso=a;db=d;encoder=e;horarios=h;lojas=l;}
 public record AgendaInput(@NotNull @Size(max=42) List<@Valid Faixa> faixas){}
 public record ContaInput(@NotBlank @Size(max=100) String nome,@NotBlank @Email @Size(max=120) String email,@Size(max=72) String senha,@NotBlank String perfil,Long barbeiroId,Long clienteId){}
 @GetMapping("/{loja}/acessos") public Object listar(@PathVariable Long loja){acesso.exigirAdmin(loja);return db.queryForList("select p.id,u.nome,u.email,p.perfil,p.barbeiro_id from permissao p join usuario u on u.id=p.usuario_id where p.barbearia_id=? union all select null,u.nome,u.email,'CLIENTE',null from usuario u join cliente_barbearia c on c.cliente_id=u.cliente_id where c.barbearia_id=? order by nome,perfil",loja,loja);}
 @PostMapping("/{loja}/acessos") @Transactional public void criar(@PathVariable Long loja,@Valid @RequestBody ContaInput r){
   acesso.exigirAdmin(loja);lojas.bloquear(loja).orElseThrow();
   if(!Set.of("ADMIN","BARBEIRO","CLIENTE").contains(r.perfil()))throw new RegraNegocioException("Perfil inválido.");
   if(r.perfil().equals("BARBEIRO")&&(r.barbeiroId()==null||db.queryForObject("select count(*) from barbeiro where id=? and barbearia_id=?",Long.class,r.barbeiroId(),loja)==0))acesso.negar();
   if(r.perfil().equals("CLIENTE")&&(r.clienteId()==null||db.queryForObject("select count(*) from cliente_barbearia where cliente_id=? and barbearia_id=?",Long.class,r.clienteId(),loja)==0))acesso.negar();
   String email=r.email().strip().toLowerCase(Locale.ROOT);
   Long id=db.query("select id from usuario where email=?",(rs,n)->rs.getLong(1),email).stream().findFirst().orElse(null);
   if(id==null){if(r.senha()==null||r.senha().length()<10||r.senha().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)throw new RegraNegocioException("Informe uma senha inicial com pelo menos 10 caracteres.");id=db.queryForObject("insert into usuario(nome,email,senha_hash,cliente_id) values (?,?,?,?) returning id",Long.class,r.nome().strip(),email,encoder.encode(r.senha()),r.perfil().equals("CLIENTE")?r.clienteId():null);}
   else if(r.perfil().equals("CLIENTE")) {Long atual=db.queryForObject("select cliente_id from usuario where id=?",Long.class,id);if(!Objects.equals(atual,r.clienteId()))throw new RegraNegocioException("O e-mail já pertence a outra conta. Não é possível assumir um cadastro existente.");}
   if(!r.perfil().equals("CLIENTE"))db.update("insert into permissao(usuario_id,barbearia_id,perfil,barbeiro_id) values (?,?,?,?) on conflict(usuario_id,barbearia_id,perfil) do nothing",id,loja,r.perfil(),r.perfil().equals("BARBEIRO")?r.barbeiroId():null);
 }
 @DeleteMapping("/{loja}/acessos/{id}") @Transactional public void remover(@PathVariable Long loja,@PathVariable Long id){acesso.exigirAdmin(loja);lojas.bloquear(loja).orElseThrow();var perfil=db.query("select perfil from permissao where id=? and barbearia_id=?",(rs,n)->rs.getString(1),id,loja).stream().findFirst().orElseThrow(()->new RecursoNaoEncontradoException("Acesso não encontrado."));if(perfil.equals("ADMIN")&&db.queryForObject("select count(*) from permissao where barbearia_id=? and perfil='ADMIN'",Long.class,loja)<=1)throw new RegraNegocioException("A barbearia precisa manter pelo menos um administrador.");db.update("delete from permissao where id=? and barbearia_id=?",id,loja);}
 @GetMapping("/barbeiros/{id}/horarios") public Object horarios(@PathVariable Long id){return horarios.consultar(id);}
 @PutMapping("/barbeiros/{id}/horarios") public void expediente(@PathVariable Long id,@Valid @RequestBody AgendaInput r){horarios.expediente(id,r.faixas());}
 @PostMapping("/barbeiros/{id}/bloqueios") public void bloquear(@PathVariable Long id,@Valid @RequestBody HorariosService.BloqueioInput r){horarios.bloquear(id,r);}
 @DeleteMapping("/barbeiros/{id}/bloqueios/{bloqueio}") public void desbloquear(@PathVariable Long id,@PathVariable Long bloqueio){horarios.desbloquear(id,bloqueio);}
}
