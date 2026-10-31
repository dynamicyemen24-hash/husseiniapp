-- 0025 — دورة التوريد الكاملة: أوامر الشراء وسندات الاستلام (الطابق الثالث للمطابقة الثلاثية).
-- PO ← GRN ← فاتورة شراء. كل الأوامر Idempotent (IF NOT EXISTS) بلا DROP/TRUNCATE.

--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'purchase_order_status' AND n.nspname = 'public') THEN CREATE TYPE "public"."purchase_order_status" AS ENUM('draft', 'issued', 'partially_received', 'received', 'cancelled', 'closed'); END IF; END $$;

--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'grn_status' AND n.nspname = 'public') THEN CREATE TYPE "public"."grn_status" AS ENUM('draft', 'posted', 'cancelled'); END IF; END $$;

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_orders" (
  "id" serial PRIMARY KEY NOT NULL,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenantId" integer NOT NULL,
  "country" varchar(100),
  "workSiteId" integer,
  "deviceId" integer,
  "lat" numeric(10, 7),
  "lng" numeric(10, 7),
  "globalCode" varchar(160),
  "serverVersion" integer DEFAULT 1 NOT NULL,
  "lastSyncAt" timestamp,
  "conflictState" varchar(20) DEFAULT 'none',
  "aggregateId" uuid,
  "poNumber" varchar(50) NOT NULL,
  "supplierId" integer NOT NULL,
  "branchId" integer,
  "costCenterId" integer,
  "warehouseId" integer,
  "projectId" integer,
  "requisitionId" integer,
  "status" "public"."purchase_order_status" DEFAULT 'draft' NOT NULL,
  "expectedDeliveryDate" timestamp,
  "notes" text,
  "subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
  "taxRate" numeric(5, 2) DEFAULT '0' NOT NULL,
  "taxAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "discount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "total" numeric(15, 2) DEFAULT '0' NOT NULL,
  "currencyId" integer,
  "exchangeRate" numeric(18, 8) DEFAULT '1' NOT NULL,
  "baseAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "issuedById" integer,
  "issuedAt" timestamp,
  "cancelledAt" timestamp,
  "cancelledById" integer,
  "cancelReason" varchar(255),
  "closedAt" timestamp,
  "idempotency_key" varchar(255),
  "userId" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "purchaseOrders_GlobalId_unique" UNIQUE ("GlobalId"),
  CONSTRAINT "purchaseOrders_gc_tenant_unique" UNIQUE ("tenantId", "globalCode"),
  CONSTRAINT "uq_purchaseOrders_tenant_number" UNIQUE ("tenantId", "poNumber"),
  CONSTRAINT "purchaseOrders_idempotency_key_unique" UNIQUE ("idempotency_key"),
  CONSTRAINT "chk_purchase_order_total_not_negative" CHECK ("total" >= 0),
  CONSTRAINT "chk_purchase_order_subtotal_not_negative" CHECK ("subtotal" >= 0),
  CONSTRAINT "chk_purchase_order_tenant_not_null" CHECK ("tenantId" IS NOT NULL)
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchaseOrders_tenant" ON "purchase_orders" ("tenantId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchaseOrders_supplier" ON "purchase_orders" ("supplierId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchaseOrders_status" ON "purchase_orders" ("status");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchaseOrders_requisition" ON "purchase_orders" ("requisitionId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchaseOrders_warehouse" ON "purchase_orders" ("warehouseId");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_order_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "poId" integer NOT NULL,
  "productId" integer NOT NULL,
  "productName" varchar(255) NOT NULL,
  "quantity" integer NOT NULL,
  "receivedQty" integer DEFAULT 0 NOT NULL,
  "unitPrice" numeric(15, 2) NOT NULL,
  "discount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "total" numeric(15, 2) NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "chk_purchase_order_item_qty_positive" CHECK ("quantity" > 0),
  CONSTRAINT "chk_purchase_order_item_received_not_negative" CHECK ("receivedQty" >= 0)
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchaseOrderItems_po" ON "purchase_order_items" ("poId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchaseOrderItems_product" ON "purchase_order_items" ("productId");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goods_receipts" (
  "id" serial PRIMARY KEY NOT NULL,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenantId" integer NOT NULL,
  "country" varchar(100),
  "workSiteId" integer,
  "deviceId" integer,
  "lat" numeric(10, 7),
  "lng" numeric(10, 7),
  "globalCode" varchar(160),
  "serverVersion" integer DEFAULT 1 NOT NULL,
  "lastSyncAt" timestamp,
  "conflictState" varchar(20) DEFAULT 'none',
  "aggregateId" uuid,
  "grnNumber" varchar(50) NOT NULL,
  "poId" integer NOT NULL,
  "supplierId" integer,
  "branchId" integer,
  "warehouseId" integer,
  "status" "public"."grn_status" DEFAULT 'draft' NOT NULL,
  "receivedAt" timestamp DEFAULT now() NOT NULL,
  "notes" text,
  "postedAt" timestamp,
  "postedById" integer,
  "cancelledAt" timestamp,
  "cancelledById" integer,
  "cancelReason" varchar(255),
  "userId" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "goodsReceipts_GlobalId_unique" UNIQUE ("GlobalId"),
  CONSTRAINT "goodsReceipts_gc_tenant_unique" UNIQUE ("tenantId", "globalCode"),
  CONSTRAINT "uq_goodsReceipts_tenant_number" UNIQUE ("tenantId", "grnNumber"),
  CONSTRAINT "chk_goods_receipt_tenant_not_null" CHECK ("tenantId" IS NOT NULL)
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_goodsReceipts_tenant" ON "goods_receipts" ("tenantId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_goodsReceipts_po" ON "goods_receipts" ("poId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_goodsReceipts_supplier" ON "goods_receipts" ("supplierId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_goodsReceipts_status" ON "goods_receipts" ("status");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goods_receipt_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "grnId" integer NOT NULL,
  "poItemId" integer,
  "productId" integer NOT NULL,
  "productName" varchar(255) NOT NULL,
  "quantityReceived" integer NOT NULL,
  "unitPrice" numeric(15, 2),
  "receivedAt" timestamp DEFAULT now() NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "chk_goods_receipt_item_qty_positive" CHECK ("quantityReceived" > 0)
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_goodsReceiptItems_grn" ON "goods_receipt_items" ("grnId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_goodsReceiptItems_product" ON "goods_receipt_items" ("productId");

--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "poId" integer;

--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "grnId" integer;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchaseInvoices_po" ON "purchase_invoices" ("poId");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchaseInvoices_grn" ON "purchase_invoices" ("grnId");