-- Workflow enums (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE "public"."workflow_priority" AS ENUM('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "public"."workflow_status" AS ENUM('draft', 'pending_approval', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled', 'on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "public"."workflow_step_status" AS ENUM('pending', 'active', 'completed', 'skipped', 'failed', 'reassigned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "public"."workflow_step_type" AS ENUM('approval', 'task', 'notification', 'automation', 'integration', 'parallel', 'gateway');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "public"."workflow_transition_type" AS ENUM('submit', 'approve', 'reject', 'reassign', 'escalate', 'delegate', 'complete', 'cancel', 'resume', 'hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Workflow Definitions
CREATE TABLE IF NOT EXISTS "workflow_definitions" (
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
    "settings" jsonb DEFAULT '{}',
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL,
    "createdById" integer,
    "updatedById" integer,
    CONSTRAINT "workflow_definitions_GlobalId_unique" UNIQUE("GlobalId"),
    CONSTRAINT "workflow_definitions_code_tenant_unique" UNIQUE("code","tenantId"),
    CONSTRAINT "chk_workflow_def_tenant_not_null" CHECK ("workflow_definitions"."tenantId" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "idx_workflow_definitions_tenant" ON "workflow_definitions" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_workflow_definitions_entity" ON "workflow_definitions" ("entityType");
CREATE INDEX IF NOT EXISTS "idx_workflow_definitions_active" ON "workflow_definitions" ("isActive");

-- Workflow Instances
CREATE TABLE IF NOT EXISTS "workflow_instances" (
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
    "context" jsonb DEFAULT '{}',
    "metadata" jsonb DEFAULT '{}',
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL,
    "createdById" uuid,
    "updatedById" uuid,
    CONSTRAINT "workflow_instances_GlobalId_unique" UNIQUE("GlobalId"),
    CONSTRAINT "chk_workflow_inst_tenant_not_null" CHECK ("workflow_instances"."tenantId" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "idx_workflow_instances_tenant" ON "workflow_instances" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_workflow_instances_definition" ON "workflow_instances" ("definitionId");
CREATE INDEX IF NOT EXISTS "idx_workflow_instances_entity" ON "workflow_instances" ("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "idx_workflow_instances_status" ON "workflow_instances" ("status");
CREATE INDEX IF NOT EXISTS "idx_workflow_instances_assignee" ON "workflow_instances" ("currentAssigneeId");
CREATE INDEX IF NOT EXISTS "idx_workflow_instances_due" ON "workflow_instances" ("dueDate");

-- Workflow Tasks
CREATE TABLE IF NOT EXISTS "workflow_tasks" (
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
    "formData" jsonb DEFAULT '{}',
    "previousTaskId" uuid,
    "delegatedFromId" uuid,
    "delegatedToId" uuid,
    "escalatedFromId" uuid,
    "escalatedToId" uuid,
    "metadata" jsonb DEFAULT '{}',
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "workflow_tasks_GlobalId_unique" UNIQUE("GlobalId"),
    CONSTRAINT "chk_workflow_task_tenant_not_null" CHECK ("workflow_tasks"."tenantId" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "idx_workflow_tasks_tenant" ON "workflow_tasks" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_workflow_tasks_instance" ON "workflow_tasks" ("instanceId");
CREATE INDEX IF NOT EXISTS "idx_workflow_tasks_step" ON "workflow_tasks" ("stepId");
CREATE INDEX IF NOT EXISTS "idx_workflow_tasks_assignee" ON "workflow_tasks" ("assigneeId");
CREATE INDEX IF NOT EXISTS "idx_workflow_tasks_status" ON "workflow_tasks" ("status");
CREATE INDEX IF NOT EXISTS "idx_workflow_tasks_due" ON "workflow_tasks" ("dueDate");

-- Workflow History
CREATE TABLE IF NOT EXISTS "workflow_history" (
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
    "formData" jsonb DEFAULT '{}',
    "contextSnapshot" jsonb DEFAULT '{}',
    "metadata" jsonb DEFAULT '{}',
    "createdAt" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "workflow_history_GlobalId_unique" UNIQUE("GlobalId"),
    CONSTRAINT "chk_workflow_hist_tenant_not_null" CHECK ("workflow_history"."tenantId" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "idx_workflow_history_tenant" ON "workflow_history" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_workflow_history_instance" ON "workflow_history" ("instanceId");
CREATE INDEX IF NOT EXISTS "idx_workflow_history_task" ON "workflow_history" ("taskId");
CREATE INDEX IF NOT EXISTS "idx_workflow_history_actor" ON "workflow_history" ("actorId");
CREATE INDEX IF NOT EXISTS "idx_workflow_history_created" ON "workflow_history" ("createdAt");

-- Foreign keys (only if tables exist)
DO $$ BEGIN
    ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "workflow_definitions"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;