-- ====================================================================
-- Search Optimization — Migration 0013
-- ====================================================================
-- Purpose: close the pg_trgm GIN coverage gaps in the unified search layer
-- (globalSearch + beneficiaries search) so every ILIKE column probed by the
-- engines is index-backed, and add tenant-scoped btree companions that keep
-- autocomplete bounded even on 1-char queries (where trigram cannot engage).
-- Idempotent: safe to re-run (IF NOT EXISTS everywhere).
-- ====================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── GIN trigram indexes: columns probed by search but missing coverage ──
CREATE INDEX IF NOT EXISTS "idx_products_barcode_trgm" ON "products" USING gin ("barcode" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_customers_phone_trgm" ON "customers" USING gin ("phone" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_suppliers_phone_trgm" ON "suppliers" USING gin ("phone" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_transactions_notes_trgm" ON "transactions" USING gin ("notes" gin_trgm_ops);

-- ── Tenant-scoped btree companions for sub-trigram-length queries ──
CREATE INDEX IF NOT EXISTS "idx_customers_tenant_name" ON "customers" ("tenantId", "name");
CREATE INDEX IF NOT EXISTS "idx_suppliers_tenant_name" ON "suppliers" ("tenantId", "name");
CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_branch" ON "transactions" ("tenantId", "branchId");