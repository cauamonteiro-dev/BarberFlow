import { expect, test } from "@playwright/test";

test("prévia funciona dentro da vitrine e abre a aplicação em outra aba", async ({
  page,
  context,
  request,
  baseURL,
}) => {
  const showcase = "https://mostraplus.com.br/teste-barberflow";
  const target = new URL("/", baseURL);
  const application =
    target.protocol === "http:" ? new URL("https://barberflow.test/") : target;
  const requests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      requests.push(request.url());
  });

  if (application !== target) {
    // Serve local responses under an HTTPS origin so the browser's local
    // network permissions do not interfere with the cross-origin iframe.
    await context.route(`${application.origin}/**`, async (route) => {
      const url = new URL(route.request().url());
      const response = await request.get(
        new URL(url.pathname + url.search, target).href,
      );
      await route.fulfill({ response });
    });
  }
  await page.route(showcase, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<iframe title="Prévia do BarberFlow" src="${application}"
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
        style="width:320px;height:480px"></iframe>`,
    }),
  );
  await page.goto(showcase);
  const preview = page.frameLocator("iframe");
  await expect(
    preview.getByRole("heading", { name: "BarberFlow" }),
  ).toBeVisible();
  const open = preview.getByRole("link", {
    name: "Abrir BarberFlow em nova aba",
  });
  await expect(open).toBeVisible();
  expect(requests).toEqual([]);

  const popupPromise = page.waitForEvent("popup");
  await open.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(application.href);
  await expect(
    popup.getByRole("heading", { name: "Acesse seu espaço" }),
  ).toBeVisible();
});
