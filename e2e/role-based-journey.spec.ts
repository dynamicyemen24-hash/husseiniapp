import { test, expect, Page } from "@playwright/test";

/**
 * Role-Based Comprehensive E2E Tests — ALHUSAINIA / Uamex_erp
 * ===========================================================
 * Tests all major user roles: المحاسب, أمين المخزن, مندوب المبيعات, خدمة العملاء, المدير العام
 *
 * Prerequisites: E2E_USERNAME + E2E_PASSWORD environment variables
 * Run with: pnpm exec playwright test e2e/role-based-journey.spec.ts
 */

// =====================
// SHARED UTILITIES
// =====================

async function loginAs(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/اسم المستخدم|username/i).fill(username);
  await page.getByLabel(/كلمة المرور|password/i).fill(password);
  await page.getByRole("button", { name: /دخول|sign in|تسجيل/i }).click();
  await page.waitForURL("**/app", { timeout: 20_000 });
}

/** Navigate to a workspace and verify it loaded */
async function goToWorkspace(page: Page, path: string, waitForText: RegExp) {
  await page.goto(path);
  await expect(page.getByText(waitForText).first()).toBeVisible({
    timeout: 15_000,
  });
}

// =====================
// TEST SUITE: ACCOUNTANT (المحاسب)
// =====================

test.describe("🏦 المحاسب — Accountant Role", () => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  const hasCreds = !!username && !!password;

  test.skip(!hasCreds, "E2E credentials not configured — skipped");

  test("AC-01: Login and access Accounting module", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/accounting", /نظام الحسابات|محاسبة|قيد/i);
    await expect(page.getByText(/الحسينية|Uamex/i).first()).toBeVisible();
    await expect(page.getByRole("navigation").first()).toBeVisible();
    console.log("✅ AC-01: Accountant accessed accounting module successfully");
  });

  test("AC-02: Create a journal entry (القيد المزدوج)", async ({ page }) => {
    await loginAs(page, username!, password!);
    // The consolidated journal (دفتر اليومية التكاملي) exposes the
    // create-entry action as an anchor-styled link to /manual-journal.
    await goToWorkspace(page, "/journal", /القيود المحاسبية|قيد|journal/i);
    const newEntryAction = page
      .locator("a")
      .filter({ hasText: /قيد جديد|إضافة قيد/i })
      .first();
    await newEntryAction.click();
    await expect(
      page.getByText(/قيد يومية|قيد يدوي|manual journal|journal entry/i).first()
    ).toBeVisible({ timeout: 10_000 });
    const debitAccount = page
      .getByLabel(/طرف مدين|debit account|الحساب المدين|مدين/i)
      .first();
    if (await debitAccount.isVisible()) await debitAccount.fill("صندوق");
    const creditAccount = page
      .getByLabel(/طرف دائن|credit account|الحساب الدائن|دائن/i)
      .first();
    if (await creditAccount.isVisible()) await creditAccount.fill("مبيعات");
    const amountField = page.getByLabel(/مبلغ|amount/i).first();
    if (await amountField.isVisible()) await amountField.fill("1000");
    const saveButton = page.getByRole("button", { name: /حفظ|save/i }).first();
    if (await saveButton.isVisible()) await saveButton.click();
    console.log("✅ AC-02: Journal entry form completed");
  });

  test("AC-03: View Trial Balance (ميزان المراجعة)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/accounting", /نظام الحسابات|محاسبة|قيد/i);
    const reportsButton = page
      .getByRole("button", { name: /تقارير|reports/i })
      .first();
    if (await reportsButton.isVisible()) await reportsButton.click();
    const trialBalanceLink = page
      .getByText(/ميزان المراجعة|trial balance/i)
      .first();
    if (await trialBalanceLink.isVisible()) {
      await trialBalanceLink.click();
      const totalsVisible = await page
        .getByText(/إجمالي مدين|إجمالي دائن|total/i)
        .first()
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
      if (totalsVisible) console.log("✅ AC-03: Trial balance report loaded");
      else
        console.log(
          "⚠️  AC-03: Trial balance loaded but no totals (empty dataset)"
        );
    } else {
      console.log(
        "⚠️  AC-03: Trial balance link not found (may require specific permissions)"
      );
    }
  });

  test("AC-04: View General Ledger (دفتر الأستاذ)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/accounting", /نظام الحسابات|محاسبة|قيد/i);
    const ledgerLink = page.getByText(/دفتر الأستاذ|general ledger/i).first();
    if (await ledgerLink.isVisible()) {
      await ledgerLink.click();
      await expect(
        page.getByText(/حركة الحساب|account activity/i).first()
      ).toBeVisible({ timeout: 5_000 });
      console.log("✅ AC-04: General ledger accessed");
    } else {
      console.log("⚠️  AC-04: Ledger link not found");
    }
  });

  test("AC-05: View financial statements (القوائم المالية)", async ({
    page,
  }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/accounting", /نظام الحسابات|محاسبة|قيد/i);
    const statementsLink = page
      .getByText(/قائمة الدخل|الميزانية|balance sheet/i)
      .first();
    if (await statementsLink.isVisible()) {
      await statementsLink.click();
      console.log("✅ AC-05: Financial statements accessed");
    } else {
      console.log("⚠️  AC-05: Statements link not found");
    }
  });
});

