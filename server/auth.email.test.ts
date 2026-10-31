import { describe, it, expect } from "vitest";
import { getEmailDeliveryConfig } from "./services/authService";

describe("auth email delivery configuration", () => {
  it("enables SMTP delivery when the production email settings are configured", () => {
    const config = getEmailDeliveryConfig({
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpUser: "noreply@example.com",
      smtpPass: "secret-pass",
      emailFrom: "no-reply@alhusainia.com",
    } as any);

    expect(config.enabled).toBe(true);
    expect(config.mode).toBe("smtp");
    expect(config.from).toBe("no-reply@alhusainia.com");
  });

  it("falls back to console delivery in non-production or unconfigured environments", () => {
    const config = getEmailDeliveryConfig({} as any);

    expect(config.enabled).toBe(false);
    expect(config.mode).toBe("console");
    expect(config.from).toMatch(/alhusainia|local/i);
  });
});
