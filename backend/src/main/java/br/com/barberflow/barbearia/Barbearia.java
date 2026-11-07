package br.com.barberflow.barbearia;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "barbearia")
public class Barbearia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false)
    private boolean ativa;

    // Construtor necessário para o JPA reconstruir a entidade a partir do banco.
    protected Barbearia() {
    }

    public Barbearia(String nome, boolean ativa) {
        this.nome = nome;
        this.ativa = ativa;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public boolean isAtiva() {
        return ativa;
    }
}
