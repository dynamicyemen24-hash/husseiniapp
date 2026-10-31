CREATE TYPE "public"."fiscal_period_status" AS ENUM('open', 'closing', 'closed', 'reopened');--> statement-breakpoint
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
CREATE INDEX "idx_fiscal_periods_tenant" ON "fiscal_periods" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_fiscal_periods_status" ON "fiscal_periods" USING btree ("status");