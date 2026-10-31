/**
 * Permission constants and definitions for the entire platform.
 * Every screen, action, and resource is mapped to a unique permission key.
 * Server enforces these; client uses them for UI gating only.
 */

// ─── Permission Categories ───────────────────────────────────────
export const PERMISSION_CATEGORIES = {
  GENERAL: "general",
  FINANCIAL: "financial",
  INVENTORY: "inventory",
  SALES: "sales",
  HR: "hr",
  PROJECTS: "projects",
  PROCUREMENT: "procurement",
  REPORTS: "reports",
  SETTINGS: "settings",
  COMMUNICATION: "communication",
  SECURITY: "security",
  POS: "pos",
  ADMIN: "admin",
} as const;

export type PermissionCategory =
  (typeof PERMISSION_CATEGORIES)[keyof typeof PERMISSION_CATEGORIES];

// ─── All Permission Keys ─────────────────────────────────────────
export const PERMISSIONS = {
  // ── General ──────────────────────────────────────────────────
  DASHBOARD_VIEW: "dashboard.view",
  WORKSPACE_VIEW: "workspace.view",

  // ── Settings ─────────────────────────────────────────────────
  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",
  SETTINGS_WORK_SITES: "settings.work_sites",
  SETTINGS_DEVICES: "settings.devices",
  SETTINGS_ZATCA: "settings.zatca",
  SETTINGS_POS_CONFIG: "settings.pos_config",
  SETTINGS_DOCUMENT_TEMPLATE: "settings.document_template",

  // ── Security ─────────────────────────────────────────────────
  SECURITY_VIEW: "security.view",
  SECURITY_EVENTS_MANAGE: "security.events_manage",
  SECURITY_INCIDENTS_MANAGE: "security.incidents_manage",

  // ── RBAC / Users ─────────────────────────────────────────────
  RBAC_VIEW: "rbac.view",
  RBAC_MANAGE_ROLES: "rbac.manage_roles",
  RBAC_ASSIGN_ROLES: "rbac.assign_roles",
  RBAC_MANAGE_PERMISSIONS: "rbac.manage_permissions",

  // ── Financial ────────────────────────────────────────────────
  JOURNAL_VIEW: "journal.view",
  JOURNAL_CREATE: "journal.create",
  JOURNAL_EDIT: "journal.edit",
  JOURNAL_POST: "journal.post",
  JOURNAL_DELETE: "journal.delete",

  VOUCHERS_VIEW: "vouchers.view",
  VOUCHERS_CREATE: "vouchers.create",
  VOUCHERS_EDIT: "vouchers.edit",
  VOUCHERS_POST: "vouchers.post",
  VOUCHERS_PRINT: "vouchers.print",
  VOUCHERS_APPROVE: "vouchers.approve",
  VOUCHERS_REJECT: "vouchers.reject",
  VOUCHERS_CANCEL: "vouchers.cancel",
  VOUCHERS_TOGGLE_STATE: "vouchers.toggle_state",
  VOUCHERS_REOPEN: "vouchers.reopen",
  VOUCHERS_MIGRATE: "vouchers.migrate",
  VOUCHERS_SHARE_RESOURCE: "vouchers.share_resource",
  VOUCHERS_BATCH_OPERATE: "vouchers.batch_operate",
  VOUCHERS_MASS_ASSIGN_PROTECT: "vouchers.mass_assign_protect",

  OPENING_BALANCES_VIEW: "opening_balances.view",
  OPENING_BALANCES_EDIT: "opening_balances.edit",

  FISCAL_PERIODS_VIEW: "fiscal_periods.view",
  FISCAL_PERIODS_MANAGE: "fiscal_periods.manage",

  PERIOD_CLOSURES_VIEW: "period_closures.view",
  PERIOD_CLOSURES_EXECUTE: "period_closures.execute",

  FINANCIAL_STATEMENTS_VIEW: "financial_statements.view",
  FINANCIAL_STATEMENTS_PRINT: "financial_statements.print",

  COST_CENTERS_VIEW: "cost_centers.view",
  COST_CENTERS_MANAGE: "cost_centers.manage",

  // ── Sales / POS ──────────────────────────────────────────────
  POS_VIEW: "pos.view",
  POS_CREATE_SALE: "pos.create_sale",
  POS_EDIT_SALE: "pos.edit_sale",
  POS_VOID_SALE: "pos.void_sale",
  POS_PRINT_RECEIPT: "pos.print_receipt",
  POS_HOLD_RECALL: "pos.hold_recall",
  POS_DISCOUNTS: "pos.discounts",
  POS_RETURNS: "pos.returns",

  // ── Inventory ────────────────────────────────────────────────
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_CREATE: "inventory.create",
  INVENTORY_EDIT: "inventory.edit",
  INVENTORY_DELETE: "inventory.delete",
  INVENTORY_ADJUST: "inventory.adjust",
  INVENTORY_VALUATION_VIEW: "inventory.valuation_view",
  INVENTORY_PHYSICAL_COUNT: "inventory.physical_count",

  // ── HR ───────────────────────────────────────────────────────
  HR_VIEW: "hr.view",
  HR_EMPLOYEES_MANAGE: "hr.employees_manage",
  HR_ATTENDANCE: "hr.attendance",
  HR_PAYROLL: "hr.payroll",

  // ── Projects ─────────────────────────────────────────────────
  PROJECTS_VIEW: "projects.view",
  PROJECTS_CREATE: "projects.create",
  PROJECTS_EDIT: "projects.edit",
  PROJECTS_DELETE: "projects.delete",
  PROJECTS_GOVERNANCE: "projects.governance",

  // ── Procurement ──────────────────────────────────────────────
  PROCUREMENT_VIEW: "procurement.view",
  PROCUREMENT_CREATE: "procurement.create",
  PROCUREMENT_APPROVE: "procurement.approve",
  PROCUREMENT_RECEIVE: "procurement.receive",

  // ── Communication / Sharing (طلبات وتقارير: واتساب والإيميل) ─
  COMMUNICATION_VIEW: "communication.view",
  COMMUNICATION_SEND: "communication.send",

  // ── Reports ──────────────────────────────────────────────────
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  REPORTS_PRINT: "reports.print",
  REPORTS_ANALYTICS: "reports.analytics",

  // ── Beneficiaries ────────────────────────────────────────────
  BENEFICIARIES_VIEW: "beneficiaries.view",
  BENEFICIARIES_MANAGE: "beneficiaries.manage",

  // ── Commercial ───────────────────────────────────────────────
  COMMERCIAL_VIEW: "commercial.view",
  COMMERCIAL_MANAGE: "commercial.manage",

  // ── Universal Quotation Engine ───────────────────────────────────
  QUOTATION_VIEW: "quotation.view",
  QUOTATION_CREATE: "quotation.create",
  QUOTATION_EDIT: "quotation.edit",
  QUOTATION_APPROVE: "quotation.approve",
  QUOTATION_CONVERT: "quotation.convert",
  QUOTATION_ANALYZE: "quotation.analyze",

  // ── Workflow ───────────────────────────────────────────────────
  WORKFLOW_READ: "workflow.read",
  WORKFLOW_WRITE: "workflow.write",
  WORKFLOW_APPROVE: "workflow.approve",
  WORKFLOW_ADMIN: "workflow.admin",

  // ── Audit ────────────────────────────────────────────────────
  AUDIT_VIEW: "audit.view",
  AUDIT_EXPORT: "audit.export",

  // ── Billing ──────────────────────────────────────────────────
  BILLING_VIEW: "billing.view",
  BILLING_MANAGE: "billing.manage",

  // ── Healthcare (Patient/Clinical) ────────────────────────────
  HEALTHCARE_PATIENTS_VIEW: "healthcare.patients.view",
  HEALTHCARE_PATIENTS_MANAGE: "healthcare.patients.manage",
  HEALTHCARE_APPOINTMENTS_VIEW: "healthcare.appointments.view",
  HEALTHCARE_APPOINTMENTS_MANAGE: "healthcare.appointments.manage",
  HEALTHCARE_RECORDS_VIEW: "healthcare.records.view",
  HEALTHCARE_RECORDS_MANAGE: "healthcare.records.manage",
  HEALTHCARE_CLINICAL_VIEW: "healthcare.clinical.view",
  HEALTHCARE_DIAGNOSES_MANAGE: "healthcare.diagnoses.manage",
  HEALTHCARE_VITALS_MANAGE: "healthcare.vitals.manage",
  HEALTHCARE_CONSENT_MANAGE: "healthcare.consent.manage",
} as const;

