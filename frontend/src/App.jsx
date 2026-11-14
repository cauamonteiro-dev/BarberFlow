import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "./api";

const pages = [
  ["resumo", "Visão geral", "◈"],
  ["agendamentos", "Agenda", "▦"],
  ["clientes", "Clientes", "♙"],
  ["barbeiros", "Barbeiros", "✂"],
  ["servicos", "Serviços", "◇"],
  ["planos", "Planos", "▤"],
  ["assinaturas", "Assinaturas", "↻"],
  ["barbearias", "Barbearias", "⌂"],
  ["relatorios", "Relatórios", "▥"],
];
const titles = {
  resumo: [
    "Seu dia, bem organizado.",
    "Acompanhe o movimento e cuide de cada detalhe da sua barbearia.",
  ],
  agendamentos: [
    "Agenda",
    "Organize os horários e acompanhe cada atendimento.",
  ],
  clientes: ["Clientes", "Relacionamentos que fazem a sua barbearia crescer."],
  barbeiros: ["Barbeiros", "Conheça e gerencie os profissionais da casa."],
  servicos: ["Serviços", "Seu catálogo de cuidados, preços e durações."],
  planos: ["Planos", "Ofereça mais motivos para o cliente voltar."],
  assinaturas: [
    "Assinaturas",
    "Acompanhe os planos e os períodos contratados.",
  ],
  barbearias: ["Barbearias", "Gerencie suas unidades em um só lugar."],
  relatorios: ["Relatórios", "Transforme os dados da operação em informação."],
};
const labels = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  ATIVA: "Ativa",
  ENCERRADA: "Encerrada",
  CANCELADA: "Cancelada",
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};
const cash = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n ?? 0,
  );
const date = (s) =>
  s
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        ...(s.includes("T") ? { timeStyle: "short" } : {}),
      }).format(new Date(s.length === 10 ? s + "T12:00:00" : s))
    : "Sem término";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fresh = {
  clientes: { nome: "", telefone: "", email: "", status: "ATIVO" },
  barbeiros: { nome: "", status: "ATIVO" },
  servicos: { nome: "", preco: "", duracaoMin: 30, status: "ATIVO" },
  planos: { nome: "", preco: "", status: "ATIVO" },
  assinaturas: {
    clienteId: "",
    planoId: "",
    dataInicio: today(),
    dataFim: "",
    status: "ATIVA",
  },
  agendamentos: {
    clienteId: "",
    barbeiroId: "",
    servicoId: "",
    inicio: "",
    status: "AGENDADO",
  },
  barbearias: { nome: "", ativa: true },
  vinculo: { clienteId: "", status: "ATIVO" },
};
function Badge({ value }) {
  return (
    <span
      className={
        "badge " +
        (value === true ? "ATIVO" : value === false ? "INATIVO" : value)
      }
    >
      {typeof value === "boolean"
        ? value
          ? "Ativa"
          : "Inativa"
        : labels[value] || value}
    </span>
  );
}

