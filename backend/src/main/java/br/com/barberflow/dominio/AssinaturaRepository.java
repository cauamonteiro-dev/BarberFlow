package br.com.barberflow.dominio;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssinaturaRepository extends JpaRepository<Assinatura, Long> {
    List<Assinatura> findByClienteIdAndPlanoId(Long clienteId, Long planoId);
}
