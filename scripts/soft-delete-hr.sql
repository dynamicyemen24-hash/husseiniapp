-- Soft-delete support for HR core (employees, departments).
-- Idempotent: safe to re-run.

ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

CREATE INDEX IF NOT EXISTS "idx_departments_deleted" ON "departments" ("deleted_at");
CREATE INDEX IF NOT EXISTS "idx_employees_deleted" ON "employees" ("deleted_at");

-- Performance indexes for tenant-scoped, frequently filtered lookups.
CREATE INDEX IF NOT EXISTS "idx_employees_tenant_status" ON "employees" ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "idx_employees_tenant_deleted" ON "employees" ("tenantId", "deleted_at");
CREATE INDEX IF NOT EXISTS "idx_departments_tenant_deleted" ON "departments" ("tenantId", "deleted_at");
