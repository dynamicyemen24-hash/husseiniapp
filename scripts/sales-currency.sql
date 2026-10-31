ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "currency" varchar(10) NOT NULL DEFAULT 'YER';
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "currencyRate" decimal(18, 8) NOT NULL DEFAULT '1';
