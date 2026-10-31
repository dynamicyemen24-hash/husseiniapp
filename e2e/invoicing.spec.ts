import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/auth.json" });

test.describe("Invoicing E2E Journey", () => {
  test("login → create customer → create invoice → post → print PDF", async ({
    page,
  }) => {
    await test.step("Navigate to app and verify authenticated", async () => {
      await page.goto("/app", { waitUntil: "load" });
      // Tenant-agnostic auth check: the app shell / onboarding screen differs
      // per tenant, so assert the session kept us off the login gate.
      await expect(page).not.toHaveURL(/\/login/);
    });

    await test.step("Create new customer", async () => {
      await page.goto("/app/customers");
      await page.getByRole("button", { name: /جديد|إضافة|جديد عميل/ }).click();
      await page.fill(
        'input[name="name"], input[placeholder*="اسم"]',
        "E2E Test Customer"
      );
      await page.fill(
        'input[name="code"], input[placeholder*="كود"]',
        "E2E-CUST-001"
      );
      await page.fill(
        'input[name="phone"], input[placeholder*="هاتف"]',
        "777123456"
      );
      await page.fill(
        'input[name="email"], input[placeholder*="بريد"]',
        "e2e-customer@test.com"
      );
      await page.getByRole("button", { name: /حفظ|إضافة/ }).click();
      await expect(
        page.locator("text=تم الحفظ, text=تم الإنشاء, text=Success")
      ).toBeVisible({ timeout: 5000 });
    });

    await test.step("Create new invoice", async () => {
      await page.goto("/app/invoices");
      await page
        .getByRole("button", { name: /جديد|جديد فاتورة|إضافة/ })
        .click();
      await page.selectOption(
        'select[name="customerId"], select[aria-label*="عميل"]',
        { label: "E2E Test Customer" }
      );
      await page.getByRole("button", { name: /إضافة صنف|إضافة منتج/ }).click();
      await page.fill(
        'input[name="productName"], input[placeholder*="منتج"], input[placeholder*="صنف"]',
        "E2E Test Product"
      );
      await page.fill(
        'input[name="quantity"], input[placeholder*="كمية"]',
        "5"
      );
      await page.fill(
        'input[name="unitPrice"], input[placeholder*="سعر"]',
        "1000"
      );
      await page.getByRole("button", { name: /حفظ|إضافة/ }).click();
      await expect(page.locator("text=تم الحفظ, text=Success")).toBeVisible({
        timeout: 5000,
      });
    });

    await test.step("Post invoice", async () => {
      await page.getByRole("button", { name: /ترحيل|نشر|Post/ }).click();
      await expect(page.locator("text=تم الترحيل, text=Posted")).toBeVisible({
        timeout: 5000,
      });
    });

    await test.step("Print PDF", async () => {
      const printPromise = page.waitForEvent("popup");
      await page.getByRole("button", { name: /طباعة|PDF|Print/ }).click();
      const printPage = await printPromise;
      await printPage.waitForLoadState();
      await expect(printPage.locator("body")).toContainText([
        "E2E Test Customer",
        "E2E Test Product",
        "5,000",
      ]);
      await printPage.close();
    });
  });
});
