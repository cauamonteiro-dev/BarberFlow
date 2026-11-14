package br.com.barberflow.barbearia;

public record BarbeariaResponse(Long id, String nome, boolean ativa) {
    public static BarbeariaResponse from(Barbearia barbearia) {
        return new BarbeariaResponse(barbearia.getId(), barbearia.getNome(), barbearia.isAtiva());
    }
}
