import { expect, test } from "@playwright/test";

test("edit template, create charge, mark paid, see monthly total", async ({ page }) => {
  const email = `p3${Date.now()}@example.test`;
  const password = "testpass1234";

  // Sign up + sign in
  await page.goto("/sign-up");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /Criar/ }).click();
  await page.goto("/sign-in");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await expect(page).toHaveURL(/\/hoje$/);

  // Edit template via Ajustes
  await page.getByRole("link", { name: "Ajustes", exact: true }).first().click();
  await expect(page).toHaveURL(/\/ajustes$/);
  await page.getByRole("link", { name: /Mensagem do WhatsApp/ }).click();
  await expect(page).toHaveURL(/\/ajustes\/template$/);
  await page.getByLabel("Mensagem").fill("Olá {nome}, teste {valor} {vencimento}.");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Template salvo.")).toBeVisible();

  // Create a client due today
  const today = new Date().toISOString().slice(0, 10);
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome").fill("Carlos Teste");
  await page.getByLabel("Telefone (WhatsApp)").fill("+5511998887777");
  await page.getByLabel("Valor padrão").fill("R$ 300,00");
  await page.getByLabel("Primeiro vencimento").fill(today);
  await page.getByRole("button", { name: "Criar" }).click();
  await expect(page.getByRole("heading", { name: "Carlos Teste" })).toBeVisible();

  // Mark the today charge as paid from Hoje
  await page.getByRole("link", { name: "Hoje", exact: true }).first().click();
  await page.getByRole("button", { name: "Ações" }).first().click();
  await expect(page.getByRole("menuitem", { name: "Marcar pago" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Marcar pago" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("Carlos Teste")).toHaveCount(0);

  // Relatórios shows the payment
  await page.getByRole("link", { name: "Relatórios", exact: true }).first().click();
  await expect(page).toHaveURL(/\/relatorios$/);
  await expect(page.getByText("R$ 300,00").first()).toBeVisible();
});
