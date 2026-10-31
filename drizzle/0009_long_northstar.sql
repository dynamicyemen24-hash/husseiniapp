CREATE TYPE "public"."allocation_method" AS ENUM('fixed', 'proportional', 'step_down', 'reciprocal', 'activity_based');--> statement-breakpoint
CREATE TYPE "public"."batch_status" AS ENUM('active', 'expired', 'recalled', 'consumed');--> statement-breakpoint
CREATE TYPE "public"."batch_tracking_method" AS ENUM('none', 'batch', 'lot', 'serial');--> statement-breakpoint
CREATE TYPE "public"."budget_version" AS ENUM('draft', 'approved', 'revised', 'final');--> statement-breakpoint
CREATE TYPE "public"."consolidation_method" AS ENUM('full', 'proportional', 'cost');--> statement-breakpoint
CREATE TYPE "public"."cost_center_type" AS ENUM('cost', 'profit', 'investment', 'revenue');--> statement-breakpoint
CREATE TYPE "public"."cycle_count_status" AS ENUM('planned', 'in_progress', 'completed', 'cancelled', 'approved');--> statement-breakpoint
CREATE TYPE "public"."expense_approval_status" AS ENUM('pending', 'approved', 'rejected', 'auto_approved');--> statement-breakpoint
CREATE TYPE "public"."expense_basis" AS ENUM('accrual', 'cash');--> statement-breakpoint
CREATE TYPE "public"."inventory_allocation_type" AS ENUM('serial', 'batch');--> statement-breakpoint
CREATE TYPE "public"."inventory_tracking_type" AS ENUM('none', 'serial', 'batch', 'matrix');--> statement-breakpoint
CREATE TYPE "public"."kpi_data_type" AS ENUM('currency', 'percentage', 'ratio', 'count', 'days', 'custom');--> statement-breakpoint
CREATE TYPE "public"."kpi_frequency" AS ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'realtime');--> statement-breakpoint
CREATE TYPE "public"."recurring_expense_frequency" AS ENUM('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'custom');--> statement-breakpoint
CREATE TYPE "public"."recurring_expense_status" AS ENUM('draft', 'active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('tabular', 'pivot', 'chart', 'dashboard', 'financial_statement', 'custom');--> statement-breakpoint
CREATE TYPE "public"."reservation_source" AS ENUM('sales_order', 'purchase_order', 'production_order', 'transfer_order', 'manual');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('active', 'fulfilled', 'released', 'expired');--> statement-breakpoint
CREATE TYPE "public"."serial_status" AS ENUM('available', 'sold', 'reserved', 'returned', 'damaged', 'stolen');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('in', 'out', 'transfer', 'adjustment', 'return', 'production', 'waste');--> statement-breakpoint
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
CREATE TABLE "budget_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" integer NOT NULL,
	"scenarioId" integer NOT NULL,
	"accountId" integer NOT NULL,
	"costCenterId" integer,
	"periodName" varchar(50) NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
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
ALTER TABLE "sales_invoices" DROP CONSTRAINT "chk_sales_invoice_status_posted_immutable";--> statement-breakpoint
ALTER TABLE "branches" ALTER COLUMN "tenantId" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "costCenterId" integer;--> statement-breakpoint
ALTER TABLE "recurring_expense_runs" ADD CONSTRAINT "recurring_expense_runs_recurringExpenseId_recurring_expenses_id_fk" FOREIGN KEY ("recurringExpenseId") REFERENCES "public"."recurring_expenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expense_runs" ADD CONSTRAINT "recurring_expense_runs_journalEntryId_journal_entries_id_fk" FOREIGN KEY ("journalEntryId") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expense_runs" ADD CONSTRAINT "recurring_expense_runs_purchaseInvoiceId_purchase_invoices_id_fk" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "public"."purchase_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expense_runs" ADD CONSTRAINT "recurring_expense_runs_paymentTransactionId_transactions_id_fk" FOREIGN KEY ("paymentTransactionId") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expense_runs" ADD CONSTRAINT "recurring_expense_runs_processedById_users_id_fk" FOREIGN KEY ("processedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "idx_allocation_rules_tenant" ON "allocation_rules" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_allocation_rules_source_cc" ON "allocation_rules" USING btree ("sourceCostCenterId");--> statement-breakpoint
CREATE INDEX "idx_allocation_rules_next_run" ON "allocation_rules" USING btree ("nextRunAt");--> statement-breakpoint
CREATE INDEX "idx_allocation_runs_tenant" ON "allocation_runs" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_allocation_runs_rule" ON "allocation_runs" USING btree ("ruleId");--> statement-breakpoint
CREATE INDEX "idx_allocation_runs_period" ON "allocation_runs" USING btree ("periodName");--> statement-breakpoint
CREATE INDEX "idx_budget_lines_tenant" ON "budget_lines" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_budget_lines_scenario" ON "budget_lines" USING btree ("scenarioId");--> statement-breakpoint
CREATE INDEX "idx_budget_lines_account" ON "budget_lines" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "idx_budget_lines_cc_period" ON "budget_lines" USING btree ("costCenterId","periodName");--> statement-breakpoint
CREATE INDEX "idx_budget_scenarios_tenant" ON "budget_scenarios" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_budget_scenarios_period" ON "budget_scenarios" USING btree ("periodName");--> statement-breakpoint
CREATE INDEX "idx_consolidation_adj_tenant" ON "consolidation_adjustments" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_consolidation_adj_period" ON "consolidation_adjustments" USING btree ("periodName");--> statement-breakpoint
CREATE INDEX "idx_consolidation_adj_entity" ON "consolidation_adjustments" USING btree ("consolidationEntityId");--> statement-breakpoint
CREATE INDEX "idx_consolidation_entities_tenant" ON "consolidation_entities" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_consolidation_entities_entity" ON "consolidation_entities" USING btree ("entityTenantId");--> statement-breakpoint
CREATE INDEX "idx_cost_centers_tenant" ON "cost_centers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_cost_centers_parent" ON "cost_centers" USING btree ("parentId");--> statement-breakpoint
CREATE INDEX "idx_cost_centers_type" ON "cost_centers" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_cost_centers_path" ON "cost_centers" USING btree ("path");--> statement-breakpoint
CREATE INDEX "idx_cycleCountLines_tenant" ON "cycle_count_lines" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_cycleCountLines_cycleCount" ON "cycle_count_lines" USING btree ("cycleCountId");--> statement-breakpoint
CREATE INDEX "idx_cycleCountLines_product" ON "cycle_count_lines" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_cycleCounts_tenant" ON "cycle_counts" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_cycleCounts_warehouse" ON "cycle_counts" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_cycleCounts_status" ON "cycle_counts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cycleCounts_plannedDate" ON "cycle_counts" USING btree ("plannedDate");--> statement-breakpoint
CREATE INDEX "idx_inventoryAllocations_tenant" ON "inventory_allocations" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_inventoryAllocations_product" ON "inventory_allocations" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_inventoryAllocations_session" ON "inventory_allocations" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "idx_inventoryAllocations_cartLine" ON "inventory_allocations" USING btree ("cartLineId");--> statement-breakpoint
CREATE INDEX "idx_inventoryBatches_tenant" ON "inventory_batches" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_inventoryBatches_product" ON "inventory_batches" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_inventoryBatches_warehouse" ON "inventory_batches" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_inventoryBatches_expiry" ON "inventory_batches" USING btree ("expiryDate");--> statement-breakpoint
CREATE INDEX "idx_inventoryBatches_batchNumber" ON "inventory_batches" USING btree ("batchNumber");--> statement-breakpoint
CREATE INDEX "idx_valuationLayers_tenant" ON "inventory_valuation_layers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_valuationLayers_product" ON "inventory_valuation_layers" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_valuationLayers_warehouse" ON "inventory_valuation_layers" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_valuationLayers_batch" ON "inventory_valuation_layers" USING btree ("batchId");--> statement-breakpoint
CREATE INDEX "idx_valuationLayers_layerDate" ON "inventory_valuation_layers" USING btree ("layerDate");--> statement-breakpoint
CREATE INDEX "idx_valuationLayers_active" ON "inventory_valuation_layers" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "idx_kpi_measurements_tenant" ON "kpi_measurements" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_kpi_measurements_kpi" ON "kpi_measurements" USING btree ("kpiId");--> statement-breakpoint
CREATE INDEX "idx_kpi_measurements_period" ON "kpi_measurements" USING btree ("periodName");--> statement-breakpoint
CREATE INDEX "idx_kpi_measurements_status" ON "kpi_measurements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_kpis_tenant" ON "kpis" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_kpis_category" ON "kpis" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_matrixDimensionValues_tenant" ON "matrix_dimension_values" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_matrixDimensionValues_dimension" ON "matrix_dimension_values" USING btree ("dimensionId");--> statement-breakpoint
CREATE INDEX "idx_matrixDimensions_tenant" ON "matrix_dimensions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_matrixItems_tenant" ON "matrix_items" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_matrixItems_product" ON "matrix_items" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_matrixItems_matrix" ON "matrix_items" USING btree ("matrixId");--> statement-breakpoint
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
CREATE INDEX "idx_productVariants_tenant" ON "product_variants" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_productVariants_product" ON "product_variants" USING btree ("productId");--> statement-breakpoint
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
CREATE INDEX "idx_variance_tenant" ON "variance_analyses" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_variance_scenario" ON "variance_analyses" USING btree ("scenarioId");--> statement-breakpoint
CREATE INDEX "idx_variance_account_cc" ON "variance_analyses" USING btree ("accountId","costCenterId");--> statement-breakpoint
CREATE INDEX "idx_variance_period" ON "variance_analyses" USING btree ("periodName");--> statement-breakpoint
CREATE INDEX "idx_warehouseStock_tenant" ON "warehouse_stock" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_warehouseStock_product" ON "warehouse_stock" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_warehouseStock_warehouse" ON "warehouse_stock" USING btree ("warehouseId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_salesRep" ON "sales_invoices" USING btree ("salesRepId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_tenant_salesrep" ON "sales_invoices" USING btree ("tenantId","salesRepId");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_tenant_status_date" ON "sales_invoices" USING btree ("tenantId","status","invoiceDate");--> statement-breakpoint
CREATE INDEX "idx_salesInvoices_tenant_customer_date" ON "sales_invoices" USING btree ("tenantId","customerId","invoiceDate");--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoice_status_posted_immutable" CHECK (
      CASE WHEN "sales_invoices"."status" IN ('paid', 'cancelled') THEN
        "sales_invoices"."postedAt" IS NOT NULL
      ELSE TRUE END
    );