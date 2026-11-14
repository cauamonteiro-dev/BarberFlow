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
            AgendamentoRepository agendamentos, AssinaturaRepository assinaturas) {
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
        return barbeiros.saveAndFlush(v);
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
        return planos.saveAndFlush(v);
    }
    @Transactional
    public Agendamento salvarAgendamento(Long id, AgendamentoInput r) {
        var loja=bloquear(r.barbeariaId());
        var profissional=barbeiro(r.barbeiroId());
        var servico=servico(r.servicoId());
        cliente(r.clienteId());
        mesmaLoja(profissional.getBarbeariaId(),r.barbeariaId());
        mesmaLoja(servico.getBarbeariaId(),r.barbeariaId());
        var vinculo=vinculos.findByClienteIdAndBarbeariaId(r.clienteId(),r.barbeariaId())
            .orElseThrow(() -> new RegraNegocioException("Vincule o cliente à barbearia antes de agendar."));
        Agendamento anterior=id==null ? null : agendamento(id);
        if(anterior!=null) mesmaLoja(anterior.getBarbeariaId(),r.barbeariaId());
        boolean mudou=anterior==null || !anterior.getInicio().equals(r.inicio())
            || !anterior.getClienteId().equals(r.clienteId()) || !anterior.getBarbeiroId().equals(r.barbeiroId())
            || !anterior.getServicoId().equals(r.servicoId());
        boolean reativou=anterior!=null && anterior.getStatus()==StatusAgendamento.CANCELADO && r.status()!=StatusAgendamento.CANCELADO;
        if(mudou || reativou) {
            exigir(loja.isAtiva(),"A barbearia está inativa.");
            exigir(vinculo.getStatus()==StatusCadastro.ATIVO,"O vínculo do cliente está inativo.");
            exigir(profissional.getStatus()==StatusCadastro.ATIVO,"O barbeiro está inativo.");
            exigir(servico.getStatus()==StatusCadastro.ATIVO,"O serviço está inativo.");
        }
        // Status-only updates preserve the duration originally booked.
        LocalDateTime fim=mudou ? r.inicio().plusMinutes(servico.getDuracaoMin()) : anterior.getFim();
        if(r.status()!=StatusAgendamento.CANCELADO) {
            exigir(agendamentos.conflitos(r.barbeiroId(),r.inicio(),fim,id)==0,
                "O barbeiro já possui um agendamento nesse intervalo.");
        }
        Agendamento a=anterior==null ? new Agendamento(r.barbeariaId(),r.clienteId(),r.barbeiroId(),r.servicoId(),r.inicio(),fim,r.status()) : anterior;
        a.atualizar(r.barbeariaId(),r.clienteId(),r.barbeiroId(),r.servicoId(),r.inicio(),fim,r.status());
        return agendamentos.saveAndFlush(a);
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
        if(a!=null) mesmaLoja(plano(a.getPlanoId()).getBarbeariaId(),plano.getBarbeariaId());
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
        boolean livre=lojas.findById(loja).orElseThrow().isAtiva() && b.getStatus()==StatusCadastro.ATIVO
            && s.getStatus()==StatusCadastro.ATIVO && agendamentos.conflitos(barbeiroId,inicio,fim,ignorar)==0;
        return Map.of("disponivel",livre,"inicio",inicio,"fim",fim);
    }
    private void existeLoja(Long id) { if(!lojas.existsById(id)) throw ausente("Barbearia"); }
    private Barbearia bloquear(Long id) { return lojas.bloquear(id).orElseThrow(() -> ausente("Barbearia")); }
    private void mesmaLoja(Long a,Long b) { exigir(a.equals(b),"Os recursos devem pertencer à mesma barbearia. O vínculo de origem não pode ser alterado."); }
    private void periodo(LocalDate de,LocalDate ate) { exigir(de==null || ate==null || !ate.isBefore(de),"A data final não pode ser anterior à inicial."); }
    private void exigir(boolean condicao,String mensagem) { if(!condicao) throw new RegraNegocioException(mensagem); }
    private RecursoNaoEncontradoException ausente(String recurso) { return new RecursoNaoEncontradoException(recurso+" não encontrado(a)."); }
}
