import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "./api";
import { BrandRail } from "./AuthShell";
import Portal from "./Portal";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "./useTheme";
import "./shop-search.css";

const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

export default function CustomerPortal() {
  const [shops, setShops] = useState([]),
    [selected, setSelected] = useState(null),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const { theme, toggleTheme } = useTheme();
  const load = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/portal/barbearias", { signal });
      if (!signal?.aborted)
        setShops(response.data.filter((s) => s.ativa === true));
    } catch (e) {
      if (!signal?.aborted) setError(errorMessage(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const found = shops.filter((s) =>
    normalize(s.nome).includes(normalize(query.trim())),
  );
  if (selected)
    return (
      <Portal
        key={selected.id}
        role="CLIENTE"
        selectedShop={selected}
        onChooseShop={() => {
          setSelected(null);
          load();
        }}
      />
    );
  return (
    <div className="app">
      <BrandRail />
      <main>
        <header className="topbar">
          <span>Encontre o seu próximo cuidado.</span>
          <div className="shop-search-top">
            <span>ESPAÇO DO CLIENTE</span>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>
        <div className="content shop-discovery">
          <section className="discovery-intro">
            <p className="eyebrow">SEU ESTILO COMEÇA AQUI</p>
            <h1>Encontre sua barbearia</h1>
            <p>
              Pesquise pelo nome, escolha uma barbearia e consulte os serviços e
              horários disponíveis para agendar.
            </p>
            <label className="shop-search-field">
              <span>Pesquisar barbearias</span>
              <div>
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  aria-hidden="true"
                >
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m16 16 5 5" />
                </svg>
                <input
                  type="search"
                  autoComplete="off"
                  placeholder="Digite o nome da barbearia"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </label>
          </section>
          {loading ? (
            <div className="loading" role="status">
              Buscando barbearias disponíveis…
            </div>
          ) : error ? (
            <div className="alert error" role="alert">
              <span>{error}</span>
              <button className="secondary" onClick={() => load()}>
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              <div className="discovery-results">
                <h2>Barbearias disponíveis</h2>
                <p role="status">
                  {found.length}{" "}
                  {found.length === 1
                    ? "barbearia encontrada"
                    : "barbearias encontradas"}
                </p>
              </div>
              {found.length ? (
                <div className="shop-grid">
                  {found.map((shop) => (
                    <article
                      key={shop.id}
                      className="shop-card"
                      aria-label={shop.nome}
                    >
                      <div className="shop-card-cover" aria-hidden="true">
                        <span>✂</span>
                        <small>BARBERFLOW</small>
                      </div>
                      <div className="shop-card-body">
                        <span className="shop-availability">
                          <i aria-hidden="true" />
                          Recebendo agendamentos
                        </span>
                        <h3>{shop.nome}</h3>
                        <p>
                          Escolha o profissional, confira os serviços e encontre
                          um horário para você.
                        </p>
                        <button
                          className="primary"
                          aria-label={`Ver serviços e horários de ${shop.nome}`}
                          onClick={() => {
                            setSelected(shop);
                            window.scrollTo({ top: 0, behavior: "instant" });
                          }}
                        >
                          Ver serviços e horários{" "}
                          <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty panel">
                  <span aria-hidden="true">⌕</span>
                  <h3>
                    {query.trim()
                      ? "Nenhuma barbearia encontrada"
                      : "Ainda não há barbearias disponíveis"}
                  </h3>
                  <p>
                    {query.trim()
                      ? "Experimente outro nome ou limpe a pesquisa para ver todas as opções."
                      : "Novas barbearias aparecerão aqui quando estiverem disponíveis para agendamento."}
                  </p>
                  {query.trim() && (
                    <button className="secondary" onClick={() => setQuery("")}>
                      Limpar pesquisa
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
