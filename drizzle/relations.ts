import { relations } from "drizzle-orm";
import {
  users,
  tenants,
  branches,
  userBranchPermissions,
  accounts,
  transactions,
  openingBalances,
  budgets,
  settings,
  activityLogs,
  products,
  warehouses,
  inventoryMovements,
  customers,
  suppliers,
  salesInvoices,
  salesInvoiceItems,
  purchaseInvoices,
  purchaseInvoiceItems,
  orders,
  orderItems,
  payments,
  subscriptionPlans,
  tenantSubscriptions,
  billingInvoices,
  paymentHistory,
  auditLogs,
  notifications,
  teamInvitations,
  currencies,
  exchangeRates,
  fileUploads,
  apiKeys,
  webhooks,
  webhookDeliveries,
  featureFlags,
  departments,
  employees,
  attendance,
  payrollRuns,
  payrollItems,
  projects,
  projectTasks,
  projectMembers,
  procurements,
  procurementApprovals,
  tickets,
  qualityInspections,
  stockAdjustments,
  warehouseTransfers,
  workSites,
  devices,
  loginAttempts,
  biometricTemplates,
  translations,
  syncMetadata,
  customFieldDefs,
  customFieldValues,
  journalEntries,
  scheduledJournalEntries,
  recurringExpenses,
  recurringExpenseRuns,
  units,
  productUnits,
  categories,
  roles,
  userRoles,
  permissions,
  documents,
  messages,
  posSessions,
  posOrders,
  salesReps,
  offers,
  warehouseStock,
  inventoryBatches,
  stockReservations,
  cycleCounts,
  cycleCountLines,
  inventoryValuationLayers,
} from "./schema";

// ─── Tenants ─────────────────────────────────────────────────────
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  branches: many(branches),
  settings: many(settings),
  subscriptions: many(tenantSubscriptions),
  activityLogs: many(activityLogs),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
  teamInvitations: many(teamInvitations),
  apiKeys: many(apiKeys),
  webhooks: many(webhooks),
  featureFlags: many(featureFlags),
}));

// ─── Users ───────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  branchPermissions: many(userBranchPermissions),
  activityLogs: many(activityLogs),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
  sentInvitations: many(teamInvitations),
  apiKeys: many(apiKeys),
  fileUploads: many(fileUploads),
}));

// ─── Branches ────────────────────────────────────────────────────
export const branchesRelations = relations(branches, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [branches.tenantId],
    references: [tenants.id],
  }),
  userPermissions: many(userBranchPermissions),
  transactions: many(transactions),
  salesInvoices: many(salesInvoices),
  purchaseInvoices: many(purchaseInvoices),
}));

// ─── User Branch Permissions ─────────────────────────────────────
export const userBranchPermissionsRelations = relations(
  userBranchPermissions,
  ({ one }) => ({
    user: one(users, {
      fields: [userBranchPermissions.userId],
      references: [users.id],
    }),
    branch: one(branches, {
      fields: [userBranchPermissions.branchId],
      references: [branches.id],
    }),
    tenant: one(tenants, {
      fields: [userBranchPermissions.tenantId],
      references: [tenants.id],
    }),
  })
);

// ─── Accounts ────────────────────────────────────────────────────
export const accountsRelations = relations(accounts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [accounts.tenantId],
    references: [tenants.id],
  }),
  parentAccount: one(accounts, {
    fields: [accounts.parentAccountId],
    references: [accounts.id],
    relationName: "accountHierarchy",
  }),
  childAccounts: many(accounts, { relationName: "accountHierarchy" }),
  transactions: many(transactions),
  openingBalances: many(openingBalances),
}));

// ─── Transactions ────────────────────────────────────────────────
export const transactionsRelations = relations(transactions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [transactions.tenantId],
    references: [tenants.id],
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  branch: one(branches, {
    fields: [transactions.branchId],
    references: [branches.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

// ─── Opening Balances ────────────────────────────────────────────
export const openingBalancesRelations = relations(
  openingBalances,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [openingBalances.tenantId],
      references: [tenants.id],
    }),
    account: one(accounts, {
      fields: [openingBalances.accountId],
      references: [accounts.id],
    }),
  })
);

// ─── Budgets ─────────────────────────────────────────────────────
export const budgetsRelations = relations(budgets, ({ one }) => ({
  tenant: one(tenants, {
    fields: [budgets.tenantId],
    references: [tenants.id],
  }),
}));

