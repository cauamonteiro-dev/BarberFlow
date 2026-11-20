import { useState } from "react";
import { api, errorMessage } from "./api";
import { today } from "./BookingFields";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const labels = {
  PENDENTE: "Aguardando a barbearia",
  ATIVA: "Ativa",
  ENCERRADA: "Encerrada",
  CANCELADA: "Cancelada",
};
const shortDate = (value) => value?.split("-").reverse().join("/");
export const usable = (subscription) =>
  subscription.status === "ATIVA" &&
  (!subscription.dataFim || subscription.dataFim >= today());

export function usePlanActions(onChange) {
  const [action, setAction] = useState({ busy: false, notice: "", error: "" });
  async function run(request, notice) {
    if (action.busy) return;
    setAction({ busy: true, notice: "", error: "" });
    try {
      await request();
      await onChange();
      setAction({ busy: false, notice, error: "" });
    } catch (error) {
      setAction({ busy: false, notice: "", error: errorMessage(error) });
    }
  }
  return {
    ...action,
    request(shopId, planId) {
      if (
        window.confirm(
          "Enviar a solicitação? Combine a contratação e o pagamento diretamente com a barbearia.",
        )
      ) {
        return run(
          () =>
            api.post("/portal/assinaturas", {
              barbeariaId: shopId,
              planoId: planId,
            }),
          "Solicitação enviada à barbearia.",
        );
      }
    },
    cancel(subscription) {
      const pending = subscription.status === "PENDENTE";
      if (
        window.confirm(
          pending
            ? "Retirar esta solicitação de adesão?"
            : "Cancelar a assinatura? Combine com a barbearia qualquer acerto de pagamento.",
        )
      ) {
        return run(
          () => api.put(`/portal/assinaturas/${subscription.id}/cancelamento`),
          pending ? "Solicitação retirada." : "Assinatura cancelada.",
        );
      }
    },
  };
}

export function PlanMessages({ actions }) {
  return (
    <>
      {actions.notice && (
        <div className="alert success" role="status">
          {actions.notice}
        </div>
      )}
      {actions.error && (
        <div className="alert error" role="alert">
          {actions.error}
        </div>
      )}
    </>
  );
}

export function SubscriptionCards({
  subscriptions,
  servicesFor,
  actions,
  onBook,
  onShop,
}) {
  if (!subscriptions.length)
    return <p>Você ainda não tem assinaturas ou solicitações.</p>;
  return (
    <div className="plans-grid">
      {subscriptions.map((subscription) => {
        const pending = subscription.status === "PENDENTE";
        const canUse = usable(subscription);
        const services = servicesFor?.(subscription) ?? [];
        const expired = subscription.status === "ATIVA" && !canUse;
        const future = canUse && subscription.dataInicio > today();
        return (
          <article className="plan-card" key={subscription.id}>
            <span
              className={`badge ${expired ? "ENCERRADA" : subscription.status}`}
            >
              {expired
                ? "Vigência encerrada"
                : future
                  ? "Início futuro"
                  : labels[subscription.status]}
            </span>
            <h3>{subscription.planoNome}</h3>
            <p>{subscription.barbeariaNome}</p>
            {pending ? (
              <p>
                Combine as condições com a barbearia. A unidade confirma a
                adesão e define as datas do plano.
              </p>
            ) : (
              <p>
                {shortDate(subscription.dataInicio)} ·{" "}
                {subscription.dataFim
                  ? `até ${shortDate(subscription.dataFim)}`
                  : "sem término definido"}
              </p>
            )}
            {services.length > 0 && (
              <ul aria-label="Serviços incluídos">
                {services.map((service) => (
                  <li key={service.id}>{service.nome}</li>
                ))}
              </ul>
            )}
            <div className="plan-actions">
              {canUse && onBook && services.length > 0 && (
                <button
                  className="primary"
                  type="button"
                  disabled={actions.busy}
                  onClick={() => onBook(subscription)}
                >
                  Agendar pelo plano
                </button>
              )}
              {onShop && (
                <button
                  className="secondary"
                  type="button"
                  disabled={actions.busy}
                  onClick={() => onShop(subscription)}
                >
                  Ver planos na unidade
                </button>
              )}
              {(pending || canUse) && (
                <button
                  className="secondary"
                  type="button"
                  disabled={actions.busy}
                  onClick={() => actions.cancel(subscription)}
                >
                  {pending ? "Retirar solicitação" : "Cancelar assinatura"}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ShopPlanArea({
  plans,
  subscriptions,
  services,
  shop,
  actions,
  onBook,
}) {
  const servicesFor = (plan) =>
    services.filter(
      (s) => s.status === "ATIVO" && plan?.servicoIds.includes(s.id),
    );
  const offers = plans.filter(
    (p) => p.status === "ATIVO" && servicesFor(p).length > 0,
  );
  return (
    <div className="plans-area">
      <PlanMessages actions={actions} />
      <section aria-labelledby="plan-offers">
        <h2 id="plan-offers">Planos disponíveis</h2>
        {!offers.length || shop?.ativa === false ? (
          <p>Esta barbearia não tem planos disponíveis para adesão.</p>
        ) : (
          <div className="plans-grid">
            {offers.map((plan) => {
              const existing = subscriptions.find(
                (s) =>
                  s.planoId === plan.id &&
                  (s.status === "PENDENTE" || usable(s)),
              );
              return (
                <article className="plan-card" key={plan.id}>
                  <h3>{plan.nome}</h3>
                  <strong>{currency.format(plan.preco)}</strong>
                  <ul aria-label="Serviços incluídos">
                    {servicesFor(plan).map((service) => (
                      <li key={service.id}>{service.nome}</li>
                    ))}
                  </ul>
                  <div className="plan-actions">
                    {existing ? (
                      <small>
                        {existing.status === "PENDENTE"
                          ? "Adesão solicitada"
                          : "Você já tem este plano"}
                      </small>
                    ) : (
                      <button
                        type="button"
                        className="primary"
                        disabled={actions.busy}
                        onClick={() => actions.request(shop.id, plan.id)}
                      >
                        Solicitar adesão
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section aria-labelledby="shop-subscriptions">
        <h2 id="shop-subscriptions">Minhas assinaturas nesta unidade</h2>
        <SubscriptionCards
          subscriptions={subscriptions}
          servicesFor={(s) =>
            servicesFor(plans.find((p) => p.id === s.planoId))
          }
          actions={actions}
          onBook={shop?.ativa === false ? undefined : onBook}
        />
      </section>
    </div>
  );
}
