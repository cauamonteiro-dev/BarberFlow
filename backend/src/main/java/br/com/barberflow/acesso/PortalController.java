package br.com.barberflow.acesso;
import java.time.*;
import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import br.com.barberflow.gestao.*;
import br.com.barberflow.dominio.*;
import br.com.barberflow.shared.*;
import br.com.barberflow.barbearia.BarbeariaRepository;

@RestController @RequestMapping("/api/portal")
public class PortalController {
 private final Acesso acesso;private final JdbcTemplate db;private final GestaoService service;private final BarbeariaRepository lojas;
 public PortalController(Acesso a,JdbcTemplate d,GestaoService s,BarbeariaRepository l){acesso=a;db=d;service=s;lojas=l;}
 @GetMapping("/barbearias") public Object lojas(){var c=acesso.conta();if(c.clienteId()!=null)return db.queryForList("select id,nome,ativa from barbearia where ativa=true order by nome");return db.queryForList("select distinct b.id,b.nome,b.ativa from barbearia b join permissao p on p.barbearia_id=b.id where p.usuario_id=? order by b.nome",c.id());}
 private Long profissional(Long loja,String perfil){if(perfil.equals("BARBEIRO")){var id=acesso.profissional(loja);if(id==null)acesso.negar();return id;}if(!perfil.equals("CLIENTE")||acesso.conta().clienteId()==null)acesso.negar();return null;}
 @GetMapping("/painel") public Object painel(@RequestParam Long barbeariaId,@RequestParam String perfil){
   Long barbeiro=profissional(barbeariaId,perfil);Long cliente=acesso.conta().clienteId();
   var agenda=service.agendamentos(barbeariaId,null,null,null).stream().filter(a->barbeiro!=null?a.getBarbeiroId().equals(barbeiro):a.getClienteId().equals(cliente)).toList();
   var ids=agenda.stream().map(Agendamento::getClienteId).distinct().toList();
   var clientes=barbeiro==null?List.of(service.cliente(cliente)):ids.stream().map(service::cliente).toList();
   return Map.of("agendamentos",agenda,"clientes",clientes,"barbeiros",service.barbeiros(barbeariaId).stream().filter(b->barbeiro!=null?b.getId().equals(barbeiro):b.getStatus()==StatusCadastro.ATIVO).toList(),"servicos",service.servicos(barbeariaId).stream().filter(s->s.getStatus()==StatusCadastro.ATIVO||agenda.stream().anyMatch(a->a.getServicoId().equals(s.getId()))).toList(),"assinaturas",barbeiro==null?service.assinaturas(barbeariaId).stream().filter(a->a.getClienteId().equals(cliente)).toList():List.of());
 }
 @GetMapping("/horarios-disponiveis") public Object slots(@RequestParam Long barbeariaId,@RequestParam Long barbeiroId,@RequestParam Long servicoId,@RequestParam LocalDate dia,@RequestParam(required=false) Long ignorarId){
   if(acesso.conta().clienteId()==null&&!Objects.equals(acesso.profissional(barbeariaId),barbeiroId))acesso.negar();
   if(ignorarId!=null){var a=service.agendamento(ignorarId);acesso.cliente(a.getClienteId());if(!a.getBarbeariaId().equals(barbeariaId))acesso.negar();}
   if(dia.isBefore(LocalDate.now()) || dia.isAfter(LocalDate.now().plusYears(1)))return List.of();
   var out=new ArrayList<Map<String,Object>>();for(int minute=0;minute<1440;minute+=15){var inicio=dia.atStartOfDay().plusMinutes(minute);if(inicio.isAfter(LocalDateTime.now())){var slot=service.disponibilidade(barbeariaId,barbeiroId,servicoId,inicio,ignorarId);if(Boolean.TRUE.equals(slot.get("disponivel")))out.add(slot);}}return out;
 }
 public record Reserva(@NotNull Long barbeariaId,@NotNull Long barbeiroId,@NotNull Long servicoId,@NotNull LocalDateTime inicio,@NotNull StatusAgendamento status,java.math.BigDecimal valorEsperado){}
 @PostMapping("/agendamentos") @Transactional public Object reservar(@Valid @RequestBody Reserva r){return salvar(null,r);}
 @PutMapping("/agendamentos/{id}") @Transactional public Object remarcar(@PathVariable Long id,@Valid @RequestBody Reserva r){return salvar(id,r);}
 private Object salvar(Long id,Reserva r){
   Long cliente=acesso.conta().clienteId();if(cliente==null)acesso.negar();
   lojas.bloquear(r.barbeariaId()).orElseThrow(()->new RecursoNaoEncontradoException("Barbearia não encontrada."));
   if(r.status()!=StatusAgendamento.AGENDADO&&r.status()!=StatusAgendamento.CANCELADO)acesso.negar();
   if(id==null&&r.status()!=StatusAgendamento.AGENDADO)throw new RegraNegocioException("Crie o agendamento antes de cancelá-lo.");
   if(id!=null){var a=service.agendamento(id);acesso.cliente(a.getClienteId());if(!a.getBarbeariaId().equals(r.barbeariaId()))acesso.negar();if(!a.getInicio().isAfter(LocalDateTime.now())||a.getStatus()==StatusAgendamento.CONCLUIDO||a.getStatus()==StatusAgendamento.CANCELADO)throw new RegraNegocioException("Só é possível alterar reservas futuras em aberto.");if(r.status()==StatusAgendamento.CANCELADO&&(!a.getInicio().equals(r.inicio())||!a.getBarbeiroId().equals(r.barbeiroId())||!a.getServicoId().equals(r.servicoId())))throw new RegraNegocioException("Cancele a reserva sem alterar seus dados.");}
   if(r.status()!=StatusAgendamento.CANCELADO&&!r.inicio().isAfter(LocalDateTime.now()))throw new RegraNegocioException("Escolha um horário futuro.");
   // A first booking creates the active shop association, never reactivates an administrative block.
   if(id==null&&db.queryForObject("select count(*) from cliente_barbearia where cliente_id=? and barbearia_id=?",Long.class,cliente,r.barbeariaId())==0)service.vincular(r.barbeariaId(),new Entradas.VinculoInput(cliente,StatusCadastro.ATIVO));
   if(r.status()!=StatusAgendamento.CANCELADO && (id==null || !service.agendamento(id).getServicoId().equals(r.servicoId()))) {
     var preco=service.servico(r.servicoId()).getPreco();
     if(r.valorEsperado()==null || r.valorEsperado().compareTo(preco)!=0)throw new RegraNegocioException("O preço do serviço foi atualizado. Confira o valor e tente novamente.");
   }
   return service.salvarAgendamento(id,new Entradas.AgendamentoInput(r.barbeariaId(),cliente,r.barbeiroId(),r.servicoId(),r.inicio(),r.status()));
 }
 public record Situacao(@NotNull StatusAgendamento status){}
 @PutMapping("/atendimentos/{id}") @Transactional public Object atender(@PathVariable Long id,@Valid @RequestBody Situacao r){var a=service.agendamento(id);lojas.bloquear(a.getBarbeariaId()).orElseThrow();if(!Objects.equals(acesso.profissional(a.getBarbeariaId()),a.getBarbeiroId()))acesso.negar();if(r.status()!=StatusAgendamento.CONFIRMADO&&r.status()!=StatusAgendamento.CONCLUIDO)acesso.negar();if(a.getStatus()==StatusAgendamento.CANCELADO||a.getStatus()==StatusAgendamento.CONCLUIDO)throw new RegraNegocioException("O atendimento já foi encerrado.");if(r.status()==StatusAgendamento.CONCLUIDO&&a.getInicio().isAfter(LocalDateTime.now()))throw new RegraNegocioException("O atendimento ainda não começou.");return service.salvarAgendamento(id,new Entradas.AgendamentoInput(a.getBarbeariaId(),a.getClienteId(),a.getBarbeiroId(),a.getServicoId(),a.getInicio(),r.status()));}
 @GetMapping("/disponibilidade") public Object disponibilidade(@RequestParam Long barbeariaId,@RequestParam Long barbeiroId,@RequestParam Long servicoId,@RequestParam LocalDateTime inicio){if(acesso.conta().clienteId()==null&&!Objects.equals(acesso.profissional(barbeariaId),barbeiroId))acesso.negar();return service.disponibilidade(barbeariaId,barbeiroId,servicoId,inicio,null);}
}
