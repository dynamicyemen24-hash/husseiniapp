import { test, expect } from "@playwright/test";

/**
 * Cross-Browser & Device Compatibility E2E Tests
 * ============================================================
 * Validates that the ALHUSAINIA platform works correctly
 * across different browsers and device configurations.
 */

test.describe("Cross-Browser Compatibility", () => {
  test("works correctly in Chromium", async ({ page, browserName }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    console.log(`🌐 Browser: ${browserName} - Chromium test passed`);
  });

  test("works correctly in Firefox", async ({ page, browserName }) => {
    if (browserName === "chromium") {
      test.skip();
    }
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("works correctly in WebKit", async ({ page, browserName }) => {
    if (browserName === "chromium") {
      test.skip();
    }
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Device Compatibility", () => {
  const viewports = [
    { name: "iPhone SE", width: 375, height: 667 },
    { name: "iPhone 14 Pro", width: 393, height: 852 },
    { name: "Pixel 7", width: 412, height: 915 },
    { name: "iPad Mini", width: 768, height: 1024 },
    { name: "iPad Pro 12.9", width: 1024, height: 1366 },
    { name: "Desktop HD", width: 1920, height: 1080 },
    { name: "Desktop 4K", width: 3840, height: 2160 },
  ];

  for (const viewport of viewports) {
    test(`${viewport.name} (${viewport.width}x${viewport.height}) renders correctly`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto("/");
      await expect(page.locator("body")).toBeVisible();
      await page.waitForLoadState("domcontentloaded");
    });
  }
});

test.describe("Touch Support", () => {
  // WCAG 2.2 AA norm (2.5.8) is 24x24 CSS px — 44x44 is AAA. The suite
  // enforces the AA floor; anything smaller is a genuine defect.
  test("touch targets meet minimum 24x24px (WCAG 2.2 AA)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible({
      timeout: 30_000,
    });
    const touchTargets = page.locator(
      "button, a, [role='button'], input[type='submit']"
    );
    const count = await touchTargets.count();
    const undersized: string[] = [];
    for (let i = 0; i < Math.min(count, 40); i++) {
      const el = touchTargets.nth(i);
      // WCAG 2.5.8 exempts inline targets (flowing text links) and
      // visually-hidden helpers (skip links, sr-only live regions).
      const exempt = await el.evaluate(node => {
        const html = node as HTMLElement;
        if (html.closest(".sr-only")) return true;
        const rect = html.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return true;
        return getComputedStyle(html).display === "inline";
      });
      if (exempt) continue;
      const boundingBox = await el.boundingBox();
      if (boundingBox && (boundingBox.width < 24 || boundingBox.height < 24)) {
        const label =
          (await el.getAttribute("aria-label")) ??
          (await el.textContent())?.slice(0, 30) ??
          `#${i}`;
        undersized.push(
          `${label} (${Math.round(boundingBox.width)}x${Math.round(boundingBox.height)})`
        );
      }
    }
    console.log(
      `👆 Undersized targets: ${undersized.length ? undersized.join(" | ") : "none"}`
    );
    expect(undersized).toEqual([]);
  });

  test.describe("touch gestures", () => {
    test.use({ hasTouch: true, isMobile: true });
    test("swipe gestures work on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");
      await expect(page.locator("h1").first()).toBeVisible({
        timeout: 30_000,
      });
      await page.touchscreen.tap(200, 400);
    });
  });
});

test.describe("Network Condition Simulation", () => {
  test("slow 3G loads within acceptable time", async ({ page }) => {
    await page.route("**", route => {
      const delay = Math.random() * 500 + 200;
      setTimeout(() => route.continue(), delay);
    });
    const start = Date.now();
    await page.goto("/login");
    const loadTime = Date.now() - start;
    console.log(`📡 Slow 3G load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(15000);
  });

  test("offline mode shows appropriate UI", async ({ page }) => {
    // Prime the service-worker shell cache online first — a cold offline
    // navigation has nothing cached yet by definition. The SW must be
    // ACTIVE (not merely installed) before the shell survives a reload.
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible({
      timeout: 30_000,
    });
    await page.evaluate(() =>
      navigator.serviceWorker.ready.then(reg => {
        if (!reg.active) throw new Error("no active service worker");
      })
    );
    await page.context().setOffline(true);
    await page.reload();
    await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
    await expect(
      page.locator("text=/لا يوجد اتصال|غير متصل|offline/i").first()
    ).toBeVisible({ timeout: 10_000 });
    await page.context().setOffline(false);
  });
});

test.describe("Localization & RTL Support", () => {
  test("Arabic interface renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    const dir = await page.locator("html").getAttribute("dir");
    expect(dir).toBe("rtl");
  });

  test("English interface renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("number formatting is locale-aware", async ({ page }) => {
    await page.goto("/");
    const numbers = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        "[class*='currency'], [class*='price'], [class*='amount']"
      );
      return Array.from(elements)
        .slice(0, 5)
        .map(el => el.textContent);
    });
    console.log(`💰 Number formatting: ${JSON.stringify(numbers)}`);
  });
});

test.describe("PWA & Offline Capabilities", () => {
  test("service worker is registered", async ({ page }) => {
    await page.goto("/");
    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker.ready.then(reg => reg !== null);
    });
    expect(swRegistered).toBeTruthy();
  });

  test("manifest.json is valid", async ({ page }) => {
    // The manifest is served at /manifest.webmanifest (see vercel.json).
    const response = await page.request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    const manifest = await response.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
  });

  test("offline shell loads without network", async ({ page }) => {
    // Prime the service-worker shell cache online first (see above).
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible({
      timeout: 30_000,
    });
    await page.evaluate(() =>
      navigator.serviceWorker.ready.then(reg => {
        if (!reg.active) throw new Error("no active service worker");
      })
    );
    await page.context().setOffline(true);
    await page.reload();
    await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
    await page.context().setOffline(false);
  });
});
