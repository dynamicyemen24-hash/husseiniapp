import { describe, expect, it } from "vitest";
import {
  clampDayOfMonth,
  completeSlipWindow,
  isWithinOpenFiscalPeriod,
  nextDue,
  scheduleOccurrences,
} from "./slipScheduleEngine";

/** Date.UTC shorthand (month 1-based, day 1-based) -> Date. */
const U = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
/** ISO date-only (UTC) snapshot helper. */
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("slipScheduleEngine - pure, deterministic recurrence core", () => {
  it("clamps day-of-month to real month lengths (leap-aware)", () => {
    expect(clampDayOfMonth(31, 2024, 1)).toBe(29); // leap Feb 2024 (0-based month 1)
    expect(clampDayOfMonth(31, 2025, 1)).toBe(28); // common Feb 2025 (0-based month 1)
    expect(clampDayOfMonth(31, 2025, 3)).toBe(30); // April (0-based month index 3)
    expect(clampDayOfMonth(15, 2025, 3)).toBe(15);
    expect(clampDayOfMonth(0, 2025, 3)).toBe(1); // invalid day -> 1
  });

  it("advances a fixed cadence by the correct time delta (daily/weekly)", () => {
    const s = U(2025, 5, 10); // May 10 2025
    expect(iso(nextDue(s, "daily", 1))).toBe("2025-05-11");
    expect(iso(nextDue(s, "weekly", 2))).toBe("2025-05-24"); // +14 days
  });

  it("monthly advances one month and preserves the anchor day (clamped)", () => {
    const jan31 = U(2025, 1, 31);
    expect(iso(nextDue(jan31, "monthly", 1))).toBe("2025-02-28"); // Feb common
    const feb28 = U(2025, 2, 28);
    expect(iso(nextDue(feb28, "monthly", 1))).toBe("2025-03-28");
  });

  it("clamps the anchor day across real month lengths", () => {
    const jan30 = U(2025, 1, 30);
    expect(iso(nextDue(jan30, "monthly", 1))).toBe("2025-02-28");
    // Dec 31 -> next handles Jan 31 (not clamped because it fits)
    const dec31 = U(2025, 12, 31);
    expect(iso(nextDue(dec31, "monthly", 1))).toBe("2026-01-31");
  });

  it("resets via month index roll-over (monthly from Dec to Jan)", () => {
    const s = U(2025, 12, 15);
    expect(iso(nextDue(s, "monthly", 1))).toBe("2026-01-15");
  });

  it("isWithinOpenFiscalPeriod honours inclusive-open / exclusive-closed", () => {
    const open = "2025-01-01T00:00:00.000Z";
    const closed = "2025-07-01T00:00:00.000Z";
    expect(isWithinOpenFiscalPeriod(U(2024, 12, 31), open)).toBe(false);
    expect(isWithinOpenFiscalPeriod(U(2025, 3, 15), open)).toBe(true);
    expect(isWithinOpenFiscalPeriod(U(2025, 3, 15), open, closed)).toBe(true);
    expect(
      isWithinOpenFiscalPeriod(U(2025, 6, 30, 23, 59, 59), open, closed)
    ).toBe(true);
    expect(isWithinOpenFiscalPeriod(U(2025, 7, 1), open, closed)).toBe(false);
    // no window -> always open
    expect(isWithinOpenFiscalPeriod(U(2030, 1, 1))).toBe(true);
  });

  it("completeSlipWindow returns exact openAt and prevDue+windowDays closedAt", () => {
    const win = completeSlipWindow(U(2025, 3, 15), 3);
    expect(win).not.toBeNull();
    expect(iso(win!.openAt)).toBe("2025-03-15");
    expect(iso(win!.closedAt)).toBe("2025-03-18");
    // window spans the month boundary (Mar 15 + 30 days = Apr 14)
    const cross = completeSlipWindow(U(2025, 3, 15), 30);
    expect(iso(cross!.openAt)).toBe("2025-03-15");
    expect(iso(cross!.closedAt)).toBe("2025-04-14");
  });

  it("completeSlipWindow spans a leap-Feb fiscal window", () => {
    // Dec 31 2023 + 64 days crosses Feb 29 2024 -> Mar 4 2024
    const win = completeSlipWindow(U(2023, 12, 31), 64);
    expect(win).not.toBeNull();
    expect(iso(win!.openAt)).toBe("2023-12-31");
    expect(iso(win!.closedAt)).toBe("2024-03-04");
  });

  it("completeSlipWindow returns null when prevDue is outside the open fiscal period", () => {
    const open = "2025-01-01T00:00:00.000Z";
    const closed = "2025-07-01T00:00:00.000Z";
    expect(completeSlipWindow(U(2024, 12, 31), 15, open)).toBeNull(); // before open
    expect(completeSlipWindow(U(2025, 7, 1), 15, open, closed)).toBeNull(); // at closed
    expect(completeSlipWindow(U(2025, 6, 30), 15, open, closed)).not.toBeNull(); // before closed
    expect(completeSlipWindow(U(2025, 1, 1), 15, open)).not.toBeNull(); // on open (inclusive)
  });

  it("scheduleOccurrences walks a monthly cadence across a leap Feb", () => {
    const dates = scheduleOccurrences({
      startAt: "2023-12-31T00:00:00.000Z",
      frequency: "monthly",
      every: 1,
      onDay: 31,
      maxOccurrences: 5,
    });
    expect(dates).toEqual([
      "2023-12-31",
      "2024-01-31",
      "2024-02-29", // leap clamp, not Mar 2
      "2024-03-31",
      "2024-04-30",
    ]);
  });

  it("scheduleOccurrences cuts at endAt (inclusive of prior occurrences)", () => {
    const dates = scheduleOccurrences({
      startAt: "2025-01-31T00:00:00.000Z",
      frequency: "monthly",
      every: 1,
      onDay: 31,
      endAt: "2025-04-15T00:00:00.000Z",
    });
    expect(dates).toEqual(["2025-01-31", "2025-02-28", "2025-03-31"]);
    expect(dates).not.toContain("2025-04-30"); // next due past endAt -> stop
  });

  it("scheduleOccurrences cuts at maxOccurrences", () => {
    const dates = scheduleOccurrences({
      startAt: "2025-05-10T00:00:00.000Z",
      frequency: "weekly",
      every: 1,
      maxOccurrences: 3,
    });
    expect(dates).toEqual(["2025-05-10", "2025-05-17", "2025-05-24"]);
  });

  it("scheduleOccurrences respects the open fiscal period window", () => {
    const open = "2025-06-01T00:00:00.000Z";
    const closed = "2025-06-04T00:00:00.000Z";
    const dates = scheduleOccurrences(
      { startAt: "2025-06-01T00:00:00.000Z", frequency: "daily", every: 1 },
      open,
      closed
    );
    expect(dates).toEqual(["2025-06-01", "2025-06-02", "2025-06-03"]); // Jun 4 is exclusive-closed
    // start already outside the period -> no occurrences at all
    const empty = scheduleOccurrences(
      { startAt: "2024-12-31T00:00:00.000Z", frequency: "daily", every: 1 },
      open,
      closed
    );
    expect(empty).toEqual([]);
  });

  it("scheduleOccurrences hard-caps at 1000 iterations to guarantee termination", () => {
    const dates = scheduleOccurrences({
      startAt: "2025-01-01T00:00:00.000Z",
      frequency: "daily",
      every: 1,
    });
    expect(dates).toHaveLength(1000);
    expect(dates[0]).toBe("2025-01-01");
    expect(dates[999]).toBe("2027-09-27"); // 1000 consecutive daily dates
  });
});
