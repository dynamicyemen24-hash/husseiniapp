"use client";

import { useEffect, useState } from "react";

export default function LanguageToggle() {
  const [locale, setLocale] = useState<"ar" | "en">("ar");

  useEffect(() => {
    const cookieLocale = document.cookie
      .split("; ")
      .find(row => row.startsWith("NEXT_LOCALE="))
      ?.split("=")[1];
    if (cookieLocale === "en" || cookieLocale === "ar") {
      setLocale(cookieLocale);
    }
  }, []);

  function switchLocale(next: "ar" | "en") {
    setLocale(next);
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; sameSite=lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    window.location.reload();
  }

  return (
    <button
      onClick={() => switchLocale(locale === "ar" ? "en" : "ar")}
      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200"
      aria-label="Switch language"
    >
      <span className="text-base leading-none">🇸🇦</span>
      <span>{locale === "ar" ? "العربية" : "English"}</span>
    </button>
  );
}