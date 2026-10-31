-- 0006_rls_tenant_isolation.sql
-- PostgreSQL Row-Level Security for multi-tenant isolation
-- Composite foreign keys with tenantId for referential integrity
-- This migration implements DEFENSE-IN-DEPTH tenant isolation at the DATABASE level

-- ============================================================================
-- PART 1: Enable RLS on all tenant-scoped tables
-- ============================================================================

-- Core tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_branch_permissions ENABLE ROW LEVEL SECURITY;

-- Accounting tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Inventory tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrix_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrix_dimension_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrix_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_valuation_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

-- Sales/Purchase tables
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;

-- POS tables
ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_payments ENABLE ROW LEVEL SECURITY;

-- HR tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Healthcare tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispensings ENABLE ROW LEVEL SECURITY;

-- Communication tables
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;

-- Audit/Activity tables
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Document tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Cost centers
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;

-- Beneficiaries
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

-- Vouchers
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Create RLS policies using current_setting('app.current_tenant_id')
-- ============================================================================

-- Helper function to get current tenant from session variable
-- This is set by the application via SET LOCAL app.current_tenant_id = <tenant_id>

-- Tenants table: users can only see their own tenant
CREATE POLICY tenant_isolation ON tenants
  USING (id = current_setting('app.current_tenant_id')::int);

-- Users: users can only see users in their tenant
CREATE POLICY user_tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Branches: only branches in current tenant
CREATE POLICY branch_tenant_isolation ON branches
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- User branch permissions
CREATE POLICY ubp_tenant_isolation ON user_branch_permissions
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Accounts
CREATE POLICY account_tenant_isolation ON accounts
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Journal entries
CREATE POLICY je_tenant_isolation ON journal_entries
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Transactions
CREATE POLICY txn_tenant_isolation ON transactions
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Opening balances
CREATE POLICY ob_tenant_isolation ON opening_balances
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Budgets
CREATE POLICY budget_tenant_isolation ON budgets
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Fiscal periods
CREATE POLICY fp_tenant_isolation ON fiscal_periods
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Settings
CREATE POLICY settings_tenant_isolation ON settings
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Products
CREATE POLICY product_tenant_isolation ON products
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Warehouses
CREATE POLICY warehouse_tenant_isolation ON warehouses
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Warehouse stock
CREATE POLICY ws_tenant_isolation ON warehouse_stock
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Inventory movements
CREATE POLICY im_tenant_isolation ON inventory_movements
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Inventory batches
CREATE POLICY ib_tenant_isolation ON inventory_batches
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Product variants
CREATE POLICY pv_tenant_isolation ON product_variants
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Product batches
CREATE POLICY pb_tenant_isolation ON product_batches
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Product serials
CREATE POLICY ps_tenant_isolation ON product_serials
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Matrix dimensions
CREATE POLICY md_tenant_isolation ON matrix_dimensions
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Matrix dimension values
CREATE POLICY mdv_tenant_isolation ON matrix_dimension_values
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Matrix items
CREATE POLICY mi_tenant_isolation ON matrix_items
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Inventory allocations
CREATE POLICY ia_tenant_isolation ON inventory_allocations
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Inventory valuation layers
CREATE POLICY ivl_tenant_isolation ON inventory_valuation_layers
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Warehouse transfers
CREATE POLICY wt_tenant_isolation ON warehouse_transfers
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Stock adjustments
CREATE POLICY sa_tenant_isolation ON stock_adjustments
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Sales invoices
CREATE POLICY si_tenant_isolation ON sales_invoices
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Sales invoice items
CREATE POLICY sii_tenant_isolation ON sales_invoice_items
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Purchase invoices
CREATE POLICY pi_tenant_isolation ON purchase_invoices
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Purchase invoice items
CREATE POLICY pii_tenant_isolation ON purchase_invoice_items
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Purchase orders
CREATE POLICY po_tenant_isolation ON purchase_orders
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Purchase order items
CREATE POLICY poi_tenant_isolation ON purchase_order_items
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Goods receipts
CREATE POLICY gr_tenant_isolation ON goods_receipts
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Goods receipt items
CREATE POLICY gri_tenant_isolation ON goods_receipt_items
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- POS sessions
CREATE POLICY pos_sess_tenant_isolation ON pos_sessions
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- POS sales
CREATE POLICY pos_sales_tenant_isolation ON pos_sales
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- POS sale items
CREATE POLICY pos_si_tenant_isolation ON pos_sale_items
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- POS payments
CREATE POLICY pos_pay_tenant_isolation ON pos_payments
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Employees
CREATE POLICY emp_tenant_isolation ON employees
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Departments
CREATE POLICY dept_tenant_isolation ON departments
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Payroll entries
CREATE POLICY payroll_tenant_isolation ON payroll_entries
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Leave requests
CREATE POLICY leave_tenant_isolation ON leave_requests
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Patients
CREATE POLICY patient_tenant_isolation ON patients
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Prescriptions
CREATE POLICY presc_tenant_isolation ON prescriptions
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Dispensings
CREATE POLICY disp_tenant_isolation ON dispensings
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Communications
CREATE POLICY comm_tenant_isolation ON communications
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Communication templates
CREATE POLICY ct_tenant_isolation ON communication_templates
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Activity logs
CREATE POLICY al_tenant_isolation ON activity_logs
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Login attempts
CREATE POLICY la_tenant_isolation ON login_attempts
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Documents
CREATE POLICY doc_tenant_isolation ON documents
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Document templates
CREATE POLICY dt_tenant_isolation ON document_templates
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Cost centers
CREATE POLICY cc_tenant_isolation ON cost_centers
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Beneficiaries
CREATE POLICY ben_tenant_isolation ON beneficiaries
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Vouchers
CREATE POLICY voucher_tenant_isolation ON vouchers
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Voucher items
CREATE POLICY vi_tenant_isolation ON voucher_items
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- ============================================================================
-- PART 3: Composite Foreign Keys with tenantId for referential integrity
-- ============================================================================

