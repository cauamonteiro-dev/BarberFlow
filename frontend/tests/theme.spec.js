import { test, expect } from "@playwright/test";
import fs from "node:fs";

test("identidade visual e tema persistem entre telas, recargas e abas", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Seu dia, bem organizado." }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Carregando" }),
  ).toHaveCount(0);
  const theme = page.getByRole("button", { name: "Modo escuro", exact: true });
  await expect(theme).toHaveAttribute("aria-pressed", "false");
  const logo = page.getByAltText(
    "Logo principal BarberFlow, em azul-marinho e dourado",
  );
  await expect(logo).toBeVisible();
  expect(
    await logo.evaluate((img) => img.complete && img.naturalWidth > 0),
  ).toBe(true);
  fs.mkdirSync("../.local/qa", { recursive: true });
  await page.screenshot({
    path: "../.local/qa/brand-light-desktop.png",
    fullPage: true,
  });
  await theme.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(theme).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".panel").first()).toHaveCSS(
    "background-color",
    "rgb(20, 31, 44)",
  );
  await page.screenshot({
    path: "../.local/qa/brand-dark-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Clientes", exact: true })
    .click();
  await page.getByRole("button", { name: "Novo cliente" }).click();
  await expect(page.getByRole("dialog")).toHaveCSS(
    "background-color",
    "rgb(20, 31, 44)",
  );
  await expect(
    page.getByRole("dialog").getByLabel("Nome", { exact: true }),
  ).toHaveCSS("background-color", "rgb(20, 31, 44)");
  await page.screenshot({
    path: "../.local/qa/brand-dark-form.png",
    fullPage: true,
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("status").filter({ hasText: "Carregando" }),
  ).toHaveCount(0);
  await expect(theme).toHaveAttribute("aria-pressed", "true");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(theme).toHaveAttribute("aria-pressed", "true");
  const other = await context.newPage();
  await other.goto("/");
  await expect(
    other.getByRole("button", { name: "Modo escuro", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await theme.click();
  await expect(
    other.getByRole("button", { name: "Modo escuro", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await other.close();
  for (const mode of ["light", "dark"]) {
    if (mode === "dark") await theme.click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(theme).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../.local/qa/brand-${mode}-mobile.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test("tema inicial e mudanças seguem o sistema sem preferência manual", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("tema permanece utilizável quando o armazenamento da preferência está bloqueado", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const read = Storage.prototype.getItem,
      write = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === "barberflow.theme")
        throw new DOMException("Blocked", "SecurityError");
      return read.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "barberflow.theme")
        throw new DOMException("Blocked", "SecurityError");
      return write.call(this, key, value);
    };
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "Modo escuro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
