import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/auth.json" });

test.describe("POS E2E Journey", () => {
  test("login → open POS → sell item → cash payment → print receipt", async ({
    page,
  }) => {
    await test.step("Navigate to app and verify authenticated", async () => {
      await page.goto("/app", { waitUntil: "load" });
      // Tenant-agnostic auth check: the app shell / onboarding screen differs
      // per tenant, so assert the session kept us off the login gate.
      await expect(page).not.toHaveURL(/\/login/);
    });

    await test.step("Open POS and add item to cart", async () => {
      await page.goto("/app/pos");
      await expect(
        page.locator("text=سلة, text=Cart, text=جديد").first()
      ).toBeVisible({ timeout: 5000 });
      await page.fill(
        'input[placeholder*="بحث"], input[aria-label*="بحث"]',
        "E2E"
      );
      await page.waitForTimeout(500);
      await page.locator("text=E2E Test Item").first().click();
      await expect(page.locator("text=E2E Test Item")).toBeVisible();
      await expect(page.locator("text=200")).toBeVisible(); // Unit price
    });

    await test.step("Set quantity and complete sale", async () => {
      await page.fill('input[name="quantity"], input[aria-label*="كمية"]', "3");
      await page.getByRole("button", { name: /إضافة|Add to cart/ }).click();
      await expect(page.locator("text=600")).toBeVisible(); // Total 3 * 200
    });

    await test.step("Process cash payment", async () => {
      await page.getByRole("button", { name: /دفع|نقدي|Cash|Payment/ }).click();
      await page.fill(
        'input[name="amount"], input[placeholder*="المبلغ"]',
        "600"
      );
      await page.getByRole("button", { name: /تأكيد|دفع/ }).click();
      await expect(
        page.locator("text=تم البيع, text=Sale completed, text=Success")
      ).toBeVisible({ timeout: 5000 });
    });

    await test.step("Print receipt", async () => {
      const printPromise = page.waitForEvent("popup");
      await page
        .getByRole("button", { name: /طباعة|إيصال|Receipt|Print/ })
        .click();
      const printPage = await printPromise;
      await printPage.waitForLoadState();
      await expect(printPage.locator("body")).toContainText([
        "E2E Test Item",
        "3",
        "600",
        "نقدي",
      ]);
      await printPage.close();
    });
  });
});
