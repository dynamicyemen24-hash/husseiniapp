-- 0020 — Tenant-scoped document number uniqueness
-- ---------------------------------------------------------
-- Replaces the global column-level UNIQUE constraint on per-tenant
-- document numbers (invoice / order / quotation) with a composite
-- UNIQUE INDEX on (tenantId, number). Each tenant keeps an independent
-- numbering scheme; document numbers no longer collide across tenants.
--
-- Non-destructive: existing rows are preserved (no data rewrite).
-- Constraint drops/building are idempotent (safe to re-run locally).

DO $$ BEGIN
  ALTER TABLE "sales_invoices" DROP CONSTRAINT IF EXISTS "sales_invoices_invoiceNumber_unique";
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "purchase_invoices" DROP CONSTRAINT IF EXISTS "purchase_invoices_invoiceNumber_unique";
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "billing_invoices" DROP CONSTRAINT IF EXISTS "billing_invoices_invoiceNumber_unique";
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_orderNumber_unique";
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "quotations" DROP CONSTRAINT IF EXISTS "quotations_quotationNumber_unique";
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_salesInvoices_tenant_number" ON "sales_invoices" ("tenantId", "invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_purchaseInvoices_tenant_number" ON "purchase_invoices" ("tenantId", "invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_billingInvoices_tenant_number" ON "billing_invoices" ("tenantId", "invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_orders_tenant_number" ON "orders" ("tenantId", "orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_quotations_tenant_number" ON "quotations" ("tenantId", "quotationNumber");