-- Extend the existing global `currencies` table with tenant-scoping,
-- an exchange rate, and a per-tenant default flag. Idempotent.
ALTER TABLE "currencies" ADD COLUMN IF NOT EXISTS "tenantId" integer;
ALTER TABLE "currencies" ADD COLUMN IF NOT EXISTS "rate" numeric(18,8) NOT NULL DEFAULT 1;
ALTER TABLE "currencies" ADD COLUMN IF NOT EXISTS "isDefault" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "idx_currencies_tenant" ON "currencies" ("tenantId");
