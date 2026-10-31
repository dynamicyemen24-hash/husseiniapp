/**
 * server/_core/slipScheduleEngine.ts - pure scheduling core for payment
 * slips (receipt/payment orders), fully deterministic and DB-free.
 *
 * The platform already persists scheduled journal entries via
 * `scheduledJournalEntries` and recurring expenses via `recurringExpenses`.
 * To keep this slice zero-migration and CI-safe, slips reuse the same
 * recurrence primitives but expose a *financial* schedule model:
 *
 *   - frequency  : once | daily | weekly | monthly | quarterly | annually
 *   - every      : repeat every N units (e.g. every 2 months)
 *   - onDay      : day-of-month (1..31, clamped) for monthly/quarterly/annual
 *   - weekdays   : 0 (Sun) .. 6 (Sat) for daily/weekly modes
 *   - periodOpen/periodClosed : inclusive window - slips only generate while
 *     the fiscal period is open (accounting guard), defaulting to open-period
 *     boundaries derived from `startAt`.
 *
 * Everything here is a pure function of its inputs; no IO, no Date.now
 * surprises (all "now" is injected), so the suite runs identically in CI and
 * in the throwaway sandbox.
 */

export type SlipFrequency =
  | "once"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annually";

export type SlipKind = "receipt" | "payment";

export interface SlipScheduleTemplate {
  tenantId: number;
  kind: SlipKind;
  title: string;
  amount: number;
  currencyCode?: string;
  counterpartyId?: number | null;
  frequency: SlipFrequency;
  every: number; // >=1 repeat cadence
  onDay?: number; // 1..31 preferred day-of-month (clamped)
  weekdays?: number[]; // 0..6 for weekly/daily
  startAt: string; // ISO
  endAt?: string | null; // ISO, undefined = indefinite
  maxOccurrences?: number | null;
  periodOpenAt?: string | null; // fiscal-period guard
  periodClosedAt?: string | null;
  idempotencyKey: string; // unique per (tenant, template, due-date) instance
}

/** One generated due instance of a slip schedule. */
export interface SlipInstance {
  scheduleId: number | "template";
  tenantId: number;
  kind: SlipKind;
  title: string;
  dueDate: string; // ISO (date-only at T00:00:00Z or stored local)
  amount: number;
  periodOpenAt: string | null;
  periodClosedAt: string | null;
  idempotencyKey: string;
  occurrenceIndex: number;
}

const DAY_MS = 86_400_000; // 24 * 60 * 60 * 1000
const ROUND = (n: number) => Math.round(n * 100) / 100;

export function clampDayOfMonth(
  day: number,
  year: number,
  month: number
): number {
  if (!day || day < 1) return 1;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.min(day, last);
}

function addMonthsUtc(s: Date, n: number): Date {
  const d = new Date(s.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  // Preserve original day-of-month intent (clamp). Roll to the NEXT month if
  // the anchor day doesn't exist (e.g. Jan 31 - Feb 28 - Mar 31).
  const yy = d.getUTCFullYear();
  const mm = d.getUTCMonth();
  const last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

/**
 * Compute the next due date for `frequency` given the previous due date.
 * Pure, timezone-agnostic (UTC-based), deterministic.
 */
export function nextDue(
  previous: Date,
  frequency: SlipFrequency,
  every: number,
  onDay?: number
): Date {
  const mult = Math.max(1, Math.floor(every) || 1);
  switch (frequency) {
    case "once":
      return addMonthsUtc(previous, 0);
    case "daily":
      return new Date(previous.getTime() + DAY_MS * mult);
    case "weekly":
      return new Date(previous.getTime() + DAY_MS * 7 * mult);
    case "monthly": {
      const day = onDay && onDay >= 1 ? onDay : previous.getUTCDate();
      const m = addMonthsUtc(previous, 1 * mult);
      return new Date(
        Date.UTC(
          m.getUTCFullYear(),
          m.getUTCMonth(),
          clampDayOfMonth(day, m.getUTCFullYear(), m.getUTCMonth()),
          0,
          0,
          0,
          0
        )
      );
    }
    case "quarterly": {
      const day = onDay && onDay >= 1 ? onDay : previous.getUTCDate();
      const m = addMonthsUtc(previous, 3 * mult);
      return new Date(
        Date.UTC(
          m.getUTCFullYear(),
          m.getUTCMonth(),
          clampDayOfMonth(day, m.getUTCFullYear(), m.getUTCMonth()),
          0,
          0,
          0,
          0
        )
      );
    }
    case "annually": {
      const day = onDay && onDay >= 1 ? onDay : previous.getUTCDate();
      const m = addMonthsUtc(previous, 12 * mult);
      return new Date(
        Date.UTC(
          m.getUTCFullYear(),
          m.getUTCMonth(),
          clampDayOfMonth(day, m.getUTCFullYear(), m.getUTCMonth())
        )
      );
    }
  }
}

/** True if `d` is >= open (inclusive) and (no closed || < closed). */
export function isWithinOpenFiscalPeriod(
  d: Date,
  open?: string | null,
  closed?: string | null
): boolean {
  if (open) {
    const o = new Date(open);
    if (d < o) return false;
  }
  if (closed) {
    const c = new Date(closed);
    if (d >= c) return false;
  }
  return true;
}

/**
 * Resolve the [openAt, closedAt) window a generated slip is payable in.
 * openAt is exactly `prevDue`; closedAt is `prevDue + windowDays`.
 * Returns null when the due date falls outside the open fiscal period
 * (accounting guard) - the caller then skips that slip entirely.
 */
export function completeSlipWindow(
  prevDue: Date,
  windowDays: number,
  open?: string | null,
  closed?: string | null
): { openAt: Date; closedAt: Date } | null {
  if (!isWithinOpenFiscalPeriod(prevDue, open, closed)) return null;
  const days = Math.max(0, windowDays);
  const anchor = prevDue.getTime();
  return {
    openAt: new Date(anchor),
    closedAt: new Date(anchor + days * DAY_MS),
  };
}

/** Minimal recurrence template consumed by `scheduleOccurrences`. */
export interface OccurrenceTemplate {
  startAt: string; // ISO
  frequency: SlipFrequency;
  every: number; // >=1 repeat cadence
  onDay?: number; // 1..31 preferred day-of-month (clamped)
  endAt?: string | null; // ISO, undefined = indefinite
  maxOccurrences?: number | null;
}

const MAX_ITERATIONS = 1000; // defensive termination guarantee

/**
 * Walk `nextDue` from the template start and emit every occurrence as an
 * ISO date-only string (UTC), stopping at `endAt` (inclusive), at
 * `maxOccurrences`, or as soon as the next due date leaves the open fiscal
 * period. Deterministic and pure; iteration is hard-capped so the function
 * always terminates.
 */
export function scheduleOccurrences(
  template: OccurrenceTemplate,
  open?: string | null,
  closed?: string | null
): string[] {
  const { startAt, frequency, every, onDay, endAt, maxOccurrences } = template;
  const out: string[] = [];
  const current = new Date(startAt);
  if (Number.isNaN(current.getTime())) return out;
  const cap =
    maxOccurrences != null && maxOccurrences > 0
      ? Math.floor(maxOccurrences)
      : Infinity;
  const endBoundary = endAt ? new Date(endAt) : null;
  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    if (!isWithinOpenFiscalPeriod(current, open, closed)) break;
    if (endBoundary && current > endBoundary) break;
    out.push(current.toISOString().slice(0, 10));
    if (out.length >= cap) break;
    current.setTime(nextDue(current, frequency, every, onDay).getTime());
  }
  return out;
}