// ── Extended Permission Keys for Complete Operation Coverage ─────────────────────────────────────────
export const EXTENDED_PERMISSIONS = {
  // Import/Download operations (data ingestion, file export/download)
  IMPORT_DATA: "import.data",
  EXPORT_DATA: "export.data",
  DOWNLOAD_DOCUMENT: "download.document",
  DOWNLOAD_REPORT: "download.report",

  // Approval/Rejection/Cancellation workflows
  APPROVE: "approve",
  REJECT: "reject",
  CANCEL: "cancel",
  TOGGLE_STATE: "toggle_state",
  REOPEN: "reopen",
  MIGRATE: "migrate",

  // Share and batch operations
  SHARE_RESOURCE: "share.resource",
  BATCH_OPERATE: "batch.operate",

  // Additional granular controls
  MASS_ASSIGN_PROTECT: "mass.assign.protect",

  // Workflow permissions
  WORKFLOW_READ: "workflow.read",
  WORKFLOW_WRITE: "workflow.write",
  WORKFLOW_APPROVE: "workflow.approve",
  WORKFLOW_ADMIN: "workflow.admin",
} as const;

export type ExtendedPermissionKey =
  (typeof EXTENDED_PERMISSIONS)[keyof typeof EXTENDED_PERMISSIONS];

