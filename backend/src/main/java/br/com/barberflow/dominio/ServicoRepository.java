package br.com.barberflow.dominio;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ServicoRepository extends JpaRepository<Servico, Long> {
    java.util.List<Servico> findByBarbeariaIdOrderById(Long barbeariaId);
}
