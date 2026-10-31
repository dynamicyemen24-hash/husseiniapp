import { useEffect } from "react";
import { useLocation } from "wouter";
import { resolvePageMeta } from "@/lib/pageTitles";

/**
 * PageTitle
 * ---------------------------------------------------------------------------
 * مسؤول عن إدارة:
 *
 * - document.title
 * - meta description
 * - robots
 * - canonical للصفحات العامة فقط
 * - Open Graph للصفحات العامة فقط
 * - Twitter Card للصفحات العامة فقط
 *
 * قواعد التشغيل:
 *
 * Public route:
 *   - index, follow
 *   - canonical
 *   - Open Graph
 *   - Twitter metadata
 *
 * Protected / operational route:
 *   - noindex, nofollow
 *   - لا canonical
 *   - لا Open Graph
 *   - لا Twitter metadata
 *
 * ملاحظة:
 * هذا المكوّن Client-side ويعمل بعد تحميل التطبيق.
 * لضمان قراءة Social Crawlers للـ OG tags في SPA بشكل كامل،
 * يفضل SSR / SSG / prerender للصفحات العامة.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type MetaAttribute = "name" | "property";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const MANAGED_META: ReadonlyArray<readonly [MetaAttribute, string]> = [
  ["name", "description"],
  ["name", "robots"],

  ["property", "og:title"],
  ["property", "og:description"],
  ["property", "og:url"],
  ["property", "og:type"],

  ["name", "twitter:title"],
  ["name", "twitter:description"],
];

/* -------------------------------------------------------------------------- */
/* Meta helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Returns an existing meta element or creates it if missing.
 */
function ensureMeta(attribute: MetaAttribute, key: string): HTMLMetaElement {
  const elements = document.head.querySelectorAll<HTMLMetaElement>(
    `meta[${attribute}]`
  );

  for (const element of elements) {
    if (element.getAttribute(attribute) === key) {
      return element;
    }
  }

  const element = document.createElement("meta");

  element.setAttribute(attribute, key);

  document.head.appendChild(element);

  return element;
}

/**
 * Sets meta content.
 */
function setMeta(attribute: MetaAttribute, key: string, content: string): void {
  ensureMeta(attribute, key).setAttribute("content", content);
}

/**
 * Removes a specific meta element.
 */
function removeMeta(attribute: MetaAttribute, key: string): void {
  const elements = document.head.querySelectorAll<HTMLMetaElement>(
    `meta[${attribute}]`
  );

  for (const element of elements) {
    if (element.getAttribute(attribute) === key) {
      element.remove();
    }
  }
}

/**
 * Removes all metadata managed by PageTitle.
 *
 * This is important in SPA navigation so metadata from a previous
 * public route cannot remain active after navigating to a protected route.
 */
function clearManagedMeta(): void {
  for (const [attribute, key] of MANAGED_META) {
    removeMeta(attribute, key);
  }
}

/* -------------------------------------------------------------------------- */
/* Canonical helpers                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Returns the canonical link element if present.
 */
function getCanonical(): HTMLLinkElement | null {
  return document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
}

/**
 * Creates or updates canonical.
 */
function setCanonical(url: string): void {
  let element = getCanonical();

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", url);
}

/**
 * Removes canonical.
 */
function removeCanonical(): void {
  const elements = document.head.querySelectorAll<HTMLLinkElement>(
    'link[rel="canonical"]'
  );

  for (const element of elements) {
    element.remove();
  }
}

/* -------------------------------------------------------------------------- */
/* URL helpers                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Converts a route URL into an absolute URL.
 *
 * Examples:
 *
 * /about
 * =>
 * https://example.com/about
 *
 * https://example.com/about
 * =>
 * https://example.com/about
 */
function toAbsoluteUrl(value: string): string {
  try {
    return new URL(value, window.location.origin).href;
  } catch {
    return value;
  }
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function PageTitle() {
  const [location] = useLocation();

  useEffect(() => {
    const meta = resolvePageMeta(location);

    /**
     * Always clean metadata from the previous route first.
     *
     * This prevents stale:
     *
     * - canonical
     * - og:title
     * - og:description
     * - og:url
     * - twitter metadata
     *
     * from leaking between SPA routes.
     */
    clearManagedMeta();
    removeCanonical();

    /**
     * ------------------------------------------------------------------------
     * Document title
     * ------------------------------------------------------------------------
     */
    document.title = meta.title;

    /**
     * ------------------------------------------------------------------------
     * Description
     * ------------------------------------------------------------------------
     *
     * Description is useful for both public and operational pages,
     * but operational pages are explicitly blocked from indexing.
     */
    setMeta("name", "description", meta.description);

    /**
     * ------------------------------------------------------------------------
     * Protected / operational route
     * ------------------------------------------------------------------------
     *
     * Current PageMeta contract uses the presence of canonical
     * to identify public/indexable pages.
     *
     * No canonical means:
     *
     * - noindex
     * - nofollow
     * - no canonical
     * - no Open Graph
     * - no Twitter metadata
     */
    if (!meta.canonical) {
      setMeta("name", "robots", "noindex, nofollow");

      return;
    }

    /**
     * ------------------------------------------------------------------------
     * Public route
     * ------------------------------------------------------------------------
     */

    const canonical = toAbsoluteUrl(meta.canonical);

    /**
     * Canonical
     */
    setCanonical(canonical);

    /**
     * Robots
     */
    setMeta("name", "robots", "index, follow");

    /**
     * ------------------------------------------------------------------------
     * Open Graph
     * ------------------------------------------------------------------------
     */
    setMeta("property", "og:title", meta.title);

    setMeta("property", "og:description", meta.description);

    setMeta("property", "og:url", canonical);

    setMeta("property", "og:type", "website");

    /**
     * ------------------------------------------------------------------------
     * Twitter / X
     * ------------------------------------------------------------------------
     *
     * Keep these aligned with the public page metadata.
     */
    setMeta("name", "twitter:title", meta.title);

    setMeta("name", "twitter:description", meta.description);
  }, [location]);

  return null;
}
