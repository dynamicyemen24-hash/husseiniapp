-- ═══════════════════════════════════════════════════════════════════
-- 0016 — Universal Quotation Engine + Quotation Intelligence Engine
-- Industry-Agnostic / Configuration-Driven quotations with lifecycle,
-- versions, approvals, negotiations, alternatives, terms, parties,
-- attachments, links, analysis snapshots and proactive alerts.
-- ═══════════════════════════════════════════════════════════════════

DO $$ BEGIN CREATE TYPE "quotation_direction" AS ENUM('sale', 'purchase'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "quotation_status" AS ENUM('draft', 'in_review', 'approved', 'sent', 'negotiating', 'accepted', 'rejected', 'expired', 'converted', 'closed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "quotation_item_kind" AS ENUM('product', 'service', 'project', 'subscription', 'production', 'distribution', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "quotation_approval_status" AS ENUM('pending', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "quotation_negotiation_side" AS ENUM('us', 'counterparty'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "quotation_party_role" AS ENUM('customer', 'supplier', 'broker', 'sales_rep', 'approver', 'contact'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "quotation_link_type" AS ENUM('crm_customer', 'crm_supplier', 'inventory_product', 'procurement', 'sales_order', 'sales_invoice', 'purchase_order', 'purchase_invoice', 'project', 'service', 'production_order', 'accounting_entry'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotation_types" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "tenantId" integer NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(255) NOT NULL,
  "nameAr" varchar(255),
  "direction" "quotation_direction" DEFAULT 'sale' NOT NULL,
  "itemKinds" jsonb DEFAULT '["product","service"]' NOT NULL,
  "defaultValidityDays" integer DEFAULT 30 NOT NULL,
  "defaultTerms" jsonb DEFAULT '[]',
  "pricingConfig" jsonb DEFAULT '{}',
  "approvalPolicy" jsonb DEFAULT '{}',
  "numberingPrefix" varchar(20) DEFAULT 'QT',
  "isActive" boolean DEFAULT true NOT NULL,
  "isSystem" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "serverVersion" integer DEFAULT 1 NOT NULL,
  "lastSyncAt" timestamp,
  "conflictState" varchar(20) DEFAULT 'none',
  "aggregateId" uuid,
  CONSTRAINT "quotation_types_code_tenant_unique" UNIQUE("code", "tenantId")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_types_tenant" ON "quotation_types" USING btree ("tenantId");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotations" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "tenantId" integer NOT NULL,
  "country" varchar(100) DEFAULT 'اليمن',
  "workSiteId" integer,
  "deviceId" integer,
  "lat" decimal(10,7),
  "lng" decimal(10,7),
  "globalCode" varchar(160),
  "serverVersion" integer DEFAULT 1 NOT NULL,
  "lastSyncAt" timestamp,
  "conflictState" varchar(20) DEFAULT 'none',
  "aggregateId" uuid,
  "quotationNumber" varchar(50) NOT NULL UNIQUE,
  "typeId" integer,
  "direction" "quotation_direction" DEFAULT 'sale' NOT NULL,
  "status" "quotation_status" DEFAULT 'draft' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "customerId" integer,
  "supplierId" integer,
  "counterpartyName" varchar(255),
  "branchId" integer,
  "costCenterId" integer,
  "warehouseId" integer,
  "projectId" integer,
  "currency" varchar(10) DEFAULT 'YER' NOT NULL,
  "currencyRate" decimal(18,8) DEFAULT '1' NOT NULL,
  "currencyId" integer,
  "subtotal" decimal(15,2) DEFAULT '0' NOT NULL,
  "discountTotal" decimal(15,2) DEFAULT '0' NOT NULL,
  "taxTotal" decimal(15,2) DEFAULT '0' NOT NULL,
  "commissionTotal" decimal(15,2) DEFAULT '0' NOT NULL,
  "grandTotal" decimal(15,2) DEFAULT '0' NOT NULL,
  "costTotal" decimal(15,2) DEFAULT '0' NOT NULL,
  "marginTotal" decimal(15,2) DEFAULT '0' NOT NULL,
  "marginPct" decimal(6,2) DEFAULT '0' NOT NULL,
  "paymentTerms" jsonb DEFAULT '{}',
  "deliveryTerms" jsonb DEFAULT '{}',
  "validityDate" timestamp,
  "notes" text,
  "createdById" integer,
  "approvedById" integer,
  "approvedAt" timestamp,
  "sentAt" timestamp,
  "decidedAt" timestamp,
  "convertedRefType" varchar(50),
  "convertedRefId" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "quotations_gc_tenant_unique" UNIQUE("tenantId", "globalCode")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotations_tenant" ON "quotations" USING btree ("tenantId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotations_tenant_status" ON "quotations" USING btree ("tenantId", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotations_tenant_direction" ON "quotations" USING btree ("tenantId", "direction");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotations_customer" ON "quotations" USING btree ("customerId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotations_supplier" ON "quotations" USING btree ("supplierId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotations_type" ON "quotations" USING btree ("typeId");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotation_items" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "tenantId" integer NOT NULL,
  "quotationId" integer NOT NULL,
  "kind" "quotation_item_kind" DEFAULT 'product' NOT NULL,
  "refId" integer,
  "name" varchar(255) NOT NULL,
  "description" text,
  "quantity" decimal(15,4) DEFAULT '1' NOT NULL,
  "unit" varchar(50) DEFAULT 'قطعة' NOT NULL,
  "unitPrice" decimal(15,2) DEFAULT '0' NOT NULL,
  "costPrice" decimal(15,2) DEFAULT '0' NOT NULL,
  "discountPct" decimal(6,2) DEFAULT '0' NOT NULL,
  "discountAmount" decimal(15,2) DEFAULT '0' NOT NULL,
  "taxPct" decimal(6,2) DEFAULT '0' NOT NULL,
  "taxAmount" decimal(15,2) DEFAULT '0' NOT NULL,
  "lineTotal" decimal(15,2) DEFAULT '0' NOT NULL,
  "lineCost" decimal(15,2) DEFAULT '0' NOT NULL,
  "lineMargin" decimal(15,2) DEFAULT '0' NOT NULL,
  "config" jsonb DEFAULT '{}',
  "sortOrder" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "serverVersion" integer DEFAULT 1 NOT NULL,
  "lastSyncAt" timestamp,
  "conflictState" varchar(20) DEFAULT 'none',
  "aggregateId" uuid
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_items_quotation" ON "quotation_items" USING btree ("quotationId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_items_tenant" ON "quotation_items" USING btree ("tenantId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_items_kind" ON "quotation_items" USING btree ("kind");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotation_versions" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "tenantId" integer NOT NULL,
  "quotationId" integer NOT NULL,
  "versionNo" integer NOT NULL,
  "snapshot" jsonb NOT NULL,
  "changeSummary" text,
  "createdById" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "quotation_versions_quotation_no_unique" UNIQUE("quotationId", "versionNo")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_versions_quotation" ON "quotation_versions" USING btree ("quotationId");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotation_alternatives" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "tenantId" integer NOT NULL,
  "quotationId" integer NOT NULL,
  "label" varchar(255) NOT NULL,
  "items" jsonb DEFAULT '[]' NOT NULL,
  "subtotal" decimal(15,2) DEFAULT '0' NOT NULL,
  "discountTotal" decimal(15,2) DEFAULT '0' NOT NULL,
  "taxTotal" decimal(15,2) DEFAULT '0' NOT NULL,
  "grandTotal" decimal(15,2) DEFAULT '0' NOT NULL,
  "score" decimal(6,2),
  "isRecommended" boolean DEFAULT false NOT NULL,
  "notes" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_alternatives_quotation" ON "quotation_alternatives" USING btree ("quotationId");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotation_terms" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "tenantId" integer NOT NULL,
  "quotationId" integer NOT NULL,
  "category" varchar(30) DEFAULT 'general' NOT NULL,
  "title" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "sortOrder" integer DEFAULT 0 NOT NULL,
  "isStandard" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_terms_quotation" ON "quotation_terms" USING btree ("quotationId");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotation_parties" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "tenantId" integer NOT NULL,
  "quotationId" integer NOT NULL,
  "role" "quotation_party_role" NOT NULL,
  "entityType" varchar(50),
  "entityId" integer,
  "name" varchar(255) NOT NULL,
  "commissionPct" decimal(6,2) DEFAULT '0' NOT NULL,
  "commissionAmount" decimal(15,2) DEFAULT '0' NOT NULL,
  "notes" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_parties_quotation" ON "quotation_parties" USING btree ("quotationId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_parties_entity" ON "quotation_parties" USING btree ("entityType", "entityId");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotation_approvals" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "tenantId" integer NOT NULL,
  "quotationId" integer NOT NULL,
  "versionNo" integer DEFAULT 1 NOT NULL,
  "level" integer DEFAULT 1 NOT NULL,
  "approverId" integer,
  "approverName" varchar(255),
  "status" "quotation_approval_status" DEFAULT 'pending' NOT NULL,
  "comment" text,
  "decidedAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_approvals_quotation" ON "quotation_approvals" USING btree ("quotationId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_approvals_status" ON "quotation_approvals" USING btree ("status");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotation_negotiations" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "tenantId" integer NOT NULL,
  "quotationId" integer NOT NULL,
  "round" integer DEFAULT 1 NOT NULL,
  "side" "quotation_negotiation_side" NOT NULL,
  "message" text NOT NULL,
  "proposedTotal" decimal(15,2),
  "proposedChanges" jsonb DEFAULT '{}',
  "createdById" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_negotiations_quotation" ON "quotation_negotiations" USING btree ("quotationId");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotation_attachments" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "tenantId" integer NOT NULL,
  "quotationId" integer NOT NULL,
  "fileName" varchar(255) NOT NULL,
  "fileUrl" text NOT NULL,
  "fileType" varchar(100),
  "fileSize" integer,
  "uploadedById" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_attachments_quotation" ON "quotation_attachments" USING btree ("quotationId");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotation_links" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "tenantId" integer NOT NULL,
  "quotationId" integer NOT NULL,
  "linkType" "quotation_link_type" NOT NULL,
  "entityType" varchar(50) NOT NULL,
  "entityId" integer NOT NULL,
  "notes" text,
  "createdById" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_links_quotation" ON "quotation_links" USING btree ("quotationId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_links_entity" ON "quotation_links" USING btree ("entityType", "entityId");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotation_analyses" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "tenantId" integer NOT NULL,
  "quotationId" integer NOT NULL,
  "versionNo" integer DEFAULT 1 NOT NULL,
  "inputHash" varchar(64) NOT NULL,
  "scores" jsonb NOT NULL,
  "ranking" jsonb,
  "benchmarks" jsonb,
  "anomalies" jsonb DEFAULT '[]',
  "forecast" jsonb,
  "recommendations" jsonb DEFAULT '[]',
  "whatIf" jsonb DEFAULT '[]',
  "generatedBy" varchar(30) DEFAULT 'engine' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_analyses_quotation" ON "quotation_analyses" USING btree ("quotationId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_analyses_created" ON "quotation_analyses" USING btree ("createdAt");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "quotation_alerts" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "tenantId" integer NOT NULL,
  "quotationId" integer,
  "alertType" varchar(40) NOT NULL,
  "severity" varchar(20) DEFAULT 'info' NOT NULL,
  "message" text NOT NULL,
  "evidence" jsonb DEFAULT '{}',
  "isRead" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_alerts_tenant" ON "quotation_alerts" USING btree ("tenantId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_alerts_quotation" ON "quotation_alerts" USING btree ("quotationId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotation_alerts_unread" ON "quotation_alerts" USING btree ("tenantId", "isRead");
