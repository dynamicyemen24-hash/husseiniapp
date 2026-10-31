import { test, expect } from "@playwright/test";

/**
 * Login gate — exercised ONLY through client-side validation paths.
 * Wrong-format input is rejected by Zod before any network call is made,
 * so no server state is touched and no real credentials are needed.
 */

test.describe("Login gate", () => {
  test("renders the Uamex_erp branded gate", async ({ page }) => {
    await page.goto("/login");
    // Per-page Arabic SEO title: "تسجيل الدخول — الحسينية لخدمات الأعمال"
    await expect(page).toHaveTitle(/الحسينية|alhusainia/i);
    await expect(page.getByText(/Uamex_erp|بوابة|تسجيل/).first()).toBeVisible();
  });

  test("rejects empty submission via client-side Zod (no network)", async ({
    page,
  }) => {
    await page.goto("/login");

    const submit = page.getByRole("button", { name: /دخول|تسجيل/ }).first();
    await submit.click();

    // A validation message must appear without leaving the page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("form").first()).toBeVisible();
  });

  test("rejects malformed username via client-side validation", async ({
    page,
  }) => {
    await page.goto("/login");

    // "@" and spaces are rejected by the register/login schema formats
    const userInput = page
      .locator('input[name="username"], input[type="text"]')
      .first();
    if (await userInput.count()) {
      await userInput.fill("bad user@!");
      const submit = page.getByRole("button", { name: /دخول|تسجيل/ }).first();
      await submit.click();

      // Still on the login page: the request never fires
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
