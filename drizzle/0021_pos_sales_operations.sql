-- 0021_pos_sales_operations.sql
-- عمليات نقطة البيع: النقدية داخل الوردية، المرتجعات/الاستبدالات، الفواتير المعلقة.
-- كل الأوامر Idempotent (IF NOT EXISTS) ولا تحتوي على أي DROP/TRUNCATE.

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_cash_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenantId" integer NOT NULL,
  "sessionId" integer NOT NULL,
  "type" varchar(10) NOT NULL,
  "amount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "reason" varchar(255) NOT NULL,
  "notes" text,
  "createdById" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "serverVersion" integer DEFAULT 1 NOT NULL,
  "lastSyncAt" timestamp,
  "conflictState" varchar(20) DEFAULT 'none',
  "aggregateId" uuid,
  "currencyId" integer,
  CONSTRAINT "pos_cash_events_GlobalId_unique" UNIQUE ("GlobalId"),
  CONSTRAINT "chk_pos_cash_amount_positive" CHECK ("amount" >= 0)
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_cash_events_tenant" ON "pos_cash_events" ("tenantId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_cash_events_session" ON "pos_cash_events" ("sessionId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_cash_events_currency" ON "pos_cash_events" ("currencyId");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_returns" (
  "id" serial PRIMARY KEY NOT NULL,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenantId" integer NOT NULL,
  "returnNumber" varchar(50) NOT NULL,
  "originalInvoiceId" integer NOT NULL,
  "originalInvoiceNumber" varchar(50),
  "customerId" integer,
  "branchId" integer,
  "sessionId" integer,
  "refundMethod" payment_method DEFAULT 'cash',
  "refundReference" varchar(100),
  "reason" varchar(255),
  "status" varchar(20) DEFAULT 'completed' NOT NULL,
  "refundAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "createdById" integer NOT NULL,
  "processedById" integer,
  "notes" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "processedAt" timestamp,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "serverVersion" integer DEFAULT 1 NOT NULL,
  "lastSyncAt" timestamp,
  "conflictState" varchar(20) DEFAULT 'none',
  "aggregateId" uuid,
  "currencyId" integer,
  CONSTRAINT "pos_returns_GlobalId_unique" UNIQUE ("GlobalId"),
  CONSTRAINT "chk_pos_return_refund_not_negative" CHECK ("refundAmount" >= 0)
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_returns_tenant" ON "pos_returns" ("tenantId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_returns_invoice" ON "pos_returns" ("originalInvoiceId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_returns_session" ON "pos_returns" ("sessionId");

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_pos_returns_tenant_number" ON "pos_returns" ("tenantId", "returnNumber");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_returns_currency" ON "pos_returns" ("currencyId");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_return_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "returnId" integer NOT NULL,
  "productId" integer NOT NULL,
  "productName" varchar(255) NOT NULL,
  "quantity" integer NOT NULL,
  "unitPrice" numeric(15, 2) NOT NULL,
  "discount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "taxAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "total" numeric(15, 2) NOT NULL,
  "restock" boolean DEFAULT true NOT NULL,
  "condition" varchar(20) DEFAULT 'new' NOT NULL,
  "serialNumbers" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_return_items_return" ON "pos_return_items" ("returnId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_return_items_product" ON "pos_return_items" ("productId");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_held_carts" (
  "id" serial PRIMARY KEY NOT NULL,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenantId" integer NOT NULL,
  "code" varchar(40) NOT NULL,
  "heldById" integer NOT NULL,
  "branchId" integer,
  "sessionId" integer,
  "customerId" integer,
  "snapshot" text NOT NULL,
  "total" numeric(15, 2) DEFAULT '0' NOT NULL,
  "itemCount" integer DEFAULT 0 NOT NULL,
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "notes" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "expiresAt" timestamp,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "serverVersion" integer DEFAULT 1 NOT NULL,
  "lastSyncAt" timestamp,
  "conflictState" varchar(20) DEFAULT 'none',
  "aggregateId" uuid,
  "currencyId" integer,
  CONSTRAINT "pos_held_carts_GlobalId_unique" UNIQUE ("GlobalId")
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_held_carts_tenant" ON "pos_held_carts" ("tenantId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_held_carts_held_by" ON "pos_held_carts" ("heldById");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_held_carts_status" ON "pos_held_carts" ("status");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_held_carts_currency" ON "pos_held_carts" ("currencyId");

--> statement-breakpoint
-- نقاط الولاء للعملاء (لقطة ترحيل آمنة: لا تُسقط أي شيء موجود)
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "loyaltyPoints" integer DEFAULT 0 NOT NULL;