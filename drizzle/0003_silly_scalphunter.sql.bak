CREATE TABLE "biometric_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"userId" integer NOT NULL,
	"type" varchar(30) NOT NULL,
	"algorithm" varchar(50) NOT NULL,
	"algorithmVersion" varchar(20) NOT NULL,
	"templateHash" varchar(64) NOT NULL,
	"encryptedTemplate" text NOT NULL,
	"encryptionKeyId" varchar(100) NOT NULL,
	"qualityScore" integer,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"enrolledAt" timestamp DEFAULT now() NOT NULL,
	"enrolledById" integer NOT NULL,
	"approvedById" integer,
	"approvedAt" timestamp,
	"revokedAt" timestamp,
	"revokedById" integer,
	"revocationReason" varchar(255),
	"expiresAt" timestamp,
	"lastVerifiedAt" timestamp,
	"verificationCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "biometric_templates_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "biometric_template_user_type_unique" UNIQUE("userId","type"),
	CONSTRAINT "chk_biometric_quality_score_range" CHECK ("biometric_templates"."qualityScore" IS NULL OR ("biometric_templates"."qualityScore" >= 0 AND "biometric_templates"."qualityScore" <= 100)),
	CONSTRAINT "chk_biometric_tenant_not_null" CHECK ("biometric_templates"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "custom_field_defs" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"key" varchar(50) NOT NULL,
	"label" varchar(120) NOT NULL,
	"type" varchar(20) DEFAULT 'text' NOT NULL,
	"options" text,
	"required" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"jsonSchema" jsonb,
	CONSTRAINT "custom_field_defs_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_custom_field_def_tenant_not_null" CHECK ("custom_field_defs"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "custom_field_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"field_key" varchar(50) NOT NULL,
	"value" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "custom_field_values_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "custom_field_values_entity_field_unique" UNIQUE("entity_type","entity_id","field_key"),
	CONSTRAINT "chk_custom_field_value_tenant_not_null" CHECK ("custom_field_values"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"fromUserId" text NOT NULL,
	"fromName" text,
	"toUserId" text NOT NULL,
	"body" text NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "messages_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_message_tenant_not_null" CHECK ("messages"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"kind" varchar(20) DEFAULT 'financial' NOT NULL,
	"discountPercent" numeric(6, 2) DEFAULT '0' NOT NULL,
	"minQty" numeric(15, 2),
	"productId" integer,
	"categoryId" integer,
	"startDate" timestamp,
	"endDate" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "offers_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_offer_discount_not_negative" CHECK ("offers"."discountPercent" >= 0),
	CONSTRAINT "chk_offer_discount_not_over_100" CHECK ("offers"."discountPercent" <= 100),
	CONSTRAINT "chk_offer_tenant_not_null" CHECK ("offers"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "product_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"productId" integer NOT NULL,
	"unitId" integer NOT NULL,
	"conversionFactor" numeric(15, 6) DEFAULT '1' NOT NULL,
	"isBase" boolean DEFAULT false NOT NULL,
	"barcode" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "product_units_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "product_units_product_unit_unique" UNIQUE("productId","unitId"),
	CONSTRAINT "chk_product_unit_conversion_positive" CHECK ("product_units"."conversionFactor" > 0),
	CONSTRAINT "chk_product_unit_tenant_not_null" CHECK ("product_units"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "sales_reps" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"commissionType" varchar(20) DEFAULT 'percent' NOT NULL,
	"commissionValue" numeric(15, 2) DEFAULT '0' NOT NULL,
	"bonusThreshold" numeric(15, 2),
	"bonusAmount" numeric(15, 2),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	CONSTRAINT "sales_reps_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_sales_rep_commission_not_negative" CHECK ("sales_reps"."commissionValue" >= 0),
	CONSTRAINT "chk_sales_rep_tenant_not_null" CHECK ("sales_reps"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "scheduled_journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"branchId" integer,
	"frequency" varchar(20) DEFAULT 'monthly' NOT NULL,
	"nextRunAt" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"legs" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	CONSTRAINT "scheduled_journal_entries_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_scheduled_journal_tenant_not_null" CHECK ("scheduled_journal_entries"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "sync_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"aggregateId" uuid NOT NULL,
	"entityType" varchar(100) NOT NULL,
	"entityId" integer NOT NULL,
	"entityGlobalId" uuid NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"clientVersion" integer DEFAULT 0 NOT NULL,
	"conflictState" varchar(20) DEFAULT 'none' NOT NULL,
	"conflictData" jsonb,
	"lastSyncAt" timestamp DEFAULT now() NOT NULL,
	"lastConflictAt" timestamp,
	"resolvedAt" timestamp,
	"resolvedById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sync_metadata_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "sync_metadata_aggregate_entity_unique" UNIQUE("aggregateId","entityType","entityId"),
	CONSTRAINT "chk_sync_metadata_tenant_not_null" CHECK ("sync_metadata"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"key" varchar(255) NOT NULL,
	"culture" varchar(10) NOT NULL,
	"value" text NOT NULL,
	"context" varchar(100),
	"isApproved" boolean DEFAULT false NOT NULL,
	"approvedById" integer,
	"approvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "translations_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "translations_key_culture_tenant_unique" UNIQUE("key","culture","tenantId"),
	CONSTRAINT "chk_translation_tenant_not_null" CHECK ("translations"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ALTER COLUMN "userId" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "activity_logs" ALTER COLUMN "userId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "sessionId" uuid;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "entityType" varchar(100);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "entityId" integer;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "ipAddress" varchar(45);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "userAgent" varchar(500);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "deviceId" integer;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "deviceFingerprint" varchar(255);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "city" varchar(120);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "previousHash" varchar(64);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "currentHash" varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "chainSequence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "deviceId" integer;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "ipAddress" varchar(45);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "sessionId" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "entityGlobalId" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "deviceId" integer;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "deviceFingerprint" varchar(255);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "city" varchar(120);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "previousHash" varchar(64);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "currentHash" varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "chainSequence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "currencies" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "currencies" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "currencies" ADD COLUMN "rate" numeric(18, 8) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "currencies" ADD COLUMN "isDefault" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "currencies" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "currencies" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "currencies" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "currencies" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "currencies" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "fingerprint" varchar(255);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "os" varchar(100);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "osVersion" varchar(50);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "appVersion" varchar(50);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "publicKey" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "feature_flags" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "sha256Hash" varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "md5Hash" varchar(32);--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "isEncrypted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "encryptionKeyId" varchar(100);--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "encryptionAlgorithm" varchar(50);--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "deviceId" integer;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "deviceFingerprint" varchar(255);--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "ipAddress" varchar(45);--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "city" varchar(120);--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "retentionPolicy" varchar(50) DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "retentionExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "legalHold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "file_uploads" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "isImmutable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "login_attempts" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "login_attempts" ADD COLUMN "deviceFingerprint" varchar(255);--> statement-breakpoint
ALTER TABLE "login_attempts" ADD COLUMN "riskScore" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "login_attempts" ADD COLUMN "riskFactors" jsonb;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "opening_balances" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD COLUMN "exchangeRate" numeric(18, 8) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD COLUMN "baseAmount" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "payment_history" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_history" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_history" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_history" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "payment_history" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "payment_history" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "payment_history" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "exchangeRate" numeric(18, 8) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "baseAmount" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "payroll_items" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "pos_orders" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "procurement_approvals" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "procurement_approvals" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "procurement_approvals" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "procurement_approvals" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "procurement_approvals" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "procurement_approvals" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "procurements" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "procurements" ADD COLUMN "approvers" jsonb;--> statement-breakpoint
ALTER TABLE "procurements" ADD COLUMN "approvalStep" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "procurements" ADD COLUMN "approvalLog" jsonb;--> statement-breakpoint
ALTER TABLE "procurements" ADD COLUMN "receivedCost" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "procurements" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "procurements" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "procurements" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "procurements" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "procurements" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "reorderPoint" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "reorderQty" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "project_members" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "project_members" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "project_members" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_members" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "project_members" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "project_members" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "project_tasks" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "exchangeRate" numeric(18, 8) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "baseAmount" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "postedAt" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "postedById" integer;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "reversedAt" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "reversedById" integer;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "reversalReason" varchar(255);--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "salesRepId" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "currency" varchar(10) DEFAULT 'YER' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "currencyRate" numeric(18, 8) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "postedAt" timestamp;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "postedById" integer;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "reversedAt" timestamp;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "reversedById" integer;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "reversalReason" varchar(255);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "team_invitations" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "sector" varchar(50) DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "currencyId" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "exchangeRate" numeric(18, 8) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "baseAmount" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "user_branch_permissions" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_branch_permissions" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_branch_permissions" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_branch_permissions" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "user_branch_permissions" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "user_branch_permissions" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "currentSessionId" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failedLoginAttempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lockedUntil" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "passwordChangedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfaEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfaSecret" varchar(255);--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "work_sites" ADD COLUMN "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "work_sites" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "work_sites" ADD COLUMN "serverVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "work_sites" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "work_sites" ADD COLUMN "conflictState" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "work_sites" ADD COLUMN "aggregateId" uuid;--> statement-breakpoint
ALTER TABLE "sales_reps" ADD CONSTRAINT "sales_reps_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_journal_entries" ADD CONSTRAINT "scheduled_journal_entries_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_biometric_tenant" ON "biometric_templates" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_biometric_user" ON "biometric_templates" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_biometric_type" ON "biometric_templates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_biometric_status" ON "biometric_templates" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_field_defs_tenant_entity_key" ON "custom_field_defs" USING btree ("tenantId","entity_type","key");--> statement-breakpoint
CREATE INDEX "custom_field_values_tenant_entity" ON "custom_field_values" USING btree ("tenantId","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_messages_tenant" ON "messages" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_messages_to" ON "messages" USING btree ("tenantId","toUserId");--> statement-breakpoint
CREATE INDEX "idx_messages_from" ON "messages" USING btree ("tenantId","fromUserId");--> statement-breakpoint
CREATE INDEX "idx_offers_tenant" ON "offers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_offers_product" ON "offers" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_offers_category" ON "offers" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "idx_productUnits_tenant" ON "product_units" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_productUnits_product" ON "product_units" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_sales_reps_tenant" ON "sales_reps" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_sales_reps_currency" ON "sales_reps" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_scheduledJournal_tenant" ON "scheduled_journal_entries" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_scheduledJournal_nextRun" ON "scheduled_journal_entries" USING btree ("nextRunAt");--> statement-breakpoint
CREATE INDEX "idx_sync_metadata_tenant" ON "sync_metadata" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_sync_metadata_aggregate" ON "sync_metadata" USING btree ("aggregateId");--> statement-breakpoint
CREATE INDEX "idx_sync_metadata_entity" ON "sync_metadata" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "idx_translations_tenant" ON "translations" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_translations_culture" ON "translations" USING btree ("culture");--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurements" ADD CONSTRAINT "procurements_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_tenant_type" ON "accounts" USING btree ("tenantId","type");--> statement-breakpoint
CREATE INDEX "idx_activityLogs_session" ON "activity_logs" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "idx_activityLogs_entity" ON "activity_logs" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "idx_activityLogs_chain" ON "activity_logs" USING btree ("tenantId","chainSequence");--> statement-breakpoint
CREATE INDEX "idx_attendance_date" ON "attendance" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_session" ON "audit_logs" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity_global" ON "audit_logs" USING btree ("entityGlobalId");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_chain" ON "audit_logs" USING btree ("tenantId","chainSequence");--> statement-breakpoint
CREATE INDEX "idx_billing_invoice_currency" ON "billing_invoices" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_currencies_tenant" ON "currencies" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_deleted" ON "customers" USING btree ("tenantId","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_customers_currency" ON "customers" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_employees_currency" ON "employees" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_file_uploads_hash" ON "file_uploads" USING btree ("sha256Hash");--> statement-breakpoint
CREATE INDEX "idx_file_uploads_retention" ON "file_uploads" USING btree ("retentionExpiresAt");--> statement-breakpoint
CREATE INDEX "idx_inventoryMovements_product" ON "inventory_movements" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_inventoryMovements_warehouse" ON "inventory_movements" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_journal_currency" ON "journal_entries" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_tenant_created" ON "login_attempts" USING btree ("tenantId","createdAt");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_ip" ON "login_attempts" USING btree ("ip");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_device" ON "login_attempts" USING btree ("deviceFingerprint");--> statement-breakpoint
CREATE INDEX "idx_orders_currency" ON "orders" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_payment_history_currency" ON "payment_history" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_payments_currency" ON "payments" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_payroll_items_employee" ON "payroll_items" USING btree ("employeeId");--> statement-breakpoint
CREATE INDEX "idx_pos_orders_currency" ON "pos_orders" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_pos_sessions_currency" ON "pos_sessions" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_procurements_currency" ON "procurements" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_products_tenant_deleted" ON "products" USING btree ("tenantId","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_products_currency" ON "products" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_project_members_employee" ON "project_members" USING btree ("employeeId");--> statement-breakpoint
CREATE INDEX "idx_project_tasks_assignee" ON "project_tasks" USING btree ("assigneeId");--> statement-breakpoint
CREATE INDEX "idx_projects_currency" ON "projects" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_currency" ON "purchase_invoices" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_currency" ON "sales_invoices" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_suppliers_tenant_deleted" ON "suppliers" USING btree ("tenantId","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_suppliers_currency" ON "suppliers" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_tenant_sub_currency" ON "tenant_subscriptions" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_tickets_assigned" ON "tickets" USING btree ("assignedToId");--> statement-breakpoint
CREATE INDEX "idx_transactions_currency" ON "transactions" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_transactions_tenant_account_date" ON "transactions" USING btree ("tenantId","accountId","transactionDate");--> statement-breakpoint
CREATE INDEX "idx_users_session" ON "users" USING btree ("currentSessionId");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_created" ON "webhook_deliveries" USING btree ("createdAt");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_date_unique" UNIQUE("employeeId","date");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_code_tenant_unique" UNIQUE("code","tenantId");--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_tenant_period_unique" UNIQUE("tenantId","periodName");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_fingerprint_unique" UNIQUE("fingerprint");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_pair_effective_unique" UNIQUE("baseCurrency","quoteCurrency","effectiveFrom");--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_tenant_key_unique" UNIQUE("tenantId","key");--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "opening_balances" ADD CONSTRAINT "openingBalances_account_period_tenant_unique" UNIQUE("accountId","periodName","tenantId");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_run_employee_unique" UNIQUE("payrollRunId","employeeId");--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_tenant_period_unique" UNIQUE("tenantId","periodName");--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "procurement_approvals" ADD CONSTRAINT "procurement_approvals_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "procurement_approvals" ADD CONSTRAINT "procurement_approvals_proc_level_unique" UNIQUE("procurementId","level");--> statement-breakpoint
ALTER TABLE "procurements" ADD CONSTRAINT "procurements_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_employee_unique" UNIQUE("projectId","employeeId");--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "user_branch_permissions" ADD CONSTRAINT "user_branch_permissions_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "user_branch_permissions" ADD CONSTRAINT "userBranchPermissions_tenant_user_branch_unique" UNIQUE("tenantId","userId","branchId");--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "warehouse_transfers_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "work_sites" ADD CONSTRAINT "work_sites_GlobalId_unique" UNIQUE("GlobalId");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "chk_account_tenant_not_null" CHECK ("accounts"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "chk_api_key_tenant_not_null" CHECK ("api_keys"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "chk_attendance_tenant_not_null" CHECK ("attendance"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "chk_audit_log_tenant_not_null" CHECK ("audit_logs"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "chk_billing_invoice_subtotal_not_negative" CHECK ("billing_invoices"."subtotal" >= 0);--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "chk_billing_invoice_tax_not_negative" CHECK ("billing_invoices"."taxAmount" >= 0);--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "chk_billing_invoice_total_not_negative" CHECK ("billing_invoices"."total" >= 0);--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "chk_billing_invoice_tenant_not_null" CHECK ("billing_invoices"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "chk_branch_tenant_not_null" CHECK ("branches"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "chk_budget_revenue_not_negative" CHECK ("budgets"."targetRevenue" >= 0);--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "chk_budget_expense_not_negative" CHECK ("budgets"."targetExpense" >= 0);--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "chk_category_tenant_not_null" CHECK ("categories"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "currencies" ADD CONSTRAINT "chk_currency_rate_positive" CHECK ("currencies"."rate" > 0);--> statement-breakpoint
ALTER TABLE "currencies" ADD CONSTRAINT "chk_currency_code_format" CHECK ("currencies"."code" ~ '^[A-Z]{3}$');--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "chk_customer_credit_limit_not_negative" CHECK ("customers"."creditLimit" >= 0);--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "chk_customer_tenant_not_null" CHECK ("customers"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "chk_department_tenant_not_null" CHECK ("departments"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "chk_device_tenant_not_null" CHECK ("devices"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "chk_document_tenant_not_null" CHECK ("documents"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "chk_employee_salary_not_negative" CHECK ("employees"."salary" >= 0);--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "chk_employee_tenant_not_null" CHECK ("employees"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "chk_exchange_rate_positive" CHECK ("exchange_rates"."rate" > 0);--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "chk_file_upload_size_positive" CHECK ("file_uploads"."fileSize" > 0);--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "chk_inventory_movement_quantity_not_zero" CHECK ("inventory_movements"."quantity" != 0);--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "chk_inventory_movement_tenant_not_null" CHECK ("inventory_movements"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "chk_journal_total_not_negative" CHECK ("journal_entries"."totalAmount" >= 0);--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "chk_journal_tenant_not_null" CHECK ("journal_entries"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "chk_journal_immutable_posted" CHECK (
      CASE WHEN "journal_entries"."status" = 'posted' THEN "journal_entries"."isImmutable" = true ELSE true END
    );--> statement-breakpoint
ALTER TABLE "opening_balances" ADD CONSTRAINT "chk_opening_balance_amount_not_negative" CHECK ("opening_balances"."amount" >= 0);--> statement-breakpoint
ALTER TABLE "opening_balances" ADD CONSTRAINT "chk_opening_balance_exchange_rate_positive" CHECK ("opening_balances"."exchangeRate" > 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "chk_order_total_not_negative" CHECK ("orders"."total" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "chk_order_tenant_not_null" CHECK ("orders"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "chk_payment_history_amount_positive" CHECK ("payment_history"."amount" > 0);--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "chk_payment_history_refund_not_negative" CHECK ("payment_history"."refundedAmount" >= 0);--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "chk_payment_history_tenant_not_null" CHECK ("payment_history"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "chk_payment_amount_positive" CHECK ("payments"."amount" > 0);--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "chk_payment_base_amount_positive" CHECK ("payments"."baseAmount" >= 0);--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "chk_payment_exchange_rate_positive" CHECK ("payments"."exchangeRate" > 0);--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "chk_payment_tenant_not_null" CHECK ("payments"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "chk_payroll_item_basic_not_negative" CHECK ("payroll_items"."basicSalary" >= 0);--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "chk_payroll_item_deductions_not_negative" CHECK ("payroll_items"."deductions" >= 0);--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "chk_payroll_item_net_not_negative" CHECK ("payroll_items"."net" >= 0);--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "chk_payroll_item_tenant_not_null" CHECK ("payroll_items"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "chk_payroll_run_total_not_negative" CHECK ("payroll_runs"."totalNet" >= 0);--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "chk_payroll_run_tenant_not_null" CHECK ("payroll_runs"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "chk_pos_order_total_not_negative" CHECK ("pos_orders"."total" >= 0);--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "chk_pos_order_tenant_not_null" CHECK ("pos_orders"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "chk_pos_session_tenant_not_null" CHECK ("pos_sessions"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "procurement_approvals" ADD CONSTRAINT "chk_procurement_approval_tenant_not_null" CHECK ("procurement_approvals"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "procurements" ADD CONSTRAINT "chk_procurement_quantity_positive" CHECK ("procurements"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "procurements" ADD CONSTRAINT "chk_procurement_estimated_cost_not_negative" CHECK ("procurements"."estimatedCost" >= 0);--> statement-breakpoint
ALTER TABLE "procurements" ADD CONSTRAINT "chk_procurement_tenant_not_null" CHECK ("procurements"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "chk_product_purchase_price_not_negative" CHECK ("products"."purchasePrice" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "chk_product_sale_price_not_negative" CHECK ("products"."salePrice" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "chk_product_wholesale_price_not_negative" CHECK ("products"."wholesalePrice" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "chk_product_conversion_factor_positive" CHECK ("products"."conversionFactor" > 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "chk_product_tenant_not_null" CHECK ("products"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "chk_project_member_tenant_not_null" CHECK ("project_members"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "chk_project_task_tenant_not_null" CHECK ("project_tasks"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "chk_project_budget_not_negative" CHECK ("projects"."budget" >= 0);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "chk_project_tenant_not_null" CHECK ("projects"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "chk_purchase_invoice_subtotal_not_negative" CHECK ("purchase_invoices"."subtotal" >= 0);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "chk_purchase_invoice_tax_rate_not_negative" CHECK ("purchase_invoices"."taxRate" >= 0);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "chk_purchase_invoice_tax_amount_not_negative" CHECK ("purchase_invoices"."taxAmount" >= 0);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "chk_purchase_invoice_discount_not_negative" CHECK ("purchase_invoices"."discount" >= 0);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "chk_purchase_invoice_total_not_negative" CHECK ("purchase_invoices"."total" >= 0);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "chk_purchase_invoice_paid_not_negative" CHECK ("purchase_invoices"."paidAmount" >= 0);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "chk_purchase_invoice_exchange_rate_positive" CHECK ("purchase_invoices"."exchangeRate" > 0);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "chk_purchase_invoice_base_amount_not_negative" CHECK ("purchase_invoices"."baseAmount" >= 0);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "chk_purchase_invoice_tenant_not_null" CHECK ("purchase_invoices"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "chk_quality_score_range" CHECK ("quality_inspections"."score" IS NULL OR ("quality_inspections"."score" >= 0 AND "quality_inspections"."score" <= 100));--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "chk_quality_tenant_not_null" CHECK ("quality_inspections"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "chk_role_tenant_not_null" CHECK ("roles"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoice_subtotal_not_negative" CHECK ("sales_invoices"."subtotal" >= 0);--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoice_tax_rate_not_negative" CHECK ("sales_invoices"."taxRate" >= 0);--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoice_tax_amount_not_negative" CHECK ("sales_invoices"."taxAmount" >= 0);--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoice_discount_not_negative" CHECK ("sales_invoices"."discount" >= 0);--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoice_total_not_negative" CHECK ("sales_invoices"."total" >= 0);--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoice_paid_not_negative" CHECK ("sales_invoices"."paidAmount" >= 0);--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoice_currency_rate_positive" CHECK ("sales_invoices"."currencyRate" > 0);--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoice_tenant_not_null" CHECK ("sales_invoices"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoice_status_posted_immutable" CHECK (
      CASE WHEN "sales_invoices"."status" IN ('paid', 'cancelled') THEN 
        "sales_invoices"."postedAt" IS NOT NULL 
      ELSE TRUE END
    );--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "chk_settings_tenant_not_null" CHECK ("settings"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "chk_stock_adjustment_tenant_not_null" CHECK ("stock_adjustments"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "chk_subscription_plan_price_monthly_positive" CHECK ("subscription_plans"."priceMonthly" > 0);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "chk_subscription_plan_price_yearly_positive" CHECK ("subscription_plans"."priceYearly" > 0);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "chk_subscription_plan_currency_format" CHECK ("subscription_plans"."currency" ~ '^[A-Z]{3}$');--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "chk_supplier_tenant_not_null" CHECK ("suppliers"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "chk_team_invitation_tenant_not_null" CHECK ("team_invitations"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "chk_tenant_sub_tenant_not_null" CHECK ("tenant_subscriptions"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "chk_tenant_currency_valid" CHECK ("tenants"."currency" ~ '^[A-Z]{3}$');--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "chk_ticket_tenant_not_null" CHECK ("tickets"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "chk_transaction_amount_not_negative" CHECK ("transactions"."amount" >= 0);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "chk_transaction_base_amount_not_negative" CHECK ("transactions"."baseAmount" >= 0);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "chk_transaction_exchange_rate_positive" CHECK ("transactions"."exchangeRate" > 0);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "chk_transaction_tenant_not_null" CHECK ("transactions"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "chk_transaction_account_not_null" CHECK ("transactions"."accountId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "chk_unit_conversion_positive" CHECK ("units"."conversionFactor" > 0);--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "chk_unit_tenant_not_null" CHECK ("units"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "chk_user_role_tenant_not_null" CHECK ("user_roles"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "chk_warehouse_transfer_quantity_positive" CHECK ("warehouse_transfers"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "chk_warehouse_transfer_tenant_not_null" CHECK ("warehouse_transfers"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "chk_warehouse_transfer_from_to_different" CHECK ("warehouse_transfers"."fromWarehouseId" != "warehouse_transfers"."toWarehouseId");--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "chk_warehouse_tenant_not_null" CHECK ("warehouses"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "chk_webhook_tenant_not_null" CHECK ("webhooks"."tenantId" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "work_sites" ADD CONSTRAINT "chk_workSite_tenant_not_null" CHECK ("work_sites"."tenantId" IS NOT NULL);