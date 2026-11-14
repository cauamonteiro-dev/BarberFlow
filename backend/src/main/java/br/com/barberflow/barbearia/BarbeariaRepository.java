package br.com.barberflow.barbearia;

import org.springframework.data.jpa.repository.JpaRepository;

// O Spring Data implementa as operações básicas de acesso ao banco.
public interface BarbeariaRepository extends JpaRepository<Barbearia, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select b from Barbearia b where b.id = :id")
    java.util.Optional<Barbearia> bloquear(Long id);
}
