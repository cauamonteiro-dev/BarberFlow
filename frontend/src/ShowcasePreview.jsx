export default function ShowcasePreview() {
  return (
    <section className="auth-brand auth-brand-photo showcase-preview">
      <img
        className="auth-brand-logo"
        src="/brand/barberflow.png"
        alt=""
        width={210}
        height={210}
      />
      <h1>BarberFlow</h1>
      <p>Agendamentos, equipe e serviços em um só lugar.</p>
      <a className="primary" href="/" target="_blank" rel="noopener noreferrer">
        Abrir BarberFlow em nova aba
      </a>
    </section>
  );
}
