CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');--> statement-breakpoint
CREATE TYPE "public"."appointment_type" AS ENUM('new_patient', 'follow_up', 'consultation', 'procedure', 'emergency', 'routine', 'telemedicine');--> statement-breakpoint
CREATE TYPE "public"."blood_type" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."compliance_control_status" AS ENUM('not_applicable', 'not_implemented', 'partially_implemented', 'implemented', 'continuously_implemented');--> statement-breakpoint
CREATE TYPE "public"."compliance_framework" AS ENUM('iso27001', 'soc2', 'gdpr', 'pci_dss', 'hipaa', 'nist_csf', 'cis');--> statement-breakpoint
CREATE TYPE "public"."diagnosis_type" AS ENUM('primary', 'secondary', 'complication', 'cause_of_death');--> statement-breakpoint
CREATE TYPE "public"."drug_schedule" AS ENUM('OTC', 'PRESCRIPTION', 'CONTROLLED', 'PSYCHOTROPIC', 'THERAPEUTIC');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."icd_code_system" AS ENUM('ICD10', 'ICD9', 'ICPC2', 'SNOMED_CT');--> statement-breakpoint
CREATE TYPE "public"."drug_interaction_severity" AS ENUM('MAJOR', 'MODERATE', 'MINOR');--> statement-breakpoint
CREATE TYPE "public"."prescription_status" AS ENUM('pending', 'verified', 'dispensed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."quotation_approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."quotation_direction" AS ENUM('sale', 'purchase');--> statement-breakpoint
CREATE TYPE "public"."quotation_item_kind" AS ENUM('product', 'service', 'project', 'subscription', 'production', 'distribution', 'other');--> statement-breakpoint
CREATE TYPE "public"."quotation_link_type" AS ENUM('crm_customer', 'crm_supplier', 'inventory_product', 'procurement', 'sales_order', 'sales_invoice', 'purchase_order', 'purchase_invoice', 'project', 'service', 'production_order', 'accounting_entry');--> statement-breakpoint
CREATE TYPE "public"."quotation_negotiation_side" AS ENUM('us', 'counterparty');--> statement-breakpoint
CREATE TYPE "public"."quotation_party_role" AS ENUM('customer', 'supplier', 'broker', 'sales_rep', 'approver', 'contact');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('draft', 'in_review', 'approved', 'sent', 'negotiating', 'accepted', 'rejected', 'expired', 'converted', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."record_entry_type" AS ENUM('diagnosis', 'procedure', 'medication', 'allergy', 'vital_signs', 'lab_result', 'imaging', 'note', 'referral', 'instruction');--> statement-breakpoint
CREATE TYPE "public"."security_event_status" AS ENUM('detected', 'analyzed', 'investigating', 'contained', 'resolved', 'false_positive', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."security_event_type" AS ENUM('login_success', 'login_failed', 'login_mfa_failed', 'logout', 'password_changed', 'password_reset_request', 'password_reset_complete', 'user_created', 'user_modified', 'user_deleted', 'permission_granted', 'permission_revoked', 'role_changed', 'api_key_created', 'api_key_revoked', 'sensitive_data_accessed', 'sensitive_data_exported', 'suspicious_activity', 'anomaly_detected', 'rate_limit_exceeded', 'ip_blocked', 'session_expired', 'concurrent_session', 'password_weak', 'mfa_disabled', 'backup_started', 'backup_completed', 'backup_failed', 'restore_requested', 'data_breach_attempt', 'sql_injection_attempt', 'xss_attempt', 'csrf_attempt', 'file_upload_malicious', 'command_injection_attempt', 'privilege_escalation_attempt');--> statement-breakpoint
CREATE TYPE "public"."security_incident_severity" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."security_incident_status" AS ENUM('identified', 'investigating', 'contained', 'eradicated', 'recovered', 'closed', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."security_severity" AS ENUM('critical', 'high', 'medium', 'low', 'info');--> statement-breakpoint
CREATE TYPE "public"."visit_type" AS ENUM('outpatient', 'inpatient', 'emergency', 'telemedicine', 'home_visit');--> statement-breakpoint
CREATE TYPE "public"."voucher_approval_level" AS ENUM('none', 'level1', 'level2', 'level3', 'final');--> statement-breakpoint
CREATE TYPE "public"."voucher_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'posted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."voucher_type" AS ENUM('payment', 'receipt', 'journal', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."vulnerability_severity" AS ENUM('critical', 'high', 'medium', 'low', 'informational');--> statement-breakpoint
CREATE TYPE "public"."vulnerability_status" AS ENUM('identified', 'triaged', 'vulnerability_remediation', 'resolved', 'accepted', 'false_positive', 'deferred');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"appointment_number" varchar(50) NOT NULL,
	"patient_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"branch_id" integer,
	"type" "appointment_type" NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"visit_type" "visit_type" DEFAULT 'outpatient' NOT NULL,
	"scheduled_date" date NOT NULL,
	"scheduled_time" varchar(10) NOT NULL,
	"scheduled_end_time" varchar(10),
	"actual_start_time" timestamp,
	"actual_end_time" timestamp,
	"duration" integer,
	"chief_complaint" text,
	"notes" text,
	"reason" text,
	"is_first_visit" boolean DEFAULT false NOT NULL,
	"is_telemedicine" boolean DEFAULT false NOT NULL,
	"telemedicine_link" varchar(500),
	"consultation_fee" numeric(14, 2),
	"is_paid" boolean DEFAULT false NOT NULL,
	"payment_id" integer,
	"cancelled_at" timestamp,
	"cancelled_by" integer,
	"cancellation_reason" text,
	"no_show_reason" text,
	"is_follow_up" boolean DEFAULT false NOT NULL,
	"parent_appointment_id" integer,
	"follow_up_date" date,
	"visit_id" integer,
	"created_by" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "uq_appointment_number" UNIQUE("tenantId","appointment_number")
);
--> statement-breakpoint
CREATE TABLE "compliance_controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"framework" "compliance_framework" NOT NULL,
	"control_id" varchar(50) NOT NULL,
	"control_name" varchar(255) NOT NULL,
	"control_description" text,
	"control_category" varchar(100),
	"status" "compliance_control_status" DEFAULT 'not_implemented' NOT NULL,
	"implementation_date" date,
	"last_assessment_date" date,
	"next_assessment_date" date,
	"assessment_result" varchar(50),
	"assessment_evidence" text,
	"evidence_type" varchar(50),
	"evidence_location" varchar(500),
	"control_owner" integer,
	"control_owner_name" varchar(255),
	"residual_risk" varchar(50),
	"risk_treatment" varchar(50),
	"remediation_plan" text,
	"remediation_deadline" date,
	"remediation_owner" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "compliance_controls_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "compliance_gc_tenant_unique" UNIQUE("tenantId","GlobalId")
);
--> statement-breakpoint
CREATE TABLE "controlled_substances_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"product_id" integer NOT NULL,
	"operation" varchar(20) NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text NOT NULL,
	"reference_number" varchar(100),
	"user_id" integer NOT NULL,
	"customer_id" varchar(255),
	"prescription_id" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	CONSTRAINT "controlled_substances_log_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "drug_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer,
	"drug_a" varchar(200) NOT NULL,
	"drug_b" varchar(200) NOT NULL,
	"severity" "drug_interaction_severity" NOT NULL,
	"description" text NOT NULL,
	"mechanism" text,
	"clinical_effect" text,
	"recommendation" text,
	"evidence_level" varchar(20),
	"source" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drug_interactions_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "drug_recalls" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer,
	"product_id" integer,
	"product_name" varchar(200) NOT NULL,
	"batch_number" varchar(100),
	"recall_class" varchar(20) NOT NULL,
	"reason" text NOT NULL,
	"manufacturer" varchar(200),
	"recall_date" varchar(20) NOT NULL,
	"initiated_by" varchar(200),
	"affected_quantity" integer,
	"action" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"resolved_at" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drug_recalls_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "healthcare_facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"branch_id" integer,
	"name" varchar(200) NOT NULL,
	"code" varchar(50) NOT NULL,
	"type" varchar(50) NOT NULL,
	"specialty" varchar(100),
	"department" varchar(100),
	"floor" varchar(20),
	"building" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"accepts_insurance" boolean DEFAULT false NOT NULL,
	"insurance_providers" jsonb DEFAULT '[]'::jsonb,
	"operating_hours" jsonb DEFAULT '{}'::jsonb,
	"contact_phone" varchar(50),
	"contact_email" varchar(255),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "healthcare_facilities_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "uq_healthcare_facility_code" UNIQUE("tenantId","code")
);
--> statement-breakpoint
CREATE TABLE "healthcare_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"employee_id" integer,
	"user_id" uuid,
	"facility_id" integer,
	"license_number" varchar(100),
	"specialization" varchar(100) NOT NULL,
	"title" varchar(50),
	"qualifications" jsonb DEFAULT '[]'::jsonb,
	"years_experience" integer,
	"consultation_fee" numeric(14, 2),
	"follow_up_fee" numeric(14, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_accepting_patients" boolean DEFAULT true NOT NULL,
	"schedule_template" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "healthcare_providers_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "icd_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"system" "icd_code_system" NOT NULL,
	"description" text NOT NULL,
	"description_ar" text,
	"category" varchar(200),
	"sub_category" varchar(200),
	"is_active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_icd_code_system" UNIQUE("code","system")
);
--> statement-breakpoint
CREATE TABLE "insurance_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"claim_number" varchar(50) NOT NULL,
	"prescription_id" integer,
	"customer_id" varchar(255) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"insurance_provider" varchar(200) NOT NULL,
	"policy_number" varchar(100) NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"covered_amount" numeric(14, 2) DEFAULT '0',
	"copay_amount" numeric(14, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"submitted_at" timestamp,
	"response_at" timestamp,
	"rejection_reason" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "insurance_claims_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "uq_insurance_claim_number" UNIQUE("tenantId","claim_number")
);
--> statement-breakpoint
CREATE TABLE "medical_record_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"record_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"entry_type" "record_entry_type" NOT NULL,
	"diagnosis_type" "diagnosis_type",
	"icd_code" varchar(20),
	"icd_code_system" "icd_code_system",
	"diagnosis_description" text,
	"is_confirmed" boolean DEFAULT true NOT NULL,
	"procedure_code" varchar(20),
	"procedure_description" text,
	"procedure_notes" text,
	"medication_name" varchar(200),
	"dosage" varchar(100),
	"frequency" varchar(100),
	"duration" varchar(100),
	"route" varchar(50),
	"instructions" text,
	"description" text NOT NULL,
	"severity" varchar(20),
	"notes" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_by" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "medical_record_entries_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "medical_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"record_number" varchar(50) NOT NULL,
	"patient_id" integer NOT NULL,
	"appointment_id" integer,
	"visit_type" "visit_type" DEFAULT 'outpatient' NOT NULL,
	"provider_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"branch_id" integer,
	"visit_date" date NOT NULL,
	"admission_date" timestamp,
	"discharge_date" timestamp,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"chief_complaint" text,
	"history_of_present_illness" text,
	"physical_examination" text,
	"assessment" text,
	"plan" text,
	"discharge_notes" text,
	"discharge_diagnosis" text,
	"follow_up_instructions" text,
	"is_work_related" boolean DEFAULT false NOT NULL,
	"work_restriction" text,
	"signed_by" integer,
	"signed_at" timestamp,
	"created_by" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "medical_records_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "uq_medical_record_number" UNIQUE("tenantId","record_number")
);
--> statement-breakpoint
CREATE TABLE "patient_allergies" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"customer_id" varchar(255) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"allergen" varchar(200) NOT NULL,
	"allergen_type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"reaction" text,
	"diagnosed_by" varchar(255),
	"diagnosed_at" varchar(20),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patient_allergies_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "patient_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"consent_type" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"version" varchar(20),
	"is_granted" boolean NOT NULL,
	"granted_at" timestamp,
	"granted_by" varchar(255),
	"ip_address" varchar(50),
	"expiry_date" date,
	"revoked_at" timestamp,
	"revoked_reason" text,
	"document_url" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patient_consents_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"patient_number" varchar(50) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"local_first_name" varchar(100),
	"local_last_name" varchar(100),
	"gender" "gender" NOT NULL,
	"date_of_birth" date NOT NULL,
	"age" integer,
	"blood_type" "blood_type",
	"nationality" varchar(100),
	"national_id" varchar(50),
	"passport_number" varchar(50),
	"marital_status" varchar(20),
	"occupation" varchar(100),
	"email" varchar(255),
	"phone" varchar(50) NOT NULL,
	"mobile" varchar(50),
	"address" text,
	"city" varchar(100),
	"region" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100),
	"emergency_contact_name" varchar(255),
	"emergency_contact_phone" varchar(50),
	"emergency_contact_relation" varchar(50),
	"insurance_provider" varchar(200),
	"insurance_policy_number" varchar(100),
	"insurance_group_number" varchar(100),
	"insurance_card_number" varchar(100),
	"insurance_expiry" date,
	"co_payment_percent" numeric(5, 2),
	"primary_provider_id" integer,
	"primary_facility_id" integer,
	"allergies" jsonb DEFAULT '[]'::jsonb,
	"chronic_conditions" jsonb DEFAULT '[]'::jsonb,
	"medications" jsonb DEFAULT '[]'::jsonb,
	"family_history" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_vip" boolean DEFAULT false NOT NULL,
	"blacklist" boolean DEFAULT false NOT NULL,
	"blacklist_reason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patients_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "uq_patient_number" UNIQUE("tenantId","patient_number")
);
--> statement-breakpoint
CREATE TABLE "payment_gateways" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(60) NOT NULL,
	"providerType" varchar(40) NOT NULL,
	"name" varchar(120) NOT NULL,
	"country" varchar(60) DEFAULT 'عالمي' NOT NULL,
	"countryCode" varchar(2) DEFAULT 'GL' NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"mode" varchar(10) DEFAULT 'test' NOT NULL,
	"credentials" text,
	"feePercent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"feeFixed" numeric(10, 2) DEFAULT '0' NOT NULL,
	"instructions" text,
	"checkoutUrlTemplate" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "payment_gateways_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "payment_gateways_code_unique" UNIQUE("code"),
	CONSTRAINT "chk_payment_gateway_mode_valid" CHECK ("payment_gateways"."mode" IN ('test', 'live'))
);
--> statement-breakpoint
CREATE TABLE "prescription_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"prescription_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"dosage" varchar(100),
	"frequency" varchar(100),
	"duration" varchar(100),
	"instructions" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	CONSTRAINT "prescription_items_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_prescription_item_qty_positive" CHECK ("prescription_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"customer_id" varchar(255) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"doctor_name" varchar(255) NOT NULL,
	"doctor_license" varchar(100) NOT NULL,
	"issue_date" varchar(20) NOT NULL,
	"expiry_date" varchar(20) NOT NULL,
	"status" "prescription_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"prescription_number" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "prescriptions_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_prescription_tenant_not_null" CHECK ("prescriptions"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "quotation_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"quotationId" integer,
	"alertType" varchar(40) NOT NULL,
	"severity" varchar(20) DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb,
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_alerts_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "quotation_alternatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"quotationId" integer NOT NULL,
	"label" varchar(255) NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discountTotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"taxTotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"grandTotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"score" numeric(6, 2),
	"isRecommended" boolean DEFAULT false NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_alternatives_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "quotation_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"quotationId" integer NOT NULL,
	"versionNo" integer DEFAULT 1 NOT NULL,
	"inputHash" varchar(64) NOT NULL,
	"scores" jsonb NOT NULL,
	"ranking" jsonb,
	"benchmarks" jsonb,
	"anomalies" jsonb DEFAULT '[]'::jsonb,
	"forecast" jsonb,
	"recommendations" jsonb DEFAULT '[]'::jsonb,
	"whatIf" jsonb DEFAULT '[]'::jsonb,
	"generatedBy" varchar(30) DEFAULT 'engine' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_analyses_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "quotation_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"quotationId" integer NOT NULL,
	"versionNo" integer DEFAULT 1 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"approverId" integer,
	"approverName" varchar(255),
	"status" "quotation_approval_status" DEFAULT 'pending' NOT NULL,
	"comment" text,
	"decidedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_approvals_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "quotation_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"quotationId" integer NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"fileUrl" text NOT NULL,
	"fileType" varchar(100),
	"fileSize" integer,
	"uploadedById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_attachments_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"quotationId" integer NOT NULL,
	"kind" "quotation_item_kind" DEFAULT 'product' NOT NULL,
	"refId" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"quantity" numeric(15, 4) DEFAULT '1' NOT NULL,
	"unit" varchar(50) DEFAULT 'قطعة' NOT NULL,
	"unitPrice" numeric(15, 2) DEFAULT '0' NOT NULL,
	"costPrice" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discountPct" numeric(6, 2) DEFAULT '0' NOT NULL,
	"discountAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"taxPct" numeric(6, 2) DEFAULT '0' NOT NULL,
	"taxAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"lineTotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"lineCost" numeric(15, 2) DEFAULT '0' NOT NULL,
	"lineMargin" numeric(15, 2) DEFAULT '0' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "quotation_items_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_quotation_item_qty_positive" CHECK ("quotation_items"."quantity" > 0),
	CONSTRAINT "chk_quotation_item_price_not_negative" CHECK ("quotation_items"."unitPrice" >= 0),
	CONSTRAINT "chk_quotation_item_discount_range" CHECK ("quotation_items"."discountPct" >= 0 AND "quotation_items"."discountPct" <= 100)
);
--> statement-breakpoint
CREATE TABLE "quotation_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"quotationId" integer NOT NULL,
	"linkType" "quotation_link_type" NOT NULL,
	"entityType" varchar(50) NOT NULL,
	"entityId" integer NOT NULL,
	"notes" text,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_links_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "quotation_negotiations" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"quotationId" integer NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"side" "quotation_negotiation_side" NOT NULL,
	"message" text NOT NULL,
	"proposedTotal" numeric(15, 2),
	"proposedChanges" jsonb DEFAULT '{}'::jsonb,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_negotiations_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "quotation_parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"quotationId" integer NOT NULL,
	"role" "quotation_party_role" NOT NULL,
	"entityType" varchar(50),
	"entityId" integer,
	"name" varchar(255) NOT NULL,
	"commissionPct" numeric(6, 2) DEFAULT '0' NOT NULL,
	"commissionAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_parties_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "quotation_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"quotationId" integer NOT NULL,
	"category" varchar(30) DEFAULT 'general' NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isStandard" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_terms_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "quotation_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"nameAr" varchar(255),
	"direction" "quotation_direction" DEFAULT 'sale' NOT NULL,
	"itemKinds" jsonb DEFAULT '["product","service"]'::jsonb NOT NULL,
	"defaultValidityDays" integer DEFAULT 30 NOT NULL,
	"defaultTerms" jsonb DEFAULT '[]'::jsonb,
	"pricingConfig" jsonb DEFAULT '{}'::jsonb,
	"approvalPolicy" jsonb DEFAULT '{}'::jsonb,
	"numberingPrefix" varchar(20) DEFAULT 'QT',
	"isActive" boolean DEFAULT true NOT NULL,
	"isSystem" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "quotation_types_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "quotation_types_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_quotation_type_tenant_not_null" CHECK ("quotation_types"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "quotation_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"quotationId" integer NOT NULL,
	"versionNo" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changeSummary" text,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_versions_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "quotation_versions_quotation_no_unique" UNIQUE("quotationId","versionNo")
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"country" varchar(100) DEFAULT 'اليمن',
	"workSiteId" integer,
	"deviceId" integer,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"globalCode" varchar(160),
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"quotationNumber" varchar(50) NOT NULL,
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
	"currencyRate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"currencyId" integer,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discountTotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"taxTotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"commissionTotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"grandTotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"costTotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"marginTotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"marginPct" numeric(6, 2) DEFAULT '0' NOT NULL,
	"paymentTerms" jsonb DEFAULT '{}'::jsonb,
	"deliveryTerms" jsonb DEFAULT '{}'::jsonb,
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
	CONSTRAINT "quotations_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "quotations_quotationNumber_unique" UNIQUE("quotationNumber"),
	CONSTRAINT "quotations_gc_tenant_unique" UNIQUE("tenantId","globalCode"),
	CONSTRAINT "chk_quotation_totals_not_negative" CHECK ("quotations"."grandTotal" >= 0),
	CONSTRAINT "chk_quotation_currency_rate_positive" CHECK ("quotations"."currencyRate" > 0),
	CONSTRAINT "chk_quotation_version_positive" CHECK ("quotations"."version" >= 1),
	CONSTRAINT "chk_quotation_tenant_not_null" CHECK ("quotations"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"event_type" "security_event_type" NOT NULL,
	"severity" "security_severity" NOT NULL,
	"status" "security_event_status" DEFAULT 'detected' NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"raw_data" jsonb,
	"mitre_technique_id" varchar(20),
	"mitre_tactic_id" varchar(20),
	"ioc_type" varchar(50),
	"ioc_value" varchar(500),
	"actor_type" varchar(20),
	"actor_id" integer,
	"actor_name" varchar(255),
	"actor_ip" varchar(45),
	"actor_user_agent" text,
	"actor_location" varchar(255),
	"target_type" varchar(50),
	"target_id" integer,
	"target_name" varchar(255),
	"risk_score" numeric(5, 2) DEFAULT '0',
	"risk_factors" jsonb,
	"recommended_action" text,
	"attack_pattern" varchar(100),
	"kill_chain_phase" varchar(50),
	"session_id" varchar(100),
	"session_risk" numeric(5, 2) DEFAULT '0',
	"compliance_framework" varchar(50),
	"compliance_control" varchar(50),
	"analysis_notes" text,
	"false_positive_reason" text,
	"confirmed_by" integer,
	"confirmed_at" timestamp,
	"escalated_to" integer,
	"escalated_at" timestamp,
	"escalation_reason" text,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"resolution_notes" text,
	"correlated_event_ids" jsonb,
	"incident_id" integer,
	"event_timestamp" timestamp NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"server_version" integer DEFAULT 1 NOT NULL,
	"last_sync_at" timestamp,
	"conflict_state" varchar(20) DEFAULT 'none',
	"aggregate_id" uuid,
	CONSTRAINT "security_events_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_security_risk_score_range" CHECK ("security_events"."risk_score" >= 0 AND "security_events"."risk_score" <= 100),
	CONSTRAINT "chk_security_severity_defined" CHECK ("security_events"."severity" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "security_incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"incident_number" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"severity" "security_incident_severity" NOT NULL,
	"status" "security_incident_status" DEFAULT 'identified' NOT NULL,
	"category" varchar(100),
	"detected_at" timestamp NOT NULL,
	"reported_at" timestamp,
	"investigated_at" timestamp,
	"contained_at" timestamp,
	"eradicated_at" timestamp,
	"recovered_at" timestamp,
	"closed_at" timestamp,
	"affected_users" integer DEFAULT 0,
	"affected_systems" integer DEFAULT 0,
	"data_breach" boolean DEFAULT false,
	"financial_impact" numeric(15, 2),
	"reputational_impact" varchar(50),
	"root_cause" text,
	"attack_vector" varchar(100),
	"mitre_attack_pattern" varchar(100),
	"immediate_actions" text,
	"containment_actions" text,
	"eradication_actions" text,
	"recovery_actions" text,
	"lessons_learned" text,
	"improvement_actions" text,
	"incident_lead" integer,
	"team_members" jsonb,
	"regulatory_notification" boolean DEFAULT false,
	"regulatory_notification_date" timestamp,
	"customer_notification" boolean DEFAULT false,
	"customer_notification_date" timestamp,
	"response_cost" numeric(15, 2),
	"downtime_cost" numeric(15, 2),
	"total_cost" numeric(15, 2),
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "security_incidents_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "incidents_gc_tenant_unique" UNIQUE("tenantId","GlobalId")
);
--> statement-breakpoint
CREATE TABLE "subscription_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"planId" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"country" varchar(60) DEFAULT 'عالمي' NOT NULL,
	"countryCode" varchar(2) DEFAULT 'GL' NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"faceValue" numeric(10, 2),
	"periodMonths" integer DEFAULT 1 NOT NULL,
	"scope" varchar(20) DEFAULT 'single' NOT NULL,
	"deliveryMode" varchar(20) DEFAULT 'manual' NOT NULL,
	"deliveryTarget" varchar(255),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"createdBy" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"activatedAt" timestamp,
	"redemption" jsonb,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "subscription_codes_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "subscription_codes_code_unique" UNIQUE("code"),
	CONSTRAINT "chk_subscription_code_price_positive" CHECK ("subscription_codes"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "subscription_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(120) NOT NULL,
	"trialDays" integer DEFAULT 14 NOT NULL,
	"graceDays" integer DEFAULT 30 NOT NULL,
	"graceFullAccess" boolean DEFAULT true NOT NULL,
	"maxOverdueDays" integer DEFAULT 120 NOT NULL,
	"restrictedFeatures" jsonb,
	"dunningReminderDays" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_policies_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "subscription_policies_code_unique" UNIQUE("code"),
	CONSTRAINT "chk_policy_trial_days_positive" CHECK ("subscription_policies"."trialDays" >= 0),
	CONSTRAINT "chk_policy_grace_days_positive" CHECK ("subscription_policies"."graceDays" >= 0),
	CONSTRAINT "chk_policy_overdue_days_positive" CHECK ("subscription_policies"."maxOverdueDays" >= 0)
);
--> statement-breakpoint
CREATE TABLE "threat_intel_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"source_type" varchar(50),
	"feed_format" varchar(50),
	"api_endpoint" varchar(500),
	"api_key" varchar(500),
	"last_sync_at" timestamp,
	"sync_frequency" varchar(50),
	"is_active" boolean DEFAULT true,
	"last_error" text,
	"iocs_imported" integer DEFAULT 0,
	"threats_detected" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "threat_intel_sources_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "vital_sign_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"record_id" integer,
	"appointment_id" integer,
	"recorded_at" timestamp NOT NULL,
	"recorded_by" integer NOT NULL,
	"temperature" numeric(5, 2),
	"temperature_unit" varchar(10) DEFAULT 'C',
	"heart_rate" integer,
	"respiratory_rate" integer,
	"blood_pressure_systolic" integer,
	"blood_pressure_diastolic" integer,
	"oxygen_saturation" numeric(5, 2),
	"weight" numeric(6, 2),
	"height" numeric(6, 2),
	"bmi" numeric(5, 2),
	"waist_circumference" numeric(6, 2),
	"head_circumference" numeric(5, 2),
	"pain_level" integer,
	"glasgow_coma_scale" integer,
	"pupil_response" varchar(50),
	"notes" text,
	"is_abnormal" boolean DEFAULT false NOT NULL,
	"abnormal_flags" jsonb DEFAULT '[]'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vital_sign_records_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "voucher_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"voucherId" integer NOT NULL,
	"approval_level" "voucher_approval_level" NOT NULL,
	"action" varchar(20) NOT NULL,
	"approver_id" integer,
	"approver_name" varchar(255),
	"comments" text,
	"previous_status" "voucher_status",
	"new_status" "voucher_status" NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "voucher_approvals_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "voucher_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"voucherId" integer NOT NULL,
	"accountId" integer NOT NULL,
	"account_code" varchar(20) NOT NULL,
	"account_name" varchar(255),
	"debit_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"credit_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"cost_center_id" integer,
	"department_id" integer,
	"project_id" integer,
	"allocation_percentage" numeric(5, 2) DEFAULT '100',
	"allocated_amount" numeric(18, 4) DEFAULT '0',
	"description" varchar(500),
	"reference" varchar(100),
	"line_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "voucher_lines_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_voucher_line_amounts" CHECK (("voucher_lines"."debit_amount" > 0 AND "voucher_lines"."credit_amount" = 0) OR ("voucher_lines"."debit_amount" = 0 AND "voucher_lines"."credit_amount" > 0) OR ("voucher_lines"."debit_amount" = 0 AND "voucher_lines"."credit_amount" = 0)),
	CONSTRAINT "chk_voucher_line_allocation" CHECK ("voucher_lines"."allocation_percentage" >= 0 AND "voucher_lines"."allocation_percentage" <= 100)
);
--> statement-breakpoint
CREATE TABLE "voucher_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"voucher_type" "voucher_type" NOT NULL,
	"prefix" varchar(10) NOT NULL,
	"current_number" integer DEFAULT 0 NOT NULL,
	"format" varchar(50) DEFAULT '{PREFIX}/{YYYY}/{NNNNNN}' NOT NULL,
	"reset_period" varchar(20) DEFAULT 'yearly',
	"last_reset_date" date,
	"number_padding" integer DEFAULT 6,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "voucher_sequences_tenant_type" UNIQUE("tenantId","voucher_type")
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"voucher_number" varchar(50) NOT NULL,
	"voucher_prefix" varchar(10) DEFAULT 'VCH' NOT NULL,
	"voucher_type" "voucher_type" NOT NULL,
	"status" "voucher_status" DEFAULT 'draft' NOT NULL,
	"voucher_date" date NOT NULL,
	"due_date" date,
	"posting_date" timestamp,
	"amount" numeric(18, 4) NOT NULL,
	"base_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"currency_id" integer,
	"exchange_rate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"counterparty_type" varchar(20),
	"counterparty_id" integer,
	"counterparty_name" varchar(255),
	"bank_account_id" integer,
	"bank_account_code" varchar(20),
	"reference_no" varchar(100),
	"reference_type" varchar(50),
	"reference_id" integer,
	"linked_voucher_id" integer,
	"department_id" integer,
	"project_id" integer,
	"cost_center_id" integer,
	"business_unit" varchar(100),
	"budget_id" integer,
	"budget_line_id" integer,
	"budget_validated" boolean DEFAULT false,
	"budget_variance" numeric(18, 4) DEFAULT '0',
	"approval_level" "voucher_approval_level" DEFAULT 'none',
	"approved_by_id" integer,
	"approved_at" timestamp,
	"rejected_by_id" integer,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"requires_level1_approval" boolean DEFAULT false,
	"requires_level2_approval" boolean DEFAULT false,
	"requires_level3_approval" boolean DEFAULT false,
	"posted_by_id" integer,
	"journal_entry_id" integer,
	"reversal_of_id" integer,
	"description" text,
	"notes" text,
	"internal_memo" text,
	"attachments_count" integer DEFAULT 0,
	"branch_id" integer,
	"created_by_id" integer,
	"updated_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"server_version" integer DEFAULT 1 NOT NULL,
	"last_sync_at" timestamp,
	"conflict_state" varchar(20) DEFAULT 'none',
	"aggregate_id" uuid,
	CONSTRAINT "vouchers_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "vouchers_gc_tenant_unique" UNIQUE("tenantId","GlobalId"),
	CONSTRAINT "chk_voucher_amount_positive" CHECK ("vouchers"."amount" > 0),
	CONSTRAINT "chk_voucher_base_amount_positive" CHECK ("vouchers"."base_amount" >= 0),
	CONSTRAINT "chk_voucher_exchange_rate_positive" CHECK ("vouchers"."exchange_rate" > 0)
);
--> statement-breakpoint
CREATE TABLE "vulnerabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"vuln_id" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"severity" "vulnerability_severity" NOT NULL,
	"cvss_score" numeric(3, 1),
	"cvss_vector" varchar(200),
	"cwe_id" varchar(20),
	"cwe_name" varchar(255),
	"capec_id" varchar(20),
	"status" "vulnerability_status" DEFAULT 'identified' NOT NULL,
	"asset_type" varchar(50),
	"asset_id" integer,
	"asset_name" varchar(255),
	"asset_ip" varchar(45),
	"software_name" varchar(100),
	"software_version" varchar(50),
	"patch_available" boolean DEFAULT false,
	"patch_version" varchar(50),
	"remediation" text,
	"remediation_complexity" varchar(20),
	"remediation_deadline" date,
	"discovered_by" varchar(100),
	"discovered_at" timestamp DEFAULT now() NOT NULL,
	"assigned_to" integer,
	"resolved_at" timestamp,
	"is_exploitable" boolean DEFAULT false,
	"exploitation_attempts" integer DEFAULT 0,
	"is_in_wild" boolean DEFAULT false,
	"business_impact" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vulnerabilities_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "vulns_gc_tenant_unique" UNIQUE("tenantId","GlobalId")
);
--> statement-breakpoint
ALTER TABLE "budget_lines" ADD COLUMN "spent_amount" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "country" varchar(100) DEFAULT 'اليمن';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "countryCode" varchar(2) DEFAULT 'YE';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "taxIdType" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "isVatRegistered" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "commercialReg" varchar(100);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "idNumber" varchar(100);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "postalCode" varchar(20);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "buyerType" varchar(10) DEFAULT 'b2b';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "paymentTermsDays" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "costCenterId" integer;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "warehouseId" integer;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "projectId" integer;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "orderId" integer;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "costCenterId" integer;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "warehouseId" integer;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "projectId" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "documentTemplate" text;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "countryPricing" jsonb;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "country" varchar(100) DEFAULT 'اليمن';--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "countryCode" varchar(2) DEFAULT 'YE';--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "taxIdType" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "isVatRegistered" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "commercialReg" varchar(100);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "idNumber" varchar(100);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "postalCode" varchar(20);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "buyerType" varchar(10) DEFAULT 'b2b';--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "paymentTermsDays" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "emailVerified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verificationToken" varchar(128);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verificationTokenExpiry" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "resetToken" varchar(128);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "resetTokenExpiry" timestamp;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_codes" ADD CONSTRAINT "subscription_codes_planId_subscription_plans_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_approvals" ADD CONSTRAINT "voucher_approvals_voucherId_vouchers_id_fk" FOREIGN KEY ("voucherId") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_approvals" ADD CONSTRAINT "voucher_approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_voucherId_vouchers_id_fk" FOREIGN KEY ("voucherId") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_accountId_accounts_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_bank_account_id_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_budget_line_id_budget_lines_id_fk" FOREIGN KEY ("budget_line_id") REFERENCES "public"."budget_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_rejected_by_id_users_id_fk" FOREIGN KEY ("rejected_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_posted_by_id_users_id_fk" FOREIGN KEY ("posted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_appointments_tenant" ON "appointments" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_appointments_patient" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_provider" ON "appointments" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_facility" ON "appointments" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_date" ON "appointments" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_appointments_status" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_appointments_number" ON "appointments" USING btree ("appointment_number");--> statement-breakpoint
CREATE INDEX "idx_compliance_tenant" ON "compliance_controls" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_compliance_framework" ON "compliance_controls" USING btree ("framework");--> statement-breakpoint
CREATE INDEX "idx_compliance_control" ON "compliance_controls" USING btree ("framework","control_id");--> statement-breakpoint
CREATE INDEX "idx_compliance_status" ON "compliance_controls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_controlled_log_product" ON "controlled_substances_log" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_controlled_log_tenant" ON "controlled_substances_log" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_controlled_log_timestamp" ON "controlled_substances_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_drug_interactions_a" ON "drug_interactions" USING btree ("drug_a");--> statement-breakpoint
CREATE INDEX "idx_drug_interactions_b" ON "drug_interactions" USING btree ("drug_b");--> statement-breakpoint
CREATE INDEX "idx_drug_interactions_tenant" ON "drug_interactions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_drug_recalls_tenant" ON "drug_recalls" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_drug_recalls_status" ON "drug_recalls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_drug_recalls_class" ON "drug_recalls" USING btree ("recall_class");--> statement-breakpoint
CREATE INDEX "idx_healthcare_facilities_tenant" ON "healthcare_facilities" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_healthcare_facilities_branch" ON "healthcare_facilities" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_healthcare_facilities_type" ON "healthcare_facilities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_healthcare_providers_tenant" ON "healthcare_providers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_healthcare_providers_employee" ON "healthcare_providers" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_healthcare_providers_facility" ON "healthcare_providers" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_healthcare_providers_specialization" ON "healthcare_providers" USING btree ("specialization");--> statement-breakpoint
CREATE INDEX "idx_icd_codes_code" ON "icd_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_icd_codes_system" ON "icd_codes" USING btree ("system");--> statement-breakpoint
CREATE INDEX "idx_insurance_claims_tenant" ON "insurance_claims" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_insurance_claims_customer" ON "insurance_claims" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_insurance_claims_status" ON "insurance_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_medical_record_entries_record" ON "medical_record_entries" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "idx_medical_record_entries_patient" ON "medical_record_entries" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_medical_record_entries_type" ON "medical_record_entries" USING btree ("entry_type");--> statement-breakpoint
CREATE INDEX "idx_medical_record_entries_icd" ON "medical_record_entries" USING btree ("icd_code");--> statement-breakpoint
CREATE INDEX "idx_medical_records_tenant" ON "medical_records" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_medical_records_patient" ON "medical_records" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_medical_records_provider" ON "medical_records" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_medical_records_facility" ON "medical_records" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_medical_records_visit_date" ON "medical_records" USING btree ("visit_date");--> statement-breakpoint
CREATE INDEX "idx_medical_records_number" ON "medical_records" USING btree ("record_number");--> statement-breakpoint
CREATE INDEX "idx_patient_allergies_customer" ON "patient_allergies" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_patient_allergies_tenant" ON "patient_allergies" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_patient_consents_patient" ON "patient_consents" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_patient_consents_tenant" ON "patient_consents" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_patient_consents_type" ON "patient_consents" USING btree ("consent_type");--> statement-breakpoint
CREATE INDEX "idx_patients_tenant" ON "patients" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_patients_number" ON "patients" USING btree ("patient_number");--> statement-breakpoint
CREATE INDEX "idx_patients_phone" ON "patients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_patients_email" ON "patients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_patients_national_id" ON "patients" USING btree ("national_id");--> statement-breakpoint
CREATE INDEX "idx_patients_name" ON "patients" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "idx_payment_gateway_active" ON "payment_gateways" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "idx_payment_gateway_country" ON "payment_gateways" USING btree ("countryCode");--> statement-breakpoint
CREATE INDEX "idx_prescription_items_prescription" ON "prescription_items" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "idx_prescription_items_product" ON "prescription_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_tenant" ON "prescriptions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_customer" ON "prescriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_status" ON "prescriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_quotation_alerts_tenant" ON "quotation_alerts" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_quotation_alerts_quotation" ON "quotation_alerts" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_alerts_unread" ON "quotation_alerts" USING btree ("tenantId","isRead");--> statement-breakpoint
CREATE INDEX "idx_quotation_alternatives_quotation" ON "quotation_alternatives" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_analyses_quotation" ON "quotation_analyses" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_analyses_created" ON "quotation_analyses" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_quotation_approvals_quotation" ON "quotation_approvals" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_approvals_status" ON "quotation_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_quotation_attachments_quotation" ON "quotation_attachments" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_items_quotation" ON "quotation_items" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_items_tenant" ON "quotation_items" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_quotation_items_kind" ON "quotation_items" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_quotation_links_quotation" ON "quotation_links" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_links_entity" ON "quotation_links" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "idx_quotation_negotiations_quotation" ON "quotation_negotiations" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_parties_quotation" ON "quotation_parties" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_parties_entity" ON "quotation_parties" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "idx_quotation_terms_quotation" ON "quotation_terms" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_types_tenant" ON "quotation_types" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_quotation_versions_quotation" ON "quotation_versions" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotations_tenant" ON "quotations" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_quotations_tenant_status" ON "quotations" USING btree ("tenantId","status");--> statement-breakpoint
CREATE INDEX "idx_quotations_tenant_direction" ON "quotations" USING btree ("tenantId","direction");--> statement-breakpoint
CREATE INDEX "idx_quotations_customer" ON "quotations" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "idx_quotations_supplier" ON "quotations" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX "idx_quotations_type" ON "quotations" USING btree ("typeId");--> statement-breakpoint
CREATE INDEX "idx_security_events_tenant" ON "security_events" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_security_events_type" ON "security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_security_events_severity" ON "security_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_security_events_status" ON "security_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_security_events_timestamp" ON "security_events" USING btree ("event_timestamp");--> statement-breakpoint
CREATE INDEX "idx_security_events_actor" ON "security_events" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX "idx_security_events_target" ON "security_events" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_security_events_mitre" ON "security_events" USING btree ("mitre_technique_id");--> statement-breakpoint
CREATE INDEX "idx_security_events_ioc" ON "security_events" USING btree ("ioc_type","ioc_value");--> statement-breakpoint
CREATE INDEX "idx_security_events_incident" ON "security_events" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "idx_security_events_risk_score" ON "security_events" USING btree ("risk_score");--> statement-breakpoint
CREATE INDEX "idx_incidents_tenant" ON "security_incidents" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_incidents_number" ON "security_incidents" USING btree ("tenantId","incident_number");--> statement-breakpoint
CREATE INDEX "idx_incidents_status" ON "security_incidents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_incidents_severity" ON "security_incidents" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_incidents_category" ON "security_incidents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_subscription_code_status" ON "subscription_codes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_subscription_code_country" ON "subscription_codes" USING btree ("countryCode");--> statement-breakpoint
CREATE INDEX "idx_threat_intel_tenant" ON "threat_intel_sources" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_threat_intel_active" ON "threat_intel_sources" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_vital_signs_patient" ON "vital_sign_records" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_vital_signs_record" ON "vital_sign_records" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "idx_vital_signs_appointment" ON "vital_sign_records" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "idx_vital_signs_recorded_at" ON "vital_sign_records" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "idx_voucher_approvals_voucher" ON "voucher_approvals" USING btree ("voucherId");--> statement-breakpoint
CREATE INDEX "idx_voucher_approvals_approver" ON "voucher_approvals" USING btree ("approver_id");--> statement-breakpoint
CREATE INDEX "idx_voucher_approvals_level" ON "voucher_approvals" USING btree ("approval_level");--> statement-breakpoint
CREATE INDEX "idx_voucher_lines_voucher" ON "voucher_lines" USING btree ("voucherId");--> statement-breakpoint
CREATE INDEX "idx_voucher_lines_account" ON "voucher_lines" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "idx_voucher_lines_cost_center" ON "voucher_lines" USING btree ("cost_center_id");--> statement-breakpoint
CREATE INDEX "idx_voucher_sequences_tenant" ON "voucher_sequences" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_vouchers_tenant" ON "vouchers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_vouchers_number" ON "vouchers" USING btree ("tenantId","voucher_number");--> statement-breakpoint
CREATE INDEX "idx_vouchers_type" ON "vouchers" USING btree ("tenantId","voucher_type");--> statement-breakpoint
CREATE INDEX "idx_vouchers_status" ON "vouchers" USING btree ("tenantId","status");--> statement-breakpoint
CREATE INDEX "idx_vouchers_date" ON "vouchers" USING btree ("voucher_date");--> statement-breakpoint
CREATE INDEX "idx_vouchers_counterparty" ON "vouchers" USING btree ("counterparty_type","counterparty_id");--> statement-breakpoint
CREATE INDEX "idx_vouchers_cost_center" ON "vouchers" USING btree ("cost_center_id");--> statement-breakpoint
CREATE INDEX "idx_vouchers_department" ON "vouchers" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_vouchers_project" ON "vouchers" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_vouchers_journal" ON "vouchers" USING btree ("journal_entry_id");--> statement-breakpoint
CREATE INDEX "idx_vulns_tenant" ON "vulnerabilities" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_vulns_cve" ON "vulnerabilities" USING btree ("tenantId","vuln_id");--> statement-breakpoint
CREATE INDEX "idx_vulns_severity" ON "vulnerabilities" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_vulns_status" ON "vulnerabilities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_vulns_asset" ON "vulnerabilities" USING btree ("asset_type","asset_id");--> statement-breakpoint
CREATE INDEX "idx_vulns_exploitable" ON "vulnerabilities" USING btree ("is_exploitable");--> statement-breakpoint
CREATE INDEX "idx_customers_country" ON "customers" USING btree ("countryCode");--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_costCenter" ON "purchase_invoices" USING btree ("costCenterId");--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_warehouse" ON "purchase_invoices" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_project" ON "purchase_invoices" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_branch_costCenter" ON "purchase_invoices" USING btree ("branchId","costCenterId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_order" ON "sales_invoices" USING btree ("orderId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_salesInvoices_tenant_order" ON "sales_invoices" USING btree ("tenantId","orderId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_costCenter" ON "sales_invoices" USING btree ("costCenterId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_warehouse" ON "sales_invoices" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_project" ON "sales_invoices" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_branch_costCenter" ON "sales_invoices" USING btree ("branchId","costCenterId");--> statement-breakpoint
CREATE INDEX "idx_suppliers_country" ON "suppliers" USING btree ("countryCode");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_username" ON "users" USING btree ("username");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "chk_customer_payment_terms_not_negative" CHECK ("customers"."paymentTermsDays" >= 0);