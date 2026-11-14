import axios from "axios";
export const api = axios.create({ baseURL: "/api", timeout: 15000 });
api.interceptors.request.use(async (config) => {
  if (
    ["post", "put", "patch", "delete"].includes(config.method?.toLowerCase())
  ) {
    const response = await api.get("/auth/csrf");
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
