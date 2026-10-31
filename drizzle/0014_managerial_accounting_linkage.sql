-- 0014_managerial_accounting_linkage — ربط العمليات بالحسابات بالحقول الكاملة + محاسبة إدارية
-- يضيف مراكز التكلفة والمستودع والمشروع إلى فواتير المبيعات والمشتريات لتمكين التحليل الربحي حسب مركز التكلفة

ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "costCenterId" integer REFERENCES "cost_centers"("id");
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "warehouseId" integer REFERENCES "warehouses"("id");
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "projectId" integer REFERENCES "projects"("id");
CREATE INDEX IF NOT EXISTS "idx_salesInvoices_costCenter" ON "sales_invoices" ("costCenterId");
CREATE INDEX IF NOT EXISTS "idx_salesInvoices_warehouse" ON "sales_invoices" ("warehouseId");
CREATE INDEX IF NOT EXISTS "idx_salesInvoices_project" ON "sales_invoices" ("projectId");
CREATE INDEX IF NOT EXISTS "idx_salesInvoices_branch_costCenter" ON "sales_invoices" ("branchId", "costCenterId");

ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "costCenterId" integer REFERENCES "cost_centers"("id");
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "warehouseId" integer REFERENCES "warehouses"("id");
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "projectId" integer REFERENCES "projects"("id");
CREATE INDEX IF NOT EXISTS "idx_purchaseInvoices_costCenter" ON "purchase_invoices" ("costCenterId");
CREATE INDEX IF NOT EXISTS "idx_purchaseInvoices_warehouse" ON "purchase_invoices" ("warehouseId");
CREATE INDEX IF NOT EXISTS "idx_purchaseInvoices_project" ON "purchase_invoices" ("projectId");
CREATE INDEX IF NOT EXISTS "idx_purchaseInvoices_branch_costCenter" ON "purchase_invoices" ("branchId", "costCenterId");
