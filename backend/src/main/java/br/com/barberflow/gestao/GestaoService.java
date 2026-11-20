package br.com.barberflow.gestao;

import br.com.barberflow.barbearia.*;
import br.com.barberflow.dominio.*;
import br.com.barberflow.shared.*;
import br.com.barberflow.gestao.Entradas.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly=true)
public class GestaoService {
    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;
    private final br.com.barberflow.acesso.HorariosService horarios;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    private final BarbeariaRepository lojas;
    private final ClienteRepository clientes;
    private final VinculoRepository vinculos;
    private final BarbeiroRepository barbeiros;
    private final ServicoRepository servicos;
    private final PlanoRepository planos;
    private final AgendamentoRepository agendamentos;
    private final AssinaturaRepository assinaturas;

    public GestaoService(BarbeariaRepository lojas, ClienteRepository clientes, VinculoRepository vinculos,
            BarbeiroRepository barbeiros, ServicoRepository servicos, PlanoRepository planos,
            AgendamentoRepository agendamentos, AssinaturaRepository assinaturas, br.com.barberflow.acesso.HorariosService horarios, org.springframework.jdbc.core.JdbcTemplate jdbc) {
        this.horarios=horarios;this.jdbc=jdbc;
        this.lojas=lojas; this.clientes=clientes; this.vinculos=vinculos; this.barbeiros=barbeiros;
        this.servicos=servicos; this.planos=planos; this.agendamentos=agendamentos; this.assinaturas=assinaturas;
    }

    public Cliente cliente(Long id) { return clientes.findById(id).orElseThrow(() -> ausente("Cliente")); }
    public Barbeiro barbeiro(Long id) { return barbeiros.findById(id).orElseThrow(() -> ausente("Barbeiro")); }
    public Servico servico(Long id) { return servicos.findById(id).orElseThrow(() -> ausente("Serviço")); }
    public Plano plano(Long id) { return planos.findById(id).orElseThrow(() -> ausente("Plano")); }
    public Agendamento agendamento(Long id) { return agendamentos.findById(id).orElseThrow(() -> ausente("Agendamento")); }
    public Assinatura assinatura(Long id) { return assinaturas.findById(id).orElseThrow(() -> ausente("Assinatura")); }
    public List<Cliente> clientes(Long loja) {
        if(loja==null) return clientes.findAll(Sort.by("nome", "id"));
        existeLoja(loja);
        var ids=vinculos.findByBarbeariaIdOrderById(loja).stream().map(Vinculo::getClienteId).toList();
        return clientes.findAllById(ids).stream().sorted(Comparator.comparing(Cliente::getNome).thenComparing(Cliente::getId)).toList();
    }
    public List<Vinculo> vinculos(Long loja) { existeLoja(loja); return vinculos.findByBarbeariaIdOrderById(loja); }
    public List<Barbeiro> barbeiros(Long loja) { existeLoja(loja); return barbeiros.findByBarbeariaIdOrderById(loja); }
    public List<Servico> servicos(Long loja) { existeLoja(loja); return servicos.findByBarbeariaIdOrderById(loja); }
    public List<Plano> planos(Long loja) { existeLoja(loja); return planos.findByBarbeariaIdOrderById(loja); }
    public List<Agendamento> agendamentos(Long loja, LocalDate de, LocalDate ate, StatusAgendamento status) {
        existeLoja(loja); periodo(de,ate);
        return agendamentos.findByBarbeariaIdOrderByInicioDesc(loja).stream()
            .filter(a -> (de==null || !a.getInicio().toLocalDate().isBefore(de))
                && (ate==null || !a.getInicio().toLocalDate().isAfter(ate)) && (status==null || a.getStatus()==status)).toList();
    }
    public List<Assinatura> assinaturas(Long loja) {
        existeLoja(loja);
        var ids=planos.findByBarbeariaIdOrderById(loja).stream().map(Plano::getId).collect(java.util.stream.Collectors.toSet());
        return assinaturas.findAll(Sort.by("id")).stream().filter(a -> ids.contains(a.getPlanoId())).toList();
    }

