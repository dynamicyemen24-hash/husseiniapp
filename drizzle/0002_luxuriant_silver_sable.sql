ALTER TYPE "public"."payment_method" ADD VALUE 'cash_yer';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'cash_sar';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'hawala';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'shabab';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'mobile_money';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'bank_transfer';--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"nameAr" varchar(100),
	"parentId" integer,
	"type" varchar(30) DEFAULT 'product',
	"isActive" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(30) DEFAULT 'pos' NOT NULL,
	"workSiteId" integer,
	"location" varchar(255),
	"lastSeenAt" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "devices_code_tenant_unique" UNIQUE("code","tenantId")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(40),
	"title" varchar(200) NOT NULL,
	"type" varchar(50),
	"entityType" varchar(50),
	"entityId" integer,
	"fileUrl" text,
	"fileUploadId" integer,
	"notes" text,
	"uploadedById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"branchId" integer,
	"sourceModule" varchar(50),
	"sourceRefType" varchar(50),
	"sourceRefId" integer,
	"referenceNo" varchar(80),
	"status" varchar(20) DEFAULT 'posted' NOT NULL,
	"totalAmount" numeric(15, 2) DEFAULT '0',
	"memo" text,
	"createdById" integer,
	"postedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer,
	"userId" integer,
	"username" varchar(120),
	"success" boolean NOT NULL,
	"ip" varchar(64),
	"userAgent" text,
	"device" varchar(120),
	"country" varchar(100),
	"city" varchar(120),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	"category" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"sessionId" integer,
	"salesInvoiceId" integer,
	"total" numeric(15, 2) DEFAULT '0',
	"paymentMethod" varchar(20),
	"status" varchar(20) DEFAULT 'completed',
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(40) NOT NULL,
	"openedById" integer NOT NULL,
	"openedAt" timestamp DEFAULT now() NOT NULL,
	"closedAt" timestamp,
	"openingFloat" numeric(15, 2) DEFAULT '0',
	"closingFloat" numeric(15, 2),
	"expectedCash" numeric(15, 2),
	"countedCash" numeric(15, 2),
	"variance" numeric(15, 2),
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"notes" text,
	"branchId" integer,
	"deviceId" integer
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"name" varchar(80) NOT NULL,
	"code" varchar(40) NOT NULL,
	"description" text,
	"permissions" text,
	"isSystem" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"country" varchar(100) DEFAULT 'اليمن',
	"workSiteId" integer,
	"deviceId" integer,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"globalCode" varchar(160),
	"productId" integer NOT NULL,
	"warehouseId" integer,
	"previousQty" integer NOT NULL,
	"newQty" integer NOT NULL,
	"reason" varchar(100) DEFAULT 'تسوية',
	"notes" text,
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stockAdjustments_gc_tenant_unique" UNIQUE("tenantId","globalCode")
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(80) NOT NULL,
	"nameAr" varchar(80),
	"symbol" varchar(20),
	"baseUnitId" integer,
	"conversionFactor" numeric(15, 6) DEFAULT '1',
	"isActive" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"userId" integer NOT NULL,
	"roleId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"country" varchar(100) DEFAULT 'اليمن',
	"workSiteId" integer,
	"deviceId" integer,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"globalCode" varchar(160),
	"productId" integer NOT NULL,
	"fromWarehouseId" integer NOT NULL,
	"toWarehouseId" integer NOT NULL,
	"quantity" integer NOT NULL,
	"notes" text,
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouseTransfers_gc_tenant_unique" UNIQUE("tenantId","globalCode")
);
--> statement-breakpoint
CREATE TABLE "work_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workSites_code_tenant_unique" UNIQUE("code","tenantId")
);
--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_code_unique";--> statement-breakpoint
ALTER TABLE "customers" DROP CONSTRAINT "customers_code_unique";--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_code_unique";--> statement-breakpoint
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_code_unique";--> statement-breakpoint
ALTER TABLE "warehouses" DROP CONSTRAINT "warehouses_code_unique";--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "subscriptionStatus" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "subscriptionStatus" SET DEFAULT 'trial'::text;--> statement-breakpoint
DROP TYPE "public"."subscription_status";--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'grace', 'suspended');--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "subscriptionStatus" SET DEFAULT 'trial'::"public"."subscription_status";--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "subscriptionStatus" SET DATA TYPE "public"."subscription_status" USING "subscriptionStatus"::"public"."subscription_status";--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "ownerUserId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "country" varchar(100) DEFAULT 'اليمن';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "workSiteId" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deviceId" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "globalCode" varchar(160);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "country" varchar(100) DEFAULT 'اليمن';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unitId" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "categoryId" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "salesAccountId" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cogsAccountId" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "inventoryAccountId" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unitOfMeasure" varchar(50) DEFAULT 'قطعة' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "secondaryUnit" varchar(50);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "conversionFactor" numeric(15, 4) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "isComposite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "bom" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "alternativeIds" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "attachmentUrl" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "costMethod" varchar(30) DEFAULT 'average' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "directCost" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "indirectCost" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "productionMinutes" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "priceMode" varchar(20) DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "marginPct" numeric(6, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "country" varchar(100) DEFAULT 'اليمن';--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "workSiteId" integer;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "deviceId" integer;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "globalCode" varchar(160);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "zatca" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "country" varchar(100) DEFAULT 'اليمن';--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "workSiteId" integer;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "deviceId" integer;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "globalCode" varchar(160);--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "zatca" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "country" varchar(100) DEFAULT 'اليمن' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "posConfig" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "salesPolicy" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "paymentMethods" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "postingRules" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "zatcaConfig" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "journalEntryId" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "sourceModule" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" varchar(120);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "passwordHash" text;--> statement-breakpoint
CREATE INDEX "idx_categories_tenant" ON "categories" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_categories_tenant_code" ON "categories" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX "idx_devices_tenant" ON "devices" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_documents_tenant" ON "documents" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_documents_entity" ON "documents" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "idx_journal_tenant" ON "journal_entries" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_journal_source" ON "journal_entries" USING btree ("sourceModule","sourceRefId");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_username" ON "login_attempts" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_user" ON "login_attempts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_created" ON "login_attempts" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_permissions_key" ON "permissions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_pos_orders_tenant" ON "pos_orders" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_pos_sessions_tenant" ON "pos_sessions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_roles_tenant" ON "roles" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_tenant_code" ON "roles" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX "idx_stockAdjustments_tenant" ON "stock_adjustments" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_units_tenant" ON "units" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_units_tenant_code" ON "units" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX "idx_userroles_tenant" ON "user_roles" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_userroles_user_role" ON "user_roles" USING btree ("userId","roleId");--> statement-breakpoint
CREATE INDEX "idx_warehouseTransfers_tenant" ON "warehouse_transfers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_workSites_tenant" ON "work_sites" USING btree ("tenantId");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_code_tenant_unique" UNIQUE("code","tenantId");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_code_tenant_unique" UNIQUE("code","tenantId");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_gc_tenant_unique" UNIQUE("tenantId","globalCode");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_code_tenant_unique" UNIQUE("code","tenantId");--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchaseInvoices_gc_tenant_unique" UNIQUE("tenantId","globalCode");--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "salesInvoices_gc_tenant_unique" UNIQUE("tenantId","globalCode");--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_code_tenant_unique" UNIQUE("code","tenantId");--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_code_tenant_unique" UNIQUE("code","tenantId");