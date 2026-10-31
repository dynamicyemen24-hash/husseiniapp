-- Migration: 0017_pharmacy_advanced
-- Description: Advanced pharmacy module tables - drug interactions, patient allergies, insurance claims, drug recalls
-- Created: 2026-09-07
-- Standards: FDA 21 CFR Part 7, USP <797>, HIPAA, DSCSA, JCAHO
-- Drug Interaction Severity Enum
CREATE TYPE drug_interaction_severity AS ENUM ('MAJOR', 'MODERATE', 'MINOR');
-- ─── Drug-Drug Interactions Table ───────────────────────────────────
-- Clinical reference database for medication interactions
CREATE TABLE IF NOT EXISTS drug_interactions (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER,
    drug_a VARCHAR(200) NOT NULL,
    drug_b VARCHAR(200) NOT NULL,
    severity drug_interaction_severity NOT NULL,
    description TEXT NOT NULL,
    mechanism TEXT,
    clinical_effect TEXT,
    recommendation TEXT,
    evidence_level VARCHAR(20),
    source VARCHAR(100),
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_a ON drug_interactions (drug_a);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_b ON drug_interactions (drug_b);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_tenant ON drug_interactions ("tenantId");
COMMENT ON TABLE drug_interactions IS 'Drug-drug interaction reference database per FDA guidelines';
COMMENT ON COLUMN drug_interactions.severity IS 'MAJOR=Contraindicated, MODERATE=Use caution, MINOR=Monitor';
-- ─── Patient Allergies Table ─────────────────────────────────────────
-- HIPAA-compliant patient allergy records
CREATE TABLE IF NOT EXISTS patient_allergies (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    allergen VARCHAR(200) NOT NULL,
    allergen_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    reaction TEXT,
    diagnosed_by VARCHAR(255),
    diagnosed_at VARCHAR(20),
    notes TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_customer ON patient_allergies (customer_id);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_tenant ON patient_allergies ("tenantId");
COMMENT ON TABLE patient_allergies IS 'Patient allergy records per HIPAA privacy requirements';
COMMENT ON COLUMN patient_allergies.allergen_type IS 'DRUG, FOOD, LATEX, OTHER';
COMMENT ON COLUMN patient_allergies.severity IS 'MILD, MODERATE, SEVERE, ANAPHYLAXIS';
-- ─── Insurance Claims Table ──────────────────────────────────────────
-- Pharmacy insurance billing and claims management
CREATE TABLE IF NOT EXISTS insurance_claims (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER NOT NULL,
    claim_number VARCHAR(50) NOT NULL,
    prescription_id INTEGER,
    customer_id VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    insurance_provider VARCHAR(200) NOT NULL,
    policy_number VARCHAR(100) NOT NULL,
    total_amount NUMERIC(14, 2) NOT NULL,
    covered_amount NUMERIC(14, 2) DEFAULT '0',
    copay_amount NUMERIC(14, 2) DEFAULT '0',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    submitted_at TIMESTAMP,
    response_at TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_insurance_claim_number UNIQUE ("tenantId", claim_number)
);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_tenant ON insurance_claims ("tenantId");
CREATE INDEX IF NOT EXISTS idx_insurance_claims_customer ON insurance_claims (customer_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims (status);
COMMENT ON TABLE insurance_claims IS 'Pharmacy insurance claims per healthcare billing standards';
COMMENT ON COLUMN insurance_claims.status IS 'DRAFT, SUBMITTED, APPROVED, REJECTED, PAID';
-- ─── Drug Recalls Table ───────────────────────────────────────────────
-- FDA 21 CFR Part 7.40 compliance - drug recall tracking
CREATE TABLE IF NOT EXISTS drug_recalls (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER,
    product_id INTEGER,
    product_name VARCHAR(200) NOT NULL,
    batch_number VARCHAR(100),
    recall_class VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    manufacturer VARCHAR(200),
    recall_date VARCHAR(20) NOT NULL,
    initiated_by VARCHAR(200),
    affected_quantity INTEGER,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    resolved_at TIMESTAMP,
    notes TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drug_recalls_tenant ON drug_recalls ("tenantId");
CREATE INDEX IF NOT EXISTS idx_drug_recalls_status ON drug_recalls (status);
CREATE INDEX IF NOT EXISTS idx_drug_recalls_class ON drug_recalls (recall_class);
COMMENT ON TABLE drug_recalls IS 'Drug recall tracking per FDA 21 CFR Part 7.40';
COMMENT ON COLUMN drug_recalls.recall_class IS 'Class I (most serious), II, III';
COMMENT ON COLUMN drug_recalls.action IS 'RETURN, DESTROY, QUARANTINE, NOTIFY';
COMMENT ON COLUMN drug_recalls.status IS 'OPEN, IN_PROGRESS, RESOLVED';
-- ─── Sample Data: Common Drug Interactions ──────────────────────────
-- Evidence-based interactions from FDA/DrugBank
INSERT INTO drug_interactions (
        drug_a,
        drug_b,
        severity,
        description,
        mechanism,
        evidence_level,
        source
    )
VALUES (
        'warfarin',
        'aspirin',
        'MAJOR',
        'Warfarin + Aspirin: Increased bleeding risk',
        'Additive anticoagulant effect',
        'A',
        'FDA'
    ),
    (
        'warfarin',
        'ibuprofen',
        'MAJOR',
        'Warfarin + NSAIDs: GI bleeding risk',
        'Inhibition of platelet function + anticoagulant',
        'A',
        'FDA'
    ),
    (
        'metformin',
        'alcohol',
        'MAJOR',
        'Metformin + Alcohol: Lactic acidosis risk',
        'Inhibition of lactate metabolism',
        'A',
        'FDA'
    ),
    (
        'lisinopril',
        'potassium',
        'MODERATE',
        'ACE Inhibitor + Potassium: Hyperkalemia',
        'Reduced aldosterone secretion',
        'B',
        'FDA'
    ),
    (
        'simvastatin',
        'grapefruit',
        'MODERATE',
        'Statin + Grapefruit: Increased myopathy risk',
        'CYP3A4 inhibition',
        'B',
        'FDA'
    ),
    (
        'amoxicillin',
        'metronidazole',
        'MODERATE',
        'Amoxicillin + Metronidazole: Disulfiram-like reaction',
        'Accumulation of acetaldehyde',
        'B',
        'FDA'
    ),
    (
        'omeprazole',
        'clopidogrel',
        'MODERATE',
        'PPI + Clopidogrel: Reduced antiplatelet effect',
        'CYP2C19 competition',
        'B',
        'FDA'
    ),
    (
        'paracetamol',
        'alcohol',
        'MODERATE',
        'Paracetamol + Alcohol: Hepatotoxicity risk',
        'Increased toxic metabolite formation',
        'B',
        'WHO'
    ),
    (
        'ciprofloxacin',
        'theophylline',
        'MAJOR',
        'Quinolone + Theophylline: Seizure risk',
        'Inhibition of theophylline metabolism',
        'A',
        'FDA'
    ),
    (
        'digoxin',
        'amiodarone',
        'MAJOR',
        'Digoxin + Amiodarone: Digoxin toxicity',
        'Reduced renal clearance of digoxin',
        'A',
        'FDA'
    );