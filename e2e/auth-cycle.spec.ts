import { test, expect } from "@playwright/test";

/**
 * Auth Recovery Cycle (Auth Cycle) — password reset & email verification pages.
 * Value-preserving: bogus one-time tokens are used exclusively; no business
 * data is created or mutated.
 */

test.describe("Auth recovery pages", () => {
  test("/reset-password without token renders a safe dead-end with CTA", async ({
    page,
  }) => {
    await page.goto("/reset-password");

    await expect(
      page.getByRole("heading", { name: "إعادة تعيين كلمة المرور" })
    ).toBeVisible();
    await expect(page.getByText("رابط إعادة التعيين ناقص")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /الانتقال إلى تسجيل الدخول/ })
    ).toBeVisible();
  });

  test("/reset-password with a token shows the new-password form", async ({
    page,
  }) => {
    await page.goto(`/reset-password?token=${"f".repeat(40)}`);

    await expect(
      page.getByRole("heading", { name: "إعادة تعيين كلمة المرور" })
    ).toBeVisible();
    await expect(page.getByLabel(/كلمة المرور الجديدة/)).toBeVisible();
    await expect(page.getByLabel(/تأكيد كلمة المرور/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /حفظ كلمة المرور الجديدة/ })
    ).toBeVisible();
  });

  test("/verify-email without token renders resend fallback", async ({
    page,
  }) => {
    await page.goto("/verify-email");

    await expect(
      page.getByRole("heading", { name: "التحقق من البريد الإلكتروني" })
    ).toBeVisible();
    await expect(page.getByText("رابط التحقق ناقص")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /إعادة إرسال رابط التحقق/ })
    ).toBeVisible();
  });

  test("/verify-email with a bogus token declines safely and offers resend", async ({
    page,
  }) => {
    await page.goto(`/verify-email?token=${"f".repeat(40)}`);

    // The server rejects the one-time token (BAD_REQUEST) with no mutation,
    // and the page recovers with the resend form instead of a dead end.
    // Generous timeout: the first Neon round-trip after a cold start can take
    // ~10s before the express handler responds.
    await expect(
      page.getByText(/انتهت صلاحية الرابط|رابط التحقق غير صحيح/)
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole("button", { name: /إعادة إرسال رابط التحقق/ })
    ).toBeVisible();
  });
});
