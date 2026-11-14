package br.com.barberflow.dominio;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name="barbeiro")
public class Barbeiro {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(name="barbearia_id", nullable=false)
    private Long barbeariaId;
    @Column(nullable=false, length=100)
    private String nome;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20)
    private StatusCadastro status;
    protected Barbeiro() {}
    public Barbeiro(Long barbeariaId, String nome, StatusCadastro status) { atualizar(barbeariaId, nome, status); }
    public void atualizar(Long barbeariaId, String nome, StatusCadastro status) {
        this.barbeariaId = barbeariaId;
        this.nome = nome;
        this.status = status;
    }
    public Long getId() { return id; }
    public Long getBarbeariaId() { return barbeariaId; }
    public String getNome() { return nome; }
    public StatusCadastro getStatus() { return status; }
}