// ─── Canonical Permission Key (derived from PERMISSIONS) ─────────────────────────────────────────
export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── Role Definitions (Defaults) ─────────────────────────────────
export const ROLE_DEFINITIONS = {
  owner: {
    label: "مالك المنصة",
    description: "صلاحيات كاملة على المنصة بأكملها",
    permissions: Object.values(PERMISSIONS) as readonly PermissionKey[],
    isSystem: true,
  },
  admin: {
    label: "مدير المؤسسة",
    description: "صلاحيات إدارية شاملة للمؤسسة",
    permissions: [
      ...Object.values(PERMISSIONS).filter(
        p => !p.startsWith("security.") && !p.startsWith("billing.")
      ),
    ] as readonly PermissionKey[],
    isSystem: true,
  },
  accountant: {
    label: "محاسب",
    description: "إدارة القيود والسندات والتقارير المالية",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.WORKSPACE_VIEW,
      PERMISSIONS.JOURNAL_VIEW,
      PERMISSIONS.JOURNAL_CREATE,
      PERMISSIONS.JOURNAL_EDIT,
      PERMISSIONS.JOURNAL_POST,
      PERMISSIONS.VOUCHERS_VIEW,
      PERMISSIONS.VOUCHERS_CREATE,
      PERMISSIONS.VOUCHERS_EDIT,
      PERMISSIONS.VOUCHERS_PRINT,
      PERMISSIONS.OPENING_BALANCES_VIEW,
      PERMISSIONS.OPENING_BALANCES_EDIT,
      PERMISSIONS.FISCAL_PERIODS_VIEW,
      PERMISSIONS.PERIOD_CLOSURES_VIEW,
      PERMISSIONS.FINANCIAL_STATEMENTS_VIEW,
      PERMISSIONS.FINANCIAL_STATEMENTS_PRINT,
      PERMISSIONS.COST_CENTERS_VIEW,
      PERMISSIONS.COST_CENTERS_MANAGE,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.REPORTS_PRINT,
      PERMISSIONS.REPORTS_ANALYTICS,
      PERMISSIONS.POS_VIEW,
      PERMISSIONS.POS_CREATE_SALE,
      PERMISSIONS.POS_PRINT_RECEIPT,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_VALUATION_VIEW,
      PERMISSIONS.BENEFICIARIES_VIEW,
      PERMISSIONS.COMMERCIAL_VIEW,
      PERMISSIONS.QUOTATION_VIEW,
      PERMISSIONS.QUOTATION_CREATE,
      PERMISSIONS.QUOTATION_EDIT,
      PERMISSIONS.QUOTATION_ANALYZE,
      PERMISSIONS.WORKFLOW_READ,
      PERMISSIONS.WORKFLOW_WRITE,
      PERMISSIONS.WORKFLOW_APPROVE,
      PERMISSIONS.COMMUNICATION_VIEW,
      PERMISSIONS.COMMUNICATION_SEND,
    ] as readonly PermissionKey[],
    isSystem: true,
  },
  auditor: {
    label: "مراجع",
    description: "عرض فقط لجميع السجلات والتقارير",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.WORKSPACE_VIEW,
      PERMISSIONS.JOURNAL_VIEW,
      PERMISSIONS.VOUCHERS_VIEW,
      PERMISSIONS.OPENING_BALANCES_VIEW,
      PERMISSIONS.FISCAL_PERIODS_VIEW,
      PERMISSIONS.PERIOD_CLOSURES_VIEW,
      PERMISSIONS.FINANCIAL_STATEMENTS_VIEW,
      PERMISSIONS.COST_CENTERS_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_VALUATION_VIEW,
      PERMISSIONS.POS_VIEW,
      PERMISSIONS.BENEFICIARIES_VIEW,
      PERMISSIONS.COMMERCIAL_VIEW,
      PERMISSIONS.QUOTATION_VIEW,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.WORKFLOW_READ,
    ] as readonly PermissionKey[],
    isSystem: true,
  },
  user: {
    label: "مستخدم",
    description: "عرض محدود حسب التعيين",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.WORKSPACE_VIEW,
      PERMISSIONS.POS_VIEW,
      PERMISSIONS.POS_CREATE_SALE,
      PERMISSIONS.POS_PRINT_RECEIPT,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.WORKFLOW_READ,
    ] as readonly PermissionKey[],
    isSystem: true,
  },
} as const;

