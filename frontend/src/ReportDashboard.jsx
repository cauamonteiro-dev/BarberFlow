import { useEffect, useRef, useState } from "react";
import { api, errorMessage } from "./api";
import ResponsiveTable from "./ResponsiveTable";
import "./reports.css";

const cash = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n || 0,
  );
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const yearRange = () => ({
  de: `${new Date().getFullYear()}-01-01`,
  ate: `${new Date().getFullYear()}-12-31`,
  barbeiroId: "",
  servicoId: "",
});
const labels = {
  AGENDADO: "Agendados",
  CONFIRMADO: "Confirmados",
  CONCLUIDO: "Concluídos",
  CANCELADO: "Cancelados",
};
const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const shortDate = (s) => new Date(s + "T12:00:00").toLocaleDateString("pt-BR");

function Delta({ current, previous, inverse = false }) {
  if (!previous)
    return (
      <small className="metric-change">
        {current
          ? "Sem base no período anterior"
          : "Sem movimento nos dois períodos"}
      </small>
    );
  const value = ((current - previous) / previous) * 100;
  return (
    <small
      className={`metric-change ${(inverse ? value <= 0 : value >= 0) ? "positive" : "negative"}`}
    >
      {value >= 0 ? "+" : ""}
      {value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% em relação
      ao período anterior
    </small>
  );
}

export default function ReportDashboard({ shop, barbers, services }) {
  const [filters, setFilters] = useState(yearRange),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const [metric, setMetric] = useState("faturamento"),
    [selection, setSelection] = useState(null);
  const [allHours, setAllHours] = useState(false);
  const generation = useRef(0);
  const periodError =
    !filters.de || !filters.ate
      ? "Informe a data inicial e a data final."
      : filters.de > filters.ate
        ? "A data final não pode ser anterior à inicial."
        : "";
  useEffect(() => {
    if (periodError) return;
    const id = ++generation.current;
    setLoading(true);
    setError("");
    setSelection(null);
    setData(null);
    api
      .get("/relatorios/dashboard", {
        params: {
          barbeariaId: shop,
          ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        },
      })
      .then((r) => {
        if (generation.current === id) setData(r.data);
      })
      .catch((e) => {
        if (generation.current === id) setError(errorMessage(e));
      })
      .finally(() => {
        if (generation.current === id) setLoading(false);
      });
    return () => {
      ++generation.current;
    };
  }, [shop, filters, retry, periodError]);
  function preset(count) {
    const end = new Date(),
      start = new Date();
    start.setDate(end.getDate() - count + 1);
    setFilters((f) => ({ ...f, de: iso(start), ate: iso(end) }));
  }
  function exportCsv() {
    const escape = (v) => {
      let text = String(v ?? "");
      if (/^[=+\-@]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const rows = [
      [
        "Atendimento",
        "Data de referência",
        "Profissional",
        "Serviço",
        "Situação",
        "Valor do serviço",
        "Valor estimado",
      ],
      ...facts.map((f) => [
        f.id,
        f.data,
        f.profissional,
        f.servico,
        f.status,
        f.valor,
        f.estimado ? "Sim" : "Não",
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\ufeff" + rows.map((r) => r.map(escape).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `barberflow-${shop}-${filters.de}-${filters.ate}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const i = data?.indicadores,
    a = data?.anterior;
  const facts = (data?.atendimentos || []).filter(
    (f) =>
      !selection ||
      (selection.kind === "mes"
        ? f.data.startsWith(selection.value)
        : selection.kind === "status"
          ? f.status === selection.value
          : new Date(f.inicio).getDay() === selection.day % 7 &&
            new Date(f.inicio).getHours() === selection.hour),
  );
  const max = Math.max(1, ...(data?.serie || []).map((s) => Number(s[metric])));
  const revenue = i?.faturamento || 0;
  const best = data?.servicos.find((s) => s.concluidos > 0),
    peak = data?.demanda.reduce(
      (best, x) => (!best || x.quantidade > best.quantidade ? x : best),
      null,
    );
  const observedHours = (data?.demanda || []).map((x) => x.hora);
  const firstHour = allHours
    ? 0
    : observedHours.length
      ? Math.max(0, Math.min(...observedHours) - 1)
      : 8;
  const lastHour = allHours
    ? 23
    : observedHours.length
      ? Math.min(23, Math.max(...observedHours) + 1)
      : 18;
  return (
    <div className="report-dashboard">
      <section
        className="panel report-controls"
        aria-label="Filtros do dashboard"
      >
        <div className="report-intro">
          <div>
            <p className="eyebrow">DESEMPENHO DA UNIDADE</p>
            <h2>Uma visão para decidir o próximo passo.</h2>
            <p>
              Explore os gráficos para entender resultados, demanda e
              oportunidades.
            </p>
          </div>
          <button
            className="secondary"
            onClick={exportCsv}
            disabled={!!periodError || !data || loading}
          >
            Exportar CSV
          </button>
        </div>
        <div className="report-filter-grid">
          <label>
            De
            <input
              type="date"
              value={filters.de}
              onChange={(e) =>
                setFilters((f) => ({ ...f, de: e.target.value }))
              }
            />
          </label>
          <label>
            Até
            <input
              type="date"
              value={filters.ate}
              onChange={(e) =>
                setFilters((f) => ({ ...f, ate: e.target.value }))
              }
            />
          </label>
          <label>
            Profissional
            <select
              aria-label="Profissional"
              value={filters.barbeiroId}
              onChange={(e) =>
                setFilters((f) => ({ ...f, barbeiroId: e.target.value }))
              }
            >
              <option value="">Todos os profissionais</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Serviço
            <select
              aria-label="Serviço"
              value={filters.servicoId}
              onChange={(e) =>
                setFilters((f) => ({ ...f, servicoId: e.target.value }))
              }
            >
              <option value="">Todos os serviços</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="report-presets">
          <button className="secondary" onClick={() => preset(30)}>
            Últimos 30 dias
          </button>
          <button className="secondary" onClick={() => preset(90)}>
            Últimos 90 dias
          </button>
          <button className="secondary" onClick={() => setFilters(yearRange())}>
            Ano atual / limpar filtros
          </button>
        </div>
      </section>
      {periodError && (
        <div role="alert" className="alert error">
          {periodError}
        </div>
      )}
      {!periodError && error && (
        <div role="alert" className="alert error">
          {error}
          <button onClick={() => setRetry((n) => n + 1)}>
            Tentar novamente
          </button>
        </div>
      )}
      {!periodError && loading && (
        <div role="status" className="loading">
          Atualizando indicadores…
        </div>
      )}
      {!periodError && data && !loading && (
        <>
          <p className="report-period">
            {shortDate(data.de)} a {shortDate(data.ate)} · comparação com{" "}
            {shortDate(data.anteriorDe)} a {shortDate(data.anteriorAte)}, com a
            mesma duração.
          </p>
          <div className="report-kpis">
            {[
              [
                "Faturamento realizado",
                cash(i.faturamento),
                i.faturamento,
                a.faturamento,
                false,
              ],
              [
                "Atendimentos concluídos",
                i.concluidos,
                i.concluidos,
                a.concluidos,
                false,
              ],
              [
                "Ticket médio",
                cash(i.ticketMedio),
                i.ticketMedio,
                a.ticketMedio,
                false,
              ],
              [
                "Taxa de cancelamento",
                `${Number(i.cancelamentoPercentual).toLocaleString("pt-BR")}%`,
                i.cancelamentoPercentual,
                a.cancelamentoPercentual,
                true,
              ],
            ].map(([label, value, current, previous, inverse]) => (
              <article className="stat" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <Delta
                  current={Number(current)}
                  previous={Number(previous)}
                  inverse={inverse}
                />
              </article>
            ))}
          </div>
          <div className="report-disclaimer">
            Faturamento calculado pelos serviços concluídos, sem representar
            pagamentos recebidos. {i.estimados} atendimento(s) com valor
            histórico estimado. Ticket médio = faturamento ÷ concluídos.
            Cancelamento = cancelados ÷ todos os agendamentos.
          </div>
          <div className="report-insights">
            <article>
              <span>Relacionamento</span>
              <strong>{i.clientesAtendidos} clientes atendidos</strong>
              <p>
                Clientes distintos com ao menos um serviço concluído no período.
              </p>
            </article>
            <article>
              <span>Serviço de maior faturamento</span>
              <strong>{best?.nome || "Sem serviços concluídos"}</strong>
              <p>
                {best
                  ? `${cash(best.faturamento)} · ${revenue ? Math.round((Number(best.faturamento) / revenue) * 100) : 0}% do faturamento da seleção.`
                  : "Amplie o período para analisar o histórico."}
              </p>
            </article>
            <article>
              <span>Movimento em aberto</span>
              <strong>{cash(i.valorEmAberto)}</strong>
              <p>
                Valor previsto de agendados e confirmados da seleção; ainda não
                é faturamento.
              </p>
            </article>
          </div>
          {!i.agendamentos && (
            <div className="empty">
              <h3>Nenhum atendimento neste recorte.</h3>
              <p>
                Altere o período, o profissional ou o serviço para explorar
                outros resultados.
              </p>
            </div>
          )}
          <div className="report-chart-grid">
            <section className="panel report-trend">
              <div className="panel-heading">
                <div>
                  <h2>Evolução mensal</h2>
                  <p>
                    Selecione uma coluna para consultar os atendimentos daquele
                    mês.
                  </p>
                </div>
                <div
                  className="report-segment"
                  aria-label="Métrica da evolução"
                >
                  <button
                    aria-pressed={metric === "faturamento"}
                    onClick={() => setMetric("faturamento")}
                  >
                    Faturamento
                  </button>
                  <button
                    aria-pressed={metric === "agendamentos"}
                    onClick={() => setMetric("agendamentos")}
                  >
                    Agendamentos
                  </button>
                </div>
              </div>
              <div className="trend-scroll">
                <div
                  className="trend-bars"
                  style={{ minWidth: Math.max(280, data.serie.length * 48) }}
                >
                  {data.serie.map((s) => (
                    <button
                      className="trend-column"
                      key={s.mes}
                      aria-pressed={
                        selection?.kind === "mes" && selection.value === s.mes
                      }
                      aria-label={`${s.mes}: ${metric === "faturamento" ? cash(s[metric]) : s[metric] + " agendamentos"}`}
                      title={`${s.mes}: ${cash(s.faturamento)} · ${s.agendamentos} agendamentos`}
                      onClick={() =>
                        setSelection({
                          kind: "mes",
                          value: s.mes,
                          label: s.mes,
                        })
                      }
                    >
                      <span className="trend-value">
                        {metric === "faturamento" ? cash(s[metric]) : s[metric]}
                      </span>
                      <span className="trend-track">
                        <span
                          style={{
                            height: `${(Number(s[metric]) / max) * 100}%`,
                          }}
                        />
                      </span>
                      <span>
                        {s.mes.slice(5)}/{s.mes.slice(2, 4)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Situação dos atendimentos</h2>
                  <p>Selecione uma situação para abrir os detalhes.</p>
                </div>
              </div>
              <div className="report-status">
                {data.situacoes.map((s) => (
                  <button
                    key={s.status}
                    className={`status-chart ${s.status}`}
                    aria-pressed={
                      selection?.kind === "status" &&
                      selection.value === s.status
                    }
                    onClick={() =>
                      setSelection({
                        kind: "status",
                        value: s.status,
                        label: labels[s.status],
                      })
                    }
                  >
                    <span>{labels[s.status]}</span>
                    <strong>{s.quantidade}</strong>
                    <span className="rank-track">
                      <i
                        style={{
                          width: `${i.agendamentos ? (s.quantidade / i.agendamentos) * 100 : 0}%`,
                        }}
                      />
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <Ranking
              title="Serviços que geram resultado"
              rows={data.servicos}
              total={revenue}
              onSelect={(id) =>
                setFilters((f) => ({ ...f, servicoId: String(id) }))
              }
            />
            <Ranking
              title="Resultado por profissional"
              rows={data.profissionais}
              total={revenue}
              onSelect={(id) =>
                setFilters((f) => ({ ...f, barbeiroId: String(id) }))
              }
            />
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Quando a procura se concentra</h2>
                <p>
                  {peak
                    ? `Maior movimento: ${days[peak.dia - 1]}, às ${peak.hora}h (${peak.quantidade} atendimento(s)). `
                    : "Sem movimento para mapear. "}
                  Volume agendado, excluindo cancelados; não representa taxa de
                  ocupação.
                </p>
              </div>
            </div>
            <div className="demand-toolbar">
              <button
                className="secondary"
                aria-pressed={allHours}
                onClick={() => setAllHours((v) => !v)}
              >
                {allHours
                  ? "Focar nos horários de movimento"
                  : "Exibir as 24 horas"}
              </button>
            </div>
            <div className="demand-scroll">
              <div className="demand-grid">
                <span>Hora</span>
                {days.map((d) => (
                  <strong key={d}>{d}</strong>
                ))}
                {Array.from(
                  { length: lastHour - firstHour + 1 },
                  (_, offset) => {
                    const h = firstHour + offset;
                    return [
                      <span key={`h${h}`}>{String(h).padStart(2, "0")}h</span>,
                      ...days.map((d, idx) => {
                        const n =
                          data.demanda.find(
                            (x) => x.dia === idx + 1 && x.hora === h,
                          )?.quantidade || 0;
                        return (
                          <button
                            key={`${d}${h}`}
                            aria-label={`${d} ${h}h: ${n} atendimentos`}
                            title={`${d}, ${h}h: ${n} atendimentos`}
                            style={{
                              background: n
                                ? `rgb(177 132 63 / ${0.2 + (0.8 * n) / (peak?.quantidade || 1)})`
                                : undefined,
                            }}
                            onClick={() =>
                              setSelection({
                                kind: "demanda",
                                day: idx + 1,
                                hour: h,
                                label: `${d} ${h}h`,
                              })
                            }
                          >
                            {n || "·"}
                          </button>
                        );
                      }),
                    ];
                  },
                )}
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Atendimentos por profissional</h2>
                <p>Os valores respeitam os filtros selecionados.</p>
              </div>
            </div>
            <ResponsiveTable>
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Agendamentos</th>
                  <th>Concluídos</th>
                  <th>Valor dos serviços concluídos</th>
                </tr>
              </thead>
              <tbody>
                {data.profissionais.map((b) => (
                  <tr key={b.id}>
                    <td>{b.nome}</td>
                    <td>{b.agendamentos}</td>
                    <td>{b.concluidos}</td>
                    <td>{cash(b.faturamento)}</td>
                  </tr>
                ))}
              </tbody>
            </ResponsiveTable>
          </section>
          <section className="panel report-detail">
            <details open={selection ? true : undefined}>
              <summary>
                Ver atendimentos{" "}
                {selection ? `· ${selection.label}` : "da seleção"} (
                {facts.length})
              </summary>
              {selection && (
                <button
                  className="secondary"
                  onClick={() => setSelection(null)}
                >
                  Limpar seleção do gráfico
                </button>
              )}
              <ResponsiveTable>
                <thead>
                  <tr>
                    <th>Referência</th>
                    <th>Profissional</th>
                    <th>Serviço</th>
                    <th>Situação</th>
                    <th>Valor do serviço</th>
                  </tr>
                </thead>
                <tbody>
                  {facts.map((f) => (
                    <tr key={f.id}>
                      <td>
                        #{f.id} · {new Date(f.data).toLocaleString("pt-BR")}
                      </td>
                      <td>{f.profissional}</td>
                      <td>{f.servico}</td>
                      <td>{labels[f.status]}</td>
                      <td>
                        {cash(f.valor)}
                        {f.estimado ? " (estimado)" : ""}
                      </td>
                    </tr>
                  ))}
                  {!facts.length && (
                    <tr>
                      <td colSpan="5">Nenhum atendimento nesta seleção.</td>
                    </tr>
                  )}
                </tbody>
              </ResponsiveTable>
            </details>
          </section>
        </>
      )}
    </div>
  );
}
function Ranking({ title, rows, total, onSelect }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.faturamento)));
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>Selecione uma barra para filtrar todo o dashboard.</p>
        </div>
      </div>
      <div className="ranking-bars">
        {rows.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            title={`${r.nome}: ${cash(r.faturamento)} · ${r.concluidos} concluídos`}
          >
            <span>
              <strong>{r.nome}</strong>
              <small>
                {r.concluidos} concluídos ·{" "}
                {total ? Math.round((Number(r.faturamento) / total) * 100) : 0}%
                do faturamento
              </small>
            </span>
            <b>{cash(r.faturamento)}</b>
            <span className="rank-track">
              <i style={{ width: `${(Number(r.faturamento) / max) * 100}%` }} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
