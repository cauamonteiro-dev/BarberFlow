import { test, expect } from "@playwright/test";
import fs from "node:fs";
const testShops = [];
test.afterEach(async ({ request }) => {
  for (const shop of testShops.splice(0))
    await request.put("/api/barbearias/" + shop.id, {
      data: { nome: shop.nome, ativa: false },
    });
});

test("gestão completa, conflito de agenda e persistência na interface", async ({
  page,
  request,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const name = "Estúdio de teste " + Date.now();
  const created = await request.post("/api/barbearias", {
    data: { nome: name, ativa: true },
  });
  expect(created.status()).toBe(201);
  const shop = await created.json();
  testShops.push(shop);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Seu dia, bem organizado." }),
  ).toBeVisible();
  await page.getByLabel("Selecionar barbearia").selectOption(String(shop.id));
  await expect(
    page.getByRole("status").filter({ hasText: "Carregando" }),
  ).toHaveCount(0);
  const nav = page.getByRole("navigation");
  const dialog = page.getByRole("dialog");
  async function save() {
    await dialog.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Alterações salvas" }),
    ).toBeVisible();
  }
  await nav.getByRole("button", { name: "Clientes", exact: true }).click();
  await page.getByRole("button", { name: "Novo cliente" }).click();
  await dialog.getByLabel("Nome", { exact: true }).fill("Ana Teste");
  await dialog.getByLabel("Telefone").fill("31999990000");
  await dialog.getByLabel("E-mail").fill("ana." + Date.now() + "@example.com");
  await save();
  await expect(page.getByRole("cell", { name: /^Ana Teste/ })).toBeVisible();
  await nav.getByRole("button", { name: "Barbeiros", exact: true }).click();
  await page.getByRole("button", { name: "Novo barbeiro" }).click();
  await dialog.getByLabel("Nome", { exact: true }).fill("João Teste");
  await save();
  await nav.getByRole("button", { name: "Serviços", exact: true }).click();
  await page.getByRole("button", { name: "Novo serviço" }).click();
  await dialog.getByLabel("Nome", { exact: true }).fill("Corte especial");
  await dialog.getByLabel("Preço").fill("45.90");
  await dialog.getByLabel("Duração").fill("30");
  await save();
  await nav.getByRole("button", { name: "Planos", exact: true }).click();
  await page.getByRole("button", { name: "Novo plano" }).click();
  await dialog.getByLabel("Nome", { exact: true }).fill("Plano mensal");
  await dialog.getByLabel("Preço").fill("99.90");
  await save();
  await nav.getByRole("button", { name: "Assinaturas", exact: true }).click();
  await page.getByRole("button", { name: "Nova assinatura" }).click();
  await dialog
    .getByLabel("Cliente", { exact: true })
    .selectOption({ label: "Ana Teste" });
  await dialog
    .getByLabel("Plano", { exact: true })
    .selectOption({ label: "Plano mensal • R$ 99,90" });
  await dialog.getByLabel("Data inicial").fill("2027-01-01");
  await dialog.getByLabel("Data final").fill("2027-12-31");
  await save();
  await nav.getByRole("button", { name: "Agenda", exact: true }).click();
  await page.getByRole("button", { name: "Novo agendamento" }).click();
  async function fillBooking() {
    await dialog
      .getByLabel("Cliente", { exact: true })
      .selectOption({ label: "Ana Teste" });
    await dialog
      .getByLabel("Barbeiro", { exact: true })
      .selectOption({ label: "João Teste" });
    await dialog
      .getByLabel("Serviço", { exact: true })
      .selectOption({ label: "Corte especial • 30 min" });
    await dialog.getByLabel("Início do atendimento").fill("2027-01-10T10:00");
  }
  await fillBooking();
  await dialog
    .getByRole("button", { name: "Verificar disponibilidade" })
    .click();
  await expect(dialog.getByRole("status")).toContainText("Horário disponível");
  await save();
  await page.getByRole("button", { name: "Novo agendamento" }).click();
  await fillBooking();
  await dialog.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "já possui um agendamento",
  );
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Editar registro" }).click();
  await dialog
    .getByLabel("Situação", { exact: true })
    .selectOption("CONCLUIDO");
  await save();
  await nav.getByRole("button", { name: "Relatórios", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "João Teste", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "R$ 45,90", exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Clientes", exact: true }).click();
  await page.getByRole("button", { name: "Editar Ana Teste" }).click();
  await dialog.getByLabel("Vínculo com esta unidade").selectOption("INATIVO");
  await save();
  await expect(
    page.getByRole("cell", { name: "Inativo", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar Ana Teste" }).click();
  await dialog.getByLabel("Vínculo com esta unidade").selectOption("ATIVO");
  await save();
  await page.reload();
  await nav.getByRole("button", { name: "Clientes", exact: true }).click();
  await expect(page.getByRole("cell", { name: /^Ana Teste/ })).toBeVisible();
  await nav.getByRole("button", { name: "Visão geral", exact: true }).click();
  fs.mkdirSync("../.local/qa", { recursive: true });
  await page.screenshot({ path: "../.local/qa/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    nav.getByRole("button", { name: "Agenda", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "../.local/qa/mobile.png", fullPage: true });
  expect(errors).toEqual([]);
  // Keep the test data for inspection, but distinguish it from active real shops.
  await request.put("/api/barbearias/" + shop.id, {
    data: { nome: name, ativa: false },
  });
});

test("erros de conexão são apresentados com opção de tentar novamente", async ({
  page,
}) => {
  await page.route("**/api/barbearias", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível conectar",
  );
  await expect(
    page.getByRole("button", { name: "Tentar novamente" }),
  ).toBeVisible();
});
