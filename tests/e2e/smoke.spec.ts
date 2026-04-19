import { expect, test } from "@playwright/test";

test("unauthenticated root redirects to sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});
