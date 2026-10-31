-- ================================================================
-- Voucher System Migration
-- Implements standard international methodology with management
-- accounting principles for payment and receipt vouchers
-- ================================================================

-- Enums
CREATE TYPE voucher_type AS ENUM ('payment', 'receipt', 'journal', 'adjustment');
CREATE TYPE voucher_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'posted', 'cancelled');
CREATE TYPE voucher_approval_level AS ENUM ('none', 'level1', 'level2', 'level3', 'final');

-- Vouchers table
CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenantId INTEGER NOT NULL,
    
    -- Voucher Identification
    voucherNumber VARCHAR(50) NOT NULL,
    voucherPrefix VARCHAR(10) DEFAULT 'VCH' NOT NULL,
    voucherType voucher_type NOT NULL,
    status voucher_status DEFAULT 'draft' NOT NULL,
    
    -- Dates
    voucherDate DATE NOT NULL,
    dueDate DATE,
    postingDate TIMESTAMP,
    
    -- Amounts (Multi-currency)
    amount DECIMAL(18, 4) NOT NULL,
    baseAmount DECIMAL(18, 4) DEFAULT 0 NOT NULL,
    currencyId INTEGER REFERENCES currencies(id),
    exchangeRate DECIMAL(18, 8) DEFAULT 1 NOT NULL,
    
    -- Counterparty
    counterpartyType VARCHAR(20),
    counterpartyId INTEGER,
    counterpartyName VARCHAR(255),
    
    -- Bank/Cash Account
    bankAccountId INTEGER REFERENCES accounts(id),
    bankAccountCode VARCHAR(20),
    
    -- Reference Documents
    referenceNo VARCHAR(100),
    referenceType VARCHAR(50),
    referenceId INTEGER,
    linkedVoucherId INTEGER,
    
    -- Management Accounting Fields
    departmentId INTEGER REFERENCES departments(id),
    projectId INTEGER REFERENCES projects(id),
    costCenterId INTEGER REFERENCES costCenters(id),
    businessUnit VARCHAR(100),
    
    -- Budget Validation
    budgetId INTEGER REFERENCES budgets(id),
    budgetLineId INTEGER REFERENCES budgetLines(id),
    budgetValidated BOOLEAN DEFAULT false,
    budgetVariance DECIMAL(18, 4) DEFAULT 0,
    
    -- Approval Workflow
    approvalLevel voucher_approval_level DEFAULT 'none',
    approvedById INTEGER REFERENCES users(id),
    approvedAt TIMESTAMP,
    rejectedById INTEGER REFERENCES users(id),
    rejectedAt TIMESTAMP,
    rejectionReason TEXT,
    
    -- Approval thresholds
    requiresLevel1Approval BOOLEAN DEFAULT false,
    requiresLevel2Approval BOOLEAN DEFAULT false,
    requiresLevel3Approval BOOLEAN DEFAULT false,
    
    -- Posting
    postedById INTEGER REFERENCES users(id),
    journalEntryId INTEGER REFERENCES journalEntries(id),
    reversalOfId INTEGER,
    
    -- Description
    description TEXT,
    notes TEXT,
    internalMemo TEXT,
    attachmentsCount INTEGER DEFAULT 0,
    
    -- Branch
    branchId INTEGER REFERENCES branches(id),
    
    -- Audit
    createdById INTEGER REFERENCES users(id),
    updatedById INTEGER REFERENCES users(id),
    createdAt TIMESTAMP DEFAULT NOW() NOT NULL,
    updatedAt TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Sync
    serverVersion INTEGER DEFAULT 1 NOT NULL,
    lastSyncAt TIMESTAMP,
    conflictState VARCHAR(20) DEFAULT 'none',
    aggregateId UUID
);

