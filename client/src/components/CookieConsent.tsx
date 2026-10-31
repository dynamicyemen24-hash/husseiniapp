import { useEffect } from "react";

/**
 * CookieConsent — quiet privacy defaults.
 *
 * Design principles:
 * Optional analytics/marketing storage is rejected by default so the first
 * visit stays focused. The full privacy policy remains available in the
 * footer; no consent prompt interrupts the product or marketing experience.
 */
const STORAGE_KEY = "alh_cookie_consent_v1";
const EXPIRY_DAYS = 180;

type ConsentState = {
  necessary: true; // always true
  analytics: boolean;
  marketing: boolean;
  decidedAt: number;
  expiresAt: number;
};

function loadConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(consent: Omit<ConsentState, "decidedAt" | "expiresAt">) {
  const payload: ConsentState = {
    ...consent,
    decidedAt: Date.now(),
    expiresAt: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* localStorage unavailable */
  }
}

export function CookieConsent() {
  useEffect(() => {
    if (!loadConsent()) {
      saveConsent({ necessary: true, analytics: false, marketing: false });
    }
  }, []);
  return null;
}

export { STORAGE_KEY as COOKIE_CONSENT_KEY };
