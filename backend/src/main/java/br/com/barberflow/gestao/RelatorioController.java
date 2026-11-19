package br.com.barberflow.gestao;

import br.com.barberflow.shared.RegraNegocioException;
import java.math.BigDecimal;
import java.time.*;
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
    public record Fato(long id,long barbeiroId,String profissional,long servicoId,String servico,long clienteId,LocalDateTime data,LocalDateTime inicio,String status,BigDecimal valor,boolean estimado) {}
    public record Indicadores(long agendamentos,long concluidos,long cancelados,long clientesAtendidos,BigDecimal faturamento,BigDecimal ticketMedio,BigDecimal cancelamentoPercentual,BigDecimal valorEmAberto,long estimados) {}
    public record Serie(String mes,long agendamentos,long concluidos,BigDecimal faturamento) {}
    public record Ranking(long id,String nome,long agendamentos,long concluidos,BigDecimal faturamento) {}
    private Indicadores indicadores(List<Fato> fatos){
        var feitos=fatos.stream().filter(f->f.status().equals("CONCLUIDO")).toList();
        var valor=feitos.stream().map(Fato::valor).reduce(BigDecimal.ZERO,BigDecimal::add);
        long cancelados=fatos.stream().filter(f->f.status().equals("CANCELADO")).count();
        return new Indicadores(fatos.size(),feitos.size(),cancelados,feitos.stream().map(Fato::clienteId).distinct().count(),valor,
            feitos.isEmpty()?BigDecimal.ZERO:valor.divide(BigDecimal.valueOf(feitos.size()),2,java.math.RoundingMode.HALF_UP),
            fatos.isEmpty()?BigDecimal.ZERO:BigDecimal.valueOf(cancelados*100).divide(BigDecimal.valueOf(fatos.size()),2,java.math.RoundingMode.HALF_UP),
            fatos.stream().filter(f->Set.of("AGENDADO","CONFIRMADO").contains(f.status())).map(Fato::valor).reduce(BigDecimal.ZERO,BigDecimal::add),feitos.stream().filter(Fato::estimado).count());
    }
    private List<Fato> fatos(Long loja,LocalDate de,LocalDate ate,Long profissional,Long servico){
        return jdbc.query("""
            select a.id,a.barbeiro_id,b.nome profissional,a.servico_id,s.nome servico,a.cliente_id,
            coalesce(a.concluido_em,a.inicio) data,a.inicio,a.status,coalesce(a.valor_acordado,s.preco) valor,a.valor_estimado
            from agendamento a join barbeiro b on b.id=a.barbeiro_id join servico s on s.id=a.servico_id
            where a.barbearia_id=? and coalesce(a.concluido_em,a.inicio)>=? and coalesce(a.concluido_em,a.inicio)<?
            and (cast(? as bigint) is null or a.barbeiro_id=?) and (cast(? as bigint) is null or a.servico_id=?) order by data,a.id
            """,(rs,n)->new Fato(rs.getLong("id"),rs.getLong("barbeiro_id"),rs.getString("profissional"),rs.getLong("servico_id"),rs.getString("servico"),rs.getLong("cliente_id"),rs.getObject("data",LocalDateTime.class),rs.getObject("inicio",LocalDateTime.class),rs.getString("status"),rs.getBigDecimal("valor"),rs.getBoolean("valor_estimado")),
            loja,de.atStartOfDay(),ate.plusDays(1).atStartOfDay(),profissional,profissional,servico,servico);
    }
    @GetMapping("/dashboard") public Object dashboard(@RequestParam Long barbeariaId,@RequestParam(required=false) LocalDate de,@RequestParam(required=false) LocalDate ate,@RequestParam(required=false) Long barbeiroId,@RequestParam(required=false) Long servicoId){
        gestao.vinculos(barbeariaId);
        if ((de == null) != (ate == null))
            throw new RegraNegocioException("Informe a data inicial e a data final.");
        var inicio=de==null?LocalDate.now().withDayOfYear(1):de;
        var fim=ate==null?LocalDate.now().withMonth(12).withDayOfMonth(31):ate;
        long dias=java.time.temporal.ChronoUnit.DAYS.between(inicio,fim)+1;
        if(dias<1||dias>3660||inicio.getYear()<1901||fim.getYear()>9997)throw new RegraNegocioException("Selecione um período válido de até dez anos.");
        if(barbeiroId!=null&&!gestao.barbeiro(barbeiroId).getBarbeariaId().equals(barbeariaId))throw new org.springframework.security.access.AccessDeniedException("Profissional de outra unidade.");
        if(servicoId!=null&&!gestao.servico(servicoId).getBarbeariaId().equals(barbeariaId))throw new org.springframework.security.access.AccessDeniedException("Serviço de outra unidade.");
        var atual=fatos(barbeariaId,inicio,fim,barbeiroId,servicoId);
        var anterior=fatos(barbeariaId,inicio.minusDays(dias),inicio.minusDays(1),barbeiroId,servicoId);
        var serie=new ArrayList<Serie>();
        for(var mes=java.time.YearMonth.from(inicio);!mes.isAfter(java.time.YearMonth.from(fim));mes=mes.plusMonths(1)){
            var chave=mes.toString();var grupo=atual.stream().filter(f->f.data().toString().startsWith(chave)).toList();var i=indicadores(grupo);serie.add(new Serie(chave,i.agendamentos(),i.concluidos(),i.faturamento()));
        }
        var profissionais=gestao.barbeiros(barbeariaId).stream().filter(b->barbeiroId==null||b.getId().equals(barbeiroId)).map(b->{var i=indicadores(atual.stream().filter(f->f.barbeiroId()==b.getId()).toList());return new Ranking(b.getId(),b.getNome(),i.agendamentos(),i.concluidos(),i.faturamento());}).sorted(Comparator.comparing(Ranking::faturamento).reversed().thenComparing(Ranking::nome)).toList();
        var servicos=gestao.servicos(barbeariaId).stream().filter(s->servicoId==null||s.getId().equals(servicoId)).map(s->{var i=indicadores(atual.stream().filter(f->f.servicoId()==s.getId()).toList());return new Ranking(s.getId(),s.getNome(),i.agendamentos(),i.concluidos(),i.faturamento());}).sorted(Comparator.comparing(Ranking::faturamento).reversed().thenComparing(Ranking::nome)).toList();
        var situacoes=List.of("AGENDADO","CONFIRMADO","CONCLUIDO","CANCELADO").stream().map(st->new PorStatus(st,atual.stream().filter(f->f.status().equals(st)).count())).toList();
        var demanda=new ArrayList<Map<String,Object>>();
        for(int d=1;d<=7;d++)for(int h=0;h<24;h++){final int dia=d,hora=h;long count=atual.stream().filter(f->!f.status().equals("CANCELADO")&&f.inicio().getDayOfWeek().getValue()==dia&&f.inicio().getHour()==hora).count();if(count>0)demanda.add(Map.of("dia",d,"hora",h,"quantidade",count));}
        var out=new LinkedHashMap<String,Object>();out.put("de",inicio);out.put("ate",fim);out.put("anteriorDe",inicio.minusDays(dias));out.put("anteriorAte",inicio.minusDays(1));out.put("indicadores",indicadores(atual));out.put("anterior",indicadores(anterior));out.put("serie",serie);out.put("profissionais",profissionais);out.put("servicos",servicos);out.put("situacoes",situacoes);out.put("demanda",demanda);out.put("atendimentos",atual);return out;
    }
    private long contar(String sql,Long id) { return jdbc.queryForObject(sql,Long.class,id); }
}
