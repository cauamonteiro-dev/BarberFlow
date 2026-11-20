import { useState } from "react";
import { ShopLogo } from "./ShopIdentity";

const currency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value ?? 0,
  );
const labels = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
  CONCLUIDO: "Concluído",
};
export default function CustomerHome({
  user,
  appointments,
  loading,
  error,
  onExplore,
  onManage,
  onRetry,
}) {
  const [selection, setTab] = useState(null);
  const isUpcoming = (a) =>
    ["AGENDADO", "CONFIRMADO"].includes(a.status) &&
    new Date(a.inicio) > new Date();
  const upcoming = appointments
    .filter(isUpcoming)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const history = appointments
    .filter((a) => !isUpcoming(a))
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
  const tab =
    selection ?? (upcoming.length || !history.length ? "upcoming" : "history");
  const visible = tab === "upcoming" ? upcoming : history;
  const name = (user?.nomeExibicao || user?.nome || "cliente").split(" ")[0];
  return (
    <div className="customer-home">
      <section className="customer-welcome">
        <div>
          <p className="eyebrow">SEU TEMPO, BEM CUIDADO</p>
          <h1>Olá, {name}!</h1>
          <p>Seus agendamentos, em um só lugar.</p>
        </div>
        <button className="primary" onClick={onExplore}>
          Encontrar uma barbearia <span aria-hidden="true">→</span>
        </button>
      </section>
      <section aria-labelledby="my-bookings-title">
        <div className="discovery-results">
          <h2 id="my-bookings-title">Meus agendamentos</h2>
          <button className="secondary" disabled={loading} onClick={onRetry}>
            Atualizar
          </button>
        </div>
        <div className="client-view-nav" aria-label="Filtrar meus agendamentos">
          <button
            className={tab === "upcoming" ? "primary" : "secondary"}
            aria-pressed={tab === "upcoming"}
            onClick={() => setTab("upcoming")}
          >
            Próximos ({upcoming.length})
          </button>
          <button
            className={tab === "history" ? "primary" : "secondary"}
            aria-pressed={tab === "history"}
            onClick={() => setTab("history")}
          >
            Histórico ({history.length})
          </button>
        </div>
        {loading ? (
          <div className="loading" role="status">
            Carregando seus agendamentos…
          </div>
        ) : error ? (
          <div className="alert error" role="alert">
            {error}
            <button className="secondary" onClick={onRetry}>
              Tentar novamente
            </button>
          </div>
        ) : visible.length ? (
          <div className="customer-bookings">
            {visible.map((a, i) => {
              const shop = {
                id: a.barbeariaId,
                nome: a.barbeariaNome,
                ativa: a.barbeariaAtiva,
              };
              return (
                <article
                  className={`customer-booking ${tab === "upcoming" && i === 0 ? "next-booking" : ""}`}
                  key={a.id}
                  aria-label={`${a.servicoNome} em ${a.barbeariaNome}`}
                >
                  <div className="booking-date">
                    <strong>
                      {new Date(a.inicio).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                      })}
                    </strong>
                    <span>
                      {new Date(a.inicio).toLocaleDateString("pt-BR", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <b>{a.inicio.slice(11, 16)}</b>
                  </div>
                  <div className="booking-details">
                    {tab === "upcoming" && i === 0 && (
                      <p className="eyebrow">SEU PRÓXIMO ATENDIMENTO</p>
                    )}
                    <h3>{a.servicoNome}</h3>
                    <div className="booking-unit">
                      <ShopLogo shop={shop} />
                      <strong>{a.barbeariaNome}</strong>
                    </div>
                    <p>
                      Com {a.barbeiroNome} • Até {a.fim.slice(11, 16)} •{" "}
                      {a.assinaturaId
                        ? "Incluído no plano"
                        : currency(a.valorAcordado)}
                      {a.valorEstimado ? " (estimado)" : ""}
                    </p>
                    {!a.barbeariaAtiva && (
                      <small>
                        Esta unidade não está recebendo novos agendamentos.
                      </small>
                    )}
                  </div>
                  <div className="booking-card-actions">
                    <span className={`badge ${a.status}`}>
                      {labels[a.status]}
                    </span>
                    <button
                      className="secondary"
                      onClick={() => onManage(shop)}
                    >
                      Ver agendamento
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="panel empty">
            <span aria-hidden="true">▦</span>
            <h3>
              {tab === "upcoming"
                ? "Seu próximo cuidado está por marcar"
                : "Seu histórico começa aqui"}
            </h3>
            <p>
              {tab === "upcoming"
                ? "Escolha uma barbearia e encontre um horário que combine com você."
                : "Os atendimentos anteriores e cancelados aparecerão neste espaço."}
            </p>
            <button className="primary" onClick={onExplore}>
              Explorar barbearias
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
