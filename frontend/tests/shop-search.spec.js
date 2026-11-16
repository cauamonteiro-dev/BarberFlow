import { test, expect } from "@playwright/test";
import { loginRequest } from "./helpers";
import fs from "node:fs";

test.beforeEach(async ({ context }) => {
  await loginRequest(context.request, "cliente@barberflow.local");
});

test("cliente pesquisa barbearias ativas sem selecionar uma unidade automaticamente", async ({
  page,
}) => {
  let panels = 0;
  page.on("request", (r) => {
    if (r.url().includes("/portal/painel")) panels++;
  });
  await page.route("**/api/portal/barbearias", (route) =>
    route.fulfill({
      json: [
        { id: 1, nome: "Corte & Estilo", ativa: true },
        { id: 2, nome: "São João Barber", ativa: true },
        { id: 3, nome: "Unidade fechada", ativa: false },
      ],
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Encontre sua barbearia", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(2);
  expect(panels).toBe(0);
  await expect(
    page.getByRole("article", { name: "Unidade fechada", exact: true }),
  ).toHaveCount(0);
  const search = page.getByRole("searchbox", { name: "Pesquisar barbearias" });
  await search.fill("  SAO JOAO ");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "São João Barber", exact: true }),
  ).toBeVisible();
  await search.fill("não existe");
  await expect(
    page.getByRole("heading", { name: "Nenhuma barbearia encontrada" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Limpar pesquisa", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(2);
  fs.mkdirSync("../.local/qa", { recursive: true });
  await page.screenshot({
    path: "../.local/qa/pesquisa-barbearias-desktop.png",
    fullPage: true,
  });
  for (const width of [320, 390, 412]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const box = await page
      .getByRole("button", {
        name: "Ver serviços e horários de Corte & Estilo",
        exact: true,
      })
      .boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: "Modo escuro", exact: true }).click();
  await page.screenshot({
    path: "../.local/qa/pesquisa-barbearias-mobile-dark.png",
    fullPage: true,
  });
});

test("selecionar uma barbearia abre os serviços daquela unidade e permite voltar à pesquisa", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("searchbox", { name: "Pesquisar barbearias" })
    .fill("Central");
  await page
    .getByRole("button", {
      name: "Ver serviços e horários de Barbearia Central",
      exact: true,
    })
    .click();
  await expect(page.locator(".selected-shop-name")).toHaveText(
    "Barbearia Central",
  );
  await expect(
    page.getByRole("heading", { name: "Agendar serviço", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Minhas reservas", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("table")).toHaveCount(0);
  const me = await (await page.request.get("/api/auth/me")).json();
  const panel = await (
    await page.request.get("/api/portal/painel?barbeariaId=1&perfil=CLIENTE")
  ).json();
  expect(panel.agendamentos.every((a) => a.clienteId === me.clienteId)).toBe(
    true,
  );
  expect(panel.clientes.every((c) => c.id === me.clienteId)).toBe(true);
  expect((await page.request.get("/api/clientes")).status()).toBe(403);
  await page
    .getByRole("button", { name: "Meus agendamentos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Minhas reservas", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Cliente / contato", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Agendar serviço", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Minhas reservas", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("combobox", { name: "Serviço", exact: true })
      .locator("option"),
  ).not.toHaveCount(1);
  await page
    .getByRole("button", { name: "Pesquisar outra barbearia", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Encontre sua barbearia", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Pesquisar barbearias" }),
  ).toHaveValue("Central");
});

test("pesquisa apresenta falha recuperável e ausência de barbearias disponíveis", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/portal/barbearias", (route) =>
    fail ? route.abort() : route.fulfill({ json: [] }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível conectar",
  );
  fail = false;
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ainda não há barbearias disponíveis" }),
  ).toBeVisible();
});
