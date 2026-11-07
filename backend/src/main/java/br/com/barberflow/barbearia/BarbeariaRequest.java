package br.com.barberflow.barbearia;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// DTO: define o que a API aceita, sem expor a entidade diretamente.
public record BarbeariaRequest(
        @NotBlank(message = "O nome é obrigatório.")
        @Size(max = 100, message = "O nome deve ter no máximo 100 caracteres.")
        String nome,
        @NotNull(message = "Informe se a barbearia está ativa.")
        Boolean ativa
) {
    public BarbeariaRequest {
        nome = nome == null ? null : nome.strip();
    }
}