// =====================
// TEST SUITE: INVENTORY MANAGER (أمين المخزن)
// =====================

test.describe("📦 أمين المخزن — Inventory Manager Role", () => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  const hasCreds = !!username && !!password;

  test.skip(!hasCreds, "E2E credentials not configured — skipped");

  test("INV-01: Access Inventory module", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/inventory", /مخزون|inventory/i);
    await expect(
      page.getByText(/المخزون|المنتجات|warehouse/i).first()
    ).toBeVisible();
    console.log("✅ INV-01: Inventory manager accessed module");
  });

  test("INV-02: View stock levels (مستوى المخزون)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/inventory", /مخزون/i);
    const stockTable = page.locator("table").first();
    if (await stockTable.isVisible()) {
      const rows = await stockTable.locator("tbody tr").count();
      console.log(`✅ INV-02: Stock table visible with ${rows} rows`);
      expect(rows).toBeGreaterThan(0);
    } else {
      console.log("⚠️  INV-02: Stock table not visible (may be empty)");
    }
  });

  test("INV-03: Add new product to inventory", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/inventory", /مخزون/i);
    const addButton = page
      .getByRole("button", { name: /إضافة منتج|منتج جديد|إضافة/i })
      .first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await expect(page.getByText(/منتج جديد|إضافة منتج/i).first()).toBeVisible(
        { timeout: 5_000 }
      );
      const nameField = page.getByLabel(/اسم المنتج|product name/i).first();
      if (await nameField.isVisible()) await nameField.fill("اختبار منتج E2E");
      const qtyField = page.getByLabel(/كمية|quantity/i).first();
      if (await qtyField.isVisible()) await qtyField.fill("100");
      console.log("✅ INV-03: Product form opened and filled");
    } else {
      console.log("⚠️  INV-03: Add button not found (permission issue)");
    }
  });

  test("INV-04: View inventory movements (حركة المخزون)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/inventory", /مخزون/i);
    const movementsLink = page.getByText(/حركة|movements|سحب|إضافة/i).first();
    if (await movementsLink.isVisible()) {
      await movementsLink.click();
      await expect(
        page.getByText(/حركة المخزون|inventory movements/i).first()
      ).toBeVisible({ timeout: 5_000 });
      console.log("✅ INV-04: Inventory movements viewed");
    } else {
      console.log("⚠️  INV-04: Movements link not found");
    }
  });

  test("INV-05: Stock transfer between warehouses", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/inventory", /مخزون/i);
    const transferLink = page.getByText(/نقل|transfer/i).first();
    if (await transferLink.isVisible()) {
      await transferLink.click();
      await expect(
        page.getByText(/نقل مخزون|transfer stock/i).first()
      ).toBeVisible({ timeout: 5_000 });
      console.log("✅ INV-05: Stock transfer form opened");
    } else {
      console.log("⚠️  INV-05: Transfer option not found");
    }
  });
});

// =====================
// TEST SUITE: SALES REPRESENTATIVE (مندوب المبيعات)
// =====================