export default function App() {
  const [page, setPage] = useState("resumo"),
    [shops, setShops] = useState([]),
    [shop, setShop] = useState(
      () => localStorage.getItem("barberflow.shop") || "",
    ),
    [data, setData] = useState({
      clientes: [],
      vinculos: [],
      barbeiros: [],
      servicos: [],
      planos: [],
      agendamentos: [],
      assinaturas: [],
    }),
    [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [filters, setFilters] = useState({ de: "", ate: "", status: "" }),
    [modal, setModal] = useState(null),
    [form, setForm] = useState({}),
    [saving, setSaving] = useState(false),
    [formError, setFormError] = useState(""),
    [availability, setAvailability] = useState("");
  const requestId = useRef(0),
    dialog = useRef(null),
    opener = useRef(null);
  const selected = shops.find((x) => String(x.id) === shop);
  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const list = (await api.get("/barbearias")).data;
      const chosen = list.some((x) => String(x.id) === shop)
        ? shop
        : list[0]
          ? String(list[0].id)
          : "";
      if (request !== requestId.current) return;
      setShops(list);
      if (chosen !== shop) {
        setShop(chosen);
        return;
      }
      if (!chosen) {
        setReport(null);
        return;
      }
      const params = { barbeariaId: chosen };
      const results = await Promise.all(
        [
          "clientes",
          "barbeiros",
          "servicos",
          "planos",
          "agendamentos",
          "assinaturas",
        ].map((x) => api.get("/" + x, { params })),
      );
      const [links, summary] = await Promise.all([
        api.get(`/barbearias/${chosen}/clientes`),
        api.get("/relatorios", {
          params: {
            ...params,
            ...Object.fromEntries(
              Object.entries(filters).filter(([k, v]) => k !== "status" && v),
            ),
          },
        }),
      ]);
      if (request !== requestId.current) return;
      setData(
        Object.fromEntries(
          [
            "clientes",
            "barbeiros",
            "servicos",
            "planos",
            "agendamentos",
            "assinaturas",
          ]
            .map((x, i) => [x, results[i].data])
            .concat([["vinculos", links.data]]),
        ),
      );
      setReport(summary.data);
    } catch (e) {
      if (request === requestId.current) setError(errorMessage(e));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [shop, filters]);
  useEffect(() => {
    load();
    return () => {
      ++requestId.current;
    };
  }, [load]);
  useEffect(() => {
    localStorage.setItem("barberflow.shop", shop);
    setSearch("");
  }, [shop]);
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
    } else if (dialog.current?.open) {
      dialog.current.close();
      opener.current?.focus();
    }
  }, [modal]);
  const open = (kind, item = null) => {
    opener.current = document.activeElement;
    setModal({ kind, id: item?.id });
    setForm({
      ...fresh[kind],
      ...item,
      ...(kind === "clientes" && item
        ? {
            status:
              data.vinculos.find((v) => v.clienteId === item.id)?.status ||
              "ATIVO",
          }
        : {}),
    });
    setFormError("");
    setAvailability("");
  };
  const close = () => {
    if (!saving) setModal(null);
  };
  const field = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setAvailability("");
  };
  const names = (kind, id) =>
    data[kind].find((x) => x.id === id)?.nome || `#${id}`;
  const linkedStatus = (id) =>
    data.vinculos.find((x) => x.clienteId === id)?.status;
  const rows = page === "barbearias" ? shops : data[page] || [];
  const filtered = rows.filter((x) => {
    const haystack = [
      x.nome,
      x.telefone,
      x.email,
      names("clientes", x.clienteId),
      names("barbeiros", x.barbeiroId),
      names("servicos", x.servicoId),
      names("planos", x.planoId),
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR");
    return (
      haystack.includes(search.toLocaleLowerCase("pt-BR")) &&
      (page !== "agendamentos" ||
        ((!filters.de || x.inicio.slice(0, 10) >= filters.de) &&
          (!filters.ate || x.inicio.slice(0, 10) <= filters.ate) &&
          (!filters.status || x.status === filters.status)))
    );
  });
  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    try {
      const kind = modal.kind;
      let payload;
      if (kind === "barbearias")
        payload = {
          nome: form.nome,
          ativa: form.ativa === true || form.ativa === "true",
        };
      if (kind === "clientes")
        payload = {
          nome: form.nome,
          telefone: form.telefone || null,
          email: form.email || null,
          status: form.status,
        };
      if (kind === "vinculo")
        payload = { clienteId: Number(form.clienteId), status: form.status };
      if (kind === "barbeiros")
        payload = {
          barbeariaId: Number(shop),
          nome: form.nome,
          status: form.status,
        };
      if (kind === "servicos")
        payload = {
          barbeariaId: Number(shop),
          nome: form.nome,
          status: form.status,
          preco: Number(form.preco),
          duracaoMin: Number(form.duracaoMin),
        };
      if (kind === "planos")
        payload = {
          barbeariaId: Number(shop),
          nome: form.nome,
          status: form.status,
          preco: Number(form.preco),
        };
      if (kind === "agendamentos")
        payload = {
          barbeariaId: Number(shop),
          clienteId: Number(form.clienteId),
          barbeiroId: Number(form.barbeiroId),
          servicoId: Number(form.servicoId),
          inicio: form.inicio,
          status: form.status,
        };
      if (kind === "assinaturas")
        payload = {
          clienteId: Number(form.clienteId),
          planoId: Number(form.planoId),
          dataInicio: form.dataInicio,
          dataFim: form.dataFim || null,
          status: form.status,
        };
      if (kind === "vinculo")
        await api.put(`/barbearias/${shop}/clientes`, payload);
      else if (kind === "clientes")
        await api[modal.id ? "put" : "post"](
          `/barbearias/${shop}/clientes/cadastro${modal.id ? "/" + modal.id : ""}`,
          payload,
        );
      else
        await api[modal.id ? "put" : "post"](
          "/" + kind + (modal.id ? "/" + modal.id : ""),
          payload,
        );
      setModal(null);
      setNotice("Alterações salvas com sucesso.");
      await load();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  async function checkAvailability() {
    setAvailability("Consultando…");
    try {
      const r = await api.get("/disponibilidade", {
        params: {
          barbeariaId: shop,
          barbeiroId: form.barbeiroId,
          servicoId: form.servicoId,
          inicio: form.inicio,
          ...(modal.id ? { ignorarId: modal.id } : {}),
        },
      });
      setAvailability(
        r.data.disponivel
          ? `Horário disponível até ${r.data.fim.slice(11, 16)}. A confirmação ocorre ao salvar.`
          : "Horário indisponível. Escolha outro horário ou profissional.",
      );
    } catch (e) {
      setAvailability(errorMessage(e));
    }
  }
  const input = (name, label, type = "text", extra = {}) => (
    <label>
      {label}
      <input
        name={name}
        type={type}
        value={form[name] ?? ""}
        onChange={(e) => field(name, e.target.value)}
        required
        {...extra}
      />
    </label>
  );
  const select = (name, label, options) => (
    <label>
      {label}
      <select
        name={name}
        aria-label={label}
        value={String(form[name] ?? "")}
        onChange={(e) => field(name, e.target.value)}
        required
      >
        <option value="">Selecione…</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
  const statusOptions = (values) => values.map((v) => [v, labels[v]]);
  const options = (kind) =>
    data[kind]
      .filter(
        (x) =>
          kind === "clientes" ||
          x.status === "ATIVO" ||
          x.id ===
            Number(
              form[
                {
                  clientes: "clienteId",
                  barbeiros: "barbeiroId",
                  servicos: "servicoId",
                  planos: "planoId",
                }[kind]
              ],
            ),
      )
      .filter(
        (x) =>
          kind !== "clientes" ||
          linkedStatus(x.id) === "ATIVO" ||
          x.id === Number(form.clienteId),
      )
      .map((x) => [
        x.id,
        x.nome +
          (kind === "servicos"
            ? ` • ${x.duracaoMin} min`
            : kind === "planos"
              ? ` • ${cash(x.preco)}`
              : ""),
      ]);
  const navigate = (id) => {
    setPage(id);
    setSearch("");
    setNotice("");
  };
  const agenda = data.agendamentos
    .filter((a) => a.inicio.slice(0, 10) === today())
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  return (
    <div className="app">
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("resumo");
          }}
        >
          <span className="brand-mark">✂</span>
          <span>
            barber<span className="brand-light">flow</span>
            <small>GESTÃO COM ESTILO</small>
          </span>
        </a>
        <div className="workspace-label">SEU ESPAÇO</div>
        <nav aria-label="Navegação principal">
          {pages.map(([id, label, icon]) => (
            <button
              key={id}
              className={page === id ? "nav active" : "nav"}
              aria-current={page === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
              {id === "agendamentos" && agenda.length > 0 && (
                <small>{agenda.length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="avatar">BF</span>
          <div>
            BarberFlow<small>Projeto acadêmico • gestão local</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>Seu negócio, em boa companhia.</span>
          <div className="shop-select">
            <label htmlFor="shop">Unidade</label>
            <select
              id="shop"
              value={shop}
              onChange={(e) => {
                setShop(e.target.value);
                setNotice("");
              }}
              aria-label="Selecionar barbearia"
            >
              <option value="" disabled>
                Selecione uma barbearia
              </option>
              {shops.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                  {!x.ativa ? " (inativa)" : ""}
                </option>
              ))}
            </select>
            <span className="avatar small">BF</span>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                BARBERFLOW /{" "}
                {page === "resumo"
                  ? "PAINEL"
                  : titles[page][0].toLocaleUpperCase("pt-BR")}
              </p>
              <h1>{titles[page][0]}</h1>
              <p>{titles[page][1]}</p>
            </div>
            <div className="heading-actions">
              <button className="secondary" onClick={load} disabled={loading}>
                ↻ Atualizar
              </button>
              {!["resumo", "relatorios"].includes(page) && (
                <button
                  className="primary"
                  disabled={loading || (!shop && page !== "barbearias")}
                  onClick={() => open(page)}
                >
                  +{" "}
                  {
                    {
                      clientes: "Novo cliente",
                      barbeiros: "Novo barbeiro",
                      servicos: "Novo serviço",
                      planos: "Novo plano",
                      agendamentos: "Novo agendamento",
                      assinaturas: "Nova assinatura",
                      barbearias: "Nova barbearia",
                    }[page]
                  }
                </button>
              )}
              {page === "resumo" && (
                <button
                  className="primary"
                  disabled={!shop || loading}
                  onClick={() => open("agendamentos")}
                >
                  + Novo agendamento
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button onClick={load}>Tentar novamente</button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              {notice}
              <button
                aria-label="Fechar mensagem"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {!selected?.ativa && shop && (
            <div className="alert">
              Esta barbearia está inativa. Ative-a em Barbearias para criar
              novos vínculos e atendimentos.
            </div>
          )}
          {loading ? (
            <div className="loading" role="status">
              Carregando sua barbearia…
            </div>
          ) : !shop && page !== "barbearias" ? (
            <div className="empty">
              <span>⌂</span>
              <h2>Vamos abrir as portas?</h2>
              <p>Cadastre a primeira barbearia para começar.</p>
              <button className="primary" onClick={() => open("barbearias")}>
                Cadastrar barbearia
              </button>
            </div>
          ) : error ? null : (
            <>
              {(page === "resumo" || page === "relatorios") && (
                <>
                  {page === "resumo" && (
                    <div className="welcome">
                      <div>
                        <span className="eyebrow">
                          CADA DETALHE FAZ A DIFERENÇA
                        </span>
                        <h2>
                          Mais tempo para fazer
                          <br />o que você faz de melhor.
                        </h2>
                        <p>
                          {selected?.nome} •{" "}
                          {new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "long",
                          }).format(new Date())}
                        </p>
                      </div>
                      <div className="welcome-art" aria-hidden="true">
                        <span>✂</span>
                        <div>
                          EST.
                          <br />
                          <b>
                            BARBER
                            <br />
                            FLOW
                          </b>
                          <br />
                          CUIDADO EM CADA CORTE
                        </div>
                      </div>
                    </div>
                  )}
                  {page === "relatorios" && (
                    <div className="filters">
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
                      <button
                        className="secondary"
                        onClick={() =>
                          setFilters({ de: "", ate: "", status: "" })
                        }
                      >
                        Limpar filtros
                      </button>
                    </div>
                  )}
                  <div className="stats">
                    {[
                      [
                        report?.resumo.clientesAtivos,
                        "Clientes ativos",
                        "Vínculos na unidade",
                        "♙",
                      ],
                      [
                        report?.resumo.agendamentos,
                        "Agendamentos",
                        filters.de || filters.ate
                          ? "No período selecionado"
                          : "Em todo o histórico",
                        "▦",
                      ],
                      [
                        report?.resumo.assinaturasVigentes,
                        "Assinaturas vigentes",
                        "Ativas no período atual",
                        "↻",
                      ],
                      [
                        cash(report?.resumo.valorServicosConcluidos),
                        "Serviços concluídos",
                        "Soma pelos preços atuais",
                        "↗",
                      ],
                    ].map(([value, label, hint, icon]) => (
                      <article key={label} className="stat">
                        <div>
                          <span>{label}</span>
                          <i aria-hidden="true">{icon}</i>
                        </div>
                        <strong>{value ?? 0}</strong>
                        <small>{hint}</small>
                      </article>
                    ))}
                  </div>
                  {page === "resumo" ? (
                    <div className="dashboard-grid">
                      <section className="panel">
                        <div className="panel-heading">
                          <div>
                            <h2>Agenda de hoje</h2>
                            <p>Um cuidado de cada vez.</p>
                          </div>
                          <button
                            className="text-button"
                            onClick={() => navigate("agendamentos")}
                          >
                            Ver agenda →
                          </button>
                        </div>
                        {agenda.length ? (
                          <div className="today-list">
                            {agenda.map((a) => (
                              <button
                                className="appointment"
                                key={a.id}
                                onClick={() => open("agendamentos", a)}
                              >
                                <time>
                                  {a.inicio.slice(11, 16)}
                                  <small>{a.fim.slice(11, 16)}</small>
                                </time>
                                <span className="client-initial">
                                  {names("clientes", a.clienteId).slice(0, 1)}
                                </span>
                                <span className="appointment-name">
                                  <strong>
                                    {names("clientes", a.clienteId)}
                                  </strong>
                                  <small>
                                    {names("servicos", a.servicoId)} •{" "}
                                    {names("barbeiros", a.barbeiroId)}
                                  </small>
                                </span>
                                <Badge value={a.status} />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="empty compact">
                            <span>▦</span>
                            <h3>O dia está livre por aqui.</h3>
                            <p>
                              Os atendimentos de hoje aparecerão neste espaço.
                            </p>
                            <button
                              className="text-button"
                              onClick={() => open("agendamentos")}
                            >
                              Agendar um atendimento →
                            </button>
                          </div>
                        )}
                      </section>
                      <section className="panel quick">
                        <div className="panel-heading">
                          <div>
                            <h2>Da casa</h2>
                            <p>Tudo pronto para atender.</p>
                          </div>
                        </div>
                        <div className="quick-number">
                          <span>Profissionais ativos</span>
                          <strong>{report?.resumo.barbeirosAtivos ?? 0}</strong>
                        </div>
                        <div className="quick-number">
                          <span>Serviços disponíveis</span>
                          <strong>{report?.resumo.servicosAtivos ?? 0}</strong>
                        </div>
                        <div className="quick-number">
                          <span>Atendimentos concluídos</span>
                          <strong>{report?.resumo.concluidos ?? 0}</strong>
                        </div>
                        <div className="quick-actions">
                          <button onClick={() => open("clientes")}>
                            ♙ Cadastrar cliente <span>↗</span>
                          </button>
                          <button onClick={() => navigate("servicos")}>
                            ◇ Explorar serviços <span>↗</span>
                          </button>
                          <button onClick={() => navigate("relatorios")}>
                            ▥ Consultar relatórios <span>↗</span>
                          </button>
                        </div>
                      </section>
                    </div>
                  ) : (
                    <div className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Atendimentos por profissional</h2>
                          <p>
                            Contagens por período de início do agendamento.
                            Valores usam o preço atual do serviço, sem
                            representar pagamentos recebidos.
                          </p>
                        </div>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Profissional</th>
                              <th>Agendamentos</th>
                              <th>Concluídos</th>
                              <th>Valor dos serviços concluídos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report?.barbeiros.map((b) => (
                              <tr key={b.id}>
                                <td>
                                  <strong>{b.nome}</strong>
                                </td>
                                <td>{b.agendamentos}</td>
                                <td>{b.concluidos}</td>
                                <td>{cash(b.valorServicosConcluidos)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="status-totals">
                        {report?.porStatus.map((x) => (
                          <div key={x.status}>
                            <Badge value={x.status} />
                            <strong>{x.quantidade}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              {!["resumo", "relatorios"].includes(page) && (
                <section className="panel">
                  <div className="list-toolbar">
                    <div>
                      <h2>{titles[page][0]}</h2>
                      <p>
                        {filtered.length} registro
                        {filtered.length === 1 ? "" : "s"}{" "}
                        {page === "barbearias" ? "no sistema" : "nesta unidade"}
                      </p>
                    </div>
                    <div className="list-actions">
                      {page === "clientes" && (
                        <button
                          className="secondary"
                          onClick={async () => {
                            try {
                              const all = (await api.get("/clientes")).data;
                              const unlinked = all.filter(
                                (x) =>
                                  !data.clientes.some((c) => c.id === x.id),
                              );
                              open("vinculo");
                              setForm((f) => ({ ...f, candidates: unlinked }));
                            } catch (e) {
                              setError(errorMessage(e));
                            }
                          }}
                        >
                          Vincular cliente existente
                        </button>
                      )}
                      <label className="search">
                        <span aria-hidden="true">⌕</span>
                        <input
                          aria-label="Buscar registros"
                          placeholder="Buscar por nome…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                  {page === "agendamentos" && (
                    <div className="filters">
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
                        Situação
                        <select
                          value={filters.status}
                          onChange={(e) =>
                            setFilters((f) => ({
                              ...f,
                              status: e.target.value,
                            }))
                          }
                        >
                          <option value="">Todas</option>
                          {statusOptions([
                            "AGENDADO",
                            "CONFIRMADO",
                            "CONCLUIDO",
                            "CANCELADO",
                          ]).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="secondary"
                        onClick={() =>
                          setFilters({ de: "", ate: "", status: "" })
                        }
                      >
                        Limpar filtros
                      </button>
                    </div>
                  )}
                  {filtered.length ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            {(page === "clientes"
                              ? ["Cliente", "Telefone", "E-mail", "Vínculo"]
                              : page === "agendamentos"
                                ? [
                                    "Cliente / serviço",
                                    "Profissional",
                                    "Início",
                                    "Término",
                                    "Situação",
                                  ]
                                : page === "assinaturas"
                                  ? [
                                      "Cliente",
                                      "Plano",
                                      "Início",
                                      "Término",
                                      "Situação",
                                    ]
                                  : page === "servicos"
                                    ? [
                                        "Serviço",
                                        "Preço",
                                        "Duração",
                                        "Situação",
                                      ]
                                    : page === "planos"
                                      ? ["Plano", "Preço", "Situação"]
                                      : ["Nome", "Situação"]
                            ).map((x) => (
                              <th key={x}>{x}</th>
                            ))}
                            <th>
                              <span className="sr-only">Ações</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((x) => (
                            <tr key={x.id}>
                              {page === "clientes" ? (
                                <>
                                  <td>
                                    <strong>{x.nome}</strong>
                                    <small>#{x.id}</small>
                                  </td>
                                  <td>{x.telefone || "—"}</td>
                                  <td>{x.email || "—"}</td>
                                  <td>
                                    <Badge value={linkedStatus(x.id)} />
                                  </td>
                                </>
                              ) : page === "agendamentos" ? (
                                <>
                                  <td>
                                    <strong>
                                      {names("clientes", x.clienteId)}
                                    </strong>
                                    <small>
                                      {names("servicos", x.servicoId)}
                                    </small>
                                  </td>
                                  <td>{names("barbeiros", x.barbeiroId)}</td>
                                  <td>{date(x.inicio)}</td>
                                  <td>{date(x.fim)}</td>
                                  <td>
                                    <Badge value={x.status} />
                                  </td>
                                </>
                              ) : page === "assinaturas" ? (
                                <>
                                  <td>
                                    <strong>
                                      {names("clientes", x.clienteId)}
                                    </strong>
                                  </td>
                                  <td>{names("planos", x.planoId)}</td>
                                  <td>{date(x.dataInicio)}</td>
                                  <td>{date(x.dataFim)}</td>
                                  <td>
                                    <Badge value={x.status} />
                                    {x.status === "ATIVA" &&
                                      x.dataFim &&
                                      x.dataFim < today() && (
                                        <small>Período expirado</small>
                                      )}
                                    {x.status === "ATIVA" &&
                                      x.dataInicio > today() && (
                                        <small>Início futuro</small>
                                      )}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td>
                                    <strong>{x.nome}</strong>
                                    <small>#{x.id}</small>
                                  </td>
                                  {["servicos", "planos"].includes(page) && (
                                    <td>{cash(x.preco)}</td>
                                  )}
                                  {page === "servicos" && (
                                    <td>{x.duracaoMin} min</td>
                                  )}
                                  <td>
                                    <Badge
                                      value={
                                        page === "barbearias"
                                          ? x.ativa
                                          : x.status
                                      }
                                    />
                                  </td>
                                </>
                              )}
                              <td>
                                <button
                                  className="edit"
                                  aria-label={`Editar ${x.nome || "registro " + x.id}`}
                                  onClick={() => open(page, x)}
                                >
                                  Editar ↗
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty compact">
                      <span>◇</span>
                      <h3>
                        {search
                          ? "Nenhum resultado encontrado."
                          : "Tudo começa com o primeiro cadastro."}
                      </h3>
                      <p>
                        {search
                          ? "Experimente outro termo de busca."
                          : "Use o botão acima para adicionar um registro."}
                      </p>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
          <footer>
            BARBERFLOW <span>Feito para cuidar do seu negócio.</span>
            <small>Projeto acadêmico • Banco de Dados</small>
          </footer>
        </div>
      </main>
      <dialog
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
        aria-labelledby="dialog-title"
      >
        <form onSubmit={save}>
          <div className="modal-heading">
            <div>
              <p className="eyebrow">{selected?.nome || "BARBERFLOW"}</p>
              <h2 id="dialog-title">
                {modal?.kind === "vinculo"
                  ? "Vincular cliente"
                  : `${modal?.id ? "Editar" : "Cadastrar"} ${{ clientes: "cliente", barbeiros: "barbeiro", servicos: "serviço", planos: "plano", assinaturas: "assinatura", agendamentos: "agendamento", barbearias: "barbearia" }[modal?.kind] || ""}`}
              </h2>
            </div>
            <button
              type="button"
              className="close"
              aria-label="Fechar formulário"
              disabled={saving}
              onClick={close}
            >
              ×
            </button>
          </div>
          <div className="form-fields">
            {formError && (
              <div className="alert error full" role="alert">
                {formError}
              </div>
            )}
            {modal &&
              [
                "clientes",
                "barbeiros",
                "servicos",
                "planos",
                "barbearias",
              ].includes(modal.kind) &&
              input("nome", "Nome", "text", { maxLength: 100 })}
            {modal?.kind === "clientes" && (
              <>
                {input("telefone", "Telefone", "tel", {
                  required: false,
                  maxLength: 20,
                })}
                {input("email", "E-mail", "email", {
                  required: false,
                  maxLength: 120,
                })}
              </>
            )}
            {modal &&
              ["servicos", "planos"].includes(modal.kind) &&
              input("preco", "Preço (R$)", "number", {
                min: 0,
                max: 99999999.99,
                step: "0.01",
              })}
            {modal?.kind === "servicos" &&
              input("duracaoMin", "Duração (minutos)", "number", {
                min: 1,
                max: 1440,
                step: 1,
              })}
            {modal?.kind === "barbearias" &&
              select("ativa", "Situação", [
                ["true", "Ativa"],
                ["false", "Inativa"],
              ])}
            {modal?.kind === "vinculo" &&
              select(
                "clienteId",
                "Cliente",
                (form.candidates || []).map((c) => [c.id, c.nome]),
              )}
            {modal &&
              ["assinaturas", "agendamentos"].includes(modal.kind) &&
              select("clienteId", "Cliente", options("clientes"))}
            {modal?.kind === "agendamentos" && (
              <>
                {select("barbeiroId", "Barbeiro", options("barbeiros"))}
                {select("servicoId", "Serviço", options("servicos"))}
                {input("inicio", "Início do atendimento", "datetime-local", {
                  min: "1900-01-01T00:00",
                  max: "9998-12-31T23:59",
                })}
                <div className="availability full">
                  <button
                    type="button"
                    className="secondary"
                    disabled={
                      !form.barbeiroId || !form.servicoId || !form.inicio
                    }
                    onClick={checkAvailability}
                  >
                    Verificar disponibilidade
                  </button>
                  {availability && <p role="status">{availability}</p>}
                  <small>O término é calculado pela duração do serviço.</small>
                </div>
              </>
            )}
            {modal?.kind === "assinaturas" && (
              <>
                {select("planoId", "Plano", options("planos"))}
                {input("dataInicio", "Data inicial", "date", {
                  min: "1900-01-01",
                  max: "9998-12-31",
                })}
                {input("dataFim", "Data final (opcional)", "date", {
                  required: false,
                  min: form.dataInicio || "1900-01-01",
                  max: "9998-12-31",
                })}
              </>
            )}
            {modal &&
              modal.kind !== "barbearias" &&
              select(
                "status",
                modal.kind === "clientes"
                  ? "Vínculo com esta unidade"
                  : "Situação",
                statusOptions(
                  modal.kind === "assinaturas"
                    ? ["ATIVA", "ENCERRADA", "CANCELADA"]
                    : modal.kind === "agendamentos"
                      ? ["AGENDADO", "CONFIRMADO", "CONCLUIDO", "CANCELADO"]
                      : ["ATIVO", "INATIVO"],
                ),
              )}
            {modal?.kind === "clientes" && modal.id && (
              <p className="form-note full">
                Nome e contato são compartilhados entre as barbearias. A
                situação do vínculo se aplica apenas a esta unidade.
              </p>
            )}
            {modal?.kind === "vinculo" && !form.candidates?.length && (
              <p className="form-note full">
                Não há clientes sem vínculo nesta unidade. Para reativar um
                cliente, edite o cadastro dele.
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="secondary"
              disabled={saving}
              onClick={close}
            >
              Cancelar
            </button>
            <button className="primary" disabled={saving}>
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
