import { expect, test } from "@playwright/test";

test("charges rolling window and mark-paid golden path", async ({ page }) => {
  const email = `c${Date.now()}@example.test`;
  const password = "testpass1234";

  // Sign up
  await page.goto("/sign-up");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /Criar/ }).click();

  // Local Supabase auto-confirms; go sign in
  await page.goto("/sign-in");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await expect(page).toHaveURL(/\/hoje$/);

  // Empty Hoje state
  await expect(page.getByText("Nada para hoje")).toBeVisible();

  // Create a client whose first charge is due today
  const today = new Date().toISOString().slice(0, 10);
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome").fill("Maria Teste");
  await page.getByLabel("Telefone (WhatsApp)").fill("+5511999990000");
  await page.getByLabel("Valor padrão").fill("R$ 200,00");
  await page.getByLabel("Primeiro vencimento").fill(today);
  await page.getByRole("button", { name: "Criar" }).click();

  // Landed on client detail
  await expect(page.getByRole("heading", { name: "Maria Teste" })).toBeVisible();

  // Hoje now shows one charge due today
  await page.getByRole("link", { name: "Hoje", exact: true }).first().click();
  await expect(page).toHaveURL(/\/hoje$/);
  await expect(page.getByText("Maria Teste")).toBeVisible();
  await expect(page.getByText("R$ 200,00").first()).toBeVisible();

  // Mark the charge as paid via the Ações dropdown
  await page.getByRole("button", { name: "Ações" }).first().click();
  await expect(page.getByRole("menuitem", { name: "Marcar pago" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Marcar pago" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();

  // The row should disappear from Hoje
  await expect(page.getByText("Maria Teste")).toHaveCount(0);
  await expect(page.getByText("Nada para hoje")).toBeVisible();
});
