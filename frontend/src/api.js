import axios from "axios";
export const api = axios.create({ baseURL: "/api", timeout: 15000 });
let sessionRequests = new AbortController();

export function suspendSessionRequests() {
  sessionRequests.abort();
}

export function resumeSessionRequests() {
  if (sessionRequests.signal.aborted) sessionRequests = new AbortController();
}

function scopeRequestToSession(config) {
  const sessionSignal = sessionRequests.signal;
  const requestSignal = config.signal;
  if (!requestSignal) {
    config.signal = sessionSignal;
    return;
  }
  if (typeof AbortSignal.any === "function") {
    config.signal = AbortSignal.any([requestSignal, sessionSignal]);
    return;
  }
  // Safari e WebViews antigos podem cancelar um sinal, mas não combinar dois.
  const combined = new AbortController();
  const abort = () => combined.abort();
  config.signal = combined.signal;
  if (requestSignal.aborted || sessionSignal.aborted) {
    abort();
    return;
  }
  requestSignal.addEventListener("abort", abort, { once: true });
  sessionSignal.addEventListener("abort", abort, { once: true });
  config.releaseSessionSignal = () => {
    requestSignal.removeEventListener("abort", abort);
    sessionSignal.removeEventListener("abort", abort);
  };
}

api.interceptors.request.use(async (config) => {
  if (!config.url?.startsWith("/auth/")) {
    scopeRequestToSession(config);
    if (config.signal.aborted) throw new axios.CanceledError();
  }
  if (
    ["post", "put", "patch", "delete"].includes(config.method?.toLowerCase())
  ) {
    try {
      const response = await api.get("/auth/csrf", { signal: config.signal });
      config.headers[response.data.header] = response.data.token;
    } catch (error) {
      config.releaseSessionSignal?.();
      throw error;
    }
  }
  return config;
});
api.interceptors.response.use(
  (response) => {
    response.config.releaseSessionSignal?.();
    return response;
  },
  (error) => {
    error.config?.releaseSessionSignal?.();
    if (
      error.response?.status === 401 &&
      !error.config?.url?.startsWith("/auth/")
    )
      window.dispatchEvent(new Event("barberflow:unauthorized"));
    return Promise.reject(error);
  },
);
export function errorMessage(error) {
  const data = error.response?.data;
  if (error.config?.url === "/auth/cadastro" && data?.detail)
    return data.detail;
  if (data?.errors)
    return Object.entries(data.errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join(" • ");
  return (
    data?.detail ||
    (error.response
      ? "Não foi possível concluir a operação."
      : "Não foi possível conectar ao BarberFlow. Confira sua conexão e tente novamente.")
  );
}