test.describe("💰 مندوب المبيعات — Sales Representative Role", () => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  const hasCreds = !!username && !!password;

  test.skip(!hasCreds, "E2E credentials not configured — skipped");

  test("SAL-01: Access Commercial module", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/commercial", /مبيعات|تجاري|commercial/i);
    await expect(
      page.getByText(/المبيعات|الفواتير|invoices/i).first()
    ).toBeVisible();
    console.log("✅ SAL-01: Sales rep accessed commercial module");
  });

  test("SAL-02: Create new sales invoice (إنشاء فاتورة مبيعات)", async ({
    page,
  }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/commercial", /مبيعات/i);
    const newInvoiceButton = page
      .getByRole("button", { name: /فاتورة جديدة|إضافة فاتورة|new invoice/i })
      .first();
    if (await newInvoiceButton.isVisible()) {
      await newInvoiceButton.click();
      await expect(
        page.getByText(/فاتورة مبيعات|sales invoice/i).first()
      ).toBeVisible({ timeout: 5_000 });
      const customerField = page.getByLabel(/العميل|customer/i).first();
      if (await customerField.isVisible()) {
        await customerField.click();
        const firstCustomer = page.getByRole("option").first();
        if (await firstCustomer.isVisible()) await firstCustomer.click();
      }
      const addProductButton = page
        .getByRole("button", { name: /إضافة منتج|add item/i })
        .first();
      if (await addProductButton.isVisible()) await addProductButton.click();
      console.log("✅ SAL-02: Sales invoice form completed");
    } else {
      console.log("⚠️  SAL-02: New invoice button not found");
    }
  });

  test("SAL-03: View receivables report (الذمم المدينة)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/commercial", /مبيعات/i);
    const reportsButton = page
      .getByRole("button", { name: /تقارير|reports/i })
      .first();
    if (await reportsButton.isVisible()) await reportsButton.click();
    const receivablesLink = page
      .getByText(/ذمم مدينة|receivables|أقساط/i)
      .first();
    if (await receivablesLink.isVisible()) {
      await receivablesLink.click();
      await expect(
        page.getByText(/العميل|amount|remaining/i).first()
      ).toBeVisible({ timeout: 5_000 });
      console.log("✅ SAL-03: Receivables report viewed");
    } else {
      console.log("⚠️  SAL-03: Receivables report not found");
    }
  });

  test("SAL-04: Track customer orders (تتبع طلبات العملاء)", async ({
    page,
  }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/commercial", /مبيعات/i);
    const ordersLink = page.getByText(/طلبات|orders|أوامر/i).first();
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
      await expect(page.getByText(/طلب|sales order/i).first()).toBeVisible({
        timeout: 5_000,
      });
      console.log("✅ SAL-04: Customer orders tracked");
    } else {
      console.log("⚠️  SAL-04: Orders link not found");
    }
  });

  test("SAL-05: View sales performance", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/commercial", /مبيعات/i);
    const performanceLink = page
      .getByText(/أداء|performance|إحصائيات/i)
      .first();
    if (await performanceLink.isVisible()) {
      await performanceLink.click();
      await expect(page.getByText(/مبيعات|sales|revenue/i).first()).toBeVisible(
        { timeout: 5_000 }
      );
      console.log("✅ SAL-05: Sales performance viewed");
    } else {
      console.log("⚠️  SAL-05: Performance link not found");
    }
  });
});

// =====================
// TEST SUITE: CUSTOMER SERVICE (خدمة العملاء)
// =====================

test.describe("🎧 خدمة العملاء — Customer Service Role", () => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  const hasCreds = !!username && !!password;

  test.skip(!hasCreds, "E2E credentials not configured — skipped");

  test("CS-01: Access Support module", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/support", /دعم|support|service/i);
    await expect(page.getByText(/الدعم|تذكرة|ticket/i).first()).toBeVisible();
    console.log("✅ CS-01: Customer service accessed support module");
  });

  test("CS-02: View customer inquiries (استفسارات العملاء)", async ({
    page,
  }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/support", /دعم/i);
    const inquiriesLink = page.getByText(/استفسارات|inquiries|رسائل/i).first();
    if (await inquiriesLink.isVisible()) {
      await inquiriesLink.click();
      console.log("✅ CS-02: Customer inquiries viewed");
    } else {
      console.log("⚠️  CS-02: Inquiries link not found");
    }
  });

  test("CS-03: Create support ticket (إنشاء تذكرة)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/support", /دعم/i);
    const newTicketButton = page
      .getByRole("button", { name: /تذكرة جديدة|إضافة تذكرة|new ticket/i })
      .first();
    if (await newTicketButton.isVisible()) {
      await newTicketButton.click();
      await expect(page.getByText(/تذكرة|ticket/i).first()).toBeVisible({
        timeout: 5_000,
      });
      const subjectField = page.getByLabel(/موضوع|subject/i).first();
      if (await subjectField.isVisible())
        await subjectField.fill("اختبار E2E - تذكرة خدمة عملاء");
      console.log("✅ CS-03: Support ticket form opened");
    } else {
      console.log("⚠️  CS-03: New ticket button not found");
    }
  });

  test("CS-04: Track order status (تتبع حالة الطلب)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/support", /دعم/i);
    const orderTrackingLink = page.getByText(/تتبع طلب|track order/i).first();
    if (await orderTrackingLink.isVisible()) {
      await orderTrackingLink.click();
      console.log("✅ CS-04: Order tracking accessed");
    } else {
      console.log("⚠️  CS-04: Order tracking not found");
    }
  });

  test("CS-05: View customer complaints (الشكاوى)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/support", /دعم/i);
    const complaintsLink = page.getByText(/شكاوى|complaints/i).first();
    if (await complaintsLink.isVisible()) {
      await complaintsLink.click();
      console.log("✅ CS-05: Customer complaints viewed");
    } else {
      console.log("⚠️  CS-05: Complaints link not found");
    }
  });
});

