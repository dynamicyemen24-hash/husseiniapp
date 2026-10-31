-- ====================================================================
-- 0023_nuclear_fortress.sql — Tenant Isolation Nuclear Fortress
-- ====================================================================
-- Goal: defense-in-depth tenant isolation with ZERO production breakage.
-- Every statement is additive + idempotent (IF NOT EXISTS / pg_catalog
-- guards / CREATE OR REPLACE). No DROP / TRUNCATE / rewrites.
--
-- Audit baseline (drizzle/schema.ts, ~6843 lines):
--   ✅ unique(tenantId, invoiceNumber) EXISTS on sales/purchase/billing
--      invoices, orders, quotations (schema uniqueIndex + 0020 migration).
--   ✅ check(quantity >= 0 / reserved >= 0 / available >= 0) EXISTS on
--      warehouse_stock. check(amount >= 0) EXISTS on transactions.
--   ❌ check(products.currentStock >= 0) MISSING  → added below (NOT VALID).
--   ❌ debit == credit balance constraint MISSING on voucher_lines and on
--      transactions-per-journal → added as DEFERRABLE constraint triggers.
--   ❌ composite tenant-scoped FKs MISSING — every FK is single-column
--      .references(id), so cross-tenant linkage is possible at DB level
--      (today enforced only in app code via assertRefsInTenant).
--      → added as validate_same_tenant() BEFORE triggers.
--   ❌ idempotency_keys TABLE missing — 0022 added only nullable columns
--      with GLOBAL unique indexes (cross-tenant key collision possible).
--      → dedicated table + tenant-scoped composite unique indexes added.
--
-- RLS design note: policies are FAIL-CLOSED
--   ("tenantId" = nullif(current_setting('app.tenant_id', true), '')::int)
-- but only plain ENABLE (NOT FORCE) is used, so the table-owner role used
-- by the app today keeps working unchanged. RLS becomes actively enforced
-- for a least-privilege app role — or after a future ALTER ... FORCE —
-- while server/_core/rls.ts `withTenantTx` already sets the GUC via
-- SET LOCAL on every critical transaction (see posRouter.createSale).
-- ====================================================================

--> statement-breakpoint
-- ── (ه) Dedicated idempotency ledger (0022 had columns only) ─────────
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "id" serial PRIMARY KEY,
  "tenantId" integer NOT NULL REFERENCES "tenants" ("id"),
  "key" varchar(255) NOT NULL,
  "scope" varchar(80) NOT NULL DEFAULT 'default',
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "responseHash" varchar(128),
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_idempotency_keys_tenant_key"
  ON "idempotency_keys" ("tenantId", "key");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_idempotency_keys_expires"
  ON "idempotency_keys" ("expiresAt");

 --> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_idempotency_keys_tenant_created"
  ON "idempotency_keys" ("tenantId", "createdAt" DESC);

