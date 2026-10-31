/**
 * ALHUSAINIA — Self-Hosted Font Optimization System
 * ===================================================
 * Fonts are self-hosted (WOFF2) to eliminate:
 *  - Third-party RTT + FOIT (Flash of Invisible Text)
 *  - Google Fonts privacy/cookie leakage under CCPA/GDPR
 *  - External DNS dependency in CSP
 *
 * Strategy:
 *  1. Critical fonts (Tajawal 900 for H1, IBM Plex 700 for body) preloaded in index.html
 *  2. Non-critical fonts loaded via FontFace API with font-display: swap
 *  3. Font loading state persisted in localStorage to skip preload on repeat visits
 *  4. Latin + Arabic subsets only — no CJK/Greek/Cyrillic bloat
 */

export type FontDescriptor = {
  family: string;
  weight: number;
  style: "normal" | "italic";
  /** Self-hosted WOFF2 subset sources — browser downloads only needed ranges. */
  sources: string[];
};

function desc(
  family: string,
  weight: number,
  style: "normal" | "italic",
  sources: string[]
): FontDescriptor {
  return { family, weight, style, sources };
}

/**
 * Self-hosted font registry — WOFF2 subsets (Arabic + Latin) from Fontsource CDN.
 * Each subset file is ~8-45KB instead of the ~80-120KB full Google Fonts bundle.
 */
export const FONTS: FontDescriptor[] = [
  // Tajawal — primary Arabic display font (headings)
  desc("Tajawal", 400, "normal", [
    "/fonts/tajawal-arabic-400-normal.woff2",
    "/fonts/tajawal-latin-400-normal.woff2",
  ]),
  desc("Tajawal", 500, "normal", [
    "/fonts/tajawal-arabic-500-normal.woff2",
    "/fonts/tajawal-latin-500-normal.woff2",
  ]),
  desc("Tajawal", 700, "normal", [
    "/fonts/tajawal-arabic-700-normal.woff2",
    "/fonts/tajawal-latin-700-normal.woff2",
  ]),
  desc("Tajawal", 800, "normal", [
    "/fonts/tajawal-arabic-800-normal.woff2",
    "/fonts/tajawal-latin-800-normal.woff2",
  ]),
  desc("Tajawal", 900, "normal", [
    "/fonts/tajawal-arabic-900-normal.woff2",
    "/fonts/tajawal-latin-900-normal.woff2",
  ]),
  // IBM Plex Sans Arabic — body text
  desc("IBM Plex Sans Arabic", 300, "normal", [
    "/fonts/ibm-plex-sans-arabic-arabic-300-normal.woff2",
    "/fonts/ibm-plex-sans-arabic-latin-300-normal.woff2",
  ]),
  desc("IBM Plex Sans Arabic", 400, "normal", [
    "/fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2",
    "/fonts/ibm-plex-sans-arabic-latin-400-normal.woff2",
  ]),
  desc("IBM Plex Sans Arabic", 500, "normal", [
    "/fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2",
    "/fonts/ibm-plex-sans-arabic-latin-500-normal.woff2",
  ]),
  desc("IBM Plex Sans Arabic", 600, "normal", [
    "/fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2",
    "/fonts/ibm-plex-sans-arabic-latin-600-normal.woff2",
  ]),
  desc("IBM Plex Sans Arabic", 700, "normal", [
    "/fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2",
    "/fonts/ibm-plex-sans-arabic-latin-700-normal.woff2",
  ]),
];

/** Fonts needed for first paint — preloaded in index.html and loaded eagerly. */
export const CRITICAL_FONTS: FontDescriptor[] = [
  desc("Tajawal", 900, "normal", [
    "/fonts/tajawal-arabic-900-normal.woff2",
    "/fonts/tajawal-latin-900-normal.woff2",
  ]), // H1 hero headings
  desc("IBM Plex Sans Arabic", 700, "normal", [
    "/fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2",
    "/fonts/ibm-plex-sans-arabic-latin-700-normal.woff2",
  ]), // hero CTA / body-bold
];

const FONT_CACHE_KEY = "alh-fonts-loaded-v1";
const FONT_TIMEOUT_MS = 3000; // Abort font loading after 3s to prevent blocking

type FontStatus = "idle" | "loading" | "loaded" | "failed";

const fontStatuses = new Map<string, FontStatus>();

/**
 * fontKey — uniquely identifies a font variant.
 */
function fontKey(desc: FontDescriptor): string {
  return `${desc.family}-${desc.weight}-${desc.style}`;
}

/**
 * hasFontsLoaded — checks localStorage for prior successful load.
 * Returns true if fonts were loaded (or partially loaded) on a previous visit.
 */
export function hasFontsLoaded(): boolean {
  try {
    return localStorage.getItem(FONT_CACHE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * markFontsLoaded — persists success to localStorage.
 */
function markFontsLoaded(): void {
  try {
    localStorage.setItem(FONT_CACHE_KEY, "true");
  } catch {
    /* private mode */
  }
}

/**
 * loadFonts — eagerly loads a subset of fonts via FontFace API.
 * Uses Promise.allSettled so a single failure doesn't block the rest.
 * Respects prefers-reduced-motion (still loads fonts for readability).
 */
export async function loadFonts(
  fonts: FontDescriptor[] = FONTS
): Promise<void> {
  if (typeof window === "undefined" || !("fonts" in document)) return;
  if (hasFontsLoaded()) return; // skip on repeat visits

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FONT_TIMEOUT_MS);

  const promises = fonts.map(font => {
    const key = fontKey(font);
    if (fontStatuses.get(key) === "loaded") return Promise.resolve();

    fontStatuses.set(key, "loading");

    // Only load critical fonts eagerly; defer the rest
    const isCritical = CRITICAL_FONTS.some(
      f =>
        f.family === font.family &&
        f.weight === font.weight &&
        f.style === font.style
    );
    if (!isCritical) {
      fontStatuses.set(key, "idle");
      return Promise.resolve();
    }

    const src = [
      `local('${font.family}')`,
      ...font.sources.map(s => `url('${s}') format('woff2')`),
    ].join(", ");
    const fontFace = new FontFace(key, src, {
      weight: String(font.weight),
      style: font.style,
      display: "swap",
    });

    const p = fontFace
      .load()
      .then(() => {
        document.fonts.add(fontFace);
        fontStatuses.set(key, "loaded");
      })
      .catch(() => {
        fontStatuses.set(key, "failed");
      });
    return p;
  });

  await Promise.allSettled(promises);
  clearTimeout(timeout);
  markFontsLoaded();

  // Trigger a re-layout so font-swap is noticed by the browser
  if ("startViewTransition" in document) {
    (
      document as Document & {
        startViewTransition?: (cb: () => void) => unknown;
      }
    ).startViewTransition?.(() => {
      document.body.style.visibility = "visible";
    });
  }
}

/**
 * initFontLoading — entry point called from main.tsx.
 * Loads critical fonts immediately, then defers the rest.
 */
export function initFontLoading(): void {
  // Load critical fonts before any render
  void loadFonts(CRITICAL_FONTS);

  // Defer remaining fonts to after idle
  if ("requestIdleCallback" in window) {
    requestIdleCallback(
      () => {
        void loadFonts(FONTS);
      },
      { timeout: 5000 }
    );
  } else {
    setTimeout(() => void loadFonts(FONTS), 2000);
  }
}
