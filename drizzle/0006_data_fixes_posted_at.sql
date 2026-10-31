-- 0006: data fixes required before the strict CHECK constraints validate.
-- Some legacy paid/cancelled invoices were created before "postedAt" tracking
-- existed, which makes chk_sales_invoice_status_posted_immutable fail with
-- "violated by some row". Backfill postedAt from updatedAt/createdAt first.
UPDATE "sales_invoices"
SET "postedAt" = COALESCE("sales_invoices"."updatedAt", "sales_invoices"."createdAt", now())
WHERE "sales_invoices"."status" IN ('paid', 'cancelled')
  AND "sales_invoices"."postedAt" IS NULL;
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoice_status_posted_immutable" CHECK (
  CASE WHEN "sales_invoices"."status" IN ('paid', 'cancelled') THEN
    "sales_invoices"."postedAt" IS NOT NULL
  ELSE TRUE END
);