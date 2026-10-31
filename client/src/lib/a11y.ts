/**
 * Accessibility primitives — adapted from the NIC Global Design System
 * (`a11y/screen-reader.ts`, `a11y/reduced-motion.ts`) to the Uamex_erp
 * codebase with two deliberate improvements:
 *
 * 1. Singleton live regions per politeness instead of create-and-remove:
 *    removing a region after 1s can truncate announcements on slow
 *    screen readers; a persistent region re-announces reliably.
 * 2. Re-announce protocol: clear the text, then set it on the next frame
 *    so identical consecutive messages are still spoken.
 *
 * Framework-free and SSR/node-safe (every DOM touch is guarded), so the
 * helpers are unit-testable under Vitest without a browser.
 */

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export type Politeness = "polite" | "assertive";

/** True when the OS/user requests reduced motion. Safe without a DOM. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

const REGIONS = new Map<Politeness, unknown>();

function createRegion(politeness: Politeness): unknown {
  const region = document.createElement("div");
  region.setAttribute("role", politeness === "assertive" ? "alert" : "status");
  region.setAttribute("aria-live", politeness);
  region.setAttribute("aria-atomic", "true");
  const style = (region as unknown as { style: Record<string, string> }).style;
  style.position = "absolute";
  style.width = "1px";
  style.height = "1px";
  style.padding = "0";
  style.margin = "-1px";
  style.overflow = "hidden";
  style.clip = "rect(0, 0, 0, 0)";
  style.whiteSpace = "nowrap";
  style.border = "0";
  document.body.appendChild(region);
  return region;
}

function getRegion(politeness: Politeness): unknown {
  const cached = REGIONS.get(politeness);
  if (cached) return cached;
  const region = createRegion(politeness);
  REGIONS.set(politeness, region);
  return region;
}

/**
 * Announce a message to screen readers. No-op without a DOM.
 * Identical consecutive messages are re-spoken (clear-then-set).
 */
export function announce(
  message: string,
  politeness: Politeness = "polite"
): void {
  if (typeof document === "undefined") return;
  if (!message) return;
  const region = getRegion(politeness) as unknown as { textContent: string };
  region.textContent = "";
  const set = () => {
    region.textContent = message;
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(set);
  else set();
}

/** Reset cached regions (tests / full remounts). */
export function __resetAnnouncerForTests(): void {
  REGIONS.clear();
}

export type MotionChangeCallback = (reduced: boolean) => void;

/**
 * Subscribe to OS reduced-motion changes. Returns an unsubscribe function.
 * No-op (returns a noop) without `matchMedia`.
 */
export function watchReducedMotion(cb: MotionChangeCallback): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return () => undefined;
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  const handler = (event: Event) => {
    const matches = (event as unknown as { matches?: boolean }).matches;
    cb(matches ?? false);
  };
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }
  // Legacy Safari (< 14) fallback.
  const legacy = query as unknown as {
    addListener?: (h: (e: { matches?: boolean }) => void) => void;
    removeListener?: (h: (e: { matches?: boolean }) => void) => void;
  };
  const legacyHandler = (e: { matches?: boolean }) => cb(e.matches ?? false);
  legacy.addListener?.(legacyHandler);
  return () => legacy.removeListener?.(legacyHandler);
}
