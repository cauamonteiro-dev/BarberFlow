package br.com.barberflow.dominio;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name="cliente_barbearia")
public class Vinculo {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(name="cliente_id", nullable=false)
    private Long clienteId;
    @Column(name="barbearia_id", nullable=false)
    private Long barbeariaId;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20)
    private StatusCadastro status;
    protected Vinculo() {}
    public Vinculo(Long clienteId, Long barbeariaId, StatusCadastro status) { atualizar(clienteId, barbeariaId, status); }
    public void atualizar(Long clienteId, Long barbeariaId, StatusCadastro status) {
        this.clienteId = clienteId;
        this.barbeariaId = barbeariaId;
        this.status = status;
    }
    public Long getId() { return id; }
    public Long getClienteId() { return clienteId; }
    public Long getBarbeariaId() { return barbeariaId; }
    public StatusCadastro getStatus() { return status; }
}
