-- Sales Reps (Module A)
CREATE TABLE IF NOT EXISTS "sales_reps" (
  "id" serial PRIMARY KEY,
  "tenantId" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "phone" varchar(50),
  "commissionType" varchar(20) DEFAULT 'percent' NOT NULL,
  "commissionValue" decimal(15,2) DEFAULT '0' NOT NULL,
  "bonusThreshold" decimal(15,2),
  "bonusAmount" decimal(15,2),
  "isActive" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_sales_reps_tenant" ON "sales_reps" ("tenantId");
