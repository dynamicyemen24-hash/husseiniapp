/**
 * ALHUSAINIA — i18n Loader & Typed Message Catalog
 * ================================================
 * Externalized translation loader that replaces the inline
 * `translations` object in `lib/i18n.ts`.
 *
 * JSON resource files:
 *  - client/src/i18n/ar.json
 *  - client/src/i18n/en.json
 *
 * The loader supports lazy-loading (via dynamic import) and
 * runtime caching so subsequent language switches are instant.
 */

export type Language = "ar" | "en";
export type FlattenedTranslation = Record<string, string | string[]>;
export type Translations = Record<
  string,
  string | string[] | Record<string, unknown>
>;

// Cache loaded locales so switching languages doesn't re-fetch
const localeCache = new Map<Language, Translations>();

/**
 * Load translations for a given language.
 * Uses dynamic import for code-splitting, falls back to cache.
 */
export async function loadLocale(lang: Language): Promise<Translations> {
  if (localeCache.has(lang)) {
    return localeCache.get(lang)!;
  }

  let data: Translations;
  try {
    // Static per-locale loader map — Vite resolves each entry at build time
    // with proper code-splitting, without the dynamic-import-vars template
    // warning (only "ar" and "en" exist, so an explicit map is clearer anyway).
    // Dynamic import returns a namespace object — unwrap the default export.
    const loaders: Record<
      Language,
      () => Promise<{ default?: Translations } & Record<string, unknown>>
    > = {
      ar: () => import("./ar.json"),
      en: () => import("./en.json"),
    };
    const module = await loaders[lang]();
    data = (module.default ?? module) as Translations;
  } catch (e) {
    console.error(`[i18n] Failed to load locale "${lang}":`, e);
    data = {};
  }

  localeCache.set(lang, data);
  return data;
}

/**
 * Flatten a nested JSON object into dot-notation keys.
 * Example: { common: { appName: "X" } } → { "common.appName": "X" }
 */
export function flattenTranslations(
  obj: Record<string, unknown>,
  prefix = ""
): FlattenedTranslation {
  const result: FlattenedTranslation = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenTranslations(value as Record<string, unknown>, fullKey)
      );
    } else {
      result[fullKey] = value as string | string[];
    }
  }
  return result;
}

/**
 * Pluralize a translation key based on count.
 * Arabic has 6 plural forms (zero, one, two, few, many, other) — uses Intl.PluralRules.
 */
export function tPlural(
  key: string,
  count: number,
  translations: FlattenedTranslation
): string {
  const pluralRule = new Intl.PluralRules("ar").select(count);
  const variants = [
    `${key}_${pluralRule}`, // e.g. "items_zero", "items_one", "items_few", "items_many"
    `${key}_other`,
    key, // fallback to base
  ];
  for (const variant of variants) {
    if (translations[variant]) {
      const val = translations[variant];
      if (typeof val === "string") return val.replace("{count}", String(count));
    }
  }
  return key;
}

/** Eagerly load both locales at build-time for SSG if available. */
export function preloadLocales(): Promise<[Translations, Translations]> {
  return Promise.all([loadLocale("ar"), loadLocale("en")]);
}