-- Voucher Lines
CREATE TABLE voucher_lines (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenantId INTEGER NOT NULL,
    voucherId INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    
    -- Account
    accountId INTEGER NOT NULL REFERENCES accounts(id),
    accountCode VARCHAR(20) NOT NULL,
    accountName VARCHAR(255),
    
    -- Amount
    debitAmount DECIMAL(18, 4) DEFAULT 0 NOT NULL,
    creditAmount DECIMAL(18, 4) DEFAULT 0 NOT NULL,
    
    -- Cost Center Allocation
    costCenterId INTEGER REFERENCES costCenters(id),
    departmentId INTEGER REFERENCES departments(id),
    projectId INTEGER REFERENCES projects(id),
    
    -- Allocation
    allocationPercentage DECIMAL(5, 2) DEFAULT 100,
    allocatedAmount DECIMAL(18, 4) DEFAULT 0,
    
    -- Description
    description VARCHAR(500),
    reference VARCHAR(100),
    lineOrder INTEGER DEFAULT 0,
    createdAt TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Voucher Approvals (Audit Trail)
CREATE TABLE voucher_approvals (
    id SERIAL PRIMARY KEY,
    "GlobalId" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenantId INTEGER NOT NULL,
    voucherId INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    
    approvalLevel voucher_approval_level NOT NULL,
    action VARCHAR(20) NOT NULL,
    approverId INTEGER REFERENCES users(id),
    approverName VARCHAR(255),
    
    comments TEXT,
    previousStatus voucher_status,
    newStatus voucher_status NOT NULL,
    
    ipAddress VARCHAR(45),
    userAgent TEXT,
    
    createdAt TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Voucher Sequences
CREATE TABLE voucher_sequences (
    id SERIAL PRIMARY KEY,
    tenantId INTEGER NOT NULL,
    voucherType voucher_type NOT NULL,
    prefix VARCHAR(10) NOT NULL,
    currentNumber INTEGER DEFAULT 0 NOT NULL,
    format VARCHAR(50) DEFAULT '{PREFIX}/{YYYY}/{NNNNNN}' NOT NULL,
    resetPeriod VARCHAR(20) DEFAULT 'yearly',
    lastResetDate DATE,
    numberPadding INTEGER DEFAULT 6,
    isActive BOOLEAN DEFAULT true,
    createdAt TIMESTAMP DEFAULT NOW() NOT NULL,
    updatedAt TIMESTAMP DEFAULT NOW() NOT NULL,
    
    UNIQUE(tenantId, voucherType)
);

-- Indexes for performance
CREATE INDEX idx_vouchers_tenant ON vouchers(tenantId);
CREATE INDEX idx_vouchers_number ON vouchers(tenantId, voucherNumber);
CREATE INDEX idx_vouchers_type ON vouchers(tenantId, voucherType);
CREATE INDEX idx_vouchers_status ON vouchers(tenantId, status);
CREATE INDEX idx_vouchers_date ON vouchers(voucherDate);
CREATE INDEX idx_vouchers_counterparty ON vouchers(counterpartyType, counterpartyId);
CREATE INDEX idx_vouchers_cost_center ON vouchers(costCenterId);
CREATE INDEX idx_vouchers_department ON vouchers(departmentId);
CREATE INDEX idx_vouchers_project ON vouchers(projectId);
CREATE INDEX idx_vouchers_journal ON vouchers(journalEntryId);
CREATE UNIQUE INDEX vouchers_gc_tenant_unique ON vouchers(tenantId, "GlobalId");

CREATE INDEX idx_voucher_lines_voucher ON voucher_lines(voucherId);
CREATE INDEX idx_voucher_lines_account ON voucher_lines(accountId);
CREATE INDEX idx_voucher_lines_cost_center ON voucher_lines(costCenterId);

CREATE INDEX idx_voucher_approvals_voucher ON voucher_approvals(voucherId);
CREATE INDEX idx_voucher_approvals_approver ON voucher_approvals(approverId);
CREATE INDEX idx_voucher_approvals_level ON voucher_approvals(approvalLevel);

CREATE INDEX idx_voucher_sequences_tenant ON voucher_sequences(tenantId);

-- Constraints
ALTER TABLE vouchers ADD CONSTRAINT chk_voucher_amount_positive CHECK (amount > 0);
ALTER TABLE vouchers ADD CONSTRAINT chk_voucher_base_amount_positive CHECK (baseAmount >= 0);
ALTER TABLE vouchers ADD CONSTRAINT chk_voucher_exchange_rate_positive CHECK (exchangeRate > 0);

ALTER TABLE voucher_lines ADD CONSTRAINT chk_voucher_line_amounts CHECK (
    (debitAmount > 0 AND creditAmount = 0) OR 
    (debitAmount = 0 AND creditAmount > 0) OR 
    (debitAmount = 0 AND creditAmount = 0)
);
ALTER TABLE voucher_lines ADD CONSTRAINT chk_voucher_line_allocation CHECK (allocationPercentage >= 0 AND allocationPercentage <= 100);

-- Insert default sequences for existing tenants
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN SELECT DISTINCT id as tenant_id FROM tenants LOOP
        -- Payment vouchers sequence
        INSERT INTO voucher_sequences (tenantId, voucherType, prefix, format)
        VALUES (t.tenant_id, 'payment', 'PAY', '{PREFIX}/{YYYY}/{NNNNNN}')
        ON CONFLICT (tenantId, voucherType) DO NOTHING;
        
        -- Receipt vouchers sequence
        INSERT INTO voucher_sequences (tenantId, voucherType, prefix, format)
        VALUES (t.tenant_id, 'receipt', 'REC', '{PREFIX}/{YYYY}/{NNNNNN}')
        ON CONFLICT (tenantId, voucherType) DO NOTHING;
        
        -- Journal vouchers sequence
        INSERT INTO voucher_sequences (tenantId, voucherType, prefix, format)
        VALUES (t.tenant_id, 'journal', 'JNL', '{PREFIX}/{YYYY}/{NNNNNN}')
        ON CONFLICT (tenantId, voucherType) DO NOTHING;
    END LOOP;
END $$;
