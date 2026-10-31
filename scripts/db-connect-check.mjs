import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) {
  console.error("[DB-CHECK] DATABASE_URL is missing");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Retry wrapper around a tagged-template query (Neon HTTP can hiccup on cold pool).
async function t(label, tagFn, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const rows = await tagFn();
      console.log(`[DB-CHECK] ${label}: ${JSON.stringify(rows)}`);
      return rows;
    } catch (e) {
      const msg = e?.message || String(e);
      if (attempt === tries) {
        console.error(`[DB-CHECK] ${label} ERROR after ${tries} tries: ${msg}`);
        return [];
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return [];
}

console.log("[DB-CHECK] Connecting…");
await t(
  "server",
  () => sql`SELECT now() AS now, current_database() AS db, version() AS ver`
);

const coreTables = [
  "tenants",
  "users",
  "accounts",
  "transactions",
  "journal_entries",
  "sales_invoices",
  "purchase_invoices",
  "inventory_movements",
  "products",
  "customers",
  "suppliers",
  "warehouses",
  "settings",
  "fiscal_periods",
];

console.log("\n[DB-CHECK] === Schema presence (core tables) ===");
for (const tbl of coreTables) {
  const rows = await t(
    `table:${tbl}`,
    () => sql`SELECT to_regclass(('public'||'.'||${tbl})::regclass) AS exists`
  );
  const exists = rows.length && rows[0]?.exists;
  console.log(`[DB-CHECK]   ${tbl}: ${exists ? "EXISTS" : "MISSING"}`);
}

console.log("\n[DB-CHECK] === Row counts (tenant-scoped core) ===");
await t("users count", () => sql`SELECT count(*)::int AS c FROM users`);
await t(
  "users (identity/tenant/role)",
  () =>
    sql`SELECT id, "openId", username, name, role, "tenantId", "loginMethod", "lastSignedIn" FROM users ORDER BY id`
);
await t(
  "tenants",
  () =>
    sql`SELECT id, code, name, country, currency, "subscriptionPlan", sector FROM tenants ORDER BY id`
);
await t(
  "settings (tenant config)",
  () =>
    sql`SELECT id, "tenantId", "institutionName", "accountingPeriod", "currency", "subscriptionStatus", "trialEndsAt" FROM settings ORDER BY id`
);
await t("accounts count", () => sql`SELECT count(*)::int c FROM accounts`);
await t(
  "transactions count",
  () => sql`SELECT count(*)::int c FROM transactions`
);
await t(
  "journal_entries count",
  () => sql`SELECT count(*)::int c FROM journal_entries`
);
await t(
  "sales_invoices count",
  () => sql`SELECT count(*)::int c FROM sales_invoices`
);
await t(
  "purchase_invoices count",
  () => sql`SELECT count(*)::int c FROM purchase_invoices`
);
await t(
  "fiscal_periods count",
  () => sql`SELECT count(*)::int c FROM fiscal_periods`
);
await t("customers count", () => sql`SELECT count(*)::int c FROM customers`);
await t("suppliers count", () => sql`SELECT count(*)::int c FROM suppliers`);
await t("products count", () => sql`SELECT count(*)::int c FROM products`);
await t(
  "inventory_movements count",
  () => sql`SELECT count(*)::int c FROM inventory_movements`
);

console.log("\n[DB-CHECK] === Env var presence ===");
for (const k of [
  "NODE_ENV",
  "DATABASE_URL",
  "JWT_SECRET",
  "OWNER_OPEN_ID",
  "OWNER_PASSWORD",
  "OAUTH_SERVER_URL",
  "VITE_APP_ID",
]) {
  console.log(`[DB-CHECK]   ${k}: ${process.env[k] ? "***SET***" : "<empty>"}`);
}

process.exit(0);
