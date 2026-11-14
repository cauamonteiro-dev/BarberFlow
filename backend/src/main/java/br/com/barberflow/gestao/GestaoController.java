package br.com.barberflow.gestao;

import br.com.barberflow.dominio.*;
import br.com.barberflow.gestao.Entradas.*;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.*;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class GestaoController {
    private final GestaoService service;
    public GestaoController(GestaoService service) { this.service=service; }

    @GetMapping("/clientes") public List<Cliente> clientes(@RequestParam(required=false) Long barbeariaId) { return service.clientes(barbeariaId); }
    @GetMapping("/clientes/{id}") public Cliente cliente(@PathVariable Long id) { return service.cliente(id); }
    @PostMapping("/clientes") public ResponseEntity<Cliente> cliente(@Valid @RequestBody ClienteInput r) { var v=service.salvarCliente(null,r); return criado("clientes",v.getId(),v); }
    @PutMapping("/clientes/{id}") public Cliente cliente(@PathVariable Long id,@Valid @RequestBody ClienteInput r) { return service.salvarCliente(id,r); }

    @PostMapping("/barbearias/{id}/clientes/cadastro")
    public ResponseEntity<Cliente> cadastrarNaLoja(@PathVariable Long id,@Valid @RequestBody ClienteCadastro r) {
        var c=service.cadastrarNaLoja(id,null,r); return criado("clientes",c.getId(),c);
    }
    @PutMapping("/barbearias/{id}/clientes/cadastro/{clienteId}")
    public Cliente atualizarNaLoja(@PathVariable Long id,@PathVariable Long clienteId,@Valid @RequestBody ClienteCadastro r) {
        return service.cadastrarNaLoja(id,clienteId,r);
    }

    @GetMapping("/barbearias/{id}/clientes") public List<Vinculo> vinculos(@PathVariable Long id) { return service.vinculos(id); }
    @PutMapping("/barbearias/{id}/clientes") public Vinculo vincular(@PathVariable Long id,@Valid @RequestBody VinculoInput r) { return service.vincular(id,r); }

    @GetMapping("/barbeiros") public List<Barbeiro> barbeiros(@RequestParam Long barbeariaId) { return service.barbeiros(barbeariaId); }
    @GetMapping("/barbeiros/{id}") public Barbeiro barbeiro(@PathVariable Long id) { return service.barbeiro(id); }
    @PostMapping("/barbeiros") public ResponseEntity<Barbeiro> barbeiro(@Valid @RequestBody BarbeiroInput r) { var v=service.salvarBarbeiro(null,r); return criado("barbeiros",v.getId(),v); }
    @PutMapping("/barbeiros/{id}") public Barbeiro barbeiro(@PathVariable Long id,@Valid @RequestBody BarbeiroInput r) { return service.salvarBarbeiro(id,r); }

    @GetMapping("/servicos") public List<Servico> servicos(@RequestParam Long barbeariaId) { return service.servicos(barbeariaId); }
    @GetMapping("/servicos/{id}") public Servico servico(@PathVariable Long id) { return service.servico(id); }
    @PostMapping("/servicos") public ResponseEntity<Servico> servico(@Valid @RequestBody ServicoInput r) { var v=service.salvarServico(null,r); return criado("servicos",v.getId(),v); }
    @PutMapping("/servicos/{id}") public Servico servico(@PathVariable Long id,@Valid @RequestBody ServicoInput r) { return service.salvarServico(id,r); }

    @GetMapping("/planos") public List<Plano> planos(@RequestParam Long barbeariaId) { return service.planos(barbeariaId); }
    @GetMapping("/planos/{id}") public Plano plano(@PathVariable Long id) { return service.plano(id); }
    @PostMapping("/planos") public ResponseEntity<Plano> plano(@Valid @RequestBody PlanoInput r) { var v=service.salvarPlano(null,r); return criado("planos",v.getId(),v); }
    @PutMapping("/planos/{id}") public Plano plano(@PathVariable Long id,@Valid @RequestBody PlanoInput r) { return service.salvarPlano(id,r); }

    @GetMapping("/agendamentos") public List<Agendamento> agendamentos(@RequestParam Long barbeariaId,
            @RequestParam(required=false) LocalDate de,@RequestParam(required=false) LocalDate ate,
            @RequestParam(required=false) StatusAgendamento status) { return service.agendamentos(barbeariaId,de,ate,status); }
    @GetMapping("/agendamentos/{id}") public Agendamento agendamento(@PathVariable Long id) { return service.agendamento(id); }
    @PostMapping("/agendamentos") public ResponseEntity<Agendamento> agendamento(@Valid @RequestBody AgendamentoInput r) { var v=service.salvarAgendamento(null,r); return criado("agendamentos",v.getId(),v); }
    @PutMapping("/agendamentos/{id}") public Agendamento agendamento(@PathVariable Long id,@Valid @RequestBody AgendamentoInput r) { return service.salvarAgendamento(id,r); }
    @GetMapping("/disponibilidade") public Map<String,Object> disponibilidade(@RequestParam Long barbeariaId,
            @RequestParam Long barbeiroId,@RequestParam Long servicoId,@RequestParam LocalDateTime inicio,
            @RequestParam(required=false) Long ignorarId) { return service.disponibilidade(barbeariaId,barbeiroId,servicoId,inicio,ignorarId); }

    @GetMapping("/assinaturas") public List<Assinatura> assinaturas(@RequestParam Long barbeariaId) { return service.assinaturas(barbeariaId); }
    @GetMapping("/assinaturas/{id}") public Assinatura assinatura(@PathVariable Long id) { return service.assinatura(id); }
    @PostMapping("/assinaturas") public ResponseEntity<Assinatura> assinatura(@Valid @RequestBody AssinaturaInput r) { var v=service.salvarAssinatura(null,r); return criado("assinaturas",v.getId(),v); }
    @PutMapping("/assinaturas/{id}") public Assinatura assinatura(@PathVariable Long id,@Valid @RequestBody AssinaturaInput r) { return service.salvarAssinatura(id,r); }

    private <T> ResponseEntity<T> criado(String recurso,Long id,T body) { return ResponseEntity.created(URI.create("/api/"+recurso+"/"+id)).body(body); }
}