-- ── (ي) World-class document engine — idempotent + RLS ───────────
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "intermediary_parties" (
  "id" serial PRIMARY KEY,
  "tenantId" integer NOT NULL REFERENCES "tenants" ("id"),
  "partyRole" varchar(20) NOT NULL,
  "partyType" varchar(20) NOT NULL DEFAULT 'person',
  "code" varchar(50),
  "name" varchar(255) NOT NULL,
  "nameAr" varchar(255),
  "email" varchar(255),
  "phone" varchar(50),
  "commissionValue" decimal(15,2) NOT NULL DEFAULT '0',
  "creditLimit" decimal(15,2) NOT NULL DEFAULT '0',
  "currentBalance" decimal(15,2) NOT NULL DEFAULT '0',
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_intermediaryParties_code_tenant"
  ON "intermediary_parties" ("code", "tenantId");
--> statement-breakpoint
ALTER TABLE "intermediary_parties" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_intermediaryParties_tenant_id"
  ON "intermediary_parties" ("tenantId", "id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_party_links" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "tenantId" integer NOT NULL REFERENCES "tenants" ("id"),
  "partyId" integer NOT NULL REFERENCES "intermediary_parties" ("id"),
  "sourceType" varchar(20) NOT NULL,
  "sourceId" integer NOT NULL,
  "role" varchar(50) NOT NULL,
  "notes" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "serverVersion" integer NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_docPartyLinks_tenant"
  ON "document_party_links" ("tenantId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_docPartyLinks_source"
  ON "document_party_links" ("sourceType", "sourceId");
--> statement-breakpoint
ALTER TABLE "document_party_links" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_expenses" (
  "id" serial PRIMARY KEY,
  "tenantId" integer NOT NULL REFERENCES "tenants" ("id"),
  "documentType" varchar(50) NOT NULL,
  "documentId" integer NOT NULL,
  "category" varchar(20) NOT NULL,
  "amount" decimal(15,2) NOT NULL,
  "currency" varchar(10) NOT NULL DEFAULT 'YER',
  "exchangeRate" decimal(18,8) NOT NULL DEFAULT '1',
  "isIncludedInTotal" boolean NOT NULL DEFAULT true,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "createdAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "document_expenses" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_docExpenses_tenant_document"
  ON "document_expenses" ("tenantId", "documentType", "documentId");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotions" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "tenantId" integer NOT NULL REFERENCES "tenants" ("id"),
  "code" varchar(50),
  "name" varchar(255) NOT NULL,
  "nameAr" varchar(255),
  "type" varchar(20) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'draft',
  "value" decimal(15,4),
  "minQuantity" integer NOT NULL DEFAULT 0,
  "maxQuantity" integer,
  "productIds" text,
  "categoryIds" text,
  "startDate" timestamp NOT NULL,
  "endDate" timestamp NOT NULL,
  "applicableTo" varchar(20) NOT NULL DEFAULT 'all',
  "partyId" integer REFERENCES "intermediary_parties" ("id"),
  "maxUses" integer,
  "currentUses" integer NOT NULL DEFAULT 0,
  "stackable" boolean NOT NULL DEFAULT false,
  "notes" text,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "promotions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "approval_queues" (
  "id" serial PRIMARY KEY,
  "tenantId" integer NOT NULL REFERENCES "tenants" ("id"),
  "documentType" varchar(50) NOT NULL,
  "documentId" integer NOT NULL,
  "action" varchar(50) NOT NULL,
  "priority" varchar(20) NOT NULL DEFAULT 'normal',
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "requestedById" integer,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "approval_queues" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_approvalQueues_status" ON "approval_queues" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "line_item_history" (
  "id" serial PRIMARY KEY,
  "tenantId" integer NOT NULL REFERENCES "tenants" ("id"),
  "documentType" varchar(50) NOT NULL,
  "documentId" integer NOT NULL,
  "action" varchar(20) NOT NULL,
  "performedBy" integer,
  "performedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "line_item_history" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flexible_line_items" (
  "id" serial PRIMARY KEY,
  "tenantId" integer NOT NULL REFERENCES "tenants" ("id"),
  "documentType" varchar(50) NOT NULL,
  "documentId" integer NOT NULL,
  "lineOrder" integer NOT NULL DEFAULT 0,
  "quantity" decimal(15,4) NOT NULL DEFAULT '0',
  "unitPrice" decimal(15,4) NOT NULL DEFAULT '0',
  "total" decimal(15,2) NOT NULL DEFAULT '0',
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "createdAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "flexible_line_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_flexibleLines_document"
  ON "flexible_line_items" ("documentType", "documentId");

--> statement-breakpoint
-- ── (أ) Row-Level Security: ENABLE + tenant_isolation policy ─────────
-- Defensive loop: skips tables/columns that do not exist (never fails).
DO $do$
DECLARE
  t text;
  rt regclass;
  has_tenant_col boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'accounts', 'branches', 'transactions', 'journal_entries',
    'products', 'warehouses', 'warehouse_stock', 'stock_movements',
    'stock_adjustments', 'warehouse_transfers', 'customers', 'suppliers',
     'sales_invoices', 'purchase_invoices', 'orders', 'payments',
     'billing_invoices', 'payment_history', 'vouchers', 'voucher_lines',
     'idempotency_keys', 'intermediary_parties',
     'document_party_links', 'document_expenses', 'promotions',
     'approval_queues', 'line_item_history', 'flexible_line_items'
  ] LOOP
    BEGIN
      rt := to_regclass(format('public.%I', t));
    EXCEPTION WHEN invalid_name THEN
      CONTINUE;
    END;
    IF rt IS NULL THEN CONTINUE; END IF;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenantId'
    ) INTO has_tenant_col;
    IF NOT has_tenant_col THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', rt);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation' AND polrelid = rt
    ) THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %s FOR ALL TO PUBLIC ' ||
        'USING (%I = nullif(current_setting(%L, true), %L)::integer) ' ||
        'WITH CHECK (%I = nullif(current_setting(%L, true), %L)::integer)',
        rt,
        'tenantId', 'app.tenant_id', '',
        'tenantId', 'app.tenant_id', ''
      );
    END IF;
  END LOOP;
END;
$do$;

--> statement-breakpoint
-- ── (ب) Generic same-tenant FK guard ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_same_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
DECLARE
  parent_table text := TG_ARGV[0];
  child_fk_col text := TG_ARGV[1];
  fk_value     integer;
  child_tenant integer;
  parent_tenant integer;
