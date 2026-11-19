import axios from "axios";
export const api = axios.create({ baseURL: "/api", timeout: 15000 });
let sessionRequests = new AbortController();

export function suspendSessionRequests() {
  sessionRequests.abort();
}

export function resumeSessionRequests() {
  if (sessionRequests.signal.aborted) sessionRequests = new AbortController();
}

api.interceptors.request.use(async (config) => {
  if (!config.url?.startsWith("/auth/")) {
    config.signal = config.signal
      ? AbortSignal.any([config.signal, sessionRequests.signal])
      : sessionRequests.signal;
    if (config.signal.aborted) throw new axios.CanceledError();
  }
  if (
    ["post", "put", "patch", "delete"].includes(config.method?.toLowerCase())
  ) {
    const response = await api.get("/auth/csrf", { signal: config.signal });
    config.headers[response.data.header] = response.data.token;
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
      : "Não foi possível conectar à API. Confira se o backend está em execução.")
  );
}