    @Transactional
    public Cliente salvarCliente(Long id, ClienteInput r) {
        Cliente c=id==null ? new Cliente(r.nome(),r.telefone(),r.email()) : cliente(id);
        c.atualizar(r.nome(),r.telefone(),r.email());
        return clientes.saveAndFlush(c);
    }
    @Transactional
    public Cliente cadastrarNaLoja(Long loja, Long id, ClienteCadastro r) {
        bloquear(loja);
        if(id!=null) vinculos.findByClienteIdAndBarbeariaId(id,loja)
            .orElseThrow(() -> new RegraNegocioException("O cliente não possui vínculo com esta barbearia."));
        Cliente c=salvarCliente(id,new ClienteInput(r.nome(),r.telefone(),r.email()));
        vincular(loja,new VinculoInput(c.getId(),r.status()));
        return c;
    }

    @Transactional
    public Vinculo vincular(Long loja, VinculoInput r) {
        var b=bloquear(loja);
        cliente(r.clienteId());
        if(r.status()==StatusCadastro.ATIVO) exigir(b.isAtiva(),"Ative a barbearia antes de vincular clientes.");
        Vinculo v=vinculos.findByClienteIdAndBarbeariaId(r.clienteId(),loja)
            .orElseGet(() -> new Vinculo(r.clienteId(),loja,r.status()));
        v.atualizar(r.clienteId(),loja,r.status());
        return vinculos.saveAndFlush(v);
    }
    @Transactional
    public Barbeiro salvarBarbeiro(Long id, BarbeiroInput r) {
        var b=bloquear(r.barbeariaId());
        if(r.status()==StatusCadastro.ATIVO) exigir(b.isAtiva(),"Ative a barbearia primeiro.");
        Barbeiro v=id==null ? new Barbeiro(r.barbeariaId(),r.nome(),r.status()) : barbeiro(id);
        mesmaLoja(v.getBarbeariaId(),r.barbeariaId());
        v.atualizar(r.barbeariaId(),r.nome(),r.status());
        v=barbeiros.saveAndFlush(v);
        if(id==null)jdbc.update("insert into expediente(barbeiro_id,dia_semana,inicio,fim) select ?,d,'09:00'::time,'18:00'::time from generate_series(1,6) d",v.getId());
        return v;
    }
    @Transactional
    public Servico salvarServico(Long id, ServicoInput r) {
        var b=bloquear(r.barbeariaId());
        if(r.status()==StatusCadastro.ATIVO) exigir(b.isAtiva(),"Ative a barbearia primeiro.");
        Servico v=id==null ? new Servico(r.barbeariaId(),r.nome(),r.preco(),r.duracaoMin(),r.status()) : servico(id);
        mesmaLoja(v.getBarbeariaId(),r.barbeariaId());
        v.atualizar(r.barbeariaId(),r.nome(),r.preco(),r.duracaoMin(),r.status());
        return servicos.saveAndFlush(v);
    }
    @Transactional
    public Plano salvarPlano(Long id, PlanoInput r) {
        var b=bloquear(r.barbeariaId());
        if(r.status()==StatusCadastro.ATIVO) exigir(b.isAtiva(),"Ative a barbearia primeiro.");
        Plano v=id==null ? new Plano(r.barbeariaId(),r.nome(),r.preco(),r.status()) : plano(id);
        mesmaLoja(v.getBarbeariaId(),r.barbeariaId());
        v.atualizar(r.barbeariaId(),r.nome(),r.preco(),r.status());
        if (r.servicoIds() != null) {
            for (Long servicoId : r.servicoIds()) mesmaLoja(servico(servicoId).getBarbeariaId(), r.barbeariaId());
            v.definirServicos(r.servicoIds());
        }
        return planos.saveAndFlush(v);
    }
    @Transactional
    public Agendamento salvarAgendamento(Long id, AgendamentoInput r) {
        return salvarAgendamento(id, r, null);
    }

