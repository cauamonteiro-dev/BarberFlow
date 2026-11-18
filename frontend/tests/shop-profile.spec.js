import { test, expect } from "@playwright/test";
import { loginRequest } from "./helpers";

test.beforeEach(async ({ context }) => {
  await loginRequest(context.request, "cliente@barberflow.local");
});

test("cliente conhece a unidade, vê fotos e endereço e agenda na unidade escolhida", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navegação do cliente", exact: true })
    .getByRole("button", { name: "Barbearias", exact: true })
    .click();
  const search = page.getByRole("searchbox", { name: "Pesquisar barbearias" });
  await search.fill("Central Norte");
  const card = page.getByRole("article", {
    name: "Barbearia Central Norte",
    exact: true,
  });
  await expect(card.locator("img")).toBeVisible();
  await card
    .getByRole("button", {
      name: "Conhecer Barbearia Central Norte",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Barbearia Central Norte", exact: true }),
  ).toBeVisible();
  await expect(page.locator("address")).toContainText("Jardim Norte");
  await expect(page.locator(".shop-demo-note")).toContainText(
    "Unidade fictícia",
  );
  await expect(page.locator(".shop-gallery img")).toHaveCount(2);
  await expect
    .poll(() =>
      page
        .locator(".shop-profile img")
        .evaluateAll((images) =>
          images.every((img) => img.complete && img.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Agendar nesta barbearia", exact: false })
    .click();
  const banner = page.getByRole("region", {
    name: "Barbearia escolhida",
    exact: true,
  });
  await expect(banner.getByRole("heading")).toHaveText(
    "Barbearia Central Norte",
  );
  await expect(banner).toContainText("Jardim Norte");
  await expect(
    page.getByRole("combobox", { name: "Serviço", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sobre a barbearia", exact: true })
    .click();
  await expect(page.locator("address")).toContainText("Jardim Norte");
  await page
    .getByRole("button", { name: "Voltar à pesquisa", exact: false })
    .click();
  await expect(search).toHaveValue("Central Norte");
  await page
    .getByRole("button", {
      name: "Ver serviços e horários de Barbearia Central Norte",
      exact: true,
    })
    .click();
  await expect(banner.getByRole("heading")).toHaveText(
    "Barbearia Central Norte",
  );
});

test("perfil e agenda cabem em celulares nos dois temas", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navegação do cliente", exact: true })
    .getByRole("button", { name: "Barbearias", exact: true })
    .click();
  const fits = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  await page
    .getByRole("searchbox", { name: "Pesquisar barbearias" })
    .fill("Dom Barber Sul");
  await fits();
  await page
    .getByRole("button", { name: "Conhecer Dom Barber Sul", exact: true })
    .click();
  await expect(page.locator("address")).toContainText("Vila Sul");
  await fits();
  await page.getByRole("button", { name: "Modo escuro", exact: true }).click();
  await fits();
  await page
    .getByRole("button", { name: "Agendar nesta barbearia", exact: false })
    .click();
  await expect(
    page.getByRole("region", { name: "Barbearia escolhida" }),
  ).toContainText("Dom Barber Sul");
  await fits();
  await page
    .getByRole("button", { name: "Sobre a barbearia", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dom Barber Sul", exact: true }),
  ).toBeVisible();
  await fits();
});
