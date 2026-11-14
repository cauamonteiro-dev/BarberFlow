package br.com.barberflow.dominio;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VinculoRepository extends JpaRepository<Vinculo, Long> {
    java.util.Optional<Vinculo> findByClienteIdAndBarbeariaId(Long clienteId, Long barbeariaId);
    java.util.List<Vinculo> findByBarbeariaIdOrderById(Long barbeariaId);
}