export type RoleCode = keyof typeof ROLE_DEFINITIONS;

// ─── Helpers ──────────────────────────────────────────────────────

/** Get all permission keys for a role code */
export function permissionsForRole(role: RoleCode): PermissionKey[] {
  return [...(ROLE_DEFINITIONS[role]?.permissions ?? [])];
}

/** Check if a set of permissions includes a specific key */
export function hasPermission(
  userPermissions: string[],
  required: PermissionKey
): boolean {
  return userPermissions.includes(required);
}

/** Check if a set of permissions includes ALL of the required keys */
export function hasAllPermissions(
  userPermissions: string[],
  required: PermissionKey[]
): boolean {
  return required.every(p => userPermissions.includes(p));
}

/** Check if a set of permissions includes ANY of the required keys */
export function hasAnyPermission(
  userPermissions: string[],
  required: PermissionKey[]
): boolean {
  return required.some(p => userPermissions.includes(p));
}

/** Get permissions grouped by category */
export function permissionsByCategory(): Record<
  PermissionCategory,
  { key: PermissionKey; label: string }[]
> {
  const result: Record<string, { key: PermissionKey; label: string }[]> = {};
  for (const [name, key] of Object.entries(PERMISSIONS)) {
    const category = key.split(".")[0] as PermissionCategory;
    if (!result[category]) result[category] = [];
    result[category].push({
      key,
      label: name
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase()),
    });
  }
  return result as Record<
    PermissionCategory,
    { key: PermissionKey; label: string }[]
  >;
}
