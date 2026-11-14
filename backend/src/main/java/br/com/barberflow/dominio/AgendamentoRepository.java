package br.com.barberflow.dominio;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {
    java.util.List<Agendamento> findByBarbeariaIdOrderByInicioDesc(Long barbeariaId);
    @org.springframework.data.jpa.repository.Query("select count(a) from Agendamento a where a.barbeiroId=:barbeiroId and a.status <> br.com.barberflow.dominio.StatusAgendamento.CANCELADO and a.inicio < :fim and a.fim > :inicio and (:ignorar is null or a.id <> :ignorar)")
    long conflitos(Long barbeiroId, java.time.LocalDateTime inicio, java.time.LocalDateTime fim, Long ignorar);
}
