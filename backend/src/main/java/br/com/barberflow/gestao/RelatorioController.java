package br.com.barberflow.gestao;

import br.com.barberflow.shared.RegraNegocioException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/relatorios")
public class RelatorioController {
    private final JdbcTemplate jdbc;
    private final GestaoService gestao;
    public RelatorioController(JdbcTemplate jdbc,GestaoService gestao) { this.jdbc=jdbc; this.gestao=gestao; }

    public record Resumo(long clientesAtivos,long barbeirosAtivos,long servicosAtivos,long assinaturasVigentes,
        long agendamentos,long concluidos,BigDecimal valorServicosConcluidos,long atendimentosEstimados) {}
    public record PorBarbeiro(long id,String nome,long agendamentos,long concluidos,BigDecimal valorServicosConcluidos) {}
    public record PorStatus(String status,long quantidade) {}
    public record Relatorio(Resumo resumo,List<PorBarbeiro> barbeiros,List<PorStatus> porStatus) {}

    @GetMapping
    public Relatorio consultar(@RequestParam Long barbeariaId,@RequestParam(required=false) LocalDate de,
            @RequestParam(required=false) LocalDate ate) {
        gestao.vinculos(barbeariaId); // 404 when the selected shop does not exist.
        if(de!=null && ate!=null && ate.isBefore(de)) throw new RegraNegocioException("A data final não pode ser anterior à inicial.");
        var inicio=de==null ? LocalDate.of(1900,1,1) : de;
        var fim=ate==null ? LocalDate.of(9998,12,31) : ate;
        long clientes=contar("select count(*) from cliente_barbearia where barbearia_id=? and status='ATIVO'",barbeariaId);
        long barbeiros=contar("select count(*) from barbeiro where barbearia_id=? and status='ATIVO'",barbeariaId);
        long servicos=contar("select count(*) from servico where barbearia_id=? and status='ATIVO'",barbeariaId);
        long assinaturas=contar("select count(*) from assinatura a join plano p on p.id=a.plano_id where p.barbearia_id=? and a.status='ATIVA' and a.data_inicio<=current_date and (a.data_fim is null or a.data_fim>=current_date)",barbeariaId);
        var rows=jdbc.query("""
            select b.id,b.nome,count(a.id) total,
                count(a.id) filter (where a.status='CONCLUIDO') concluidos,
                coalesce(sum(a.valor_acordado) filter (where a.status='CONCLUIDO'),0) valor
            from barbeiro b
            left join agendamento a on a.barbeiro_id=b.id and coalesce(a.concluido_em,a.inicio)>=? and coalesce(a.concluido_em,a.inicio)<?
            left join servico s on s.id=a.servico_id
            where b.barbearia_id=? group by b.id,b.nome order by total desc,b.nome,b.id
            """,(rs,n) -> new PorBarbeiro(rs.getLong("id"),rs.getString("nome"),rs.getLong("total"),rs.getLong("concluidos"),rs.getBigDecimal("valor")),
            inicio.atStartOfDay(),fim.plusDays(1).atStartOfDay(),barbeariaId);
        var statuses=jdbc.query("select status,count(*) quantidade from agendamento where barbearia_id=? and coalesce(concluido_em,inicio)>=? and coalesce(concluido_em,inicio)<? group by status order by status",
            (rs,n) -> new PorStatus(rs.getString(1),rs.getLong(2)),barbeariaId,inicio.atStartOfDay(),fim.plusDays(1).atStartOfDay());
        var resumo=new Resumo(clientes,barbeiros,servicos,assinaturas,
            rows.stream().mapToLong(PorBarbeiro::agendamentos).sum(),rows.stream().mapToLong(PorBarbeiro::concluidos).sum(),
            rows.stream().map(PorBarbeiro::valorServicosConcluidos).reduce(BigDecimal.ZERO,BigDecimal::add),
            jdbc.queryForObject("select count(*) from agendamento where barbearia_id=? and status='CONCLUIDO' and valor_estimado=true and concluido_em>=? and concluido_em<?",Long.class,barbeariaId,inicio.atStartOfDay(),fim.plusDays(1).atStartOfDay()));
        return new Relatorio(resumo,rows,statuses);
    }
    private long contar(String sql,Long id) { return jdbc.queryForObject(sql,Long.class,id); }
}
