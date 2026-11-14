package br.com.barberflow.acesso;
import java.time.*;
import java.util.*;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.com.barberflow.barbearia.BarbeariaRepository;
import br.com.barberflow.dominio.BarbeiroRepository;
import br.com.barberflow.shared.*;

@Service
public class HorariosService {
 private final JdbcTemplate db;private final Acesso acesso;private final BarbeariaRepository lojas;private final BarbeiroRepository barbeiros;
 public HorariosService(JdbcTemplate db,Acesso acesso,BarbeariaRepository lojas,BarbeiroRepository barbeiros){this.db=db;this.acesso=acesso;this.lojas=lojas;this.barbeiros=barbeiros;}
 public record Faixa(@Min(1) @Max(7) int diaSemana,@NotNull LocalTime inicio,@NotNull LocalTime fim){}
 public record BloqueioInput(@NotNull LocalDateTime inicio,@NotNull LocalDateTime fim,@NotBlank @Size(max=200) String motivo){}
 private Long loja(Long id){return barbeiros.findById(id).orElseThrow(()->new RecursoNaoEncontradoException("Barbeiro não encontrado.")).getBarbeariaId();}
 public Map<String,Object> consultar(Long id){Long loja=loja(id);if(!acesso.admin(loja)&&!Objects.equals(acesso.profissional(loja),id))acesso.negar();return Map.of("expediente",faixas(id),"bloqueios",db.queryForList("select id,inicio,fim,motivo from bloqueio where barbeiro_id=? order by inicio",id));}
 public List<Faixa> faixas(Long id){return db.query("select dia_semana,inicio,fim from expediente where barbeiro_id=? order by dia_semana,inicio",(rs,n)->new Faixa(rs.getInt(1),rs.getObject(2,LocalTime.class),rs.getObject(3,LocalTime.class)),id);}
 private boolean cabe(List<Faixa> faixas,LocalDateTime inicio,LocalDateTime fim){return inicio.toLocalDate().equals(fim.toLocalDate())&&faixas.stream().anyMatch(f->f.diaSemana()==inicio.getDayOfWeek().getValue()&&!inicio.toLocalTime().isBefore(f.inicio())&&!fim.toLocalTime().isAfter(f.fim()));}
 public boolean disponivel(Long profissional,LocalDateTime inicio,LocalDateTime fim){return cabe(faixas(profissional),inicio,fim)&&db.queryForObject("select count(*) from bloqueio where barbeiro_id=? and inicio<? and fim>?",Long.class,profissional,fim,inicio)==0;}
 @Transactional public void expediente(Long id,List<Faixa> faixas){
   Long loja=loja(id);acesso.exigirAdmin(loja);lojas.bloquear(loja).orElseThrow();
   if(faixas.size()>42)throw new RegraNegocioException("Informe no máximo 42 intervalos semanais.");
   for(int i=0;i<faixas.size();i++){var a=faixas.get(i);if(!a.fim().isAfter(a.inicio()))throw new RegraNegocioException("O término deve ser posterior ao início.");for(int k=0;k<i;k++){var b=faixas.get(k);if(a.diaSemana()==b.diaSemana()&&a.inicio().isBefore(b.fim())&&a.fim().isAfter(b.inicio()))throw new RegraNegocioException("Os intervalos de expediente não podem se sobrepor.");}}
   var reservas=db.query("select inicio,fim from agendamento where barbeiro_id=? and inicio>=? and status in ('AGENDADO','CONFIRMADO')",(rs,n)->new LocalDateTime[]{rs.getObject(1,LocalDateTime.class),rs.getObject(2,LocalDateTime.class)},id,LocalDateTime.now());
   if(reservas.stream().anyMatch(a->!cabe(faixas,a[0],a[1])))throw new RegraNegocioException("Existem reservas futuras fora do novo expediente. Remarque ou cancele esses atendimentos antes de alterar os horários.");
   db.update("delete from expediente where barbeiro_id=?",id);for(var f:faixas)db.update("insert into expediente(barbeiro_id,dia_semana,inicio,fim) values (?,?,?,?)",id,f.diaSemana(),f.inicio(),f.fim());
 }
 @Transactional public void bloquear(Long id,BloqueioInput r){Long loja=loja(id);acesso.exigirAdmin(loja);lojas.bloquear(loja).orElseThrow();if(!r.fim().isAfter(r.inicio()))throw new RegraNegocioException("Período inválido.");if(db.queryForObject("select count(*) from agendamento where barbeiro_id=? and inicio<? and fim>? and status in ('AGENDADO','CONFIRMADO')",Long.class,id,r.fim(),r.inicio())>0)throw new RegraNegocioException("Há reservas neste período. Resolva-as antes de bloquear a agenda.");db.update("insert into bloqueio(barbeiro_id,inicio,fim,motivo) values (?,?,?,?)",id,r.inicio(),r.fim(),r.motivo().strip());}
 @Transactional public void desbloquear(Long id,Long bloqueio){Long loja=loja(id);acesso.exigirAdmin(loja);lojas.bloquear(loja).orElseThrow();if(db.update("delete from bloqueio where id=? and barbeiro_id=?",bloqueio,id)==0)throw new RecursoNaoEncontradoException("Bloqueio não encontrado.");}
}
