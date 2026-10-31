-- ────────────────────────────────────────────────────────────────────────────
-- 0032 — Performance: composite indexes for hot read paths
-- ────────────────────────────────────────────────────────────────────────────
-- These indexes back the queries the platform runs on every screen load:
--   • appointments list  → (tenantId, scheduled_date) and the filtered variants
--   • fiscal periods list → (tenantId, startDate)
--   • cost centers list  → (tenantId, code)
--   • products list      → (tenantId, code, deleted_at)
-- All statements are idempotent so a re-run is harmless.

CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_date"
  ON "appointments" ("tenantId", "scheduled_date");

CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_patient_date"
  ON "appointments" ("tenantId", "patient_id", "scheduled_date");

CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_provider_date"
  ON "appointments" ("tenantId", "provider_id", "scheduled_date");

CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_status_date"
  ON "appointments" ("tenantId", "status", "scheduled_date");

CREATE INDEX IF NOT EXISTS "idx_fiscal_periods_tenant_start"
  ON "fiscal_periods" ("tenantId", "startDate");

CREATE INDEX IF NOT EXISTS "idx_cost_centers_tenant_code"
  ON "cost_centers" ("tenantId", "code");

CREATE INDEX IF NOT EXISTS "idx_products_tenant_code_deleted"
  ON "products" ("tenantId", "code", "deleted_at");
