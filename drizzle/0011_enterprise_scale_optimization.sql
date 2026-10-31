-- ====================================================================
-- Enterprise Scale Optimization — Migration 0011 (REAL SCHEMA EDITION)
-- ====================================================================
-- Purpose: Optimize for millions of records with composite, partial, and
-- covering indexes; materialized aggregations; and storage tuning.
-- Written against the ACTUAL database schema (verified via
-- information_schema): journal_entries + transactions (no journal_lines),
-- sales_invoices/purchase_invoices (paidAmount), stock_movements,
-- warehouse_stock (not stock_levels), audit_logs, products.
-- ====================================================================
-- ----------------------------------------------------------------
-- COMPOSITE COVERING INDEXES for hot dashboard queries
-- ----------------------------------------------------------------
-- Journal KPI queries: tenant + posting date + branch scans
CREATE INDEX IF NOT EXISTS "idx_journal_entries_tenant_posted_branch" ON "journal_entries" USING btree ("tenantId", "postedAt" DESC, "branchId") INCLUDE ("totalAmount", "status")
WHERE "postedAt" IS NOT NULL;
-- Trial balance / GL lookups: transactions by account (lines live in transactions)
CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_account_date" ON "transactions" USING btree ("tenantId", "accountId", "transactionDate" DESC) INCLUDE ("amount", "type", "branchId")
WHERE "isReversed" = false;
CREATE INDEX IF NOT EXISTS "idx_transactions_journal_entry" ON "transactions" ("tenantId", "journalEntryId");
-- Aging reports (AR/AP): customer/supplier + due date on outstanding docs
CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_customer_due" ON "sales_invoices" USING btree ("tenantId", "customerId", "dueDate") INCLUDE ("total", "paidAmount", "status")
WHERE "status" NOT IN ('cancelled');
CREATE INDEX IF NOT EXISTS "idx_purchase_invoices_tenant_supplier_due" ON "purchase_invoices" USING btree ("tenantId", "supplierId", "dueDate") INCLUDE ("total", "paidAmount", "status")
WHERE "status" NOT IN ('cancelled');
-- Inventory movement history: product + warehouses + time
CREATE INDEX IF NOT EXISTS "idx_stock_movements_tenant_product_created" ON "stock_movements" USING btree ("tenantId", "productId", "createdAt" DESC) INCLUDE ("quantity", "unitCost", "type");
CREATE INDEX IF NOT EXISTS "idx_stock_movements_tenant_warehouse_created" ON "stock_movements" USING btree ("tenantId", "fromWarehouseId", "createdAt" DESC);
-- Current stock valuation: per warehouse-product combo
CREATE INDEX IF NOT EXISTS "idx_warehouse_stock_tenant_warehouse_product" ON "warehouse_stock" USING btree ("tenantId", "warehouseId", "productId") INCLUDE ("quantity", "reservedQty", "availableQty", "lastMovementAt");
-- ----------------------------------------------------------------
-- PARTIAL INDEXES for hot filters
-- ----------------------------------------------------------------
-- Active products only (catalog browsing + search)
CREATE INDEX IF NOT EXISTS "idx_products_tenant_active_name" ON "products" USING btree ("tenantId", "name") INCLUDE ("code", "salePrice", "categoryId")
WHERE "isActive" = true;
-- Open sales orders (any non-terminal status — no value-specific filter)
CREATE INDEX IF NOT EXISTS "idx_orders_tenant_status_created" ON "orders" USING btree ("tenantId", "status", "createdAt" DESC) INCLUDE ("customerId", "total");
-- Unposted journal entries (work in progress)
CREATE INDEX IF NOT EXISTS "idx_journal_entries_tenant_unposted" ON "journal_entries" USING btree ("tenantId", "createdAt" DESC) INCLUDE ("totalAmount", "status", "createdById")
WHERE "postedAt" IS NULL;
-- Low stock alerts (quantity at or below reorder point)
CREATE INDEX IF NOT EXISTS "idx_products_tenant_low_stock" ON "products" USING btree ("tenantId", "currentStock") INCLUDE ("name", "reorderPoint", "minStock")
WHERE "isActive" = true AND "reorderPoint" IS NOT NULL;
-- ----------------------------------------------------------------
-- GIN INDEXES for fast text search
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "idx_products_tenant_name_trgm" ON "products" USING gin ("name" gin_trgm_ops)
WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_action_created" ON "audit_logs" USING btree ("tenantId", "action", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_user_created" ON "audit_logs" USING btree ("tenantId", "userId", "createdAt" DESC);
-- ----------------------------------------------------------------
-- MATERIALIZED VIEW: monthly P&L (revenue vs expense per month)
-- ----------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS "mv_monthly_pl" AS
SELECT t."tenantId",
    date_trunc('month', t."transactionDate") AS "month",
    a."type" AS "accountType",
    SUM(t."amount") AS "totalAmount",
    COUNT(*) AS "entryCount"
