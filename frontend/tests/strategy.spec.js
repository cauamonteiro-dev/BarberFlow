import { test, expect } from "@playwright/test";
import { loginRequest } from "./helpers";
import fs from "node:fs";

test("perfil Barbearia mantém dados e acessos na própria unidade", async ({
  page,
  context,
}) => {
  await loginRequest(context.request, "barbearia1@barberflow.local");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Seu dia, bem organizado." }),
  ).toBeVisible();
  await expect(page.getByLabel("Meu perfil")).toHaveValue("BARBEARIA");
  await expect(
    page.getByLabel("Selecionar barbearia").locator("option:not([disabled])"),
  ).toHaveCount(1);
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Barbearias", exact: true }),
  ).toHaveCount(0);
  expect((await page.request.get("/api/barbearias")).status()).toBe(200);
  for (const path of [
    "/api/servicos?barbeariaId=2",
    "/api/servicos/6",
    "/api/relatorios/dashboard?barbeariaId=2",
    "/api/administracao/2/acessos",
  ]) {
    expect((await page.request.get(path)).status()).toBe(403);
  }
  await page
    .getByRole("button", { name: "Acessos e horários", exact: true })
    .click();
  await expect(
    page.getByLabel("Barbearia de administração").locator("option"),
  ).toHaveCount(1);
  await expect(
    page.getByRole("option", { name: "Barbearia", exact: true }),
  ).toHaveCount(1); // only the current profile, never an assignable global role
  await expect(
    page.getByRole("option", { name: "Administrador geral", exact: true }),
  ).toHaveCount(0);
});

test("dashboard filtra gráficos, detalha situações e exporta o recorte", async ({
  page,
  context,
}) => {
  await loginRequest(context.request, "barbearia6@barberflow.local");
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Relatórios", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Evolução mensal" }),
  ).toBeVisible();
  const currentYear = new Date().getFullYear();
  const from = `${currentYear - 1}-01-01`,
    until = `${currentYear + 1}-12-31`;
  await page.getByLabel("De", { exact: true }).fill(from);
  await page.getByLabel("Até", { exact: true }).fill(until);
  await expect(page.getByRole("status")).toHaveCount(0);
  const response = await page.request.get(
    `/api/relatorios/dashboard?barbeariaId=6&de=${from}&ate=${until}`,
  );
  const data = await response.json();
  expect(data.indicadores.agendamentos).toBe(8);
  await page.getByRole("button", { name: "Agendamentos", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Agendamentos", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Concluídos\s+2/ }).click();
  await expect(page.locator("details")).toHaveAttribute("open", "");
  await expect(page.locator("summary")).toContainText("Concluídos (2)");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const file = await downloaded;
  const csv = fs.readFileSync(await file.path(), "utf8");
  expect(csv).toContain(
    data.atendimentos.find((f) => f.status === "CONCLUIDO").profissional,
  );
  expect(csv).not.toContain("Rafael Costa");
  await page.getByRole("button", { name: "Limpar seleção do gráfico" }).click();
  await page
    .getByLabel("Profissional", { exact: true })
    .selectOption(String(data.profissionais[0].id));
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(
    page.locator(".ranking-bars").last().getByRole("button"),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Ano atual / limpar filtros" })
    .click();
  await expect(page.getByLabel("Profissional", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByRole("heading", { name: "Evolução mensal" }),
  ).toBeVisible();
  fs.mkdirSync("../.local/qa", { recursive: true });
  await page.screenshot({
    path: "../.local/qa/relatorios-estrategicos-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Modo escuro", exact: true }).click();
  await page.screenshot({
    path: "../.local/qa/relatorios-estrategicos-mobile-dark.png",
    fullPage: true,
  });
  await page.getByLabel("De", { exact: true }).fill("2020-01-01");
  await page.getByLabel("Até", { exact: true }).fill("2020-01-31");
  await expect(
    page.getByRole("heading", { name: "Nenhum atendimento neste recorte." }),
  ).toBeVisible();
});

test("administrador geral vê as quinze unidades e pode conceder o perfil Barbearia", async ({
  page,
  context,
}) => {
  await loginRequest(context.request);
  const shops = await (await page.request.get("/api/barbearias")).json();
  expect(shops.length).toBeGreaterThanOrEqual(15);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Acessos e horários", exact: true })
    .click();
  await expect(
    page.getByRole("option", { name: "Barbearia", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByLabel("Barbearia de administração").locator("option"),
  ).toHaveCount(shops.length);
});
