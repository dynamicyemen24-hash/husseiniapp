-- 0029: restore the default tenant's real identity.
-- The DEFAULT tenant row was created with the "Default Tenant" placeholder name,
-- and the unguarded legacy-default replacement in seedDefaultAccountsForTenant
-- propagated that placeholder into settings.institutionName (invoices, reports
-- and the settings screen then displayed the placeholder instead of the real
-- institution name). Both repairs below are strictly conditional and idempotent:
-- they only touch rows that still carry the placeholder, so tenants that were
-- genuinely renamed are never modified.
UPDATE "tenants"
SET "name" = 'مؤسسة الحسينية لخدمات الأعمال', "updatedAt" = now()
WHERE "code" = 'DEFAULT' AND "name" = 'Default Tenant';
--> statement-breakpoint
UPDATE "settings"
SET "institutionName" = 'مؤسسة الحسينية لخدمات الأعمال',
    "notes" = REPLACE(COALESCE("notes", ''), 'Default Tenant', 'مؤسسة الحسينية لخدمات الأعمال'),
    "updatedAt" = now()
WHERE "institutionName" IN ('Default Tenant', 'المؤسسة')
  AND "tenantId" IN (
    SELECT "id" FROM "tenants" WHERE "code" = 'DEFAULT' OR "name" = 'Default Tenant'
  );