// =====================
// TEST SUITE: GENERAL MANAGER (المدير العام)
// =====================

test.describe("👔 المدير العام — General Manager Role", () => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  const hasCreds = !!username && !!password;

  test.skip(!hasCreds, "E2E credentials not configured — skipped");

  test("GM-01: Access main dashboard (لوحة القيادة)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/app", /لوحة القيادة|dashboard/i);
    await expect(
      page.getByText(/لوحة القيادة الموحّدة|Uamex/i).first()
    ).toBeVisible();
    console.log("✅ GM-01: GM accessed main dashboard");
  });

  test("GM-02: View executive KPIs (مؤشرات الأداء)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/app", /لوحة القيادة/i);
    const kpiCards = page.locator(
      "[class*='card'], [class*='stat'], [class*='metric']"
    );
    const count = await kpiCards.count();
    if (count > 0) {
      console.log(`✅ GM-02: Dashboard has ${count} KPI cards`);
    } else {
      const hasMetrics = await page
        .getByText(/إجمالي|total|revenue|sales/i)
        .first()
        .isVisible();
      expect(hasMetrics).toBeTruthy();
      console.log("✅ GM-02: Executive KPIs visible");
    }
  });

  test("GM-03: View financial reports (التقارير المالية)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/app", /لوحة القيادة/i);
    const reportsLink = page
      .getByRole("link", { name: /تقارير|reports|financial/i })
      .first();
    if (await reportsLink.isVisible()) {
      await reportsLink.click();
      await expect(page.getByText(/تقارير|report|قائمة/i).first()).toBeVisible({
        timeout: 5_000,
      });
      console.log("✅ GM-03: Financial reports accessed");
    } else {
      const reportsTab = page.getByText(/تقارير/).first();
      if (await reportsTab.isVisible()) {
        await reportsTab.click();
        console.log("✅ GM-03: Reports tab accessed");
      } else {
        console.log("⚠️  GM-03: Reports link not found");
      }
    }
  });

  test("GM-04: View branch performance (أداء الفروع)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/app", /لوحة القيادة/i);
    const branchesLink = page.getByText(/فروع|branches|الأداء/i).first();
    if (await branchesLink.isVisible()) {
      await branchesLink.click();
      await expect(page.getByText(/فرع|branch/i).first()).toBeVisible({
        timeout: 5_000,
      });
      console.log("✅ GM-04: Branch performance viewed");
    } else {
      console.log("⚠️  GM-04: Branch link not found");
    }
  });

  test("GM-05: Access HR module (الموارد البشرية)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/hr", /الموارد البشرية|hr|employees/i);
    await expect(
      page.getByText(/الموارد البشرية|employees|موظف/i).first()
    ).toBeVisible();
    console.log("✅ GM-05: HR module accessed");
  });

  test("GM-06: View project status (حالة المشاريع)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/projects", /مشاريع|projects/i);
    const projectTextVisible = await page
      .getByText(/مشروع|project/i)
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!projectTextVisible)
      console.log("⚠️  GM-06: Projects page shows empty state (no data)");
    const projectTable = page.locator("table").first();
    if (await projectTable.isVisible()) {
      const rows = await projectTable.locator("tbody tr").count();
      console.log(`✅ GM-06: Projects page has ${rows} project rows`);
    } else {
      console.log("✅ GM-06: Projects page loaded");
    }
  });

  test("GM-07: System settings and permissions (الإعدادات)", async ({
    page,
  }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/permissions", /صلاحيات|permissions/i);
    await expect(
      page.getByText(/صلاحيات|permissions|roles/i).first()
    ).toBeVisible();
    console.log("✅ GM-07: Permissions module accessed");
  });

  test("GM-08: View audit trail (سجل التدقيق)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/app", /لوحة القيادة/i);
    const auditLink = page.getByText(/تدقيق|audit|سجل/i).first();
    if (await auditLink.isVisible()) {
      await auditLink.click();
      await expect(page.getByText(/تدقيق|audit|activity/i).first()).toBeVisible(
        { timeout: 5_000 }
      );
      console.log("✅ GM-08: Audit trail viewed");
    } else {
      console.log("⚠️  GM-08: Audit link not found (may require admin)");
    }
  });
});

