package br.com.barberflow.acesso;
import java.util.*;
import org.springframework.boot.*;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BootstrapAcesso implements ApplicationRunner {
 private final JdbcTemplate db;private final PasswordEncoder encoder;private final Environment env;
 public BootstrapAcesso(JdbcTemplate db,PasswordEncoder encoder,Environment env){this.db=db;this.encoder=encoder;this.env=env;}
 @Override @Transactional public void run(ApplicationArguments args){
   boolean demo=env.getProperty("barberflow.demo-acessos",Boolean.class,false);
   if(demo){
     Long admin=conta("Administrador de demonstração","admin@barberflow.local","BarberFlow!2026",null);
     for(Long loja:db.query("select id from barbearia",(rs,n)->rs.getLong(1)))db.update("insert into permissao(usuario_id,barbearia_id,perfil) values (?,?,'ADMIN') on conflict do nothing",admin,loja);
     var profissional=db.queryForList("select id,barbearia_id from barbeiro order by id limit 1");
     if(!profissional.isEmpty()){var p=profissional.getFirst();Long user=conta("Barbeiro de demonstração","barbeiro@barberflow.local","BarberFlow!2026",null);db.update("insert into permissao(usuario_id,barbearia_id,perfil,barbeiro_id) values (?,?,'BARBEIRO',?) on conflict do nothing",user,p.get("barbearia_id"),p.get("id"));}
     var cliente=db.query("select id from cliente order by id limit 1",(rs,n)->rs.getLong(1));if(!cliente.isEmpty())conta("Cliente de demonstração","cliente@barberflow.local","BarberFlow!2026",cliente.getFirst());
     return;
   }
   String email=env.getProperty("ADMIN_EMAIL"),senha=env.getProperty("ADMIN_PASSWORD");
   if(email==null||senha==null||db.queryForObject("select count(*) from permissao where perfil='ADMIN'",Long.class)>0)return;
   if(senha.length()<10||senha.length()>72)throw new IllegalArgumentException("ADMIN_PASSWORD deve conter de 10 a 72 caracteres.");
   Long loja=env.getProperty("ADMIN_SHOP_ID",Long.class);
   if(loja==null)loja=db.queryForObject("insert into barbearia(nome,ativa) values (?,true) returning id",Long.class,env.getProperty("ADMIN_SHOP_NAME","Minha barbearia"));
   Long user=conta("Administrador",email.toLowerCase(Locale.ROOT),senha,null);
   db.update("insert into permissao(usuario_id,barbearia_id,perfil) values (?,?,'ADMIN')",user,loja);
 }
 private Long conta(String nome,String email,String senha,Long cliente){var existente=db.query("select id from usuario where email=?",(rs,n)->rs.getLong(1),email);if(!existente.isEmpty())return existente.getFirst();return db.queryForObject("insert into usuario(nome,email,senha_hash,cliente_id) values (?,?,?,?) returning id",Long.class,nome,email,encoder.encode(senha),cliente);}
}
