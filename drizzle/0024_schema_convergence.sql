-- 0024 — Converge schema-declared columns missing live (additive, idempotent).
--> statement-breakpoint
-- Generated from schema.ts vs information_schema truth. No DROP/rename.
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "session_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastActivity" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "device_fingerprint" varchar(255);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "drug_schedule" varchar(50) DEFAULT 'OTC';
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "requires_prescription" boolean;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "scientific_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "ndc_code" varchar(50);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "active_ingredients" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "contraindications" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "side_effects" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "storage_conditions" varchar(255);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "dosage_form" varchar(50);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "strength" varchar(50);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "max_quantity_per_sale" integer DEFAULT 999 NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "manufacturer" varchar(255);
--> statement-breakpoint
ALTER TABLE "scheduled_journal_entries" ADD COLUMN IF NOT EXISTS "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "scheduled_journal_entries" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "scheduled_journal_entries" ADD COLUMN IF NOT EXISTS "serverVersion" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "scheduled_journal_entries" ADD COLUMN IF NOT EXISTS "lastSyncAt" timestamp;
--> statement-breakpoint
ALTER TABLE "scheduled_journal_entries" ADD COLUMN IF NOT EXISTS "conflictState" varchar(20) DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "scheduled_journal_entries" ADD COLUMN IF NOT EXISTS "aggregateId" uuid;
--> statement-breakpoint
ALTER TABLE "scheduled_journal_entries" ADD COLUMN IF NOT EXISTS "currencyId" integer;
--> statement-breakpoint
ALTER TABLE "product_units" ADD COLUMN IF NOT EXISTS "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_units" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_units" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_units" ADD COLUMN IF NOT EXISTS "serverVersion" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_units" ADD COLUMN IF NOT EXISTS "lastSyncAt" timestamp;
--> statement-breakpoint
ALTER TABLE "product_units" ADD COLUMN IF NOT EXISTS "conflictState" varchar(20) DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "product_units" ADD COLUMN IF NOT EXISTS "aggregateId" uuid;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "serverVersion" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "lastSyncAt" timestamp;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "conflictState" varchar(20) DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "aggregateId" uuid;
--> statement-breakpoint
ALTER TABLE "custom_field_defs" ADD COLUMN IF NOT EXISTS "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "custom_field_defs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "custom_field_defs" ADD COLUMN IF NOT EXISTS "serverVersion" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "custom_field_defs" ADD COLUMN IF NOT EXISTS "lastSyncAt" timestamp;
--> statement-breakpoint
ALTER TABLE "custom_field_defs" ADD COLUMN IF NOT EXISTS "conflictState" varchar(20) DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "custom_field_defs" ADD COLUMN IF NOT EXISTS "aggregateId" uuid;
--> statement-breakpoint
ALTER TABLE "custom_field_defs" ADD COLUMN IF NOT EXISTS "jsonSchema" jsonb;
--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD COLUMN IF NOT EXISTS "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD COLUMN IF NOT EXISTS "serverVersion" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD COLUMN IF NOT EXISTS "lastSyncAt" timestamp;
--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD COLUMN IF NOT EXISTS "conflictState" varchar(20) DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD COLUMN IF NOT EXISTS "aggregateId" uuid;
--> statement-breakpoint
ALTER TABLE "sales_reps" ADD COLUMN IF NOT EXISTS "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales_reps" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales_reps" ADD COLUMN IF NOT EXISTS "serverVersion" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales_reps" ADD COLUMN IF NOT EXISTS "lastSyncAt" timestamp;
--> statement-breakpoint
ALTER TABLE "sales_reps" ADD COLUMN IF NOT EXISTS "conflictState" varchar(20) DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "sales_reps" ADD COLUMN IF NOT EXISTS "aggregateId" uuid;
--> statement-breakpoint
ALTER TABLE "sales_reps" ADD COLUMN IF NOT EXISTS "currencyId" integer;
--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "serverVersion" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "lastSyncAt" timestamp;
--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "conflictState" varchar(20) DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "aggregateId" uuid;
--> statement-breakpoint
ALTER TABLE "drug_recalls" ADD COLUMN IF NOT EXISTS "batch_id" integer;
--> statement-breakpoint
ALTER TABLE "drug_recalls" ADD COLUMN IF NOT EXISTS "drug_name" varchar(200);
--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "quotation_alternatives" ADD COLUMN IF NOT EXISTS "name" varchar(255);
--> statement-breakpoint
ALTER TABLE "quotation_alternatives" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "quotation_alternatives" ADD COLUMN IF NOT EXISTS "itemsJson" jsonb DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "quotation_alternatives" ADD COLUMN IF NOT EXISTS "totalsJson" jsonb DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "quotation_alternatives" ADD COLUMN IF NOT EXISTS "isSelected" boolean DEFAULT false;
--> statement-breakpoint
ALTER TABLE "quotation_alternatives" ADD COLUMN IF NOT EXISTS "created_by_id" integer;
--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD COLUMN IF NOT EXISTS "serverVersion" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD COLUMN IF NOT EXISTS "lastSyncAt" timestamp;
--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD COLUMN IF NOT EXISTS "conflictState" varchar(20) DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "voucher_approvals" ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "voucher_approvals" ADD COLUMN IF NOT EXISTS "comment" text;
--> statement-breakpoint
ALTER TABLE "voucher_approvals" ADD COLUMN IF NOT EXISTS "decidedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "checked_in_at" timestamp;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "started_at" timestamp;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "no_show_at" timestamp;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "rescheduled_from_id" integer;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "created_by_id" integer;
--> statement-breakpoint
ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "created_by_id" integer;
--> statement-breakpoint
ALTER TABLE "medical_record_entries" ADD COLUMN IF NOT EXISTS "created_by_id" integer;
--> statement-breakpoint
ALTER TABLE "patient_consents" ADD COLUMN IF NOT EXISTS "revoked_by" varchar(255);
--> statement-breakpoint
ALTER TABLE "patient_consents" ADD COLUMN IF NOT EXISTS "notes" text;
--> statement-breakpoint
ALTER TABLE "patient_consents" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "security_incidents" ADD COLUMN IF NOT EXISTS "assignedTo" integer;
--> statement-breakpoint
ALTER TABLE "security_incidents" ADD COLUMN IF NOT EXISTS "notes" text;
--> statement-breakpoint
ALTER TABLE "vulnerabilities" ADD COLUMN IF NOT EXISTS "name" varchar(255);
--> statement-breakpoint
ALTER TABLE "vulnerabilities" ADD COLUMN IF NOT EXISTS "cveId" varchar(50);
--> statement-breakpoint
ALTER TABLE "vulnerabilities" ADD COLUMN IF NOT EXISTS "affectedAsset" varchar(255);
--> statement-breakpoint
ALTER TABLE "vulnerabilities" ADD COLUMN IF NOT EXISTS "patchedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "compliance_controls" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "compliance_controls" ADD COLUMN IF NOT EXISTS "evidence" jsonb DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "compliance_controls" ADD COLUMN IF NOT EXISTS "owner" varchar(255);
--> statement-breakpoint
ALTER TABLE "compliance_controls" ADD COLUMN IF NOT EXISTS "dueDate" timestamp;
--> statement-breakpoint
ALTER TABLE "compliance_controls" ADD COLUMN IF NOT EXISTS "lastAssessedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "threat_intel_sources" ADD COLUMN IF NOT EXISTS "sourceName" varchar(255);
--> statement-breakpoint
ALTER TABLE "threat_intel_sources" ADD COLUMN IF NOT EXISTS "url" text;
--> statement-breakpoint
ALTER TABLE "threat_intel_sources" ADD COLUMN IF NOT EXISTS "apiKeyRef" varchar(255);
--> statement-breakpoint
ALTER TABLE "threat_intel_sources" ADD COLUMN IF NOT EXISTS "lastFetchAt" timestamp;
--> statement-breakpoint
ALTER TABLE "threat_intel_sources" ADD COLUMN IF NOT EXISTS "fetchIntervalMin" integer DEFAULT 1440;
--> statement-breakpoint
ALTER TABLE "threat_intel_sources" ADD COLUMN IF NOT EXISTS "notes" text;
--> statement-breakpoint

