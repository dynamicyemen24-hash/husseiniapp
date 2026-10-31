CREATE TYPE "public"."purchase_order_status" AS ENUM('draft', 'issued', 'partially_received', 'received', 'cancelled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."grn_status" AS ENUM('draft', 'posted', 'cancelled');--> statement-breakpoint
CREATE TABLE "purchase_orders" (
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
	CONSTRAINT "purchaseOrders_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "purchaseOrders_gc_tenant_unique" UNIQUE("tenantId","globalCode"),
	CONSTRAINT "uq_purchaseOrders_tenant_number" UNIQUE("tenantId","poNumber"),
	CONSTRAINT "purchaseOrders_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "chk_purchase_order_total_not_negative" CHECK ("total" >= 0),
	CONSTRAINT "chk_purchase_order_subtotal_not_negative" CHECK ("subtotal" >= 0),
	CONSTRAINT "chk_purchase_order_tenant_not_null" CHECK ("tenantId" IS NOT NULL)
);--> statement-breakpoint
CREATE INDEX "idx_purchaseOrders_tenant" ON "purchase_orders" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_purchaseOrders_supplier" ON "purchase_orders" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX "idx_purchaseOrders_status" ON "purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_purchaseOrders_requisition" ON "purchase_orders" USING btree ("requisitionId");--> statement-breakpoint
CREATE INDEX "idx_purchaseOrders_warehouse" ON "purchase_orders" USING btree ("warehouseId");--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
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
);--> statement-breakpoint
CREATE INDEX "idx_purchaseOrderItems_po" ON "purchase_order_items" USING btree ("poId");--> statement-breakpoint
CREATE INDEX "idx_purchaseOrderItems_product" ON "purchase_order_items" USING btree ("productId");--> statement-breakpoint
CREATE TABLE "goods_receipts" (
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
	CONSTRAINT "goodsReceipts_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "goodsReceipts_gc_tenant_unique" UNIQUE("tenantId","globalCode"),
	CONSTRAINT "uq_goodsReceipts_tenant_number" UNIQUE("tenantId","grnNumber"),
	CONSTRAINT "chk_goods_receipt_tenant_not_null" CHECK ("tenantId" IS NOT NULL)
);--> statement-breakpoint
CREATE INDEX "idx_goodsReceipts_tenant" ON "goods_receipts" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_goodsReceipts_po" ON "goods_receipts" USING btree ("poId");--> statement-breakpoint
CREATE INDEX "idx_goodsReceipts_supplier" ON "goods_receipts" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX "idx_goodsReceipts_status" ON "goods_receipts" USING btree ("status");--> statement-breakpoint
CREATE TABLE "goods_receipt_items" (
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
);--> statement-breakpoint
CREATE INDEX "idx_goodsReceiptItems_grn" ON "goods_receipt_items" USING btree ("grnId");--> statement-breakpoint
CREATE INDEX "idx_goodsReceiptItems_product" ON "goods_receipt_items" USING btree ("productId");--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "poId" integer;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "grnId" integer;--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_po" ON "purchase_invoices" USING btree ("poId");--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_grn" ON "purchase_invoices" USING btree ("grnId");