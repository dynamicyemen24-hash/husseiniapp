/**
 * performanceBudget.ts — Build-time and runtime performance budget enforcement.
 *
 * Checks:
 *   - Chunk size budgets (per entry point)
 *   - Asset size budgets
 *   - Lighthouse-like runtime metrics thresholds
 *   - Bundle composition analysis
 *
 * Usage:
 *   - Integrated into Vite build as a plugin
 *   - Runtime metrics reported to Sentry
 */

export interface Budget {
  name: string;
  maxSize: number; // bytes
  warningSize: number; // bytes
  pathPattern: string | RegExp;
}

export const DEFAULT_BUDGETS: Budget[] = [
  // JavaScript budgets
  {
    name: "React Core",
    maxSize: 150000, // 150 KB
    warningSize: 120000,
    pathPattern: /react|scheduler/,
  },
  {
    name: "UI Components",
    maxSize: 200000, // 200 KB
    warningSize: 150000,
    pathPattern: /@radix-ui|cmdk|vaul|sonner/,
  },
  {
    name: "Charts",
    maxSize: 300000, // 300 KB
    warningSize: 200000,
    pathPattern: /recharts|d3|victory/,
  },
  {
    name: "Animations",
    maxSize: 100000, // 100 KB
    warningSize: 80000,
    pathPattern: /framer-motion/,
  },
  {
    name: "API Layer (tRPC + Query)",
    maxSize: 150000, // 150 KB
    warningSize: 100000,
    pathPattern: /@trpc|@tanstack\/react-query/,
  },
  {
    name: "Vendor Bundle",
    maxSize: 500000, // 500 KB
    warningSize: 400000,
    pathPattern: /vendor/,
  },
  // CSS budgets
  {
    name: "Total CSS",
    maxSize: 100000, // 100 KB
    warningSize: 80000,
    pathPattern: /\.css$/,
  },
  // Total budgets
  {
    name: "Page Entrypoint",
    maxSize: 250000, // 250 KB
    warningSize: 200000,
    pathPattern: /^.*\.js$/,
  },
];

export interface BudgetResult {
  name: string;
  actualSize: number;
  maxSize: number;
  warningSize: number;
  status: "ok" | "warning" | "error";
  percentage: number;
}

export function checkBudgets(
  sizes: Map<string, number>,
  budgets: Budget[] = DEFAULT_BUDGETS
): BudgetResult[] {
  const results: BudgetResult[] = [];

  for (const budget of budgets) {
    const matchingEntries = Array.from(sizes.entries()).filter(([path]) =>
      typeof budget.pathPattern === "string"
        ? path.includes(budget.pathPattern)
        : budget.pathPattern.test(path)
    );

    const totalSize = matchingEntries.reduce((sum, [, size]) => sum + size, 0);

    if (totalSize === 0) continue;

    const status =
      totalSize > budget.maxSize
        ? "error"
        : totalSize > budget.warningSize
          ? "warning"
          : "ok";

    results.push({
      name: budget.name,
      actualSize: totalSize,
      maxSize: budget.maxSize,
      warningSize: budget.warningSize,
      status,
      percentage: Math.round((totalSize / budget.maxSize) * 100),
    });
  }

  return results;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Runtime Performance Observer ────────────────────────

export interface RuntimeMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  inp?: number; // Interaction to Next Paint
}

export function observePerformanceMetrics(
  callback: (metrics: RuntimeMetrics) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const metrics: RuntimeMetrics = {};
  let disconnected = false;

  // LCP
  try {
    const lcpObserver = new PerformanceObserver(list => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        metrics.lcp = entries[entries.length - 1].startTime;
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // LCP not supported
  }

  // FCP
  try {
    const fcpObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          metrics.fcp = entry.startTime;
        }
      }
    });
    fcpObserver.observe({ type: "paint", buffered: true });
  } catch {
    // FCP not supported
  }

  // FID
  try {
    const fidObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry instanceof PerformanceEventTiming) {
          metrics.fid = entry.processingStart - entry.startTime;
        }
      }
    });
    fidObserver.observe({ type: "first-input", buffered: true });
  } catch {
    // FID not supported
  }

  // CLS
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value || 0;
          metrics.cls = clsValue;
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {
    // CLS not supported
  }

  // INP (Interaction to Next Paint)
  try {
    const inpObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.name === "event" && entry instanceof PerformanceEventTiming) {
          metrics.inp = entry.duration;
        }
      }
    });
    inpObserver.observe({ type: "event", buffered: true });
  } catch {
    // INP not supported
  }

  // Report metrics after page load
  window.addEventListener("load", () => {
    setTimeout(() => {
      if (!disconnected && Object.keys(metrics).length > 0) {
        callback(metrics);
      }
    }, 5000);
  });

  return () => {
    disconnected = true;
  };
}

// PerformanceEventTiming polyfill type
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
  duration: number;
  name: string;
}
