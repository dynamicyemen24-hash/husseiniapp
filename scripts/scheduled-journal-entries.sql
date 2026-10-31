CREATE TABLE IF NOT EXISTS "scheduled_journal_entries" (
  "id" serial PRIMARY KEY,
  "tenantId" integer NOT NULL,
  "name" varchar(200) NOT NULL,
  "description" text,
  "branchId" integer,
  "frequency" varchar(20) NOT NULL DEFAULT 'monthly',
  "nextRunAt" timestamp,
  "isActive" boolean NOT NULL DEFAULT true,
  "legs" jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_scheduledJournal_tenant" ON "scheduled_journal_entries" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_scheduledJournal_nextRun" ON "scheduled_journal_entries" ("nextRunAt");
