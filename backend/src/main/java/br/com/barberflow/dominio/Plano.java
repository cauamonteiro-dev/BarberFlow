package br.com.barberflow.dominio;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name="plano")
public class Plano {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(name="barbearia_id", nullable=false)
    private Long barbeariaId;
    @Column(nullable=false, length=100)
    private String nome;
    @Column(nullable=false, precision=10, scale=2)
    private BigDecimal preco;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20)
    private StatusCadastro status;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "plano_servico", joinColumns = @JoinColumn(name = "plano_id"))
    @Column(name = "servico_id", nullable = false)
    private Set<Long> servicoIds = new HashSet<>();
    protected Plano() {}
    public Plano(Long barbeariaId, String nome, BigDecimal preco, StatusCadastro status) { atualizar(barbeariaId, nome, preco, status); }
    public void atualizar(Long barbeariaId, String nome, BigDecimal preco, StatusCadastro status) {
        this.barbeariaId = barbeariaId;
        this.nome = nome;
        this.preco = preco;
        this.status = status;
    }
    public Long getId() { return id; }
    public Long getBarbeariaId() { return barbeariaId; }
    public String getNome() { return nome; }
    public BigDecimal getPreco() { return preco; }
    public StatusCadastro getStatus() { return status; }
    public Set<Long> getServicoIds() { return Set.copyOf(servicoIds); }
    public void definirServicos(Collection<Long> ids) {
        servicoIds.clear();
        servicoIds.addAll(ids);
    }
}
