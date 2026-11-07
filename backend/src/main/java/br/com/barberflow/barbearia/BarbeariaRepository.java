package br.com.barberflow.barbearia;

import org.springframework.data.jpa.repository.JpaRepository;

// O Spring Data implementa as operações básicas de acesso ao banco.
public interface BarbeariaRepository extends JpaRepository<Barbearia, Long> {
}