// ─── Settings ────────────────────────────────────────────────────
export const settingsRelations = relations(settings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [settings.tenantId],
    references: [tenants.id],
  }),
}));

// ─── Activity Logs ───────────────────────────────────────────────
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [activityLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// ─── Products ────────────────────────────────────────────────────
export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  inventoryMovements: many(inventoryMovements),
}));

// ─── Warehouses ──────────────────────────────────────────────────
export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [warehouses.tenantId],
    references: [tenants.id],
  }),
  inventoryMovements: many(inventoryMovements),
}));

// ─── Inventory Movements ─────────────────────────────────────────
export const inventoryMovementsRelations = relations(
  inventoryMovements,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [inventoryMovements.tenantId],
      references: [tenants.id],
    }),
    product: one(products, {
      fields: [inventoryMovements.productId],
      references: [products.id],
    }),
    warehouse: one(warehouses, {
      fields: [inventoryMovements.warehouseId],
      references: [warehouses.id],
    }),
  })
);

// ─── Customers ───────────────────────────────────────────────────
export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id],
  }),
  salesInvoices: many(salesInvoices),
  orders: many(orders),
}));

// ─── Suppliers ───────────────────────────────────────────────────
export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [suppliers.tenantId],
    references: [tenants.id],
  }),
  products: many(products),
  purchaseInvoices: many(purchaseInvoices),
}));

// ─── Sales Invoices ──────────────────────────────────────────────
export const salesInvoicesRelations = relations(
  salesInvoices,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [salesInvoices.tenantId],
      references: [tenants.id],
    }),
    customer: one(customers, {
      fields: [salesInvoices.customerId],
      references: [customers.id],
    }),
    branch: one(branches, {
      fields: [salesInvoices.branchId],
      references: [branches.id],
    }),
    user: one(users, {
      fields: [salesInvoices.userId],
      references: [users.id],
    }),
    items: many(salesInvoiceItems),
  })
);

// ─── Sales Invoice Items ─────────────────────────────────────────
export const salesInvoiceItemsRelations = relations(
  salesInvoiceItems,
  ({ one }) => ({
    invoice: one(salesInvoices, {
      fields: [salesInvoiceItems.invoiceId],
      references: [salesInvoices.id],
    }),
    product: one(products, {
      fields: [salesInvoiceItems.productId],
      references: [products.id],
    }),
  })
);

// ─── Purchase Invoices ───────────────────────────────────────────
export const purchaseInvoicesRelations = relations(
  purchaseInvoices,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [purchaseInvoices.tenantId],
      references: [tenants.id],
    }),
    supplier: one(suppliers, {
      fields: [purchaseInvoices.supplierId],
      references: [suppliers.id],
    }),
    branch: one(branches, {
      fields: [purchaseInvoices.branchId],
      references: [branches.id],
    }),
    user: one(users, {
      fields: [purchaseInvoices.userId],
      references: [users.id],
    }),
    items: many(purchaseInvoiceItems),
  })
);

// ─── Purchase Invoice Items ──────────────────────────────────────
export const purchaseInvoiceItemsRelations = relations(
  purchaseInvoiceItems,
  ({ one }) => ({
    invoice: one(purchaseInvoices, {
      fields: [purchaseInvoiceItems.invoiceId],
      references: [purchaseInvoices.id],
    }),
    product: one(products, {
      fields: [purchaseInvoiceItems.productId],
      references: [products.id],
    }),
  })
);

// ─── Orders ──────────────────────────────────────────────────────
export const ordersRelations = relations(orders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [orders.tenantId],
    references: [tenants.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

// ─── Order Items ─────────────────────────────────────────────────
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// ─── Payments ────────────────────────────────────────────────────
export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

// ─── Subscription Plans ──────────────────────────────────────────
export const subscriptionPlansRelations = relations(
  subscriptionPlans,
  ({ many }) => ({
    tenantSubscriptions: many(tenantSubscriptions),
  })
);

// ─── Tenant Subscriptions ────────────────────────────────────────
export const tenantSubscriptionsRelations = relations(
  tenantSubscriptions,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [tenantSubscriptions.tenantId],
      references: [tenants.id],
    }),
    plan: one(subscriptionPlans, {
      fields: [tenantSubscriptions.planId],
      references: [subscriptionPlans.id],
    }),
    invoices: many(billingInvoices),
  })
);

