import { test, expect } from "@playwright/test";
import { loginRequest } from "./helpers";
import fs from "node:fs";

test("cliente cadastra acesso, reserva, remarca e cancela no próprio portal", async ({
  page,
  request,
  playwright,
}) => {
  const headers = await loginRequest(request);
  const shop = await (
    await request.post("/api/barbearias", {
      headers,
      data: { nome: "Teste de perfis " + Date.now(), ativa: true },
    })
  ).json();
  const barber = await (
    await request.post("/api/barbeiros", {
      headers,
      data: {
        barbeariaId: shop.id,
        nome: "Profissional do portal",
        status: "ATIVO",
      },
    })
  ).json();
  const service = await (
    await request.post("/api/servicos", {
      headers,
      data: {
        barbeariaId: shop.id,
        nome: "Corte do portal",
        preco: 65,
        duracaoMin: 30,
        status: "ATIVO",
      },
    })
  ).json();
  try {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Acesse seu espaço" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Sou cliente e quero me cadastrar" })
      .click();
    await page.getByLabel("Nome", { exact: true }).fill("Cliente Portal");
    await page
      .getByLabel("E-mail", { exact: true })
      .fill("portal." + Date.now() + "@example.com");
    await page.getByLabel("Senha", { exact: true }).fill("Portal!2026teste");
    await page.getByRole("button", { name: "Criar conta e entrar" }).click();
    await expect(
      page.getByRole("heading", { name: "Meus agendamentos" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Acessos e horários" }),
    ).toHaveCount(0);
    await page.getByLabel("Selecionar barbearia").selectOption(String(shop.id));
    await page
      .getByRole("button", { name: "Novo agendamento", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Barbeiro", exact: true })
      .selectOption(String(barber.id));
    await page
      .getByRole("combobox", { name: "Serviço", exact: true })
      .selectOption(String(service.id));
    const day = new Date();
    do {
      day.setDate(day.getDate() + 1);
    } while (day.getDay() !== 1);
    const dayText = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    await page.getByLabel("Dia", { exact: true }).fill(dayText);
    const slots = page.getByRole("combobox", {
      name: "Horário disponível",
      exact: true,
    });
    await expect(slots.locator("option")).not.toHaveCount(1);
    await slots.selectOption({ index: 1 });
    await page.getByRole("button", { name: "Salvar agendamento" }).click();
    await expect(
      page.getByRole("button", { name: "Remarcar", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Remarcar", exact: true }).click();
    await expect(slots.locator("option")).not.toHaveCount(1);
    await slots.selectOption({ index: 2 });
    await page.getByRole("button", { name: "Salvar agendamento" }).click();
    fs.mkdirSync("../.local/qa", { recursive: true });
    await page.screenshot({
      path: "../.local/qa/portal-cliente.png",
      fullPage: true,
    });
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(
      page.getByRole("cell", { name: "Cancelado", exact: true }),
    ).toBeVisible();
    const denied = await page.request.get("/api/clientes");
    expect(denied.status()).toBe(403);
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Acesse seu espaço" }),
    ).toBeVisible();
  } finally {
    await request.put("/api/barbearias/" + shop.id, {
      headers,
      data: { nome: shop.nome, ativa: false },
    });
  }
});

test("barbeiro vê a própria agenda e o administrador gerencia horários", async ({
  page,
  context,
}) => {
  await loginRequest(context.request, "barbeiro@barberflow.local");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Minha agenda", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Meu expediente e bloqueios" }),
  ).toBeVisible();
  expect(
    (await page.request.get("/api/relatorios?barbeariaId=1")).status(),
  ).toBe(403);
  fs.mkdirSync("../.local/qa", { recursive: true });
  await page.screenshot({
    path: "../.local/qa/portal-barbeiro.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Acesse seu espaço" }),
  ).toBeVisible();
  await loginRequest(context.request);
  await page.reload();
  await page
    .getByRole("button", { name: "Acessos e horários", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Acessos e horários", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Profissional dos horários").selectOption({ index: 1 });
  await expect(
    page.getByRole("button", { name: "Salvar expediente" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Salvar expediente", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Alterações salvas");
  await page.screenshot({
    path: "../.local/qa/portal-admin.png",
    fullPage: true,
  });
});
