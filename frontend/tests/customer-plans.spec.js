import { expect, test } from "@playwright/test";
import { loginRequest } from "./helpers";

test("a página pública apresenta o futuro cadastro de barbearias", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 820 });
  await page.goto("/");
  await page.getByRole("link", { name: "Sua barbearia no BarberFlow" }).click();
  await expect(
    page.getByRole("heading", { name: "Sua barbearia no BarberFlow" }),
  ).toBeVisible();
  await expect(
    page.getByText("Desenvolvimento futuro", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    375,
  );
  await page.getByRole("link", { name: "Voltar ao BarberFlow" }).click();
  await expect(
    page.getByRole("heading", { name: "Acesse seu espaço" }),
  ).toBeVisible();
});

test("cliente solicita adesão e reserva um serviço após a confirmação da unidade", async ({
  page,
  context,
  request,
}) => {
  const admin = await loginRequest(request, "barbearia1@barberflow.local");
  const nome = `Plano para apresentação ${Date.now()}`;
  const plan = {
    barbeariaId: 1,
    nome,
    preco: 90,
    status: "ATIVO",
    servicoIds: [1],
  };
  const created = await request.post("/api/planos", {
    headers: admin,
    data: plan,
  });
  expect(created.ok()).toBe(true);
  const { id } = await created.json();
  const client = await loginRequest(
    context.request,
    "cliente@barberflow.local",
  );
  let subscription;
  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Barbearias", exact: true }).click();
    await page
      .getByRole("button", { name: "Conhecer Barbearia Central", exact: true })
      .click();
    await page.getByRole("button", { name: "Ver planos da barbearia" }).click();
    const offer = page.getByRole("article").filter({ hasText: nome });
    await expect(offer).toContainText("Corte Tradicional");
    page.once("dialog", (dialog) => dialog.accept());
    await offer.getByRole("button", { name: "Solicitar adesão" }).click();
    const subscriptions = page.getByRole("region", {
      name: "Minhas assinaturas nesta unidade",
    });
    const card = subscriptions.getByRole("article").filter({ hasText: nome });
    await expect(card).toContainText("Aguardando a barbearia");
    await expect(
      card.getByRole("button", { name: "Agendar pelo plano" }),
    ).toHaveCount(0);
    const mine = await (
      await context.request.get("/api/portal/minhas-assinaturas")
    ).json();
    subscription = mine.find((s) => s.planoId === id);
    const activated = await request.put(`/api/assinaturas/${subscription.id}`, {
      headers: admin,
      data: {
        clienteId: subscription.clienteId,
        planoId: id,
        dataInicio: subscription.dataInicio,
        status: "ATIVA",
      },
    });
    expect(activated.ok()).toBe(true);
    await page.reload();
    await page
      .getByRole("button", { name: "Minhas assinaturas", exact: true })
      .click();
    await page
      .getByRole("article")
      .filter({ hasText: nome })
      .getByRole("button", { name: "Ver planos na unidade" })
      .click();
    await card.getByRole("button", { name: "Agendar pelo plano" }).click();
    await page
      .getByRole("combobox", { name: "Barbeiro", exact: true })
      .selectOption({ label: "Marcos" });
    const service = page.getByRole("combobox", { name: "Serviço", exact: true });
    await expect(service.locator("option")).toHaveCount(2);
    await expect(service.locator("option").last()).toContainText(
      "Incluído no plano",
    );
    await service.selectOption("1");
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const day = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo",
    }).format(nextWeek);
    await page.getByLabel("Dia", { exact: true }).fill(day);
    await page
      .getByRole("group", { name: "Horário disponível", exact: true })
      .locator(".slot-option")
      .first()
      .click();
    await page.getByRole("button", { name: "Salvar agendamento" }).click();
    const confirmed = page
      .getByRole("row")
      .filter({ hasText: "Incluído no plano" })
      .first();
    await expect(confirmed).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await confirmed
      .getByRole("button", { name: "Cancelar", exact: true })
      .click();
    await expect(confirmed).toContainText("Cancelado");
  } finally {
    if (subscription)
      await context.request.put(
        `/api/portal/assinaturas/${subscription.id}/cancelamento`,
        { headers: client },
      );
    await request.put(`/api/planos/${id}`, {
      headers: admin,
      data: { ...plan, status: "INATIVO" },
    });
  }
});