// ─── Billing Invoices ────────────────────────────────────────────
export const billingInvoicesRelations = relations(
  billingInvoices,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [billingInvoices.tenantId],
      references: [tenants.id],
    }),
    subscription: one(tenantSubscriptions, {
      fields: [billingInvoices.subscriptionId],
      references: [tenantSubscriptions.id],
    }),
    payments: many(paymentHistory),
  })
);

// ─── Payment History ─────────────────────────────────────────────
export const paymentHistoryRelations = relations(paymentHistory, ({ one }) => ({
  tenant: one(tenants, {
    fields: [paymentHistory.tenantId],
    references: [tenants.id],
  }),
  invoice: one(billingInvoices, {
    fields: [paymentHistory.invoiceId],
    references: [billingInvoices.id],
  }),
}));

// ─── Audit Logs ──────────────────────────────────────────────────
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// ─── Notifications ───────────────────────────────────────────────
export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notifications.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ─── Team Invitations ────────────────────────────────────────────
export const teamInvitationsRelations = relations(
  teamInvitations,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [teamInvitations.tenantId],
      references: [tenants.id],
    }),
    inviter: one(users, {
      fields: [teamInvitations.invitedBy],
      references: [users.id],
    }),
  })
);

// ─── File Uploads ────────────────────────────────────────────────
export const fileUploadsRelations = relations(fileUploads, ({ one }) => ({
  tenant: one(tenants, {
    fields: [fileUploads.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [fileUploads.userId],
    references: [users.id],
  }),
}));

// ─── API Keys ────────────────────────────────────────────────────
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  tenant: one(tenants, {
    fields: [apiKeys.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

// ─── Webhooks ────────────────────────────────────────────────────
export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [webhooks.tenantId],
    references: [tenants.id],
  }),
  deliveries: many(webhookDeliveries),
}));

// ─── Webhook Deliveries ──────────────────────────────────────────
export const webhookDeliveriesRelations = relations(
  webhookDeliveries,
  ({ one }) => ({
    webhook: one(webhooks, {
      fields: [webhookDeliveries.webhookId],
      references: [webhooks.id],
    }),
  })
);

// ─── Feature Flags ───────────────────────────────────────────────
export const featureFlagsRelations = relations(featureFlags, ({ one }) => ({
  tenant: one(tenants, {
    fields: [featureFlags.tenantId],
    references: [tenants.id],
  }),
}));

// ─── Exchange Rates ──────────────────────────────────────────────
export const exchangeRatesRelations = relations(exchangeRates, () => ({}));

// ─── Departments ─────────────────────────────────────────────────
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [departments.tenantId],
    references: [tenants.id],
  }),
  employees: many(employees),
  procurements: many(procurements),
}));

// ─── Employees ───────────────────────────────────────────────────
export const employeesRelations = relations(employees, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [employees.tenantId],
    references: [tenants.id],
  }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  attendance: many(attendance),
  payrollItems: many(payrollItems),
  projectMemberships: many(projectMembers),
}));

// ─── Attendance ──────────────────────────────────────────────────
export const attendanceRelations = relations(attendance, ({ one }) => ({
  tenant: one(tenants, {
    fields: [attendance.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [attendance.employeeId],
    references: [employees.id],
  }),
}));

// ─── Payroll Runs ────────────────────────────────────────────────
export const payrollRunsRelations = relations(payrollRuns, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [payrollRuns.tenantId],
    references: [tenants.id],
  }),
  items: many(payrollItems),
}));

// ─── Payroll Items ───────────────────────────────────────────────
export const payrollItemsRelations = relations(payrollItems, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payrollItems.tenantId],
    references: [tenants.id],
  }),
  run: one(payrollRuns, {
    fields: [payrollItems.payrollRunId],
    references: [payrollRuns.id],
  }),
  employee: one(employees, {
    fields: [payrollItems.employeeId],
    references: [employees.id],
  }),
}));

// ─── Projects ────────────────────────────────────────────────────
export const projectsRelations = relations(projects, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [projects.tenantId],
    references: [tenants.id],
  }),
  manager: one(employees, {
    fields: [projects.managerId],
    references: [employees.id],
  }),
  tasks: many(projectTasks),
  members: many(projectMembers),
}));

