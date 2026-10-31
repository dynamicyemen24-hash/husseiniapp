// Active tenant selection for the platform OWNER (super-admin) only.
// Stored locally; injected as the `x-tenant-id` header by the tRPC client.
// The server only honours this header for the owner, so a regular tenant
// can never impersonate another tenant via this mechanism.
const KEY = "alhusainia.activeTenantId";

export function getActiveTenantId(): number | null {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return null;
    const n = Number.parseInt(v, 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function setActiveTenantId(id: number | null) {
  try {
    if (id == null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(id));
  } catch {
    // ignore
  }
}
