// i18n.ts — Loads translations from externalized JSON files (ar.json, en.json).
// Provides backward-compatible t() with dot-notation lookup.
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { loadLocale, flattenTranslations, type Language } from "../i18n/loader";

export type { Language };

export type FlattenedTranslation = Record<string, string | string[]>;
type TranslationResources = Record<Language, FlattenedTranslation>;

const translationCache: TranslationResources = { ar: {}, en: {} };
let isHydrated = false;

export async function populateTranslations(lang: Language): Promise<void> {
  try {
    const raw = await loadLocale(lang);
    translationCache[lang] = flattenTranslations(raw);
    isHydrated = true;
  } catch (e) {
    console.error("[i18n] Failed to populate: " + lang, e);
  }
}
const translations = translationCache;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  ready: boolean;
}

const I18nContext = createContext<I18nContextType>({
  language: "ar",
  setLanguage: () => {},
  t: (key: string) => key,
  ready: false,
});

export const useI18n = () => useContext(I18nContext);

function resolveInitialLanguage(): Language {
  if (typeof window === "undefined") return "ar";
  try {
    const saved = window.localStorage.getItem("i18n_lang");
    if (saved === "ar" || saved === "en") {
      void populateTranslations(saved);
      return saved;
    }
    void populateTranslations("ar");
    void populateTranslations("en");
  } catch {
    // localStorage unavailable (private mode / strict storage) — keep defaults.
  }
  return "ar";
}

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState(resolveInitialLanguage());
  const [ready, setReady] = useState(isHydrated);

  useEffect(() => {
    if (
      !translationCache[language] ||
      Object.keys(translationCache[language]).length === 0
    ) {
      populateTranslations(language).then(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem("i18n_lang", language);
    } catch {
      // ignore write failures (private mode)
    }
  }, [language]);

  const t = (key: string): string => {
    const val = translationCache[language] && translationCache[language][key];
    if (val !== undefined) return typeof val === "string" ? val : String(val);
    const keys = key.split(".");
    let res: unknown = translationCache[language];
    for (const k of keys) {
      if (!res) break;
      res = (res as Record<string, unknown>)[k];
    }
    return typeof res === "string" ? res : key;
  };

  return React.createElement(
    I18nContext.Provider,
    { value: { language, setLanguage, t, ready } },
    children
  );
};
