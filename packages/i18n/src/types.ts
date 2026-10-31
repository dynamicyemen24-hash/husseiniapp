import type { LanguageCode } from "@alhusseiniya/types/common";

export const SUPPORTED_LANGUAGES: LanguageCode[] = ["ar", "en"];
export const DEFAULT_LANGUAGE: LanguageCode = "ar";
export const FALLBACK_LANGUAGE: LanguageCode = "en";

export const NAMESPACES = [
  "common",
  "navigation",
  "auth",
  "dashboard",
  "sales",
  "inventory",
  "accounting",
  "hr",
  "procurement",
  "workflow",
  "settings",
  "errors",
  "validation",
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export interface TranslationKeys {
  [key: string]: string | TranslationKeys;
}

export interface LocaleResources {
  [namespace: string]: TranslationKeys;
}

export interface LocaleFile {
  [language: string]: LocaleResources;
}

export const RTL_LANGUAGES: LanguageCode[] = ["ar", "he", "fa", "ur"];
export const LTR_LANGUAGES: LanguageCode[] = [
  "en",
  "fr",
  "es",
  "de",
  "zh",
  "ja",
  "ko",
];

export function isRTL(language: LanguageCode): boolean {
  return RTL_LANGUAGES.includes(language);
}

export function getDirection(language: LanguageCode): "rtl" | "ltr" {
  return isRTL(language) ? "rtl" : "ltr";
}

export const DATE_FORMATS: Record<
  LanguageCode,
  { short: string; medium: string; long: string }
> = {
  ar: {
    short: "DD/MM/YYYY",
    medium: "D MMMM YYYY",
    long: "dddd، D MMMM YYYY",
  },
  en: {
    short: "MM/DD/YYYY",
    medium: "MMM D, YYYY",
    long: "dddd, MMMM D, YYYY",
  },
};

export const NUMBER_FORMATS: Record<
  LanguageCode,
  { decimal: string; group: string }
> = {
  ar: { decimal: "،", group: "،" },
  en: { decimal: ".", group: "," },
};

export const CURRENCY_FORMATS: Record<
  LanguageCode,
  { symbol: string; position: "before" | "after"; space: boolean }
> = {
  ar: { symbol: "ر.س", position: "before", space: true },
  en: { symbol: "SAR", position: "before", space: true },
};

export const PLURAL_RULES: Record<
  LanguageCode,
  (n: number) => "zero" | "one" | "two" | "few" | "many" | "other"
> = {
  ar: (n: number) => {
    if (n === 0) return "zero";
    if (n === 1) return "one";
    if (n === 2) return "two";
    if (n % 100 >= 3 && n % 100 <= 10) return "few";
    if (n % 100 >= 11 && n % 100 <= 99) return "many";
    return "other";
  },
  en: (n: number) => (n === 1 ? "one" : "other"),
};

export const LANGUAGE_NAMES: Record<
  LanguageCode,
  { native: string; english: string }
> = {
  ar: { native: "العربية", english: "Arabic" },
  en: { native: "English", english: "English" },
};

export const LANGUAGE_FLAGS: Record<LanguageCode, string> = {
  ar: "🇸🇦",
  en: "🇺🇸",
};