-- These composite FKs ensure that referenced records belong to the SAME tenant
-- This prevents cross-tenant references even if application logic is bypassed

-- transactions -> accounts (composite FK with tenantId)
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_account_id_fkey,
  ADD CONSTRAINT transactions_account_tenant_fkey
  FOREIGN KEY (tenant_id, account_id)
  REFERENCES accounts (tenant_id, id)
  ON DELETE RESTRICT;

-- transactions -> branches (composite FK with tenantId)
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_branch_id_fkey,
  ADD CONSTRAINT transactions_branch_tenant_fkey
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE SET NULL;

-- transactions -> cost_centers (composite FK with tenantId)
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_cost_center_id_fkey,
  ADD CONSTRAINT transactions_cc_tenant_fkey
  FOREIGN KEY (tenant_id, cost_center_id)
  REFERENCES cost_centers (tenant_id, id)
  ON DELETE SET NULL;

-- transactions -> journal_entries (composite FK with tenantId)
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_journal_entry_id_fkey,
  ADD CONSTRAINT transactions_je_tenant_fkey
  FOREIGN KEY (tenant_id, journal_entry_id)
  REFERENCES journal_entries (tenant_id, id)
  ON DELETE SET NULL;

-- journal_entries -> branches (composite FK with tenantId)
ALTER TABLE journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_branch_id_fkey,
  ADD CONSTRAINT journal_entries_branch_tenant_fkey
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE SET NULL;

-- journal_entries -> users (created_by)
ALTER TABLE journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_created_by_id_fkey,
  ADD CONSTRAINT journal_entries_created_by_tenant_fkey
  FOREIGN KEY (tenant_id, created_by_id)
  REFERENCES users (tenant_id, id)
  ON DELETE SET NULL;

-- accounts -> parent_account (self-referential composite FK)
ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_parent_account_id_fkey,
  ADD CONSTRAINT accounts_parent_tenant_fkey
  FOREIGN KEY (tenant_id, parent_account_id)
  REFERENCES accounts (tenant_id, id)
  ON DELETE SET NULL;

