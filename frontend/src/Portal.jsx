import ResponsiveTable from "./ResponsiveTable";
import { useEffect, useState, useCallback, useRef } from "react";
import { api, errorMessage } from "./api";
import { BrandRail } from "./AuthShell";
import { useTheme } from "./useTheme";
import ThemeToggle from "./ThemeToggle";
import { shopPresentation, ShopImage } from "./shopPresentation";
import { ShopIdentity, ShopLogo } from "./ShopIdentity";
import { DateField, SlotPicker, today } from "./BookingFields";
import { ShopPlanArea, usable, usePlanActions } from "./CustomerPlans";
import "./shop-search.css";
const money = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n ?? 0,
  );
const date = (s) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
const emptyBooking = {
  barbeiroId: "",
  servicoId: "",
  inicio: "",
  status: "AGENDADO",
  assinaturaId: "",
};
const lastBookableDay = () => {
  const [year, month, day] = today().split("-").map(Number);
  const inNextYear = Math.min(day, new Date(year + 1, month, 0).getDate());
  return `${year + 1}-${String(month).padStart(2, "0")}-${String(inNextYear).padStart(2, "0")}`;
};
export default function Portal({
  role,
  selectedShop,
  onChooseShop,
  onViewShop,
  onHome,
  user,
  onReady,
  initialView = "booking",
}) {
  const [shops, setShops] = useState([]),
    [shop, setShop] = useState(""),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState(null),
    [slots, setSlots] = useState([]),
    [slotsState, setSlotsState] = useState("idle"),
    [slotsError, setSlotsError] = useState(""),
    [slotsRetry, setSlotsRetry] = useState(0),
    [day, setDay] = useState(today()),
    [hours, setHours] = useState(null),
    [clientView, setClientView] = useState(initialView),
    [barberDay, setBarberDay] = useState(today()),
    [barberAll, setBarberAll] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const client = role === "CLIENTE";
  const subscriptions = data?.assinaturas ?? [];
  const findPlan = (id) => data?.planos?.find((plan) => plan.id === id);
  const plansForBooking = subscriptions.filter(
    (a) =>
      usable(a) &&
      data?.servicos.some(
        (s) =>
          s.status === "ATIVO" &&
          findPlan(a.planoId)?.servicoIds?.includes(s.id),
      ),
  );
  const selectedSubscription = subscriptions.find(
    (a) => a.id === Number(form?.assinaturaId),
  );
  const coveredPlan = findPlan(selectedSubscription?.planoId);
  const minDay = [today(), selectedSubscription?.dataInicio]
    .filter(Boolean)
    .sort()
    .at(-1);
  const maxDay = [lastBookableDay(), selectedSubscription?.dataFim]
    .filter(Boolean)
    .sort()[0];
  const requestId = useRef(0);
  const ready = data?.barbeariaId === shop;
  const activeShop = selectedShop || shops.find((s) => String(s.id) === shop);
  const professionalName =
    data?.barbeiros?.[0]?.nome ||
    user?.unidades?.find(
      (u) => String(u.id) === shop && u.perfil === "BARBEIRO",
    )?.profissional_nome ||
    user?.nome ||
    "profissional";
  const visibleAppointments = (data?.agendamentos || []).filter(
    (a) => client || barberAll || a.inicio.slice(0, 10) === barberDay,
  );
  useEffect(() => {
    let active = true;
    api
      .get("/portal/barbearias")
      .then((r) => {
        if (active) {
          setShops(r.data);
          setShop(String(selectedShop?.id || r.data[0]?.id || ""));
          if (!r.data.length) onReady?.();
        }
      })
      .catch((e) => {
        if (active) {
          setError(errorMessage(e));
          onReady?.();
        }
      });
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
    } finally {
      if (generation === requestId.current) onReady?.();
    }
  }, [shop, role, client, onReady]);
  const planActions = usePlanActions(load);
  function openBooking(subscription) {
    setClientView("booking");
    setNotice("");
    setForm({ ...emptyBooking, assinaturaId: subscription?.id ?? "" });
    setDay(
      subscription?.dataInicio > today() ? subscription.dataInicio : today(),
    );
  }
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
    const controller = new AbortController();
    setSlots([]);
    setSlotsError("");
    if (
      form?.barbeiroId &&
      form?.servicoId &&
      day &&
      day >= minDay &&
      day <= maxDay
    ) {
      setSlotsState("loading");
      api
        .get("/portal/horarios-disponiveis", {
          signal: controller.signal,
          timeout: 60000,
          params: {
            barbeariaId: shop,
            barbeiroId: form.barbeiroId,
            servicoId: form.servicoId,
            dia: day,
            ...(form.id ? { ignorarId: form.id } : {}),
          },
        })
        .then((r) => {
          if (active) {
            setSlots(r.data);
            setSlotsState("success");
          }
        })
        .catch((e) => {
          if (active) {
            setSlotsError(
              "Não foi possível consultar os horários. Tente novamente.",
            );
            setSlotsState("error");
          }
        });
    } else setSlotsState("idle");
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    form?.barbeiroId,
    form?.servicoId,
    form?.id,
    day,
    minDay,
    maxDay,
    shop,
    slotsRetry,
  ]);
  useEffect(() => {
    if (client && selectedShop && ready && initialView === "booking") {
      setForm({ ...emptyBooking });
      setDay(today());
    }
  }, [client, selectedShop, ready, initialView]);
  const name = (kind, id) =>
    data?.[kind]?.find((x) => x.id === id)?.nome || `#${id}`;
  const payload = (a) => ({
    barbeariaId: Number(shop),
    barbeiroId: Number(a.barbeiroId),
    servicoId: Number(a.servicoId),
    inicio: a.inicio,
    status: a.status || "AGENDADO",
    assinaturaId: a.assinaturaId ? Number(a.assinaturaId) : null,
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
      const { data: saved } = await fn();
      setForm(null);
      if (client) setClientView("appointments");
      setNotice("Alterações salvas.");
      if (client) {
        await load();
      } else {
        ++requestId.current;
        setData((current) => {
          if (current?.barbeariaId !== String(saved.barbeariaId))
            return current;
          return {
            ...current,
            agendamentos: current.agendamentos.map((appointment) =>
              appointment.id === saved.id ? saved : appointment,
            ),
          };
        });
      }
    } catch (e) {
      if (e.response?.data?.detail?.includes("preço")) await load();
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app">
      <BrandRail shop={activeShop} />
      <main>
        <header className="topbar">
          <span>
            {client
              ? "Seu próximo cuidado começa aqui."
              : "Sua agenda, bem organizada."}
          </span>
          <div className="shop-select">
            {client && selectedShop ? (
              <>
                <span className="selected-shop-name">{selectedShop.nome}</span>
                <button
                  className="secondary change-shop"
                  disabled={busy}
                  onClick={onChooseShop}
                >
                  Pesquisar outra barbearia
                </button>
              </>
            ) : (
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
            )}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>
        <div className="content">
          {client && onHome && (
            <button
              className="secondary back-to-home"
              disabled={busy}
              onClick={onHome}
            >
              ← Todos os meus agendamentos
            </button>
          )}
          {!client && <ShopIdentity shop={activeShop} label="VOCÊ ATENDE EM" />}
          {client && selectedShop && (
            <section
              className="booking-shop-banner"
              aria-label="Barbearia escolhida"
            >
              <ShopImage shop={selectedShop} />
              <div>
                <ShopLogo shop={selectedShop} />
                <p className="eyebrow">UNIDADE SELECIONADA</p>
                <h2>{selectedShop.nome}</h2>
                <p>{shopPresentation(selectedShop).address}</p>
                <span>
                  Foto ilustrativa
                  {shopPresentation(selectedShop).demo
                    ? " • endereço fictício"
                    : ""}
                </span>
              </div>
              {onViewShop && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={onViewShop}
                >
                  Sobre a barbearia
                </button>
              )}
            </section>
          )}
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {client ? "ESPAÇO DO CLIENTE" : "ESPAÇO DO BARBEIRO"}
              </p>
              <h1>
                {client
                  ? clientView === "booking"
                    ? "Agendar serviço"
                    : clientView === "plans"
                      ? "Planos e assinaturas"
                      : "Meus agendamentos"
                  : `Olá, ${professionalName.split(" ")[0]}!`}
              </h1>
              <p>
                {client
                  ? clientView === "booking"
                    ? "Escolha um serviço, um profissional e um horário disponível."
                    : clientView === "plans"
                      ? "Combine a contratação e o pagamento com a barbearia. Quando ela ativar seu plano, você poderá agendar os serviços incluídos."
                      : "Somente suas reservas nesta barbearia. Você pode remarcar ou cancelar atendimentos futuros em aberto."
                  : `Segue abaixo ${barberAll ? "a sua agenda" : "os agendamentos do dia"} em ${activeShop?.nome || "sua barbearia"}.`}
              </p>
            </div>
            {client && shop && (
              <button
                className="primary"
                disabled={!ready || busy}
                onClick={() => openBooking()}
              >
                Novo agendamento
              </button>
            )}
          </div>
          {client && (
            <nav className="client-view-nav" aria-label="Área do cliente">
              <button
                className={clientView === "booking" ? "primary" : "secondary"}
                aria-current={clientView === "booking" ? "page" : undefined}
                disabled={!ready || busy}
                onClick={() => openBooking()}
              >
                Agendar serviço
              </button>
              <button
                className={
                  clientView === "appointments" ? "primary" : "secondary"
                }
                aria-current={
                  clientView === "appointments" ? "page" : undefined
                }
                disabled={!ready || busy}
                onClick={() => {
                  setClientView("appointments");
                  setForm(null);
                  setNotice("");
                }}
              >
                Meus agendamentos
              </button>
              <button
                className={clientView === "plans" ? "primary" : "secondary"}
                aria-current={clientView === "plans" ? "page" : undefined}
                disabled={!ready || busy}
                onClick={() => {
                  setClientView("plans");
                  setForm(null);
                  setNotice("");
                }}
              >
                Planos e assinaturas
              </button>
            </nav>
          )}
          {!client && (
            <div className="barber-agenda-toolbar">
              <div>
                <strong>Minha agenda</strong>
                <p>
                  {professionalName} • {activeShop?.nome}
                </p>
              </div>
              <DateField
                label="Dia da agenda"
                value={barberDay}
                onChange={(value) => {
                  setBarberDay(value);
                  setBarberAll(false);
                }}
              />
              <button
                className="secondary"
                aria-pressed={barberAll}
                onClick={() => setBarberAll(!barberAll)}
              >
                {barberAll ? "Mostrar apenas o dia" : "Ver toda a agenda"}
              </button>
            </div>
          )}
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
          {ready && client && clientView === "plans" && (
            <ShopPlanArea
              plans={data.planos ?? []}
              subscriptions={subscriptions}
              services={data.servicos}
              shop={activeShop}
              actions={planActions}
              onBook={openBooking}
            />
          )}
          {form && (!client || clientView === "booking") && (
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
                  {!form.id && plansForBooking.length > 0 && (
                    <label className="full">
                      Modalidade do agendamento
                      <select
                        value={form.assinaturaId ?? ""}
                        onChange={(event) =>
                          openBooking(
                            plansForBooking.find(
                              (a) => String(a.id) === event.target.value,
                            ),
                          )
                        }
                      >
                        <option value="">Serviço avulso</option>
                        {plansForBooking.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.planoNome}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {form.assinaturaId && (
                    <p className="plan-benefit-note full">
                      Agendamento pelo plano {selectedSubscription?.planoNome}.
                      Escolha um serviço incluído para atender dentro da
                      vigência.
                    </p>
                  )}
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
                        .filter(
                          (s) =>
                            s.status === "ATIVO" &&
                            (!form.assinaturaId ||
                              coveredPlan?.servicoIds?.includes(s.id)),
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nome} •{" "}
                            {form.assinaturaId
                              ? "Incluído no plano"
                              : money(s.preco)}{" "}
                            • {s.duracaoMin} min
                          </option>
                        ))}
                    </select>
                  </label>
                  <DateField
                    label="Dia"
                    min={minDay}
                    max={maxDay}
                    required
                    value={day}
                    onChange={(value) => {
                      setDay(value);
                      setForm({ ...form, inicio: "" });
                    }}
                  />
                  <SlotPicker
                    slots={slots}
                    state={slotsState}
                    value={form.inicio}
                    onChange={(inicio) => setForm({ ...form, inicio })}
                  />
                  <p
                    className="form-note full"
                    role="status"
                    aria-live="polite"
                  >
                    {slotsState === "loading"
                      ? "Consultando os horários disponíveis…"
                      : slotsState === "error"
                        ? slotsError
                        : slotsState === "success"
                          ? slots.length
                            ? "A disponibilidade é confirmada novamente ao salvar."
                            : "Não há horários disponíveis nesta data. Escolha outro dia ou profissional."
                          : "Escolha o profissional, serviço e dia para consultar os horários."}
                    {slotsState === "error" && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setSlotsRetry((n) => n + 1)}
                      >
                        Tentar novamente
                      </button>
                    )}
                    {form.id &&
                      !form.assinaturaId &&
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
                  <button
                    className="primary"
                    disabled={
                      busy ||
                      slotsState !== "success" ||
                      !slots.some((s) => s.inicio === form.inicio)
                    }
                  >
                    Salvar agendamento
                  </button>
                </div>
              </form>
            </section>
          )}
          {ready && (!client || clientView === "appointments") && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <h2>
                    {client
                      ? "Minhas reservas"
                      : "Atendimentos atribuídos a você"}
                  </h2>
                  <button className="secondary" onClick={load}>
                    Atualizar
                  </button>
                </div>
                <div className="table-wrap">
                  <ResponsiveTable>
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
                      {[...visibleAppointments]
                        .sort((a, b) =>
                          client || barberAll
                            ? b.inicio.localeCompare(a.inicio)
                            : a.inicio.localeCompare(b.inicio),
                        )
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
                                Profissional: {name("barbeiros", a.barbeiroId)}{" "}
                                •{" "}
                                {a.assinaturaId
                                  ? "Incluído no plano"
                                  : money(a.valorAcordado)}
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
                                          setClientView("booking");
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
                  </ResponsiveTable>
                  {visibleAppointments.length === 0 && (
                    <div className="empty compact">
                      {client || barberAll
                        ? "Nenhum agendamento nesta unidade."
                        : "Nenhum agendamento para este dia."}
                    </div>
                  )}
                </div>
              </section>
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
