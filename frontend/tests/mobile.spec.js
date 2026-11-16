import { test, expect } from "@playwright/test";
import { loginRequest } from "./helpers";
import fs from "node:fs";

async function fits(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test("celular de 320 px permite entrar e navegar por todas as áreas administrativas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Acesse seu espaço" }),
  ).toBeVisible();
  await fits(page);
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("admin@barberflow.local");
  await page.getByLabel("Senha", { exact: true }).fill("BarberFlow!2026");
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveCSS(
    "font-size",
    "16px",
  );
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Seu dia, bem organizado." }),
  ).toBeVisible();
  const nav = page.getByRole("navigation");
  for (const name of [
    "Agenda",
    "Clientes",
    "Barbeiros",
    "Serviços",
    "Planos",
    "Assinaturas",
    "Barbearias",
    "Relatórios",
    "Visão geral",
  ]) {
    const button = nav.getByRole("button", { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-current", "page");
    await fits(page);
  }
  fs.mkdirSync("../.local/qa", { recursive: true });
  await page.screenshot({
    path: "../.local/qa/mobile-admin-320.png",
    fullPage: true,
  });
  await nav.getByRole("button", { name: "Clientes", exact: true }).click();
  await expect(page.locator("table tbody tr").first()).toHaveCSS(
    "display",
    "grid",
  );
  await expect(
    page.locator("table tbody td[data-label=Cliente]").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: /Novo cliente/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByLabel("Nome", { exact: true })
    .fill("Cliente do celular " + Date.now());
  const save = dialog.getByRole("button", {
    name: "Salvar alterações",
    exact: true,
  });
  const bounds = await save.boundingBox();
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(741);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  await save.click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Alterações salvas" }),
  ).toContainText("Alterações salvas");
  await fits(page);
  await page.screenshot({
    path: "../.local/qa/mobile-clientes-320.png",
    fullPage: true,
  });
});

test("edição de horários e formulários cabem em 390 px e na horizontal", async ({
  page,
  context,
}) => {
  await loginRequest(context.request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Acessos e horários", exact: true })
    .click();
  await page.getByLabel("Profissional dos horários").selectOption({ index: 1 });
  await expect(
    page.getByRole("button", { name: "Salvar expediente", exact: true }),
  ).toBeVisible();
  await fits(page);
  for (const field of await page.locator(".schedule-row input").all()) {
    const box = await field.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(391);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({
    path: "../.local/qa/mobile-horarios-390.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Voltar à gestão", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Serviços", exact: true })
    .click();
  await page.getByRole("button", { name: /Novo serviço/ }).click();
  await page.setViewportSize({ width: 740, height: 390 });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Salvar alterações", exact: true }),
  ).toBeInViewport();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await fits(page);
});

for (const [role, email] of [
  ["cliente", "cliente@barberflow.local"],
  ["barbeiro", "barbeiro@barberflow.local"],
]) {
  test(`portal de ${role} funciona em celular nos temas claro e escuro`, async ({
    page,
    context,
  }) => {
    await loginRequest(context.request, email);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    if (role === "cliente")
      await page
        .getByRole("button", {
          name: "Ver serviços e horários de Barbearia Central",
          exact: true,
        })
        .click();
    await expect(
      page.getByRole("heading", {
        name: role === "cliente" ? "Agendar serviço" : "Minha agenda",
        exact: true,
      }),
    ).toBeVisible();
    for (const width of [375, 412]) {
      await page.setViewportSize({ width, height: 812 });
      await fits(page);
    }
    if (role === "cliente") {
      await page
        .getByRole("button", { name: "Novo agendamento", exact: true })
        .click();
      await expect(
        page.getByRole("combobox", { name: "Horário disponível", exact: true }),
      ).toBeVisible();
      await fits(page);
      await page.getByRole("button", { name: "Voltar", exact: true }).click();
    }
    await page
      .getByRole("button", { name: "Modo escuro", exact: true })
      .click();
    await fits(page);
    await page.screenshot({
      path: `../.local/qa/mobile-${role}-dark.png`,
      fullPage: true,
    });
  });
}
