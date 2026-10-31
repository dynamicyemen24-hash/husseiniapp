import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

/** Per-path scroll memory — module-level so it survives remounts (guards). */
const scrollMemory = new Map<string, number>();

/**
 * ScrollManager — native-browser-style scroll restoration for a SPA.
 *
 * Critical UX signal: users expect back/forward to bring them back to the
 * exact scroll position they left — the way they left a long article, a store
 * listing, or a report on the classic web. Naive "scroll to top on every route"
 * destroys that. This component:
 *
 *  - remembers the scroll position per pathname in memory,
 *  - RESTORES it when the browser back/forward (popstate) returns to that path,
 *  - scrolls to top only for programmatic navigation (link clicks / setLocation),
 *    which is what users intuit as "going to a new page",
 *  - leaves in-page anchors (`/path#section`) untouched so the header hash-links
 *    keep working.
 *
 * Zero layout impact: renders null. Mount once at the app root.
 */
export function ScrollManager() {
  const [location] = useLocation();
  const prevLocation = useRef(location);
  const isPopState = useRef(false);

  // Detect genuine tab-history navigation (browser back / forward buttons).
  useEffect(() => {
    const onPop = () => {
      isPopState.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const prev = prevLocation.current;
    if (prev === location) return;

    if (isPopState.current) {
      // ── Back / forward: bring the user back to where they were. ──
      isPopState.current = false;
      const saved = scrollMemory.get(location);
      // Instant jump — a smooth animation across a page the user already knows
      // feels like a glitch, not polish.
      window.scrollTo(0, saved ?? 0);
    } else {
      // ── Programmatic navigation: remember where we're leaving from, then
      //    start the new page at the top (unless it's an in-page anchor). ──
      if (!prev.includes("#")) scrollMemory.set(prev, window.scrollY);
      if (!location.includes("#")) window.scrollTo(0, 0);
    }

    prevLocation.current = location;
  }, [location]);

  return null;
}
