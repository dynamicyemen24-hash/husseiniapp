-- Migration: 0018_healthcare_patient_system
-- Description: Healthcare Patient Management System - facilities, providers, patients, appointments, medical records, vitals, ICD codes
-- Created: 2026-09-07
-- Standards: HIPAA, HL7 FHIR, ICD-10, SNOMED CT, ICD-9, ICPC-2

-- ─── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'unknown');
CREATE TYPE blood_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');
CREATE TYPE appointment_type AS ENUM ('new_patient', 'follow_up', 'consultation', 'procedure', 'emergency', 'routine', 'telemedicine');
CREATE TYPE visit_type AS ENUM ('outpatient', 'inpatient', 'emergency', 'telemedicine', 'home_visit');
CREATE TYPE record_entry_type AS ENUM ('diagnosis', 'procedure', 'medication', 'allergy', 'vital_signs', 'lab_result', 'imaging', 'note', 'referral', 'instruction');
CREATE TYPE diagnosis_type AS ENUM ('primary', 'secondary', 'complication', 'cause_of_death');
CREATE TYPE icd_code_system AS ENUM ('ICD10', 'ICD9', 'ICPC2', 'SNOMED_CT');

-- ─── Healthcare Facilities ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS healthcare_facilities (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER NOT NULL,
    branch_id INTEGER,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    specialty VARCHAR(100),
    department VARCHAR(100),
    floor VARCHAR(20),
    building VARCHAR(100),
    is_active BOOLEAN DEFAULT true NOT NULL,
    accepts_insurance BOOLEAN DEFAULT false NOT NULL,
    insurance_providers JSONB DEFAULT '[]',
    operating_hours JSONB DEFAULT '{}',
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    notes TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_healthcare_facility_code UNIQUE ("tenantId", code)
);

CREATE INDEX IF NOT EXISTS idx_healthcare_facilities_tenant ON healthcare_facilities ("tenantId");
CREATE INDEX IF NOT EXISTS idx_healthcare_facilities_branch ON healthcare_facilities (branch_id);
CREATE INDEX IF NOT EXISTS idx_healthcare_facilities_type ON healthcare_facilities (type);

COMMENT ON TABLE healthcare_facilities IS 'Healthcare facilities - hospitals, clinics, labs, pharmacies, radiology centers';

-- ─── Healthcare Providers ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS healthcare_providers (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER NOT NULL,
    employee_id INTEGER,
    user_id UUID,
    facility_id INTEGER,
    license_number VARCHAR(100),
    specialization VARCHAR(100) NOT NULL,
    title VARCHAR(50),
    qualifications JSONB DEFAULT '[]',
    years_experience INTEGER,
    consultation_fee NUMERIC(14, 2),
    follow_up_fee NUMERIC(14, 2),
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_accepting_patients BOOLEAN DEFAULT true NOT NULL,
    schedule_template JSONB DEFAULT '{}',
    notes TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_healthcare_providers_tenant ON healthcare_providers ("tenantId");
CREATE INDEX IF NOT EXISTS idx_healthcare_providers_employee ON healthcare_providers (employee_id);
CREATE INDEX IF NOT EXISTS idx_healthcare_providers_facility ON healthcare_providers (facility_id);
CREATE INDEX IF NOT EXISTS idx_healthcare_providers_specialization ON healthcare_providers (specialization);

COMMENT ON TABLE healthcare_providers IS 'Healthcare providers - doctors, nurses, specialists per HIPAA';
COMMENT ON COLUMN healthcare_providers.specialization IS 'e.g., cardiology, dermatology, general_practice';

-- ─── Patients ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER NOT NULL,
    patient_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    local_first_name VARCHAR(100),
    local_last_name VARCHAR(100),
    gender gender NOT NULL,
    date_of_birth DATE NOT NULL,
    age INTEGER,
    blood_type blood_type,
    nationality VARCHAR(100),
    national_id VARCHAR(50),
    passport_number VARCHAR(50),
    marital_status VARCHAR(20),
    occupation VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    mobile VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relation VARCHAR(50),
    insurance_provider VARCHAR(200),
    insurance_policy_number VARCHAR(100),
    insurance_group_number VARCHAR(100),
    insurance_card_number VARCHAR(100),
    insurance_expiry DATE,
    co_payment_percent NUMERIC(5, 2),
    primary_provider_id INTEGER,
    primary_facility_id INTEGER,
    allergies JSONB DEFAULT '[]',
    chronic_conditions JSONB DEFAULT '[]',
    medications JSONB DEFAULT '[]',
    family_history TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_vip BOOLEAN DEFAULT false NOT NULL,
    blacklist BOOLEAN DEFAULT false NOT NULL,
    blacklist_reason TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_patient_number UNIQUE ("tenantId", patient_number)
);

