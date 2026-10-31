CREATE TABLE IF NOT EXISTS "product_units" (
  "id" serial PRIMARY KEY,
  "tenantId" integer NOT NULL,
  "productId" integer NOT NULL,
  "unitId" integer NOT NULL,
  "conversionFactor" numeric(15,6) NOT NULL DEFAULT 1,
  "isBase" boolean NOT NULL DEFAULT false,
  "barcode" varchar(100)
);

CREATE INDEX IF NOT EXISTS "idx_productUnits_tenant" ON "product_units" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_productUnits_product" ON "product_units" ("productId");
