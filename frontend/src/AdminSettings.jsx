import { useEffect, useState, useCallback, useRef } from "react";
import { api, errorMessage } from "./api";
import { BrandRail } from "./AuthShell";
export default function AdminSettings() {
  const [shops, setShops] = useState([]),
    [shop, setShop] = useState(""),
    [barbers, setBarbers] = useState([]),
    [clients, setClients] = useState([]),
    [accounts, setAccounts] = useState([]),
    [barber, setBarber] = useState(""),
    [hours, setHours] = useState({ expediente: [], bloqueios: [] }),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [account, setAccount] = useState({
      nome: "",
      email: "",
      senha: "",
      perfil: "BARBEIRO",
      barbeiroId: "",
      clienteId: "",
    }),
    [block, setBlock] = useState({ inicio: "", fim: "", motivo: "" });
  const unitsRequest = useRef(0),
    hoursRequest = useRef(0);
  const [loadedShop, setLoadedShop] = useState("");
  useEffect(() => {
    api
      .get("/barbearias")
      .then((r) => {
        setShops(r.data);
        setShop(String(r.data[0]?.id || ""));
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  const load = useCallback(async () => {
    const generation = ++unitsRequest.current;
    if (!shop) return;
    const [b, c, a] = await Promise.all([
      api.get("/barbeiros", { params: { barbeariaId: shop } }),
      api.get("/clientes", { params: { barbeariaId: shop } }),
      api.get(`/administracao/${shop}/acessos`),
    ]);
    if (generation !== unitsRequest.current) return;
    setLoadedShop(shop);
    setBarbers(b.data);
    setClients(c.data);
    setAccounts(a.data);
  }, [shop]);
  useEffect(() => {
    setBarber("");
    setHours({ expediente: [], bloqueios: [] });
    load().catch((e) => setError(errorMessage(e)));
    return () => {
      ++unitsRequest.current;
    };
  }, [load]);
  const loadHours = useCallback(async () => {
    const generation = ++hoursRequest.current;
    if (!barber) return;
    const response = await api.get(
      `/administracao/barbeiros/${barber}/horarios`,
    );
    if (generation === hoursRequest.current)
      setHours({ ...response.data, barbeiroId: barber });
  }, [barber]);
  useEffect(() => {
    setHours({ expediente: [], bloqueios: [] });
    loadHours().catch((e) => setError(errorMessage(e)));
    return () => {
      ++hoursRequest.current;
    };
  }, [loadHours]);
  async function mutate(fn) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await fn();
      setNotice("Alterações salvas.");
      await load();
      await loadHours();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const field = (name, label, type = "text") => (
    <label>
      {label}
      <input
        required={name !== "senha"}
        type={type}
        maxLength={name === "senha" ? 72 : name === "email" ? 120 : 100}
        value={account[name]}
        onChange={(e) => setAccount({ ...account, [name]: e.target.value })}
      />
    </label>
  );
  return (
    <div className="app">
      <BrandRail />
      <main>
        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">ADMINISTRAÇÃO</p>
              <h1>Acessos e horários</h1>
              <p>Organize sua equipe, expedientes, pausas e ausências.</p>
            </div>
            <select
              aria-label="Barbearia de administração"
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
          </div>
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
          <section className="panel">
            <div className="panel-heading">
              <h2>Criar acesso ou adicionar perfil</h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutate(async () => {
                  await api.post(`/administracao/${shop}/acessos`, {
                    ...account,
                    barbeiroId: account.barbeiroId
                      ? Number(account.barbeiroId)
                      : null,
                    clienteId: account.clienteId
                      ? Number(account.clienteId)
                      : null,
                  });
                  setAccount({
                    nome: "",
                    email: "",
                    senha: "",
                    perfil: "BARBEIRO",
                    barbeiroId: "",
                    clienteId: "",
                  });
                });
              }}
            >
              <div className="form-fields">
                {field("nome", "Nome")}
                {field("email", "E-mail", "email")}
                {field("senha", "Senha inicial (conta nova)", "password")}
                <label>
                  Perfil
                  <select
                    value={account.perfil}
                    onChange={(e) =>
                      setAccount({ ...account, perfil: e.target.value })
                    }
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="BARBEIRO">Barbeiro</option>
                    <option value="CLIENTE">Cliente</option>
                  </select>
                </label>
                {account.perfil === "BARBEIRO" && (
                  <label>
                    Profissional
                    <select
                      required
                      value={account.barbeiroId}
                      onChange={(e) =>
                        setAccount({ ...account, barbeiroId: e.target.value })
                      }
                    >
                      <option value="">Selecione…</option>
                      {barbers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {account.perfil === "CLIENTE" && (
                  <label>
                    Cadastro do cliente
                    <select
                      required
                      value={account.clienteId}
                      onChange={(e) =>
                        setAccount({ ...account, clienteId: e.target.value })
                      }
                    >
                      <option value="">Selecione…</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <p className="form-note full">
                  Contas novas exigem senha com 10 a 72 caracteres. Um acesso
                  existente mantém a senha atual. Clientes recebem acesso ao
                  próprio cadastro, sem permissão administrativa.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="primary"
                  disabled={busy || loadedShop !== shop}
                >
                  Salvar acesso
                </button>
              </div>
            </form>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.email + a.perfil}>
                      <td>{a.nome}</td>
                      <td>{a.email}</td>
                      <td>{a.perfil}</td>
                      <td>
                        {a.perfil === "CLIENTE" ? (
                          <span>Gerencie o v?nculo em Clientes</span>
                        ) : (
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() => {
                              if (confirm("Remover este perfil da unidade?"))
                                mutate(() =>
                                  api.delete(
                                    `/administracao/${shop}/acessos/${a.id}`,
                                  ),
                                );
                            }}
                          >
                            Remover perfil
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel portal-section">
            <div className="panel-heading">
              <h2>Expediente do profissional</h2>
              <select
                aria-label="Profissional dos horários"
                disabled={busy || loadedShop !== shop}
                value={barber}
                onChange={(e) => setBarber(e.target.value)}
              >
                <option value="">Selecione…</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
            </div>
            {barber && hours.barbeiroId === barber && (
              <>
                <div className="schedule-editor">
                  {hours.expediente.map((h, i) => (
                    <div className="schedule-row" key={i}>
                      <label>
                        Dia
                        <select
                          value={h.diaSemana}
                          onChange={(e) =>
                            setHours({
                              ...hours,
                              expediente: hours.expediente.map((a, k) =>
                                k === i
                                  ? { ...a, diaSemana: Number(e.target.value) }
                                  : a,
                              ),
                            })
                          }
                        >
                          {[
                            "Segunda",
                            "Terça",
                            "Quarta",
                            "Quinta",
                            "Sexta",
                            "Sábado",
                            "Domingo",
                          ].map((d, k) => (
                            <option key={d} value={k + 1}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </label>
                      {["inicio", "fim"].map((key, k) => (
                        <label key={key}>
                          {k === 0 ? "Início" : "Término"}
                          <input
                            type="time"
                            required
                            value={h[key]}
                            onChange={(e) =>
                              setHours({
                                ...hours,
                                expediente: hours.expediente.map((a, n) =>
                                  n === i ? { ...a, [key]: e.target.value } : a,
                                ),
                              })
                            }
                          />
                        </label>
                      ))}
                      <button
                        className="secondary"
                        onClick={() =>
                          setHours({
                            ...hours,
                            expediente: hours.expediente.filter(
                              (_, k) => k !== i,
                            ),
                          })
                        }
                      >
                        Remover faixa
                      </button>
                    </div>
                  ))}
                </div>
                <div className="modal-footer">
                  <button
                    className="secondary"
                    onClick={() =>
                      setHours({
                        ...hours,
                        expediente: [
                          ...hours.expediente,
                          { diaSemana: 1, inicio: "09:00", fim: "18:00" },
                        ],
                      })
                    }
                  >
                    Adicionar faixa
                  </button>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() =>
                      mutate(() =>
                        api.put(`/administracao/barbeiros/${barber}/horarios`, {
                          faixas: hours.expediente.map(
                            ({ diaSemana, inicio, fim }) => ({
                              diaSemana,
                              inicio,
                              fim,
                            }),
                          ),
                        }),
                      )
                    }
                  >
                    Salvar expediente
                  </button>
                </div>
                <div className="panel-heading">
                  <h2>Bloquear ausência ou intervalo</h2>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    mutate(async () => {
                      await api.post(
                        `/administracao/barbeiros/${barber}/bloqueios`,
                        block,
                      );
                      setBlock({ inicio: "", fim: "", motivo: "" });
                    });
                  }}
                >
                  <div className="form-fields">
                    {["inicio", "fim", "motivo"].map((k, i) => (
                      <label key={k}>
                        {
                          [
                            "Início do bloqueio",
                            "Término do bloqueio",
                            "Motivo",
                          ][i]
                        }
                        <input
                          required
                          maxLength={k === "motivo" ? 200 : undefined}
                          type={k === "motivo" ? "text" : "datetime-local"}
                          value={block[k]}
                          onChange={(e) =>
                            setBlock({ ...block, [k]: e.target.value })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div className="modal-footer">
                    <button className="primary" disabled={busy}>
                      Criar bloqueio
                    </button>
                  </div>
                </form>
                <div className="schedule-summary">
                  {hours.bloqueios.map((b) => (
                    <div className="row-actions" key={b.id}>
                      <span>
                        {b.inicio} — {b.fim} • {b.motivo}
                      </span>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          mutate(() =>
                            api.delete(
                              `/administracao/barbeiros/${barber}/bloqueios/${b.id}`,
                            ),
                          )
                        }
                      >
                        Remover bloqueio
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