// ─── Project Tasks ───────────────────────────────────────────────
export const projectTasksRelations = relations(projectTasks, ({ one }) => ({
  tenant: one(tenants, {
    fields: [projectTasks.tenantId],
    references: [tenants.id],
  }),
  project: one(projects, {
    fields: [projectTasks.projectId],
    references: [projects.id],
  }),
  assignee: one(employees, {
    fields: [projectTasks.assigneeId],
    references: [employees.id],
  }),
}));

// ─── Project Members ─────────────────────────────────────────────
export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [projectMembers.tenantId],
    references: [tenants.id],
  }),
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  employee: one(employees, {
    fields: [projectMembers.employeeId],
    references: [employees.id],
  }),
}));

// ─── Procurements ────────────────────────────────────────────────
export const procurementsRelations = relations(
  procurements,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [procurements.tenantId],
      references: [tenants.id],
    }),
    department: one(departments, {
      fields: [procurements.departmentId],
      references: [departments.id],
    }),
    approvals: many(procurementApprovals),
  })
);

// ─── Procurement Approvals ───────────────────────────────────────
export const procurementApprovalsRelations = relations(
  procurementApprovals,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [procurementApprovals.tenantId],
      references: [tenants.id],
    }),
    procurement: one(procurements, {
      fields: [procurementApprovals.procurementId],
      references: [procurements.id],
    }),
  })
);

// ─── Tickets ─────────────────────────────────────────────────────
export const ticketsRelations = relations(tickets, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tickets.tenantId],
    references: [tenants.id],
  }),
  assignee: one(employees, {
    fields: [tickets.assignedToId],
    references: [employees.id],
  }),
}));

// ─── Quality Inspections ─────────────────────────────────────────
export const qualityInspectionsRelations = relations(
  qualityInspections,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [qualityInspections.tenantId],
      references: [tenants.id],
    }),
    inspector: one(employees, {
      fields: [qualityInspections.inspectedById],
      references: [employees.id],
    }),
  })
);

// ─── Stock Adjustments ────────────────────────────────────────────
export const stockAdjustmentsRelations = relations(
  stockAdjustments,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [stockAdjustments.tenantId],
      references: [tenants.id],
    }),
    product: one(products, {
      fields: [stockAdjustments.productId],
      references: [products.id],
    }),
    warehouse: one(warehouses, {
      fields: [stockAdjustments.warehouseId],
      references: [warehouses.id],
    }),
    user: one(users, {
      fields: [stockAdjustments.userId],
      references: [users.id],
    }),
    workSite: one(workSites, {
      fields: [stockAdjustments.workSiteId],
      references: [workSites.id],
    }),
    device: one(devices, {
      fields: [stockAdjustments.deviceId],
      references: [devices.id],
    }),
  })
);

// ─── Warehouse Transfers ──────────────────────────────────────────
export const warehouseTransfersRelations = relations(
  warehouseTransfers,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [warehouseTransfers.tenantId],
      references: [tenants.id],
    }),
    product: one(products, {
      fields: [warehouseTransfers.productId],
      references: [products.id],
    }),
    fromWarehouse: one(warehouses, {
      fields: [warehouseTransfers.fromWarehouseId],
      references: [warehouses.id],
      relationName: "fromWarehouse",
    }),
    toWarehouse: one(warehouses, {
      fields: [warehouseTransfers.toWarehouseId],
      references: [warehouses.id],
      relationName: "toWarehouse",
    }),
    user: one(users, {
      fields: [warehouseTransfers.userId],
      references: [users.id],
    }),
    workSite: one(workSites, {
      fields: [warehouseTransfers.workSiteId],
      references: [workSites.id],
    }),
    device: one(devices, {
      fields: [warehouseTransfers.deviceId],
      references: [devices.id],
    }),
  })
);

// ─── Login Attempts ───────────────────────────────────────────────
export const loginAttemptsRelations = relations(loginAttempts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [loginAttempts.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [loginAttempts.userId],
    references: [users.id],
  }),
}));

// ─── Biometric Templates ──────────────────────────────────────────
export const biometricTemplatesRelations = relations(
  biometricTemplates,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [biometricTemplates.tenantId],
      references: [tenants.id],
    }),
    user: one(users, {
      fields: [biometricTemplates.userId],
      references: [users.id],
    }),
    enrolledBy: one(users, {
      fields: [biometricTemplates.enrolledById],
      references: [users.id],
      relationName: "enrolledBiometrics",
    }),
    approvedBy: one(users, {
      fields: [biometricTemplates.approvedById],
      references: [users.id],
      relationName: "approvedBiometrics",
    }),
    revokedBy: one(users, {
      fields: [biometricTemplates.revokedById],
      references: [users.id],
      relationName: "revokedBiometrics",
    }),
  })
);