    @Transactional
    public Agendamento salvarAgendamento(Long id, AgendamentoInput r, Long assinaturaSolicitada) {
        var loja=bloquear(r.barbeariaId());
        var profissional=barbeiro(r.barbeiroId());
        var servico=servico(r.servicoId());
        cliente(r.clienteId());
        mesmaLoja(profissional.getBarbeariaId(),r.barbeariaId());
        mesmaLoja(servico.getBarbeariaId(),r.barbeariaId());
        var vinculo=vinculos.findByClienteIdAndBarbeariaId(r.clienteId(),r.barbeariaId())
            .orElseThrow(() -> new RegraNegocioException("Vincule o cliente à barbearia antes de agendar."));
        Agendamento anterior=id==null ? null : agendamento(id);
        if(anterior!=null) entityManager.refresh(anterior);
        if(anterior!=null) mesmaLoja(anterior.getBarbeariaId(),r.barbeariaId());
        Long assinaturaId = anterior == null ? assinaturaSolicitada : anterior.getAssinaturaId();
        exigir(assinaturaSolicitada == null || Objects.equals(assinaturaSolicitada, assinaturaId),
            "A modalidade de uma reserva existente não pode ser alterada.");
        if(anterior!=null && anterior.getStatus()==StatusAgendamento.CONCLUIDO) {
            exigir(anterior.getClienteId().equals(r.clienteId()) && anterior.getBarbeiroId().equals(r.barbeiroId()) && anterior.getServicoId().equals(r.servicoId()) && anterior.getInicio().equals(r.inicio()) && r.status()==StatusAgendamento.CONCLUIDO,"Atendimentos concluídos não podem ser alterados ou reabertos.");
            return anterior;
        }
        boolean mudou=anterior==null || !anterior.getInicio().equals(r.inicio())
            || !anterior.getClienteId().equals(r.clienteId()) || !anterior.getBarbeiroId().equals(r.barbeiroId())
            || !anterior.getServicoId().equals(r.servicoId());
        boolean reativou=anterior!=null && anterior.getStatus()==StatusAgendamento.CANCELADO && r.status()!=StatusAgendamento.CANCELADO;
        if(mudou || reativou) {
            exigir(r.inicio().isAfter(HorarioLocal.agora()),"Escolha um horário futuro.");
            exigir(loja.isAtiva(),"A barbearia está inativa.");
            exigir(vinculo.getStatus()==StatusCadastro.ATIVO,"O vínculo do cliente está inativo.");
            exigir(profissional.getStatus()==StatusCadastro.ATIVO,"O barbeiro está inativo.");
            exigir(servico.getStatus()==StatusCadastro.ATIVO,"O serviço está inativo.");
        }
        // Status-only updates preserve the duration originally booked.
        LocalDateTime fim=mudou ? r.inicio().plusMinutes(servico.getDuracaoMin()) : anterior.getFim();
        if((mudou || reativou) && r.status()!=StatusAgendamento.CANCELADO)
            exigir(horarios.disponivel(r.barbeiroId(),r.inicio(),fim),"O horário está fora do expediente ou possui um bloqueio.");
        if(r.status()!=StatusAgendamento.CANCELADO) {
            exigir(agendamentos.conflitos(r.barbeiroId(),r.inicio(),fim,id)==0,
                "O barbeiro já possui um agendamento nesse intervalo.");
            if (assinaturaId != null && (mudou || reativou)) {
                validarCobertura(assinaturaId, r, fim.toLocalDate());
            }
        }
        boolean novoServico=anterior==null || !anterior.getServicoId().equals(r.servicoId());
        Agendamento a=anterior==null ? new Agendamento(r.barbeariaId(),r.clienteId(),r.barbeiroId(),r.servicoId(),r.inicio(),fim,r.status()) : anterior;
        a.atualizar(r.barbeariaId(),r.clienteId(),r.barbeiroId(),r.servicoId(),r.inicio(),fim,r.status());
        if (assinaturaId != null) a.usarAssinatura(assinaturaId);
        else if (novoServico) a.combinarValor(servico.getPreco());
        if(r.status()==StatusAgendamento.CONCLUIDO)a.concluir();
        return agendamentos.saveAndFlush(a);
    }

