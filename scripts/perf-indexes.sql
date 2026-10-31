-- Performance indexes for tenant-scoped ledger queries (reports, balances,
-- trial balance). Idempotent: safe to re-run.
-- Rule in this DB: table names are snake_case, column names are camelCase.

CREATE INDEX IF NOT EXISTS idx_transactions_tenant_account
  ON transactions ("tenantId", "accountId");
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_date
  ON transactions ("tenantId", "transactionDate");
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_je
  ON transactions ("tenantId", "journalEntryId");
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_branch
  ON transactions ("tenantId", "branchId");

CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_posted
  ON journal_entries ("tenantId", "postedAt");
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_source
  ON journal_entries ("tenantId", "sourceModule");
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_branch
  ON journal_entries ("tenantId", "branchId");
