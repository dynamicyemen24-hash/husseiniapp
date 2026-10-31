import { test as setup, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";

/**
 * Playwright setup project — generates e2e/auth.json storage state.
 *
 * Logs in through the real UI (client-side validation → tRPC auth.login →
 * session cookie), then saves cookies + localStorage for all authenticated
 * journey specs that declare `test.use({ storageState: "e2e/auth.json" })`.
 *
 * VALUE-PRESERVING: only performs a login for the dedicated E2E account.
 */

const authFile = "e2e/auth.json";

setup("authenticate as E2E runner", async ({ page }) => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    // No credentials (CI without secrets): emit an empty state so downstream
    // projects don't crash on ENOENT — authenticated journeys will fail with
    // a clear redirect-to-login error instead of a config error.
    mkdirSync("e2e", { recursive: true });
    writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    setup.skip();
    return;
  }

  mkdirSync("e2e", { recursive: true });

  await page.goto("/login");

  const userInput = page.locator('input[name="username"]').first();
  await expect(userInput).toBeVisible({ timeout: 15_000 });
  await userInput.fill(username);
  await page.locator('input[name="password"]').first().fill(password);

  await page
    .getByRole("button", { name: /دخول النظام|دخول/ })
    .first()
    .click();

  // Login success navigates to /app (see Login.tsx goApp()).
  await page.waitForURL(/\/app/, { timeout: 20_000 });

  // Verify authentication via the session cookie — robust against any
  // tenant-specific header content (welcome/onboarding screens differ).
  const cookies = await page.context().cookies();
  const session = cookies.find(c => c.name === "app_session_id");
  if (!session || !session.value) {
    throw new Error(
      "Login did not set the app_session_id cookie — check E2E credentials."
    );
  }

  await page.context().storageState({ path: authFile });
});
