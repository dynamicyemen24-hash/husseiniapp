DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'account_type' AND n.nspname = 'public') THEN CREATE TYPE "public"."account_type" AS ENUM('asset', 'liability', 'equity', 'revenue', 'expense'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'approval_decision' AND n.nspname = 'public') THEN CREATE TYPE "public"."approval_decision" AS ENUM('pending', 'approved', 'rejected'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'attendance_status' AND n.nspname = 'public') THEN CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'late', 'leave'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'employee_status' AND n.nspname = 'public') THEN CREATE TYPE "public"."employee_status" AS ENUM('active', 'on_leave', 'terminated'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'inspection_result' AND n.nspname = 'public') THEN CREATE TYPE "public"."inspection_result" AS ENUM('pass', 'fail', 'conditional'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'inventory_movement_type' AND n.nspname = 'public') THEN CREATE TYPE "public"."inventory_movement_type" AS ENUM('in', 'out', 'transfer', 'adjustment'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'lifecycle_status' AND n.nspname = 'public') THEN CREATE TYPE "public"."lifecycle_status" AS ENUM('saved', 'approved', 'sent', 'posted', 'completed'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'order_status' AND n.nspname = 'public') THEN CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'payment_method' AND n.nspname = 'public') THEN CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'transfer', 'credit', 'online'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'payment_source' AND n.nspname = 'public') THEN CREATE TYPE "public"."payment_source" AS ENUM('sales', 'purchases'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'payroll_status' AND n.nspname = 'public') THEN CREATE TYPE "public"."payroll_status" AS ENUM('draft', 'processed', 'paid'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'product_type' AND n.nspname = 'public') THEN CREATE TYPE "public"."product_type" AS ENUM('goods', 'service'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'project_status' AND n.nspname = 'public') THEN CREATE TYPE "public"."project_status" AS ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'purchase_invoice_status' AND n.nspname = 'public') THEN CREATE TYPE "public"."purchase_invoice_status" AS ENUM('draft', 'confirmed', 'paid', 'partial', 'cancelled'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'requisition_status' AND n.nspname = 'public') THEN CREATE TYPE "public"."requisition_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'ordered', 'received'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'sales_invoice_status' AND n.nspname = 'public') THEN CREATE TYPE "public"."sales_invoice_status" AS ENUM('draft', 'confirmed', 'paid', 'partial', 'cancelled'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'subscription_status' AND n.nspname = 'public') THEN CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'expired'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'task_priority' AND n.nspname = 'public') THEN CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'task_status' AND n.nspname = 'public') THEN CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'review', 'done'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'ticket_priority' AND n.nspname = 'public') THEN CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'ticket_status' AND n.nspname = 'public') THEN CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'transaction_type' AND n.nspname = 'public') THEN CREATE TYPE "public"."transaction_type" AS ENUM('debit', 'credit'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'role' AND n.nspname = 'public') THEN CREATE TYPE "public"."role" AS ENUM('admin', 'auditor', 'accountant', 'owner', 'user'); END IF; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
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
	CONSTRAINT "accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer,
	"userId" serial NOT NULL,
	"userName" varchar(255),
	"action" varchar(255) NOT NULL,
	"details" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
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
	CONSTRAINT "api_keys_keyHash_unique" UNIQUE("keyHash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"employeeId" integer NOT NULL,
	"date" timestamp NOT NULL,
	"checkIn" timestamp,
	"checkOut" timestamp,
	"status" "attendance_status" DEFAULT 'present' NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"userId" integer,
	"action" varchar(100) NOT NULL,
	"entityType" varchar(100) NOT NULL,
	"entityId" integer NOT NULL,
	"oldValues" jsonb,
	"newValues" jsonb,
	"ipAddress" varchar(45),
	"userAgent" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
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
	CONSTRAINT "billing_invoices_invoiceNumber_unique" UNIQUE("invoiceNumber")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer DEFAULT 1 NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"city" varchar(100),
	"isMain" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"periodName" varchar(50) NOT NULL,
	"targetRevenue" numeric(15, 2) NOT NULL,
	"targetExpense" numeric(15, 2) NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "currencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"decimalPlaces" integer DEFAULT 2 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"notes" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(150) NOT NULL,
	"managerId" integer,
	"parentDepartmentId" integer,
	"costCenter" varchar(50),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employees" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"baseCurrency" varchar(10) NOT NULL,
	"quoteCurrency" varchar(10) NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"source" varchar(50),
	"effectiveFrom" timestamp NOT NULL,
	"effectiveTo" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feature_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer,
	"key" varchar(100) NOT NULL,
	"value" varchar(255) NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "file_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"productId" integer NOT NULL,
	"warehouseId" integer,
	"type" "inventory_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"referenceId" integer,
	"referenceType" varchar(50),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opening_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"accountId" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"type" "transaction_type" DEFAULT 'debit' NOT NULL,
	"notes" text,
	"periodName" varchar(50) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_items" (
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
CREATE TABLE IF NOT EXISTS "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
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
	CONSTRAINT "orders_orderNumber_unique" UNIQUE("orderNumber")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"invoiceId" integer,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"status" varchar(20) NOT NULL,
	"paymentMethod" varchar(50),
	"transactionId" varchar(255),
	"refundedAmount" numeric(10, 2) DEFAULT '0',
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"source" "payment_source" NOT NULL,
	"invoiceId" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"paymentMethod" "payment_method" DEFAULT 'cash',
	"paymentDate" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"payrollRunId" integer NOT NULL,
	"employeeId" integer NOT NULL,
	"basicSalary" numeric(15, 2) DEFAULT '0' NOT NULL,
	"deductions" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net" numeric(15, 2) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"periodName" varchar(40) NOT NULL,
	"fromDate" timestamp NOT NULL,
	"toDate" timestamp NOT NULL,
	"totalNet" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" "payroll_status" DEFAULT 'draft' NOT NULL,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "procurement_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"procurementId" integer NOT NULL,
	"approverId" integer,
	"level" integer DEFAULT 1 NOT NULL,
	"decision" "approval_decision" DEFAULT 'pending' NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "procurements" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"nameAr" varchar(255),
	"type" "product_type" DEFAULT 'goods' NOT NULL,
	"category" varchar(100),
	"unit" varchar(50) DEFAULT 'قطعة' NOT NULL,
	"purchasePrice" numeric(15, 2) DEFAULT '0' NOT NULL,
	"salePrice" numeric(15, 2) DEFAULT '0' NOT NULL,
	"wholesalePrice" numeric(15, 2) DEFAULT '0' NOT NULL,
	"minStock" integer DEFAULT 0 NOT NULL,
	"currentStock" integer DEFAULT 0 NOT NULL,
	"barcode" varchar(100),
	"supplierId" integer,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"projectId" integer NOT NULL,
	"employeeId" integer NOT NULL,
	"roleInProject" varchar(80),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_invoice_items" (
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
CREATE TABLE IF NOT EXISTS "purchase_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"invoiceNumber" varchar(50) NOT NULL,
	"supplierId" integer,
	"branchId" integer,
	"status" "purchase_invoice_status" DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"taxRate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"taxAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"paidAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"paymentMethod" "payment_method" DEFAULT 'cash',
	"notes" text,
	"invoiceDate" timestamp DEFAULT now() NOT NULL,
	"dueDate" timestamp,
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_invoices_invoiceNumber_unique" UNIQUE("invoiceNumber")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quality_inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(40) NOT NULL,
	"title" varchar(200) NOT NULL,
	"type" varchar(80),
	"result" "inspection_result" DEFAULT 'pass' NOT NULL,
	"inspectedById" integer,
	"relatedEntity" varchar(120),
	"score" numeric(6, 2),
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sales_invoice_items" (
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
CREATE TABLE IF NOT EXISTS "sales_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"invoiceNumber" varchar(50) NOT NULL,
	"customerId" integer,
	"branchId" integer,
	"status" "sales_invoice_status" DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"taxRate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"taxAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"paidAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"paymentMethod" "payment_method" DEFAULT 'cash',
	"notes" text,
	"invoiceDate" timestamp DEFAULT now() NOT NULL,
	"dueDate" timestamp,
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_invoices_invoiceNumber_unique" UNIQUE("invoiceNumber")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"institutionName" varchar(255) DEFAULT 'مؤسسة الحسينية لخدمات الأعمال' NOT NULL,
	"currency" varchar(50) DEFAULT 'ريال يمني (YER)' NOT NULL,
	"accountingPeriod" varchar(50) DEFAULT '2026' NOT NULL,
	"managerName" varchar(255) DEFAULT 'إدارة المؤسسة' NOT NULL,
	"notes" text,
	"subscriptionStatus" "subscription_status" DEFAULT 'trial' NOT NULL,
	"trialEndsAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_tenantId_unique" UNIQUE("tenantId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"isActive" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
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
	CONSTRAINT "suppliers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"invitedBy" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"acceptedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"ownerUserId" integer NOT NULL,
	"currency" varchar(20) DEFAULT 'YER' NOT NULL,
	"country" varchar(100) DEFAULT 'اليمن' NOT NULL,
	"subscriptionPlan" varchar(50) DEFAULT 'standard' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"accountId" integer NOT NULL,
	"branchId" integer,
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
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_branch_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"userId" integer NOT NULL,
	"branchId" integer NOT NULL,
	"canView" boolean DEFAULT true NOT NULL,
	"canInsert" boolean DEFAULT true NOT NULL,
	"canApprove" boolean DEFAULT false NOT NULL,
	"canPost" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(255) NOT NULL,
	"tenantId" integer,
	"name" varchar(255),
	"email" varchar(255),
	"loginMethod" varchar(50),
	"role" "role" DEFAULT 'user' NOT NULL,
	"themePreference" varchar(20) DEFAULT 'dark' NOT NULL,
	"emailNotifications" boolean DEFAULT true NOT NULL,
	"whatsappNotifications" boolean DEFAULT true NOT NULL,
	"compactMode" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"location" varchar(255),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhookId" integer NOT NULL,
	"event" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"responseStatus" integer,
	"responseBody" text,
	"deliveredAt" timestamp,
	"success" boolean DEFAULT false NOT NULL,
	"attemptCount" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"url" varchar(500) NOT NULL,
	"secret" varchar(255) NOT NULL,
	"events" jsonb NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastTriggeredAt" timestamp,
	"failureCount" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_accounts_tenant" ON "accounts" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activityLogs_tenant" ON "activity_logs" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activityLogs_user" ON "activity_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activityLogs_created" ON "activity_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_tenant" ON "api_keys" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_attendance_tenant" ON "attendance" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_attendance_employee" ON "attendance" USING btree ("employeeId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant" ON "audit_logs" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user" ON "audit_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" ON "audit_logs" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created" ON "audit_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_invoice_tenant" ON "billing_invoices" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_invoice_status" ON "billing_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_budgets_tenant" ON "budgets" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_tenant" ON "customers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_departments_tenant" ON "departments" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_departments_tenant_code" ON "departments" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_employees_tenant" ON "employees" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_employees_tenant_code" ON "employees" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_exchange_rates_pair" ON "exchange_rates" USING btree ("baseCurrency","quoteCurrency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_exchange_rates_effective" ON "exchange_rates" USING btree ("effectiveFrom");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feature_flags_tenant_key" ON "feature_flags" USING btree ("tenantId","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_file_uploads_tenant" ON "file_uploads" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_file_uploads_entity" ON "file_uploads" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventoryMovements_tenant" ON "inventory_movements" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant" ON "notifications" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "notifications" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_status" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_openingBalances_tenant" ON "opening_balances" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_items_order" ON "order_items" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_tenant" ON "orders" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_customer" ON "orders" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_history_tenant" ON "payment_history" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_history_invoice" ON "payment_history" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_tenant" ON "payments" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_invoice" ON "payments" USING btree ("source","invoiceId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payroll_items_tenant" ON "payroll_items" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payroll_items_run" ON "payroll_items" USING btree ("payrollRunId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payroll_runs_tenant" ON "payroll_runs" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_procurement_approvals_tenant" ON "procurement_approvals" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_procurement_approvals_proc" ON "procurement_approvals" USING btree ("procurementId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_procurements_tenant" ON "procurements" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_procurements_tenant_req" ON "procurements" USING btree ("tenantId","requisitionNumber");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_tenant" ON "products" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_category" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_supplier" ON "products" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_members_tenant" ON "project_members" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_members_project" ON "project_members" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_tasks_tenant" ON "project_tasks" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_tasks_project" ON "project_tasks" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_projects_tenant" ON "projects" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_projects_tenant_code" ON "projects" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchase_items_invoice" ON "purchase_invoice_items" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchaseInvoices_tenant" ON "purchase_invoices" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchaseInvoices_supplier" ON "purchase_invoices" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchaseInvoices_status" ON "purchase_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quality_inspections_tenant" ON "quality_inspections" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_quality_tenant_code" ON "quality_inspections" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_items_invoice" ON "sales_invoice_items" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_salesInvoices_tenant" ON "sales_invoices" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_salesInvoices_customer" ON "sales_invoices" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_salesInvoices_status" ON "sales_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_suppliers_tenant" ON "suppliers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_team_inv_tenant" ON "team_invitations" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_team_inv_email" ON "team_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tenant_sub_tenant" ON "tenant_subscriptions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tenant_sub_status" ON "tenant_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tickets_tenant" ON "tickets" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tickets_tenant_num" ON "tickets" USING btree ("tenantId","ticketNumber");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_tenant" ON "transactions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_account" ON "transactions" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_date" ON "transactions" USING btree ("transactionDate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_branch" ON "transactions" USING btree ("branchId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_reference" ON "transactions" USING btree ("referenceType","referenceId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_warehouses_tenant" ON "warehouses" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_webhook" ON "webhook_deliveries" USING btree ("webhookId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhooks_tenant" ON "webhooks" USING btree ("tenantId");