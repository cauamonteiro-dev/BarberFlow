package br.com.barberflow.acesso;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class Acesso {
 private final JdbcTemplate db;
 public Acesso(JdbcTemplate db){this.db=db;}
 public record Conta(long id,String nome,String email,Long clienteId){}
 public Conta conta(){
   var auth=SecurityContextHolder.getContext().getAuthentication();
   if(auth==null || !auth.isAuthenticated()) throw new AccessDeniedException("Faça login para continuar.");
   return db.query("select id,nome,email,cliente_id from usuario where email=? and ativo=true",(rs,n)->new Conta(rs.getLong(1),rs.getString(2),rs.getString(3),rs.getObject(4,Long.class)),auth.getName()).stream().findFirst().orElseThrow(()->new AccessDeniedException("Conta indisponível."));
 }
 public List<Map<String,Object>> papeis(){return db.queryForList("select barbearia_id,perfil,barbeiro_id from permissao where usuario_id=?",conta().id());}
 public boolean admin(Long loja){return loja!=null && db.queryForObject("select count(*) from permissao where usuario_id=? and barbearia_id=? and perfil='ADMIN'",Long.class,conta().id(),loja)>0;}
 public boolean algumAdmin(){return db.queryForObject("select count(*) from permissao where usuario_id=? and perfil='ADMIN'",Long.class,conta().id())>0;}
 public void exigirAdmin(Long loja){if(!admin(loja)) negar();}
 public void negar(){throw new AccessDeniedException("Você não tem permissão para esta operação.");}
 public Long profissional(Long loja){return db.query("select barbeiro_id from permissao where usuario_id=? and barbearia_id=? and perfil='BARBEIRO'",(rs,n)->rs.getLong(1),conta().id(),loja).stream().findFirst().orElse(null);}
 public void cliente(Long id){if(!Objects.equals(conta().clienteId(),id)) negar();}
}