    private void validarCobertura(Long id, AgendamentoInput r, LocalDate termino) {
        var assinatura = assinatura(id);
        var plano = plano(assinatura.getPlanoId());
        exigir(assinatura.getClienteId().equals(r.clienteId()) && plano.getBarbeariaId().equals(r.barbeariaId()),
            "A assinatura não está disponível para este cliente nesta unidade.");
        exigir(assinatura.getStatus() == StatusAssinatura.ATIVA && !r.inicio().toLocalDate().isBefore(assinatura.getDataInicio())
            && (assinatura.getDataFim() == null || !termino.isAfter(assinatura.getDataFim())),
            "A assinatura precisa estar ativa e cobrir o período do atendimento.");
        exigir(plano.getServicoIds().contains(r.servicoId()), "Este serviço não está incluído no plano.");
    }

    @Transactional
    public Assinatura solicitarAssinatura(Long lojaId, Long clienteId, Long planoId) {
        var loja = bloquear(lojaId);
        var plano = plano(planoId);
        mesmaLoja(plano.getBarbeariaId(), lojaId);
        var hoje = HorarioLocal.agora().toLocalDate();
        var existentes = assinaturas.findByClienteIdAndPlanoId(clienteId, planoId);
        var pendente = existentes.stream().filter(a -> a.getStatus() == StatusAssinatura.PENDENTE).findFirst();
        if (pendente.isPresent()) return pendente.get();
        exigir(loja.isAtiva() && plano.getStatus() == StatusCadastro.ATIVO, "Este plano não está disponível para adesão.");
        exigirServicoDisponivel(plano);
        exigir(existentes.stream().noneMatch(a -> a.getStatus() == StatusAssinatura.ATIVA &&
            (a.getDataFim() == null || !a.getDataFim().isBefore(hoje))), "Você já tem uma assinatura deste plano.");
        var vinculo = vinculos.findByClienteIdAndBarbeariaId(clienteId, lojaId);
        if (vinculo.isEmpty()) vincular(lojaId, new VinculoInput(clienteId, StatusCadastro.ATIVO));
        else exigir(vinculo.get().getStatus() == StatusCadastro.ATIVO, "O vínculo do cliente está inativo.");
        return assinaturas.saveAndFlush(new Assinatura(clienteId, planoId, hoje, null, StatusAssinatura.PENDENTE));
    }

    private void exigirServicoDisponivel(Plano plano) {
        exigir(servicos(plano.getBarbeariaId()).stream()
            .anyMatch(s -> s.getStatus() == StatusCadastro.ATIVO && plano.getServicoIds().contains(s.getId())),
            "O plano precisa ter pelo menos um serviço disponível.");
    }

    @Transactional
    public Assinatura cancelarAssinatura(Long id, Long clienteId) {
        var a = assinatura(id);
        if (!a.getClienteId().equals(clienteId)) throw ausente("Assinatura");
        bloquear(plano(a.getPlanoId()).getBarbeariaId());
        entityManager.refresh(a);
        if (!a.getClienteId().equals(clienteId)) throw ausente("Assinatura");
        if (a.getStatus() == StatusAssinatura.CANCELADA) return a;
        exigir(a.getStatus() == StatusAssinatura.PENDENTE || a.getStatus() == StatusAssinatura.ATIVA,
            "Esta assinatura já foi encerrada.");
        protegerReservasDaAssinatura(a, a.getClienteId(), a.getPlanoId(), a.getDataInicio(), a.getDataFim(), StatusAssinatura.CANCELADA);
        a.atualizar(a.getClienteId(), a.getPlanoId(), a.getDataInicio(), a.getDataFim(), StatusAssinatura.CANCELADA);
        return assinaturas.saveAndFlush(a);
    }

