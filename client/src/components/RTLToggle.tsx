/**
 * RTL Toggle Component - Switch between Arabic (RTL) and English (LTR).
 */

"use client";

import * as React from "react";
import { useI18n } from "@/lib/i18n";
import { Language } from "@/lib/i18n";
import { Globe, ArrowRight } from "lucide-react";

export function RTLToggle() {
  const { language, setLanguage } = useI18n();
  const isRTL = language === "ar";

  const toggleLanguage = () => {
    const newLang: Language = isRTL ? "en" : "ar";
    setLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-card px-3 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-brand-500 hover:bg-brand-50"
      aria-label={`التبديل إلى ${isRTL ? "الإنجليزية" : "العربية"}`}
      title={`Current: ${isRTL ? "Arabic (RTL)" : "English (LTR)"}. Click to switch.`}
    >
      <Globe className="size-4" />
      <span>{isRTL ? "EN" : "AR"}</span>
      <ArrowRight className="size-3 rotate-90" />
    </button>
  );
}

/**
 * Document title helper for SEO and accessibility.
 */
export function setDocumentTitle(title: string, lang: Language = "ar") {
  document.title = `${title} - الحسينية لخدمات الأعمال`;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

/**
 * Meta description helper for SEO.
 */
export function setMetaDescription(description: string) {
  let meta = document.querySelector(
    'meta[name="description"]'
  ) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "description";
    document.head.appendChild(meta);
  }
  meta.content = description;
}

/**
 * Open Graph meta helper for social sharing.
 */
export function setOGMeta(title: string, description: string, image?: string) {
  const setTag = (property: string, content: string) => {
    let tag = document.querySelector(
      `meta[property="${property}"]`
    ) as HTMLMetaElement;
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("property", property);
      document.head.appendChild(tag);
    }
    tag.content = content;
  };

  setTag("og:title", title);
  setTag("og:description", description);
  setTag("og:type", "website");
  setTag("og:locale", "ar_SA");
  if (image) {
    setTag("og:image", image);
  }
}