CREATE INDEX IF NOT EXISTS idx_patients_tenant ON patients ("tenantId");
CREATE INDEX IF NOT EXISTS idx_patients_number ON patients (patient_number);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients (phone);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients (email);
CREATE INDEX IF NOT EXISTS idx_patients_national_id ON patients (national_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients (full_name);

COMMENT ON TABLE patients IS 'Patient registry per HIPAA privacy requirements';
COMMENT ON COLUMN patients.allergies IS 'JSON: [{allergen, severity, reaction}]';
COMMENT ON COLUMN patients.chronic_conditions IS 'JSON: [condition names]';
COMMENT ON COLUMN patients.medications IS 'JSON: [medication names]';

-- ─── Patient Consents ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_consents (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    consent_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    version VARCHAR(20),
    is_granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP,
    granted_by VARCHAR(255),
    ip_address VARCHAR(50),
    expiry_date DATE,
    revoked_at TIMESTAMP,
    revoked_reason TEXT,
    document_url VARCHAR(500),
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patient_consents_patient ON patient_consents (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_tenant ON patient_consents ("tenantId");
CREATE INDEX IF NOT EXISTS idx_patient_consents_type ON patient_consents (consent_type);

COMMENT ON TABLE patient_consents IS 'Patient consent records per HIPAA';
COMMENT ON COLUMN patient_consents.consent_type IS 'treatment, privacy, data_sharing, photography';

-- ─── Appointments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER NOT NULL,
    appointment_number VARCHAR(50) NOT NULL,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    facility_id INTEGER NOT NULL,
    branch_id INTEGER,
    type appointment_type NOT NULL,
    status appointment_status NOT NULL DEFAULT 'scheduled',
    visit_type visit_type NOT NULL DEFAULT 'outpatient',
    scheduled_date DATE NOT NULL,
    scheduled_time VARCHAR(10) NOT NULL,
    scheduled_end_time VARCHAR(10),
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    duration INTEGER,
    chief_complaint TEXT,
    notes TEXT,
    reason TEXT,
    is_first_visit BOOLEAN DEFAULT false NOT NULL,
    is_telemedicine BOOLEAN DEFAULT false NOT NULL,
    telemedicine_link VARCHAR(500),
    consultation_fee NUMERIC(14, 2),
    is_paid BOOLEAN DEFAULT false NOT NULL,
    payment_id INTEGER,
    cancelled_at TIMESTAMP,
    cancelled_by INTEGER,
    cancellation_reason TEXT,
    no_show_reason TEXT,
    is_follow_up BOOLEAN DEFAULT false NOT NULL,
    parent_appointment_id INTEGER,
    follow_up_date DATE,
    visit_id INTEGER,
    created_by INTEGER NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_appointment_number UNIQUE ("tenantId", appointment_number)
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments ("tenantId");
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_provider ON appointments (provider_id);
CREATE INDEX IF NOT EXISTS idx_appointments_facility ON appointments (facility_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);
CREATE INDEX IF NOT EXISTS idx_appointments_number ON appointments (appointment_number);

COMMENT ON TABLE appointments IS 'Patient appointments and scheduling';

-- ─── Medical Records ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER NOT NULL,
    record_number VARCHAR(50) NOT NULL,
    patient_id INTEGER NOT NULL,
    appointment_id INTEGER,
    visit_type visit_type NOT NULL DEFAULT 'outpatient',
    provider_id INTEGER NOT NULL,
    facility_id INTEGER NOT NULL,
    branch_id INTEGER,
    visit_date DATE NOT NULL,
    admission_date TIMESTAMP,
    discharge_date TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    physical_examination TEXT,
    assessment TEXT,
    plan TEXT,
    discharge_notes TEXT,
    discharge_diagnosis TEXT,
    follow_up_instructions TEXT,
    is_work_related BOOLEAN DEFAULT false NOT NULL,
    work_restriction TEXT,
    signed_by INTEGER,
    signed_at TIMESTAMP,
    created_by INTEGER NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_medical_record_number UNIQUE ("tenantId", record_number)
);

CREATE INDEX IF NOT EXISTS idx_medical_records_tenant ON medical_records ("tenantId");
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records (patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_provider ON medical_records (provider_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_facility ON medical_records (facility_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_visit_date ON medical_records (visit_date);
CREATE INDEX IF NOT EXISTS idx_medical_records_number ON medical_records (record_number);

COMMENT ON TABLE medical_records IS 'Medical records and clinical documentation per HIPAA';
COMMENT ON COLUMN medical_records.status IS 'active, completed, archived';

-- ─── Medical Record Entries ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_record_entries (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER NOT NULL,
    record_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    entry_type record_entry_type NOT NULL,
    diagnosis_type diagnosis_type,
    icd_code VARCHAR(20),
    icd_code_system icd_code_system,
    diagnosis_description TEXT,
    is_confirmed BOOLEAN DEFAULT true NOT NULL,
    procedure_code VARCHAR(20),
    procedure_description TEXT,
    procedure_notes TEXT,
    medication_name VARCHAR(200),
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    route VARCHAR(50),
    instructions TEXT,
    description TEXT NOT NULL,
    severity VARCHAR(20),
    notes TEXT,
    attachments JSONB DEFAULT '[]',
    created_by INTEGER NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_medical_record_entries_record ON medical_record_entries (record_id);
CREATE INDEX IF NOT EXISTS idx_medical_record_entries_patient ON medical_record_entries (patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_record_entries_type ON medical_record_entries (entry_type);
CREATE INDEX IF NOT EXISTS idx_medical_record_entries_icd ON medical_record_entries (icd_code);

COMMENT ON TABLE medical_record_entries IS 'Medical record entries - diagnoses, procedures, medications, notes';

-- ─── Vital Signs Records ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vital_sign_records (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    "tenantId" INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    record_id INTEGER,
    appointment_id INTEGER,
    recorded_at TIMESTAMP NOT NULL,
    recorded_by INTEGER NOT NULL,
    temperature NUMERIC(5, 2),
    temperature_unit VARCHAR(10) DEFAULT 'C',
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    oxygen_saturation NUMERIC(5, 2),
    weight NUMERIC(6, 2),
    height NUMERIC(6, 2),
    bmi NUMERIC(5, 2),
    waist_circumference NUMERIC(6, 2),
    head_circumference NUMERIC(5, 2),
    pain_level INTEGER,
    glasgow_coma_scale INTEGER,
    pupil_response VARCHAR(50),
    notes TEXT,
    is_abnormal BOOLEAN DEFAULT false NOT NULL,
    abnormal_flags JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON vital_sign_records (patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_record ON vital_sign_records (record_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_appointment ON vital_sign_records (appointment_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded_at ON vital_sign_records (recorded_at);

COMMENT ON TABLE vital_sign_records IS 'Vital signs measurements per clinical standards';
COMMENT ON COLUMN vital_sign_records.abnormal_flags IS 'JSON: ["BP_ABNORMAL", "HR_ABNORMAL", "SPO2_LOW", "TEMP_ABNORMAL"]';

-- ─── ICD Codes Reference ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS icd_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    system icd_code_system NOT NULL,
    description TEXT NOT NULL,
    description_ar TEXT,
    category VARCHAR(200),
    sub_category VARCHAR(200),
    is_active BOOLEAN DEFAULT true NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_icd_code_system UNIQUE (code, system)
);

CREATE INDEX IF NOT EXISTS idx_icd_codes_code ON icd_codes (code);
CREATE INDEX IF NOT EXISTS idx_icd_codes_system ON icd_codes (system);

COMMENT ON TABLE icd_codes IS 'ICD code reference - ICD-10, ICD-9, ICPC-2, SNOMED CT';

-- ─── Sample ICD-10 Codes ───────────────────────────────────────────────
INSERT INTO icd_codes (code, system, description, description_ar, category) VALUES
    ('J06.9', 'ICD10', 'Acute upper respiratory infection, unspecified', 'التهاب حاد في الجهاز التنفسي العلوي غير محدد', 'Respiratory'),
    ('I10', 'ICD10', 'Essential (primary) hypertension', 'ارتفاع ضغط الدم الأساسي', 'Circulatory'),
    ('E11.9', 'ICD10', 'Type 2 diabetes mellitus without complications', 'داء السكري من النوع 2 بدون مضاعفات', 'Endocrine'),
    ('K21.0', 'ICD10', 'Gastro-esophageal reflux disease with esophagitis', 'مرض الارتجاع المعدي المريئي مع التهاب المريء', 'Digestive'),
    ('M54.5', 'ICD10', 'Low back pain', 'ألم أسفل الظهر', 'Musculoskeletal'),
    ('F32.9', 'ICD10', 'Major depressive disorder, single episode, unspecified', 'اضطراب الاكتئاب الرئيسي، نوبة واحدة', 'Mental'),
    ('J45.909', 'ICD10', 'Unspecified asthma, uncomplicated', 'ربو غير محدد بدون مضاعفات', 'Respiratory'),
    ('N39.0', 'ICD10', 'Urinary tract infection, site not specified', 'التهاب المسالك البولية', 'Genitourinary'),
    ('R51', 'ICD10', 'Headache', 'صداع', 'Symptoms'),
    ('R10.9', 'ICD10', 'Unspecified abdominal pain', 'ألم بطني غير محدد', 'Symptoms');
