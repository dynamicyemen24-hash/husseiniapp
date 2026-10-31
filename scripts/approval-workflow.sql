ALTER TABLE "procurements" ADD COLUMN IF NOT EXISTS "approvers" jsonb;
ALTER TABLE "procurements" ADD COLUMN IF NOT EXISTS "approvalStep" integer NOT NULL DEFAULT 0;
ALTER TABLE "procurements" ADD COLUMN IF NOT EXISTS "approvalLog" jsonb;
