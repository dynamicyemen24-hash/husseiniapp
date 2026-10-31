-- 0030_invoice_order_flexibility.sql — مرونة الفواتير والأوامر (الإصدار 7.4.0)
-- ─────────────────────────────────────────────────────────────────────────
-- 1) وحدة قياس + ضريبة لكل سطر في فواتير المبيعات وأوامر المبيعات
-- 2) فهارس productId لتسريع البحث والتقارير على آلاف الفواتير
-- 3) جدول أسعار مرن (فرع/مستودع/دولة/وحدة) مع قيود سلبية
-- ملحوظة: كل عبارة idempotent (IF NOT EXISTS / DO $$) ليعمل بأمان على
-- قاعدة إنتاجية أو اختبارية أو فريدة.
ALTER TABLE "sales_invoice_items" ADD COLUMN IF NOT EXISTS "unitId" integer;--> statement-breakpoint
ALTER TABLE "sales_invoice_items" ADD COLUMN IF NOT EXISTS "taxPct" numeric(5,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoice_items" ADD COLUMN IF NOT EXISTS "taxCategoryId" integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_items_product" ON "sales_invoice_items" USING btree ("productId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_items_invoice_product" ON "sales_invoice_items" USING btree ("invoiceId","productId");--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "unitId" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "discount" numeric(15,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "taxPct" numeric(5,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_items_product" ON "order_items" USING btree ("productId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_items_order_product" ON "order_items" USING btree ("orderId","productId");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_price_lists" (
  "id" serial PRIMARY KEY NOT NULL,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenantId" integer NOT NULL,
  "productId" integer NOT NULL,
  "branchId" integer,
  "warehouseId" integer,
  "countryCode" varchar(2),
  "unitId" integer,
  "priceType" varchar(20) DEFAULT 'sale' NOT NULL,
  "price" numeric(15, 2) NOT NULL,
  "discountPct" numeric(5, 2) DEFAULT '0' NOT NULL,
  "effectiveFrom" timestamp,
  "effectiveTo" timestamp,
  "isActive" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "product_price_lists_GlobalId_unique" UNIQUE("GlobalId")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_productPriceLists_tenant" ON "product_price_lists" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_productPriceLists_product" ON "product_price_lists" USING btree ("productId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_productPriceLists_branch" ON "product_price_lists" USING btree ("branchId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_productPriceLists_warehouse" ON "product_price_lists" USING btree ("warehouseId");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_price_lists" ADD CONSTRAINT "productPriceLists_tenant_scope_unique" UNIQUE("tenantId","productId","priceType","branchId","warehouseId","countryCode","unitId");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_price_lists" ADD CONSTRAINT "chk_product_price_list_price_positive" CHECK ("price" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_price_lists" ADD CONSTRAINT "chk_product_price_list_tenant_not_null" CHECK ("tenantId" IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_price_lists" ADD CONSTRAINT "product_price_lists_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_price_lists" ADD CONSTRAINT "product_price_lists_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
