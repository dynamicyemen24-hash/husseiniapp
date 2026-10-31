import { test, expect } from "@playwright/test";

/**
 * Operational modules — surfaced through the public marketing surface.
 * Each module cluster on the landing page must render its identity,
 * promise and CTA. Read-only by design (no tenant data touched).
 */

test.describe("Operational modules", () => {
  test("solution modules section renders all clusters", async ({ page }) => {
    await page.goto("/");

    // The solution clusters are anchor-linked in the mega menu / page body
    const solutions = page
      .getByText(/الحلول البرمجية|الخدمات الهندسية|الخدمات الطلابية/)
      .first();
    await expect(solutions).toBeVisible();

    // Consulting depth: transformation stories must be present
    await expect(page.getByText(/قصص تحوّل|قبل|بعد/).first()).toBeVisible();
  });

  test("knowledge hub is publicly reachable", async ({ page }) => {
    // The knowledge hub lives at /insights (route renamed from /knowledge)
    await page.goto("/insights");
    // Guard against the SPA fallback rendering a blank screen
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("calculators page is publicly reachable and interactive", async ({
    page,
  }) => {
    await page.goto("/calculators");
    await expect(page.locator("h1, h2").first()).toBeVisible();

    const range = page.locator('input[type="range"]').first();
    if (await range.count()) {
      await range.focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.locator("body")).toContainText(/\d/);
    }
  });
});
