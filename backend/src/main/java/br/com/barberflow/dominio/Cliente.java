package br.com.barberflow.dominio;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name="cliente")
public class Cliente {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(nullable=false, length=100)
    private String nome;
    @Column(length=20)
    private String telefone;
    @Column(length=120)
    private String email;
    protected Cliente() {}
    public Cliente(String nome, String telefone, String email) { atualizar(nome, telefone, email); }
    public void atualizar(String nome, String telefone, String email) {
        this.nome = nome;
        this.telefone = telefone;
        this.email = email;
    }
    public Long getId() { return id; }
    public String getNome() { return nome; }
    public String getTelefone() { return telefone; }
    public String getEmail() { return email; }
}
