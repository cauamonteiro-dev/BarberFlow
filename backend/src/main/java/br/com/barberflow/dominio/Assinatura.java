package br.com.barberflow.dominio;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name="assinatura")
public class Assinatura {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(name="cliente_id", nullable=false)
    private Long clienteId;
    @Column(name="plano_id", nullable=false)
    private Long planoId;
    @Column(name="data_inicio", nullable=false)
    private LocalDate dataInicio;
    @Column(name="data_fim")
    private LocalDate dataFim;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20)
    private StatusAssinatura status;
    protected Assinatura() {}
    public Assinatura(Long clienteId, Long planoId, LocalDate dataInicio, LocalDate dataFim, StatusAssinatura status) { atualizar(clienteId, planoId, dataInicio, dataFim, status); }
    public void atualizar(Long clienteId, Long planoId, LocalDate dataInicio, LocalDate dataFim, StatusAssinatura status) {
        this.clienteId = clienteId;
        this.planoId = planoId;
        this.dataInicio = dataInicio;
        this.dataFim = dataFim;
        this.status = status;
    }
    public Long getId() { return id; }
    public Long getClienteId() { return clienteId; }
    public Long getPlanoId() { return planoId; }
    public LocalDate getDataInicio() { return dataInicio; }
    public LocalDate getDataFim() { return dataFim; }
    public StatusAssinatura getStatus() { return status; }
}
