-- ═══════════════════════════════════════════════════════════════════
-- 0019 — Counterparty regional compliance (YE/SA/GCC/world)
-- Adds country, tax identity, commercial registration, B2B/B2C and
-- payment-terms columns to customers + suppliers. All nullable/defaulted
-- so existing rows stay valid; no backfill required.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "country" varchar(100) DEFAULT 'اليمن';
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "countryCode" varchar(2) DEFAULT 'YE';
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "taxIdType" varchar(20) DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "isVatRegistered" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "commercialReg" varchar(100);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "idNumber" varchar(100);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "postalCode" varchar(20);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "buyerType" varchar(10) DEFAULT 'b2b';
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "paymentTermsDays" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_country" ON "customers" USING btree ("countryCode");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customers" ADD CONSTRAINT "chk_customer_payment_terms_not_negative" CHECK ("paymentTermsDays" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "country" varchar(100) DEFAULT 'اليمن';
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "countryCode" varchar(2) DEFAULT 'YE';
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "taxIdType" varchar(20) DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "isVatRegistered" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "commercialReg" varchar(100);
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "idNumber" varchar(100);
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "postalCode" varchar(20);
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "buyerType" varchar(10) DEFAULT 'b2b';
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "paymentTermsDays" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_suppliers_country" ON "suppliers" USING btree ("countryCode");
