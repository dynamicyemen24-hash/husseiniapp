/**
 * ALHUSAINIA — Resource Hints Injector
 * =====================================
 * Dynamically injects <link> resource hints (preconnect, dns-prefetch,
 * preload, prefetch) based on runtime conditions and user intent.
 *
 * This module is called once from App.tsx on mount to set up:
 *  - preconnect to external services (NeDB, Sentry, WhatsApp)
 *  - preload LCP images based on viewport
 *  - prefetch route chunks when user hovers links
 */

const injected = new Set<string>();

/** Injects a <link> resource hint if not already present. */
function injectLink(
  rel: string,
  href: string,
  extra: Record<string, string> = {}
): void {
  if (injected.has(`${rel}:${href}`)) return;
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  for (const [k, v] of Object.entries(extra)) {
    link.setAttribute(k, v);
  }
  document.head.appendChild(link);
  injected.add(`${rel}:${href}`);
}

/**
 * Core resource hints injected at app start.
 * preconnect to all external origins that the app will hit.
 */
export function injectCoreResourceHints(): void {
  type Hint = { rel: string; href: string; extra: Record<string, string> };
  const hints: Hint[] = [
    {
      rel: "preconnect",
      href: "https://api.neon.tech",
      extra: { crossorigin: "" },
    },
    { rel: "preconnect", href: "https://o205754.ingest.sentry.io", extra: {} },
    { rel: "dns-prefetch", href: "https://wa.me", extra: {} },
  ];

  for (const h of hints) {
    injectLink(h.rel, h.href, h.extra);
  }
}

/**
 * Preload a route chunk based on user intent (hover/focus).
 * Called by HeaderNavbar's onMouseEnter / onFocus.
 */
export function prefetchRouteChunk(path: string): void {
  const loaders: Record<string, () => Promise<unknown>> = {
    "/about": () => import("@/pages/About"),
    "/pricing": () => import("@/pages/Pricing"),
    "/contact": () => import("@/pages/Contact"),
    "/tools": () => import("@/pages/InteractiveCalculators"),
    "/insights": () => import("@/pages/KnowledgeHub"),
  };

  const loader = loaders[path];
  if (loader) {
    void loader().catch(() => {});
  }
}

/**
 * Preload critical SVG/icon assets used across the app.
 */
export function preloadIconAssets(): void {
  const icons = ["/favicon-32x32.png", "/icon-192.png", "/icon-512.png"];
  for (const icon of icons) {
    injectLink("preload", icon, { as: "image", fetchpriority: "low" });
  }
}
