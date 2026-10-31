import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const t0 = Date.now();
try {
  const r = await sql`select now() as t, count(*)::int as tenants from tenants`;
  console.log(`OK in ${Date.now() - t0}ms`, JSON.stringify(r));
  const tenants = await sql`SELECT id, code, name, "subscriptionPlan" FROM tenants ORDER BY id LIMIT 10`;
  console.log("TENANTS:", JSON.stringify(tenants));
  const settings = await sql`SELECT id, "tenantId", "subscriptionStatus" FROM settings ORDER BY id LIMIT 10`;
  console.log("SETTINGS:", JSON.stringify(settings));
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
}
