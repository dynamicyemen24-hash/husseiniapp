/**
 * subscription — enforces the flexible subscription lifecycle promised by
 * the marketing surface:
 *
 *   trial (14 days) → active → grace (unlimited, never blocks work)
 *   → suspended ONLY by explicit user request.
 *
 * An expired trial NEVER locks the tenant out; it auto-transitions to
 * "grace" so the business keeps running while payment is arranged.
 */

import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { settings } from "../../drizzle/schema";

export type SubscriptionStatus = "trial" | "active" | "grace" | "suspended";

export type SubscriptionDecision = {
  /** Effective status after applying auto-transitions. */
  status: SubscriptionStatus;
  /** True when an expired trial was auto-moved to grace (persist by caller). */
  transitionedToGrace: boolean;
  /** Days left in the current trial (null when not in trial). */
  trialDaysLeft: number | null;
};

/**
 * Pure state machine — unit-testable without a database.
 * - suspended → blocked (caller throws).
 * - expired trial → grace (never blocks).
 * - active/grace/unexpired trial → pass-through.
 */
export function resolveSubscription(
  status: SubscriptionStatus | string | null | undefined,
  trialEndsAt: Date | string | null | undefined,
  now: Date = new Date()
): SubscriptionDecision {
  const s = (status ?? "trial") as SubscriptionStatus;
  const end = trialEndsAt ? new Date(trialEndsAt) : null;
  const trialExpired = s === "trial" && !!end && end.getTime() <= now.getTime();

  if (trialExpired) {
    return { status: "grace", transitionedToGrace: true, trialDaysLeft: 0 };
  }

  const trialDaysLeft =
    s === "trial" && end
      ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000))
      : null;

  return { status: s, transitionedToGrace: false, trialDaysLeft };
}

// ── Cached DB enforcement (60s per tenant) ─────────────────────────

type CacheEntry = { decision: SubscriptionDecision; expiresAt: number };
const cache = new Map<number, CacheEntry>();
const CACHE_TTL_MS = 60_000;

/** Test helper. */
export function resetSubscriptionCache() {
  cache.clear();
}

/**
 * Throws FORBIDDEN only for explicitly suspended tenants. Auto-transitions
 * an expired trial to grace (persisted) so work is never interrupted.
 */
export async function enforceSubscription(
  tenantId: number
): Promise<SubscriptionDecision> {
  const cached = cache.get(tenantId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    throwIfSuspended(cached.decision);
    return cached.decision;
  }

  const db = await getDb();
  let decision: SubscriptionDecision = {
    status: "grace",
    transitionedToGrace: false,
    trialDaysLeft: null,
  };

  if (db) {
    const rows = await db
      .select({
        subscriptionStatus: settings.subscriptionStatus,
        trialEndsAt: settings.trialEndsAt,
      })
      .from(settings)
      .where(eq(settings.tenantId, tenantId))
      .limit(1);

    const row = rows[0];
    decision = resolveSubscription(
      row?.subscriptionStatus,
      row?.trialEndsAt ?? null
    );

    // Persist the auto-transition trial → grace (best-effort).
    if (row && decision.transitionedToGrace) {
      try {
        await db
          .update(settings)
          .set({ subscriptionStatus: "grace" })
          .where(eq(settings.tenantId, tenantId));
      } catch {
        // Non-fatal: the in-memory decision already grants access.
      }
    }
  }

  cache.set(tenantId, { decision, expiresAt: now + CACHE_TTL_MS });
  throwIfSuspended(decision);
  return decision;
}

function throwIfSuspended(decision: SubscriptionDecision) {
  if (decision.status === "suspended") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "الاشتراك موقوف بطلب من الإدارة — تواصل مع الدعم لإعادة التفعيل.",
    });
  }
}
