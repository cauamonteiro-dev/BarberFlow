import axios from "axios";
export const api = axios.create({ baseURL: "/api", timeout: 15000 });
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