// ─── Translations ─────────────────────────────────────────────────
export const translationsRelations = relations(translations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [translations.tenantId],
    references: [tenants.id],
  }),
  approvedBy: one(users, {
    fields: [translations.approvedById],
    references: [users.id],
  }),
}));

// ─── Sync Metadata ────────────────────────────────────────────────
export const syncMetadataRelations = relations(syncMetadata, ({ one }) => ({
  tenant: one(tenants, {
    fields: [syncMetadata.tenantId],
    references: [tenants.id],
  }),
  resolvedBy: one(users, {
    fields: [syncMetadata.resolvedById],
    references: [users.id],
  }),
}));

// ─── Custom Field Definitions ─────────────────────────────────────
export const customFieldDefsRelations = relations(
  customFieldDefs,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [customFieldDefs.tenantId],
      references: [tenants.id],
    }),
  })
);

// ─── Custom Field Values ──────────────────────────────────────────
export const customFieldValuesRelations = relations(
  customFieldValues,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [customFieldValues.tenantId],
      references: [tenants.id],
    }),
  })
);

// ─── Journal Entries ──────────────────────────────────────────────
export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  tenant: one(tenants, {
    fields: [journalEntries.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [journalEntries.branchId],
    references: [branches.id],
  }),
  createdBy: one(users, {
    fields: [journalEntries.createdById],
    references: [users.id],
  }),
  currency: one(currencies, {
    fields: [journalEntries.currencyId],
    references: [currencies.id],
  }),
}));

// ─── Scheduled Journal Entries ────────────────────────────────────
export const scheduledJournalEntriesRelations = relations(
  scheduledJournalEntries,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [scheduledJournalEntries.tenantId],
      references: [tenants.id],
    }),
    branch: one(branches, {
      fields: [scheduledJournalEntries.branchId],
      references: [branches.id],
    }),
    currency: one(currencies, {
      fields: [scheduledJournalEntries.currencyId],
      references: [currencies.id],
    }),
  })
);

// ─── Recurring Expenses ─────────────────────────────────────────────
export const recurringExpensesRelations = relations(
  recurringExpenses,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [recurringExpenses.tenantId],
      references: [tenants.id],
    }),
    category: one(categories, {
      fields: [recurringExpenses.categoryId],
      references: [categories.id],
    }),
    vendor: one(suppliers, {
      fields: [recurringExpenses.vendorId],
      references: [suppliers.id],
    }),
    account: one(accounts, {
      fields: [recurringExpenses.accountId],
      references: [accounts.id],
    }),
    branch: one(branches, {
      fields: [recurringExpenses.branchId],
      references: [branches.id],
    }),
    taxAccount: one(accounts, {
      fields: [recurringExpenses.taxAccountId],
      references: [accounts.id],
      relationName: "taxAccount",
    }),
    paymentAccount: one(accounts, {
      fields: [recurringExpenses.paymentAccountId],
      references: [accounts.id],
      relationName: "paymentAccount",
    }),
    approver: one(users, {
      fields: [recurringExpenses.approverId],
      references: [users.id],
      relationName: "approver",
    }),
    approvedBy: one(users, {
      fields: [recurringExpenses.approvedById],
      references: [users.id],
      relationName: "approvedBy",
    }),
    createdBy: one(users, {
      fields: [recurringExpenses.createdById],
      references: [users.id],
      relationName: "createdBy",
    }),
    budget: one(budgets, {
      fields: [recurringExpenses.budgetId],
      references: [budgets.id],
    }),
    department: one(departments, {
      fields: [recurringExpenses.departmentId],
      references: [departments.id],
    }),
    project: one(projects, {
      fields: [recurringExpenses.projectId],
      references: [projects.id],
    }),
    currency: one(currencies, {
      fields: [recurringExpenses.currencyId],
      references: [currencies.id],
    }),
    runs: many(recurringExpenseRuns),
  })
);

