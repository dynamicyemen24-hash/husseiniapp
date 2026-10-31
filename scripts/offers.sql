-- Offers / Discounts (Module B)
CREATE TABLE IF NOT EXISTS "offers" (
  "id" serial PRIMARY KEY,
  "tenantId" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "kind" varchar(20) DEFAULT 'financial' NOT NULL,
  "discountPercent" decimal(6,2) DEFAULT '0' NOT NULL,
  "minQty" decimal(15,2),
  "productId" integer,
  "categoryId" integer,
  "startDate" timestamp,
  "endDate" timestamp,
  "isActive" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_offers_tenant" ON "offers" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_offers_product" ON "offers" ("productId");
CREATE INDEX IF NOT EXISTS "idx_offers_category" ON "offers" ("categoryId");
