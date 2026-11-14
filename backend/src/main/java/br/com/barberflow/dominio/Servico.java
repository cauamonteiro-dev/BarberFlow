package br.com.barberflow.dominio;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name="servico")
public class Servico {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(name="barbearia_id", nullable=false)
    private Long barbeariaId;
    @Column(nullable=false, length=100)
    private String nome;
    @Column(nullable=false, precision=10, scale=2)
    private BigDecimal preco;
    @Column(name="duracao_min", nullable=false)
    private Integer duracaoMin;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20)
    private StatusCadastro status;
    protected Servico() {}
    public Servico(Long barbeariaId, String nome, BigDecimal preco, Integer duracaoMin, StatusCadastro status) { atualizar(barbeariaId, nome, preco, duracaoMin, status); }
    public void atualizar(Long barbeariaId, String nome, BigDecimal preco, Integer duracaoMin, StatusCadastro status) {
        this.barbeariaId = barbeariaId;
        this.nome = nome;
        this.preco = preco;
        this.duracaoMin = duracaoMin;
        this.status = status;
    }
    public Long getId() { return id; }
    public Long getBarbeariaId() { return barbeariaId; }
    public String getNome() { return nome; }
    public BigDecimal getPreco() { return preco; }
    public Integer getDuracaoMin() { return duracaoMin; }
    public StatusCadastro getStatus() { return status; }
}
