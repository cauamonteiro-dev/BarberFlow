package br.com.barberflow.dominio;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanoRepository extends JpaRepository<Plano, Long> {
    java.util.List<Plano> findByBarbeariaIdOrderById(Long barbeariaId);
}