BEGIN
  EXECUTE format('SELECT ($1).%I', child_fk_col) USING NEW INTO fk_value;
  IF fk_value IS NULL THEN RETURN NEW; END IF;
  EXECUTE format('SELECT ($1).%I', 'tenantId') USING NEW INTO child_tenant;
  BEGIN
    EXECUTE format('SELECT %I FROM %I WHERE %I = $1', 'tenantId', parent_table, 'id')
      USING fk_value INTO parent_tenant;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    RETURN NEW;
  END;
  IF parent_tenant IS NULL THEN
    RAISE EXCEPTION 'CROSS_TENANT_DENIED: %.id=% not found', parent_table, fk_value
      USING ERRCODE = '23503';
  END IF;
  IF parent_tenant IS DISTINCT FROM child_tenant THEN
    RAISE EXCEPTION 'CROSS_TENANT_DENIED: % id=% belongs to tenant %, not tenant %',
      parent_table, fk_value, parent_tenant, child_tenant
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$func$;

--> statement-breakpoint
-- ── (ب) Attach the guard to sales / purchase / inventory write paths ─
DO $do$
DECLARE
  s text[];
  trg text;
  child regclass;
  parent regclass;
BEGIN
  FOREACH s SLICE 1 IN ARRAY ARRAY[
    ARRAY['sales_invoices',    'customerId',      'customers'],
    ARRAY['sales_invoices',    'branchId',        'branches'],
    ARRAY['sales_invoices',    'warehouseId',     'warehouses'],
    ARRAY['purchase_invoices', 'supplierId',      'suppliers'],
    ARRAY['purchase_invoices', 'branchId',        'branches'],
    ARRAY['purchase_invoices', 'warehouseId',     'warehouses'],
    ARRAY['orders',            'customerId',      'customers'],
    ARRAY['transactions',      'accountId',       'accounts'],
    ARRAY['transactions',      'branchId',        'branches'],
    ARRAY['transactions',      'journalEntryId',  'journal_entries'],
    ARRAY['stock_movements',   'productId',       'products'],
    ARRAY['stock_movements',   'fromWarehouseId', 'warehouses'],
    ARRAY['stock_movements',   'toWarehouseId',   'warehouses'],
    ARRAY['warehouse_stock',   'productId',       'products'],
    ARRAY['warehouse_stock',   'warehouseId',     'warehouses']
  ] LOOP
    child := to_regclass(format('public.%I', s[1]));
    parent := to_regclass(format('public.%I', s[3]));
    IF child IS NULL OR parent IS NULL THEN CONTINUE; END IF;
    -- Live-schema drift guard: skip when the FK column does not exist
    -- (e.g. legacy snake_case vs camelCase). Never fail the migration.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = s[1] AND column_name = s[2]
    ) THEN CONTINUE; END IF;
    trg := 'trg_' || s[1] || '_' || s[2] || '_same_tenant';
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = trg) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF %I ON %s ' ||
        'FOR EACH ROW EXECUTE FUNCTION public.validate_same_tenant(%L, %L)',
        trg, s[2], child, s[3], s[2]
      );
    END IF;
  END LOOP;
END;
$do$;

--> statement-breakpoint
-- ── (ب2) Double-entry balance: voucher debit must equal credit ───────
-- Deferred to COMMIT so multi-line inserts never trip on intermediate
-- states. Fires only for vouchers actually touched by the write.
CREATE OR REPLACE FUNCTION public.validate_voucher_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
DECLARE
  vid integer;
  d numeric;
  c numeric;
BEGIN
  vid := CASE WHEN TG_OP = 'DELETE' THEN OLD."voucherId" ELSE NEW."voucherId" END;
  IF vid IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(SUM("debitAmount"), 0), COALESCE(SUM("creditAmount"), 0)
    INTO d, c FROM "voucher_lines" WHERE "voucherId" = vid;
  IF d <> c THEN
    RAISE EXCEPTION 'UNBALANCED_VOUCHER: voucher % debit % != credit %', vid, d, c
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$func$;

--> statement-breakpoint
-- ── (ب2) Journal balance: per-journal debit must equal credit ────────
CREATE OR REPLACE FUNCTION public.validate_journal_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
DECLARE
  jid integer;
  d numeric;
  c numeric;
BEGIN
  jid := CASE WHEN TG_OP = 'DELETE' THEN OLD."journalEntryId" ELSE NEW."journalEntryId" END;
  IF jid IS NULL THEN RETURN NULL; END IF;
  SELECT
    COALESCE(SUM(CASE WHEN "type"::text = 'debit'  THEN "amount" ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN "type"::text = 'credit' THEN "amount" ELSE 0 END), 0)
    INTO d, c FROM "transactions" WHERE "journalEntryId" = jid;
  IF d <> c THEN
    RAISE EXCEPTION 'UNBALANCED_JOURNAL: journal_entry % debit % != credit %', jid, d, c
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$func$;

