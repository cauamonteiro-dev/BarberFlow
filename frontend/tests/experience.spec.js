import { test, expect } from "@playwright/test";
import { loginRequest } from "./helpers";

test("menu administrativo pode ser rolado até o fim em uma janela baixa", async ({
  page,
  context,
}) => {
  await loginRequest(context.request);
  await page.setViewportSize({ width: 1200, height: 520 });
  await page.goto("/");
  const sidebar = page.locator(".sidebar");
  await expect(
    page.getByRole("heading", { name: "Seu dia, bem organizado." }),
  ).toBeVisible();
  await sidebar.locator(".sidebar-foot").scrollIntoViewIfNeeded();
  await expect(sidebar.locator(".sidebar-foot")).toBeInViewport();
  await sidebar
    .getByRole("button", { name: "Relatórios", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Evolução mensal" }),
  ).toBeVisible();
  expect(
    await sidebar.evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);
});

for (const [role, heading] of [
  ["admin", "Seu dia, bem organizado."],
  ["barbearia1", "Seu dia, bem organizado."],
  ["barbeiro", "Olá, Marcos!"],
  ["cliente", "Olá, Lucas!"],
]) {
  test(`login de ${role} mostra transição e identifica o espaço correto`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page
      .getByLabel("E-mail", { exact: true })
      .fill(`${role}@barberflow.local`);
    await page.getByLabel("Senha", { exact: true }).fill("BarberFlow!2026");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.locator(".welcome-loading")).toBeVisible();
    if (["barbearia1", "barbeiro"].includes(role))
      await expect(
        page
          .locator(".welcome-loading")
          .getByAltText("Logo de Barbearia Central", { exact: true }),
      ).toBeVisible();
    await expect(page.locator(".welcome-loading")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    if (role === "barbeiro") {
      await expect(page.locator(".barber-agenda-toolbar")).toContainText(
        "Marcos",
      );
      await expect(page.locator(".workspace-identity").last()).toContainText(
        "Barbearia Central",
      );
      await expect(page.getByLabel("Dia da agenda")).toBeVisible();
    }
    if (role === "barbearia1") {
      await expect(
        page.locator(".content > .workspace-identity"),
      ).toContainText("Barbearia Central");
      await expect(page.locator(".welcome-art .shop-logo")).toBeVisible();
    }
    expect(errors).toEqual([]);
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Acesse seu espaço" }),
    ).toBeVisible();
  });
}

test("cliente abre nas próprias reservas e encontra barbearias em outra página", async ({
  page,
  context,
}) => {
  await loginRequest(context.request, "cliente@barberflow.local");
  const response = await context.request.get("/api/portal/meus-agendamentos");
  expect(response.status()).toBe(200);
  const rows = await response.json();
  const upcoming = rows.filter(
    (a) =>
      ["AGENDADO", "CONFIRMADO"].includes(a.status) &&
      new Date(a.inicio) > new Date(),
  );
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Meus agendamentos", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".customer-booking")).toHaveCount(
    upcoming.length || rows.length,
  );
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await page.getByRole("button", { name: /Histórico \(/ }).click();
  await expect(page.locator(".customer-booking")).toHaveCount(
    rows.length - upcoming.length,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("navigation", { name: "Navegação do cliente", exact: true })
    .getByRole("button", { name: "Barbearias", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Encontre sua barbearia", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".customer-booking")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Navegação do cliente", exact: true })
    .getByRole("button", { name: "Meus agendamentos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Meus agendamentos", exact: true }),
  ).toBeVisible();
});
