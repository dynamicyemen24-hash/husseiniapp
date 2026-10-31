import { MotionConfig } from "framer-motion";
import { createRoot } from "react-dom/client";
import AppMarketing from "./AppMarketing";
import "./index.css";
import { I18nProvider } from "./lib/i18n";

// Sentry client-side initialization (marketing only - errors)
if (import.meta.env.VITE_SENTRY_DSN) {
  import("@sentry/react").then(Sentry => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    });
  });
}

// Resource hints for marketing
import { injectCoreResourceHints } from "./lib/resource-hints";
injectCoreResourceHints();

// Font loading
import { initFontLoading } from "./lib/fonts";
initFontLoading();

// Performance observer for marketing
import { observePerformanceMetrics } from "@/lib/performanceBudget";

if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  setTimeout(() => {
    observePerformanceMetrics(metrics => {
      import("@sentry/react").then(Sentry => {
        Sentry.addBreadcrumb({
          category: "performance",
          level: "info",
          data: metrics,
        });
      });
    });
  }, 2000);
}

// Service worker for marketing PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(reg => {
        const UPDATE_POLL_MS = 30 * 60 * 1000;
        setInterval(() => reg.update().catch(() => {}), UPDATE_POLL_MS);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            reg.update().catch(() => {});
          }
        });
      })
      .catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <MotionConfig reducedMotion="user">
      <AppMarketing />
    </MotionConfig>
  </I18nProvider>
);
