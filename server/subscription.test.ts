import { describe, it, expect } from "vitest";
import { resolveSubscription } from "./_core/subscription";
import {
  resolveAccess,
  DEFAULT_POLICY,
  NEVER_RESTRICTED,
} from "./_core/billingAccess";

const DAY = 86_400_000;
const now = new Date("2026-08-22T00:00:00Z");

describe("resolveSubscription (flexible lifecycle state machine)", () => {
  it("keeps an unexpired trial in trial with days left", () => {
    const d = resolveSubscription(
      "trial",
      new Date(now.getTime() + 7 * DAY),
      now
    );
    expect(d.status).toBe("trial");
    expect(d.transitionedToGrace).toBe(false);
    expect(d.trialDaysLeft).toBe(7);
  });

  it("auto-transitions an expired trial to grace — never blocks the business", () => {
    const d = resolveSubscription(
      "trial",
      new Date(now.getTime() - 1 * DAY),
      now
    );
    expect(d.status).toBe("grace");
    expect(d.transitionedToGrace).toBe(true);
    expect(d.trialDaysLeft).toBe(0);
  });

  it("passes active and grace through untouched", () => {
    expect(resolveSubscription("active", null, now).status).toBe("active");
    expect(resolveSubscription("grace", null, now).status).toBe("grace");
  });

  it("keeps suspended as suspended (caller blocks explicitly)", () => {
    const d = resolveSubscription("suspended", null, now);
    expect(d.status).toBe("suspended");
  });

  it("treats missing status as trial", () => {
    const d = resolveSubscription(
      null,
      new Date(now.getTime() + 14 * DAY),
      now
    );
    expect(d.status).toBe("trial");
    expect(d.trialDaysLeft).toBe(14);
  });
});

describe("resolveAccess (never-blocks-the-business policy)", () => {
  const periodEnd = (daysFromNow: number) =>
    new Date(now.getTime() + daysFromNow * DAY);

  it("full access while the paid period is running", () => {
    const d = resolveAccess(
      { status: "active", periodEnd: periodEnd(20) },
      now
    );
    expect(d.level).toBe("full");
    expect(d.restrictedFeatures).toHaveLength(0);
    expect(d.daysLeft).toBe(20);
  });

  it("full access during grace with graceFullAccess — business never stops", () => {
    const d = resolveAccess(
      { status: "active", periodEnd: periodEnd(-5), policy: DEFAULT_POLICY },
      now
    );
    expect(d.level).toBe("full");
    expect(d.banner?.kind).toBe("warning");
    expect(d.daysLeft).toBe(25); // graceDays(30) - overdueDays(5)
  });

  it("restricts only non-critical features after grace", () => {
    const d = resolveAccess(
      {
        status: "active",
        periodEnd: periodEnd(-45),
        policy: { ...DEFAULT_POLICY, graceFullAccess: false },
      },
      now
    );
    expect(d.level).toBe("restricted");
    expect(d.restrictedFeatures).toContain("exports");
    expect(d.restrictedFeatures).toContain("zatca");
  });

  it("degrades to readonly only after maxOverdueDays", () => {
    const d = resolveAccess(
      { status: "active", periodEnd: periodEnd(-150) },
      now
    );
    expect(d.level).toBe("readonly");
  });

  it("never blocks except explicit suspension", () => {
    const d = resolveAccess({ status: "suspended", periodEnd: null }, now);
    expect(d.level).toBe("blocked");
    expect(d.banner?.titleAr).toContain("موقوف بطلبكم");
  });

  it("treats missing period end as full access (fail-open, business-first)", () => {
    const d = resolveAccess({ status: "trial", periodEnd: null }, now);
    expect(d.level).toBe("full");
  });

  it("daily operations are in the never-restricted set", () => {
    expect(NEVER_RESTRICTED.has("daily_sales")).toBe(true);
    expect(NEVER_RESTRICTED.has("journal_entries")).toBe(true);
  });
});