FROM "transactions" t
JOIN "accounts" a ON a."id" = t."accountId"
WHERE t."isReversed" = false
    AND t."lifecycleStatus" = 'posted'
    AND a."type" IN ('revenue', 'expense')
GROUP BY t."tenantId",
    date_trunc('month', t."transactionDate"),
    a."type"
WITH NO DATA;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_mv_monthly_pl_pk" ON "mv_monthly_pl" ("tenantId", "month", "accountType");

-- ----------------------------------------------------------------
-- MATERIALIZED VIEW: customer aging buckets
-- ----------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS "mv_customer_aging" AS
SELECT si."tenantId",
    si."customerId",
    c."name" AS "customerName",
    COUNT(si."id") AS "invoiceCount",
    SUM(si."total" - si."paidAmount") AS "outstanding",
    SUM(CASE
        WHEN si."dueDate" >= CURRENT_DATE THEN si."total" - si."paidAmount"
        ELSE 0
    END) AS "current",
    SUM(CASE
        WHEN si."dueDate" < CURRENT_DATE
            AND si."dueDate" >= CURRENT_DATE - INTERVAL '30 days' THEN si."total" - si."paidAmount"
        ELSE 0
    END) AS "days30",
    SUM(CASE
        WHEN si."dueDate" < CURRENT_DATE - INTERVAL '30 days'
            AND si."dueDate" >= CURRENT_DATE - INTERVAL '60 days' THEN si."total" - si."paidAmount"
        ELSE 0
    END) AS "days60",
    SUM(CASE
        WHEN si."dueDate" < CURRENT_DATE - INTERVAL '60 days' THEN si."total" - si."paidAmount"
        ELSE 0
    END) AS "days90plus"
FROM "sales_invoices" si
JOIN "customers" c ON c."id" = si."customerId"
WHERE si."status" NOT IN ('cancelled')
    AND si."total" > si."paidAmount"
GROUP BY si."tenantId",
    si."customerId",
    c."name"
WITH NO DATA;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_mv_customer_aging_pk" ON "mv_customer_aging" ("tenantId", "customerId");
-- ----------------------------------------------------------------
-- FUNCTION: refresh materialized views concurrently
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_enterprise_views() RETURNS void AS $$ BEGIN
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_pl;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_aging;
EXCEPTION
WHEN OTHERS THEN -- First-time refresh without concurrent (view has no data yet)
REFRESH MATERIALIZED VIEW mv_monthly_pl;
REFRESH MATERIALIZED VIEW mv_customer_aging;
END;
$$ LANGUAGE plpgsql;
-- ----------------------------------------------------------------
-- STATISTICS: increase target for hot columns to improve query planning
-- ----------------------------------------------------------------
ALTER TABLE "journal_entries"
ALTER COLUMN "postedAt"
SET STATISTICS 1000;
ALTER TABLE "transactions"
ALTER COLUMN "accountId"
SET STATISTICS 1000;
ALTER TABLE "sales_invoices"
ALTER COLUMN "customerId"
SET STATISTICS 1000;
ALTER TABLE "stock_movements"
ALTER COLUMN "productId"
SET STATISTICS 1000;
ALTER TABLE "audit_logs"
ALTER COLUMN "createdAt"
SET STATISTICS 1000;
-- ----------------------------------------------------------------
-- AUTOVACUUM tuning for high-write tables
-- ----------------------------------------------------------------
ALTER TABLE "journal_entries"
SET (
        autovacuum_vacuum_scale_factor = 0.05,
        autovacuum_analyze_scale_factor = 0.02,
        autovacuum_vacuum_cost_limit = 1000
    );
ALTER TABLE "transactions"
SET (
        autovacuum_vacuum_scale_factor = 0.05,
        autovacuum_analyze_scale_factor = 0.02,
        autovacuum_vacuum_cost_limit = 1000
    );
ALTER TABLE "audit_logs"
SET (
        autovacuum_vacuum_scale_factor = 0.1,
        autovacuum_analyze_scale_factor = 0.05
    );
ALTER TABLE "stock_movements"
SET (
        autovacuum_vacuum_scale_factor = 0.05,
        autovacuum_analyze_scale_factor = 0.02
    );
-- ----------------------------------------------------------------
-- CONSTRAINT: prevent negative stock at DB level (defense in depth)
-- ----------------------------------------------------------------
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_warehouse_stock_non_negative'
) THEN
ALTER TABLE "warehouse_stock"
ADD CONSTRAINT "chk_warehouse_stock_non_negative" CHECK ("quantity" >= 0);
END IF;
END $$;
-- ----------------------------------------------------------------
-- RECORD: migration complete
-- ----------------------------------------------------------------
COMMENT ON MATERIALIZED VIEW "mv_monthly_pl" IS 'Enterprise monthly P&L aggregate — refresh via SELECT refresh_enterprise_views()';
COMMENT ON MATERIALIZED VIEW "mv_customer_aging" IS 'Customer aging buckets — refresh hourly via cron';