export const recurringExpenseRunsRelations = relations(
  recurringExpenseRuns,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [recurringExpenseRuns.tenantId],
      references: [tenants.id],
    }),
    recurringExpense: one(recurringExpenses, {
      fields: [recurringExpenseRuns.recurringExpenseId],
      references: [recurringExpenses.id],
    }),
    journalEntry: one(journalEntries, {
      fields: [recurringExpenseRuns.journalEntryId],
      references: [journalEntries.id],
    }),
    purchaseInvoice: one(purchaseInvoices, {
      fields: [recurringExpenseRuns.purchaseInvoiceId],
      references: [purchaseInvoices.id],
    }),
    paymentTransaction: one(transactions, {
      fields: [recurringExpenseRuns.paymentTransactionId],
      references: [transactions.id],
    }),
    processedBy: one(users, {
      fields: [recurringExpenseRuns.processedById],
      references: [users.id],
    }),
  })
);

// ─── Units ────────────────────────────────────────────────────────
export const unitsRelations = relations(units, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [units.tenantId],
    references: [tenants.id],
  }),
  baseUnit: one(units, {
    fields: [units.baseUnitId],
    references: [units.id],
    relationName: "baseUnit",
  }),
  derivedUnits: many(units, { relationName: "baseUnit" }),
  productUnits: many(productUnits),
}));

// ─── Product Units ────────────────────────────────────────────────
export const productUnitsRelations = relations(productUnits, ({ one }) => ({
  tenant: one(tenants, {
    fields: [productUnits.tenantId],
    references: [tenants.id],
  }),
  product: one(products, {
    fields: [productUnits.productId],
    references: [products.id],
  }),
  unit: one(units, {
    fields: [productUnits.unitId],
    references: [units.id],
  }),
}));

// ─── Categories ───────────────────────────────────────────────────
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [categories.tenantId],
    references: [tenants.id],
  }),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryHierarchy",
  }),
  children: many(categories, { relationName: "categoryHierarchy" }),
}));

// ─── Roles ────────────────────────────────────────────────────────
export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [roles.tenantId],
    references: [tenants.id],
  }),
  userRoles: many(userRoles),
}));

// ─── User Roles ───────────────────────────────────────────────────
export const userRolesRelations = relations(userRoles, ({ one }) => ({
  tenant: one(tenants, {
    fields: [userRoles.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

// ─── Permissions ──────────────────────────────────────────────────
export const permissionsRelations = relations(permissions, () => ({}));

// ─── Documents ────────────────────────────────────────────────────
export const documentsRelations = relations(documents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [documents.tenantId],
    references: [tenants.id],
  }),
  fileUpload: one(fileUploads, {
    fields: [documents.fileUploadId],
    references: [fileUploads.id],
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedById],
    references: [users.id],
  }),
}));

// ─── Messages ─────────────────────────────────────────────────────
export const messagesRelations = relations(messages, ({ one }) => ({
  tenant: one(tenants, {
    fields: [messages.tenantId],
    references: [tenants.id],
  }),
}));

// ─── POS Sessions ─────────────────────────────────────────────────
export const posSessionsRelations = relations(posSessions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [posSessions.tenantId],
    references: [tenants.id],
  }),
  openedBy: one(users, {
    fields: [posSessions.openedById],
    references: [users.id],
  }),
  branch: one(branches, {
    fields: [posSessions.branchId],
    references: [branches.id],
  }),
  device: one(devices, {
    fields: [posSessions.deviceId],
    references: [devices.id],
  }),
  currency: one(currencies, {
    fields: [posSessions.currencyId],
    references: [currencies.id],
  }),
}));

// ─── POS Orders ───────────────────────────────────────────────────
export const posOrdersRelations = relations(posOrders, ({ one }) => ({
  tenant: one(tenants, {
    fields: [posOrders.tenantId],
    references: [tenants.id],
  }),
  session: one(posSessions, {
    fields: [posOrders.sessionId],
    references: [posSessions.id],
  }),
  salesInvoice: one(salesInvoices, {
    fields: [posOrders.salesInvoiceId],
    references: [salesInvoices.id],
  }),
  createdBy: one(users, {
    fields: [posOrders.createdById],
    references: [users.id],
  }),
  currency: one(currencies, {
    fields: [posOrders.currencyId],
    references: [currencies.id],
  }),
}));

