package br.com.barberflow.dominio;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name="agendamento")
public class Agendamento {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(name="barbearia_id", nullable=false)
    private Long barbeariaId;
    @Column(name="cliente_id", nullable=false)
    private Long clienteId;
    @Column(name="barbeiro_id", nullable=false)
    private Long barbeiroId;
    @Column(name="servico_id", nullable=false)
    private Long servicoId;
    @Column(nullable=false)
    private LocalDateTime inicio;
    @Column(nullable=false)
    private LocalDateTime fim;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20)
    private StatusAgendamento status;
    @Column(name="valor_acordado",precision=10,scale=2) private BigDecimal valorAcordado;
    @Column(name="valor_estimado",nullable=false) private boolean valorEstimado=true;
    @Column(name="concluido_em") private LocalDateTime concluidoEm;
    public BigDecimal getValorAcordado(){return valorAcordado;}
    public boolean isValorEstimado(){return valorEstimado;}
    public LocalDateTime getConcluidoEm(){return concluidoEm;}
    public void combinarValor(BigDecimal valor){this.valorAcordado=valor;this.valorEstimado=false;}
    public void concluir(){if(concluidoEm==null)concluidoEm=LocalDateTime.now();}
    protected Agendamento() {}
    public Agendamento(Long barbeariaId, Long clienteId, Long barbeiroId, Long servicoId, LocalDateTime inicio, LocalDateTime fim, StatusAgendamento status) { atualizar(barbeariaId, clienteId, barbeiroId, servicoId, inicio, fim, status); }
    public void atualizar(Long barbeariaId, Long clienteId, Long barbeiroId, Long servicoId, LocalDateTime inicio, LocalDateTime fim, StatusAgendamento status) {
        this.barbeariaId = barbeariaId;
        this.clienteId = clienteId;
        this.barbeiroId = barbeiroId;
        this.servicoId = servicoId;
        this.inicio = inicio;
        this.fim = fim;
        this.status = status;
    }
    public Long getId() { return id; }
    public Long getBarbeariaId() { return barbeariaId; }
    public Long getClienteId() { return clienteId; }
    public Long getBarbeiroId() { return barbeiroId; }
    public Long getServicoId() { return servicoId; }
    public LocalDateTime getInicio() { return inicio; }
    public LocalDateTime getFim() { return fim; }
    public StatusAgendamento getStatus() { return status; }
}
