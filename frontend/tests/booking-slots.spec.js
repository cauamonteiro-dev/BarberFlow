import { test, expect } from "@playwright/test";
import { loginRequest } from "./helpers";

async function form(page, context) {
  await loginRequest(context.request, "cliente@barberflow.local");
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navegação do cliente", exact: true })
    .getByRole("button", { name: "Barbearias", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Ver serviços e horários de Barbearia Central",
      exact: true,
    })
    .click();
  await page
    .getByRole("combobox", { name: "Barbeiro", exact: true })
    .selectOption({ label: "Marcos" });
  await page
    .getByRole("combobox", { name: "Serviço", exact: true })
    .selectOption("2");
}
const slot = {
  inicio: "2026-11-20T10:00:00",
  fim: "2026-11-20T10:50:00",
  disponivel: true,
};

test("consulta lenta exibe carregamento antes de permitir escolher horário", async ({
  page,
  context,
}) => {
  let release;
  const ready = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/portal/horarios-disponiveis?*", async (route) => {
    await ready;
    await route.fulfill({ json: [slot] });
  });
  await form(page, context);
  const select = page.getByRole("combobox", {
    name: "Horário disponível",
    exact: true,
  });
  await expect(select).toBeDisabled();
  await expect(
    page.getByText("Consultando os horários disponíveis…", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Salvar agendamento", exact: true }),
  ).toBeDisabled();
  release();
  await expect(select).toBeEnabled();
  await select.selectOption(slot.inicio);
  await expect(select).toHaveValue(slot.inicio);
  await expect(
    page.getByRole("button", { name: "Salvar agendamento", exact: true }),
  ).toBeEnabled();
});

test("falha oferece nova tentativa e ausência de vagas tem mensagem específica", async ({
  page,
  context,
}) => {
  let requests = 0;
  await page.route("**/api/portal/horarios-disponiveis?*", (route) =>
    ++requests === 1
      ? route.fulfill({ status: 503, json: { detail: "Indisponível" } })
      : route.fulfill({ json: [] }),
  );
  await form(page, context);
  await expect(
    page
      .getByRole("status")
      .filter({
        hasText: "Não foi possível consultar os horários. Tente novamente.",
      }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByText(
      "Não há horários disponíveis nesta data. Escolha outro dia ou profissional.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Horário disponível", exact: true }),
  ).toBeDisabled();
});