--> statement-breakpoint
DO $do$
BEGIN
  IF to_regclass('public."voucher_lines"') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_voucher_lines_balanced') THEN
    EXECUTE 'CREATE CONSTRAINT TRIGGER trg_voucher_lines_balanced ' ||
      'AFTER INSERT OR UPDATE OR DELETE ON "voucher_lines" ' ||
      'DEFERRABLE INITIALLY DEFERRED FOR EACH ROW ' ||
      'EXECUTE FUNCTION public.validate_voucher_balance()';
  END IF;
  IF to_regclass('public."transactions"') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_transactions_journal_balanced') THEN
    EXECUTE 'CREATE CONSTRAINT TRIGGER trg_transactions_journal_balanced ' ||
      'AFTER INSERT OR UPDATE OR DELETE ON "transactions" ' ||
      'DEFERRABLE INITIALLY DEFERRED FOR EACH ROW ' ||
      'EXECUTE FUNCTION public.validate_journal_balance()';
  END IF;
END;
$do$;

--> statement-breakpoint
-- ── (ج) products.currentStock can never go negative for NEW writes ───
-- NOT VALID: existing rows (if any violate) do not block the migration;
-- every future INSERT/UPDATE is enforced. Run
--   ALTER TABLE "products" VALIDATE CONSTRAINT chk_products_current_stock_nonneg;
-- during a maintenance window after cleaning legacy negatives.
DO $do$
BEGIN
  IF to_regclass('public."products"') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_current_stock_nonneg') THEN
    ALTER TABLE "products"
      ADD CONSTRAINT chk_products_current_stock_nonneg CHECK ("currentStock" >= 0) NOT VALID;
  END IF;
END;
$do$;

--> statement-breakpoint
-- ── (د) Hot-path composite indexes (tenantId, id / createdAt) ────────
CREATE INDEX IF NOT EXISTS "idx_nf_sales_invoices_tenant_id"
  ON "sales_invoices" ("tenantId", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_sales_invoices_tenant_created"
  ON "sales_invoices" ("tenantId", "createdAt" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_purchase_invoices_tenant_id"
  ON "purchase_invoices" ("tenantId", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_purchase_invoices_tenant_created"
  ON "purchase_invoices" ("tenantId", "createdAt" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_journal_entries_tenant_id"
  ON "journal_entries" ("tenantId", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_journal_entries_tenant_created"
  ON "journal_entries" ("tenantId", "createdAt" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_transactions_tenant_id"
  ON "transactions" ("tenantId", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_transactions_tenant_created"
  ON "transactions" ("tenantId", "createdAt" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_stock_movements_tenant_id"
  ON "stock_movements" ("tenantId", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_stock_movements_tenant_created"
  ON "stock_movements" ("tenantId", "createdAt" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_warehouse_stock_tenant_id"
  ON "warehouse_stock" ("tenantId", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_warehouse_stock_tenant_created"
  ON "warehouse_stock" ("tenantId", "createdAt" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_orders_tenant_id"
  ON "orders" ("tenantId", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_orders_tenant_created"
  ON "orders" ("tenantId", "createdAt" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_products_tenant_id"
  ON "products" ("tenantId", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_products_tenant_created"
  ON "products" ("tenantId", "createdAt" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nf_vouchers_tenant_id"
  ON "vouchers" ("tenantId", "id");
--> statement-breakpoint
-- vouchers uses snake_case created_at live (not createdAt) — guarded.
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vouchers' AND column_name='created_at')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='idx_nf_vouchers_tenant_created') THEN
    EXECUTE 'CREATE INDEX "idx_nf_vouchers_tenant_created" ON "vouchers" ("tenantId", "created_at" DESC)';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vouchers' AND column_name='createdAt')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='idx_nf_vouchers_tenant_created') THEN
    EXECUTE 'CREATE INDEX "idx_nf_vouchers_tenant_created" ON "vouchers" ("tenantId", "createdAt" DESC)';
  END IF;
END;
$do$;

--> statement-breakpoint
-- ── (ه2) Tenant-scoped idempotency for 0022 columns ───────────────────
-- 0022 created GLOBAL unique indexes on idempotency_key, so tenant A key
-- "abc" blocks tenant B key "abc". These composite indexes scope the key
-- per tenant (additive; the old indexes are left untouched on purpose).
CREATE UNIQUE INDEX IF NOT EXISTS "uq_payments_tenant_idem"
  ON "payments" ("tenantId", "idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_orders_tenant_idem"
  ON "orders" ("tenantId", "idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_billing_invoices_tenant_idem"
  ON "billing_invoices" ("tenantId", "idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_payment_history_tenant_idem"
  ON "payment_history" ("tenantId", "idempotency_key");
-- NOTE: webhook_deliveries.idempotency_key intentionally NOT scoped here:
-- that table has no "tenantId" column (global infra table).
