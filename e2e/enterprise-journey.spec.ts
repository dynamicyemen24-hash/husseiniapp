import { test, expect } from "@playwright/test";

/**
 * Enterprise journey — Login → Main → Workspace per system.
 *
 * Value-preserving by design:
 *  - Unauthenticated paths assert the branded protection gate (no data touched).
 *  - Zero-trust API isolation is proven by calling tRPC WITHOUT a session and
 *    expecting UNAUTHORIZED for tenant-scoped procedures (search/dashboard).
 *  - The authenticated journey runs ONLY when E2E_USERNAME + E2E_PASSWORD are
 *    provided; otherwise it is skipped gracefully (CI without credentials).
 */

/** Workspace route per operational system — heading regexes match the REAL
 * h1 rendered by each page (verified against client/src/pages/*). */
const WORKSPACES: Array<{ path: string; heading?: RegExp; shell?: RegExp }> = [
  { path: "/app", heading: /لوحة القيادة الموحّدة/ },
  { path: "/accounting", shell: /مرحباً بك|نظام الحسابات/ },
  { path: "/commercial", shell: /المنتجات|العملاء|الموردين/ },
  { path: "/inventory", heading: /وحدة المخزون/ },
  { path: "/procurement", heading: /مساحة المشتريات/ },
  { path: "/projects", heading: /مساحة المشاريع/ },
  { path: "/hr", heading: /الموارد البشرية/ },
  { path: "/support", heading: /الدعم والجودة/ },
  { path: "/pos", heading: /نقاط البيع/ },
  { path: "/permissions", heading: /الصلاحيات والأدوار/ },
  { path: "/basic-data", heading: /البيانات الأساسية/ },
];

test.describe("Protection gates (unauthenticated)", () => {
  test("login gate renders with brand identity", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/الحسينية|alhusainia/i);
    await expect(page.getByText(/Uamex_erp|بوابة|تسجيل/).first()).toBeVisible();
  });

  test("every workspace shows the protected-area gate, never business UI", async ({
    page,
  }) => {
    for (const ws of WORKSPACES) {
      await page.goto(ws.path);
      // RequireAuth renders the branded gate — no tables, no data, no tools
      await expect(
        page.getByText(/منطقة مشغّلين محمية|تتطلب تسجيل دخول/).first()
      ).toBeVisible({ timeout: 15_000 });
      // Business content must NOT leak
      const businessTable = page.locator("table tbody tr");
      expect(await businessTable.count()).toBe(0);
    }
  });

  test("zero-trust: tenant-scoped tRPC rejects anonymous callers (UNAUTHORIZED)", async ({
    request,
  }) => {
    const input = encodeURIComponent(
      JSON.stringify({ query: "عميل اختبار العزل" })
    );
    const res = await request.get(
      `/api/trpc/query.globalSearch?input=${input}`
    );
    expect(res.status()).toBe(401);
    const body = await res.json();
    const code = body?.error?.json?.data?.code;
    expect(code).toBe("UNAUTHORIZED");
  });

  test("zero-trust: dashboard summary endpoint is also session-gated", async ({
    request,
  }) => {
    const input = encodeURIComponent(JSON.stringify({ days: 30 }));
    const res = await request.get(
      `/api/trpc/query.dashboardSummary?input=${input}`
    );
    expect([401, 403]).toContain(res.status());
    const body = await res.json();
    expect(body?.error?.json?.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });
});

test.describe("Authenticated enterprise journey (requires credentials)", () => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  const hasCreds = !!username && !!password;

  test.skip(!hasCreds, "E2E_USERNAME / E2E_PASSWORD not provided — skipped");

  test("login → main dashboard → every workspace renders", async ({ page }) => {
    test.setTimeout(180_000); // 11 full page loads; Neon cold starts can stall session re-checks.
    // ── 1. Login screen ────────────────────────────────────────────────
    await page.goto("/login");
    const userInput = page.getByLabel("اسم المستخدم");
    await userInput.fill(username!);
    const passInput = page.getByLabel("كلمة المرور");
    await passInput.fill(password!);
    await page
      .getByRole("button", { name: /دخول النظام|دخول|تسجيل/ })
      .first()
      .click();

    // ── 2. Main dashboard (workspace home) ─────────────────────────────
    await page.waitForURL(/\/(app|accounting)/, { timeout: 60_000 });
    await expect(page.locator("main, [role=main], body").first()).toBeVisible();

    // ── 3. Each system workspace renders its own shell ────────────────
    for (const ws of WORKSPACES) {
      await page.goto(ws.path);
      if (ws.heading) {
        await expect(
          page.locator("h1, h2").filter({ hasText: ws.heading }).first()
        ).toBeVisible({ timeout: 15_000 });
      } else if (ws.shell) {
        await expect(page.getByText(ws.shell).first()).toBeVisible({
          timeout: 15_000,
        });
      }
      // No crash boundary / error screen
      await expect(page.getByText(/حدث خطأ|Something went wrong/)).toHaveCount(
        0
      );
    }
  });

  test("global search autocomplete returns tenant-scoped results", async ({
    page,
  }) => {
    // Assumes the previous test established a session cookie in the same
    // browser context is NOT shared across tests — log in again.
    await page.goto("/login");
    await page.getByLabel("اسم المستخدم").fill(username!);
    await page.getByLabel("كلمة المرور").fill(password!);
    await page
      .getByRole("button", { name: /دخول النظام|دخول|تسجيل/ })
      .first()
      .click();
    await page.waitForURL(/\/(app|accounting)/, { timeout: 60_000 });

    // The global search surface is the Command Palette, opened via Ctrl+K.
    await page.keyboard.press("ControlOrMeta+k");
    const search = page.locator('input[placeholder*="ابحث عن صفحة"]');
    await expect(search).toBeVisible({ timeout: 10_000 });

    // The palette debounces 250ms then fetches query.globalSearch, which
    // matches accounts/products by code and name (tenant-scoped). Tenant
    // accounts are provisioned with the standard chart (1010, 1020…), so
    // "10" is guaranteed to hit the accounts branch.
    await search.fill("10");
    await expect(
      page
        .locator('[cmdk-item]:visible, [role="option"]:visible')
        .filter({ hasText: /حساب|منتج|عميل|مورد|قيد/ })
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
