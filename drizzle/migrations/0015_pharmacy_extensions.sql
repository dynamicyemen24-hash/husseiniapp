-- Pharmacy System Extensions
-- Drug scheduling, prescription tracking, and controlled substance management
-- Drug schedule classification enum
CREATE TYPE drug_schedule AS ENUM (
    'OTC',
    -- Over the counter - بدون وصفة
    'PRESCRIPTION',
    -- Requires prescription - بوصفة طبية
    'CONTROLLED',
    -- Controlled substances - خاضعة للرقابة
    'PSYCHOTROPIC',
    -- Psychological substances - مؤثرات عقلية
    'THERAPEUTIC' -- Therapeutic drugs - علاجية
);
-- Prescription status enum
CREATE TYPE prescription_status AS ENUM (
    'pending',
    -- في الانتظار
    'verified',
    -- تم التحقق
    'dispensed',
    -- تم الصرف
    'cancelled',
    -- ملغاة
    'expired' -- منتهية
);
-- Add pharmacy fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS drug_schedule drug_schedule DEFAULT 'OTC';
ALTER TABLE products
ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT FALSE;
ALTER TABLE products
ADD COLUMN IF NOT EXISTS scientific_name VARCHAR(255);
ALTER TABLE products
ADD COLUMN IF NOT EXISTS ndc_code VARCHAR(50);
-- National Drug Code
ALTER TABLE products
ADD COLUMN IF NOT EXISTS active_ingredients TEXT;
-- JSON array
ALTER TABLE products
ADD COLUMN IF NOT EXISTS contraindications TEXT;
-- JSON array
ALTER TABLE products
ADD COLUMN IF NOT EXISTS side_effects TEXT;
-- JSON array
ALTER TABLE products
ADD COLUMN IF NOT EXISTS storage_conditions VARCHAR(255);
ALTER TABLE products
ADD COLUMN IF NOT EXISTS dosage_form VARCHAR(50);
-- أقراص، كبسولات، شراب، حقن
ALTER TABLE products
ADD COLUMN IF NOT EXISTS strength VARCHAR(50);
-- 500mg, 250ml
ALTER TABLE products
ADD COLUMN IF NOT EXISTS max_quantity_per_sale INTEGER DEFAULT 999;
ALTER TABLE products
ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);
-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    doctor_license VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status prescription_status DEFAULT 'pending' NOT NULL,
    notes TEXT,
    prescription_number VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "serverVersion" INTEGER DEFAULT 1 NOT NULL,
    "lastSyncAt" TIMESTAMP,
    "conflictState" VARCHAR(20) DEFAULT 'none',
    "aggregateId" UUID
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant ON prescriptions("tenantId");
CREATE INDEX IF NOT EXISTS idx_prescriptions_customer ON prescriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_expiry ON prescriptions(expiry_date);
-- Prescription items table
CREATE TABLE IF NOT EXISTS prescription_items (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER NOT NULL,
    prescription_id INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    instructions TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "serverVersion" INTEGER DEFAULT 1 NOT NULL,
    "lastSyncAt" TIMESTAMP,
    "conflictState" VARCHAR(20) DEFAULT 'none'
);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_product ON prescription_items(product_id);
-- Drug interactions database (reference table)
CREATE TABLE IF NOT EXISTS drug_interactions (
    id SERIAL PRIMARY KEY,
    "tenantId" INTEGER,
    -- NULL means global interaction
    drug_a_id INTEGER NOT NULL REFERENCES products(id),
    drug_b_id INTEGER NOT NULL REFERENCES products(id),
    interaction_type VARCHAR(20) NOT NULL,
    -- MAJOR, MODERATE, MINOR
    description TEXT NOT NULL,
    recommendation TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(drug_a_id, drug_b_id)
);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_a ON drug_interactions(drug_a_id);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_b ON drug_interactions(drug_b_id);
-- Controlled substances log
CREATE TABLE IF NOT EXISTS controlled_substances_log (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id),
    operation VARCHAR(20) NOT NULL,
    -- PURCHASE, DISPENSE, ADJUST
    quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reference_number VARCHAR(100),
    user_id INTEGER NOT NULL,
    customer_id VARCHAR(255),
    prescription_id INTEGER REFERENCES prescriptions(id),
    "timestamp" TIMESTAMP DEFAULT NOW() NOT NULL,
    "serverVersion" INTEGER DEFAULT 1 NOT NULL,
    "lastSyncAt" TIMESTAMP,
    "conflictState" VARCHAR(20) DEFAULT 'none'
);
CREATE INDEX IF NOT EXISTS idx_controlled_log_product ON controlled_substances_log(product_id);
CREATE INDEX IF NOT EXISTS idx_controlled_log_tenant ON controlled_substances_log("tenantId");
CREATE INDEX IF NOT EXISTS idx_controlled_log_timestamp ON controlled_substances_log("timestamp");
-- Add constraint for expiry tracking on inventory batches
ALTER TABLE inventory_batches
ADD COLUMN IF NOT EXISTS days_to_expiry INTEGER GENERATED ALWAYS AS (DATE_PART('day', expiry_date - CURRENT_DATE)) STORED;
-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW."updatedAt" = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER update_prescriptions_updated_at BEFORE
UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();