import { useEffect, useRef } from "react";

export type WebVital = {
  name: "CLS" | "FID" | "INP" | "LCP" | "FCP" | "TTFB";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  id: string;
  navigationType: "navigate" | "reload" | "back_forward" | "prerender";
};

type WebVitalsOptions = {
  url?: string;
  reportOnce?: boolean;
};

const THRESHOLDS: Record<string, [number, number]> = {
  CLS: [0.1, 0.25],
  FID: [100, 300],
  INP: [200, 500],
  LCP: [2500, 4000],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

function getRating(
  name: string,
  value: number
): "good" | "needs-improvement" | "poor" {
  const [good, poor] = THRESHOLDS[name] ?? [0, Infinity];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

/**
 * useWebVitals — collects Core Web Vitals (CLS, INP, LCP, FCP, TTFB) at
 * runtime using the native PerformanceObserver API — no external dependency.
 * Metrics are reported via sendBeacon to VITE_VITALS_ENDPOINT when configured,
 * or logged to the console in development mode.
 */
export function useWebVitals(options?: WebVitalsOptions) {
  const reported = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || !("PerformanceObserver" in window))
      return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const navType =
      (
        performance.getEntriesByType("navigation")[0] as
          | PerformanceNavigationTiming
          | undefined
      )?.type ?? "navigate";

    const endpoint =
      options?.url ??
      (typeof import.meta !== "undefined"
        ? (import.meta.env.VITE_VITALS_ENDPOINT as string | undefined)
        : undefined);

    const report = (name: string, value: number) => {
      if (options?.reportOnce && reported.current.has(name)) return;
      reported.current.add(name);

      if (endpoint) {
        navigator.sendBeacon(
          endpoint,
          JSON.stringify({
            name,
            value,
            rating: getRating(name, value),
            navigationType: navType,
          })
        );
      } else if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[WebVitals]", name, value, getRating(name, value));
      }
    };

    const observers: PerformanceObserver[] = [];

    // CLS: cumulative layout shift (ignoring input-triggered shifts)
    let clsValue = 0;
    const clsObs = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const ls = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
        };
        if (!ls.hadRecentInput && ls.value) clsValue += ls.value;
      }
      report("CLS", clsValue);
    });
    clsObs.observe({ entryTypes: ["layout-shift"] });
    observers.push(clsObs);

    // LCP: largest contentful paint startTime
    let lcpValue = 0;
    const lcpObs = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const lcpEntry = entry as PerformanceEntry & { startTime?: number };
        if (lcpEntry.startTime && lcpEntry.startTime > lcpValue)
          lcpValue = lcpEntry.startTime;
      }
      report("LCP", lcpValue);
    });
    lcpObs.observe({ entryTypes: ["largest-contentful-paint"] });
    observers.push(lcpObs);

    // INP: interaction to next paint (replaces FID)
    let inpValue = 0;
    const inpObs = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const ev = entry as PerformanceEntry & {
          processingStart?: number;
          startTime?: number;
        };
        if (ev.processingStart && ev.startTime) {
          const lat = ev.processingStart - ev.startTime;
          if (lat > inpValue) inpValue = lat;
        }
      }
      report("INP", inpValue);
    });
    try {
      inpObs.observe({ entryTypes: ["event"] });
      observers.push(inpObs);
    } catch {
      // entryTypes=["event"] is very new — skip if unsupported
    }

    // FCP: first contentful paint
    const paints = performance.getEntriesByType("paint");
    const fcpExisting = paints.find(
      e =>
        (e as PerformanceEntry & { name?: string }).name ===
        "first-contentful-paint"
    ) as (PerformanceEntry & { startTime?: number }) | undefined;
    if (fcpExisting?.startTime) {
      report("FCP", fcpExisting.startTime);
    } else {
      const fcpObs = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (
            (entry as PerformanceEntry & { name?: string }).name ===
              "first-contentful-paint" &&
            !fcpExisting
          ) {
            report("FCP", entry.startTime);
          }
        }
      });
      fcpObs.observe({ entryTypes: ["paint"] });
      observers.push(fcpObs);
    }

    // TTFB: response start - request start from navigation entry
    const nav = performance.getEntriesByType("navigation")[0] as
      | (PerformanceEntry & { responseStart?: number; requestStart?: number })
      | undefined;
    if (nav?.responseStart && nav?.requestStart) {
      report("TTFB", nav.responseStart - nav.requestStart);
    }

    return () => observers.forEach(o => o.disconnect());
  }, [options?.url, options?.reportOnce]);

  return reported.current;
}

export default useWebVitals;
