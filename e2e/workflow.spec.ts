import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/auth.json" });

test.describe("Workflow E2E Journey", () => {
  test("login → submit requisition → approve as manager → verify next step", async ({
    page,
  }) => {
    await test.step("Navigate to app and verify authenticated", async () => {
      await page.goto("/app", { waitUntil: "load" });
      // Tenant-agnostic auth check: the app shell / onboarding screen differs
      // per tenant, so assert the session kept us off the login gate.
      await expect(page).not.toHaveURL(/\/login/);
    });

    await test.step("Create purchase requisition", async () => {
      await page.goto("/app/procurement");
      await page
        .getByRole("button", { name: /طلب جديد|جديد طلب|New Requisition/ })
        .click();
      await page.fill(
        'input[name="itemName"], input[placeholder*="اسم الصنف"]',
        "E2E Office Supplies"
      );
      await page.fill(
        'input[name="quantity"], input[placeholder*="الكمية"]',
        "50"
      );
      await page.fill(
        'input[name="unit"], input[placeholder*="الوحدة"]',
        "قطعة"
      );
      await page.fill(
        'input[name="estimatedCost"], input[placeholder*="التكلفة"]',
        "5000"
      );
      await page.selectOption(
        'select[name="departmentId"], select[aria-label*="القسم"]',
        { index: 1 }
      );
      await page.getByRole("button", { name: /حفظ|إرسال|Submit/ }).click();
      await expect(page.locator("text=تم الحفظ, text=تم الإرسال")).toBeVisible({
        timeout: 5000,
      });
      const reqNumber = await page.locator("text=REQ-").first().textContent();
      expect(reqNumber).toMatch(/REQ-\d+-\d+/);
    });

    await test.step("Approve as manager", async () => {
      await page.goto("/app/procurement");
      await page.locator(`text=${reqNumber}`).first().click();
      await page.getByRole("button", { name: /اعتماد|Approve/ }).click();
      await expect(page.locator("text=تم الاعتماد, text=Approved")).toBeVisible(
        { timeout: 5000 }
      );
    });

    await test.step("Verify next step (receive)", async () => {
      await page.reload();
      await expect(page.locator("text=استلام, text=Receive")).toBeVisible();
      await expect(page.locator("text=مرفوض, text=Rejected")).not.toBeVisible();
    });
  });
});
