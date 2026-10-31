-- Reorder automation columns on products (Module C)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "reorderPoint" decimal(15,2) DEFAULT '0' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "reorderQty" decimal(15,2) DEFAULT '0' NOT NULL;
