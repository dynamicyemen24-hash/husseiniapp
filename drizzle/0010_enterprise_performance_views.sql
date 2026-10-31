-- 0010_enterprise_performance_views.sql
-- ==================================================================
-- ALHUSAINIA — Enterprise Performance & Search Acceleration Layer
-- ==================================================================
-- Adds:
--   1. pg_trgm extension + GIN trigram indexes for real-time fuzzy search
--      across master data (products, accounts, customers, suppliers,
--      transactions narration) and invoice numbers.
--   2. Composite btree indexes for the hottest query paths already used by
--      Reports.tsx / WorkspaceDashboard.tsx / Inventory.tsx / Audit.tsx.
--   3. Live SQL VIEWs that power dashboards, statements and tracking screens:
--        v_account_balances      — trial-balance style balances per tenant
--        v_inventory_health     — stock levels vs reorder/min per warehouse
--        v_sales_trend          — daily/total sales revenue aggregates
--        v_activity_trace       — spatial-temporal audit trail (geo + device)
--        v_tenant_master_summary— multi-tenant/entity KPIs
--
-- Runner executes idempotently (CREATE INDEX IF NOT EXISTS / CREATE OR REPLACE VIEW).
--> statement-breakpoint

CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint

-- ── 1. GIN trigram indexes: master-data fuzzy search ─────────────────────
CREATE INDEX IF NOT EXISTS "idx_products_name_trgm" ON "products" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_namear_trgm" ON "products" USING gin ("nameAr" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_code_trgm" ON "products" USING gin ("code" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_accounts_name_trgm" ON "accounts" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_accounts_code_trgm" ON "accounts" USING gin ("code" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_name_trgm" ON "customers" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_code_trgm" ON "customers" USING gin ("code" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_suppliers_name_trgm" ON "suppliers" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_suppliers_code_trgm" ON "suppliers" USING gin ("code" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_narration_trgm" ON "transactions" USING gin ("narration" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_invoices_number_trgm" ON "sales_invoices" USING gin ("invoiceNumber" gin_trgm_ops);
--> statement-breakpoint

-- ── 2. Composite btree indexes for hot dashboard/report queries ──────────
CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_date_lifecycle" ON "transactions" ("tenantId", "transactionDate", "lifecycleStatus");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_date_status" ON "sales_invoices" ("tenantId", "invoiceDate", "status");
-- ── 3. Live business VIEWs ───────────────────────────────────────────────
-- v_account_balances — per-tenant account balances (trial-balance style).
CREATE OR REPLACE VIEW "v_account_balances" AS
SELECT
  a."tenantId",
  a."id" AS "accountId",
  a."code",
  a."name",
  a."type",
  COALESCE(SUM(CASE WHEN t."type" = 'debit'  AND t."isReversed" = false THEN t."baseAmount" ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN t."type" = 'credit' AND t."isReversed" = false THEN t."baseAmount" ELSE 0 END), 0) AS "balance"
FROM "accounts" a
LEFT JOIN "transactions" t ON t."accountId" = a."id"
GROUP BY a."tenantId", a."id", a."code", a."name", a."type";
--> statement-breakpoint

-- v_inventory_health — stock levels vs reorder/min per product+warehouse.
CREATE OR REPLACE VIEW "v_inventory_health" AS
SELECT
  ws."tenantId",
  ws."productId",
  ws."warehouseId",
  p."code" AS "productCode",
  p."name" AS "productName",
  p."nameAr" AS "productNameAr",
  ws."quantity",
  ws."reservedQty",
  ws."availableQty",
  COALESCE(p."reorderPoint", 0) AS "reorderPoint",
  COALESCE(p."minStock", 0) AS "minStock",
  CASE WHEN ws."availableQty" <= COALESCE(p."reorderPoint", 0) THEN true ELSE false END AS "needsReplenishment"
FROM "warehouse_stock" ws
JOIN "products" p ON p."id" = ws."productId";
--> statement-breakpoint

-- v_sales_trend — daily revenue aggregates for dashboards (tenant + branch).
CREATE OR REPLACE VIEW "v_sales_trend" AS
SELECT
  si."tenantId",
  si."branchId",
  DATE(si."invoiceDate") AS "saleDate",
  si."currency",
  COUNT(*) AS "invoiceCount",
  COALESCE(SUM(si."total"), 0) AS "grossTotal",
  COALESCE(SUM(si."discount"), 0) AS "totalDiscount",
  COALESCE(SUM(si."taxAmount"), 0) AS "totalTax",
  COALESCE(SUM(si."total" - si."discount" - si."taxAmount"), 0) AS "netTotal"
FROM "sales_invoices" si
WHERE si."status" IN ('paid', 'partial')
GROUP BY si."tenantId", si."branchId", DATE(si."invoiceDate"), si."currency";
--> statement-breakpoint

-- v_activity_trace — spatial-temporal audit trail (device + geo + hash chain).
CREATE OR REPLACE VIEW "v_activity_trace" AS
SELECT
  al."tenantId",
  al."userId",
  al."userName",
  al."action",
  al."entityType",
  al."entityId",
  al."ipAddress",
  al."country",
  al."city",
  al."lat",
  al."lng",
  al."deviceId",
  d."name" AS "deviceName",
  d."type" AS "deviceType",
  al."currentHash",
  al."chainSequence",
  al."createdAt"
FROM "activity_logs" al
LEFT JOIN "devices" d ON d."id" = al."deviceId";
--> statement-breakpoint

-- v_tenant_master_summary — multi-tenant/entity KPIs for the master dashboard.
CREATE OR REPLACE VIEW "v_tenant_master_summary" AS
SELECT
  t."id" AS "tenantId",
  t."name" AS "tenantName",
  t."code" AS "tenantCode",
  t."currency",
  t."country",
  (SELECT COUNT(*) FROM "branches" b WHERE b."tenantId" = t."id")            AS "branchCount",
  (SELECT COUNT(*) FROM "warehouses" w WHERE w."tenantId" = t."id")          AS "warehouseCount",
  (SELECT COUNT(*) FROM "currencies" c WHERE c."tenantId" = t."id")          AS "currencyCount",
  (SELECT COUNT(*) FROM "units" u WHERE u."tenantId" = t."id")               AS "uomCount",
  (SELECT COUNT(*) FROM "accounts" a WHERE a."tenantId" = t."id")            AS "accountCount",
  (SELECT COUNT(*) FROM "products" p WHERE p."tenantId" = t."id")            AS "productCount",
  (SELECT COUNT(*) FROM "customers" cu WHERE cu."tenantId" = t."id")         AS "customerCount",
  (SELECT COUNT(*) FROM "users" usr WHERE usr."tenantId" = t."id")           AS "userCount"
FROM "tenants" t;
--> statement-breakpoint
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_logs_tenant_created_geo" ON "activity_logs" ("tenantId", "createdAt", "country", "city");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_warehouse_stock_tenant_product" ON "warehouse_stock" ("tenantId", "productId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_open_balances_tenant_account" ON "opening_balances" ("tenantId", "accountId", "periodName");
