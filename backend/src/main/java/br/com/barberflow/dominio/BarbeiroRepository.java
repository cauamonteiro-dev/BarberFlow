package br.com.barberflow.dominio;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BarbeiroRepository extends JpaRepository<Barbeiro, Long> {
    java.util.List<Barbeiro> findByBarbeariaIdOrderById(Long barbeariaId);
}
