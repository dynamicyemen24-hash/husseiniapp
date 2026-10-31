import { trpc } from "@/lib/trpc";
import { MotionConfig } from "framer-motion";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { goLogin } from "./const";
import { installGlobalErrorCapture } from "./lib/globalErrorCapture";
import { initFontLoading } from "./lib/fonts";
import { injectCoreResourceHints } from "./lib/resource-hints";
import "./index.css";
import { I18nProvider } from "./lib/i18n";
import { getActiveTenantId } from "./lib/activeTenant";

// Sentry client-side initialization
if (import.meta.env.VITE_SENTRY_DSN) {
  import("@sentry/react").then(Sentry => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      replaysSessionSampleRate: import.meta.env.PROD ? 0.01 : 0.1,
      replaysOnErrorSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    });
  });
}

// شبكة الأمان الأخيرة: تُركَّب قبل أي شيء آخر لالتقاط أخطاء الإقلاع نفسها.
installGlobalErrorCapture();

// Resource hints: preconnect إلى الخدمات الخارجية + preload أصول LCP مبكراً.
injectCoreResourceHints();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // مزامنة تلقائية فور عودة اتصال الأوفلاين
      retry: 1,
    },
  },
});

// Session-expiry handling — RESPECTFUL edition:
// A 401 from any background query must NEVER hijack the user with a forced
// full-page redirect (that destroyed in-progress work and context). Instead we
// surface a non-blocking toast; navigation to login happens only when the user
// clicks the action. Protected pages additionally gate themselves via
// RequireAuth's branded prompt, so nothing leaks while logged out.
let sessionToastShown = false;
const notifySessionExpired = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (error.message !== UNAUTHED_ERR_MSG) return;
  if (sessionToastShown) return;
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  sessionToastShown = true;
  // Lazy import avoids pulling sonner into the critical boot path.
  import("sonner").then(({ toast }) => {
    toast.error("انتهت صلاحية الجلسة", {
      description: "يرجى تسجيل الدخول للمتابعة — لن تفقد مكانك في الصفحة.",
      duration: 8000,
      action: {
        label: "تسجيل الدخول",
        onClick: () => goLogin(window.location.pathname),
      },
    });
  });
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    notifySessionExpired(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
          // Super-admin tenant switch (owner only): forward active tenant id
          const activeTenant = getActiveTenantId();
          if (activeTenant != null) {
            return { "x-tenant-id": String(activeTenant) };
          }
        } catch {
          // sessionStorage / localStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// الخطوط الذاتية: تحميل الخطوط الحرجة عبر FontFace API قبل الرسم الأول،
// والخطوط الثانوية تُؤجَّل حتى idle — مع بديل CSS فقط عند حظر FontFace.
initFontLoading();

// ─── Performance Observer Integration ──────────────────
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

// ─── Offline Mutation Queue ────────────────────────────
// Service worker background sync for offline mutations
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    await navigator.serviceWorker.ready;
    // Register background sync for offline mutations
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && "sync" in reg && (reg as any).sync) {
        await (reg as any).sync.register("sync-mutations");
      }
      // Register periodic sync for critical data
      if (reg && "periodicSync" in reg) {
        await (reg as any).periodicSync.register("periodic-data-sync", {
          minInterval: 15 * 60 * 1000,
        });
      }
    } catch {
      // Background sync not supported
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <MotionConfig reducedMotion="user">
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>
    </MotionConfig>
  </I18nProvider>
);

// Register service worker for installable PWA + offline shell, then keep the
// running build fresh: browsers only check for a new SW on navigation and at
// most once per day — long-lived sessions (our PWA's main use case) would sit
// on stale builds. We poll explicitly every 30 minutes and whenever the tab
// becomes visible again. The update-detection toast (SWUpdateToast) handles UX.
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
