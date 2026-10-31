// Fix script: rewrites i18n.ts to use JSON-loaded translations
const fs = require("fs");
const path = require("path");

const NEW_FILE = `// i18n.ts — Loads translations from externalized JSON files (ar.json, en.json).
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

export async function populateTranslations(lang) {
  try {
    const raw = await loadLocale(lang);
    translationCache[lang] = flattenTranslations(raw);
    isHydrated = true;
  } catch (e) {
    console.error("[i18n] Failed to populate: " + lang, e);
  }
}
const translations = translationCache;

const I18nContext = createContext({
  language: "ar" ,
  setLanguage: () => {},
  t: (key) => key,
  ready: false,
});

export const useI18n = () => useContext(I18nContext);

function resolveInitialLanguage() {
  if (typeof window === "undefined") return "ar";
  try {
    const saved = window.localStorage.getItem("i18n_lang");
    if (saved === "ar" || saved === "en") {
      void populateTranslations(saved);
      return saved;
    }
    void populateTranslations("ar");
    void populateTranslations("en");
  } catch {}
  return "ar";
}

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(resolveInitialLanguage());
  const [ready, setReady] = useState(isHydrated);

  useEffect(() => {
    if (!translationCache[language] || Object.keys(translationCache[language]).length === 0) {
      populateTranslations(language).then(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("i18n_lang", language); } catch {}
  }, [language]);

  const t = (key) => {
    const val = translationCache[language] && translationCache[language][key];
    if (val !== undefined) return typeof val === "string" ? val : String(val);
    const keys = key.split(".");
    let res = translationCache[language];
    for (const k of keys) { if (!res) break; res = res[k]; }
    return typeof res === "string" ? res : key;
  };

  return React.createElement(I18nContext.Provider, { value: { language, setLanguage, t, ready } }, children);
};
`;

fs.writeFileSync(
  path.join(__dirname, "..", "client", "src", "lib", "i18n.ts"),
  NEW_FILE,
  "utf8"
);
console.log("i18n.ts rewritten successfully");
