import { useEffect, useState, useCallback, useRef } from "react";
import { api, errorMessage } from "./api";
import { BrandRail } from "./AuthShell";
import { useTheme } from "./useTheme";
import ThemeToggle from "./ThemeToggle";
const money = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n ?? 0,
  );
const date = (s) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export default function Portal({ role }) {
  const [shops, setShops] = useState([]),
    [shop, setShop] = useState(""),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState(null),
    [slots, setSlots] = useState([]),
    [day, setDay] = useState(today()),
    [hours, setHours] = useState(null);
  const { theme, toggleTheme } = useTheme();
  const client = role === "CLIENTE";
  const requestId = useRef(0);
  const ready = data?.barbeariaId === shop;
  useEffect(() => {
    let active = true;
    api
      .get("/portal/barbearias")
      .then((r) => {
        if (active) {
          setShops(r.data);
          setShop(String(r.data[0]?.id || ""));
        }
      })
      .catch((e) => setError(errorMessage(e)));
    return () => {
      active = false;
    };
  }, []);
  const load = useCallback(async () => {
    const generation = ++requestId.current;
    if (!shop) return;
    setError("");
    try {
      const response = await api.get("/portal/painel", {
        params: { barbeariaId: shop, perfil: role },
      });
      if (generation !== requestId.current) return;
      let calendar = null;
      if (!client && response.data.barbeiros[0])
        calendar = (
          await api.get(
            `/administracao/barbeiros/${response.data.barbeiros[0].id}/horarios`,
          )
        ).data;
      if (generation !== requestId.current) return;
      setData({ ...response.data, barbeariaId: shop });
      setHours(calendar);
    } catch (e) {
      if (generation === requestId.current) setError(errorMessage(e));
    }
  }, [shop, role, client]);
  useEffect(() => {
    setData(null);
    setHours(null);
    setForm(null);
    load();
    return () => {
      ++requestId.current;
    };
  }, [load]);
  useEffect(() => {
    let active = true;
    setSlots([]);
    if (form?.barbeiroId && form?.servicoId && day)
      api
        .get("/portal/horarios-disponiveis", {
          params: {
            barbeariaId: shop,
            barbeiroId: form.barbeiroId,
            servicoId: form.servicoId,
            dia: day,
            ...(form.id ? { ignorarId: form.id } : {}),
          },
        })
        .then((r) => {
          if (active) setSlots(r.data);
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        });
    return () => {
      active = false;
    };
  }, [form?.barbeiroId, form?.servicoId, form?.id, day, shop]);
  const name = (kind, id) =>
    data?.[kind]?.find((x) => x.id === id)?.nome || `#${id}`;
  const payload = (a) => ({
    barbeariaId: Number(shop),
    barbeiroId: Number(a.barbeiroId),
    servicoId: Number(a.servicoId),
    inicio: a.inicio,
    status: a.status || "AGENDADO",
    valorEsperado: Number(
      data?.servicos.find((s) => s.id === Number(a.servicoId))?.preco,
    ),
  });
  async function mutation(fn) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setForm(null);
      setNotice("Alterações salvas.");
      await load();
    } catch (e) {
      if (e.response?.data?.detail?.includes("preço")) await load();
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app">
      <BrandRail />
      <main>
        <header className="topbar">
          <span>
            {client
              ? "Seu próximo cuidado começa aqui."
              : "Sua agenda, bem organizada."}
          </span>
          <div className="shop-select">
            <select
              aria-label="Selecionar barbearia"
              disabled={busy}
              value={shop}
              onChange={(e) => setShop(e.target.value)}
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {client ? "ESPAÇO DO CLIENTE" : "ESPAÇO DO BARBEIRO"}
              </p>
              <h1>{client ? "Meus agendamentos" : "Minha agenda"}</h1>
              <p>
                {client
                  ? "Escolha um serviço e um horário disponível."
                  : "Acompanhe seus horários e os clientes de cada atendimento."}
              </p>
            </div>
            {client && shop && (
              <button
                className="primary"
                disabled={!ready || busy}
                onClick={() => {
                  setForm({
                    barbeiroId: "",
                    servicoId: "",
                    inicio: "",
                    status: "AGENDADO",
                  });
                  setDay(today());
                }}
              >
                Novo agendamento
              </button>
            )}
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              {notice}
            </div>
          )}
          {!shop && (
            <div className="empty">
              Nenhuma barbearia disponível para este acesso.
            </div>
          )}
          {form && (
            <section className="panel portal-form">
              <h2>{form.id ? "Remarcar atendimento" : "Novo agendamento"}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation(() =>
                    api[form.id ? "put" : "post"](
                      `/portal/agendamentos${form.id ? "/" + form.id : ""}`,
                      payload(form),
                    ),
                  );
                }}
              >
                <div className="form-fields">
                  <label>
                    Barbeiro
                    <select
                      required
                      value={form.barbeiroId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          barbeiroId: e.target.value,
                          inicio: "",
                        })
                      }
                    >
                      <option value="">Selecione…</option>
                      {data?.barbeiros
                        .filter((b) => b.status === "ATIVO")
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nome}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Serviço
                    <select
                      required
                      value={form.servicoId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          servicoId: e.target.value,
                          inicio: "",
                        })
                      }
                    >
                      <option value="">Selecione…</option>
                      {data?.servicos
                        .filter((s) => s.status === "ATIVO")
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nome} • {money(s.preco)} • {s.duracaoMin} min
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Dia
                    <input
                      type="date"
                      min={today()}
                      required
                      value={day}
                      onChange={(e) => {
                        setDay(e.target.value);
                        setForm({ ...form, inicio: "" });
                      }}
                    />
                  </label>
                  <label>
                    Horário disponível
                    <select
                      required
                      value={form.inicio}
                      onChange={(e) =>
                        setForm({ ...form, inicio: e.target.value })
                      }
                    >
                      <option value="">Selecione…</option>
                      {slots.map((s) => (
                        <option key={s.inicio} value={s.inicio}>
                          {s.inicio.slice(11, 16)} — {s.fim.slice(11, 16)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="form-note full">
                    {slots.length
                      ? "A disponibilidade é confirmada novamente ao salvar."
                      : "Escolha o profissional, serviço e dia. Se não houver horários, experimente outra data."}
                    {form.id &&
                      " O valor combinado é mantido ao remarcar o mesmo serviço."}
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setForm(null)}
                  >
                    Voltar
                  </button>
                  <button className="primary" disabled={busy}>
                    Salvar agendamento
                  </button>
                </div>
              </form>
            </section>
          )}
          {ready && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <h2>
                    {client
                      ? "Reservas e histórico"
                      : "Atendimentos atribuídos a você"}
                  </h2>
                  <button className="secondary" onClick={load}>
                    Atualizar
                  </button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {!client && <th>Cliente / contato</th>}
                        <th>Atendimento</th>
                        <th>Horário</th>
                        <th>Situação</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data.agendamentos]
                        .sort((a, b) => b.inicio.localeCompare(a.inicio))
                        .map((a) => (
                          <tr key={a.id}>
                            {!client && (
                              <td>
                                <strong>{name("clientes", a.clienteId)}</strong>
                                <small>
                                  {data.clientes.find(
                                    (c) => c.id === a.clienteId,
                                  )?.telefone ||
                                    data.clientes.find(
                                      (c) => c.id === a.clienteId,
                                    )?.email ||
                                    "Sem contato"}
                                </small>
                              </td>
                            )}
                            <td>
                              <strong>{name("servicos", a.servicoId)}</strong>
                              <small>
                                {name("barbeiros", a.barbeiroId)} •{" "}
                                {money(a.valorAcordado)}
                                {a.valorEstimado ? " (estimado)" : ""}
                              </small>
                            </td>
                            <td>
                              {date(a.inicio)}
                              <small>Até {a.fim.slice(11, 16)}</small>
                            </td>
                            <td>
                              <span className={`badge ${a.status}`}>
                                {
                                  {
                                    AGENDADO: "Agendado",
                                    CONFIRMADO: "Confirmado",
                                    CONCLUIDO: "Concluído",
                                    CANCELADO: "Cancelado",
                                  }[a.status]
                                }
                              </span>
                            </td>
                            <td>
                              <div className="row-actions">
                                {client &&
                                  new Date(a.inicio) > new Date() &&
                                  ["AGENDADO", "CONFIRMADO"].includes(
                                    a.status,
                                  ) && (
                                    <>
                                      <button
                                        className="secondary"
                                        onClick={() => {
                                          setDay(a.inicio.slice(0, 10));
                                          setForm({ ...a, status: "AGENDADO" });
                                        }}
                                      >
                                        Remarcar
                                      </button>
                                      <button
                                        className="secondary"
                                        disabled={busy}
                                        onClick={() => {
                                          if (
                                            confirm(
                                              "Cancelar este agendamento?",
                                            )
                                          )
                                            mutation(() =>
                                              api.put(
                                                `/portal/agendamentos/${a.id}`,
                                                {
                                                  ...payload(a),
                                                  status: "CANCELADO",
                                                },
                                              ),
                                            );
                                        }}
                                      >
                                        Cancelar
                                      </button>
                                    </>
                                  )}
                                {!client &&
                                  ["AGENDADO", "CONFIRMADO"].includes(
                                    a.status,
                                  ) && (
                                    <>
                                      {a.status === "AGENDADO" && (
                                        <button
                                          className="secondary"
                                          disabled={busy}
                                          onClick={() =>
                                            mutation(() =>
                                              api.put(
                                                `/portal/atendimentos/${a.id}`,
                                                { status: "CONFIRMADO" },
                                              ),
                                            )
                                          }
                                        >
                                          Confirmar
                                        </button>
                                      )}
                                      <button
                                        className="primary"
                                        disabled={
                                          busy ||
                                          new Date(a.inicio) > new Date()
                                        }
                                        onClick={() =>
                                          mutation(() =>
                                            api.put(
                                              `/portal/atendimentos/${a.id}`,
                                              { status: "CONCLUIDO" },
                                            ),
                                          )
                                        }
                                      >
                                        Concluir
                                      </button>
                                    </>
                                  )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {data.agendamentos.length === 0 && (
                    <div className="empty compact">
                      Nenhum agendamento nesta unidade.
                    </div>
                  )}
                </div>
              </section>
              {client && data.assinaturas.length > 0 && (
                <section className="panel portal-section">
                  <div className="panel-heading">
                    <h2>Minhas assinaturas nesta unidade</h2>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Plano</th>
                          <th>Período</th>
                          <th>Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.assinaturas.map((a) => (
                          <tr key={a.id}>
                            <td>Plano #{a.planoId}</td>
                            <td>
                              {a.dataInicio} — {a.dataFim || "Sem término"}
                            </td>
                            <td>{a.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              {hours && (
                <section className="panel portal-section">
                  <div className="panel-heading">
                    <h2>Meu expediente e bloqueios</h2>
                  </div>
                  <div className="schedule-summary">
                    {hours.expediente.map((h, i) => (
                      <span key={i}>
                        {
                          ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][
                            h.diaSemana
                          ]
                        }{" "}
                        • {h.inicio.slice(0, 5)}–{h.fim.slice(0, 5)}
                      </span>
                    ))}
                    {hours.bloqueios.map((b) => (
                      <p key={b.id}>
                        {date(b.inicio)} a {date(b.fim)} • {b.motivo}
                      </p>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
