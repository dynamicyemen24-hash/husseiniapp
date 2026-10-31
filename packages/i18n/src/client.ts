import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
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

export interface I18nConfig {
  lng?: LanguageCode;
  fallbackLng?: LanguageCode;
  supportedLngs?: LanguageCode[];
  namespaces?: string[];
  defaultNS?: string;
  detection?: {
    order?: string[];
    caches?: string[];
    lookupCookie?: string;
    lookupLocalStorage?: string;
  };
  backend?: {
    loadPath: string;
    addPath?: string;
    parse?: (data: string) => Record<string, unknown>;
  };
}

export function createI18nConfig(config: I18nConfig = {}) {
  return {
    lng: config.lng || DEFAULT_LANGUAGE,
    fallbackLng: config.fallbackLng || FALLBACK_LANGUAGE,
    supportedLngs: config.supportedLngs || SUPPORTED_LANGUAGES,
    namespaces: config.namespaces || NAMESPACES,
    defaultNS: config.defaultNS || "common",
    interpolation: {
      escapeValue: false,
      format: (value: string, format: string, lng: string) => {
        if (format === "uppercase") return value.toUpperCase();
        if (format === "lowercase") return value.toLowerCase();
        if (format === "currency") {
          return new Intl.NumberFormat(lng === "ar" ? "ar-SA" : "en-US", {
            style: "currency",
            currency: "SAR",
          }).format(Number(value));
        }
        if (format === "number") {
          return new Intl.NumberFormat(lng === "ar" ? "ar-SA" : "en-US").format(
            Number(value)
          );
        }
        if (format === "date") {
          return new Intl.DateTimeFormat(lng === "ar" ? "ar-SA" : "en-US", {
            dateStyle: "medium",
          }).format(new Date(value));
        }
        if (format === "datetime") {
          return new Intl.DateTimeFormat(lng === "ar" ? "ar-SA" : "en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(value));
        }
        return value;
      },
    },
    detection: config.detection || {
      order: ["cookie", "localStorage", "navigator", "htmlTag"],
      caches: ["cookie", "localStorage"],
      lookupCookie: "i18next",
      lookupLocalStorage: "i18nextLng",
    },
    backend: config.backend || {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
      parse: (data: string) => JSON.parse(data),
    },
    react: {
      useSuspense: false,
      bindI18n: "languageChanged loaded",
      bindI18nStore: "added removed",
      transEmptyNodeValue: "",
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ["br", "strong", "i", "p"],
    },
  };
}

let i18nInstance: i18next.i18n | null = null;

export function initI18n(config: I18nConfig = {}): i18next.i18n {
  if (i18nInstance?.isInitialized) {
    return i18nInstance;
  }

  i18nInstance = i18next.createInstance();

  i18nInstance
    .use(initReactI18next)
    .use(LanguageDetector)
    .use(HttpBackend)
    .init(createI18nConfig(config));

  return i18nInstance;
}

export function getI18n(): i18next.i18n {
  if (!i18nInstance) {
    throw new Error("i18n not initialized. Call initI18n() first.");
  }
  return i18nInstance;
}

export async function changeLanguage(lng: LanguageCode): Promise<void> {
  const i18n = getI18n();
  await i18n.changeLanguage(lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
}

export function t(key: string, options?: i18next.TOptions): string {
  return getI18n().t(key, options);
}

export function tRich(
  key: string,
  options?: i18next.TOptions
): React.ReactNode {
  return getI18n().t(key, {
    ...options,
    returnObjects: true,
  }) as React.ReactNode;
}

export function exists(key: string, options?: i18next.TOptions): boolean {
  return getI18n().exists(key, options);
}

export function getResourceBundle(
  lng: LanguageCode,
  ns: string
): Record<string, unknown> {
  return getI18n().getResourceBundle(lng, ns) || {};
}

export function addResourceBundle(
  lng: LanguageCode,
  ns: string,
  resources: Record<string, unknown>,
  deep = true,
  overwrite = false
): void {
  getI18n().addResourceBundle(lng, ns, resources, deep, overwrite);
}

export function removeResourceBundle(lng: LanguageCode, ns: string): void {
  getI18n().removeResourceBundle(lng, ns);
}

export { i18next };
export default i18next;
