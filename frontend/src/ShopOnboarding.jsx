import ThemeToggle from "./ThemeToggle";
import { useTheme } from "./useTheme";
import "./booking-experience.css";

export default function ShopOnboarding() {
  const { theme, toggleTheme } = useTheme();
  return (
    <main className="shop-onboarding">
      <header>
        <a className="onboarding-back" href="/">
          ← Voltar ao BarberFlow
        </a>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>
      <section className="onboarding-hero" aria-labelledby="onboarding-title">
        <div>
          <img src="/brand/barberflow.png" alt="" width="64" height="64" />
          <h1 id="onboarding-title">Sua barbearia no BarberFlow</h1>
          <p>
            Reúna sua equipe, serviços e agenda em uma página onde seus clientes
            possam conhecer a barbearia e marcar atendimento.
          </p>
        </div>
        <aside className="onboarding-future" aria-label="Situação do cadastro">
          <strong>Desenvolvimento futuro</strong>
          <p>
            O cadastro de barbearias depende de contratos e custos de operação.
            A versão acadêmica usa unidades de demonstração.
          </p>
        </aside>
      </section>
      <section
        className="onboarding-steps"
        aria-labelledby="onboarding-steps-title"
      >
        <h2 id="onboarding-steps-title">Como o cadastro poderá funcionar</h2>
        <ol>
          <li>
            <strong>Apresente sua unidade</strong>
            <p>
              Informe o endereço, os canais de contato e quem será responsável
              pela gestão.
            </p>
          </li>
          <li>
            <strong>Combine a participação</strong>
            <p>
              Confira as condições para disponibilizar sua unidade na
              plataforma.
            </p>
          </li>
          <li>
            <strong>Prepare sua agenda</strong>
            <p>
              Organize a equipe, os serviços, os planos e os horários que os
              clientes poderão reservar.
            </p>
          </li>
        </ol>
      </section>
    </main>
  );
}
