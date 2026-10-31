import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/auth.json" });

test.describe("Inventory E2E Journey", () => {
  test("login → create item → adjust stock → transfer between warehouses", async ({
    page,
  }) => {
    await test.step("Navigate to app and verify authenticated", async () => {
      await page.goto("/app", { waitUntil: "load" });
      // Tenant-agnostic auth check: the app shell / onboarding screen differs
      // per tenant, so assert the session kept us off the login gate.
      await expect(page).not.toHaveURL(/\/login/);
    });

    await test.step("Create new item", async () => {
      await page.goto("/app/inventory");
      await page
        .getByRole("button", { name: /جديد|إضافة صنف|جديد منتج/ })
        .click();
      await page.fill(
        'input[name="code"], input[placeholder*="كود"]',
        "E2E-ITEM-001"
      );
      await page.fill(
        'input[name="name"], input[placeholder*="اسم"], input[placeholder*="منتج"]',
        "E2E Test Item"
      );
      await page.selectOption(
        'select[name="type"], select[aria-label*="نوع"]',
        "goods"
      );
      await page.fill(
        'input[name="salePrice"], input[placeholder*="سعر بيع"]',
        "200"
      );
      await page.fill(
        'input[name="purchasePrice"], input[placeholder*="سعر شراء"]',
        "120"
      );
      await page.fill('input[name="unit"], input[placeholder*="وحدة"]', "قطعة");
      await page.getByRole("button", { name: /حفظ|إضافة/ }).click();
      await expect(page.locator("text=تم الحفظ, text=تم الإنشاء")).toBeVisible({
        timeout: 5000,
      });
    });

    await test.step("Adjust stock (add)", async () => {
      await page.goto("/app/inventory");
      await page.locator("text=E2E Test Item").first().click();
      await page
        .getByRole("button", { name: /تعديل المخزون|إدخال مخزون|Adjust/ })
        .click();
      await page.selectOption(
        'select[name="warehouseId"], select[aria-label*="مستودع"]',
        { index: 1 }
      );
      await page.fill(
        'input[name="quantity"], input[placeholder*="كمية"]',
        "100"
      );
      await page.selectOption(
        'select[name="type"], select[aria-label*="نوع الحركة"]',
        "add"
      );
      await page.fill(
        'input[name="notes"], textarea[placeholder*="ملاحظات"]',
        "Initial stock entry"
      );
      await page.getByRole("button", { name: /حفظ|تأكيد/ }).click();
      await expect(page.locator("text=تم الحفظ, text=Success")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.locator("text=100")).toBeVisible();
    });

    await test.step("Transfer between warehouses", async () => {
      await page.getByRole("button", { name: /نقل|Transfer/ }).click();
      await page.selectOption(
        'select[name="fromWarehouseId"], select[aria-label*="من مستودع"]',
        { index: 1 }
      );
      await page.selectOption(
        'select[name="toWarehouseId"], select[aria-label*="إلى مستودع"]',
        { index: 2 }
      );
      await page.fill(
        'input[name="quantity"], input[placeholder*="كمية"]',
        "30"
      );
      await page.fill(
        'input[name="notes"], textarea[placeholder*="ملاحظات"]',
        "Transfer to secondary warehouse"
      );
      await page.getByRole("button", { name: /حفظ|نقل/ }).click();
      await expect(page.locator("text=تم الحفظ, text=Success")).toBeVisible({
        timeout: 5000,
      });
    });

    await test.step("Verify stock levels", async () => {
      await page.goto("/app/inventory");
      await page.locator("text=E2E Test Item").first().click();
      await expect(page.locator("text=70")).toBeVisible(); // Source warehouse
      await expect(page.locator("text=30")).toBeVisible(); // Destination warehouse
    });
  });
});
