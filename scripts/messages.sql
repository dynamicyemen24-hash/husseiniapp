CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY,
  "tenantId" integer NOT NULL,
  "fromUserId" text NOT NULL,
  "fromName" text,
  "toUserId" text NOT NULL,
  "body" text NOT NULL,
  "isRead" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_messages_tenant" ON "messages" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_messages_to" ON "messages" ("tenantId", "toUserId");
CREATE INDEX IF NOT EXISTS "idx_messages_from" ON "messages" ("tenantId", "fromUserId");
