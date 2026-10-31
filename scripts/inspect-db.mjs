// One-off DB introspection: list tables + key columns
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const checks = await sql`
  SELECT
    (SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_%_tenant_%' AND indexname IN ('idx_journal_entries_tenant_posted_branch','idx_transactions_tenant_account_date','idx_products_tenant_active_name','idx_products_tenant_name_trgm')) AS new_indexes,
    (SELECT COUNT(*) FROM pg_matviews WHERE matviewname IN ('mv_monthly_pl','mv_customer_aging')) AS matviews,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'refresh_enterprise_views') AS refresh_fn,
    (SELECT COUNT(*) FROM pg_constraint WHERE conname = 'chk_warehouse_stock_non_negative') AS stock_check`;
console.log("VERIFY:", JSON.stringify(checks[0]));
const refresh = await sql`SELECT refresh_enterprise_views()`;
console.log("REFRESH OK");
const pl = await sql`SELECT COUNT(*)::int AS rows FROM mv_monthly_pl`;
const aging = await sql`SELECT COUNT(*)::int AS rows FROM mv_customer_aging`;
console.log(
  "mv_monthly_pl rows:",
  pl[0].rows,
  "| mv_customer_aging rows:",
  aging[0].rows
);
process.exit(0);
