-- Migration 0008: costCenterId on transactions for integration + ensure cost_centers exists
-- cost_centers table already exists via 0000 snapshot (advanced version) — only ensure column
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "costCenterId" integer;
