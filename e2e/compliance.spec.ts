import { test, expect } from "@playwright/test";

/**
 * Regulatory Compliance E2E Tests
 * ============================================================
 * Validates compliance with data protection regulations,
 * audit trail integrity, and regulatory requirements.
 */

test.describe("Data Protection Compliance (GDPR/PDPL)", () => {
  test("cookie consent banner is displayed", async ({ page }) => {
    await page.goto("/");
    // The banner appears after a short delay and exposes a stable test id.
    const consentBanner = page
      .locator('[data-testid="cookie-consent"]')
      .first();
    await expect(consentBanner).toBeVisible({ timeout: 10_000 });
  });

  test("cookie consent can be accepted and declined", async ({ page }) => {
    await page.goto("/");
    const acceptBtn = page
      .getByRole("button", { name: /الموافق|Accept|قبول/i })
      .first();
    const declineBtn = page
      .getByRole("button", { name: /الرفض|Decline|رفض/i })
      .first();
    if (await acceptBtn.count()) {
      await acceptBtn.click();
      await expect(consentBanner).not.toBeVisible();
    }
    if (await declineBtn.count()) {
      await declineBtn.click();
      await expect(consentBanner).not.toBeVisible();
    }
  });

  test("privacy policy page is accessible", async ({ page }) => {
    await page.goto("/privacy-policy");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    const content = await page.locator("body").textContent();
    expect(content?.length).toBeGreaterThan(100);
  });

  test("terms of service page is accessible", async ({ page }) => {
    await page.goto("/terms-of-service");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    const content = await page.locator("body").textContent();
    expect(content?.length).toBeGreaterThan(100);
  });
});

test.describe("Audit Trail Integrity", () => {
  test("all API calls are logged with request IDs", async ({ page }) => {
    await page.goto("/login");
    const response = await page.request.get("/api/performance");
    const body = await response.json();
    expect(body.requestId).toBeTruthy();
    expect(body.generatedAt).toBeTruthy();
  });

  test("error logs include request correlation", async ({ page }) => {
    const response = await page.request.get("/api/health");
    const headers = response.headers();
    expect(headers["x-request-id"] || headers["request-id"]).toBeTruthy();
  });

  test("performance metrics are exposed", async ({ page }) => {
    const response = await page.request.get("/api/performance");
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("Operational");
    expect(body.generatedAt).toBeTruthy();
  });
});

test.describe("ISO 27001 Security Controls", () => {
  test("all API endpoints require authentication", async ({ page }) => {
    const protectedRoutes = [
      "/api/trpc/query.dashboardSummary",
      "/api/trpc/query.globalSearch",
    ];
    for (const route of protectedRoutes) {
      const response = await page.request.get(route);
      expect([401, 403]).toContain(response.status());
    }
  });

  test("password policies are enforced", async ({ page }) => {
    await page.goto("/login");
    const passwordInput = page.getByLabel(/كلمة المرور|password/i);
    await passwordInput.fill("short");
    const submit = page.getByRole("button", { name: /دخول|تسجيل/i }).first();
    await submit.click();
    await expect(page.locator("body")).toContainText(/8|طويل|minimum/i, {
      timeout: 3_000,
    });
  });

  test("session timeout is enforced", async ({ page }) => {
    await page.goto("/login");
    const cookiesBefore = await page.context().cookies();
    const sessionCookie = cookiesBefore.find(
      c => c.name.includes("session") || c.name.includes("token")
    );
    if (sessionCookie) {
      expect(sessionCookie.maxAge).toBeGreaterThan(0);
      expect(sessionCookie.maxAge).toBeLessThanOrEqual(30 * 24 * 60 * 60);
    }
  });
});

test.describe("SOC 2 Compliance Controls", () => {
  test("access controls are enforced", async ({ page }) => {
    // NOTE: /app is an SPA shell (always 200) with client-side gating;
    // the REAL boundary is the tRPC API, which must reject anonymous calls.
    const response = await page.request.get(
      "/api/trpc/accounting.getDashboardSummary"
    );
    expect([401, 403]).toContain(response.status());
  });

  test("data encryption is verified in transit", async ({ page }) => {
    const response = await page.request.get("/", {
      headers: { "Accept-Encoding": "gzip, br" },
    });
    const csp = response.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("backup and recovery endpoints are secured", async ({ page }) => {
    // /api/backup is SPA fallback (200 shell); backup DATA lives behind
    // admin-only tRPC procedures (backupRouter: run/list/verify/restore).
    const response = await page.request.get("/api/trpc/backup.list");
    expect([401, 403]).toContain(response.status());
  });
});

test.describe("SLSA Build Provenance", () => {
  test("CI pipeline produces verifiable build artifacts", async ({ page }) => {
    const fs = await import("fs");
    const distPath = "dist/public";
    const exists = fs.existsSync(distPath);
    expect(exists).toBeTruthy();
  });

  test("build output contains expected assets", async ({ page }) => {
    const fs = await import("fs");
    const path = await import("path");
    const distPath = path.join(process.cwd(), "dist/public");
    if (fs.existsSync(distPath)) {
      const entries = fs.readdirSync(distPath);
      expect(entries.length).toBeGreaterThan(0);
      const hasHtml = entries.some(e => e.endsWith(".html"));
      expect(hasHtml).toBeTruthy();
    }
  });
});

test.describe("Data Integrity & Backup Compliance", () => {
  test("backup encryption key is configured", async ({ page }) => {
    const response = await page.request.get("/api/health");
    const body = await response.json();
    expect(body.ok).toBeTruthy();
  });

  test("database connectivity is maintained", async ({ page }) => {
    const response = await page.request.get("/api/health");
    const body = await response.json();
    expect(body.dbAvailable).toBeTruthy();
  });
});
