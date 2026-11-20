import { expect, test } from "@playwright/test";

test("prévia funciona dentro da vitrine e abre a aplicação em outra aba", async ({
  page,
  baseURL,
}) => {
  const showcase = "https://mostraplus.com.br/teste-barberflow";
  const application = new URL("/", baseURL).href;
  const requests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      requests.push(request.url());
  });

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
  await expect(popup).toHaveURL(application);
  await expect(
    popup.getByRole("heading", { name: "Acesse seu espaço" }),
  ).toBeVisible();
});
