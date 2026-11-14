package br.com.barberflow.gestao;

import br.com.barberflow.dominio.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public final class Entradas {
    private Entradas() {}
    public record ClienteInput(@NotBlank @Size(max=100) String nome,
        @Size(max=20) String telefone, @Email @Size(max=120) String email) {
        public ClienteInput { nome=limpar(nome); telefone=limpar(telefone); email=limpar(email); if(email!=null) email=email.toLowerCase(java.util.Locale.ROOT); }
    }
    public record ClienteCadastro(@NotBlank @Size(max=100) String nome,
        @Size(max=20) String telefone, @Email @Size(max=120) String email, @NotNull StatusCadastro status) {}
    public record VinculoInput(@NotNull @Positive Long clienteId, @NotNull StatusCadastro status) {}
    public record BarbeiroInput(@NotNull @Positive Long barbeariaId,
        @NotBlank @Size(max=100) String nome, @NotNull StatusCadastro status) {
        public BarbeiroInput { nome=limpar(nome); }
    }
    public record ServicoInput(@NotNull @Positive Long barbeariaId, @NotBlank @Size(max=100) String nome,
        @NotNull @DecimalMin("0.00") @Digits(integer=8,fraction=2) BigDecimal preco,
        @NotNull @Min(1) @Max(1440) Integer duracaoMin, @NotNull StatusCadastro status) {
        public ServicoInput { nome=limpar(nome); }
    }
    public record PlanoInput(@NotNull @Positive Long barbeariaId, @NotBlank @Size(max=100) String nome,
        @NotNull @DecimalMin("0.00") @Digits(integer=8,fraction=2) BigDecimal preco,
        @NotNull StatusCadastro status) {
        public PlanoInput { nome=limpar(nome); }
    }
    public record AgendamentoInput(@NotNull @Positive Long barbeariaId, @NotNull @Positive Long clienteId,
        @NotNull @Positive Long barbeiroId, @NotNull @Positive Long servicoId,
        @NotNull LocalDateTime inicio, @NotNull StatusAgendamento status) {}
    public record AssinaturaInput(@NotNull @Positive Long clienteId, @NotNull @Positive Long planoId,
        @NotNull LocalDate dataInicio, LocalDate dataFim, @NotNull StatusAssinatura status) {}
    private static String limpar(String value) { return value==null || value.isBlank() ? null : value.strip(); }
}