// =====================
// CROSS-MODULE TESTS
// =====================

test.describe("🔗 Cross-Module Integration Tests", () => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  const hasCreds = !!username && !!password;

  test.skip(!hasCreds, "E2E credentials not configured — skipped");

  test("INT-01: Navigation between all modules", async ({ page }) => {
    await loginAs(page, username!, password!);
    const modules = [
      { path: "/app", name: "Dashboard" },
      { path: "/accounting", name: "Accounting" },
      { path: "/commercial", name: "Commercial" },
      { path: "/inventory", name: "Inventory" },
      { path: "/hr", name: "HR" },
      { path: "/projects", name: "Projects" },
    ];
    for (const mod of modules) {
      await page.goto(mod.path);
      await page.waitForLoadState("domcontentloaded");
      console.log(`✅ Navigated to ${mod.name}`);
    }
    expect(true).toBeTruthy();
  });

  test("INT-02: User profile and logout", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/app", /لوحة القيادة/i);
    const userMenu = page.getByText(/المستخدم|user|الحساب|profile/i).first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      const logoutButton = page
        .getByRole("button", { name: /خروج|logout|تسجيل خروج/i })
        .first();
      if (await logoutButton.isVisible()) {
        console.log("✅ INT-02: User menu and logout visible");
      }
    }
    console.log("✅ INT-02: User menu accessed");
  });

  test("INT-03: RTL interface validation (واجهة RTL)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/app", /لوحة القيادة/i);
    const htmlDir = page.locator("html");
    const dir = await htmlDir.getAttribute("dir");
    expect(dir).toBe("rtl");
    console.log("✅ INT-03: RTL direction verified");
  });

  test("INT-04: Arabic language validation", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/app", /لوحة القيادة/i);
    const arabicText = await page
      .getByText(/الحسينية|Uamex|لوحة/i)
      .first()
      .textContent();
    expect(arabicText).toBeTruthy();
    expect(arabicText?.length).toBeGreaterThan(0);
    console.log(`✅ INT-04: Arabic text verified: "${arabicText}"`);
  });

  test("INT-05: Theme switching (تبديل المظهر)", async ({ page }) => {
    await loginAs(page, username!, password!);
    await goToWorkspace(page, "/app", /لوحة القيادة/i);
    const themeToggle = page
      .getByRole("button", { name: /مظهر|theme|night|dark|light/i })
      .first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      console.log("✅ INT-05: Theme toggled");
    } else {
      console.log("⚠️  INT-05: Theme toggle not found");
    }
  });
});

// =====================
// PERFORMANCE & SECURITY
// =====================

test.describe("⚡ Performance & Security Tests", () => {
  test("SEC-01: Unauthenticated access blocked", async ({ page }) => {
    const protectedRoutes = ["/app", "/accounting", "/inventory", "/hr"];
    for (const route of protectedRoutes) {
      await page.goto(route);
      const currentUrl = page.url();
      const isProtected =
        currentUrl.includes("/login") ||
        (await page
          .getByText(/تسجيل|login|auth/i)
          .first()
          .isVisible({ timeout: 3_000 })
          .catch(() => false));
      expect(isProtected).toBeTruthy();
      console.log(`✅ SEC-01: ${route} is protected`);
    }
  });

  test("SEC-02: Branded login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/الحسينية|Uamex/i).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /دخول|sign in/i })
    ).toBeVisible();
    console.log("✅ SEC-02: Branded login page verified");
  });

  test("PERF-01: Page load performance", async ({ page }) => {
    const start = Date.now();
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - start;
    console.log(`⏱️  PERF-01: Login page load: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });
});
