import { expect, test } from "@playwright/test";

test("sign-up then create client golden path", async ({ page }) => {
  const email = `u${Date.now()}@example.test`;
  const password = "testpass1234";

  // Sign up
  await page.goto("/sign-up");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /Criar/ }).click();

  // With confirmations off, go sign in immediately.
  await page.goto("/sign-in");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await expect(page).toHaveURL(/\/hoje$/);

  // Navigate to clientes — empty state visible
  await page.getByRole("link", { name: "Clientes", exact: true }).first().click();
  await expect(page).toHaveURL(/\/clientes$/);
  await expect(page.getByText("Nenhum cliente ainda")).toBeVisible();

  // Create a client
  await page
    .getByRole("link", { name: /Adicionar/ })
    .first()
    .click();
  await page.getByLabel("Nome").fill("João da Silva");
  await page.getByLabel("Telefone (WhatsApp)").fill("+5511987654321");
  await page.getByLabel("Valor padrão").fill("R$ 150,00");
  await page.getByRole("button", { name: "Criar" }).click();

  // We land on the detail page
  await expect(page.getByRole("heading", { name: "João da Silva" })).toBeVisible();
});