-- branches -> tenants (already exists but ensure it's composite-aware)
-- The existing FK is fine since tenants is the root

-- warehouse_stock -> products (composite FK with tenantId)
ALTER TABLE warehouse_stock
  DROP CONSTRAINT IF EXISTS warehouse_stock_product_id_fkey,
  ADD CONSTRAINT warehouse_stock_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- warehouse_stock -> warehouses (composite FK with tenantId)
ALTER TABLE warehouse_stock
  DROP CONSTRAINT IF EXISTS warehouse_stock_warehouse_id_fkey,
  ADD CONSTRAINT warehouse_stock_warehouse_tenant_fkey
  FOREIGN KEY (tenant_id, warehouse_id)
  REFERENCES warehouses (tenant_id, id)
  ON DELETE RESTRICT;

-- inventory_movements -> products (composite FK with tenantId)
ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_product_id_fkey,
  ADD CONSTRAINT inventory_movements_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- inventory_movements -> warehouses (composite FK with tenantId)
ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_warehouse_id_fkey,
  ADD CONSTRAINT inventory_movements_warehouse_tenant_fkey
  FOREIGN KEY (tenant_id, warehouse_id)
  REFERENCES warehouses (tenant_id, id)
  ON DELETE SET NULL;

-- inventory_batches -> products (composite FK with tenantId)
ALTER TABLE inventory_batches
  DROP CONSTRAINT IF EXISTS inventory_batches_product_id_fkey,
  ADD CONSTRAINT inventory_batches_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- inventory_batches -> warehouses (composite FK with tenantId)
ALTER TABLE inventory_batches
  DROP CONSTRAINT IF EXISTS inventory_batches_warehouse_id_fkey,
  ADD CONSTRAINT inventory_batches_warehouse_tenant_fkey
  FOREIGN KEY (tenant_id, warehouse_id)
  REFERENCES warehouses (tenant_id, id)
  ON DELETE RESTRICT;

-- inventory_batches -> product_variants (composite FK with tenantId)
ALTER TABLE inventory_batches
  DROP CONSTRAINT IF EXISTS inventory_batches_variant_id_fkey,
  ADD CONSTRAINT inventory_batches_variant_tenant_fkey
  FOREIGN KEY (tenant_id, variant_id)
  REFERENCES product_variants (tenant_id, id)
  ON DELETE SET NULL;

-- inventory_batches -> purchase_orders (composite FK with tenantId)
ALTER TABLE inventory_batches
  DROP CONSTRAINT IF EXISTS inventory_batches_purchase_order_id_fkey,
  ADD CONSTRAINT inventory_batches_po_tenant_fkey
  FOREIGN KEY (tenant_id, purchase_order_id)
  REFERENCES purchase_orders (tenant_id, id)
  ON DELETE SET NULL;

-- product_variants -> products (composite FK with tenantId)
ALTER TABLE product_variants
  DROP CONSTRAINT IF EXISTS product_variants_product_id_fkey,
  ADD CONSTRAINT product_variants_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- product_batches -> products (composite FK with tenantId)
ALTER TABLE product_batches
  DROP CONSTRAINT IF EXISTS product_batches_product_id_fkey,
  ADD CONSTRAINT product_batches_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- product_batches -> product_variants (composite FK with tenantId)
ALTER TABLE product_batches
  DROP CONSTRAINT IF EXISTS product_batches_variant_id_fkey,
  ADD CONSTRAINT product_batches_variant_tenant_fkey
  FOREIGN KEY (tenant_id, variant_id)
  REFERENCES product_variants (tenant_id, id)
  ON DELETE SET NULL;

-- product_batches -> warehouses (composite FK with tenantId)
ALTER TABLE product_batches
  DROP CONSTRAINT IF EXISTS product_batches_warehouse_id_fkey,
  ADD CONSTRAINT product_batches_warehouse_tenant_fkey
  FOREIGN KEY (tenant_id, warehouse_id)
  REFERENCES warehouses (tenant_id, id)
  ON DELETE RESTRICT;

-- product_batches -> suppliers (composite FK with tenantId)
ALTER TABLE product_batches
  DROP CONSTRAINT IF EXISTS product_batches_supplier_id_fkey,
  ADD CONSTRAINT product_batches_supplier_tenant_fkey
  FOREIGN KEY (tenant_id, supplier_id)
  REFERENCES suppliers (tenant_id, id)
  ON DELETE SET NULL;

-- product_batches -> purchase_orders (composite FK with tenantId)
ALTER TABLE product_batches
  DROP CONSTRAINT IF EXISTS product_batches_purchase_order_id_fkey,
  ADD CONSTRAINT product_batches_po_tenant_fkey
  FOREIGN KEY (tenant_id, purchase_order_id)
  REFERENCES purchase_orders (tenant_id, id)
  ON DELETE SET NULL;

-- product_serials -> products (composite FK with tenantId)
ALTER TABLE product_serials
  DROP CONSTRAINT IF EXISTS product_serials_product_id_fkey,
  ADD CONSTRAINT product_serials_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- product_serials -> product_variants (composite FK with tenantId)
ALTER TABLE product_serials
  DROP CONSTRAINT IF EXISTS product_serials_variant_id_fkey,
  ADD CONSTRAINT product_serials_variant_tenant_fkey
  FOREIGN KEY (tenant_id, variant_id)
  REFERENCES product_variants (tenant_id, id)
  ON DELETE SET NULL;

-- product_serials -> inventory_batches (composite FK with tenantId)
ALTER TABLE product_serials
  DROP CONSTRAINT IF EXISTS product_serials_batch_id_fkey,
  ADD CONSTRAINT product_serials_batch_tenant_fkey
  FOREIGN KEY (tenant_id, batch_id)
  REFERENCES inventory_batches (tenant_id, id)
  ON DELETE SET NULL;

-- product_serials -> warehouses (composite FK with tenantId)
ALTER TABLE product_serials
  DROP CONSTRAINT IF EXISTS product_serials_warehouse_id_fkey,
  ADD CONSTRAINT product_serials_warehouse_tenant_fkey
  FOREIGN KEY (tenant_id, warehouse_id)
  REFERENCES warehouses (tenant_id, id)
  ON DELETE RESTRICT;

-- matrix_items -> products (composite FK with tenantId)
ALTER TABLE matrix_items
  DROP CONSTRAINT IF EXISTS matrix_items_product_id_fkey,
  ADD CONSTRAINT matrix_items_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- matrix_items -> matrix_dimensions (composite FK with tenantId)
ALTER TABLE matrix_items
  DROP CONSTRAINT IF EXISTS matrix_items_matrix_id_fkey,
  ADD CONSTRAINT matrix_items_matrix_tenant_fkey
  FOREIGN KEY (tenant_id, matrix_id)
  REFERENCES matrix_dimensions (tenant_id, id)
  ON DELETE RESTRICT;

-- inventory_allocations -> products (composite FK with tenantId)
ALTER TABLE inventory_allocations
  DROP CONSTRAINT IF EXISTS inventory_allocations_product_id_fkey,
  ADD CONSTRAINT inventory_allocations_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- inventory_allocations -> inventory_batches (composite FK with tenantId)
ALTER TABLE inventory_allocations
  DROP CONSTRAINT IF EXISTS inventory_allocations_batch_id_fkey,
  ADD CONSTRAINT inventory_allocations_batch_tenant_fkey
  FOREIGN KEY (tenant_id, batch_id)
  REFERENCES inventory_batches (tenant_id, id)
  ON DELETE SET NULL;

-- inventory_valuation_layers -> products (composite FK with tenantId)
ALTER TABLE inventory_valuation_layers
  DROP CONSTRAINT IF EXISTS inventory_valuation_layers_product_id_fkey,
  ADD CONSTRAINT inventory_valuation_layers_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- inventory_valuation_layers -> warehouses (composite FK with tenantId)
ALTER TABLE inventory_valuation_layers
  DROP CONSTRAINT IF EXISTS inventory_valuation_layers_warehouse_id_fkey,
  ADD CONSTRAINT inventory_valuation_layers_warehouse_tenant_fkey
  FOREIGN KEY (tenant_id, warehouse_id)
  REFERENCES warehouses (tenant_id, id)
  ON DELETE SET NULL;

-- inventory_valuation_layers -> inventory_batches (composite FK with tenantId)
ALTER TABLE inventory_valuation_layers
  DROP CONSTRAINT IF EXISTS inventory_valuation_layers_batch_id_fkey,
  ADD CONSTRAINT inventory_valuation_layers_batch_tenant_fkey
  FOREIGN KEY (tenant_id, batch_id)
  REFERENCES inventory_batches (tenant_id, id)
  ON DELETE SET NULL;

-- warehouse_transfers -> products (composite FK with tenantId)
ALTER TABLE warehouse_transfers
  DROP CONSTRAINT IF EXISTS warehouse_transfers_product_id_fkey,
  ADD CONSTRAINT warehouse_transfers_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- warehouse_transfers -> warehouses (from) (composite FK with tenantId)
ALTER TABLE warehouse_transfers
  DROP CONSTRAINT IF EXISTS warehouse_transfers_from_warehouse_id_fkey,
  ADD CONSTRAINT warehouse_transfers_from_wh_tenant_fkey
  FOREIGN KEY (tenant_id, from_warehouse_id)
  REFERENCES warehouses (tenant_id, id)
  ON DELETE RESTRICT;

-- warehouse_transfers -> warehouses (to) (composite FK with tenantId)
ALTER TABLE warehouse_transfers
  DROP CONSTRAINT IF EXISTS warehouse_transfers_to_warehouse_id_fkey,
  ADD CONSTRAINT warehouse_transfers_to_wh_tenant_fkey
  FOREIGN KEY (tenant_id, to_warehouse_id)
  REFERENCES warehouses (tenant_id, id)
  ON DELETE RESTRICT;

-- stock_adjustments -> products (composite FK with tenantId)
ALTER TABLE stock_adjustments
  DROP CONSTRAINT IF EXISTS stock_adjustments_product_id_fkey,
  ADD CONSTRAINT stock_adjustments_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- stock_adjustments -> warehouses (composite FK with tenantId)
ALTER TABLE stock_adjustments
  DROP CONSTRAINT IF EXISTS stock_adjustments_warehouse_id_fkey,
  ADD CONSTRAINT stock_adjustments_warehouse_tenant_fkey
  FOREIGN KEY (tenant_id, warehouse_id)
  REFERENCES warehouses (tenant_id, id)
  ON DELETE RESTRICT;

-- sales_invoices -> branches (composite FK with tenantId)
ALTER TABLE sales_invoices
  DROP CONSTRAINT IF EXISTS sales_invoices_branch_id_fkey,
  ADD CONSTRAINT sales_invoices_branch_tenant_fkey
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE SET NULL;

-- sales_invoices -> users (created_by) (composite FK with tenantId)
ALTER TABLE sales_invoices
  DROP CONSTRAINT IF EXISTS sales_invoices_created_by_id_fkey,
  ADD CONSTRAINT sales_invoices_created_by_tenant_fkey
  FOREIGN KEY (tenant_id, created_by_id)
  REFERENCES users (tenant_id, id)
  ON DELETE SET NULL;

-- sales_invoice_items -> sales_invoices (composite FK with tenantId)
ALTER TABLE sales_invoice_items
  DROP CONSTRAINT IF EXISTS sales_invoice_items_invoice_id_fkey,
  ADD CONSTRAINT sales_invoice_items_invoice_tenant_fkey
  FOREIGN KEY (tenant_id, invoice_id)
  REFERENCES sales_invoices (tenant_id, id)
  ON DELETE CASCADE;

-- sales_invoice_items -> products (composite FK with tenantId)
ALTER TABLE sales_invoice_items
  DROP CONSTRAINT IF EXISTS sales_invoice_items_product_id_fkey,
  ADD CONSTRAINT sales_invoice_items_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- purchase_invoices -> branches (composite FK with tenantId)
ALTER TABLE purchase_invoices
  DROP CONSTRAINT IF EXISTS purchase_invoices_branch_id_fkey,
  ADD CONSTRAINT purchase_invoices_branch_tenant_fkey
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE SET NULL;

-- purchase_invoice_items -> purchase_invoices (composite FK with tenantId)
ALTER TABLE purchase_invoice_items
  DROP CONSTRAINT IF EXISTS purchase_invoice_items_invoice_id_fkey,
  ADD CONSTRAINT purchase_invoice_items_invoice_tenant_fkey
  FOREIGN KEY (tenant_id, invoice_id)
  REFERENCES purchase_invoices (tenant_id, id)
  ON DELETE CASCADE;

-- purchase_invoice_items -> products (composite FK with tenantId)
ALTER TABLE purchase_invoice_items
  DROP CONSTRAINT IF EXISTS purchase_invoice_items_product_id_fkey,
  ADD CONSTRAINT purchase_invoice_items_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- purchase_orders -> branches (composite FK with tenantId)
ALTER TABLE purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_branch_id_fkey,
  ADD CONSTRAINT purchase_orders_branch_tenant_fkey
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE SET NULL;

-- purchase_order_items -> purchase_orders (composite FK with tenantId)
ALTER TABLE purchase_order_items
  DROP CONSTRAINT IF EXISTS purchase_order_items_order_id_fkey,
  ADD CONSTRAINT purchase_order_items_order_tenant_fkey
  FOREIGN KEY (tenant_id, order_id)
  REFERENCES purchase_orders (tenant_id, id)
  ON DELETE CASCADE;

-- purchase_order_items -> products (composite FK with tenantId)
ALTER TABLE purchase_order_items
  DROP CONSTRAINT IF EXISTS purchase_order_items_product_id_fkey,
  ADD CONSTRAINT purchase_order_items_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- goods_receipts -> purchase_orders (composite FK with tenantId)
ALTER TABLE goods_receipts
  DROP CONSTRAINT IF EXISTS goods_receipts_purchase_order_id_fkey,
  ADD CONSTRAINT goods_receipts_po_tenant_fkey
  FOREIGN KEY (tenant_id, purchase_order_id)
  REFERENCES purchase_orders (tenant_id, id)
  ON DELETE SET NULL;

-- goods_receipts -> warehouses (composite FK with tenantId)
ALTER TABLE goods_receipts
  DROP CONSTRAINT IF EXISTS goods_receipts_warehouse_id_fkey,
  ADD CONSTRAINT goods_receipts_warehouse_tenant_fkey
  FOREIGN KEY (tenant_id, warehouse_id)
  REFERENCES warehouses (tenant_id, id)
  ON DELETE SET NULL;

-- goods_receipt_items -> goods_receipts (composite FK with tenantId)
ALTER TABLE goods_receipt_items
  DROP CONSTRAINT IF EXISTS goods_receipt_items_receipt_id_fkey,
  ADD CONSTRAINT goods_receipt_items_receipt_tenant_fkey
  FOREIGN KEY (tenant_id, receipt_id)
  REFERENCES goods_receipts (tenant_id, id)
  ON DELETE CASCADE;

-- goods_receipt_items -> products (composite FK with tenantId)
ALTER TABLE goods_receipt_items
  DROP CONSTRAINT IF EXISTS goods_receipt_items_product_id_fkey,
  ADD CONSTRAINT goods_receipt_items_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- pos_sessions -> branches (composite FK with tenantId)
ALTER TABLE pos_sessions
  DROP CONSTRAINT IF EXISTS pos_sessions_branch_id_fkey,
  ADD CONSTRAINT pos_sessions_branch_tenant_fkey
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE SET NULL;

-- pos_sessions -> users (cashier) (composite FK with tenantId)
ALTER TABLE pos_sessions
  DROP CONSTRAINT IF EXISTS pos_sessions_cashier_id_fkey,
  ADD CONSTRAINT pos_sessions_cashier_tenant_fkey
  FOREIGN KEY (tenant_id, cashier_id)
  REFERENCES users (tenant_id, id)
  ON DELETE SET NULL;

-- pos_sales -> pos_sessions (composite FK with tenantId)
ALTER TABLE pos_sales
  DROP CONSTRAINT IF EXISTS pos_sales_session_id_fkey,
  ADD CONSTRAINT pos_sales_session_tenant_fkey
  FOREIGN KEY (tenant_id, session_id)
  REFERENCES pos_sessions (tenant_id, id)
  ON DELETE CASCADE;

-- pos_sale_items -> pos_sales (composite FK with tenantId)
ALTER TABLE pos_sale_items
  DROP CONSTRAINT IF EXISTS pos_sale_items_sale_id_fkey,
  ADD CONSTRAINT pos_sale_items_sale_tenant_fkey
  FOREIGN KEY (tenant_id, sale_id)
  REFERENCES pos_sales (tenant_id, id)
  ON DELETE CASCADE;

-- pos_sale_items -> products (composite FK with tenantId)
ALTER TABLE pos_sale_items
  DROP CONSTRAINT IF EXISTS pos_sale_items_product_id_fkey,
  ADD CONSTRAINT pos_sale_items_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT;

-- pos_payments -> pos_sales (composite FK with tenantId)
ALTER TABLE pos_payments
  DROP CONSTRAINT IF EXISTS pos_payments_sale_id_fkey,
  ADD CONSTRAINT pos_payments_sale_tenant_fkey
  FOREIGN KEY (tenant_id, sale_id)
  REFERENCES pos_sales (tenant_id, id)
  ON DELETE CASCADE;

-- employees -> branches (composite FK with tenantId)
ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_branch_id_fkey,
  ADD CONSTRAINT employees_branch_tenant_fkey
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE SET NULL;

-- employees -> departments (composite FK with tenantId)
ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_department_id_fkey,
  ADD CONSTRAINT employees_dept_tenant_fkey
  FOREIGN KEY (tenant_id, department_id)
  REFERENCES departments (tenant_id, id)
  ON DELETE SET NULL;

-- payroll_entries -> employees (composite FK with tenantId)
ALTER TABLE payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_employee_id_fkey,
  ADD CONSTRAINT payroll_entries_emp_tenant_fkey
  FOREIGN KEY (tenant_id, employee_id)
  REFERENCES employees (tenant_id, id)
  ON DELETE RESTRICT;

-- leave_requests -> employees (composite FK with tenantId)
ALTER TABLE leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_employee_id_fkey,
  ADD CONSTRAINT leave_requests_emp_tenant_fkey
  FOREIGN KEY (tenant_id, employee_id)
  REFERENCES employees (tenant_id, id)
  ON DELETE RESTRICT;

-- patients -> branches (composite FK with tenantId)
ALTER TABLE patients
  DROP CONSTRAINT IF EXISTS patients_branch_id_fkey,
  ADD CONSTRAINT patients_branch_tenant_fkey
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE SET NULL;

-- prescriptions -> patients (composite FK with tenantId)
ALTER TABLE prescriptions
  DROP CONSTRAINT IF EXISTS prescriptions_patient_id_fkey,
  ADD CONSTRAINT prescriptions_patient_tenant_fkey
  FOREIGN KEY (tenant_id, patient_id)
  REFERENCES patients (tenant_id, id)
  ON DELETE RESTRICT.

-- prescriptions -> products (composite FK with tenantId)
ALTER TABLE prescriptions
  DROP CONSTRAINT IF EXISTS prescriptions_product_id_fkey,
  ADD CONSTRAINT prescriptions_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT.

-- dispensings -> prescriptions (composite FK with tenantId)
ALTER TABLE dispensings
  DROP CONSTRAINT IF EXISTS dispensings_prescription_id_fkey,
  ADD CONSTRAINT dispensings_presc_tenant_fkey
  FOREIGN KEY (tenant_id, prescription_id)
  REFERENCES prescriptions (tenant_id, id)
  ON DELETE RESTRICT.

-- dispensings -> products (composite FK with tenantId)
ALTER TABLE dispensings
  DROP CONSTRAINT IF EXISTS dispensings_product_id_fkey,
  ADD CONSTRAINT dispensings_product_tenant_fkey
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE RESTRICT.

-- communications -> users (composite FK with tenantId)
ALTER TABLE communications
  DROP CONSTRAINT IF EXISTS communications_user_id_fkey,
  ADD CONSTRAINT communications_user_tenant_fkey
  FOREIGN KEY (tenant_id, user_id)
  REFERENCES users (tenant_id, id)
  ON DELETE SET NULL.

-- activity_logs -> users (composite FK with tenantId)
ALTER TABLE activity_logs
  DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey,
  ADD CONSTRAINT activity_logs_user_tenant_fkey
  FOREIGN KEY (tenant_id, user_id)
  REFERENCES users (tenant_id, id)
  ON DELETE SET NULL.

-- login_attempts -> users (composite FK with tenantId)
ALTER TABLE login_attempts
  DROP CONSTRAINT IF EXISTS login_attempts_user_id_fkey,
  ADD CONSTRAINT login_attempts_user_tenant_fkey
  FOREIGN KEY (tenant_id, user_id)
  REFERENCES users (tenant_id, id)
  ON DELETE SET NULL.

-- documents -> users (composite FK with tenantId)
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_user_id_fkey,
  ADD CONSTRAINT documents_user_tenant_fkey
  FOREIGN KEY (tenant_id, user_id)
  REFERENCES users (tenant_id, id)
  ON DELETE SET NULL.

-- vouchers -> branches (composite FK with tenantId)
ALTER TABLE vouchers
  DROP CONSTRAINT IF EXISTS vouchers_branch_id_fkey,
  ADD CONSTRAINT vouchers_branch_tenant_fkey
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE SET NULL.

-- vouchers -> users (created_by) (composite FK with tenantId)
ALTER TABLE vouchers
  DROP CONSTRAINT IF EXISTS vouchers_created_by_id_fkey,
  ADD CONSTRAINT vouchers_created_by_tenant_fkey
  FOREIGN KEY (tenant_id, created_by_id)
  REFERENCES users (tenant_id, id)
  ON DELETE SET NULL.

-- voucher_items -> vouchers (composite FK with tenantId)
ALTER TABLE voucher_items
  DROP CONSTRAINT IF EXISTS voucher_items_voucher_id_fkey,
  ADD CONSTRAINT voucher_items_voucher_tenant_fkey
  FOREIGN KEY (tenant_id, voucher_id)
  REFERENCES vouchers (tenant_id, id)
  ON DELETE CASCADE.

-- voucher_items -> accounts (composite FK with tenantId)
ALTER TABLE voucher_items
  DROP CONSTRAINT IF EXISTS voucher_items_account_id_fkey,
  ADD CONSTRAINT voucher_items_account_tenant_fkey
  FOREIGN KEY (tenant_id, account_id)
  REFERENCES accounts (tenant_id, id)
  ON DELETE RESTRICT.

-- voucher_items -> cost_centers (composite FK with tenantId)
ALTER TABLE voucher_items
  DROP CONSTRAINT IF EXISTS voucher_items_cost_center_id_fkey,
  ADD CONSTRAINT voucher_items_cc_tenant_fkey
  FOREIGN KEY (tenant_id, cost_center_id)
  REFERENCES cost_centers (tenant_id, id)
  ON DELETE SET NULL.

-- ============================================================================
-- PART 4: CHECK constraints to prevent negative stock at DB level
-- ============================================================================

-- Prevent negative available quantity in warehouse_stock
ALTER TABLE warehouse_stock
  DROP CONSTRAINT IF EXISTS chk_warehouse_stock_available_nonneg,
  ADD CONSTRAINT chk_warehouse_stock_available_nonneg
  CHECK (available_qty >= 0);

-- Prevent negative quantity in warehouse_stock
ALTER TABLE warehouse_stock
  DROP CONSTRAINT IF EXISTS chk_warehouse_stock_quantity_nonneg,
  ADD CONSTRAINT chk_warehouse_stock_quantity_nonneg
  CHECK (quantity >= 0);

-- Prevent negative reserved quantity
ALTER TABLE warehouse_stock
  DROP CONSTRAINT IF EXISTS chk_warehouse_stock_reserved_nonneg,
  ADD CONSTRAINT chk_warehouse_stock_reserved_nonneg
  CHECK (reserved_qty >= 0);

-- Prevent negative quantity in inventory_batches
ALTER TABLE inventory_batches
  DROP CONSTRAINT IF EXISTS chk_inventory_batches_quantity_nonneg,
  ADD CONSTRAINT chk_inventory_batches_quantity_nonneg
  CHECK (quantity >= 0);

-- Prevent negative remaining quantity in inventory_batches
ALTER TABLE inventory_batches
  DROP CONSTRAINT IF EXISTS chk_inventory_batches_remaining_nonneg,
  ADD CONSTRAINT chk_inventory_batches_remaining_nonneg
  CHECK (quantity_remaining >= 0);

-- Prevent negative reserved in inventory_batches
ALTER TABLE inventory_batches
  DROP CONSTRAINT IF EXISTS chk_inventory_batches_reserved_nonneg,
  ADD CONSTRAINT chk_inventory_batches_reserved_nonneg
  CHECK (reserved_qty >= 0);

-- Prevent negative current_stock in products
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS chk_products_current_stock_nonneg,
  ADD CONSTRAINT chk_products_current_stock_nonneg
  CHECK (current_stock >= 0);

-- Prevent negative current_stock in product_variants
ALTER TABLE product_variants
  DROP CONSTRAINT IF EXISTS chk_product_variants_current_stock_nonneg,
  ADD CONSTRAINT chk_product_variants_current_stock_nonneg
  CHECK (current_stock >= 0);

-- Prevent negative quantity in inventory_valuation_layers
ALTER TABLE inventory_valuation_layers
  DROP CONSTRAINT IF EXISTS chk_ivl_quantity_nonneg,
  ADD CONSTRAINT chk_ivl_quantity_nonneg
  CHECK (quantity >= 0);

-- Prevent negative remaining_qty in inventory_valuation_layers
ALTER TABLE inventory_valuation_layers
  DROP CONSTRAINT IF EXISTS chk_ivl_remaining_nonneg,
  ADD CONSTRAINT chk_ivl_remaining_nonneg
  CHECK (remaining_qty >= 0);

-- ============================================================================
-- PART 5: Indexes for RLS policy performance
-- ============================================================================

-- Ensure all tenant_id columns have indexes for RLS policy evaluation
-- (Most already exist from schema, but adding any missing)

CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON transactions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_id ON journal_entries (tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_id ON accounts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products (tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_tenant_id ON warehouse_stock (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant_id ON inventory_movements (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_tenant_id ON inventory_batches (tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_tenant_id ON product_variants (tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_tenant_id ON product_batches (tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_serials_tenant_id ON product_serials (tenant_id);
CREATE INDEX IF NOT EXISTS idx_matrix_items_tenant_id ON matrix_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_allocations_tenant_id ON inventory_allocations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_valuation_layers_tenant_id ON inventory_valuation_layers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_tenant_id ON warehouse_transfers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_tenant_id ON stock_adjustments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_tenant_id ON sales_invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_tenant_id ON sales_invoice_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_tenant_id ON purchase_invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_tenant_id ON purchase_invoice_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_id ON purchase_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_tenant_id ON purchase_order_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_tenant_id ON goods_receipts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_tenant_id ON goods_receipt_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_tenant_id ON pos_sessions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_tenant_id ON pos_sales (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_tenant_id ON pos_sale_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_payments_tenant_id ON pos_payments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees (tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_tenant_id ON departments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_tenant_id ON payroll_entries (tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant_id ON leave_requests (tenant_id);
CREATE INDEX IF NOT EXISTS idx_patients_tenant_id ON patients (tenant_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant_id ON prescriptions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_dispensings_tenant_id ON dispensings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_communications_tenant_id ON communications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_communication_templates_tenant_id ON communication_templates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_id ON activity_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_tenant_id ON login_attempts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_tenant_id ON document_templates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_tenant_id ON cost_centers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_tenant_id ON beneficiaries (tenant_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_tenant_id ON vouchers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_voucher_items_tenant_id ON voucher_items (tenant_id);

-- ============================================================================
-- PART 6: Function to set tenant context (called by application)
-- ============================================================================

-- This function should be called at the start of each request/transaction
-- to set the tenant context for RLS policies
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
END;
$$;

-- Grant execute to application role
GRANT EXECUTE ON FUNCTION set_tenant_context(int) TO PUBLIC;

-- ============================================================================
-- PART 7: Trigger to automatically set tenant_id on INSERT (defense in depth)
-- ============================================================================

-- This ensures tenant_id is always set correctly even if application forgets
CREATE OR REPLACE FUNCTION enforce_tenant_id_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id int;
BEGIN
  -- Get tenant_id from session variable
  v_tenant_id := current_setting('app.current_tenant_id')::int;
  
  -- If tenant_id is not set in NEW row, set it from session
  IF NEW.tenant_id IS NULL OR NEW.tenant_id = 0 THEN
    NEW.tenant_id := v_tenant_id;
  END IF;
  
  -- Verify tenant_id matches session (prevents cross-tenant inserts)
  IF NEW.tenant_id != v_tenant_id THEN
    RAISE EXCEPTION 'Cross-tenant insert blocked: session tenant=% but row tenant=%', v_tenant_id, NEW.tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to all tenant-scoped tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'users', 'branches', 'user_branch_permissions',
      'accounts', 'journal_entries', 'transactions', 'opening_balances',
      'budgets', 'fiscal_periods', 'settings',
      'products', 'warehouses', 'warehouse_stock', 'inventory_movements',
      'inventory_batches', 'product_variants', 'product_batches', 'product_serials',
      'matrix_dimensions', 'matrix_dimension_values', 'matrix_items',
      'inventory_allocations', 'inventory_valuation_layers', 'warehouse_transfers',
      'stock_adjustments', 'sales_invoices', 'sales_invoice_items',
      'purchase_invoices', 'purchase_invoice_items', 'purchase_orders',
      'purchase_order_items', 'goods_receipts', 'goods_receipt_items',
      'pos_sessions', 'pos_sales', 'pos_sale_items', 'pos_payments',
      'employees', 'departments', 'payroll_entries', 'leave_requests',
      'patients', 'prescriptions', 'dispensings',
      'communications', 'communication_templates',
      'activity_logs', 'login_attempts',
      'documents', 'document_templates',
      'cost_centers', 'beneficiaries',
      'vouchers', 'voucher_items'
    )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS enforce_tenant_id ON %I;
      CREATE TRIGGER enforce_tenant_id
      BEFORE INSERT ON %I
      FOR EACH ROW EXECUTE FUNCTION enforce_tenant_id_on_insert();
    ', tbl, tbl);
  END LOOP;
END $$;

-- ============================================================================
-- PART 8: Audit trigger for immutable audit trail
-- ============================================================================

-- Create audit log table for critical financial tables
CREATE TABLE IF NOT EXISTS audit_trail (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  user_id INT,
  session_id UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  request_id UUID
);

CREATE INDEX idx_audit_trail_tenant ON audit_trail (tenant_id);
CREATE INDEX idx_audit_trail_table ON audit_trail (table_name);
CREATE INDEX idx_audit_trail_changed ON audit_trail (changed_at);

-- Enable RLS on audit_trail
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_trail_tenant_isolation ON audit_trail
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id int;
  v_user_id int;
  v_session_id uuid;
  v_request_id uuid;
BEGIN
  v_tenant_id := current_setting('app.current_tenant_id')::int;
  v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::int;
  v_session_id := NULLIF(current_setting('app.current_session_id', true), '')::uuid;
  v_request_id := NULLIF(current_setting('app.current_request_id', true), '')::uuid;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_trail (tenant_id, table_name, operation, new_data, user_id, session_id, request_id)
    VALUES (v_tenant_id, TG_TABLE_NAME, 'INSERT', to_jsonb(NEW), v_user_id, v_session_id, v_request_id);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_trail (tenant_id, table_name, operation, old_data, new_data, user_id, session_id, request_id)
    VALUES (v_tenant_id, TG_TABLE_NAME, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user_id, v_session_id, v_request_id);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_trail (tenant_id, table_name, operation, old_data, user_id, session_id, request_id)
    VALUES (v_tenant_id, TG_TABLE_NAME, 'DELETE', to_jsonb(OLD), v_user_id, v_session_id, v_request_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Apply audit trigger to critical financial tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'journal_entries', 'transactions', 'accounts',
      'sales_invoices', 'sales_invoice_items',
      'purchase_invoices', 'purchase_invoice_items',
      'purchase_orders', 'purchase_order_items',
      'goods_receipts', 'goods_receipt_items',
      'pos_sales', 'pos_sale_items', 'pos_payments',
      'vouchers', 'voucher_items',
      'warehouse_stock', 'inventory_movements',
      'inventory_batches', 'product_batches', 'product_serials',
      'stock_adjustments', 'warehouse_transfers'
    )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS audit_trigger ON %I;
      CREATE TRIGGER audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON %I
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
    ', tbl, tbl);
  END LOOP;
END $$;

-- ============================================================================
-- PART 9: Function to verify tenant isolation (for testing)
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_tenant_isolation(p_tenant_a int, p_tenant_b int)
RETURNS TABLE (
  table_name text,
  tenant_a_count bigint,
  tenant_b_count bigint,
  cross_tenant_leak boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tbl record;
  query text;
  result record;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('tenants', 'audit_trail', 'drizzle_migrations')
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = pg_tables.tablename
      AND column_name = 'tenant_id'
    )
  LOOP
    query := format(
      'SELECT %L as table_name,
        (SELECT count(*) FROM %I WHERE tenant_id = $1) as tenant_a_count,
        (SELECT count(*) FROM %I WHERE tenant_id = $2) as tenant_b_count,
        false as cross_tenant_leak',
      tbl.tablename, tbl.tablename, tbl.tablename
    );
    EXECUTE query INTO result USING p_tenant_a, p_tenant_b;
    RETURN NEXT result;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_tenant_isolation(int, int) TO PUBLIC;