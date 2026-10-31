-- Nuclear Performance Indexes v2 - REGENERATED against the live schema.
-- Every statement validated via information_schema; broken ones rewritten to
-- real columns where valuable, otherwise dropped.

CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_salesrep" ON "sales_invoices" USING btree ("tenantId", "salesRepId");

CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_status_date" ON "sales_invoices" USING btree ("tenantId", "status", "invoiceDate");

CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_customer_date" ON "sales_invoices" USING btree ("tenantId", "customerId", "invoiceDate");

CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_currency" ON "sales_invoices" USING btree ("tenantId", "currencyId");

-- ============================================================
-- SALES INVOICE ITEMS - Line-level queries
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_sales_invoice_items_invoice" ON "sales_invoice_items" USING btree ("invoiceId");

CREATE INDEX IF NOT EXISTS "idx_sales_invoice_items_product" ON "sales_invoice_items" USING btree ("productId");

CREATE INDEX IF NOT EXISTS "idx_purchase_invoices_tenant_supplier_date" ON "purchase_invoices" USING btree ("tenantId", "supplierId", "invoiceDate");

CREATE INDEX IF NOT EXISTS "idx_purchase_invoices_tenant_status_date" ON "purchase_invoices" USING btree ("tenantId", "status", "invoiceDate");

CREATE INDEX IF NOT EXISTS "idx_purchase_invoices_tenant_currency" ON "purchase_invoices" USING btree ("tenantId", "currencyId");

-- ============================================================
-- MESSAGES - Module F (Real-time messaging)
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_messages_tenant_sender_receiver" ON "messages" USING btree ("tenantId", "fromUserId", "toUserId");

CREATE INDEX IF NOT EXISTS "idx_messages_tenant_receiver_read" ON "messages" USING btree ("tenantId", "toUserId", "isRead");

CREATE INDEX IF NOT EXISTS "idx_messages_tenant_created" ON "messages" USING btree ("tenantId", "createdAt" DESC);

-- ============================================================
-- CUSTOM FIELDS - Module D (EAV pattern)
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_custom_field_values_entity" ON "custom_field_values" USING btree ("tenantId", "entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "idx_custom_field_values_def" ON "custom_field_values" USING btree ("tenantId", "field_key");

CREATE INDEX IF NOT EXISTS "idx_custom_field_defs_tenant_entity" ON "custom_field_defs" USING btree ("tenantId", "entity_type");

CREATE INDEX IF NOT EXISTS "idx_biometric_templates_tenant_employee" ON "biometric_templates" USING btree ("tenantId", "userId");

CREATE INDEX IF NOT EXISTS "idx_biometric_templates_tenant_type" ON "biometric_templates" USING btree ("tenantId", "type");

CREATE INDEX IF NOT EXISTS "idx_offers_tenant_active" ON "offers" USING btree ("tenantId", "isActive");

CREATE INDEX IF NOT EXISTS "idx_offers_tenant_category" ON "offers" USING btree ("tenantId", "categoryId");

CREATE INDEX IF NOT EXISTS "idx_offers_tenant_dates" ON "offers" USING btree ("tenantId", "startDate", "endDate") WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS "idx_sales_reps_tenant_active" ON "sales_reps" USING btree ("tenantId", "isActive");

CREATE INDEX IF NOT EXISTS "idx_sales_reps_tenant_name" ON "sales_reps" USING btree ("tenantId", "name");
-- NOTE: sales_reps has no "userId" column in the live schema — the previous
-- (tenantId, userId) index here failed with 42703 and blocked this migration
-- from being marked applied on every deploy.

-- ============================================================
-- TRANSACTIONS - Core accounting (already has some, adding more)
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_account_date" ON "transactions" USING btree ("tenantId", "accountId", "transactionDate");

CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_journal" ON "transactions" USING btree ("tenantId", "journalEntryId");

CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_reversed" ON "transactions" USING btree ("tenantId", "isReversed");

CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_currency" ON "transactions" USING btree ("tenantId", "currencyId");

-- ============================================================
-- JOURNAL ENTRIES - Core accounting
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_journal_entries_tenant_date" ON "journal_entries" USING btree ("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_journal_entries_tenant_status" ON "journal_entries" USING btree ("tenantId", "status");

CREATE INDEX IF NOT EXISTS "idx_journal_entries_tenant_posted" ON "journal_entries" USING btree ("tenantId", "postedAt");

-- ============================================================
-- INVENTORY MOVEMENTS - Stock tracking
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_inventory_movements_tenant_product_date" ON "inventory_movements" USING btree ("tenantId", "productId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_inventory_movements_tenant_warehouse" ON "inventory_movements" USING btree ("tenantId", "warehouseId");

