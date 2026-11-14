export async function loginRequest(
  request,
  email = "admin@barberflow.local",
  senha = "BarberFlow!2026",
) {
  const csrf = await (await request.get("/api/auth/csrf")).json();
  const response = await request.post("/api/auth/login", {
    data: { email, senha },
    headers: { [csrf.header]: csrf.token },
  });
  if (!response.ok())
    throw Error("Falha no login de teste: " + (await response.text()));
  const current = await (await request.get("/api/auth/csrf")).json();
  return { [current.header]: current.token };
}
