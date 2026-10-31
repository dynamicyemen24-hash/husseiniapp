/**
 * Cross-deployment links. Configure VITE_SYSTEM_URL on the public website
 * project and VITE_MARKETING_URL on the ERP project in Vercel.
 */
function safeExternalUrl(value: string | undefined, fallback: string): string {
  if (!value?.trim()) return fallback;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString().replace(/\/$/, "")
      : fallback;
  } catch {
    return fallback;
  }
}

export const systemUrl = safeExternalUrl(
  import.meta.env.VITE_SYSTEM_URL,
  "/login"
);

export const marketingUrl = safeExternalUrl(
  import.meta.env.VITE_MARKETING_URL,
  "/"
);

export function goToSystem(path = "/login") {
  if (systemUrl.startsWith("/")) {
    window.location.assign(path);
    return;
  }
  window.location.assign(new URL(path, `${systemUrl}/`).toString());
}

export function goToMarketing() {
  window.location.assign(marketingUrl);
}