CREATE INDEX IF NOT EXISTS "idx_inventory_movements_tenant_type" ON "inventory_movements" USING btree ("tenantId", "type");

CREATE INDEX IF NOT EXISTS "idx_products_tenant_category" ON "products" USING btree ("tenantId", "categoryId");

CREATE INDEX IF NOT EXISTS "idx_products_tenant_active" ON "products" USING btree ("tenantId", "isActive");

CREATE INDEX IF NOT EXISTS "idx_products_tenant_code" ON "products" USING btree ("tenantId", "code");

-- ============================================================
-- CUSTOMERS / SUPPLIERS - CRM queries
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_customers_tenant_active" ON "customers" USING btree ("tenantId", "isActive");

CREATE INDEX IF NOT EXISTS "idx_customers_tenant_code" ON "customers" USING btree ("tenantId", "code");

CREATE INDEX IF NOT EXISTS "idx_suppliers_tenant_active" ON "suppliers" USING btree ("tenantId", "isActive");

CREATE INDEX IF NOT EXISTS "idx_suppliers_tenant_code" ON "suppliers" USING btree ("tenantId", "code");

-- ============================================================
-- PAYMENTS - Cash flow
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_payments_tenant_date" ON "payments" USING btree ("tenantId", "paymentDate");

CREATE INDEX IF NOT EXISTS "idx_payments_tenant_source_date" ON "payments" USING btree ("tenantId", "source", "paymentDate");

CREATE INDEX IF NOT EXISTS "idx_payments_tenant_method" ON "payments" USING btree ("tenantId", "paymentMethod");

-- ============================================================
-- PAYROLL - HR module
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_payroll_runs_tenant_period" ON "payroll_runs" USING btree ("tenantId", "fromDate", "toDate");

CREATE INDEX IF NOT EXISTS "idx_payroll_items_tenant_employee" ON "payroll_items" USING btree ("tenantId", "employeeId");

CREATE INDEX IF NOT EXISTS "idx_attendance_tenant_employee_date" ON "attendance" USING btree ("tenantId", "employeeId", "date");

-- ============================================================
-- PROJECTS / TASKS - Project management
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_projects_tenant_status" ON "projects" USING btree ("tenantId", "status");

CREATE INDEX IF NOT EXISTS "idx_project_tasks_tenant_project" ON "project_tasks" USING btree ("tenantId", "projectId");

CREATE INDEX IF NOT EXISTS "idx_project_tasks_tenant_assignee" ON "project_tasks" USING btree ("tenantId", "assigneeId");

CREATE INDEX IF NOT EXISTS "idx_project_tasks_tenant_status" ON "project_tasks" USING btree ("tenantId", "status");

-- ============================================================
-- PROCUREMENT - Procurement module
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_procurements_tenant_status" ON "procurements" USING btree ("tenantId", "status");

CREATE INDEX IF NOT EXISTS "idx_procurements_tenant_supplier" ON "procurements" USING btree ("tenantId", "supplierId");

CREATE INDEX IF NOT EXISTS "idx_procurement_approvals_tenant_procurement" ON "procurement_approvals" USING btree ("tenantId", "procurementId");

-- ============================================================
-- TICKETS - Support module
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_tickets_tenant_status" ON "tickets" USING btree ("tenantId", "status");

CREATE INDEX IF NOT EXISTS "idx_tickets_tenant_assignee" ON "tickets" USING btree ("tenantId", "assignedToId");

CREATE INDEX IF NOT EXISTS "idx_fiscal_periods_tenant_status" ON "fiscal_periods" USING btree ("tenantId", "status");

CREATE INDEX IF NOT EXISTS "idx_fiscal_periods_tenant_dates" ON "fiscal_periods" USING btree ("tenantId", "startDate", "endDate");

-- ============================================================
-- BUDGETS / BUDGET SCENARIOS - Module K
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_budgets_tenant_period" ON "budgets" USING btree ("tenantId", "periodName");

CREATE INDEX IF NOT EXISTS "idx_scheduled_journal_entries_tenant_next" ON "scheduled_journal_entries" USING btree ("tenantId", "nextRunAt");

CREATE INDEX IF NOT EXISTS "idx_scheduled_journal_entries_tenant_active" ON "scheduled_journal_entries" USING btree ("tenantId", "isActive");