// ─── Sales Reps ───────────────────────────────────────────────────
export const salesRepsRelations = relations(salesReps, ({ one }) => ({
  tenant: one(tenants, {
    fields: [salesReps.tenantId],
    references: [tenants.id],
  }),
  currency: one(currencies, {
    fields: [salesReps.currencyId],
    references: [currencies.id],
  }),
}));

// ─── Offers ───────────────────────────────────────────────────────
export const offersRelations = relations(offers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [offers.tenantId],
    references: [tenants.id],
  }),
  product: one(products, {
    fields: [offers.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [offers.categoryId],
    references: [categories.id],
  }),
}));

// ─── Warehouse Stock ───────────────────────────────────────────────
export const warehouseStockRelations = relations(warehouseStock, ({ one }) => ({
  tenant: one(tenants, {
    fields: [warehouseStock.tenantId],
    references: [tenants.id],
  }),
  product: one(products, {
    fields: [warehouseStock.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [warehouseStock.warehouseId],
    references: [warehouses.id],
  }),
}));

// ─── Inventory Batches ─────────────────────────────────────────────
export const inventoryBatchesRelations = relations(
  inventoryBatches,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [inventoryBatches.tenantId],
      references: [tenants.id],
    }),
    product: one(products, {
      fields: [inventoryBatches.productId],
      references: [products.id],
    }),
    warehouse: one(warehouses, {
      fields: [inventoryBatches.warehouseId],
      references: [warehouses.id],
    }),
    purchaseInvoice: one(purchaseInvoices, {
      fields: [inventoryBatches.purchaseInvoiceId],
      references: [purchaseInvoices.id],
    }),
  })
);

// ─── Stock Reservations ────────────────────────────────────────────
export const stockReservationsRelations = relations(
  stockReservations,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [stockReservations.tenantId],
      references: [tenants.id],
    }),
    product: one(products, {
      fields: [stockReservations.productId],
      references: [products.id],
    }),
    warehouse: one(warehouses, {
      fields: [stockReservations.warehouseId],
      references: [warehouses.id],
    }),
    batch: one(inventoryBatches, {
      fields: [stockReservations.batchId],
      references: [inventoryBatches.id],
    }),
    customer: one(customers, {
      fields: [stockReservations.customerId],
      references: [customers.id],
    }),
  })
);

// ─── Cycle Counts ──────────────────────────────────────────────────
export const cycleCountsRelations = relations(cycleCounts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [cycleCounts.tenantId],
    references: [tenants.id],
  }),
  warehouse: one(warehouses, {
    fields: [cycleCounts.warehouseId],
    references: [warehouses.id],
  }),
  approvedBy: one(users, {
    fields: [cycleCounts.approvedById],
    references: [users.id],
  }),
  assignedTo: one(users, {
    fields: [cycleCounts.assignedToId],
    references: [users.id],
  }),
  lines: many(cycleCountLines),
  workSite: one(workSites, {
    fields: [cycleCounts.workSiteId],
    references: [workSites.id],
  }),
  device: one(devices, {
    fields: [cycleCounts.deviceId],
    references: [devices.id],
  }),
}));

export const cycleCountLinesRelations = relations(
  cycleCountLines,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [cycleCountLines.tenantId],
      references: [tenants.id],
    }),
    cycleCount: one(cycleCounts, {
      fields: [cycleCountLines.cycleCountId],
      references: [cycleCounts.id],
    }),
    product: one(products, {
      fields: [cycleCountLines.productId],
      references: [products.id],
    }),
    warehouse: one(warehouses, {
      fields: [cycleCountLines.warehouseId],
      references: [warehouses.id],
    }),
    batch: one(inventoryBatches, {
      fields: [cycleCountLines.batchId],
      references: [inventoryBatches.id],
    }),
    countedBy: one(users, {
      fields: [cycleCountLines.countedById],
      references: [users.id],
    }),
  })
);

// ─── Inventory Valuation Layers ────────────────────────────────────
export const inventoryValuationLayersRelations = relations(
  inventoryValuationLayers,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [inventoryValuationLayers.tenantId],
      references: [tenants.id],
    }),
    product: one(products, {
      fields: [inventoryValuationLayers.productId],
      references: [products.id],
    }),
    warehouse: one(warehouses, {
      fields: [inventoryValuationLayers.warehouseId],
      references: [warehouses.id],
    }),
    batch: one(inventoryBatches, {
      fields: [inventoryValuationLayers.batchId],
      references: [inventoryBatches.id],
    }),
  })
);
