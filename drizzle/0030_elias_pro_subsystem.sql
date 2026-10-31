-- ================================================================
-- Elias Pro Subsystem Migration
-- ---------------------------------------------------------------
-- يضيف نظام الياس برو كسياق محدود (bounded context) داخل المنصة:
--   • elias_pro_nodes        — عقد الصيانة المسجّلة (Windows/Linux agents)
--   • elias_pro_diagnostics — لقطات التشخيص ودرجة صحة الجهاز
--   • elias_pro_engine_runs — سجل تنفيذ محركات الصيانة
--   • elias_pro_work_orders — أوامر الصيانة (ورشة الإصلاح)
--
-- كل الجداول معزولة بالمؤسسة (tenantId) مع فهارس مركّبة تخدم
-- الاستعلامات الزمنية والتقارير الشهرية.
-- ================================================================

CREATE TABLE IF NOT EXISTS "elias_pro_nodes" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "tenantId" integer NOT NULL REFERENCES "tenants" ("id"),
  "code" varchar(40) NOT NULL,
  "name" varchar(120) NOT NULL,
  "baseUrl" varchar(500) NOT NULL,
  "tokenHash" varchar(64),
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "isSimulated" boolean NOT NULL DEFAULT false,
  "agentVersion" varchar(40),
  "platform" varchar(40),
  "capabilities" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "lastSeenAt" timestamp,
  "lastError" text,
  "lastLatencyMs" integer,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "serverVersion" integer NOT NULL DEFAULT 1,
  "lastSyncAt" timestamp,
  "conflictState" varchar(20) NOT NULL DEFAULT 'none',
  "aggregateId" uuid
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_eliasProNodes_tenant" ON "elias_pro_nodes" ("tenantId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "eliasProNodes_code_tenant_unique" ON "elias_pro_nodes" ("code", "tenantId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_eliasProNodes_status" ON "elias_pro_nodes" ("status");
--> statement-breakpoint
ALTER TABLE "elias_pro_nodes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "elias_pro_diagnostics" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "tenantId" integer NOT NULL REFERENCES "tenants" ("id"),
  "nodeId" integer REFERENCES "elias_pro_nodes" ("id") ON DELETE SET NULL,
  "deviceKey" varchar(200) NOT NULL,
  "deviceLabel" varchar(160) NOT NULL,
  "platform" varchar(20) NOT NULL DEFAULT 'unknown',
  "source" varchar(20) NOT NULL DEFAULT 'agent',
  "score" integer NOT NULL DEFAULT 0,
  "level" varchar(20) NOT NULL DEFAULT 'fair',
  "report" jsonb NOT NULL,
  "snapshot" jsonb NOT NULL,
  "capturedAt" timestamp NOT NULL DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_eliasProDiagnostics_tenant" ON "elias_pro_diagnostics" ("tenantId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_eliasProDiagnostics_tenant_captured" ON "elias_pro_diagnostics" ("tenantId", "capturedAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_eliasProDiagnostics_device" ON "elias_pro_diagnostics" ("deviceKey", "capturedAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_eliasProDiagnostics_node" ON "elias_pro_diagnostics" ("nodeId");
--> statement-breakpoint
ALTER TABLE "elias_pro_diagnostics" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "elias_pro_engine_runs" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "tenantId" integer NOT NULL REFERENCES "tenants" ("id"),
  "nodeId" integer REFERENCES "elias_pro_nodes" ("id") ON DELETE SET NULL,
  "engineId" varchar(40) NOT NULL,
  "engineCode" varchar(20) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'success',
  "durationMs" integer NOT NULL DEFAULT 0,
  "output" jsonb,
  "error" text,
  "triggeredBy" integer,
  "startedAt" timestamp NOT NULL DEFAULT now(),
  "finishedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_eliasProEngineRuns_tenant" ON "elias_pro_engine_runs" ("tenantId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_eliasProEngineRuns_tenant_started" ON "elias_pro_engine_runs" ("tenantId", "startedAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_eliasProEngineRuns_node" ON "elias_pro_engine_runs" ("nodeId");
--> statement-breakpoint
ALTER TABLE "elias_pro_engine_runs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "elias_pro_work_orders" (
  "id" serial PRIMARY KEY,
  "GlobalId" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "tenantId" integer NOT NULL REFERENCES "tenants" ("id"),
  "nodeId" integer REFERENCES "elias_pro_nodes" ("id") ON DELETE SET NULL,
  "externalRef" varchar(40) NOT NULL,
  "title" varchar(200) NOT NULL,
  "customerName" varchar(150),
  "customerPhone" varchar(30),
  "deviceType" varchar(60),
  "deviceSerial" varchar(120),
  "status" varchar(20) NOT NULL DEFAULT 'received',
  "priority" varchar(20) NOT NULL DEFAULT 'medium',
  "reportedIssue" text,
  "estimatedCost" decimal(15,2),
  "parts" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "diagnosticId" integer REFERENCES "elias_pro_diagnostics" ("id") ON DELETE SET NULL,
  "supportTicketId" integer REFERENCES "tickets" ("id") ON DELETE SET NULL,
  "receivedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_eliasProWorkOrders_tenant" ON "elias_pro_work_orders" ("tenantId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_eliasProWorkOrders_tenant_status" ON "elias_pro_work_orders" ("tenantId", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_eliasProWorkOrders_tenant_created" ON "elias_pro_work_orders" ("tenantId", "createdAt");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "eliasProWorkOrders_ref_tenant_unique" ON "elias_pro_work_orders" ("externalRef", "tenantId");
--> statement-breakpoint
ALTER TABLE "elias_pro_work_orders" ENABLE ROW LEVEL SECURITY;
