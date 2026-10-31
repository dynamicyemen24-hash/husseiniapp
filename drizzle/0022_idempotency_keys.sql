-- 0022_idempotency_keys.sql
-- Adds nullable idempotency_key columns + unique indexes to prevent duplicate
-- processing of payments, orders, billing invoices, payment history and
-- webhook deliveries. NULL keys are allowed (PostgreSQL unique B-tree indexes
-- ignore NULLs) so legacy/existing rows stay valid and idempotency remains
-- opt-in per call site.
-- All statements are idempotent (IF NOT EXISTS); no DROP/TRUNCATE.

--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(255);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_key_unique" ON "payments" ("idempotency_key");

--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(255);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_unique" ON "orders" ("idempotency_key");

--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(255);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billingInvoices_idempotency_key_unique" ON "billing_invoices" ("idempotency_key");

--> statement-breakpoint
ALTER TABLE "payment_history" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(255);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "paymentHistory_idempotency_key_unique" ON "payment_history" ("idempotency_key");

--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(255);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "webhookDeliveries_idempotency_key_unique" ON "webhook_deliveries" ("idempotency_key");