    private void protegerReservasDaAssinatura(Assinatura a, Long clienteId, Long planoId,
            LocalDate inicio, LocalDate fim, StatusAssinatura status) {
        if (!a.getClienteId().equals(clienteId) || !a.getPlanoId().equals(planoId)) {
            exigir(!agendamentos.existsByAssinaturaId(a.getId()), "Uma assinatura usada em reservas não pode trocar de cliente ou plano.");
        }
        var futuras = agendamentos.findByAssinaturaIdAndInicioAfterAndStatusIn(a.getId(), HorarioLocal.agora(),
            List.of(StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO));
        exigir(futuras.stream().allMatch(reserva -> status == StatusAssinatura.ATIVA
            && !reserva.getInicio().toLocalDate().isBefore(inicio)
            && (fim == null || !reserva.getFim().toLocalDate().isAfter(fim))),
            "Cancele ou remarque os agendamentos futuros do plano antes de encerrar ou reduzir a vigência.");
    }
    @Transactional
    public Assinatura salvarAssinatura(Long id, AssinaturaInput r) {
        Plano plano=plano(r.planoId());
        var loja=bloquear(plano.getBarbeariaId());
        // Reload after the lock to observe a concurrent plan status change.
        entityManager.refresh(plano);
        cliente(r.clienteId());
        periodo(r.dataInicio(),r.dataFim());
        Assinatura a=id==null ? null : assinatura(id);
        if (a != null) {
            entityManager.refresh(a);
            mesmaLoja(plano(a.getPlanoId()).getBarbeariaId(), plano.getBarbeariaId());
            exigir(a.getStatus() != StatusAssinatura.CANCELADA || r.status() == StatusAssinatura.CANCELADA,
                "Uma assinatura cancelada não pode ser reativada. Crie outra assinatura.");
            if (a.getStatus() == StatusAssinatura.PENDENTE) {
                exigir(a.getClienteId().equals(r.clienteId()) && a.getPlanoId().equals(r.planoId()),
                    "A solicitação deve manter o cliente e o plano originais.");
                if (r.status() == StatusAssinatura.ATIVA) {
                    exigirServicoDisponivel(plano);
                    exigir(r.dataFim() == null || !r.dataFim().isBefore(HorarioLocal.agora().toLocalDate()),
                        "A vigência da adesão não pode terminar no passado.");
                }
            }
            protegerReservasDaAssinatura(a, r.clienteId(), r.planoId(), r.dataInicio(), r.dataFim(), r.status());
        }
        var vinculo=vinculos.findByClienteIdAndBarbeariaId(r.clienteId(),plano.getBarbeariaId())
            .orElseThrow(() -> new RegraNegocioException("Vincule o cliente à barbearia responsável pelo plano."));
        if(r.status()==StatusAssinatura.ATIVA) {
            exigir(loja.isAtiva(),"A barbearia está inativa.");
            exigir(plano.getStatus()==StatusCadastro.ATIVO,"O plano está inativo.");
            exigir(vinculo.getStatus()==StatusCadastro.ATIVO,"O vínculo do cliente está inativo.");
        }
        if(a==null) a=new Assinatura(r.clienteId(),r.planoId(),r.dataInicio(),r.dataFim(),r.status());
        a.atualizar(r.clienteId(),r.planoId(),r.dataInicio(),r.dataFim(),r.status());
        return assinaturas.saveAndFlush(a);
    }
    public Map<String,Object> disponibilidade(Long loja,Long barbeiroId,Long servicoId,LocalDateTime inicio,Long ignorar) {
        existeLoja(loja);
        var b=barbeiro(barbeiroId); var s=servico(servicoId);
        mesmaLoja(b.getBarbeariaId(),loja); mesmaLoja(s.getBarbeariaId(),loja);
        if(ignorar!=null) mesmaLoja(agendamento(ignorar).getBarbeariaId(),loja);
        var fim=inicio.plusMinutes(s.getDuracaoMin());
        boolean livre=inicio.isAfter(HorarioLocal.agora()) && lojas.findById(loja).orElseThrow().isAtiva() && b.getStatus()==StatusCadastro.ATIVO
            && s.getStatus()==StatusCadastro.ATIVO && horarios.disponivel(barbeiroId,inicio,fim) && agendamentos.conflitos(barbeiroId,inicio,fim,ignorar)==0;
        return Map.of("disponivel",livre,"inicio",inicio,"fim",fim);
    }
    public List<Map<String,Object>> horariosDisponiveis(Long loja,Long barbeiroId,Long servicoId,LocalDate dia,Long ignorar) {
        existeLoja(loja);
        var b=barbeiro(barbeiroId); var s=servico(servicoId);
        mesmaLoja(b.getBarbeariaId(),loja); mesmaLoja(s.getBarbeariaId(),loja);
        if(ignorar!=null) mesmaLoja(agendamento(ignorar).getBarbeariaId(),loja);
        if(!lojas.findById(loja).orElseThrow().isAtiva() || b.getStatus()!=StatusCadastro.ATIVO || s.getStatus()!=StatusCadastro.ATIVO) return List.of();
        var faixas=horarios.faixas(barbeiroId).stream().filter(f->f.diaSemana()==dia.getDayOfWeek().getValue()).toList();
        if(faixas.isEmpty()) return List.of();
        // Read the day's occupied intervals once, instead of querying the database for every candidate.
        var ocupados=jdbc.query("""
            select inicio,fim from bloqueio where barbeiro_id=? and inicio<? and fim>?
            union all
            select inicio,fim from agendamento where barbeiro_id=? and inicio<? and fim>?
              and status<>'CANCELADO' and (cast(? as bigint) is null or id<>?)
            """,(rs,n)->new LocalDateTime[]{rs.getObject(1,LocalDateTime.class),rs.getObject(2,LocalDateTime.class)},
            barbeiroId,dia.plusDays(1).atStartOfDay(),dia.atStartOfDay(),
            barbeiroId,dia.plusDays(1).atStartOfDay(),dia.atStartOfDay(),ignorar,ignorar);
        var agora=HorarioLocal.agora();
        var out=new ArrayList<Map<String,Object>>();
        for(int minute=0;minute<1440;minute+=15){
            var inicio=dia.atStartOfDay().plusMinutes(minute);var fim=inicio.plusMinutes(s.getDuracaoMin());
            boolean cabe=dia.equals(fim.toLocalDate()) && faixas.stream().anyMatch(f->!inicio.toLocalTime().isBefore(f.inicio())&&!fim.toLocalTime().isAfter(f.fim()));
            if(inicio.isAfter(agora) && cabe && ocupados.stream().noneMatch(o->inicio.isBefore(o[1])&&fim.isAfter(o[0])))
                out.add(Map.of("disponivel",true,"inicio",inicio,"fim",fim));
        }
        return out;
    }
    private void existeLoja(Long id) { if(!lojas.existsById(id)) throw ausente("Barbearia"); }
    private Barbearia bloquear(Long id) { return lojas.bloquear(id).orElseThrow(() -> ausente("Barbearia")); }
    private void mesmaLoja(Long a,Long b) { exigir(a.equals(b),"Os recursos devem pertencer à mesma barbearia. O vínculo de origem não pode ser alterado."); }
    private void periodo(LocalDate de,LocalDate ate) { exigir(de==null || ate==null || !ate.isBefore(de),"A data final não pode ser anterior à inicial."); }
    private void exigir(boolean condicao,String mensagem) { if(!condicao) throw new RegraNegocioException(mensagem); }
    private RecursoNaoEncontradoException ausente(String recurso) { return new RecursoNaoEncontradoException(recurso+" não encontrado(a)."); }
}
