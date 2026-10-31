import i18next from "i18next";
import FsBackend from "i18next-fs-backend";
import path from "path";
import { fileURLToPath } from "url";
import type { LanguageCode } from "@alhusseiniya/types/common";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export interface ServerI18nConfig {
  lng?: LanguageCode;
  fallbackLng?: LanguageCode;
  supportedLngs?: LanguageCode[];
  namespaces?: string[];
  defaultNS?: string;
  localesPath?: string;
}

let serverI18nInstance: i18next.i18n | null = null;

export function initServerI18n(config: ServerI18nConfig = {}): i18next.i18n {
  if (serverI18nInstance?.isInitialized) {
    return serverI18nInstance;
  }

  serverI18nInstance = i18next.createInstance();

  serverI18nInstance.use(FsBackend).init({
    lng: config.lng || DEFAULT_LANGUAGE,
    fallbackLng: config.fallbackLng || FALLBACK_LANGUAGE,
    supportedLngs: config.supportedLngs || SUPPORTED_LANGUAGES,
    namespaces: config.namespaces || NAMESPACES,
    defaultNS: config.defaultNS || "common",
    preload: config.supportedLngs || SUPPORTED_LANGUAGES,
    backend: {
      loadPath: path.join(
        config.localesPath || path.join(__dirname, "../locales"),
        "{{lng}}/{{ns}}.json"
      ),
      addPath: path.join(
        config.localesPath || path.join(__dirname, "../locales"),
        "{{lng}}/{{ns}}.missing.json"
      ),
      jsonIndent: 2,
    },
    interpolation: {
      escapeValue: false,
    },
    initImmediate: false,
  });

  return serverI18nInstance;
}

export function getServerI18n(): i18next.i18n {
  if (!serverI18nInstance) {
    throw new Error(
      "Server i18n not initialized. Call initServerI18n() first."
    );
  }
  return serverI18nInstance;
}

export function createTFunction(lng: LanguageCode, ns?: string) {
  const i18n = getServerI18n();
  return i18n.getFixedT(lng, ns || "common");
}

export async function translate(
  key: string,
  lng: LanguageCode,
  options?: Record<string, unknown>,
  ns?: string
): Promise<string> {
  const t = createTFunction(lng, ns);
  return t(key, options);
}

export function getResourceBundle(
  lng: LanguageCode,
  ns: string
): Record<string, unknown> {
  const i18n = getServerI18n();
  return i18n.getResourceBundle(lng, ns) || {};
}

export function addResourceBundle(
  lng: LanguageCode,
  ns: string,
  resources: Record<string, unknown>,
  deep = true,
  overwrite = false
): void {
  const i18n = getServerI18n();
  i18n.addResourceBundle(lng, ns, resources, deep, overwrite);
}

export { i18next };
export default i18next;
