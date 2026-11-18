import { BrandRail } from "./AuthShell";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "./useTheme";
import { shopPresentation, ShopImage } from "./shopPresentation";
import { ShopLogo } from "./ShopIdentity";

export default function ShopProfile({ shop, onBack, onBook }) {
  const { theme, toggleTheme } = useTheme();
  const info = shopPresentation(shop);
  return (
    <div className="app">
      <BrandRail />
      <main>
        <header className="topbar">
          <button className="secondary" onClick={onBack}>
            ← Voltar à pesquisa
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>
        <div className="content shop-profile">
          <section
            className="shop-profile-hero"
            aria-labelledby="shop-profile-title"
          >
            <ShopImage shop={shop} fetchPriority="high" />
            <div className="shop-profile-title">
              <ShopLogo shop={shop} />
              <span className="shop-photo-label">Imagem ilustrativa</span>
              <p className="eyebrow">CONHEÇA A BARBEARIA</p>
              <h1 id="shop-profile-title">{shop.nome}</h1>
              <p>{info.tagline}</p>
            </div>
          </section>
          <div className="shop-profile-layout">
            <div>
              <section
                className="shop-profile-section"
                aria-labelledby="about-shop"
              >
                <p className="eyebrow">FEITA PARA O SEU ESTILO</p>
                <h2 id="about-shop">Sobre a barbearia</h2>
                <p>{info.description}</p>
              </section>
              <section
                className="shop-profile-section"
                aria-labelledby="shop-space"
              >
                <h2 id="shop-space">Conheça o espaço</h2>
                <p>Um olhar sobre a experiência que espera por você.</p>
                <div className="shop-gallery">
                  <figure>
                    <ShopImage shop={shop} loading="lazy" />
                    <figcaption>
                      Ambiente de atendimento • imagem ilustrativa
                    </figcaption>
                  </figure>
                  <figure>
                    <img
                      src={info.gallery}
                      alt="Referência ilustrativa de cadeiras e espelhos de uma barbearia"
                      width="1536"
                      height="1024"
                      loading="lazy"
                    />
                    <figcaption>
                      Detalhes do espaço • imagem ilustrativa
                    </figcaption>
                  </figure>
                </div>
              </section>
            </div>
            <aside className="shop-visit-card" aria-labelledby="visit-shop">
              <span className="shop-availability">
                <i aria-hidden="true" />
                Recebendo agendamentos
              </span>
              <h2 id="visit-shop">Seu próximo cuidado</h2>
              <p className="shop-location-label">Endereço</p>
              <address>
                {info.address}
                <span>{info.city}</span>
              </address>
              <hr />
              <p>
                Escolha o serviço, o profissional e um horário disponível na
                agenda desta unidade.
              </p>
              <button className="primary" onClick={onBook}>
                Agendar nesta barbearia <span aria-hidden="true">→</span>
              </button>
              <small>O pagamento é feito diretamente na barbearia.</small>
            </aside>
          </div>
          {info.demo && (
            <p className="shop-demo-note">
              Unidade fictícia de demonstração. Endereço e descrição são
              exemplos; as imagens são referências ilustrativas padronizadas.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
