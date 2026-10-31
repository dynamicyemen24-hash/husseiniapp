-- Link sales reps to sales invoices (Module A)
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "salesRepId" text;
