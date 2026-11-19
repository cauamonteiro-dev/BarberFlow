import { expect, test } from "@playwright/test";
import { loginRequest } from "./helpers";

test("confirmação usa a resposta do atendimento para atualizar a linha", async ({
  page,
  context,
}) => {
  await loginRequest(context.request, "barbeiro@barberflow.local");
  const response = await context.request.get(
    "/api/portal/painel?barbeariaId=1&perfil=BARBEIRO",
  );
  const { agendamentos } = await response.json();
  const booking = agendamentos.find((row) => row.status === "AGENDADO");
  expect(booking).toBeDefined();
  await page.goto("/");
  await page.getByRole("button", { name: "Ver toda a agenda" }).click();
  const row = page
    .getByRole("row")
    .filter({
      has: page.getByRole("button", { name: "Confirmar", exact: true }),
    })
    .first();
  await expect(row).toBeVisible();
  let refreshed = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/portal/painel")) refreshed++;
  });
  await page.route("**/api/portal/atendimentos/*", async (route) => {
    const id = Number(route.request().url().split("/").at(-1));
    const saved = agendamentos.find((item) => item.id === id);
    await route.fulfill({ json: { ...saved, status: "CONFIRMADO" } });
  });
  const rowIndex = await row.evaluate((el) => el.rowIndex);
  await row.getByRole("button", { name: "Confirmar", exact: true }).click();
  const confirmed = page.getByRole("row").nth(rowIndex);
  await expect(
    confirmed.getByText("Confirmado", { exact: true }),
  ).toBeVisible();
  await expect(
    confirmed.getByRole("button", { name: "Confirmar", exact: true }),
  ).toHaveCount(0);
  expect(refreshed).toBe(0);
});

test("sair cancela a atualização administrativa pendente", async ({
  page,
  context,
}) => {
  await loginRequest(context.request);
  await page.goto("/");
  const refresh = page.getByRole("button", { name: /Atualizar/ }).first();
  await expect(refresh).toBeEnabled();
  let release;
  const waiting = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/barbearias", async (route) => {
    await waiting;
    await route.continue().catch(() => {});
  });
  const pendingRequest = page.waitForRequest((request) =>
    request.url().endsWith("/api/barbearias"),
  );
  const forbidden = [];
  page.on("response", (response) => {
    if (response.status() === 403) forbidden.push(response.url());
  });
  try {
    await refresh.click();
    const pending = await pendingRequest;
    const failed = page.waitForEvent(
      "requestfailed",
      (request) => request === pending,
    );
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await failed;
    await expect(
      page.getByRole("heading", { name: "Acesse seu espaço" }),
    ).toBeVisible();
    expect(forbidden).toEqual([]);
  } finally {
    release();
  }
});

test("agenda administrativa diferencia serviços e bloqueia novas reservas inválidas", async ({
  page,
  context,
}) => {
  await loginRequest(context.request);
  await page.goto("/");
  const units = page.getByLabel("Selecionar barbearia");
  await units.selectOption({ label: "Barbearia Central" });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Agenda", exact: true })
    .click();
  const newBooking = page.getByRole("button", { name: /Novo agendamento/ });
  await newBooking.click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Criar agendamento" }),
  ).toBeVisible();
  await expect(
    dialog.getByLabel("Serviço").locator("option").nth(1),
  ).toContainText("R$");
  await dialog.getByLabel("Barbeiro").selectOption({ index: 1 });
  await dialog.getByLabel("Serviço").selectOption({ index: 1 });
  await dialog.getByLabel("Início do atendimento").fill("2020-01-10T10:00");
  await dialog
    .getByRole("button", { name: "Verificar disponibilidade" })
    .click();
  await expect(dialog.getByRole("status")).toHaveText(
    "Escolha um horário futuro.",
  );
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  const inactive = await units
    .locator("option")
    .filter({ hasText: "(inativa)" })
    .first()
    .getAttribute("value");
  await units.selectOption(inactive);
  await expect(
    page.getByText("Esta barbearia está inativa.", { exact: false }),
  ).toBeVisible();
  await expect(newBooking).toBeDisabled();
});

test("ações da agenda cabem na tabela e o menu acompanha o tamanho da janela", async ({
  page,
  context,
}) => {
  await loginRequest(context.request);
  await page.goto("/");
  await page
    .getByLabel("Selecionar barbearia")
    .selectOption({ label: "Barbearia Central" });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Agenda", exact: true })
    .click();
  const table = page
    .locator(".table-wrap")
    .filter({ has: page.getByRole("button", { name: /Editar/ }) });
  const sidebar = page.locator(".sidebar");
  for (const [width, height] of [
    [1280, 800],
    [782, 695],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(
      table.getByRole("button", { name: /Editar/ }).first(),
    ).toBeVisible();
    await expect
      .poll(() => table.evaluate((el) => el.scrollWidth - el.clientWidth))
      .toBeLessThanOrEqual(1);
    await expect
      .poll(() => sidebar.evaluate((el) => el.scrollWidth - el.clientWidth))
      .toBeLessThanOrEqual(1);
    expect((await sidebar.boundingBox()).width).toBeGreaterThan(72);
  }
});

test("configuração mostra carregamento e voltar mantém a aba da gestão", async ({
  page,
  context,
}) => {
  await loginRequest(context.request);
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Serviços", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Novo serviço/ }),
  ).toBeEnabled();
  let finish;
  const waiting = new Promise((resolve) => {
    finish = resolve;
  });
  await page.route("**/api/barbearias", async (route) => {
    await waiting;
    await route.continue();
  });
  try {
    await page
      .getByRole("button", { name: "Acessos e horários", exact: true })
      .click();
    await expect(
      page.getByText("Carregando acessos e horários…", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Barbearia de administração")).toHaveCount(0);
  } finally {
    finish();
  }
  await expect(page.getByLabel("Barbearia de administração")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Criar acesso ou adicionar perfil" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Voltar à gestão", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Novo serviço/ }),
  ).toBeEnabled();
  await expect(
    page.getByText("Carregando sua barbearia…", { exact: true }),
  ).toHaveCount(0);
});

test("relatório sinaliza datas incompletas ou invertidas sem enviar consulta", async ({
  page,
  context,
}) => {
  await loginRequest(context.request);
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Relatórios", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Evolução mensal" }),
  ).toBeVisible();
  const requests = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/relatorios/dashboard"))
      requests.push(request.url());
  });
  const from = page.getByLabel("De", { exact: true });
  await from.fill("");
  await expect(page.getByRole("alert")).toContainText(
    "Informe a data inicial e a data final.",
  );
  await from.fill("2090-01-01");
  await expect(page.getByRole("alert")).toContainText(
    "A data final não pode ser anterior à inicial.",
  );
  await expect(
    page.getByRole("button", { name: "Exportar CSV" }),
  ).toBeDisabled();
  expect(requests).toEqual([]);
  await page
    .getByRole("button", { name: "Ano atual / limpar filtros" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Evolução mensal" }),
  ).toBeVisible();
});
