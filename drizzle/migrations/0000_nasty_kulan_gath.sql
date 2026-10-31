CREATE TYPE "public"."account_type" AS ENUM('asset', 'liability', 'equity', 'revenue', 'expense');--> statement-breakpoint
CREATE TYPE "public"."allocation_method" AS ENUM('fixed', 'proportional', 'step_down', 'reciprocal', 'activity_based');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');--> statement-breakpoint
CREATE TYPE "public"."appointment_type" AS ENUM('new_patient', 'follow_up', 'consultation', 'procedure', 'emergency', 'routine', 'telemedicine');--> statement-breakpoint
CREATE TYPE "public"."approval_decision" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'late', 'leave');--> statement-breakpoint
CREATE TYPE "public"."batch_status" AS ENUM('active', 'expired', 'recalled', 'consumed');--> statement-breakpoint
CREATE TYPE "public"."batch_tracking_method" AS ENUM('none', 'batch', 'lot', 'serial');--> statement-breakpoint
CREATE TYPE "public"."blood_type" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."budget_version" AS ENUM('draft', 'approved', 'revised', 'final');--> statement-breakpoint
CREATE TYPE "public"."consolidation_method" AS ENUM('full', 'proportional', 'cost');--> statement-breakpoint
CREATE TYPE "public"."cost_center_type" AS ENUM('cost', 'profit', 'investment', 'revenue');--> statement-breakpoint
CREATE TYPE "public"."cycle_count_status" AS ENUM('planned', 'in_progress', 'completed', 'cancelled', 'approved');--> statement-breakpoint
CREATE TYPE "public"."diagnosis_type" AS ENUM('primary', 'secondary', 'complication', 'cause_of_death');--> statement-breakpoint
CREATE TYPE "public"."drug_interaction_severity" AS ENUM('MAJOR', 'MODERATE', 'MINOR');--> statement-breakpoint
CREATE TYPE "public"."drug_schedule" AS ENUM('OTC', 'PRESCRIPTION', 'CONTROLLED', 'PSYCHOTROPIC', 'THERAPEUTIC');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('active', 'on_leave', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."expense_approval_status" AS ENUM('pending', 'approved', 'rejected', 'auto_approved');--> statement-breakpoint
CREATE TYPE "public"."expense_basis" AS ENUM('accrual', 'cash');--> statement-breakpoint
CREATE TYPE "public"."fiscal_period_status" AS ENUM('open', 'closing', 'closed', 'reopened');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."icd_code_system" AS ENUM('ICD10', 'ICD9', 'ICPC2', 'SNOMED_CT');--> statement-breakpoint
CREATE TYPE "public"."inspection_result" AS ENUM('pass', 'fail', 'conditional');--> statement-breakpoint
CREATE TYPE "public"."inventory_allocation_type" AS ENUM('serial', 'batch');--> statement-breakpoint
CREATE TYPE "public"."inventory_movement_type" AS ENUM('in', 'out', 'transfer', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."inventory_tracking_type" AS ENUM('none', 'serial', 'batch', 'matrix');--> statement-breakpoint
CREATE TYPE "public"."kpi_data_type" AS ENUM('currency', 'percentage', 'ratio', 'count', 'days', 'custom');--> statement-breakpoint
CREATE TYPE "public"."kpi_frequency" AS ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'realtime');--> statement-breakpoint
CREATE TYPE "public"."lifecycle_status" AS ENUM('saved', 'approved', 'sent', 'posted', 'completed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'transfer', 'credit', 'online', 'cash_yer', 'cash_sar', 'hawala', 'shabab', 'mobile_money', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."payment_source" AS ENUM('sales', 'purchases');--> statement-breakpoint
CREATE TYPE "public"."payroll_status" AS ENUM('draft', 'processed', 'paid');--> statement-breakpoint
CREATE TYPE "public"."prescription_status" AS ENUM('pending', 'verified', 'dispensed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('goods', 'service');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."purchase_invoice_status" AS ENUM('draft', 'confirmed', 'paid', 'partial', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."quotation_approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."quotation_direction" AS ENUM('sale', 'purchase');--> statement-breakpoint
CREATE TYPE "public"."quotation_item_kind" AS ENUM('product', 'service', 'project', 'subscription', 'production', 'distribution', 'other');--> statement-breakpoint
CREATE TYPE "public"."quotation_link_type" AS ENUM('crm_customer', 'crm_supplier', 'inventory_product', 'procurement', 'sales_order', 'sales_invoice', 'purchase_order', 'purchase_invoice', 'project', 'service', 'production_order', 'accounting_entry');--> statement-breakpoint
CREATE TYPE "public"."quotation_negotiation_side" AS ENUM('us', 'counterparty');--> statement-breakpoint
CREATE TYPE "public"."quotation_party_role" AS ENUM('customer', 'supplier', 'broker', 'sales_rep', 'approver', 'contact');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('draft', 'in_review', 'approved', 'sent', 'negotiating', 'accepted', 'rejected', 'expired', 'converted', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."record_entry_type" AS ENUM('diagnosis', 'procedure', 'medication', 'allergy', 'vital_signs', 'lab_result', 'imaging', 'note', 'referral', 'instruction');--> statement-breakpoint
CREATE TYPE "public"."recurring_expense_frequency" AS ENUM('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'custom');--> statement-breakpoint
CREATE TYPE "public"."recurring_expense_status" AS ENUM('draft', 'active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('tabular', 'pivot', 'chart', 'dashboard', 'financial_statement', 'custom');--> statement-breakpoint
CREATE TYPE "public"."requisition_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'ordered', 'received');--> statement-breakpoint
CREATE TYPE "public"."reservation_source" AS ENUM('sales_order', 'purchase_order', 'production_order', 'transfer_order', 'manual');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('active', 'fulfilled', 'released', 'expired');--> statement-breakpoint
CREATE TYPE "public"."sales_invoice_status" AS ENUM('draft', 'confirmed', 'paid', 'partial', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."serial_status" AS ENUM('available', 'sold', 'reserved', 'returned', 'damaged', 'stolen');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('in', 'out', 'transfer', 'adjustment', 'return', 'production', 'waste');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'grace', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'review', 'done');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'auditor', 'accountant', 'owner', 'user');--> statement-breakpoint
CREATE TYPE "public"."visit_type" AS ENUM('outpatient', 'inpatient', 'emergency', 'telemedicine', 'home_visit');--> statement-breakpoint
CREATE TYPE "public"."voucher_approval_level" AS ENUM('none', 'level1', 'level2', 'level3', 'final');--> statement-breakpoint
CREATE TYPE "public"."voucher_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'posted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."voucher_type" AS ENUM('payment', 'receipt', 'journal', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."workflow_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."workflow_status" AS ENUM('draft', 'pending_approval', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."workflow_step_status" AS ENUM('pending', 'active', 'completed', 'skipped', 'failed', 'reassigned');--> statement-breakpoint
CREATE TYPE "public"."workflow_step_type" AS ENUM('approval', 'task', 'notification', 'automation', 'integration', 'parallel', 'gateway');--> statement-breakpoint
CREATE TYPE "public"."workflow_transition_type" AS ENUM('submit', 'approve', 'reject', 'reassign', 'escalate', 'delegate', 'complete', 'cancel', 'resume', 'hold');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "account_type" NOT NULL,
	"parentAccountId" integer,
	"category" varchar(100),
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"isCustom" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "accounts_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "accounts_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_account_tenant_not_null" CHECK ("accounts"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer,
	"userId" integer,
	"sessionId" uuid,
	"userName" varchar(255),
	"action" varchar(255) NOT NULL,
	"entityType" varchar(100),
	"entityId" integer,
	"details" text,
	"ipAddress" varchar(45),
	"userAgent" varchar(500),
	"deviceId" integer,
	"deviceFingerprint" varchar(255),
	"country" varchar(100),
	"city" varchar(120),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"previousHash" varchar(64),
	"currentHash" varchar(64) DEFAULT '' NOT NULL,
	"chainSequence" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "activity_logs_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "allocation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"method" "allocation_method" DEFAULT 'proportional' NOT NULL,
	"sourceType" varchar(30) NOT NULL,
	"sourceCostCenterId" integer,
	"sourceAccountId" integer,
	"sourceFixedAmount" numeric(15, 2),
	"targetCostCenterIds" jsonb NOT NULL,
	"basisType" varchar(50),
	"basisDriverId" integer,
	"basisFormula" text,
	"filterAccountTypes" jsonb,
	"filterDateRange" jsonb,
	"isRecurring" boolean DEFAULT false NOT NULL,
	"frequency" varchar(20),
	"nextRunAt" timestamp,
	"lastRunAt" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "allocation_rules_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_allocation_rule_tenant_not_null" CHECK ("allocation_rules"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "allocation_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"ruleId" integer NOT NULL,
	"periodName" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"totalAllocated" numeric(15, 2) DEFAULT '0',
	"details" jsonb,
	"postedAt" timestamp,
	"postedById" integer,
	"reversedAt" timestamp,
	"reversedById" integer,
	"reversalReason" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "allocation_runs_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "allocation_runs_rule_period_unique" UNIQUE("ruleId","periodName"),
	CONSTRAINT "chk_allocation_run_tenant_not_null" CHECK ("allocation_runs"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"keyHash" varchar(255) NOT NULL,
	"keyPrefix" varchar(20) NOT NULL,
	"scopes" jsonb,
	"rateLimit" integer DEFAULT 1000 NOT NULL,
	"expiresAt" timestamp,
	"lastUsedAt" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "api_keys_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "api_keys_keyHash_unique" UNIQUE("keyHash"),
	CONSTRAINT "chk_api_key_tenant_not_null" CHECK ("api_keys"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"appointment_number" varchar(50) NOT NULL,
	"patient_id" integer NOT NULL,
	"provider_id" integer,
	"facility_id" integer,
	"appointment_type" "appointment_type" DEFAULT 'new_patient',
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"scheduled_date" timestamp,
	"scheduled_time" varchar(20),
	"scheduled_end_time" varchar(20),
	"duration" integer,
	"chief_complaint" text,
	"notes" text,
	"reason" text,
	"is_first_visit" boolean DEFAULT false,
	"is_telemedicine" boolean DEFAULT false,
	"consultation_fee" numeric(14, 2),
	"visit_type" "visit_type" DEFAULT 'outpatient',
	"checked_in_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"no_show_at" timestamp,
	"rescheduled_from_id" integer,
	"created_by_id" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "uq_appointments_number_tenant" UNIQUE("tenantId","appointment_number")
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"employeeId" integer NOT NULL,
	"date" timestamp NOT NULL,
	"checkIn" timestamp,
	"checkOut" timestamp,
	"status" "attendance_status" DEFAULT 'present' NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"deviceId" integer,
	"ipAddress" varchar(45),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	CONSTRAINT "attendance_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "attendance_employee_date_unique" UNIQUE("employeeId","date"),
	CONSTRAINT "chk_attendance_tenant_not_null" CHECK ("attendance"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"userId" integer,
	"sessionId" uuid,
	"action" varchar(100) NOT NULL,
	"entityType" varchar(100) NOT NULL,
	"entityId" integer NOT NULL,
	"entityGlobalId" uuid,
	"oldValues" jsonb,
	"newValues" jsonb,
	"ipAddress" varchar(45),
	"userAgent" varchar(500),
	"deviceId" integer,
	"deviceFingerprint" varchar(255),
	"country" varchar(100),
	"city" varchar(120),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"previousHash" varchar(64),
	"currentHash" varchar(64) DEFAULT '' NOT NULL,
	"chainSequence" integer DEFAULT 0 NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_audit_log_tenant_not_null" CHECK ("audit_logs"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "billing_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"subscriptionId" integer,
	"invoiceNumber" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"taxAmount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"dueDate" timestamp NOT NULL,
	"paidAt" timestamp,
	"paymentMethod" varchar(50),
	"externalPaymentId" varchar(255),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	"idempotency_key" varchar(255),
	CONSTRAINT "billing_invoices_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "billingInvoices_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "chk_billing_invoice_subtotal_not_negative" CHECK ("billing_invoices"."subtotal" >= 0),
	CONSTRAINT "chk_billing_invoice_tax_not_negative" CHECK ("billing_invoices"."taxAmount" >= 0),
	CONSTRAINT "chk_billing_invoice_total_not_negative" CHECK ("billing_invoices"."total" >= 0),
	CONSTRAINT "chk_billing_invoice_tenant_not_null" CHECK ("billing_invoices"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
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
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"city" varchar(100),
	"isMain" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "branches_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "branches_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_branch_tenant_not_null" CHECK ("branches"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "budget_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"scenarioId" integer NOT NULL,
	"accountId" integer NOT NULL,
	"costCenterId" integer,
	"periodName" varchar(50) NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"spent_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"quantity" numeric(15, 4),
	"unitPrice" numeric(15, 4),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "budget_lines_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "budget_lines_scenario_account_cc_period_unique" UNIQUE("scenarioId","accountId","costCenterId","periodName"),
	CONSTRAINT "chk_budget_line_tenant_not_null" CHECK ("budget_lines"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "budget_scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"version" "budget_version" DEFAULT 'draft' NOT NULL,
	"periodName" varchar(50) NOT NULL,
	"costCenterId" integer,
	"assumptions" jsonb,
	"approvedById" integer,
	"approvedAt" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "budget_scenarios_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "budget_scenarios_tenant_name_period_unique" UNIQUE("tenantId","name","periodName"),
	CONSTRAINT "chk_budget_scenario_tenant_not_null" CHECK ("budget_scenarios"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"periodName" varchar(50) NOT NULL,
	"targetRevenue" numeric(15, 2) NOT NULL,
	"targetExpense" numeric(15, 2) NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	CONSTRAINT "budgets_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "budgets_tenant_period_unique" UNIQUE("tenantId","periodName"),
	CONSTRAINT "chk_budget_revenue_not_negative" CHECK ("budgets"."targetRevenue" >= 0),
	CONSTRAINT "chk_budget_expense_not_negative" CHECK ("budgets"."targetExpense" >= 0)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"nameAr" varchar(100),
	"parentId" integer,
	"type" varchar(30) DEFAULT 'product',
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "categories_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_category_tenant_not_null" CHECK ("categories"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "compliance_controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"framework" varchar(50) NOT NULL,
	"control_id" varchar(50) NOT NULL,
	"control_name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(30) DEFAULT 'not_implemented' NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb,
	"owner" varchar(255),
	"dueDate" timestamp,
	"lastAssessedAt" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "compliance_controls_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "compliance_controls_framework_id_tenant_unique" UNIQUE("tenantId","framework","control_id")
);
--> statement-breakpoint
CREATE TABLE "consolidation_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"periodName" varchar(50) NOT NULL,
	"consolidationEntityId" integer NOT NULL,
	"adjustmentType" varchar(50) NOT NULL,
	"accountId" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"exchangeRate" numeric(18, 8) DEFAULT '1',
	"description" text,
	"postedAt" timestamp,
	"postedById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "consolidation_adjustments_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_consolidation_adj_tenant_not_null" CHECK ("consolidation_adjustments"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "consolidation_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(150) NOT NULL,
	"entityTenantId" integer NOT NULL,
	"ownershipPercent" numeric(5, 2) DEFAULT '100' NOT NULL,
	"method" "consolidation_method" DEFAULT 'full' NOT NULL,
	"functionalCurrency" varchar(10) DEFAULT 'YER' NOT NULL,
	"reportingCurrency" varchar(10) DEFAULT 'YER' NOT NULL,
	"eliminationRules" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "consolidation_entities_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "consolidation_entities_tenant_code_unique" UNIQUE("tenantId","code"),
	CONSTRAINT "chk_consolidation_ownership" CHECK ("consolidation_entities"."ownershipPercent" > 0 AND "consolidation_entities"."ownershipPercent" <= 100),
	CONSTRAINT "chk_consolidation_tenant_not_null" CHECK ("consolidation_entities"."tenantId" IS NOT NULL)
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
CREATE TABLE "cost_centers" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(150) NOT NULL,
	"nameAr" varchar(150),
	"type" "cost_center_type" DEFAULT 'cost' NOT NULL,
	"parentId" integer,
	"managerId" integer,
	"departmentId" integer,
	"budgetAccountId" integer,
	"isActive" boolean DEFAULT true NOT NULL,
	"description" text,
	"allocationBase" varchar(50),
	"allocationWeight" numeric(10, 4) DEFAULT '1',
	"path" varchar(500),
	"level" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "cost_centers_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "cost_centers_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_cost_center_tenant_not_null" CHECK ("cost_centers"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"rate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"decimalPlaces" integer DEFAULT 2 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "currencies_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "currencies_code_unique" UNIQUE("code"),
	CONSTRAINT "chk_currency_rate_positive" CHECK ("currencies"."rate" > 0),
	CONSTRAINT "chk_currency_code_format" CHECK ("currencies"."code" ~ '^[A-Z]{3}$')
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
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"email" varchar(255),
	"address" text,
	"city" varchar(100),
	"taxNumber" varchar(100),
	"balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"creditLimit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"loyaltyPoints" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	"country" varchar(100) DEFAULT 'اليمن',
	"countryCode" varchar(2) DEFAULT 'YE',
	"taxIdType" varchar(20) DEFAULT 'none',
	"isVatRegistered" boolean DEFAULT false NOT NULL,
	"commercialReg" varchar(100),
	"idNumber" varchar(100),
	"postalCode" varchar(20),
	"buyerType" varchar(10) DEFAULT 'b2b',
	"paymentTermsDays" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "customers_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "customers_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_customer_credit_limit_not_negative" CHECK ("customers"."creditLimit" >= 0),
	CONSTRAINT "chk_customer_tenant_not_null" CHECK ("customers"."tenantId" IS NOT NULL),
	CONSTRAINT "chk_customer_payment_terms_not_negative" CHECK ("customers"."paymentTermsDays" >= 0)
);
--> statement-breakpoint
CREATE TABLE "cycle_count_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"cycleCountId" integer NOT NULL,
	"productId" integer NOT NULL,
	"warehouseId" integer NOT NULL,
	"batchId" integer,
	"systemQty" integer DEFAULT 0 NOT NULL,
	"countedQty" integer,
	"varianceQty" integer,
	"variancePct" numeric(5, 2),
	"varianceValue" numeric(15, 2),
	"unitCost" numeric(15, 4),
	"status" varchar(20) DEFAULT 'pending',
	"countedById" integer,
	"countedAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "cycle_count_lines_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "cycleCountLines_cycleCount_product_warehouse_batch_unique" UNIQUE("cycleCountId","productId","warehouseId","batchId"),
	CONSTRAINT "chk_cycle_count_line_tenant_not_null" CHECK ("cycle_count_lines"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "cycle_counts" (
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
	"countNumber" varchar(50) NOT NULL,
	"warehouseId" integer NOT NULL,
	"status" "cycle_count_status" DEFAULT 'planned' NOT NULL,
	"plannedDate" timestamp NOT NULL,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"approvedAt" timestamp,
	"approvedById" integer,
	"assignedToId" integer,
	"varianceThreshold" numeric(5, 2) DEFAULT '5' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cycle_counts_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "cycleCounts_countNumber_tenant_unique" UNIQUE("countNumber","tenantId"),
	CONSTRAINT "chk_cycle_count_tenant_not_null" CHECK ("cycle_counts"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(150) NOT NULL,
	"managerId" integer,
	"parentDepartmentId" integer,
	"costCenter" varchar(50),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "departments_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_department_tenant_not_null" CHECK ("departments"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(30) DEFAULT 'pos' NOT NULL,
	"workSiteId" integer,
	"location" varchar(255),
	"lastSeenAt" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"fingerprint" varchar(255),
	"os" varchar(100),
	"osVersion" varchar(50),
	"appVersion" varchar(50),
	"publicKey" text,
	CONSTRAINT "devices_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "devices_fingerprint_unique" UNIQUE("fingerprint"),
	CONSTRAINT "devices_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_device_tenant_not_null" CHECK ("devices"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
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
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "documents_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_document_tenant_not_null" CHECK ("documents"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "drizzle_migrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"batch_id" integer,
	"drug_name" varchar(200) NOT NULL,
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
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(30) NOT NULL,
	"userId" integer,
	"departmentId" integer,
	"fullName" varchar(150) NOT NULL,
	"jobTitle" varchar(120) NOT NULL,
	"nationalId" varchar(40),
	"phone" varchar(30),
	"email" varchar(150),
	"hireDate" timestamp,
	"salary" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(10) DEFAULT 'YER',
	"status" "employee_status" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	CONSTRAINT "employees_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_employee_salary_not_negative" CHECK ("employees"."salary" >= 0),
	CONSTRAINT "chk_employee_tenant_not_null" CHECK ("employees"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"baseCurrency" varchar(10) NOT NULL,
	"quoteCurrency" varchar(10) NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"source" varchar(50),
	"effectiveFrom" timestamp NOT NULL,
	"effectiveTo" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "exchange_rates_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "exchange_rates_pair_effective_unique" UNIQUE("baseCurrency","quoteCurrency","effectiveFrom"),
	CONSTRAINT "chk_exchange_rate_positive" CHECK ("exchange_rates"."rate" > 0)
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer,
	"key" varchar(100) NOT NULL,
	"value" varchar(255) NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "feature_flags_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "feature_flags_tenant_key_unique" UNIQUE("tenantId","key")
);
--> statement-breakpoint
CREATE TABLE "file_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer,
	"userId" integer,
	"fileName" varchar(255) NOT NULL,
	"originalName" varchar(255) NOT NULL,
	"mimeType" varchar(100) NOT NULL,
	"fileSize" integer NOT NULL,
	"storageKey" varchar(500) NOT NULL,
	"storageProvider" varchar(50) DEFAULT 's3' NOT NULL,
	"url" varchar(500) NOT NULL,
	"entityType" varchar(50),
	"entityId" integer,
	"folder" varchar(200),
	"isPublic" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"deletedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"sha256Hash" varchar(64) DEFAULT '' NOT NULL,
	"md5Hash" varchar(32),
	"isEncrypted" boolean DEFAULT false NOT NULL,
	"encryptionKeyId" varchar(100),
	"encryptionAlgorithm" varchar(50),
	"deviceId" integer,
	"deviceFingerprint" varchar(255),
	"ipAddress" varchar(45),
	"country" varchar(100),
	"city" varchar(120),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"retentionPolicy" varchar(50) DEFAULT 'standard',
	"retentionExpiresAt" timestamp,
	"legalHold" boolean DEFAULT false NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "file_uploads_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_file_upload_size_positive" CHECK ("file_uploads"."fileSize" > 0)
);
--> statement-breakpoint
CREATE TABLE "fiscal_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"label" varchar(100),
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"status" "fiscal_period_status" DEFAULT 'open' NOT NULL,
	"closedAt" timestamp,
	"closedById" integer,
	"reopenedAt" timestamp,
	"reopenedById" integer,
	"reopenReason" varchar(255),
	"closingEntryId" integer,
	"retainedEarningsAccountId" integer,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "fiscal_periods_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "fiscal_periods_tenant_name_unique" UNIQUE("tenantId","name"),
	CONSTRAINT "chk_fiscal_period_dates" CHECK ("fiscal_periods"."startDate" <= "fiscal_periods"."endDate"),
	CONSTRAINT "chk_fiscal_period_tenant_not_null" CHECK ("fiscal_periods"."tenantId" IS NOT NULL)
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
	CONSTRAINT "insurance_claims_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "inventory_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"type" "inventory_allocation_type" NOT NULL,
	"productId" integer NOT NULL,
	"variantId" integer,
	"batchId" integer,
	"serialNumbers" text[],
	"quantity" integer NOT NULL,
	"cartLineId" varchar(100) NOT NULL,
	"sessionId" integer,
	"allocatedAt" timestamp DEFAULT now() NOT NULL,
	"releasedAt" timestamp,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "inventory_allocations_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_inventoryAllocation_tenant_not_null" CHECK ("inventory_allocations"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "inventory_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"productId" integer NOT NULL,
	"warehouseId" integer NOT NULL,
	"batchNumber" varchar(100) NOT NULL,
	"lotNumber" varchar(100),
	"serialNumber" varchar(100),
	"manufacturingDate" timestamp,
	"expiryDate" timestamp,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reservedQty" integer DEFAULT 0 NOT NULL,
	"unitCost" numeric(15, 4) DEFAULT '0' NOT NULL,
	"purchaseInvoiceId" integer,
	"purchaseInvoiceItemId" integer,
	"notes" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "inventory_batches_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "inventoryBatches_product_warehouse_batch_tenant_unique" UNIQUE("productId","warehouseId","batchNumber","tenantId"),
	CONSTRAINT "chk_inventory_batch_qty_not_negative" CHECK ("inventory_batches"."quantity" >= 0),
	CONSTRAINT "chk_inventory_batch_reserved_not_negative" CHECK ("inventory_batches"."reservedQty" >= 0),
	CONSTRAINT "chk_inventory_batch_tenant_not_null" CHECK ("inventory_batches"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"productId" integer NOT NULL,
	"warehouseId" integer,
	"type" "inventory_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"referenceId" integer,
	"referenceType" varchar(50),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "inventory_movements_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_inventory_movement_quantity_not_zero" CHECK ("inventory_movements"."quantity" != 0),
	CONSTRAINT "chk_inventory_movement_tenant_not_null" CHECK ("inventory_movements"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "inventory_valuation_layers" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"productId" integer NOT NULL,
	"warehouseId" integer,
	"batchId" integer,
	"layerDate" timestamp NOT NULL,
	"quantity" integer NOT NULL,
	"remainingQty" integer NOT NULL,
	"unitCost" numeric(15, 4) NOT NULL,
	"totalCost" numeric(15, 2) NOT NULL,
	"sourceType" varchar(50) NOT NULL,
	"sourceId" integer,
	"referenceType" varchar(50),
	"referenceId" integer,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "inventory_valuation_layers_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_valuation_layer_qty_positive" CHECK ("inventory_valuation_layers"."quantity" > 0),
	CONSTRAINT "chk_valuation_layer_remaining_not_negative" CHECK ("inventory_valuation_layers"."remainingQty" >= 0),
	CONSTRAINT "chk_valuation_layer_unit_cost_positive" CHECK ("inventory_valuation_layers"."unitCost" > 0),
	CONSTRAINT "chk_valuation_layer_tenant_not_null" CHECK ("inventory_valuation_layers"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
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
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	"isImmutable" boolean DEFAULT false NOT NULL,
	CONSTRAINT "journal_entries_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_journal_total_not_negative" CHECK ("journal_entries"."totalAmount" >= 0),
	CONSTRAINT "chk_journal_tenant_not_null" CHECK ("journal_entries"."tenantId" IS NOT NULL),
	CONSTRAINT "chk_journal_immutable_posted" CHECK (
      CASE WHEN "journal_entries"."status" = 'posted' THEN "journal_entries"."isImmutable" = true ELSE true END
    )
);
--> statement-breakpoint
CREATE TABLE "kpi_measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"kpiId" integer NOT NULL,
	"periodName" varchar(50) NOT NULL,
	"costCenterId" integer,
	"value" numeric(15, 4) NOT NULL,
	"targetValue" numeric(15, 4),
	"variance" numeric(15, 4),
	"variancePercent" numeric(10, 2),
	"status" varchar(20) DEFAULT 'on_track' NOT NULL,
	"computedAt" timestamp DEFAULT now() NOT NULL,
	"computedBy" varchar(50) DEFAULT 'auto',
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "kpi_measurements_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "kpi_measurements_kpi_period_cc_unique" UNIQUE("kpiId","periodName","costCenterId"),
	CONSTRAINT "chk_kpi_measurement_tenant_not_null" CHECK ("kpi_measurements"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "kpis" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"nameAr" varchar(150),
	"description" text,
	"category" varchar(50),
	"dataType" "kpi_data_type" DEFAULT 'currency' NOT NULL,
	"frequency" "kpi_frequency" DEFAULT 'monthly' NOT NULL,
	"formula" text,
	"numeratorAccountIds" jsonb,
	"denominatorAccountIds" jsonb,
	"targetValue" numeric(15, 4),
	"targetMin" numeric(15, 4),
	"targetMax" numeric(15, 4),
	"warningThreshold" numeric(15, 4),
	"criticalThreshold" numeric(15, 4),
	"higherIsBetter" boolean DEFAULT true NOT NULL,
	"decimalPlaces" integer DEFAULT 2 NOT NULL,
	"chartType" varchar(20) DEFAULT 'line',
	"color" varchar(20) DEFAULT '#3B82F6',
	"isActive" boolean DEFAULT true NOT NULL,
	"isSystem" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "kpis_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "kpis_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_kpi_tenant_not_null" CHECK ("kpis"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer,
	"userId" integer,
	"username" varchar(120),
	"success" boolean NOT NULL,
	"ip" varchar(64),
	"userAgent" text,
	"device" varchar(120),
	"deviceFingerprint" varchar(255),
	"country" varchar(100),
	"city" varchar(120),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"riskScore" integer DEFAULT 0 NOT NULL,
	"riskFactors" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "login_attempts_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "matrix_dimension_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"dimensionId" integer NOT NULL,
	"value" varchar(100) NOT NULL,
	"valueAr" varchar(100),
	"code" varchar(50) NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"colorCode" varchar(7),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "matrix_dimension_values_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "matrixDimensionValues_code_dimension_unique" UNIQUE("code","dimensionId"),
	CONSTRAINT "chk_matrixDimensionValue_tenant_not_null" CHECK ("matrix_dimension_values"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "matrix_dimensions" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"nameAr" varchar(100),
	"code" varchar(50) NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "matrix_dimensions_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "matrixDimensions_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_matrixDimension_tenant_not_null" CHECK ("matrix_dimensions"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "matrix_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"productId" integer NOT NULL,
	"matrixId" integer NOT NULL,
	"combinationCode" varchar(50) NOT NULL,
	"combinationName" varchar(255) NOT NULL,
	"combinationNameAr" varchar(255),
	"variantIds" integer[] NOT NULL,
	"barcode" varchar(100),
	"salePrice" numeric(15, 2) DEFAULT '0' NOT NULL,
	"wholesalePrice" numeric(15, 2) DEFAULT '0' NOT NULL,
	"costPrice" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currentStock" integer DEFAULT 0 NOT NULL,
	"minStock" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "matrix_items_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "matrixItems_combination_tenant_unique" UNIQUE("combinationCode","tenantId"),
	CONSTRAINT "chk_matrixItem_tenant_not_null" CHECK ("matrix_items"."tenantId" IS NOT NULL)
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
	"is_confirmed" boolean DEFAULT false,
	"severity" varchar(20),
	"notes" text,
	"created_by_id" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
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
	"visit_type" "visit_type" DEFAULT 'outpatient',
	"provider_id" integer,
	"facility_id" integer,
	"visit_date" timestamp,
	"admission_date" timestamp,
	"discharge_date" timestamp,
	"chief_complaint" text,
	"history_of_present_illness" text,
	"physical_examination" text,
	"assessment" text,
	"plan" text,
	"created_by_id" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "medical_records_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "uq_medical_records_number_tenant" UNIQUE("tenantId","record_number")
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
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer,
	"userId" integer,
	"type" varchar(50) NOT NULL,
	"channel" varchar(50) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"status" varchar(20) NOT NULL,
	"sentAt" timestamp,
	"readAt" timestamp,
	"metadata" jsonb,
	"errorMessage" text,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "notifications_GlobalId_unique" UNIQUE("GlobalId")
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
CREATE TABLE "opening_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"accountId" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"type" "transaction_type" DEFAULT 'debit' NOT NULL,
	"notes" text,
	"periodName" varchar(50) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	"exchangeRate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"baseAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "opening_balances_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "openingBalances_account_period_tenant_unique" UNIQUE("accountId","periodName","tenantId"),
	CONSTRAINT "chk_opening_balance_amount_not_negative" CHECK ("opening_balances"."amount" >= 0),
	CONSTRAINT "chk_opening_balance_exchange_rate_positive" CHECK ("opening_balances"."exchangeRate" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"productId" integer NOT NULL,
	"productName" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(15, 2) NOT NULL,
	"total" numeric(15, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
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
	"orderNumber" varchar(50) NOT NULL,
	"customerId" integer,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"deliveryAddress" text,
	"deliveryDate" timestamp,
	"deliveryNotes" text,
	"assignedTo" varchar(255),
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"currencyId" integer,
	"idempotency_key" varchar(255),
	CONSTRAINT "orders_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "orders_gc_tenant_unique" UNIQUE("tenantId","globalCode"),
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "chk_order_total_not_negative" CHECK ("orders"."total" >= 0),
	CONSTRAINT "chk_order_tenant_not_null" CHECK ("orders"."tenantId" IS NOT NULL)
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
	"version" varchar(50),
	"is_granted" boolean DEFAULT false NOT NULL,
	"granted_at" timestamp,
	"granted_by" varchar(255),
	"revoked_at" timestamp,
	"revoked_by" varchar(255),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patient_consents_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"patient_number" varchar(50) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"local_first_name" varchar(100),
	"local_last_name" varchar(100),
	"gender" "gender",
	"date_of_birth" timestamp,
	"age" integer,
	"blood_type" "blood_type",
	"nationality" varchar(100),
	"national_id" varchar(100),
	"passport_number" varchar(100),
	"marital_status" varchar(50),
	"occupation" varchar(100),
	"email" varchar(255),
	"phone" varchar(50),
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
	"insurance_card_number" varchar(100),
	"insurance_expiry" varchar(20),
	"primary_provider_id" integer,
	"primary_facility_id" integer,
	"allergies" jsonb DEFAULT '[]'::jsonb,
	"chronic_conditions" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"is_vip" boolean DEFAULT false,
	"is_active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patients_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "uq_patients_number_tenant" UNIQUE("tenantId","patient_number")
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
CREATE TABLE "payment_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"invoiceId" integer,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"status" varchar(20) NOT NULL,
	"paymentMethod" varchar(50),
	"transactionId" varchar(255),
	"refundedAmount" numeric(10, 2) DEFAULT '0',
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	"idempotency_key" varchar(255),
	CONSTRAINT "payment_history_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "paymentHistory_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "chk_payment_history_amount_positive" CHECK ("payment_history"."amount" > 0),
	CONSTRAINT "chk_payment_history_refund_not_negative" CHECK ("payment_history"."refundedAmount" >= 0),
	CONSTRAINT "chk_payment_history_tenant_not_null" CHECK ("payment_history"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"source" "payment_source" NOT NULL,
	"invoiceId" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"paymentMethod" "payment_method" DEFAULT 'cash',
	"paymentDate" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	"exchangeRate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"baseAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"idempotency_key" varchar(255),
	CONSTRAINT "payments_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "chk_payment_amount_positive" CHECK ("payments"."amount" > 0),
	CONSTRAINT "chk_payment_base_amount_positive" CHECK ("payments"."baseAmount" >= 0),
	CONSTRAINT "chk_payment_exchange_rate_positive" CHECK ("payments"."exchangeRate" > 0),
	CONSTRAINT "chk_payment_tenant_not_null" CHECK ("payments"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "payroll_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"payrollRunId" integer NOT NULL,
	"employeeId" integer NOT NULL,
	"basicSalary" numeric(15, 2) DEFAULT '0' NOT NULL,
	"deductions" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net" numeric(15, 2) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "payroll_items_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "payroll_items_run_employee_unique" UNIQUE("payrollRunId","employeeId"),
	CONSTRAINT "chk_payroll_item_basic_not_negative" CHECK ("payroll_items"."basicSalary" >= 0),
	CONSTRAINT "chk_payroll_item_deductions_not_negative" CHECK ("payroll_items"."deductions" >= 0),
	CONSTRAINT "chk_payroll_item_net_not_negative" CHECK ("payroll_items"."net" >= 0),
	CONSTRAINT "chk_payroll_item_tenant_not_null" CHECK ("payroll_items"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"periodName" varchar(40) NOT NULL,
	"fromDate" timestamp NOT NULL,
	"toDate" timestamp NOT NULL,
	"totalNet" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" "payroll_status" DEFAULT 'draft' NOT NULL,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	CONSTRAINT "payroll_runs_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "payroll_runs_tenant_period_unique" UNIQUE("tenantId","periodName"),
	CONSTRAINT "chk_payroll_run_total_not_negative" CHECK ("payroll_runs"."totalNet" >= 0),
	CONSTRAINT "chk_payroll_run_tenant_not_null" CHECK ("payroll_runs"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	"category" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "permissions_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "pos_cash_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"sessionId" integer NOT NULL,
	"type" varchar(10) NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"reason" varchar(255) NOT NULL,
	"notes" text,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	CONSTRAINT "pos_cash_events_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_pos_cash_amount_positive" CHECK ("pos_cash_events"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pos_held_carts" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(40) NOT NULL,
	"heldById" integer NOT NULL,
	"branchId" integer,
	"sessionId" integer,
	"customerId" integer,
	"snapshot" text NOT NULL,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"itemCount" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	CONSTRAINT "pos_held_carts_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "pos_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"sessionId" integer,
	"salesInvoiceId" integer,
	"total" numeric(15, 2) DEFAULT '0',
	"paymentMethod" varchar(20),
	"status" varchar(20) DEFAULT 'completed',
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	CONSTRAINT "pos_orders_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_pos_order_total_not_negative" CHECK ("pos_orders"."total" >= 0),
	CONSTRAINT "chk_pos_order_tenant_not_null" CHECK ("pos_orders"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "pos_return_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"returnId" integer NOT NULL,
	"productId" integer NOT NULL,
	"productName" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(15, 2) NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"taxAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total" numeric(15, 2) NOT NULL,
	"restock" boolean DEFAULT true NOT NULL,
	"condition" varchar(20) DEFAULT 'new' NOT NULL,
	"serialNumbers" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"returnNumber" varchar(50) NOT NULL,
	"originalInvoiceId" integer NOT NULL,
	"originalInvoiceNumber" varchar(50),
	"customerId" integer,
	"branchId" integer,
	"sessionId" integer,
	"refundMethod" "payment_method" DEFAULT 'cash',
	"refundReference" varchar(100),
	"reason" varchar(255),
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"refundAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"createdById" integer NOT NULL,
	"processedById" integer,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"processedAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	CONSTRAINT "pos_returns_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_pos_return_refund_not_negative" CHECK ("pos_returns"."refundAmount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pos_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
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
	"deviceId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	CONSTRAINT "pos_sessions_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_pos_session_tenant_not_null" CHECK ("pos_sessions"."tenantId" IS NOT NULL)
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
	CONSTRAINT "prescription_items_GlobalId_unique" UNIQUE("GlobalId")
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
	"issue_date" timestamp NOT NULL,
	"expiry_date" timestamp NOT NULL,
	"status" "prescription_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"prescription_number" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "prescriptions_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "procurement_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"procurementId" integer NOT NULL,
	"approverId" integer,
	"level" integer DEFAULT 1 NOT NULL,
	"decision" "approval_decision" DEFAULT 'pending' NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "procurement_approvals_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "procurement_approvals_proc_level_unique" UNIQUE("procurementId","level"),
	CONSTRAINT "chk_procurement_approval_tenant_not_null" CHECK ("procurement_approvals"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "procurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"requisitionNumber" varchar(40) NOT NULL,
	"requestedById" integer,
	"departmentId" integer,
	"itemName" varchar(200) NOT NULL,
	"description" text,
	"quantity" numeric(12, 2) DEFAULT '1' NOT NULL,
	"unit" varchar(20) DEFAULT 'قطعة',
	"estimatedCost" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(10) DEFAULT 'YER',
	"supplierId" integer,
	"status" "requisition_status" DEFAULT 'draft' NOT NULL,
	"approvedById" integer,
	"approvers" jsonb,
	"approvalStep" integer DEFAULT 0 NOT NULL,
	"approvalLog" jsonb,
	"receivedCost" numeric(15, 2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	CONSTRAINT "procurements_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_procurement_quantity_positive" CHECK ("procurements"."quantity" > 0),
	CONSTRAINT "chk_procurement_estimated_cost_not_negative" CHECK ("procurements"."estimatedCost" >= 0),
	CONSTRAINT "chk_procurement_tenant_not_null" CHECK ("procurements"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "product_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"productId" integer NOT NULL,
	"variantId" integer,
	"batchNumber" varchar(100) NOT NULL,
	"manufactureDate" timestamp,
	"expiryDate" timestamp,
	"receivedDate" timestamp DEFAULT now() NOT NULL,
	"quantityReceived" integer NOT NULL,
	"quantityRemaining" integer NOT NULL,
	"unitCost" numeric(15, 2) NOT NULL,
	"supplierId" integer,
	"purchaseOrderId" integer,
	"warehouseId" integer NOT NULL,
	"location" varchar(100),
	"status" "batch_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "product_batches_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "productBatches_number_tenant_unique" UNIQUE("batchNumber","tenantId"),
	CONSTRAINT "chk_productBatch_tenant_not_null" CHECK ("product_batches"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "product_serials" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"productId" integer NOT NULL,
	"variantId" integer,
	"batchId" integer,
	"serialNumber" varchar(100) NOT NULL,
	"status" serial_status DEFAULT 'available' NOT NULL,
	"warehouseId" integer NOT NULL,
	"location" varchar(100),
	"soldAt" timestamp,
	"soldToInvoiceId" integer,
	"soldToCustomerId" integer,
	"costPrice" numeric(15, 2),
	"warrantyExpiryDate" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "product_serials_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "productSerials_number_tenant_unique" UNIQUE("serialNumber","tenantId"),
	CONSTRAINT "chk_productSerial_tenant_not_null" CHECK ("product_serials"."tenantId" IS NOT NULL)
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
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"productId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"nameAr" varchar(255),
	"attributes" jsonb NOT NULL,
	"barcode" varchar(100),
	"salePrice" numeric(15, 2) DEFAULT '0' NOT NULL,
	"wholesalePrice" numeric(15, 2) DEFAULT '0' NOT NULL,
	"costPrice" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currentStock" integer DEFAULT 0 NOT NULL,
	"minStock" integer DEFAULT 0 NOT NULL,
	"maxStock" integer,
	"weight" numeric(10, 3),
	"dimensions" jsonb,
	"imageUrl" text,
	"trackingType" "inventory_tracking_type" DEFAULT 'none' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "product_variants_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "productVariants_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_productVariant_tenant_not_null" CHECK ("product_variants"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"nameAr" varchar(255),
	"type" "product_type" DEFAULT 'goods' NOT NULL,
	"category" varchar(100),
	"country" varchar(100) DEFAULT 'اليمن',
	"unit" varchar(50) DEFAULT 'قطعة' NOT NULL,
	"purchasePrice" numeric(15, 2) DEFAULT '0' NOT NULL,
	"salePrice" numeric(15, 2) DEFAULT '0' NOT NULL,
	"wholesalePrice" numeric(15, 2) DEFAULT '0' NOT NULL,
	"minStock" integer DEFAULT 0 NOT NULL,
	"currentStock" integer DEFAULT 0 NOT NULL,
	"barcode" varchar(100),
	"supplierId" integer,
	"unitId" integer,
	"categoryId" integer,
	"description" text,
	"salesAccountId" integer,
	"cogsAccountId" integer,
	"inventoryAccountId" integer,
	"unitOfMeasure" varchar(50) DEFAULT 'قطعة' NOT NULL,
	"secondaryUnit" varchar(50),
	"conversionFactor" numeric(15, 4) DEFAULT '1' NOT NULL,
	"isComposite" boolean DEFAULT false NOT NULL,
	"bom" text,
	"alternativeIds" text,
	"attachmentUrl" text,
	"costMethod" varchar(30) DEFAULT 'average' NOT NULL,
	"directCost" numeric(15, 2) DEFAULT '0' NOT NULL,
	"indirectCost" numeric(15, 2) DEFAULT '0' NOT NULL,
	"productionMinutes" integer,
	"priceMode" varchar(20) DEFAULT 'direct' NOT NULL,
	"marginPct" numeric(6, 2) DEFAULT '0' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"reorderPoint" numeric(15, 2) DEFAULT '0' NOT NULL,
	"reorderQty" numeric(15, 2) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"drug_schedule" "drug_schedule" DEFAULT 'OTC',
	"requires_prescription" boolean DEFAULT false NOT NULL,
	"scientific_name" varchar(255),
	"ndc_code" varchar(50),
	"active_ingredients" text,
	"contraindications" text,
	"side_effects" text,
	"storage_conditions" varchar(255),
	"dosage_form" varchar(50),
	"strength" varchar(50),
	"max_quantity_per_sale" integer DEFAULT 999 NOT NULL,
	"manufacturer" varchar(255),
	"currencyId" integer,
	CONSTRAINT "products_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "products_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_product_purchase_price_not_negative" CHECK ("products"."purchasePrice" >= 0),
	CONSTRAINT "chk_product_sale_price_not_negative" CHECK ("products"."salePrice" >= 0),
	CONSTRAINT "chk_product_wholesale_price_not_negative" CHECK ("products"."wholesalePrice" >= 0),
	CONSTRAINT "chk_product_conversion_factor_positive" CHECK ("products"."conversionFactor" > 0),
	CONSTRAINT "chk_product_tenant_not_null" CHECK ("products"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"projectId" integer NOT NULL,
	"employeeId" integer NOT NULL,
	"roleInProject" varchar(80),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "project_members_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "project_members_project_employee_unique" UNIQUE("projectId","employeeId"),
	CONSTRAINT "chk_project_member_tenant_not_null" CHECK ("project_members"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "project_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"projectId" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"assigneeId" integer,
	"dueDate" timestamp,
	"estimatedHours" numeric(8, 2),
	"actualHours" numeric(8, 2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "project_tasks_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_project_task_tenant_not_null" CHECK ("project_tasks"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'planning' NOT NULL,
	"startDate" timestamp,
	"endDate" timestamp,
	"budget" numeric(15, 2) DEFAULT '0' NOT NULL,
	"managerId" integer,
	"customerId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	CONSTRAINT "projects_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_project_budget_not_negative" CHECK ("projects"."budget" >= 0),
	CONSTRAINT "chk_project_tenant_not_null" CHECK ("projects"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "purchase_invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoiceId" integer NOT NULL,
	"productId" integer NOT NULL,
	"productName" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(15, 2) NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total" numeric(15, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_invoices" (
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
	"invoiceNumber" varchar(50) NOT NULL,
	"supplierId" integer,
	"branchId" integer,
	"costCenterId" integer,
	"warehouseId" integer,
	"projectId" integer,
	"status" "purchase_invoice_status" DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"taxRate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"taxAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"paidAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"paymentMethod" "payment_method" DEFAULT 'cash',
	"notes" text,
	"zatca" text,
	"invoiceDate" timestamp DEFAULT now() NOT NULL,
	"dueDate" timestamp,
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"currencyId" integer,
	"exchangeRate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"baseAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"postedAt" timestamp,
	"postedById" integer,
	"reversedAt" timestamp,
	"reversedById" integer,
	"reversalReason" varchar(255),
	CONSTRAINT "purchase_invoices_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "purchaseInvoices_gc_tenant_unique" UNIQUE("tenantId","globalCode"),
	CONSTRAINT "chk_purchase_invoice_subtotal_not_negative" CHECK ("purchase_invoices"."subtotal" >= 0),
	CONSTRAINT "chk_purchase_invoice_tax_rate_not_negative" CHECK ("purchase_invoices"."taxRate" >= 0),
	CONSTRAINT "chk_purchase_invoice_tax_amount_not_negative" CHECK ("purchase_invoices"."taxAmount" >= 0),
	CONSTRAINT "chk_purchase_invoice_discount_not_negative" CHECK ("purchase_invoices"."discount" >= 0),
	CONSTRAINT "chk_purchase_invoice_total_not_negative" CHECK ("purchase_invoices"."total" >= 0),
	CONSTRAINT "chk_purchase_invoice_paid_not_negative" CHECK ("purchase_invoices"."paidAmount" >= 0),
	CONSTRAINT "chk_purchase_invoice_exchange_rate_positive" CHECK ("purchase_invoices"."exchangeRate" > 0),
	CONSTRAINT "chk_purchase_invoice_base_amount_not_negative" CHECK ("purchase_invoices"."baseAmount" >= 0),
	CONSTRAINT "chk_purchase_invoice_tenant_not_null" CHECK ("purchase_invoices"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "quality_inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(40) NOT NULL,
	"title" varchar(200) NOT NULL,
	"type" varchar(80),
	"result" "inspection_result" DEFAULT 'pass' NOT NULL,
	"inspectedById" integer,
	"relatedEntity" varchar(120),
	"score" numeric(6, 2),
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "quality_inspections_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_quality_score_range" CHECK ("quality_inspections"."score" IS NULL OR ("quality_inspections"."score" >= 0 AND "quality_inspections"."score" <= 100)),
	CONSTRAINT "chk_quality_tenant_not_null" CHECK ("quality_inspections"."tenantId" IS NOT NULL)
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
	"name" varchar(255) NOT NULL,
	"description" text,
	"itemsJson" jsonb DEFAULT '[]'::jsonb,
	"totalsJson" jsonb DEFAULT '{}'::jsonb,
	"isSelected" boolean DEFAULT false,
	"created_by_id" integer,
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
	"approverId" integer,
	"approverName" varchar(255),
	"level" integer DEFAULT 1,
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
	"quantity" numeric(15, 4) DEFAULT '1',
	"unit" varchar(50),
	"unitPrice" numeric(18, 4) DEFAULT '0',
	"costPrice" numeric(18, 4) DEFAULT '0',
	"discountPct" numeric(10, 4) DEFAULT '0',
	"discountAmount" numeric(18, 2) DEFAULT '0',
	"taxPct" numeric(10, 4) DEFAULT '0',
	"taxAmount" numeric(18, 2) DEFAULT '0',
	"lineTotal" numeric(18, 2) DEFAULT '0',
	"lineCost" numeric(18, 2) DEFAULT '0',
	"lineMargin" numeric(18, 2) DEFAULT '0',
	"sortOrder" integer DEFAULT 0,
	"config" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_items_GlobalId_unique" UNIQUE("GlobalId")
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
	"proposedTotal" numeric(18, 2),
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
	"commissionPct" numeric(10, 4) DEFAULT '0',
	"commissionAmount" numeric(18, 2) DEFAULT '0',
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
	"category" varchar(50),
	"title" varchar(255),
	"body" text,
	"sortOrder" integer DEFAULT 0,
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
	CONSTRAINT "quotation_types_code_tenant_unique" UNIQUE("code","tenantId")
);
--> statement-breakpoint
CREATE TABLE "quotation_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"quotationId" integer NOT NULL,
	"versionNo" integer DEFAULT 1 NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changeSummary" text,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_versions_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "quotation_versions_quotation_version_unique" UNIQUE("quotationId","versionNo")
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
	"subtotal" numeric(18, 2) DEFAULT '0',
	"discountTotal" numeric(18, 2) DEFAULT '0',
	"taxTotal" numeric(18, 2) DEFAULT '0',
	"commissionTotal" numeric(18, 2) DEFAULT '0',
	"grandTotal" numeric(18, 2) DEFAULT '0',
	"costTotal" numeric(18, 2) DEFAULT '0',
	"marginTotal" numeric(18, 2) DEFAULT '0',
	"marginPct" numeric(10, 4) DEFAULT '0',
	"paymentTerms" text,
	"deliveryTerms" text,
	"validityDate" timestamp,
	"notes" text,
	"convertedRefType" varchar(50),
	"convertedRefId" integer,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotations_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "recurring_expense_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"recurringExpenseId" integer NOT NULL,
	"runNumber" integer NOT NULL,
	"scheduledDate" timestamp NOT NULL,
	"executedDate" timestamp,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"taxAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"totalAmount" numeric(15, 2) NOT NULL,
	"baseAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"exchangeRate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"journalEntryId" integer,
	"purchaseInvoiceId" integer,
	"paymentTransactionId" integer,
	"errorMessage" text,
	"processedById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "recurring_expense_runs_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "recurring_expense_runs_unique" UNIQUE("recurringExpenseId","runNumber"),
	CONSTRAINT "chk_recurring_expense_run_amount_positive" CHECK ("recurring_expense_runs"."amount" > 0),
	CONSTRAINT "chk_recurring_expense_run_tenant_not_null" CHECK ("recurring_expense_runs"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "recurring_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"categoryId" integer,
	"vendorId" integer,
	"accountId" integer NOT NULL,
	"branchId" integer,
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'YER' NOT NULL,
	"exchangeRate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"taxRate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"taxAccountId" integer,
	"frequency" "recurring_expense_frequency" DEFAULT 'monthly' NOT NULL,
	"customCron" varchar(100),
	"dayOfMonth" integer,
	"dayOfWeek" integer,
	"weekOfMonth" integer,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp,
	"maxOccurrences" integer,
	"occurrencesCount" integer DEFAULT 0 NOT NULL,
	"basis" "expense_basis" DEFAULT 'accrual' NOT NULL,
	"status" "recurring_expense_status" DEFAULT 'draft' NOT NULL,
	"approvalStatus" "expense_approval_status" DEFAULT 'pending' NOT NULL,
	"approverId" integer,
	"approvedAt" timestamp,
	"approvedById" integer,
	"paymentMethod" varchar(50),
	"paymentAccountId" integer,
	"autoPay" boolean DEFAULT false NOT NULL,
	"nextRunAt" timestamp,
	"lastRunAt" timestamp,
	"lastRunStatus" varchar(20),
	"lastRunError" text,
	"budgetId" integer,
	"departmentId" integer,
	"projectId" integer,
	"tags" jsonb,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdById" integer,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	CONSTRAINT "recurring_expenses_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_recurring_expense_amount_positive" CHECK ("recurring_expenses"."amount" > 0),
	CONSTRAINT "chk_recurring_expense_exchange_rate_positive" CHECK ("recurring_expenses"."exchangeRate" > 0),
	CONSTRAINT "chk_recurring_expense_tax_rate_not_negative" CHECK ("recurring_expenses"."taxRate" >= 0),
	CONSTRAINT "chk_recurring_expense_tenant_not_null" CHECK ("recurring_expenses"."tenantId" IS NOT NULL),
	CONSTRAINT "chk_recurring_expense_account_not_null" CHECK ("recurring_expenses"."accountId" IS NOT NULL),
	CONSTRAINT "chk_recurring_expense_dates" CHECK ("recurring_expenses"."startDate" <= "recurring_expenses"."endDate" OR "recurring_expenses"."endDate" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "report_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"nameAr" varchar(150),
	"description" text,
	"type" "report_type" DEFAULT 'tabular' NOT NULL,
	"category" varchar(50),
	"dataSource" varchar(100) NOT NULL,
	"queryConfig" jsonb NOT NULL,
	"layoutConfig" jsonb,
	"chartConfig" jsonb,
	"parameters" jsonb,
	"isScheduled" boolean DEFAULT false NOT NULL,
	"scheduleCron" varchar(100),
	"scheduleRecipients" jsonb,
	"lastGeneratedAt" timestamp,
	"isPublic" boolean DEFAULT false NOT NULL,
	"allowedRoles" jsonb,
	"allowedUsers" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"parentReportId" integer,
	"isActive" boolean DEFAULT true NOT NULL,
	"isSystem" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdById" integer,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "report_definitions_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "report_defs_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_report_def_tenant_not_null" CHECK ("report_definitions"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "report_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"reportId" integer NOT NULL,
	"parameters" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"resultData" jsonb,
	"resultUrl" varchar(500),
	"rowCount" integer DEFAULT 0,
	"executionTimeMs" integer DEFAULT 0,
	"errorMessage" text,
	"executedById" integer,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "report_executions_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_report_execution_tenant_not_null" CHECK ("report_executions"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"name" varchar(80) NOT NULL,
	"code" varchar(40) NOT NULL,
	"description" text,
	"permissions" text,
	"isSystem" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "roles_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_role_tenant_not_null" CHECK ("roles"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "sales_invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoiceId" integer NOT NULL,
	"productId" integer NOT NULL,
	"productName" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(15, 2) NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total" numeric(15, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_invoices" (
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
	"invoiceNumber" varchar(50) NOT NULL,
	"orderId" integer,
	"customerId" integer,
	"branchId" integer,
	"costCenterId" integer,
	"warehouseId" integer,
	"projectId" integer,
	"status" "sales_invoice_status" DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"taxRate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"taxAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"paidAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"paymentMethod" "payment_method" DEFAULT 'cash',
	"notes" text,
	"zatca" text,
	"invoiceDate" timestamp DEFAULT now() NOT NULL,
	"dueDate" timestamp,
	"userId" integer,
	"salesRepId" text,
	"currency" varchar(10) DEFAULT 'YER' NOT NULL,
	"currencyRate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"currencyId" integer,
	"postedAt" timestamp,
	"postedById" integer,
	"reversedAt" timestamp,
	"reversedById" integer,
	"reversalReason" varchar(255),
	CONSTRAINT "sales_invoices_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "salesInvoices_gc_tenant_unique" UNIQUE("tenantId","globalCode"),
	CONSTRAINT "chk_sales_invoice_subtotal_not_negative" CHECK ("sales_invoices"."subtotal" >= 0),
	CONSTRAINT "chk_sales_invoice_tax_rate_not_negative" CHECK ("sales_invoices"."taxRate" >= 0),
	CONSTRAINT "chk_sales_invoice_tax_amount_not_negative" CHECK ("sales_invoices"."taxAmount" >= 0),
	CONSTRAINT "chk_sales_invoice_discount_not_negative" CHECK ("sales_invoices"."discount" >= 0),
	CONSTRAINT "chk_sales_invoice_total_not_negative" CHECK ("sales_invoices"."total" >= 0),
	CONSTRAINT "chk_sales_invoice_paid_not_negative" CHECK ("sales_invoices"."paidAmount" >= 0),
	CONSTRAINT "chk_sales_invoice_currency_rate_positive" CHECK ("sales_invoices"."currencyRate" > 0),
	CONSTRAINT "chk_sales_invoice_tenant_not_null" CHECK ("sales_invoices"."tenantId" IS NOT NULL),
	CONSTRAINT "chk_sales_invoice_status_posted_immutable" CHECK (
      CASE WHEN "sales_invoices"."status" IN ('paid', 'cancelled') THEN
        "sales_invoices"."postedAt" IS NOT NULL
      ELSE TRUE END
    )
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
CREATE TABLE "security_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"raw_data" jsonb,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(30) DEFAULT 'detected' NOT NULL,
	"actor_type" varchar(20) DEFAULT 'system',
	"actor_id" varchar(255),
	"actor_name" varchar(255),
	"actor_ip" varchar(45),
	"actor_user_agent" text,
	"incident_id" integer,
	"ioc_type" varchar(50),
	"ioc_value" varchar(255),
	"target_type" varchar(50),
	"target_id" varchar(255),
	"target_name" varchar(255),
	"risk_score" numeric(8, 2) DEFAULT '0',
	"mitre_technique_id" varchar(20),
	"mitre_tactic_id" varchar(20),
	"attack_pattern" text,
	"session_id" varchar(255),
	"event_timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "security_events_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "security_incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"incident_number" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"category" varchar(50),
	"status" varchar(30) DEFAULT 'identified' NOT NULL,
	"affected_users" integer,
	"affected_systems" integer,
	"data_breach" boolean DEFAULT false,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"contained_at" timestamp,
	"eradicated_at" timestamp,
	"recovered_at" timestamp,
	"closed_at" timestamp,
	"created_by" integer,
	"assignedTo" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "security_incidents_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"institutionName" varchar(255) DEFAULT 'مؤسسة الحسينية لخدمات الأعمال' NOT NULL,
	"currency" varchar(50) DEFAULT 'ريال يمني (YER)' NOT NULL,
	"country" varchar(100) DEFAULT 'اليمن' NOT NULL,
	"accountingPeriod" varchar(50) DEFAULT '2026' NOT NULL,
	"managerName" varchar(255) DEFAULT 'إدارة المؤسسة' NOT NULL,
	"notes" text,
	"subscriptionStatus" "subscription_status" DEFAULT 'trial' NOT NULL,
	"trialEndsAt" timestamp,
	"posConfig" text,
	"salesPolicy" text,
	"paymentMethods" text,
	"postingRules" text,
	"zatcaConfig" text,
	"documentTemplate" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "settings_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "settings_tenantId_unique" UNIQUE("tenantId"),
	CONSTRAINT "chk_settings_tenant_not_null" CHECK ("settings"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "stock_adjustments" (
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
	"productId" integer NOT NULL,
	"warehouseId" integer,
	"previousQty" integer NOT NULL,
	"newQty" integer NOT NULL,
	"reason" varchar(100) DEFAULT 'تسوية',
	"notes" text,
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_adjustments_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "stockAdjustments_gc_tenant_unique" UNIQUE("tenantId","globalCode"),
	CONSTRAINT "chk_stock_adjustment_tenant_not_null" CHECK ("stock_adjustments"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"productId" integer NOT NULL,
	"variantId" integer,
	"batchId" integer,
	"serialIds" integer[],
	"type" "stock_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"unitCost" numeric(15, 2) NOT NULL,
	"referenceType" varchar(50) NOT NULL,
	"referenceId" integer,
	"referenceNumber" varchar(100),
	"fromWarehouseId" integer,
	"toWarehouseId" integer,
	"fromLocation" varchar(100),
	"toLocation" varchar(100),
	"notes" text,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "stock_movements_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_stockMovement_tenant_not_null" CHECK ("stock_movements"."tenantId" IS NOT NULL),
	CONSTRAINT "chk_stockMovement_quantity_not_zero" CHECK ("stock_movements"."quantity" != 0)
);
--> statement-breakpoint
CREATE TABLE "stock_reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"productId" integer NOT NULL,
	"warehouseId" integer,
	"batchId" integer,
	"quantity" integer NOT NULL,
	"status" "reservation_status" DEFAULT 'active' NOT NULL,
	"source" "reservation_source" DEFAULT 'manual' NOT NULL,
	"sourceId" integer,
	"sourceType" varchar(50),
	"customerId" integer,
	"expiresAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"fulfilledAt" timestamp,
	"releasedAt" timestamp,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "stock_reservations_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_stock_reservation_qty_positive" CHECK ("stock_reservations"."quantity" > 0),
	CONSTRAINT "chk_stock_reservation_tenant_not_null" CHECK ("stock_reservations"."tenantId" IS NOT NULL)
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
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"priceMonthly" numeric(10, 2) NOT NULL,
	"priceYearly" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"maxUsers" integer DEFAULT 5 NOT NULL,
	"maxBranches" integer DEFAULT 1 NOT NULL,
	"maxTransactions" integer DEFAULT 1000 NOT NULL,
	"features" jsonb,
	"countryPricing" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "subscription_plans_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "subscription_plans_code_unique" UNIQUE("code"),
	CONSTRAINT "chk_subscription_plan_price_monthly_positive" CHECK ("subscription_plans"."priceMonthly" > 0),
	CONSTRAINT "chk_subscription_plan_price_yearly_positive" CHECK ("subscription_plans"."priceYearly" > 0),
	CONSTRAINT "chk_subscription_plan_currency_format" CHECK ("subscription_plans"."currency" ~ '^[A-Z]{3}$')
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
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"email" varchar(255),
	"address" text,
	"city" varchar(100),
	"taxNumber" varchar(100),
	"balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	"country" varchar(100) DEFAULT 'اليمن',
	"countryCode" varchar(2) DEFAULT 'YE',
	"taxIdType" varchar(20) DEFAULT 'none',
	"isVatRegistered" boolean DEFAULT false NOT NULL,
	"commercialReg" varchar(100),
	"idNumber" varchar(100),
	"postalCode" varchar(20),
	"buyerType" varchar(10) DEFAULT 'b2b',
	"paymentTermsDays" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "suppliers_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "suppliers_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_supplier_tenant_not_null" CHECK ("suppliers"."tenantId" IS NOT NULL)
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
CREATE TABLE "team_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"invitedBy" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"acceptedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "team_invitations_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "team_invitations_token_unique" UNIQUE("token"),
	CONSTRAINT "chk_team_invitation_tenant_not_null" CHECK ("team_invitations"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "tenant_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"planId" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"billingCycle" varchar(10) DEFAULT 'monthly' NOT NULL,
	"trialStartsAt" timestamp,
	"trialEndsAt" timestamp,
	"currentPeriodStart" timestamp,
	"currentPeriodEnd" timestamp,
	"cancelAt" timestamp,
	"cancelledAt" timestamp,
	"paymentProvider" varchar(50),
	"externalSubscriptionId" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	CONSTRAINT "tenant_subscriptions_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_tenant_sub_tenant_not_null" CHECK ("tenant_subscriptions"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"ownerUserId" integer,
	"currency" varchar(20) DEFAULT 'YER' NOT NULL,
	"country" varchar(100) DEFAULT 'اليمن' NOT NULL,
	"subscriptionPlan" varchar(50) DEFAULT 'standard' NOT NULL,
	"sector" varchar(50) DEFAULT 'general' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "tenants_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "tenants_code_unique" UNIQUE("code"),
	CONSTRAINT "chk_tenant_currency_valid" CHECK ("tenants"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "threat_intel_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer,
	"sourceName" varchar(255) NOT NULL,
	"source_type" varchar(50),
	"url" text,
	"apiKeyRef" varchar(255),
	"lastFetchAt" timestamp,
	"fetchIntervalMin" integer DEFAULT 1440,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "threat_intel_sources_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"ticketNumber" varchar(40) NOT NULL,
	"subject" varchar(200) NOT NULL,
	"description" text,
	"customerName" varchar(150),
	"customerPhone" varchar(30),
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"assignedToId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "tickets_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_ticket_tenant_not_null" CHECK ("tickets"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"accountId" integer NOT NULL,
	"branchId" integer,
	"costCenterId" integer,
	"amount" numeric(15, 2) NOT NULL,
	"type" "transaction_type" DEFAULT 'debit' NOT NULL,
	"transactionDate" timestamp NOT NULL,
	"narration" varchar(500),
	"notes" text,
	"lifecycleStatus" "lifecycle_status" DEFAULT 'saved' NOT NULL,
	"isReversed" boolean DEFAULT false NOT NULL,
	"reversalReason" varchar(255),
	"referenceType" varchar(50),
	"referenceId" integer,
	"journalEntryId" integer,
	"sourceModule" varchar(50),
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"currencyId" integer,
	"exchangeRate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"baseAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "transactions_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_transaction_amount_not_negative" CHECK ("transactions"."amount" >= 0),
	CONSTRAINT "chk_transaction_base_amount_not_negative" CHECK ("transactions"."baseAmount" >= 0),
	CONSTRAINT "chk_transaction_exchange_rate_positive" CHECK ("transactions"."exchangeRate" > 0),
	CONSTRAINT "chk_transaction_tenant_not_null" CHECK ("transactions"."tenantId" IS NOT NULL),
	CONSTRAINT "chk_transaction_account_not_null" CHECK ("transactions"."accountId" IS NOT NULL)
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
CREATE TABLE "units" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(80) NOT NULL,
	"nameAr" varchar(80),
	"symbol" varchar(20),
	"baseUnitId" integer,
	"conversionFactor" numeric(15, 6) DEFAULT '1',
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "units_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_unit_conversion_positive" CHECK ("units"."conversionFactor" > 0),
	CONSTRAINT "chk_unit_tenant_not_null" CHECK ("units"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "user_branch_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"userId" integer NOT NULL,
	"branchId" integer NOT NULL,
	"canView" boolean DEFAULT true NOT NULL,
	"canInsert" boolean DEFAULT true NOT NULL,
	"canApprove" boolean DEFAULT false NOT NULL,
	"canPost" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "user_branch_permissions_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "userBranchPermissions_tenant_user_branch_unique" UNIQUE("tenantId","userId","branchId")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"userId" integer NOT NULL,
	"roleId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "user_roles_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_user_role_tenant_not_null" CHECK ("user_roles"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"openId" varchar(255) NOT NULL,
	"tenantId" integer,
	"name" varchar(255),
	"email" varchar(255),
	"loginMethod" varchar(50),
	"username" varchar(120),
	"passwordHash" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"themePreference" varchar(20) DEFAULT 'dark' NOT NULL,
	"emailNotifications" boolean DEFAULT true NOT NULL,
	"whatsappNotifications" boolean DEFAULT true NOT NULL,
	"compactMode" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	"currentSessionId" uuid,
	"session_count" integer DEFAULT 0 NOT NULL,
	"lastActivity" timestamp DEFAULT now() NOT NULL,
	"device_fingerprint" varchar(255),
	"failedLoginAttempts" integer DEFAULT 0 NOT NULL,
	"lockedUntil" timestamp,
	"passwordChangedAt" timestamp DEFAULT now() NOT NULL,
	"mfaEnabled" boolean DEFAULT false NOT NULL,
	"mfaSecret" varchar(255),
	"emailVerified" boolean DEFAULT false NOT NULL,
	"verificationToken" varchar(128),
	"verificationTokenExpiry" timestamp,
	"resetToken" varchar(128),
	"resetTokenExpiry" timestamp,
	CONSTRAINT "users_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "variance_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"scenarioId" integer NOT NULL,
	"periodName" varchar(50) NOT NULL,
	"accountId" integer NOT NULL,
	"costCenterId" integer,
	"budgetAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"actualAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"varianceAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"variancePercent" numeric(10, 2) DEFAULT '0' NOT NULL,
	"varianceType" varchar(20),
	"priceVariance" numeric(15, 2) DEFAULT '0',
	"quantityVariance" numeric(15, 2) DEFAULT '0',
	"mixVariance" numeric(15, 2) DEFAULT '0',
	"volumeVariance" numeric(15, 2) DEFAULT '0',
	"commentary" text,
	"reviewedById" integer,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "variance_analyses_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "variance_scenario_account_cc_period_unique" UNIQUE("scenarioId","accountId","costCenterId","periodName"),
	CONSTRAINT "chk_variance_tenant_not_null" CHECK ("variance_analyses"."tenantId" IS NOT NULL)
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
	"tenantId" integer,
	"voucherId" integer NOT NULL,
	"approver_id" integer,
	"approval_level" "voucher_approval_level" DEFAULT 'level1',
	"status" "quotation_approval_status" DEFAULT 'pending' NOT NULL,
	"comment" text,
	"decidedAt" timestamp,
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
	"account_code" varchar(20),
	"account_name" varchar(255),
	"debit_amount" numeric(18, 4) DEFAULT '0',
	"credit_amount" numeric(18, 4) DEFAULT '0',
	"cost_center_id" integer,
	"department_id" integer,
	"project_id" integer,
	"allocation_percentage" numeric(8, 4) DEFAULT '100',
	"allocated_amount" numeric(18, 4) DEFAULT '0',
	"description" text,
	"reference" varchar(100),
	"line_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	CONSTRAINT "voucher_lines_GlobalId_unique" UNIQUE("GlobalId"),
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
	"last_reset_date" timestamp,
	"number_padding" integer DEFAULT 6,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "voucher_sequences_tenant_type_unique" UNIQUE("tenantId","voucher_type")
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
	"voucher_date" timestamp NOT NULL,
	"due_date" timestamp,
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
	"name" varchar(255) NOT NULL,
	"description" text,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(30) DEFAULT 'open' NOT NULL,
	"cveId" varchar(50),
	"cvss_score" numeric(5, 2),
	"affectedAsset" varchar(255),
	"discovered_at" timestamp DEFAULT now() NOT NULL,
	"patchedAt" timestamp,
	"remediation" text,
	"discovered_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vulnerabilities_GlobalId_unique" UNIQUE("GlobalId")
);
--> statement-breakpoint
CREATE TABLE "warehouse_stock" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"productId" integer NOT NULL,
	"warehouseId" integer NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reservedQty" integer DEFAULT 0 NOT NULL,
	"availableQty" integer DEFAULT 0 NOT NULL,
	"lastMovementAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "warehouse_stock_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "warehouseStock_product_warehouse_tenant_unique" UNIQUE("productId","warehouseId","tenantId"),
	CONSTRAINT "chk_warehouse_stock_qty_not_negative" CHECK ("warehouse_stock"."quantity" >= 0),
	CONSTRAINT "chk_warehouse_stock_reserved_not_negative" CHECK ("warehouse_stock"."reservedQty" >= 0),
	CONSTRAINT "chk_warehouse_stock_available_not_negative" CHECK ("warehouse_stock"."availableQty" >= 0),
	CONSTRAINT "chk_warehouse_stock_tenant_not_null" CHECK ("warehouse_stock"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "warehouse_transfers" (
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
	"productId" integer NOT NULL,
	"fromWarehouseId" integer NOT NULL,
	"toWarehouseId" integer NOT NULL,
	"quantity" integer NOT NULL,
	"notes" text,
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouse_transfers_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "warehouseTransfers_gc_tenant_unique" UNIQUE("tenantId","globalCode"),
	CONSTRAINT "chk_warehouse_transfer_quantity_positive" CHECK ("warehouse_transfers"."quantity" > 0),
	CONSTRAINT "chk_warehouse_transfer_tenant_not_null" CHECK ("warehouse_transfers"."tenantId" IS NOT NULL),
	CONSTRAINT "chk_warehouse_transfer_from_to_different" CHECK ("warehouse_transfers"."fromWarehouseId" != "warehouse_transfers"."toWarehouseId")
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"location" varchar(255),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "warehouses_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "warehouses_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_warehouse_tenant_not_null" CHECK ("warehouses"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"webhookId" integer NOT NULL,
	"event" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"responseStatus" integer,
	"responseBody" text,
	"deliveredAt" timestamp,
	"success" boolean DEFAULT false NOT NULL,
	"attemptCount" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	"idempotency_key" varchar(255),
	CONSTRAINT "webhook_deliveries_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "webhookDeliveries_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"url" varchar(500) NOT NULL,
	"secret" varchar(255) NOT NULL,
	"events" jsonb NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastTriggeredAt" timestamp,
	"failureCount" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "webhooks_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_webhook_tenant_not_null" CHECK ("webhooks"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "work_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"serverVersion" integer DEFAULT 1 NOT NULL,
	"lastSyncAt" timestamp,
	"conflictState" varchar(20) DEFAULT 'none',
	"aggregateId" uuid,
	CONSTRAINT "work_sites_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "workSites_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_workSite_tenant_not_null" CHECK ("work_sites"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "workflow_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"nameAr" varchar(200),
	"description" text,
	"entityType" varchar(100) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"steps" jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdById" integer,
	"updatedById" integer,
	CONSTRAINT "workflow_definitions_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "workflow_definitions_code_tenant_unique" UNIQUE("code","tenantId"),
	CONSTRAINT "chk_workflow_def_tenant_not_null" CHECK ("workflow_definitions"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "workflow_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"instanceId" integer NOT NULL,
	"taskId" uuid,
	"fromStepId" uuid,
	"toStepId" uuid,
	"transitionType" "workflow_transition_type" NOT NULL,
	"actorId" uuid NOT NULL,
	"actorRole" varchar(50),
	"comment" text,
	"formData" jsonb DEFAULT '{}'::jsonb,
	"contextSnapshot" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_history_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_workflow_hist_tenant_not_null" CHECK ("workflow_history"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "workflow_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"definitionId" integer NOT NULL,
	"definitionVersion" integer DEFAULT 1 NOT NULL,
	"entityType" varchar(100) NOT NULL,
	"entityId" uuid NOT NULL,
	"status" "workflow_status" DEFAULT 'draft' NOT NULL,
	"currentStepId" uuid,
	"currentAssigneeId" uuid,
	"currentAssigneeRole" varchar(50),
	"priority" "workflow_priority" DEFAULT 'medium' NOT NULL,
	"dueDate" timestamp,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"cancelledAt" timestamp,
	"cancelledById" uuid,
	"cancellationReason" varchar(255),
	"context" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdById" uuid,
	"updatedById" uuid,
	CONSTRAINT "workflow_instances_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_workflow_inst_tenant_not_null" CHECK ("workflow_instances"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "workflow_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"instanceId" integer NOT NULL,
	"stepId" uuid NOT NULL,
	"stepCode" varchar(50) NOT NULL,
	"stepName" varchar(200) NOT NULL,
	"stepType" "workflow_step_type" NOT NULL,
	"status" "workflow_step_status" DEFAULT 'pending' NOT NULL,
	"assigneeId" uuid,
	"assigneeRole" varchar(50),
	"assignedAt" timestamp,
	"dueDate" timestamp,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"completedBy" uuid,
	"outcome" varchar(50),
	"comment" text,
	"formData" jsonb DEFAULT '{}'::jsonb,
	"previousTaskId" uuid,
	"delegatedFromId" uuid,
	"delegatedToId" uuid,
	"escalatedFromId" uuid,
	"escalatedToId" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_tasks_GlobalId_unique" UNIQUE("GlobalId"),
	CONSTRAINT "chk_workflow_task_tenant_not_null" CHECK ("workflow_tasks"."tenantId" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parentAccountId_accounts_id_fk" FOREIGN KEY ("parentAccountId") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_rules" ADD CONSTRAINT "allocation_rules_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_runs" ADD CONSTRAINT "allocation_runs_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_runs" ADD CONSTRAINT "allocation_runs_postedById_users_id_fk" FOREIGN KEY ("postedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_runs" ADD CONSTRAINT "allocation_runs_reversedById_users_id_fk" FOREIGN KEY ("reversedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_subscriptionId_tenant_subscriptions_id_fk" FOREIGN KEY ("subscriptionId") REFERENCES "public"."tenant_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_templates" ADD CONSTRAINT "biometric_templates_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_templates" ADD CONSTRAINT "biometric_templates_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_templates" ADD CONSTRAINT "biometric_templates_enrolledById_users_id_fk" FOREIGN KEY ("enrolledById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_templates" ADD CONSTRAINT "biometric_templates_approvedById_users_id_fk" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_templates" ADD CONSTRAINT "biometric_templates_revokedById_users_id_fk" FOREIGN KEY ("revokedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_accountId_accounts_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_costCenterId_cost_centers_id_fk" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_scenarios" ADD CONSTRAINT "budget_scenarios_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_scenarios" ADD CONSTRAINT "budget_scenarios_costCenterId_cost_centers_id_fk" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_scenarios" ADD CONSTRAINT "budget_scenarios_approvedById_users_id_fk" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_categories_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_controls" ADD CONSTRAINT "compliance_controls_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_adjustments" ADD CONSTRAINT "consolidation_adjustments_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_adjustments" ADD CONSTRAINT "consolidation_adjustments_accountId_accounts_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_adjustments" ADD CONSTRAINT "consolidation_adjustments_postedById_users_id_fk" FOREIGN KEY ("postedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_entities" ADD CONSTRAINT "consolidation_entities_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "controlled_substances_log" ADD CONSTRAINT "controlled_substances_log_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_parentId_cost_centers_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_defs" ADD CONSTRAINT "custom_field_defs_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_count_lines" ADD CONSTRAINT "cycle_count_lines_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_count_lines" ADD CONSTRAINT "cycle_count_lines_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_count_lines" ADD CONSTRAINT "cycle_count_lines_warehouseId_warehouses_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_count_lines" ADD CONSTRAINT "cycle_count_lines_batchId_inventory_batches_id_fk" FOREIGN KEY ("batchId") REFERENCES "public"."inventory_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_count_lines" ADD CONSTRAINT "cycle_count_lines_countedById_users_id_fk" FOREIGN KEY ("countedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_warehouseId_warehouses_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_approvedById_users_id_fk" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_users_id_fk" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_recalls" ADD CONSTRAINT "drug_recalls_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_closedById_users_id_fk" FOREIGN KEY ("closedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_reopenedById_users_id_fk" FOREIGN KEY ("reopenedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "healthcare_facilities" ADD CONSTRAINT "healthcare_facilities_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "healthcare_providers" ADD CONSTRAINT "healthcare_providers_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_batchId_inventory_batches_id_fk" FOREIGN KEY ("batchId") REFERENCES "public"."inventory_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_warehouseId_warehouses_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouseId_warehouses_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_valuation_layers" ADD CONSTRAINT "inventory_valuation_layers_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_valuation_layers" ADD CONSTRAINT "inventory_valuation_layers_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_valuation_layers" ADD CONSTRAINT "inventory_valuation_layers_warehouseId_warehouses_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_valuation_layers" ADD CONSTRAINT "inventory_valuation_layers_batchId_inventory_batches_id_fk" FOREIGN KEY ("batchId") REFERENCES "public"."inventory_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_measurements" ADD CONSTRAINT "kpi_measurements_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_measurements" ADD CONSTRAINT "kpi_measurements_costCenterId_cost_centers_id_fk" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matrix_dimension_values" ADD CONSTRAINT "matrix_dimension_values_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matrix_dimensions" ADD CONSTRAINT "matrix_dimensions_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matrix_items" ADD CONSTRAINT "matrix_items_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matrix_items" ADD CONSTRAINT "matrix_items_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_record_entries" ADD CONSTRAINT "medical_record_entries_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_accountId_accounts_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payrollRunId_payroll_runs_id_fk" FOREIGN KEY ("payrollRunId") REFERENCES "public"."payroll_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_cash_events" ADD CONSTRAINT "pos_cash_events_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_cash_events" ADD CONSTRAINT "pos_cash_events_sessionId_pos_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."pos_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_cash_events" ADD CONSTRAINT "pos_cash_events_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_cash_events" ADD CONSTRAINT "pos_cash_events_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_held_carts" ADD CONSTRAINT "pos_held_carts_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_held_carts" ADD CONSTRAINT "pos_held_carts_heldById_users_id_fk" FOREIGN KEY ("heldById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_held_carts" ADD CONSTRAINT "pos_held_carts_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_held_carts" ADD CONSTRAINT "pos_held_carts_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_held_carts" ADD CONSTRAINT "pos_held_carts_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_return_items" ADD CONSTRAINT "pos_return_items_returnId_pos_returns_id_fk" FOREIGN KEY ("returnId") REFERENCES "public"."pos_returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_return_items" ADD CONSTRAINT "pos_return_items_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_sessionId_pos_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."pos_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_processedById_users_id_fk" FOREIGN KEY ("processedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_openedById_users_id_fk" FOREIGN KEY ("openedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_approvals" ADD CONSTRAINT "procurement_approvals_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurements" ADD CONSTRAINT "procurements_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurements" ADD CONSTRAINT "procurements_requestedById_users_id_fk" FOREIGN KEY ("requestedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurements" ADD CONSTRAINT "procurements_supplierId_suppliers_id_fk" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurements" ADD CONSTRAINT "procurements_approvedById_users_id_fk" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurements" ADD CONSTRAINT "procurements_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_supplierId_suppliers_id_fk" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_warehouseId_warehouses_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_serials" ADD CONSTRAINT "product_serials_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_serials" ADD CONSTRAINT "product_serials_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_serials" ADD CONSTRAINT "product_serials_batchId_inventory_batches_id_fk" FOREIGN KEY ("batchId") REFERENCES "public"."inventory_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_serials" ADD CONSTRAINT "product_serials_warehouseId_warehouses_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplierId_suppliers_id_fk" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_invoiceId_purchase_invoices_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."purchase_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplierId_suppliers_id_fk" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_costCenterId_cost_centers_id_fk" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_warehouseId_warehouses_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_postedById_users_id_fk" FOREIGN KEY ("postedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_reversedById_users_id_fk" FOREIGN KEY ("reversedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_inspectedById_users_id_fk" FOREIGN KEY ("inspectedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_alerts" ADD CONSTRAINT "quotation_alerts_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_alternatives" ADD CONSTRAINT "quotation_alternatives_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_alternatives" ADD CONSTRAINT "quotation_alternatives_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_analyses" ADD CONSTRAINT "quotation_analyses_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_approvals" ADD CONSTRAINT "quotation_approvals_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_attachments" ADD CONSTRAINT "quotation_attachments_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_attachments" ADD CONSTRAINT "quotation_attachments_uploadedById_users_id_fk" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_links" ADD CONSTRAINT "quotation_links_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_links" ADD CONSTRAINT "quotation_links_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_negotiations" ADD CONSTRAINT "quotation_negotiations_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_negotiations" ADD CONSTRAINT "quotation_negotiations_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_parties" ADD CONSTRAINT "quotation_parties_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_terms" ADD CONSTRAINT "quotation_terms_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_types" ADD CONSTRAINT "quotation_types_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_versions" ADD CONSTRAINT "quotation_versions_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_versions" ADD CONSTRAINT "quotation_versions_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_supplierId_suppliers_id_fk" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_costCenterId_cost_centers_id_fk" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_warehouseId_warehouses_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expense_runs" ADD CONSTRAINT "recurring_expense_runs_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expense_runs" ADD CONSTRAINT "recurring_expense_runs_recurringExpenseId_recurring_expenses_id_fk" FOREIGN KEY ("recurringExpenseId") REFERENCES "public"."recurring_expenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expense_runs" ADD CONSTRAINT "recurring_expense_runs_journalEntryId_journal_entries_id_fk" FOREIGN KEY ("journalEntryId") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expense_runs" ADD CONSTRAINT "recurring_expense_runs_purchaseInvoiceId_purchase_invoices_id_fk" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "public"."purchase_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expense_runs" ADD CONSTRAINT "recurring_expense_runs_paymentTransactionId_transactions_id_fk" FOREIGN KEY ("paymentTransactionId") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expense_runs" ADD CONSTRAINT "recurring_expense_runs_processedById_users_id_fk" FOREIGN KEY ("processedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_vendorId_suppliers_id_fk" FOREIGN KEY ("vendorId") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_accountId_accounts_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_taxAccountId_accounts_id_fk" FOREIGN KEY ("taxAccountId") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_approverId_users_id_fk" FOREIGN KEY ("approverId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_approvedById_users_id_fk" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_paymentAccountId_accounts_id_fk" FOREIGN KEY ("paymentAccountId") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_budgetId_budgets_id_fk" FOREIGN KEY ("budgetId") REFERENCES "public"."budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_departmentId_departments_id_fk" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_executedById_users_id_fk" FOREIGN KEY ("executedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_invoiceId_sales_invoices_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."sales_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_costCenterId_cost_centers_id_fk" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_warehouseId_warehouses_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_postedById_users_id_fk" FOREIGN KEY ("postedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_reversedById_users_id_fk" FOREIGN KEY ("reversedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_reps" ADD CONSTRAINT "sales_reps_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_reps" ADD CONSTRAINT "sales_reps_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_journal_entries" ADD CONSTRAINT "scheduled_journal_entries_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_journal_entries" ADD CONSTRAINT "scheduled_journal_entries_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_journal_entries" ADD CONSTRAINT "scheduled_journal_entries_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_warehouseId_warehouses_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batchId_inventory_batches_id_fk" FOREIGN KEY ("batchId") REFERENCES "public"."inventory_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_warehouseId_warehouses_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_batchId_inventory_batches_id_fk" FOREIGN KEY ("batchId") REFERENCES "public"."inventory_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_codes" ADD CONSTRAINT "subscription_codes_planId_subscription_plans_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_metadata" ADD CONSTRAINT "sync_metadata_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_metadata" ADD CONSTRAINT "sync_metadata_resolvedById_users_id_fk" FOREIGN KEY ("resolvedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_planId_subscription_plans_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threat_intel_sources" ADD CONSTRAINT "threat_intel_sources_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_accounts_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_costCenterId_cost_centers_id_fk" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_journalEntryId_journal_entries_id_fk" FOREIGN KEY ("journalEntryId") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_approvedById_users_id_fk" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_branch_permissions" ADD CONSTRAINT "user_branch_permissions_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_branch_permissions" ADD CONSTRAINT "user_branch_permissions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variance_analyses" ADD CONSTRAINT "variance_analyses_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variance_analyses" ADD CONSTRAINT "variance_analyses_accountId_accounts_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variance_analyses" ADD CONSTRAINT "variance_analyses_costCenterId_cost_centers_id_fk" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variance_analyses" ADD CONSTRAINT "variance_analyses_reviewedById_users_id_fk" FOREIGN KEY ("reviewedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_sign_records" ADD CONSTRAINT "vital_sign_records_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_approvals" ADD CONSTRAINT "voucher_approvals_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_accountId_accounts_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_sequences" ADD CONSTRAINT "voucher_sequences_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_posted_by_id_users_id_fk" FOREIGN KEY ("posted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vulnerabilities" ADD CONSTRAINT "vulnerabilities_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock" ADD CONSTRAINT "warehouse_stock_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock" ADD CONSTRAINT "warehouse_stock_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock" ADD CONSTRAINT "warehouse_stock_warehouseId_warehouses_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "warehouse_transfers_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "warehouse_transfers_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "warehouse_transfers_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhookId_webhooks_id_fk" FOREIGN KEY ("webhookId") REFERENCES "public"."webhooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_sites" ADD CONSTRAINT "work_sites_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_updatedById_users_id_fk" FOREIGN KEY ("updatedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_instanceId_workflow_instances_id_fk" FOREIGN KEY ("instanceId") REFERENCES "public"."workflow_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_definitionId_workflow_definitions_id_fk" FOREIGN KEY ("definitionId") REFERENCES "public"."workflow_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_updatedById_users_id_fk" FOREIGN KEY ("updatedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_instanceId_workflow_instances_id_fk" FOREIGN KEY ("instanceId") REFERENCES "public"."workflow_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_tenant" ON "accounts" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_accounts_tenant_type" ON "accounts" USING btree ("tenantId","type");--> statement-breakpoint
CREATE INDEX "idx_activityLogs_tenant" ON "activity_logs" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_activityLogs_user" ON "activity_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_activityLogs_session" ON "activity_logs" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "idx_activityLogs_entity" ON "activity_logs" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "idx_activityLogs_created" ON "activity_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_activityLogs_chain" ON "activity_logs" USING btree ("tenantId","chainSequence");--> statement-breakpoint
CREATE INDEX "idx_allocation_rules_tenant" ON "allocation_rules" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_allocation_rules_source_cc" ON "allocation_rules" USING btree ("sourceCostCenterId");--> statement-breakpoint
CREATE INDEX "idx_allocation_rules_next_run" ON "allocation_rules" USING btree ("nextRunAt");--> statement-breakpoint
CREATE INDEX "idx_allocation_runs_tenant" ON "allocation_runs" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_allocation_runs_rule" ON "allocation_runs" USING btree ("ruleId");--> statement-breakpoint
CREATE INDEX "idx_allocation_runs_period" ON "allocation_runs" USING btree ("periodName");--> statement-breakpoint
CREATE INDEX "idx_api_keys_tenant" ON "api_keys" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_appointments_tenant" ON "appointments" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_appointments_patient" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_provider" ON "appointments" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_facility" ON "appointments" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_status" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_appointments_date" ON "appointments" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_attendance_tenant" ON "attendance" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_attendance_employee" ON "attendance" USING btree ("employeeId");--> statement-breakpoint
CREATE INDEX "idx_attendance_date" ON "attendance" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_tenant" ON "audit_logs" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user" ON "audit_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_session" ON "audit_logs" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity_global" ON "audit_logs" USING btree ("entityGlobalId");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created" ON "audit_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_chain" ON "audit_logs" USING btree ("tenantId","chainSequence");--> statement-breakpoint
CREATE INDEX "idx_billing_invoice_tenant" ON "billing_invoices" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_billing_invoice_status" ON "billing_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_billing_invoice_currency" ON "billing_invoices" USING btree ("currencyId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_billingInvoices_tenant_number" ON "billing_invoices" USING btree ("tenantId","invoiceNumber");--> statement-breakpoint
CREATE INDEX "idx_biometric_tenant" ON "biometric_templates" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_biometric_user" ON "biometric_templates" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_biometric_type" ON "biometric_templates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_biometric_status" ON "biometric_templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_budget_lines_tenant" ON "budget_lines" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_budget_lines_scenario" ON "budget_lines" USING btree ("scenarioId");--> statement-breakpoint
CREATE INDEX "idx_budget_lines_account" ON "budget_lines" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "idx_budget_lines_cc_period" ON "budget_lines" USING btree ("costCenterId","periodName");--> statement-breakpoint
CREATE INDEX "idx_budget_scenarios_tenant" ON "budget_scenarios" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_budget_scenarios_period" ON "budget_scenarios" USING btree ("periodName");--> statement-breakpoint
CREATE INDEX "idx_budgets_tenant" ON "budgets" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_categories_tenant" ON "categories" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_categories_tenant_code" ON "categories" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX "idx_compliance_controls_tenant" ON "compliance_controls" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_compliance_controls_framework" ON "compliance_controls" USING btree ("framework");--> statement-breakpoint
CREATE INDEX "idx_compliance_controls_status" ON "compliance_controls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_consolidation_adj_tenant" ON "consolidation_adjustments" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_consolidation_adj_period" ON "consolidation_adjustments" USING btree ("periodName");--> statement-breakpoint
CREATE INDEX "idx_consolidation_adj_entity" ON "consolidation_adjustments" USING btree ("consolidationEntityId");--> statement-breakpoint
CREATE INDEX "idx_consolidation_entities_tenant" ON "consolidation_entities" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_consolidation_entities_entity" ON "consolidation_entities" USING btree ("entityTenantId");--> statement-breakpoint
CREATE INDEX "idx_controlled_log_product" ON "controlled_substances_log" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_controlled_log_tenant" ON "controlled_substances_log" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_controlled_log_timestamp" ON "controlled_substances_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_cost_centers_tenant" ON "cost_centers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_cost_centers_parent" ON "cost_centers" USING btree ("parentId");--> statement-breakpoint
CREATE INDEX "idx_cost_centers_type" ON "cost_centers" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_cost_centers_path" ON "cost_centers" USING btree ("path");--> statement-breakpoint
CREATE INDEX "idx_currencies_tenant" ON "currencies" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_field_defs_tenant_entity_key" ON "custom_field_defs" USING btree ("tenantId","entity_type","key");--> statement-breakpoint
CREATE INDEX "custom_field_values_tenant_entity" ON "custom_field_values" USING btree ("tenantId","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant" ON "customers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_deleted" ON "customers" USING btree ("tenantId","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_customers_currency" ON "customers" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_customers_country" ON "customers" USING btree ("countryCode");--> statement-breakpoint
CREATE INDEX "idx_cycleCountLines_tenant" ON "cycle_count_lines" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_cycleCountLines_cycleCount" ON "cycle_count_lines" USING btree ("cycleCountId");--> statement-breakpoint
CREATE INDEX "idx_cycleCountLines_product" ON "cycle_count_lines" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_cycleCounts_tenant" ON "cycle_counts" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_cycleCounts_warehouse" ON "cycle_counts" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_cycleCounts_status" ON "cycle_counts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cycleCounts_plannedDate" ON "cycle_counts" USING btree ("plannedDate");--> statement-breakpoint
CREATE INDEX "idx_departments_tenant" ON "departments" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_departments_tenant_code" ON "departments" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX "idx_devices_tenant" ON "devices" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_documents_tenant" ON "documents" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_documents_entity" ON "documents" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "idx_drug_interactions_a" ON "drug_interactions" USING btree ("drug_a");--> statement-breakpoint
CREATE INDEX "idx_drug_interactions_b" ON "drug_interactions" USING btree ("drug_b");--> statement-breakpoint
CREATE INDEX "idx_drug_interactions_tenant" ON "drug_interactions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_drug_recalls_tenant" ON "drug_recalls" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_drug_recalls_status" ON "drug_recalls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_drug_recalls_class" ON "drug_recalls" USING btree ("recall_class");--> statement-breakpoint
CREATE INDEX "idx_employees_tenant" ON "employees" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_employees_currency" ON "employees" USING btree ("currencyId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_employees_tenant_code" ON "employees" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_pair" ON "exchange_rates" USING btree ("baseCurrency","quoteCurrency");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_effective" ON "exchange_rates" USING btree ("effectiveFrom");--> statement-breakpoint
CREATE INDEX "idx_feature_flags_tenant_key" ON "feature_flags" USING btree ("tenantId","key");--> statement-breakpoint
CREATE INDEX "idx_file_uploads_tenant" ON "file_uploads" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_file_uploads_entity" ON "file_uploads" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "idx_file_uploads_hash" ON "file_uploads" USING btree ("sha256Hash");--> statement-breakpoint
CREATE INDEX "idx_file_uploads_retention" ON "file_uploads" USING btree ("retentionExpiresAt");--> statement-breakpoint
CREATE INDEX "idx_fiscal_periods_tenant" ON "fiscal_periods" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_fiscal_periods_status" ON "fiscal_periods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_healthcare_facilities_tenant" ON "healthcare_facilities" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_healthcare_facilities_branch" ON "healthcare_facilities" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_healthcare_facilities_type" ON "healthcare_facilities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_healthcare_providers_tenant" ON "healthcare_providers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_healthcare_providers_employee" ON "healthcare_providers" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_healthcare_providers_facility" ON "healthcare_providers" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_icd_codes_code" ON "icd_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_icd_codes_system" ON "icd_codes" USING btree ("system");--> statement-breakpoint
CREATE INDEX "idx_insurance_claims_tenant" ON "insurance_claims" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_insurance_claims_prescription" ON "insurance_claims" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "idx_insurance_claims_customer" ON "insurance_claims" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_inventoryAllocations_tenant" ON "inventory_allocations" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_inventoryAllocations_product" ON "inventory_allocations" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_inventoryAllocations_session" ON "inventory_allocations" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "idx_inventoryAllocations_cartLine" ON "inventory_allocations" USING btree ("cartLineId");--> statement-breakpoint
CREATE INDEX "idx_inventoryBatches_tenant" ON "inventory_batches" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_inventoryBatches_product" ON "inventory_batches" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_inventoryBatches_warehouse" ON "inventory_batches" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_inventoryBatches_expiry" ON "inventory_batches" USING btree ("expiryDate");--> statement-breakpoint
CREATE INDEX "idx_inventoryBatches_batchNumber" ON "inventory_batches" USING btree ("batchNumber");--> statement-breakpoint
CREATE INDEX "idx_inventoryMovements_tenant" ON "inventory_movements" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_inventoryMovements_product" ON "inventory_movements" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_inventoryMovements_warehouse" ON "inventory_movements" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_valuationLayers_tenant" ON "inventory_valuation_layers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_valuationLayers_product" ON "inventory_valuation_layers" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_valuationLayers_warehouse" ON "inventory_valuation_layers" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_valuationLayers_batch" ON "inventory_valuation_layers" USING btree ("batchId");--> statement-breakpoint
CREATE INDEX "idx_valuationLayers_layerDate" ON "inventory_valuation_layers" USING btree ("layerDate");--> statement-breakpoint
CREATE INDEX "idx_valuationLayers_active" ON "inventory_valuation_layers" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "idx_journal_tenant" ON "journal_entries" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_journal_source" ON "journal_entries" USING btree ("sourceModule","sourceRefId");--> statement-breakpoint
CREATE INDEX "idx_journal_currency" ON "journal_entries" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_kpi_measurements_tenant" ON "kpi_measurements" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_kpi_measurements_kpi" ON "kpi_measurements" USING btree ("kpiId");--> statement-breakpoint
CREATE INDEX "idx_kpi_measurements_period" ON "kpi_measurements" USING btree ("periodName");--> statement-breakpoint
CREATE INDEX "idx_kpi_measurements_status" ON "kpi_measurements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_kpis_tenant" ON "kpis" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_kpis_category" ON "kpis" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_username" ON "login_attempts" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_user" ON "login_attempts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_created" ON "login_attempts" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_tenant_created" ON "login_attempts" USING btree ("tenantId","createdAt");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_ip" ON "login_attempts" USING btree ("ip");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_device" ON "login_attempts" USING btree ("deviceFingerprint");--> statement-breakpoint
CREATE INDEX "idx_matrixDimensionValues_tenant" ON "matrix_dimension_values" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_matrixDimensionValues_dimension" ON "matrix_dimension_values" USING btree ("dimensionId");--> statement-breakpoint
CREATE INDEX "idx_matrixDimensions_tenant" ON "matrix_dimensions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_matrixItems_tenant" ON "matrix_items" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_matrixItems_product" ON "matrix_items" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_matrixItems_matrix" ON "matrix_items" USING btree ("matrixId");--> statement-breakpoint
CREATE INDEX "idx_medical_record_entries_record" ON "medical_record_entries" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "idx_medical_record_entries_patient" ON "medical_record_entries" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_medical_record_entries_type" ON "medical_record_entries" USING btree ("entry_type");--> statement-breakpoint
CREATE INDEX "idx_medical_records_tenant" ON "medical_records" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_medical_records_patient" ON "medical_records" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_medical_records_visit_date" ON "medical_records" USING btree ("visit_date");--> statement-breakpoint
CREATE INDEX "idx_medical_records_provider" ON "medical_records" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_messages_tenant" ON "messages" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_messages_to" ON "messages" USING btree ("tenantId","toUserId");--> statement-breakpoint
CREATE INDEX "idx_messages_from" ON "messages" USING btree ("tenantId","fromUserId");--> statement-breakpoint
CREATE INDEX "idx_notifications_tenant" ON "notifications" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_notifications_status" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_offers_tenant" ON "offers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_offers_product" ON "offers" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_offers_category" ON "offers" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "idx_openingBalances_tenant" ON "opening_balances" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "idx_orders_tenant" ON "orders" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_orders_customer" ON "orders" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_orders_currency" ON "orders" USING btree ("currencyId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_orders_tenant_number" ON "orders" USING btree ("tenantId","orderNumber");--> statement-breakpoint
CREATE INDEX "idx_patient_allergies_customer" ON "patient_allergies" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_patient_allergies_tenant" ON "patient_allergies" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_patient_consents_patient" ON "patient_consents" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_patient_consents_tenant" ON "patient_consents" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_patients_tenant" ON "patients" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_patients_number" ON "patients" USING btree ("patient_number");--> statement-breakpoint
CREATE INDEX "idx_patients_name" ON "patients" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "idx_patients_phone" ON "patients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_patients_national_id" ON "patients" USING btree ("national_id");--> statement-breakpoint
CREATE INDEX "idx_payment_gateway_active" ON "payment_gateways" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "idx_payment_gateway_country" ON "payment_gateways" USING btree ("countryCode");--> statement-breakpoint
CREATE INDEX "idx_payment_history_tenant" ON "payment_history" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_payment_history_invoice" ON "payment_history" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "idx_payment_history_currency" ON "payment_history" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_payments_tenant" ON "payments" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_payments_invoice" ON "payments" USING btree ("source","invoiceId");--> statement-breakpoint
CREATE INDEX "idx_payments_currency" ON "payments" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_payroll_items_tenant" ON "payroll_items" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_payroll_items_run" ON "payroll_items" USING btree ("payrollRunId");--> statement-breakpoint
CREATE INDEX "idx_payroll_items_employee" ON "payroll_items" USING btree ("employeeId");--> statement-breakpoint
CREATE INDEX "idx_payroll_runs_tenant" ON "payroll_runs" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_permissions_key" ON "permissions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_pos_cash_events_tenant" ON "pos_cash_events" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_pos_cash_events_session" ON "pos_cash_events" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "idx_pos_cash_events_currency" ON "pos_cash_events" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_pos_held_carts_tenant" ON "pos_held_carts" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_pos_held_carts_held_by" ON "pos_held_carts" USING btree ("heldById");--> statement-breakpoint
CREATE INDEX "idx_pos_held_carts_status" ON "pos_held_carts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pos_held_carts_currency" ON "pos_held_carts" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_pos_orders_tenant" ON "pos_orders" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_pos_orders_currency" ON "pos_orders" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_pos_return_items_return" ON "pos_return_items" USING btree ("returnId");--> statement-breakpoint
CREATE INDEX "idx_pos_return_items_product" ON "pos_return_items" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_pos_returns_tenant" ON "pos_returns" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_pos_returns_invoice" ON "pos_returns" USING btree ("originalInvoiceId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pos_returns_tenant_number" ON "pos_returns" USING btree ("tenantId","returnNumber");--> statement-breakpoint
CREATE INDEX "idx_pos_returns_currency" ON "pos_returns" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_pos_sessions_tenant" ON "pos_sessions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_pos_sessions_currency" ON "pos_sessions" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_prescription_items_prescription" ON "prescription_items" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "idx_prescription_items_product" ON "prescription_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_tenant" ON "prescriptions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_customer" ON "prescriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_status" ON "prescriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_expiry" ON "prescriptions" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "idx_procurement_approvals_tenant" ON "procurement_approvals" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_procurement_approvals_proc" ON "procurement_approvals" USING btree ("procurementId");--> statement-breakpoint
CREATE INDEX "idx_procurements_tenant" ON "procurements" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_procurements_currency" ON "procurements" USING btree ("currencyId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_procurements_tenant_req" ON "procurements" USING btree ("tenantId","requisitionNumber");--> statement-breakpoint
CREATE INDEX "idx_productBatches_tenant" ON "product_batches" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_productBatches_product" ON "product_batches" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_productBatches_variant" ON "product_batches" USING btree ("variantId");--> statement-breakpoint
CREATE INDEX "idx_productBatches_warehouse" ON "product_batches" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_productBatches_expiry" ON "product_batches" USING btree ("expiryDate");--> statement-breakpoint
CREATE INDEX "idx_productSerials_tenant" ON "product_serials" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_productSerials_product" ON "product_serials" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_productSerials_variant" ON "product_serials" USING btree ("variantId");--> statement-breakpoint
CREATE INDEX "idx_productSerials_batch" ON "product_serials" USING btree ("batchId");--> statement-breakpoint
CREATE INDEX "idx_productSerials_warehouse" ON "product_serials" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_productSerials_status" ON "product_serials" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_productUnits_tenant" ON "product_units" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_productUnits_product" ON "product_units" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_productVariants_tenant" ON "product_variants" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_productVariants_product" ON "product_variants" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_products_tenant" ON "products" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_products_tenant_deleted" ON "products" USING btree ("tenantId","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_products_supplier" ON "products" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX "idx_products_currency" ON "products" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_project_members_tenant" ON "project_members" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_project_members_project" ON "project_members" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "idx_project_members_employee" ON "project_members" USING btree ("employeeId");--> statement-breakpoint
CREATE INDEX "idx_project_tasks_tenant" ON "project_tasks" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_project_tasks_project" ON "project_tasks" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "idx_project_tasks_assignee" ON "project_tasks" USING btree ("assigneeId");--> statement-breakpoint
CREATE INDEX "idx_projects_tenant" ON "projects" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_projects_currency" ON "projects" USING btree ("currencyId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_projects_tenant_code" ON "projects" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX "idx_purchase_items_invoice" ON "purchase_invoice_items" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_tenant" ON "purchase_invoices" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_supplier" ON "purchase_invoices" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_status" ON "purchase_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_currency" ON "purchase_invoices" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_costCenter" ON "purchase_invoices" USING btree ("costCenterId");--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_warehouse" ON "purchase_invoices" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_project" ON "purchase_invoices" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "idx_purchaseInvoices_branch_costCenter" ON "purchase_invoices" USING btree ("branchId","costCenterId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_purchaseInvoices_tenant_number" ON "purchase_invoices" USING btree ("tenantId","invoiceNumber");--> statement-breakpoint
CREATE INDEX "idx_quality_inspections_tenant" ON "quality_inspections" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_quality_tenant_code" ON "quality_inspections" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX "idx_quotation_alerts_tenant" ON "quotation_alerts" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_quotation_alerts_quotation" ON "quotation_alerts" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_alerts_unread" ON "quotation_alerts" USING btree ("tenantId","isRead");--> statement-breakpoint
CREATE INDEX "idx_quotation_alternatives_quotation" ON "quotation_alternatives" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_analyses_quotation" ON "quotation_analyses" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_analyses_created" ON "quotation_analyses" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_quotation_approvals_quotation" ON "quotation_approvals" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_approvals_approver" ON "quotation_approvals" USING btree ("approverId");--> statement-breakpoint
CREATE INDEX "idx_quotation_attachments_quotation" ON "quotation_attachments" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_items_quotation" ON "quotation_items" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_items_ref" ON "quotation_items" USING btree ("kind","refId");--> statement-breakpoint
CREATE INDEX "idx_quotation_links_quotation" ON "quotation_links" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_links_entity" ON "quotation_links" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "idx_quotation_negotiations_quotation" ON "quotation_negotiations" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_parties_quotation" ON "quotation_parties" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_parties_entity" ON "quotation_parties" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "idx_quotation_terms_quotation" ON "quotation_terms" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotation_types_tenant" ON "quotation_types" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_quotation_versions_quotation" ON "quotation_versions" USING btree ("quotationId");--> statement-breakpoint
CREATE INDEX "idx_quotations_tenant" ON "quotations" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_quotations_type" ON "quotations" USING btree ("typeId");--> statement-breakpoint
CREATE INDEX "idx_quotations_status" ON "quotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_quotations_direction" ON "quotations" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "idx_quotations_customer" ON "quotations" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "idx_quotations_supplier" ON "quotations" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX "idx_quotations_updated" ON "quotations" USING btree ("updatedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_quotations_tenant_number" ON "quotations" USING btree ("tenantId","quotationNumber");--> statement-breakpoint
CREATE INDEX "idx_recurring_expense_runs_tenant" ON "recurring_expense_runs" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_recurring_expense_runs_recurring" ON "recurring_expense_runs" USING btree ("recurringExpenseId");--> statement-breakpoint
CREATE INDEX "idx_recurring_expense_runs_scheduled" ON "recurring_expense_runs" USING btree ("scheduledDate");--> statement-breakpoint
CREATE INDEX "idx_recurring_expense_runs_status" ON "recurring_expense_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_recurring_expenses_tenant" ON "recurring_expenses" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_recurring_expenses_status" ON "recurring_expenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_recurring_expenses_next_run" ON "recurring_expenses" USING btree ("nextRunAt");--> statement-breakpoint
CREATE INDEX "idx_recurring_expenses_vendor" ON "recurring_expenses" USING btree ("vendorId");--> statement-breakpoint
CREATE INDEX "idx_recurring_expenses_category" ON "recurring_expenses" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "idx_recurring_expenses_account" ON "recurring_expenses" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "idx_recurring_expenses_budget" ON "recurring_expenses" USING btree ("budgetId");--> statement-breakpoint
CREATE INDEX "idx_report_defs_tenant" ON "report_definitions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_report_defs_category" ON "report_definitions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_report_executions_tenant" ON "report_executions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_report_executions_report" ON "report_executions" USING btree ("reportId");--> statement-breakpoint
CREATE INDEX "idx_report_executions_status" ON "report_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_roles_tenant" ON "roles" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_tenant_code" ON "roles" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX "idx_sales_items_invoice" ON "sales_invoice_items" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_tenant" ON "sales_invoices" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_customer" ON "sales_invoices" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_order" ON "sales_invoices" USING btree ("orderId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_salesInvoices_tenant_order" ON "sales_invoices" USING btree ("tenantId","orderId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_status" ON "sales_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_currency" ON "sales_invoices" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_costCenter" ON "sales_invoices" USING btree ("costCenterId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_warehouse" ON "sales_invoices" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_project" ON "sales_invoices" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_branch_costCenter" ON "sales_invoices" USING btree ("branchId","costCenterId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_salesRep" ON "sales_invoices" USING btree ("salesRepId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_tenant_salesrep" ON "sales_invoices" USING btree ("tenantId","salesRepId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_tenant_status_date" ON "sales_invoices" USING btree ("tenantId","status","invoiceDate");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_tenant_customer_date" ON "sales_invoices" USING btree ("tenantId","customerId","invoiceDate");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_salesInvoices_tenant_number" ON "sales_invoices" USING btree ("tenantId","invoiceNumber");--> statement-breakpoint
CREATE INDEX "idx_sales_reps_tenant" ON "sales_reps" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_sales_reps_currency" ON "sales_reps" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_scheduledJournal_tenant" ON "scheduled_journal_entries" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_scheduledJournal_nextRun" ON "scheduled_journal_entries" USING btree ("nextRunAt");--> statement-breakpoint
CREATE INDEX "idx_security_events_tenant" ON "security_events" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_security_events_timestamp" ON "security_events" USING btree ("event_timestamp");--> statement-breakpoint
CREATE INDEX "idx_security_events_severity" ON "security_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_security_events_type" ON "security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_security_events_status" ON "security_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_security_events_actor" ON "security_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_security_incidents_tenant" ON "security_incidents" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_security_incidents_status" ON "security_incidents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_security_incidents_severity" ON "security_incidents" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_security_incidents_number" ON "security_incidents" USING btree ("incident_number");--> statement-breakpoint
CREATE INDEX "idx_stockAdjustments_tenant" ON "stock_adjustments" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_stockMovements_tenant" ON "stock_movements" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_stockMovements_product" ON "stock_movements" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_stockMovements_variant" ON "stock_movements" USING btree ("variantId");--> statement-breakpoint
CREATE INDEX "idx_stockMovements_batch" ON "stock_movements" USING btree ("batchId");--> statement-breakpoint
CREATE INDEX "idx_stockMovements_reference" ON "stock_movements" USING btree ("referenceType","referenceId");--> statement-breakpoint
CREATE INDEX "idx_stockMovements_created" ON "stock_movements" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_stockReservations_tenant" ON "stock_reservations" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_stockReservations_product" ON "stock_reservations" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_stockReservations_warehouse" ON "stock_reservations" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_stockReservations_batch" ON "stock_reservations" USING btree ("batchId");--> statement-breakpoint
CREATE INDEX "idx_stockReservations_status" ON "stock_reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_stockReservations_source" ON "stock_reservations" USING btree ("source","sourceId");--> statement-breakpoint
CREATE INDEX "idx_stockReservations_expires" ON "stock_reservations" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "idx_subscription_code_status" ON "subscription_codes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_subscription_code_country" ON "subscription_codes" USING btree ("countryCode");--> statement-breakpoint
CREATE INDEX "idx_suppliers_tenant" ON "suppliers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_suppliers_tenant_deleted" ON "suppliers" USING btree ("tenantId","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_suppliers_currency" ON "suppliers" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_suppliers_country" ON "suppliers" USING btree ("countryCode");--> statement-breakpoint
CREATE INDEX "idx_sync_metadata_tenant" ON "sync_metadata" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_sync_metadata_aggregate" ON "sync_metadata" USING btree ("aggregateId");--> statement-breakpoint
CREATE INDEX "idx_sync_metadata_entity" ON "sync_metadata" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "idx_team_inv_tenant" ON "team_invitations" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_team_inv_email" ON "team_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_tenant_sub_tenant" ON "tenant_subscriptions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_tenant_sub_status" ON "tenant_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tenant_sub_currency" ON "tenant_subscriptions" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_threat_intel_tenant" ON "threat_intel_sources" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_threat_intel_active" ON "threat_intel_sources" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_tickets_tenant" ON "tickets" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_tickets_assigned" ON "tickets" USING btree ("assignedToId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tickets_tenant_num" ON "tickets" USING btree ("tenantId","ticketNumber");--> statement-breakpoint
CREATE INDEX "idx_transactions_tenant" ON "transactions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_transactions_account" ON "transactions" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "idx_transactions_date" ON "transactions" USING btree ("transactionDate");--> statement-breakpoint
CREATE INDEX "idx_transactions_branch" ON "transactions" USING btree ("branchId");--> statement-breakpoint
CREATE INDEX "idx_transactions_reference" ON "transactions" USING btree ("referenceType","referenceId");--> statement-breakpoint
CREATE INDEX "idx_transactions_currency" ON "transactions" USING btree ("currencyId");--> statement-breakpoint
CREATE INDEX "idx_transactions_tenant_status" ON "transactions" USING btree ("tenantId","lifecycleStatus");--> statement-breakpoint
CREATE INDEX "idx_transactions_tenant_reversed" ON "transactions" USING btree ("tenantId","isReversed");--> statement-breakpoint
CREATE INDEX "idx_transactions_tenant_date" ON "transactions" USING btree ("tenantId","transactionDate");--> statement-breakpoint
CREATE INDEX "idx_transactions_tenant_account_date" ON "transactions" USING btree ("tenantId","accountId","transactionDate");--> statement-breakpoint
CREATE INDEX "idx_translations_tenant" ON "translations" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_translations_culture" ON "translations" USING btree ("culture");--> statement-breakpoint
CREATE INDEX "idx_units_tenant" ON "units" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_units_tenant_code" ON "units" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX "idx_userroles_tenant" ON "user_roles" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_userroles_user_role" ON "user_roles" USING btree ("userId","roleId");--> statement-breakpoint
CREATE INDEX "idx_users_tenant" ON "users" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_users_session" ON "users" USING btree ("currentSessionId");--> statement-breakpoint
CREATE INDEX "idx_users_session_count" ON "users" USING btree ("session_count");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_username" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_users_fingerprint" ON "users" USING btree ("device_fingerprint");--> statement-breakpoint
CREATE INDEX "idx_variance_tenant" ON "variance_analyses" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_variance_scenario" ON "variance_analyses" USING btree ("scenarioId");--> statement-breakpoint
CREATE INDEX "idx_variance_account_cc" ON "variance_analyses" USING btree ("accountId","costCenterId");--> statement-breakpoint
CREATE INDEX "idx_variance_period" ON "variance_analyses" USING btree ("periodName");--> statement-breakpoint
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
CREATE INDEX "idx_vulnerabilities_tenant" ON "vulnerabilities" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_vulnerabilities_severity" ON "vulnerabilities" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_vulnerabilities_status" ON "vulnerabilities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_warehouseStock_tenant" ON "warehouse_stock" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_warehouseStock_product" ON "warehouse_stock" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_warehouseStock_warehouse" ON "warehouse_stock" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_warehouseTransfers_tenant" ON "warehouse_transfers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_warehouses_tenant" ON "warehouses" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_webhook" ON "webhook_deliveries" USING btree ("webhookId");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_created" ON "webhook_deliveries" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_webhooks_tenant" ON "webhooks" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_workSites_tenant" ON "work_sites" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_workflow_definitions_tenant" ON "workflow_definitions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_workflow_definitions_entity" ON "workflow_definitions" USING btree ("entityType");--> statement-breakpoint
CREATE INDEX "idx_workflow_definitions_active" ON "workflow_definitions" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "idx_workflow_history_tenant" ON "workflow_history" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_workflow_history_instance" ON "workflow_history" USING btree ("instanceId");--> statement-breakpoint
CREATE INDEX "idx_workflow_history_task" ON "workflow_history" USING btree ("taskId");--> statement-breakpoint
CREATE INDEX "idx_workflow_history_actor" ON "workflow_history" USING btree ("actorId");--> statement-breakpoint
CREATE INDEX "idx_workflow_history_created" ON "workflow_history" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_workflow_instances_tenant" ON "workflow_instances" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_workflow_instances_definition" ON "workflow_instances" USING btree ("definitionId");--> statement-breakpoint
CREATE INDEX "idx_workflow_instances_entity" ON "workflow_instances" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "idx_workflow_instances_status" ON "workflow_instances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workflow_instances_assignee" ON "workflow_instances" USING btree ("currentAssigneeId");--> statement-breakpoint
CREATE INDEX "idx_workflow_instances_due" ON "workflow_instances" USING btree ("dueDate");--> statement-breakpoint
CREATE INDEX "idx_workflow_tasks_tenant" ON "workflow_tasks" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_workflow_tasks_instance" ON "workflow_tasks" USING btree ("instanceId");--> statement-breakpoint
CREATE INDEX "idx_workflow_tasks_step" ON "workflow_tasks" USING btree ("stepId");--> statement-breakpoint
CREATE INDEX "idx_workflow_tasks_assignee" ON "workflow_tasks" USING btree ("assigneeId");--> statement-breakpoint
CREATE INDEX "idx_workflow_tasks_status" ON "workflow_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workflow_tasks_due" ON "workflow_tasks" USING btree ("dueDate");