import { useEffect, useState } from "react";
import App from "./App";
import Portal from "./Portal";
import AdminSettings from "./AdminSettings";
import { api, errorMessage } from "./api";
import { useTheme } from "./useTheme";
import ThemeToggle from "./ThemeToggle";

export function BrandRail() {
  return (
    <aside className="sidebar portal-rail">
      <a className="brand" href="#" aria-label="BarberFlow">
        <span className="brand-mark">
          <img src="/brand/barberflow.png" width="146" height="146" alt="" />
        </span>
        <span>
          Barber<span className="brand-light">Flow</span>
          <small>GESTÃO COM ESTILO</small>
        </span>
      </a>
      <p>O cuidado começa com uma boa organização.</p>
    </aside>
  );
}

export default function AuthShell() {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [role, setRole] = useState(""),
    [settings, setSettings] = useState(false),
    [register, setRegister] = useState(false),
    [form, setForm] = useState({ nome: "", email: "", senha: "" }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const { theme, toggleTheme } = useTheme();
  function signed(u) {
    setUser(u);
    setRole(
      u.papeis.some((p) => p.perfil === "ADMIN")
        ? "ADMIN"
        : u.papeis.some((p) => p.perfil === "BARBEIRO")
          ? "BARBEIRO"
          : "CLIENTE",
    );
  }
  useEffect(() => {
    let active = true;
    api
      .get("/auth/me")
      .then((r) => {
        if (active) signed(r.data);
      })
      .catch((e) => {
        if (active && e.response?.status !== 401) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setReady(true);
      });
    const expired = () => {
      setUser(null);
      setError("Sua sessão terminou. Entre novamente.");
    };
    window.addEventListener("barberflow:unauthorized", expired);
    return () => {
      active = false;
      window.removeEventListener("barberflow:unauthorized", expired);
    };
  }, []);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (register) {
        await api.post("/auth/cadastro", form);
        setRegister(false);
      }
      signed(
        (
          await api.post("/auth/login", {
            email: form.email,
            senha: form.senha,
          })
        ).data,
      );
      setForm({ nome: "", email: "", senha: "" });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await api.post("/auth/logout");
      setUser(null);
      setSettings(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <div className="loading">Carregando seu acesso…</div>;
  if (!user)
    return (
      <div className="auth-page">
        <section className="auth-brand">
          <img src="/brand/barberflow.png" alt="BarberFlow" />
          <h1>
            Seu estilo.
            <br />
            Seu tempo. Seu espaço.
          </h1>
          <p>Entre para cuidar da agenda e de cada detalhe.</p>
        </section>
        <section className="auth-form">
          <div className="auth-theme">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <p className="eyebrow">BEM-VINDO AO BARBERFLOW</p>
          <h2>
            {register ? "Crie sua conta de cliente" : "Acesse seu espaço"}
          </h2>
          <p>
            {register
              ? "Agende seus próximos cuidados em poucos passos."
              : "Use o e-mail e a senha do seu cadastro."}
          </p>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={submit}>
            {register && (
              <label>
                Nome
                <input
                  required
                  maxLength={100}
                  autoComplete="name"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </label>
            )}
            <label>
              E-mail
              <input
                type="email"
                required
                maxLength={120}
                autoComplete="username"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                required
                minLength={register ? 10 : undefined}
                maxLength={72}
                autoComplete={register ? "new-password" : "current-password"}
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
              />
            </label>
            {register && (
              <small>
                Use de 10 a 72 caracteres. Se já tem cadastro na barbearia,
                solicite seu acesso ao administrador.
              </small>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Aguarde…" : register ? "Criar conta e entrar" : "Entrar"}
            </button>
          </form>
          <button
            className="text-button"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register ? "Já tenho conta" : "Sou cliente e quero me cadastrar"}
          </button>
        </section>
      </div>
    );
  const roles = [
    ...new Set(
      user.papeis
        .map((p) => p.perfil)
        .concat(user.clienteId ? ["CLIENTE"] : []),
    ),
  ];
  return (
    <>
      <div className="account-bar">
        <span>
          <strong>{user.nome}</strong>
          <small>{user.email}</small>
        </span>
        <label className="account-role">
          Meu perfil
          <select
            aria-label="Meu perfil"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setSettings(false);
            }}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {
                  {
                    ADMIN: "Administrador",
                    BARBEIRO: "Barbeiro",
                    CLIENTE: "Cliente",
                  }[r]
                }
              </option>
            ))}
          </select>
        </label>
        {role === "ADMIN" && (
          <button className="secondary" onClick={() => setSettings(!settings)}>
            {settings ? "Voltar à gestão" : "Acessos e horários"}
          </button>
        )}
        <button className="secondary" onClick={logout} disabled={busy}>
          Sair
        </button>
      </div>
      {error && (
        <div className="session-error alert error" role="alert">
          {error}
        </div>
      )}
      {role === "ADMIN" ? (
        settings ? (
          <AdminSettings />
        ) : (
          <App />
        )
      ) : (
        <Portal key={role} role={role} />
      )}
    </>
  );
}
