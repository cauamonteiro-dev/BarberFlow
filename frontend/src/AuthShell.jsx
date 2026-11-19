import { useCallback, useEffect, useState } from "react";
import App from "./App";
import Portal from "./Portal";
import CustomerPortal from "./CustomerPortal";
import AdminSettings from "./AdminSettings";
import {
  api,
  errorMessage,
  resumeSessionRequests,
  suspendSessionRequests,
} from "./api";
import { useTheme } from "./useTheme";
import ThemeToggle from "./ThemeToggle";
import { ShopIdentity, WelcomeLoading } from "./ShopIdentity";
import "./experience.css";

export function BrandRail({ shop, children }) {
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
      <ShopIdentity shop={shop} />
      {children}
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
    [busy, setBusy] = useState(false),
    [signingOut, setSigningOut] = useState(false),
    [entrance, setEntrance] = useState(null),
    [workspaceReady, setWorkspaceReady] = useState(false);
  const onWorkspaceReady = useCallback(() => setWorkspaceReady(true), []);
  useEffect(() => {
    if (!entrance || !workspaceReady) return;
    const timer = setTimeout(
      () => setEntrance(null),
      Math.max(0, 650 - (Date.now() - entrance)),
    );
    return () => clearTimeout(timer);
  }, [entrance, workspaceReady]);
  const { theme, toggleTheme } = useTheme();
  function signed(u, welcome = false) {
    resumeSessionRequests();
    if (welcome) {
      setWorkspaceReady(false);
      setEntrance(Date.now());
    }
    setUser(u);
    setRole(
      u.papeis.some((p) => p.perfil === "ADMIN")
        ? "ADMIN"
        : u.papeis.some((p) => p.perfil === "BARBEARIA")
          ? "BARBEARIA"
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
      suspendSessionRequests();
      setSettings(false);
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
    const nome = form.nome.trim();
    if (register && !nome) {
      setError("Informe seu nome.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (register) {
        await api.post("/auth/cadastro", { ...form, nome });
        setRegister(false);
      }
      signed(
        (
          await api.post("/auth/login", {
            email: form.email,
            senha: form.senha,
          })
        ).data,
        true,
      );
      setForm({ nome: "", email: "", senha: "" });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setSigningOut(true);
    setError("");
    suspendSessionRequests();
    try {
      await api.post("/auth/logout");
      setUser(null);
      setEntrance(null);
      setSettings(false);
    } catch (e) {
      resumeSessionRequests();
      setError(errorMessage(e));
    } finally {
      setSigningOut(false);
    }
  }
  if (!ready) return <WelcomeLoading />;
  if (!user)
    return (
      <div className="auth-page">
        <section className="auth-brand auth-brand-photo">
          <img
            className="auth-brand-logo"
            src="/brand/barberflow.png"
            alt="BarberFlow"
            width="210"
            height="210"
          />
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
      {entrance && <WelcomeLoading user={user} role={role} />}
      <div
        className={entrance ? "session-preparing" : "session-workspace"}
        inert={entrance || signingOut ? true : undefined}
        aria-hidden={entrance ? true : undefined}
      >
        <div className="account-bar">
          <span>
            <strong>
              {role === "BARBEIRO"
                ? user.unidades?.find((u) => u.perfil === "BARBEIRO")
                    ?.profissional_nome || user.nome
                : role === "BARBEARIA"
                  ? user.unidades?.find((u) => u.perfil === "BARBEARIA")
                      ?.nome || user.nome
                  : user.nomeExibicao || user.nome}
            </strong>
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
                      ADMIN: "Administrador geral",
                      BARBEARIA: "Barbearia",
                      BARBEIRO: "Barbeiro",
                      CLIENTE: "Cliente",
                    }[r]
                  }
                </option>
              ))}
            </select>
          </label>
          {["ADMIN", "BARBEARIA"].includes(role) && (
            <button
              className="secondary"
              onClick={() => setSettings(!settings)}
            >
              {settings ? "Voltar à gestão" : "Acessos e horários"}
            </button>
          )}
          <button className="secondary" onClick={logout} disabled={signingOut}>
            Sair
          </button>
        </div>
        {error && (
          <div className="session-error alert error" role="alert">
            {error}
          </div>
        )}
        {["ADMIN", "BARBEARIA"].includes(role) ? (
          <div key={role}>
            <div hidden={settings}>
              <App globalAdmin={role === "ADMIN"} onReady={onWorkspaceReady} />
            </div>
            {settings && <AdminSettings globalAdmin={role === "ADMIN"} />}
          </div>
        ) : role === "CLIENTE" ? (
          <CustomerPortal user={user} onReady={onWorkspaceReady} />
        ) : (
          <Portal
            key={role}
            role={role}
            user={user}
            onReady={onWorkspaceReady}
          />
        )}
      </div>
    </>
  );
}