-- ============================================================
-- SYNC METADATA - Offline-first sync
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_sync_metadata_tenant_entity" ON "sync_metadata" USING btree ("tenantId", "entityType", "entityId");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_entity_date" ON "audit_logs" USING btree ("tenantId", "entityType", "entityId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_activity_logs_tenant_user_date" ON "activity_logs" USING btree ("tenantId", "userId", "createdAt");

-- ============================================================
-- FILE UPLOADS - Document management
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_file_uploads_tenant_entity" ON "file_uploads" USING btree ("tenantId", "entityType", "entityId");

CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_user_read" ON "notifications" USING btree ("tenantId", "userId", "readAt");

CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_created" ON "notifications" USING btree ("tenantId", "createdAt" DESC);

-- ============================================================
-- POS SESSIONS / ORDERS - Point of Sale
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_pos_sessions_tenant_user" ON "pos_sessions" USING btree ("tenantId", "openedById");

CREATE INDEX IF NOT EXISTS "idx_pos_sessions_tenant_status" ON "pos_sessions" USING btree ("tenantId", "status");

CREATE INDEX IF NOT EXISTS "idx_pos_orders_tenant_session" ON "pos_orders" USING btree ("tenantId", "sessionId");

CREATE INDEX IF NOT EXISTS "idx_pos_orders_tenant_date" ON "pos_orders" USING btree ("tenantId", "createdAt");

-- ============================================================
-- OPENING BALANCES - Period initialization
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_opening_balances_tenant_period" ON "opening_balances" USING btree ("tenantId", "periodName");

CREATE INDEX IF NOT EXISTS "idx_opening_balances_tenant_account" ON "opening_balances" USING btree ("tenantId", "accountId");

-- ============================================================
-- EXCHANGE RATES - Multi-currency
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_settings_tenant" ON "settings" USING btree ("tenantId");

-- ============================================================
-- USERS / RBAC - Authentication & Authorization
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_users_tenant_email" ON "users" USING btree ("tenantId", "email");

CREATE INDEX IF NOT EXISTS "idx_user_roles_tenant_user" ON "user_roles" USING btree ("tenantId", "userId");

CREATE INDEX IF NOT EXISTS "idx_user_roles_tenant_role" ON "user_roles" USING btree ("tenantId", "roleId");

CREATE INDEX IF NOT EXISTS "idx_user_branch_permissions_tenant_user" ON "user_branch_permissions" USING btree ("tenantId", "userId");

-- ============================================================
-- DEVICES - Biometric/Attendance devices
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_devices_tenant_active" ON "devices" USING btree ("tenantId", "isActive");

CREATE INDEX IF NOT EXISTS "idx_devices_tenant_worksite" ON "devices" USING btree ("tenantId", "workSiteId");

-- ============================================================
-- WORK SITES - Multi-location
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_work_sites_tenant" ON "work_sites" USING btree ("tenantId");

-- ============================================================
-- BRANCHES - Multi-branch
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_branches_tenant" ON "branches" USING btree ("tenantId");

-- ============================================================
-- TENANT SUBSCRIPTIONS - SaaS billing
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_tenant_subscriptions_tenant" ON "tenant_subscriptions" USING btree ("tenantId");

CREATE INDEX IF NOT EXISTS "idx_tenant_subscriptions_status" ON "tenant_subscriptions" USING btree ("status");

-- ============================================================
-- BILLING INVOICES - SaaS billing
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_billing_invoices_tenant_status" ON "billing_invoices" USING btree ("tenantId", "status");

-- ============================================================
-- PAYMENT HISTORY - SaaS billing
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_webhooks_tenant" ON "webhooks" USING btree ("tenantId");

CREATE INDEX IF NOT EXISTS "idx_api_keys_tenant" ON "api_keys" USING btree ("tenantId");

-- ============================================================
-- TEAM INVITATIONS - Onboarding
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_team_invitations_tenant" ON "team_invitations" USING btree ("tenantId");

CREATE INDEX IF NOT EXISTS "idx_team_invitations_tenant_email" ON "team_invitations" USING btree ("tenantId", "email");

-- ============================================================
-- FEATURE FLAGS - Feature toggles
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_feature_flags_tenant" ON "feature_flags" USING btree ("tenantId");

-- ============================================================
-- TRANSLATIONS - i18n
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_product_units_tenant_product" ON "product_units" USING btree ("tenantId", "productId");

-- ============================================================
-- CATEGORIES - Product categorization
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_categories_tenant_parent" ON "categories" USING btree ("tenantId", "parentId");

-- ============================================================
-- UNITS - Unit of measure
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_units_tenant" ON "units" USING btree ("tenantId");

-- ============================================================
-- WAREHOUSE TRANSFERS - Inter-warehouse
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_warehouse_transfers_tenant_from_to" ON "warehouse_transfers" USING btree ("tenantId", "fromWarehouseId", "toWarehouseId");

CREATE INDEX IF NOT EXISTS "idx_stock_adjustments_tenant_warehouse" ON "stock_adjustments" USING btree ("tenantId", "warehouseId");

CREATE INDEX IF NOT EXISTS "idx_stock_adjustments_tenant_product" ON "stock_adjustments" USING btree ("tenantId", "productId");

-- ============================================================
-- INVENTORY BATCHES - Batch tracking
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_documents_tenant_entity" ON "documents" USING btree ("tenantId", "entityType", "entityId");

-- ============================================================
-- REPORT DEFINITIONS / EXECUTIONS - Reporting engine
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_quality_inspections_tenant_result" ON "quality_inspections" USING btree ("tenantId", "result");

-- ============================================================
-- ORDERS / ORDER ITEMS - Sales orders
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_orders_tenant_customer" ON "orders" USING btree ("tenantId", "customerId");

CREATE INDEX IF NOT EXISTS "idx_orders_tenant_status" ON "orders" USING btree ("tenantId", "status");

CREATE INDEX IF NOT EXISTS "idx_accounts_tenant_parent" ON "accounts" USING btree ("tenantId", "parentAccountId");

CREATE INDEX IF NOT EXISTS "idx_accounts_tenant_type" ON "accounts" USING btree ("tenantId", "type");

CREATE INDEX IF NOT EXISTS "idx_accounts_tenant_code" ON "accounts" USING btree ("tenantId", "code");

-- ============================================================
-- DEPARTMENTS / EMPLOYEES - HR
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_employees_tenant_department" ON "employees" USING btree ("tenantId", "departmentId");

CREATE INDEX IF NOT EXISTS "idx_employees_tenant_status" ON "employees" USING btree ("tenantId", "status");

CREATE INDEX IF NOT EXISTS "idx_employees_tenant_user" ON "employees" USING btree ("tenantId", "userId");

-- ============================================================
-- LOGIN ATTEMPTS - Security audit
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_login_attempts_tenant_user" ON "login_attempts" USING btree ("tenantId", "userId");

CREATE INDEX IF NOT EXISTS "idx_login_attempts_tenant_created" ON "login_attempts" USING btree ("tenantId", "createdAt" DESC);

-- ============================================================
-- PERMISSIONS - RBAC
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_roles_tenant" ON "roles" USING btree ("tenantId");

-- ============================================================
-- COMPOSITE COVERING INDEXES for common query patterns
-- ============================================================

-- Sales invoice list with customer + rep + offer (Reporting)

CREATE INDEX IF NOT EXISTS "idx_transactions_trial_balance_covering" ON "transactions" USING btree ("tenantId", "accountId", "transactionDate") INCLUDE ("type", "amount", "isReversed", "currencyId", "exchangeRate", "baseAmount");

-- Inventory stock levels (Real-time)

CREATE INDEX IF NOT EXISTS "idx_sales_reps_tenant_active_partial" ON "sales_reps" USING btree ("tenantId") WHERE "isActive" = true;

-- Active offers only

CREATE INDEX IF NOT EXISTS "idx_fiscal_periods_tenant_open_partial" ON "fiscal_periods" USING btree ("tenantId", "startDate", "endDate") WHERE "status" = 'open';

-- Unread notifications only

CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_unread_partial" ON "notifications" USING btree ("tenantId", "userId", "createdAt" DESC) WHERE "readAt" IS NULL;

-- Unread messages only

CREATE INDEX IF NOT EXISTS "idx_messages_tenant_unread_partial" ON "messages" USING btree ("tenantId", "toUserId", "createdAt" DESC) WHERE "isRead" = false;

CREATE INDEX IF NOT EXISTS "idx_projects_tenant_active_partial" ON "projects" USING btree ("tenantId", "startDate", "endDate") WHERE "status" = 'active';

-- Active recurring expenses only

CREATE INDEX IF NOT EXISTS "idx_scheduled_journal_entries_due_partial" ON "scheduled_journal_entries" USING btree ("tenantId", "nextRunAt") WHERE "isActive" = true AND "nextRunAt" IS NOT NULL;

-- Pending procurements only

CREATE INDEX IF NOT EXISTS "idx_procurements_tenant_pending_partial" ON "procurements" USING btree ("tenantId", "createdAt") WHERE "status" = 'pending';

-- Open tickets only

CREATE INDEX IF NOT EXISTS "idx_tickets_tenant_open_partial" ON "tickets" USING btree ("tenantId", "createdAt" DESC) WHERE "status" IN ('open', 'in_progress');

-- Active POS sessions only

CREATE INDEX IF NOT EXISTS "idx_pos_sessions_tenant_active_partial" ON "pos_sessions" USING btree ("tenantId", "openedById", "openedAt") WHERE "status" = 'open';

ANALYZE;
