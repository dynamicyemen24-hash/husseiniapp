-- Migration 0007: remove dangerous default tenantId=1 on branches (prevents silent cross-tenant leakage)
ALTER TABLE "branches" ALTER COLUMN "tenantId" DROP DEFAULT;
--> statement-breakpoint
-- ensure no check needed; keep chk_branch_tenant_not_null
