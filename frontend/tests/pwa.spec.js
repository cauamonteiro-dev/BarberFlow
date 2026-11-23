import { expect, test } from "@playwright/test";
import { loginRequest } from "./helpers";

test("site entrega o manifesto e os arquivos de instalação", async ({
  request,
}) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain('rel="manifest" href="/manifest.json"');
  const response = await request.get("/manifest.json");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toMatch(/json/);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    short_name: "BarberFlow",
  });
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual([
    "192x192",
    "512x512",
    "512x512",
  ]);
  expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  const appleImages = [
    ...html.matchAll(
      /rel="apple-touch-(?:icon|startup-image)"[^>]+href="([^"]+)"/g,
    ),
  ].map(([, href]) => href);
  expect(appleImages).toContain("/brand/pwa/icon-180.png");
  expect(appleImages.some((href) => href.includes("launch-"))).toBe(true);
  for (const url of [
    ...manifest.icons.map((icon) => icon.src),
    ...appleImages,
  ]) {
    const image = await request.head(url);
    expect(image.ok(), url).toBe(true);
    expect(image.headers()["content-type"], url).toContain("image/png");
  }
});

test("a queda de conexão abre aviso e mantém os dados privados fora do cache", async ({
  page,
  context,
  request,
}) => {
  const html = await (await request.get("/")).text();
  test.skip(
    html.includes('src="/@vite/client"'),
    "Service worker ativo apenas no build.",
  );
  await loginRequest(context.request, "cliente@barberflow.local");
  await page.goto("/");
  await page.waitForFunction(async () =>
    Boolean((await navigator.serviceWorker.getRegistration())?.active),
  );
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  const agenda = page.getByRole("heading", { name: "Meus agendamentos" });
  await expect(agenda).toBeVisible();

  const savedUrls = await page.evaluate(async () => {
    const names = (await caches.keys()).filter((key) =>
      key.startsWith("barberflow-offline-"),
    );
    const entries = await Promise.all(
      names.map(async (key) => (await caches.open(key)).keys()),
    );
    return entries.flat().map((entry) => new URL(entry.url).pathname);
  });
  expect(savedUrls).toEqual(["/offline.html"]);
  await context.setOffline(true);
  expect(
    await page.evaluate(() =>
      fetch("/api/auth/me").then(
        () => true,
        () => false,
      ),
    ),
  ).toBe(false);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sem conexão" }),
  ).toBeVisible();
  await expect(agenda).toHaveCount(0);
  await context.setOffline(false);
  await page.getByRole("link", { name: "Tentar novamente" }).click();
  await expect(agenda).toBeVisible();
});

test("área do cliente funciona quando o navegador não oferece AbortSignal.any", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(AbortSignal, "any", { value: undefined });
  });
  await loginRequest(context.request, "cliente@barberflow.local");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Meus agendamentos" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Acesse seu espaço" }),
  ).toBeVisible();
  expect((await context.request.get("/api/auth/me")).status()).toBe(401);
});
