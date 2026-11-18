export function shopLogoPath(shop) {
  const name = shop?.nome || "";
  const family = name.startsWith("Barbearia Central")
    ? "central"
    : name.startsWith("Dom Barber")
      ? "dom"
      : name.startsWith("Corte & Estilo")
        ? "estilo"
        : name.startsWith("Barber House")
          ? "house"
          : name.startsWith("Nova Barbearia")
            ? "nova"
            : "padrao";
  return `/shops/logos/${family}.svg`;
}

export function ShopLogo({ shop, className = "" }) {
  return (
    <img
      className={`shop-logo ${className}`}
      src={shopLogoPath(shop)}
      alt={`Logo de ${shop?.nome || "barbearia"}`}
      width="96"
      height="96"
    />
  );
}

export function ShopIdentity({ shop, label = "SUA BARBEARIA" }) {
  if (!shop) return null;
  return (
    <div className="workspace-identity">
      <ShopLogo shop={shop} />
      <div>
        <p className="eyebrow">{label}</p>
        <strong>{shop.nome}</strong>
      </div>
    </div>
  );
}

export function WelcomeLoading({ user, role }) {
  const unit = user?.unidades?.find((u) => u.perfil === role);
  const name =
    role === "BARBEIRO"
      ? unit?.profissional_nome || user?.nome
      : user?.nomeExibicao || user?.nome;
  return (
    <div className="welcome-loading" role="status" aria-live="polite">
      {unit && role !== "ADMIN" ? (
        <ShopLogo shop={unit} />
      ) : (
        <img
          className="loading-platform-logo"
          src="/brand/barberflow.png"
          alt="BarberFlow"
          width="1254"
          height="1254"
        />
      )}
      <p className="eyebrow">
        {unit && role !== "ADMIN" ? unit.nome : "BARBERFLOW"}
      </p>
      <h1>
        {!role
          ? "Preparando seu acesso"
          : role === "BARBEIRO"
            ? `Olá, ${name}!`
            : role === "BARBEARIA"
              ? "Bem-vindo à sua barbearia"
              : role === "ADMIN"
                ? "Preparando sua gestão"
                : `Olá, ${name || "bem-vindo"}!`}
      </h1>
      <p>
        {role === "CLIENTE"
          ? "Organizando seus agendamentos…"
          : "Preparando sua agenda e seu espaço…"}
      </p>
      <span className="loading-progress" aria-hidden="true" />
    </div>
  );
}
