ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "orderId" integer;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_salesInvoices_order" ON "sales_invoices" USING btree ("orderId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_salesInvoices_tenant_order" ON "sales_invoices" USING btree ("tenantId", "orderId") WHERE "orderId" IS NOT NULL;