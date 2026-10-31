-- Soft-delete support for commercial core (products, customers, suppliers).
-- Idempotent: safe to re-run.

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

CREATE INDEX IF NOT EXISTS "idx_products_deleted" ON "products" ("deleted_at");
CREATE INDEX IF NOT EXISTS "idx_customers_deleted" ON "customers" ("deleted_at");
CREATE INDEX IF NOT EXISTS "idx_suppliers_deleted" ON "suppliers" ("deleted_at");

-- Performance indexes for tenant-scoped, frequently filtered lookups.
CREATE INDEX IF NOT EXISTS "idx_products_tenant_deleted" ON "products" ("tenantId", "deleted_at");
CREATE INDEX IF NOT EXISTS "idx_customers_tenant_deleted" ON "customers" ("tenantId", "deleted_at");
CREATE INDEX IF NOT EXISTS "idx_suppliers_tenant_deleted" ON "suppliers" ("tenantId", "deleted_at");
