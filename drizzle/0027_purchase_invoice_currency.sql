ALTER TABLE "purchase_invoices"
  ADD COLUMN IF NOT EXISTS "currency" varchar(10) NOT NULL DEFAULT 'YER';
