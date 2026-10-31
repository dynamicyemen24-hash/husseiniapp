import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  decimal,
  boolean,
  integer,
  pgEnum,
  index,
  uniqueIndex,
  unique,
  jsonb,
  serial as serialType,
  uuid,
  check,
  primaryKey,
  foreignKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// â”€â”€â”€ Enums â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const userRoleEnum = pgEnum("role", [
  "admin",
  "auditor",
  "accountant",
  "owner",
  "user",
]);
export const accountTypeEnum = pgEnum("account_type", [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "debit",
  "credit",
]);
export const lifecycleStatusEnum = pgEnum("lifecycle_status", [
  "saved",
  "approved",
  "sent",
  "posted",
  "completed",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trial",
  "active",
  "grace",
  "suspended",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "submitted",
  "pending_approval",
  "approved",
  "posted",
  "closed",
  "voided",
  "reversed",
  "cancelled",
  "rejected",
]);
export const masterStatusEnum = pgEnum("master_status", [
  "draft",
  "active",
  "inactive",
  "suspended",
  "archived",
]);
export const operationStatusEnum = pgEnum("operation_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
  "reversed",
]);
export const workflowStageEnum = pgEnum("workflow_stage", [
  "entry",
  "review",
  "approval",
  "posting",
  "integration",
  "closed",
]);
export const statusActionEnum = pgEnum("status_action", [
  "CREATE",
  "SUBMIT",
  "RETURN",
  "APPROVE",
  "REJECT",
  "POST",
  "VOID",
  "REVERSE",
  "CANCEL",
  "ARCHIVE",
  "ACTIVATE",
  "DEACTIVATE",
  "SUSPEND",
]);
export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "synced",
  "failed",
  "conflict",
]);


export const drugScheduleEnum = pgEnum("drug_schedule", [
  "OTC",
  "PRESCRIPTION",
  "CONTROLLED",
  "PSYCHOTROPIC",
  "THERAPEUTIC",
]);
export const prescriptionStatusEnum = pgEnum("prescription_status", [
  "pending",
  "verified",
  "dispensed",
  "cancelled",
  "expired",
]);
export const drugInteractionSeverityEnum = pgEnum("drug_interaction_severity", [
  "MAJOR",
  "MODERATE",
  "MINOR",
]);
// â”€â”€â”€ Users table for multi-tenant SaaS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    openId: varchar("openId", { length: 255 }).notNull().unique(),
    tenantId: integer("tenantId").references(() => tenants.id),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }),
    loginMethod: varchar("loginMethod", { length: 50 }),
    username: varchar("username", { length: 120 }),
    passwordHash: text("passwordHash"),
    role: userRoleEnum("role").default("user").notNull(),
    themePreference: varchar("themePreference", { length: 20 })
      .default("dark")
      .notNull(),
    emailNotifications: boolean("emailNotifications").default(true).notNull(),
    whatsappNotifications: boolean("whatsappNotifications")
      .default(true)
      .notNull(),
    compactMode: boolean("compactMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
    // Security & session tracking
    currentSessionId: uuid("currentSessionId"),
    sessionCount: integer("session_count").default(0).notNull(),
    lastActivity: timestamp("lastActivity").defaultNow().notNull(),
    deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
    failedLoginAttempts: integer("failedLoginAttempts").default(0).notNull(),
    lockedUntil: timestamp("lockedUntil"),
    passwordChangedAt: timestamp("passwordChangedAt").defaultNow().notNull(),
    mfaEnabled: boolean("mfaEnabled").default(false).notNull(),
    mfaSecret: varchar("mfaSecret", { length: 255 }),
    // Email verification & password reset
    emailVerified: boolean("emailVerified").default(false).notNull(),
    verificationToken: varchar("verificationToken", { length: 128 }),
    verificationTokenExpiry: timestamp("verificationTokenExpiry"),
    resetToken: varchar("resetToken", { length: 128 }),
    resetTokenExpiry: timestamp("resetTokenExpiry"),
  },
  t => [
    // PERFORMANCE: Index for tenant-scoped user lookups
    index("idx_users_tenant").on(t.tenantId),
    index("idx_users_session").on(t.currentSessionId),
    index("idx_users_session_count").on(t.sessionCount),
    index("idx_users_email").on(t.email),
    index("idx_users_username").on(t.username),
    index("idx_users_fingerprint").on(t.deviceFingerprint),
  ]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// â”€â”€â”€ Login attempts audit (device + geo, for lockout & security map) â”€â”€â”€
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").references(() => tenants.id),
    userId: integer("userId").references(() => users.id),
    username: varchar("username", { length: 120 }),
    success: boolean("success").notNull(),
    ip: varchar("ip", { length: 64 }),
    userAgent: text("userAgent"),
    device: varchar("device", { length: 120 }),
    deviceFingerprint: varchar("deviceFingerprint", { length: 255 }),
    country: varchar("country", { length: 100 }),
    city: varchar("city", { length: 120 }),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    riskScore: integer("riskScore").default(0).notNull(),
    riskFactors: jsonb("riskFactors"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_login_attempts_username").on(t.username),
    index("idx_login_attempts_user").on(t.userId),
    index("idx_login_attempts_created").on(t.createdAt),
    index("idx_login_attempts_tenant_created").on(t.tenantId, t.createdAt),
    index("idx_login_attempts_ip").on(t.ip),
    index("idx_login_attempts_device").on(t.deviceFingerprint),
  ]
);
export type LoginAttempt = typeof loginAttempts.$inferSelect;

// â”€â”€â”€ Tenants (Institutions) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const tenants = pgTable(
  "tenants",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    ownerUserId: integer("ownerUserId"),
    currency: varchar("currency", { length: 20 }).default("YER").notNull(),
    country: varchar("country", { length: 100 }).default("Ø§Ù„ÙŠÙ…Ù†").notNull(),
    subscriptionPlan: varchar("subscriptionPlan", { length: 50 })
      .default("standard")
      .notNull(),
    sector: varchar("sector", { length: 50 }).default("general").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [check("chk_tenant_currency_valid", sql`${t.currency} ~ '^[A-Z]{3}$'`)]
);

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// â”€â”€â”€ Branches â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const branches = pgTable(
  "branches",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    city: varchar("city", { length: 100 }),
    isMain: boolean("isMain").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    unique("branches_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_branch_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;

// â”€â”€â”€ User branch permissions & custom roles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const userBranchPermissions = pgTable(
  "user_branch_permissions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    userId: integer("userId")
      .notNull()
      .references(() => users.id),
    branchId: integer("branchId").notNull(),
    canView: boolean("canView").default(true).notNull(),
    canInsert: boolean("canInsert").default(true).notNull(),
    canApprove: boolean("canApprove").default(false).notNull(),
    canPost: boolean("canPost").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    unique("userBranchPermissions_tenant_user_branch_unique").on(
      t.tenantId,
      t.userId,
      t.branchId
    ),
  ]
);

export type UserBranchPermission = typeof userBranchPermissions.$inferSelect;
export type InsertUserBranchPermission =
  typeof userBranchPermissions.$inferInsert;

// â”€â”€â”€ Chart of Accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: accountTypeEnum("type").notNull(),
    parentAccountId: integer("parentAccountId").references(
      (): AnyPgColumn => accounts.id
    ),
    category: varchar("category", { length: 100 }),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    isCustom: boolean("isCustom").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_accounts_tenant").on(t.tenantId),
    index("idx_accounts_tenant_type").on(t.tenantId, t.type),
    unique("accounts_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_account_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

// â”€â”€â”€ Financial Transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    accountId: integer("accountId")
      .notNull()
      .references(() => accounts.id),
    branchId: integer("branchId").references(() => branches.id),
    costCenterId: integer("costCenterId").references(() => costCenters.id),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    type: transactionTypeEnum("type").default("debit").notNull(),
    transactionDate: timestamp("transactionDate").notNull(),
    narration: varchar("narration", { length: 500 }),
    notes: text("notes"),
    lifecycleStatus: lifecycleStatusEnum("lifecycleStatus")
      .default("saved")
      .notNull(),
    isReversed: boolean("isReversed").default(false).notNull(),
    reversalReason: varchar("reversalReason", { length: 255 }),
    referenceType: varchar("referenceType", { length: 50 }),
    referenceId: integer("referenceId"),
    journalEntryId: integer("journalEntryId").references(
      () => journalEntries.id
    ),
    sourceModule: varchar("sourceModule", { length: 50 }),
    userId: integer("userId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    // Financial constraints
    currencyId: integer("currencyId").references(() => currencies.id),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    baseAmount: decimal("baseAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
  },
  t => [
    index("idx_transactions_tenant").on(t.tenantId),
    index("idx_transactions_account").on(t.accountId),
    index("idx_transactions_date").on(t.transactionDate),
    index("idx_transactions_branch").on(t.branchId),
    index("idx_transactions_reference").on(t.referenceType, t.referenceId),
    index("idx_transactions_currency").on(t.currencyId),
    // PERFORMANCE: Composite indexes for frequently filtered queries
    index("idx_transactions_tenant_status").on(t.tenantId, t.lifecycleStatus),
    index("idx_transactions_tenant_reversed").on(t.tenantId, t.isReversed),
    index("idx_transactions_tenant_date").on(t.tenantId, t.transactionDate),
    index("idx_transactions_tenant_account_date").on(
      t.tenantId,
      t.accountId,
      t.transactionDate
    ),
    check("chk_transaction_amount_not_negative", sql`${t.amount} >= 0`),
    check(
      "chk_transaction_base_amount_not_negative",
      sql`${t.baseAmount} >= 0`
    ),
    check("chk_transaction_exchange_rate_positive", sql`${t.exchangeRate} > 0`),
    check("chk_transaction_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
    check("chk_transaction_account_not_null", sql`${t.accountId} IS NOT NULL`),
  ]
);

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// â”€â”€â”€ Opening Balances â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const openingBalances = pgTable(
  "opening_balances",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    accountId: integer("accountId")
      .notNull()
      .references(() => accounts.id),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    type: transactionTypeEnum("type").default("debit").notNull(),
    notes: text("notes"),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    baseAmount: decimal("baseAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
  },
  t => [
    index("idx_openingBalances_tenant").on(t.tenantId),
    unique("openingBalances_account_period_tenant_unique").on(
      t.accountId,
      t.periodName,
      t.tenantId
    ),
    check("chk_opening_balance_amount_not_negative", sql`${t.amount} >= 0`),
    check(
      "chk_opening_balance_exchange_rate_positive",
      sql`${t.exchangeRate} > 0`
    ),
  ]
);

export type OpeningBalance = typeof openingBalances.$inferSelect;
export type InsertOpeningBalance = typeof openingBalances.$inferInsert;

// â”€â”€â”€ Budgets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const budgets = pgTable(
  "budgets",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    targetRevenue: decimal("targetRevenue", {
      precision: 15,
      scale: 2,
    }).notNull(),
    targetExpense: decimal("targetExpense", {
      precision: 15,
      scale: 2,
    }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_budgets_tenant").on(t.tenantId),
    unique("budgets_tenant_period_unique").on(t.tenantId, t.periodName),
    check("chk_budget_revenue_not_negative", sql`${t.targetRevenue} >= 0`),
    check("chk_budget_expense_not_negative", sql`${t.targetExpense} >= 0`),
  ]
);

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

// â”€â”€â”€ Fiscal Periods (Ø¥Ù‚ÙØ§Ù„ Ø§Ù„ÙØªØ±Ø§Øª Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠØ©) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const fiscalPeriodStatusEnum = pgEnum("fiscal_period_status", [
  "open",
  "closing",
  "closed",
  "reopened",
]);

export const fiscalPeriods = pgTable(
  "fiscal_periods",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 50 }).notNull(), // e.g., "2026", "Q1-2026"
    label: varchar("label", { length: 100 }), // e.g., "Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ© 2026"
    startDate: timestamp("startDate").notNull(),
    endDate: timestamp("endDate").notNull(),
    status: fiscalPeriodStatusEnum("status").default("open").notNull(),
    closedAt: timestamp("closedAt"),
    closedById: integer("closedById").references(() => users.id),
    reopenedAt: timestamp("reopenedAt"),
    reopenedById: integer("reopenedById").references(() => users.id),
    reopenReason: varchar("reopenReason", { length: 255 }),
    closingEntryId: integer("closingEntryId"), // FK to journal_entries
    retainedEarningsAccountId: integer("retainedEarningsAccountId"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_fiscal_periods_tenant").on(t.tenantId),
    index("idx_fiscal_periods_status").on(t.status),
    // PERFORMANCE: Ø§Ù„ÙØªØ±Ø§Øª ØªÙÙ‚Ø±Ø£ Ù…Ø±ØªØ¨Ø© Ø­Ø³Ø¨ Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„ÙØªØ±Ø© Ø¯Ø§Ø®Ù„ Ø§Ù„Ù…Ø¤Ø³Ø³Ø©
    index("idx_fiscal_periods_tenant_start").on(t.tenantId, t.startDate),
    unique("fiscal_periods_tenant_name_unique").on(t.tenantId, t.name),
    check("chk_fiscal_period_dates", sql`${t.startDate} <= ${t.endDate}`),
    check("chk_fiscal_period_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type FiscalPeriod = typeof fiscalPeriods.$inferSelect;
export type InsertFiscalPeriod = typeof fiscalPeriods.$inferInsert;

// â”€â”€â”€ Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const settings = pgTable(
  "settings",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .unique()
      .references(() => tenants.id),
    institutionName: varchar("institutionName", { length: 255 })
      .default("Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø³ÙŠÙ†ÙŠØ© Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø£Ø¹Ù…Ø§Ù„")
      .notNull(),
    currency: varchar("currency", { length: 50 })
      .default("Ø±ÙŠØ§Ù„ ÙŠÙ…Ù†ÙŠ (YER)")
      .notNull(),
    country: varchar("country", { length: 100 }).default("Ø§Ù„ÙŠÙ…Ù†").notNull(),
    accountingPeriod: varchar("accountingPeriod", { length: 50 })
      .default("2026")
      .notNull(),
    managerName: varchar("managerName", { length: 255 })
      .default("Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¤Ø³Ø³Ø©")
      .notNull(),
    notes: text("notes"),
    subscriptionStatus: subscriptionStatusEnum("subscriptionStatus")
      .default("trial")
      .notNull(),
    trialEndsAt: timestamp("trialEndsAt"),
    // â”€â”€â”€ POS / Sales configuration (stored as JSON text) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    posConfig: text("posConfig"),
    salesPolicy: text("salesPolicy"),
    paymentMethods: text("paymentMethods"),
    postingRules: text("postingRules"),
    // â”€â”€â”€ ZATCA (Saudi e-invoicing) configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    zatcaConfig: text("zatcaConfig"),
    // â”€â”€â”€ Document template (invoices/quotations/statements) â”€â”€â”€â”€â”€â”€â”€â”€
    documentTemplate: text("documentTemplate"),
    // â”€â”€â”€ Communication / sharing (whatsapp & email) config â”€â”€â”€â”€â”€â”€â”€â”€â”€
    communicationConfig: text("communicationConfig"),
    /** Encrypted tenant-managed OpenAI-compatible provider configuration. */
    externalAIConfig: text("externalAIConfig"),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [check("chk_settings_tenant_not_null", sql`${t.tenantId} IS NOT NULL`)]
);

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

// â”€â”€â”€ Activity Logs / Audit Trail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").references(() => tenants.id),
    userId: integer("userId").references(() => users.id),
    sessionId: uuid("sessionId"),
    userName: varchar("userName", { length: 255 }),
    action: varchar("action", { length: 255 }).notNull(),
    entityType: varchar("entityType", { length: 100 }),
    entityId: integer("entityId"),
    details: text("details"),
    // Device & geo context
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: varchar("userAgent", { length: 500 }),
    deviceId: integer("deviceId"),
    deviceFingerprint: varchar("deviceFingerprint", { length: 255 }),
    country: varchar("country", { length: 100 }),
    city: varchar("city", { length: 120 }),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    // Audit chain
    previousHash: varchar("previousHash", { length: 64 }),
    currentHash: varchar("currentHash", { length: 64 }).default("").notNull(),
    chainSequence: integer("chainSequence").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_activityLogs_tenant").on(t.tenantId),
    index("idx_activityLogs_user").on(t.userId),
    index("idx_activityLogs_session").on(t.sessionId),
    index("idx_activityLogs_entity").on(t.entityType, t.entityId),
    index("idx_activityLogs_created").on(t.createdAt),
    index("idx_activityLogs_chain").on(t.tenantId, t.chainSequence),
  ]
);

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

// â”€â”€â”€ Products & Inventory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const productTypeEnum = pgEnum("product_type", ["goods", "service"]);
export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "in",
  "out",
  "transfer",
  "adjustment",
]);

// Advanced inventory enums
export const inventoryTrackingTypeEnum = pgEnum("inventory_tracking_type", [
  "none",
  "serial",
  "batch",
  "matrix",
]);

export const batchStatusEnum = pgEnum("batch_status", [
  "active",
  "expired",
  "recalled",
  "consumed",
]);

export const serialStatusEnum = pgEnum("serial_status", [
  "available",
  "sold",
  "reserved",
  "returned",
  "damaged",
  "stolen",
]);

export const inventoryAllocationTypeEnum = pgEnum("inventory_allocation_type", [
  "serial",
  "batch",
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "in",
  "out",
  "transfer",
  "adjustment",
  "return",
  "production",
  "waste",
]);

// â”€â”€â”€ Standard global governance columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Reused across documents to provide audit, traceability, work-site/device
// context, geo-coordinates, and a unified global numbering that is unique
// per (tenant, globalCode) so documents never collide across user / branch /
// institution / subscriber.
export function govColumns() {
  return {
    country: varchar("country", { length: 100 }).default("Ø§Ù„ÙŠÙ…Ù†"),
    workSiteId: integer("workSiteId"),
    deviceId: integer("deviceId"),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    globalCode: varchar("globalCode", { length: 160 }),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  };
}

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    nameAr: varchar("nameAr", { length: 255 }),
    type: productTypeEnum("type").default("goods").notNull(),
    category: varchar("category", { length: 100 }),
    country: varchar("country", { length: 100 }).default("Ø§Ù„ÙŠÙ…Ù†"),
    unit: varchar("unit", { length: 50 }).default("Ù‚Ø·Ø¹Ø©").notNull(),
    purchasePrice: decimal("purchasePrice", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    salePrice: decimal("salePrice", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    wholesalePrice: decimal("wholesalePrice", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    minStock: integer("minStock").default(0).notNull(),
    currentStock: integer("currentStock").default(0).notNull(),
    barcode: varchar("barcode", { length: 100 }),
    supplierId: integer("supplierId").references(() => suppliers.id),
    unitId: integer("unitId"),
    categoryId: integer("categoryId").references(() => categories.id),
    description: text("description"),
    // Per-item account linkage (overrides tenant default posting rules)
    salesAccountId: integer("salesAccountId"),
    cogsAccountId: integer("cogsAccountId"),
    inventoryAccountId: integer("inventoryAccountId"),
    // â”€â”€â”€ Inventory / unit flexibility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    unitOfMeasure: varchar("unitOfMeasure", { length: 50 })
      .default("Ù‚Ø·Ø¹Ø©")
      .notNull(),
    secondaryUnit: varchar("secondaryUnit", { length: 50 }),
    conversionFactor: decimal("conversionFactor", { precision: 15, scale: 4 })
      .default("1")
      .notNull(),
    // â”€â”€â”€ Composite / bundled items (Bill of Materials) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    isComposite: boolean("isComposite").default(false).notNull(),
    bom: text("bom"), // JSON: [{ componentProductId, quantity }]
    alternativeIds: text("alternativeIds"), // JSON: number[]
    attachmentUrl: text("attachmentUrl"),
    // â”€â”€â”€ Services costing & pricing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    costMethod: varchar("costMethod", { length: 30 })
      .default("average")
      .notNull(),
    directCost: decimal("directCost", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    indirectCost: decimal("indirectCost", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    productionMinutes: integer("productionMinutes"),
    priceMode: varchar("priceMode", { length: 20 }).default("direct").notNull(), // direct | costPlus
    marginPct: decimal("marginPct", { precision: 6, scale: 2 })
      .default("0")
      .notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    // â”€â”€â”€ Reorder automation (Module C) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    reorderPoint: decimal("reorderPoint", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    reorderQty: decimal("reorderQty", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    // â”€â”€â”€ Pharmacy fields (FDA/WHO aligned) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drugSchedule: drugScheduleEnum("drug_schedule").default("OTC"),
    requiresPrescription: boolean("requires_prescription")
      .default(false)
      .notNull(),
    scientificName: varchar("scientific_name", { length: 255 }),
    ndcCode: varchar("ndc_code", { length: 50 }),
    activeIngredients: text("active_ingredients"),
    contraindications: text("contraindications"),
    sideEffects: text("side_effects"),
    storageConditions: varchar("storage_conditions", { length: 255 }),
    dosageForm: varchar("dosage_form", { length: 50 }),
    strength: varchar("strength", { length: 50 }),
    maxQuantityPerSale: integer("max_quantity_per_sale").default(999).notNull(),
    manufacturer: varchar("manufacturer", { length: 255 }),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_products_tenant").on(t.tenantId),
    index("idx_products_tenant_deleted").on(t.tenantId, t.deletedAt),
    index("idx_products_category").on(t.category),
    index("idx_products_supplier").on(t.supplierId),
    index("idx_products_currency").on(t.currencyId),
    // PERFORMANCE: Ø§Ù„Ù‚ÙˆØ§Ø¦Ù… Ù…Ø±ØªØ¨Ø© Ø¨Ø§Ù„Ø±Ù…Ø² Ø¯Ø§Ø®Ù„ Ø§Ù„Ù…Ø¤Ø³Ø³Ø© Ù…Ø¹ ÙÙ„ØªØ± Ø§Ù„Ø­Ø°Ù
    index("idx_products_tenant_code_deleted").on(
      t.tenantId,
      t.code,
      t.deletedAt
    ),
    unique("products_code_tenant_unique").on(t.code, t.tenantId),
    check(
      "chk_product_purchase_price_not_negative",
      sql`${t.purchasePrice} >= 0`
    ),
    check("chk_product_sale_price_not_negative", sql`${t.salePrice} >= 0`),
    check(
      "chk_product_wholesale_price_not_negative",
      sql`${t.wholesalePrice} >= 0`
    ),
    check(
      "chk_product_conversion_factor_positive",
      sql`${t.conversionFactor} > 0`
    ),
    check("chk_product_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export const warehouses = pgTable(
  "warehouses",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_warehouses_tenant").on(t.tenantId),
    unique("warehouses_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_warehouse_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = typeof warehouses.$inferInsert;

// â”€â”€â”€ Work sites / locations (Ù…ÙˆØ§Ù‚Ø¹ Ø§Ù„Ø¹Ù…Ù„) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const workSites = pgTable(
  "work_sites",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address"),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_workSites_tenant").on(t.tenantId),
    unique("workSites_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_workSite_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type WorkSite = typeof workSites.$inferSelect;
export type InsertWorkSite = typeof workSites.$inferInsert;

// â”€â”€â”€ Devices (Ø§Ù„Ø£Ø¬Ù‡Ø²Ø©: POS, scanner, scale, others) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const devices = pgTable(
  "devices",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 30 }).default("pos").notNull(), // pos | scanner | scale | other
    workSiteId: integer("workSiteId"),
    location: varchar("location", { length: 255 }),
    lastSeenAt: timestamp("lastSeenAt"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    // Device fingerprinting
    fingerprint: varchar("fingerprint", { length: 255 }).unique(),
    os: varchar("os", { length: 100 }),
    osVersion: varchar("osVersion", { length: 50 }),
    appVersion: varchar("appVersion", { length: 50 }),
    publicKey: text("publicKey"), // For device attestation
  },
  t => [
    index("idx_devices_tenant").on(t.tenantId),
    unique("devices_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_device_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    warehouseId: integer("warehouseId").references(() => warehouses.id),
    type: inventoryMovementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    referenceId: integer("referenceId"),
    referenceType: varchar("referenceType", { length: 50 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_inventoryMovements_tenant").on(t.tenantId),
    index("idx_inventoryMovements_product").on(t.productId),
    index("idx_inventoryMovements_warehouse").on(t.warehouseId),
    check("chk_inventory_movement_quantity_not_zero", sql`${t.quantity} != 0`),
    check(
      "chk_inventory_movement_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;

// ============================================
// ADVANCED INVENTORY TABLES
// ============================================

// Product Variants (e.g., Size, Color combinations)
export const productVariants = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    nameAr: varchar("nameAr", { length: 255 }),
    attributes: jsonb("attributes").notNull(), // {color: "Red", size: "L"}
    barcode: varchar("barcode", { length: 100 }),
    salePrice: decimal("salePrice", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    wholesalePrice: decimal("wholesalePrice", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    costPrice: decimal("costPrice", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    currentStock: integer("currentStock").default(0).notNull(),
    minStock: integer("minStock").default(0).notNull(),
    maxStock: integer("maxStock"),
    weight: decimal("weight", { precision: 10, scale: 3 }),
    dimensions: jsonb("dimensions"), // {length, width, height}
    imageUrl: text("imageUrl"),
    trackingType: inventoryTrackingTypeEnum("trackingType")
      .default("none")
      .notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_productVariants_tenant").on(t.tenantId),
    index("idx_productVariants_product").on(t.productId),
    unique("productVariants_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_productVariant_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = typeof productVariants.$inferInsert;

// Product Batches/Lots
export const productBatches = pgTable(
  "product_batches",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    variantId: integer("variantId"),
    batchNumber: varchar("batchNumber", { length: 100 }).notNull(),
    manufactureDate: timestamp("manufactureDate"),
    expiryDate: timestamp("expiryDate"),
    receivedDate: timestamp("receivedDate").defaultNow().notNull(),
    quantityReceived: integer("quantityReceived").notNull(),
    quantityRemaining: integer("quantityRemaining").notNull(),
    unitCost: decimal("unitCost", { precision: 15, scale: 2 }).notNull(),
    supplierId: integer("supplierId").references(() => suppliers.id),
    purchaseOrderId: integer("purchaseOrderId"),
    warehouseId: integer("warehouseId")
      .notNull()
      .references(() => warehouses.id),
    location: varchar("location", { length: 100 }), // Bin/rack location
    status: batchStatusEnum("status").default("active").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_productBatches_tenant").on(t.tenantId),
    index("idx_productBatches_product").on(t.productId),
    index("idx_productBatches_variant").on(t.variantId),
    index("idx_productBatches_warehouse").on(t.warehouseId),
    index("idx_productBatches_expiry").on(t.expiryDate),
    unique("productBatches_number_tenant_unique").on(t.batchNumber, t.tenantId),
    check("chk_productBatch_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type ProductBatch = typeof productBatches.$inferSelect;
export type InsertProductBatch = typeof productBatches.$inferInsert;

// Product Serial Numbers
export const productSerials = pgTable(
  "product_serials",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    variantId: integer("variantId"),
    batchId: integer("batchId").references(() => inventoryBatches.id),
    serialNumber: varchar("serialNumber", { length: 100 }).notNull(),
    status: serialStatusEnum("status").default("available").notNull(),
    warehouseId: integer("warehouseId")
      .notNull()
      .references(() => warehouses.id),
    location: varchar("location", { length: 100 }),
    soldAt: timestamp("soldAt"),
    soldToInvoiceId: integer("soldToInvoiceId"),
    soldToCustomerId: integer("soldToCustomerId"),
    costPrice: decimal("costPrice", { precision: 15, scale: 2 }),
    warrantyExpiryDate: timestamp("warrantyExpiryDate"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_productSerials_tenant").on(t.tenantId),
    index("idx_productSerials_product").on(t.productId),
    index("idx_productSerials_variant").on(t.variantId),
    index("idx_productSerials_batch").on(t.batchId),
    index("idx_productSerials_warehouse").on(t.warehouseId),
    index("idx_productSerials_status").on(t.status),
    unique("productSerials_number_tenant_unique").on(
      t.serialNumber,
      t.tenantId
    ),
    check("chk_productSerial_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type ProductSerial = typeof productSerials.$inferSelect;
export type InsertProductSerial = typeof productSerials.$inferInsert;

// Matrix Dimensions (e.g., Color, Size)
export const matrixDimensions = pgTable(
  "matrix_dimensions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 100 }).notNull(),
    nameAr: varchar("nameAr", { length: 100 }),
    code: varchar("code", { length: 50 }).notNull(),
    displayOrder: integer("displayOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_matrixDimensions_tenant").on(t.tenantId),
    unique("matrixDimensions_code_tenant_unique").on(t.code, t.tenantId),
    check(
      "chk_matrixDimension_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type MatrixDimension = typeof matrixDimensions.$inferSelect;
export type InsertMatrixDimension = typeof matrixDimensions.$inferInsert;

// Matrix Dimension Values (e.g., Red, Blue / S, M, L)
export const matrixDimensionValues = pgTable(
  "matrix_dimension_values",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    dimensionId: integer("dimensionId").notNull(),
    value: varchar("value", { length: 100 }).notNull(),
    valueAr: varchar("valueAr", { length: 100 }),
    code: varchar("code", { length: 50 }).notNull(),
    displayOrder: integer("displayOrder").default(0).notNull(),
    colorCode: varchar("colorCode", { length: 7 }), // Hex color for UI
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_matrixDimensionValues_tenant").on(t.tenantId),
    index("idx_matrixDimensionValues_dimension").on(t.dimensionId),
    unique("matrixDimensionValues_code_dimension_unique").on(
      t.code,
      t.dimensionId
    ),
    check(
      "chk_matrixDimensionValue_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type MatrixDimensionValue = typeof matrixDimensionValues.$inferSelect;
export type InsertMatrixDimensionValue =
  typeof matrixDimensionValues.$inferInsert;

// Matrix Items (Pre-configured variant combinations)
export const matrixItems = pgTable(
  "matrix_items",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    matrixId: integer("matrixId").notNull(),
    combinationCode: varchar("combinationCode", { length: 50 }).notNull(), // e.g., "RED-L"
    combinationName: varchar("combinationName", { length: 255 }).notNull(),
    combinationNameAr: varchar("combinationNameAr", { length: 255 }),
    variantIds: integer("variantIds").array().notNull(), // References to productVariants
    barcode: varchar("barcode", { length: 100 }),
    salePrice: decimal("salePrice", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    wholesalePrice: decimal("wholesalePrice", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    costPrice: decimal("costPrice", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    currentStock: integer("currentStock").default(0).notNull(),
    minStock: integer("minStock").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_matrixItems_tenant").on(t.tenantId),
    index("idx_matrixItems_product").on(t.productId),
    index("idx_matrixItems_matrix").on(t.matrixId),
    unique("matrixItems_combination_tenant_unique").on(
      t.combinationCode,
      t.tenantId
    ),
    check("chk_matrixItem_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type MatrixItem = typeof matrixItems.$inferSelect;
export type InsertMatrixItem = typeof matrixItems.$inferInsert;

// Inventory Allocations (for serial/batch tracking during POS)
export const inventoryAllocations = pgTable(
  "inventory_allocations",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    type: inventoryAllocationTypeEnum("type").notNull(), // serial | batch
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    variantId: integer("variantId"),
    batchId: integer("batchId").references(() => inventoryBatches.id),
    serialNumbers: text("serialNumbers").array(), // Array of serial numbers
    quantity: integer("quantity").notNull(),
    cartLineId: varchar("cartLineId", { length: 100 }).notNull(),
    sessionId: integer("sessionId"),
    allocatedAt: timestamp("allocatedAt").defaultNow().notNull(),
    releasedAt: timestamp("releasedAt"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_inventoryAllocations_tenant").on(t.tenantId),
    index("idx_inventoryAllocations_product").on(t.productId),
    index("idx_inventoryAllocations_session").on(t.sessionId),
    index("idx_inventoryAllocations_cartLine").on(t.cartLineId),
    check(
      "chk_inventoryAllocation_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type InventoryAllocation = typeof inventoryAllocations.$inferSelect;
export type InsertInventoryAllocation =
  typeof inventoryAllocations.$inferInsert;

// Enhanced Stock Movements with Serial/Batch tracking
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    variantId: integer("variantId"),
    batchId: integer("batchId").references(() => inventoryBatches.id),
    serialIds: integer("serialIds").array(),
    type: stockMovementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    unitCost: decimal("unitCost", { precision: 15, scale: 2 }).notNull(),
    referenceType: varchar("referenceType", { length: 50 }).notNull(),
    referenceId: integer("referenceId"),
    referenceNumber: varchar("referenceNumber", { length: 100 }),
    fromWarehouseId: integer("fromWarehouseId"),
    toWarehouseId: integer("toWarehouseId"),
    fromLocation: varchar("fromLocation", { length: 100 }),
    toLocation: varchar("toLocation", { length: 100 }),
    notes: text("notes"),
    createdBy: integer("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_stockMovements_tenant").on(t.tenantId),
    index("idx_stockMovements_product").on(t.productId),
    index("idx_stockMovements_variant").on(t.variantId),
    index("idx_stockMovements_batch").on(t.batchId),
    index("idx_stockMovements_reference").on(t.referenceType, t.referenceId),
    index("idx_stockMovements_created").on(t.createdAt),
    check("chk_stockMovement_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
    check("chk_stockMovement_quantity_not_zero", sql`${t.quantity} != 0`),
  ]
);

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = typeof stockMovements.$inferInsert;

// â”€â”€â”€ Stock adjustments (audit log for manual corrections / openings) â”€â”€
export const stockAdjustments = pgTable(
  "stock_adjustments",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    ...govColumns(),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    warehouseId: integer("warehouseId").references(() => warehouses.id),
    previousQty: integer("previousQty").notNull(),
    newQty: integer("newQty").notNull(),
    reason: varchar("reason", { length: 100 }).default("ØªØ³ÙˆÙŠØ©"),
    notes: text("notes"),
    userId: integer("userId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_stockAdjustments_tenant").on(t.tenantId),
    unique("stockAdjustments_gc_tenant_unique").on(t.tenantId, t.globalCode),
    check(
      "chk_stock_adjustment_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type StockAdjustment = typeof stockAdjustments.$inferSelect;
export type InsertStockAdjustment = typeof stockAdjustments.$inferInsert;

// â”€â”€â”€ Warehouse transfers (between locations) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const warehouseTransfers = pgTable(
  "warehouse_transfers",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    ...govColumns(),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    fromWarehouseId: integer("fromWarehouseId").notNull(),
    toWarehouseId: integer("toWarehouseId").notNull(),
    quantity: integer("quantity").notNull(),
    notes: text("notes"),
    userId: integer("userId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_warehouseTransfers_tenant").on(t.tenantId),
    unique("warehouseTransfers_gc_tenant_unique").on(t.tenantId, t.globalCode),
    check("chk_warehouse_transfer_quantity_positive", sql`${t.quantity} > 0`),
    check(
      "chk_warehouse_transfer_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
    check(
      "chk_warehouse_transfer_from_to_different",
      sql`${t.fromWarehouseId} != ${t.toWarehouseId}`
    ),
  ]
);

export type WarehouseTransfer = typeof warehouseTransfers.$inferSelect;
export type InsertWarehouseTransfer = typeof warehouseTransfers.$inferInsert;

// â”€â”€â”€ Per-Warehouse Stock Levels (Real-time stock per location) â”€â”€â”€â”€â”€â”€
export const warehouseStock = pgTable(
  "warehouse_stock",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    warehouseId: integer("warehouseId")
      .notNull()
      .references(() => warehouses.id),
    quantity: integer("quantity").default(0).notNull(),
    reservedQty: integer("reservedQty").default(0).notNull(),
    availableQty: integer("availableQty").default(0).notNull(),
    lastMovementAt: timestamp("lastMovementAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_warehouseStock_tenant").on(t.tenantId),
    index("idx_warehouseStock_product").on(t.productId),
    index("idx_warehouseStock_warehouse").on(t.warehouseId),
    unique("warehouseStock_product_warehouse_tenant_unique").on(
      t.productId,
      t.warehouseId,
      t.tenantId
    ),
    check("chk_warehouse_stock_qty_not_negative", sql`${t.quantity} >= 0`),
    check(
      "chk_warehouse_stock_reserved_not_negative",
      sql`${t.reservedQty} >= 0`
    ),
    check(
      "chk_warehouse_stock_available_not_negative",
      sql`${t.availableQty} >= 0`
    ),
    check(
      "chk_warehouse_stock_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type WarehouseStock = typeof warehouseStock.$inferSelect;
export type InsertWarehouseStock = typeof warehouseStock.$inferInsert;

// â”€â”€â”€ Batch/Lot/Serial Tracking (Traceability) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const batchTrackingMethodEnum = pgEnum("batch_tracking_method", [
  "none",
  "batch",
  "lot",
  "serial",
]);

export const inventoryBatches = pgTable(
  "inventory_batches",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    warehouseId: integer("warehouseId")
      .notNull()
      .references(() => warehouses.id),
    batchNumber: varchar("batchNumber", { length: 100 }).notNull(),
    lotNumber: varchar("lotNumber", { length: 100 }),
    serialNumber: varchar("serialNumber", { length: 100 }),
    manufacturingDate: timestamp("manufacturingDate"),
    expiryDate: timestamp("expiryDate"),
    quantity: integer("quantity").default(0).notNull(),
    reservedQty: integer("reservedQty").default(0).notNull(),
    unitCost: decimal("unitCost", { precision: 15, scale: 4 })
      .default("0")
      .notNull(),
    purchaseInvoiceId: integer("purchaseInvoiceId"),
    purchaseInvoiceItemId: integer("purchaseInvoiceItemId"),
    notes: text("notes"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_inventoryBatches_tenant").on(t.tenantId),
    index("idx_inventoryBatches_product").on(t.productId),
    index("idx_inventoryBatches_warehouse").on(t.warehouseId),
    index("idx_inventoryBatches_expiry").on(t.expiryDate),
    index("idx_inventoryBatches_batchNumber").on(t.batchNumber),
    unique("inventoryBatches_product_warehouse_batch_tenant_unique").on(
      t.productId,
      t.warehouseId,
      t.batchNumber,
      t.tenantId
    ),
    check("chk_inventory_batch_qty_not_negative", sql`${t.quantity} >= 0`),
    check(
      "chk_inventory_batch_reserved_not_negative",
      sql`${t.reservedQty} >= 0`
    ),
    check(
      "chk_inventory_batch_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type InventoryBatch = typeof inventoryBatches.$inferSelect;
export type InsertInventoryBatch = typeof inventoryBatches.$inferInsert;

// â”€â”€â”€ Stock Reservations/Allocations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const reservationStatusEnum = pgEnum("reservation_status", [
  "active",
  "fulfilled",
  "released",
  "expired",
]);

export const reservationSourceEnum = pgEnum("reservation_source", [
  "sales_order",
  "purchase_order",
  "production_order",
  "transfer_order",
  "manual",
]);

export const stockReservations = pgTable(
  "stock_reservations",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    warehouseId: integer("warehouseId").references(() => warehouses.id),
    batchId: integer("batchId").references(() => inventoryBatches.id),
    quantity: integer("quantity").notNull(),
    status: reservationStatusEnum("status").default("active").notNull(),
    source: reservationSourceEnum("source").default("manual").notNull(),
    sourceId: integer("sourceId"),
    sourceType: varchar("sourceType", { length: 50 }),
    customerId: integer("customerId").references(() => customers.id),
    expiresAt: timestamp("expiresAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    fulfilledAt: timestamp("fulfilledAt"),
    releasedAt: timestamp("releasedAt"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_stockReservations_tenant").on(t.tenantId),
    index("idx_stockReservations_product").on(t.productId),
    index("idx_stockReservations_warehouse").on(t.warehouseId),
    index("idx_stockReservations_batch").on(t.batchId),
    index("idx_stockReservations_status").on(t.status),
    index("idx_stockReservations_source").on(t.source, t.sourceId),
    index("idx_stockReservations_expires").on(t.expiresAt),
    check("chk_stock_reservation_qty_positive", sql`${t.quantity} > 0`),
    check(
      "chk_stock_reservation_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type StockReservation = typeof stockReservations.$inferSelect;
export type InsertStockReservation = typeof stockReservations.$inferInsert;

// â”€â”€â”€ Cycle Counting (Periodic Physical Inventory) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const cycleCountStatusEnum = pgEnum("cycle_count_status", [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
  "approved",
]);

export const cycleCounts = pgTable(
  "cycle_counts",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    ...govColumns(),
    countNumber: varchar("countNumber", { length: 50 }).notNull(),
    warehouseId: integer("warehouseId")
      .notNull()
      .references(() => warehouses.id),
    status: cycleCountStatusEnum("status").default("planned").notNull(),
    plannedDate: timestamp("plannedDate").notNull(),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    approvedAt: timestamp("approvedAt"),
    approvedById: integer("approvedById").references(() => users.id),
    assignedToId: integer("assignedToId"),
    varianceThreshold: decimal("varianceThreshold", { precision: 5, scale: 2 })
      .default("5")
      .notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_cycleCounts_tenant").on(t.tenantId),
    index("idx_cycleCounts_warehouse").on(t.warehouseId),
    index("idx_cycleCounts_status").on(t.status),
    index("idx_cycleCounts_plannedDate").on(t.plannedDate),
    unique("cycleCounts_countNumber_tenant_unique").on(
      t.countNumber,
      t.tenantId
    ),
    check("chk_cycle_count_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type CycleCount = typeof cycleCounts.$inferSelect;
export type InsertCycleCount = typeof cycleCounts.$inferInsert;

export const cycleCountLines = pgTable(
  "cycle_count_lines",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    cycleCountId: integer("cycleCountId").notNull(),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    warehouseId: integer("warehouseId")
      .notNull()
      .references(() => warehouses.id),
    batchId: integer("batchId").references(() => inventoryBatches.id),
    systemQty: integer("systemQty").default(0).notNull(),
    countedQty: integer("countedQty"),
    varianceQty: integer("varianceQty"),
    variancePct: decimal("variancePct", { precision: 5, scale: 2 }),
    varianceValue: decimal("varianceValue", { precision: 15, scale: 2 }),
    unitCost: decimal("unitCost", { precision: 15, scale: 4 }),
    status: varchar("status", { length: 20 }).default("pending"),
    countedById: integer("countedById").references(() => users.id),
    countedAt: timestamp("countedAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_cycleCountLines_tenant").on(t.tenantId),
    index("idx_cycleCountLines_cycleCount").on(t.cycleCountId),
    index("idx_cycleCountLines_product").on(t.productId),
    unique("cycleCountLines_cycleCount_product_warehouse_batch_unique").on(
      t.cycleCountId,
      t.productId,
      t.warehouseId,
      t.batchId
    ),
    check(
      "chk_cycle_count_line_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type CycleCountLine = typeof cycleCountLines.$inferSelect;
export type InsertCycleCountLine = typeof cycleCountLines.$inferInsert;

// â”€â”€â”€ Inventory Valuation Layers (for FIFO/LIFO/Weighted Average) â”€â”€â”€â”€â”€â”€
export const inventoryValuationLayers = pgTable(
  "inventory_valuation_layers",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    warehouseId: integer("warehouseId").references(() => warehouses.id),
    batchId: integer("batchId").references(() => inventoryBatches.id),
    layerDate: timestamp("layerDate").notNull(),
    quantity: integer("quantity").notNull(),
    remainingQty: integer("remainingQty").notNull(),
    unitCost: decimal("unitCost", { precision: 15, scale: 4 }).notNull(),
    totalCost: decimal("totalCost", { precision: 15, scale: 2 }).notNull(),
    sourceType: varchar("sourceType", { length: 50 }).notNull(),
    sourceId: integer("sourceId"),
    referenceType: varchar("referenceType", { length: 50 }),
    referenceId: integer("referenceId"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_valuationLayers_tenant").on(t.tenantId),
    index("idx_valuationLayers_product").on(t.productId),
    index("idx_valuationLayers_warehouse").on(t.warehouseId),
    index("idx_valuationLayers_batch").on(t.batchId),
    index("idx_valuationLayers_layerDate").on(t.layerDate),
    index("idx_valuationLayers_active").on(t.isActive),
    check("chk_valuation_layer_qty_positive", sql`${t.quantity} > 0`),
    check(
      "chk_valuation_layer_remaining_not_negative",
      sql`${t.remainingQty} >= 0`
    ),
    check("chk_valuation_layer_unit_cost_positive", sql`${t.unitCost} > 0`),
    check(
      "chk_valuation_layer_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type InventoryValuationLayer =
  typeof inventoryValuationLayers.$inferSelect;
export type InsertInventoryValuationLayer =
  typeof inventoryValuationLayers.$inferInsert;

// â”€â”€â”€ Customers & Suppliers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    taxNumber: varchar("taxNumber", { length: 100 }),
    balance: decimal("balance", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    creditLimit: decimal("creditLimit", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    loyaltyPoints: integer("loyaltyPoints").default(0).notNull(),
    notes: text("notes"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    // â”€â”€â”€ Regional compliance (YE/SA/GCC) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    country: varchar("country", { length: 100 }).default("Ø§Ù„ÙŠÙ…Ù†"),
    countryCode: varchar("countryCode", { length: 2 }).default("YE"),
    taxIdType: varchar("taxIdType", { length: 20 }).default("none"),
    isVatRegistered: boolean("isVatRegistered").default(false).notNull(),
    commercialReg: varchar("commercialReg", { length: 100 }),
    idNumber: varchar("idNumber", { length: 100 }),
    postalCode: varchar("postalCode", { length: 20 }),
    buyerType: varchar("buyerType", { length: 10 }).default("b2b"),
    paymentTermsDays: integer("paymentTermsDays").default(0).notNull(),
  },
  t => [
    index("idx_customers_tenant").on(t.tenantId),
    index("idx_customers_tenant_deleted").on(t.tenantId, t.deletedAt),
    index("idx_customers_currency").on(t.currencyId),
    index("idx_customers_country").on(t.countryCode),
    unique("customers_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_customer_credit_limit_not_negative", sql`${t.creditLimit} >= 0`),
    check("chk_customer_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
    check(
      "chk_customer_payment_terms_not_negative",
      sql`${t.paymentTermsDays} >= 0`
    ),
  ]
);

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

export const suppliers = pgTable(
  "suppliers",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    taxNumber: varchar("taxNumber", { length: 100 }),
    balance: decimal("balance", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    notes: text("notes"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    // â”€â”€â”€ Regional compliance (YE/SA/GCC) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    country: varchar("country", { length: 100 }).default("Ø§Ù„ÙŠÙ…Ù†"),
    countryCode: varchar("countryCode", { length: 2 }).default("YE"),
    taxIdType: varchar("taxIdType", { length: 20 }).default("none"),
    isVatRegistered: boolean("isVatRegistered").default(false).notNull(),
    commercialReg: varchar("commercialReg", { length: 100 }),
    idNumber: varchar("idNumber", { length: 100 }),
    postalCode: varchar("postalCode", { length: 20 }),
    buyerType: varchar("buyerType", { length: 10 }).default("b2b"),
    paymentTermsDays: integer("paymentTermsDays").default(0).notNull(),
  },
  t => [
    index("idx_suppliers_tenant").on(t.tenantId),
    index("idx_suppliers_tenant_deleted").on(t.tenantId, t.deletedAt),
    index("idx_suppliers_currency").on(t.currencyId),
    index("idx_suppliers_country").on(t.countryCode),
    unique("suppliers_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_supplier_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// â”€â”€â”€ Sales & POS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const salesInvoiceStatusEnum = pgEnum("sales_invoice_status", [
  "draft",
  "confirmed",
  "paid",
  "partial",
  "cancelled",
]);
export const purchaseInvoiceStatusEnum = pgEnum("purchase_invoice_status", [
  "draft",
  "confirmed",
  "paid",
  "partial",
  "cancelled",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card",
  "transfer",
  "credit",
  "online",
  // â”€â”€â”€ ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„Ø¯ÙØ¹ Ø§Ù„Ù…Ø­Ù„ÙŠØ© (Ø§Ù„ÙŠÙ…Ù†) â”€â”€â”€
  "cash_yer", // ÙƒØ§Ø´ Ø¨Ø§Ù„Ø±ÙŠØ§Ù„ Ø§Ù„ÙŠÙ…Ù†ÙŠ
  "cash_sar", // ÙƒØ§Ø´ Ø¨Ø§Ù„Ø±ÙŠØ§Ù„ Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠ
  "hawala", // Ø­ÙˆØ§Ù„Ø© (ØµØ±Ø§ÙØ©)
  "shabab", // Ø´Ø¨Ø§Ø¨ (Ø£ÙŠ Ø´Ø¨ÙƒØ© Ù…Ø­Ù„ÙŠØ©)
  "mobile_money", // Ù…Ø­ÙØ¸Ø© Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ© (ÙÙ„ÙŠÙƒØ³ÙŠ / Ø£Ù…ÙŠÙ†)
  "bank_transfer", // Ø­ÙˆØ§Ù„Ø© Ø¨Ù†ÙƒÙŠØ© Ù…Ø­Ù„ÙŠØ©
]);

// â”€â”€â”€ Purchase Orders & Goods Receipts (Ø¯ÙˆØ±Ø© Ø§Ù„ØªÙˆØ±ÙŠØ¯ Ø§Ù„ÙƒØ§Ù…Ù„Ø©) â”€â”€â”€â”€â”€
// Ø³Ù„Ø³Ù„Ø© Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø«Ù„Ø§Ø«ÙŠØ©: Ø£Ù…Ø± Ø´Ø±Ø§Ø¡ â† Ø³Ù†Ø¯ Ø§Ø³ØªÙ„Ø§Ù… (GRN) â† ÙØ§ØªÙˆØ±Ø© Ø´Ø±Ø§Ø¡
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "draft",
  "issued",
  "partially_received",
  "received",
  "cancelled",
  "closed",
]);
export const grnStatusEnum = pgEnum("grn_status", [
  "draft",
  "posted",
  "cancelled",
]);

export const salesInvoices = pgTable(
  "sales_invoices",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    ...govColumns(),
    invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull(),
    orderId: integer("orderId").references(() => orders.id),
    customerId: integer("customerId").references(() => customers.id),
    branchId: integer("branchId").references(() => branches.id),
    costCenterId: integer("costCenterId").references(() => costCenters.id),
    warehouseId: integer("warehouseId").references(() => warehouses.id),
    projectId: integer("projectId"),
    status: salesInvoiceStatusEnum("status").default("draft").notNull(),
    subtotal: decimal("subtotal", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    taxAmount: decimal("taxAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).default("0").notNull(),
    paidAmount: decimal("paidAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    paymentMethod: paymentMethodEnum("paymentMethod").default("cash"),
    notes: text("notes"),
    // ZATCA (Saudi e-invoicing) payload: { uuid, hash, stampedAt, stampStatus, qrBase64 }
    zatca: jsonb("zatca").$default(() => ({
      stampStatus: "pending",
      stampError: null,
    })),
    invoiceDate: timestamp("invoiceDate").defaultNow().notNull(),
    dueDate: timestamp("dueDate"),
    userId: integer("userId").references(() => users.id),
    // â”€â”€â”€ Sales rep linkage (Module A: commissions) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    salesRepId: text("salesRepId"),
    // â”€â”€â”€ Multi-currency (Module B) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    currency: varchar("currency", { length: 10 }).default("YER").notNull(),
    currencyRate: decimal("currencyRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Status & Workflow
    stage: workflowStageEnum("stage").default("entry"),
    statusReason: text("statusReason"),
    statusChangedAt: timestamp("statusChangedAt"),
    statusChangedById: integer("statusChangedById").references(() => users.id),
    // Approval/Posting
    submittedAt: timestamp("submittedAt"),
    submittedById: integer("submittedById").references(() => users.id),
    approvedAt: timestamp("approvedAt"),
    approvedById: integer("approvedById").references(() => users.id),
    postedAt: timestamp("postedAt"),
    postedById: integer("postedById").references(() => users.id),
    voidedAt: timestamp("voidedAt"),
    voidedById: integer("voidedById").references(() => users.id),
    reversedAt: timestamp("reversedAt"),
    reversedById: integer("reversedById").references(() => users.id),
    reversalDocumentId: varchar("reversalDocumentId", { length: 100 }),
    reversalReason: varchar("reversalReason", { length: 255 }),
    // Sync columns
    version: integer("version").default(1).notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
    clientId: varchar("clientId", { length: 100 }),
    rev: varchar("rev", { length: 64 }),
    syncStatus: syncStatusEnum("syncStatus").default("pending"),
    lastSyncAt: timestamp("lastSyncAt"),
    syncError: text("syncError"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    // Integrity
    isPosted: boolean("isPosted").default(false).notNull(),
    isImmutable: boolean("isImmutable").default(false).notNull(),
    allowEdit: boolean("allowEdit").default(true).notNull(),
    allowPost: boolean("allowPost").default(false).notNull(),
    deletedAt: timestamp("deletedAt"),
    updatedById: integer("updatedById").references(() => users.id),
  },
  t => [
    index("idx_salesInvoices_tenant").on(t.tenantId),
    index("idx_salesInvoices_customer").on(t.customerId),
    index("idx_salesInvoices_order").on(t.orderId),
    uniqueIndex("uq_salesInvoices_tenant_order").on(t.tenantId, t.orderId),
    index("idx_salesInvoices_status").on(t.status),
    index("idx_salesInvoices_currency").on(t.currencyId),
    index("idx_salesInvoices_costCenter").on(t.costCenterId),
    index("idx_salesInvoices_warehouse").on(t.warehouseId),
    index("idx_salesInvoices_project").on(t.projectId),
    index("idx_salesInvoices_branch_costCenter").on(t.branchId, t.costCenterId),
    index("idx_salesInvoices_salesRep").on(t.salesRepId),
    index("idx_salesInvoices_tenant_salesrep").on(t.tenantId, t.salesRepId),
    index("idx_salesInvoices_tenant_status_date").on(
      t.tenantId,
      t.status,
      t.invoiceDate
    ),
    index("idx_salesInvoices_tenant_customer_date").on(
      t.tenantId,
      t.customerId,
      t.invoiceDate
    ),
    unique("salesInvoices_gc_tenant_unique").on(t.tenantId, t.globalCode),
    uniqueIndex("uq_salesInvoices_tenant_number").on(
      t.tenantId,
      t.invoiceNumber
    ),
    check("chk_sales_invoice_subtotal_not_negative", sql`${t.subtotal} >= 0`),
    check("chk_sales_invoice_tax_rate_not_negative", sql`${t.taxRate} >= 0`),
    check(
      "chk_sales_invoice_tax_amount_not_negative",
      sql`${t.taxAmount} >= 0`
    ),
    check("chk_sales_invoice_discount_not_negative", sql`${t.discount} >= 0`),
    check("chk_sales_invoice_total_not_negative", sql`${t.total} >= 0`),
    check("chk_sales_invoice_paid_not_negative", sql`${t.paidAmount} >= 0`),
    check(
      "chk_sales_invoice_currency_rate_positive",
      sql`${t.currencyRate} > 0`
    ),
    check("chk_sales_invoice_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
    check(
      "chk_sales_invoice_status_posted_immutable",
      sql`
      CASE WHEN ${t.status} IN ('paid', 'cancelled') THEN
        ${t.postedAt} IS NOT NULL
      ELSE TRUE END
    `
    ),
  ]
);

export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type InsertSalesInvoice = typeof salesInvoices.$inferInsert;

export const salesInvoiceItems = pgTable(
  "sales_invoice_items",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoiceId")
      .notNull()
      .references(() => salesInvoices.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    unitId: integer("unitId"), // ÙˆØ­Ø¯Ø© Ø§Ù„Ù‚ÙŠØ§Ø³ Ù„Ù„Ø³Ø·Ø± (ØºÙŠØ± Ø¥Ù„Ø²Ø§Ù…ÙŠ - ÙŠÙØªØ±Ùƒ Ù„Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠ)
    productName: varchar("productName", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    taxPct: decimal("taxPct", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    taxCategoryId: integer("taxCategoryId"), // Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø© Ø§Ù„Ø¶Ø±ÙŠØ¨ÙŠ Ù„Ù„Ø³Ø·Ø±
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_sales_items_invoice").on(t.invoiceId),
    index("idx_sales_items_product").on(t.productId), // ØªØ³Ø±ÙŠØ¹ Ø§Ù„Ø¨Ø­Ø«
    index("idx_sales_items_invoice_product").on(t.invoiceId, t.productId),
  ]
);

export type SalesInvoiceItem = typeof salesInvoiceItems.$inferSelect;
export type InsertSalesInvoiceItem = typeof salesInvoiceItems.$inferInsert;

// â”€â”€â”€ Purchases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const purchaseInvoices = pgTable(
  "purchase_invoices",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    ...govColumns(),
    invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull(),
    supplierId: integer("supplierId").references(() => suppliers.id),
    branchId: integer("branchId").references(() => branches.id),
    costCenterId: integer("costCenterId").references(() => costCenters.id),
    warehouseId: integer("warehouseId").references(() => warehouses.id),
    projectId: integer("projectId"),
    poId: integer("poId").references(() => purchaseOrders.id),
    grnId: integer("grnId").references(() => goodsReceipts.id),
    status: purchaseInvoiceStatusEnum("status").default("draft").notNull(),
    subtotal: decimal("subtotal", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    taxAmount: decimal("taxAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).default("0").notNull(),
    paidAmount: decimal("paidAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    paymentMethod: paymentMethodEnum("paymentMethod").default("cash"),
    notes: text("notes"),
    zatca: jsonb("zatca").$default(() => ({
      stampStatus: "pending",
      stampError: null,
    })),
    invoiceDate: timestamp("invoiceDate").defaultNow().notNull(),
    dueDate: timestamp("dueDate"),
    userId: integer("userId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    currency: varchar("currency", { length: 10 }).default("YER").notNull(),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    baseAmount: decimal("baseAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    // Posted/Reversed immutable tracking
    postedAt: timestamp("postedAt"),
    postedById: integer("postedById").references(() => users.id),
    reversedAt: timestamp("reversedAt"),
    reversedById: integer("reversedById").references(() => users.id),
    reversalReason: varchar("reversalReason", { length: 255 }),
  },
  t => [
    index("idx_purchaseInvoices_tenant").on(t.tenantId),
    index("idx_purchaseInvoices_supplier").on(t.supplierId),
    index("idx_purchaseInvoices_status").on(t.status),
    index("idx_purchaseInvoices_currency").on(t.currencyId),
    index("idx_purchaseInvoices_costCenter").on(t.costCenterId),
    index("idx_purchaseInvoices_warehouse").on(t.warehouseId),
    index("idx_purchaseInvoices_project").on(t.projectId),
    index("idx_purchaseInvoices_po").on(t.poId),
    index("idx_purchaseInvoices_grn").on(t.grnId),
    index("idx_purchaseInvoices_branch_costCenter").on(
      t.branchId,
      t.costCenterId
    ),
    unique("purchaseInvoices_gc_tenant_unique").on(t.tenantId, t.globalCode),
    uniqueIndex("uq_purchaseInvoices_tenant_number").on(
      t.tenantId,
      t.invoiceNumber
    ),
    check(
      "chk_purchase_invoice_subtotal_not_negative",
      sql`${t.subtotal} >= 0`
    ),
    check("chk_purchase_invoice_tax_rate_not_negative", sql`${t.taxRate} >= 0`),
    check(
      "chk_purchase_invoice_tax_amount_not_negative",
      sql`${t.taxAmount} >= 0`
    ),
    check(
      "chk_purchase_invoice_discount_not_negative",
      sql`${t.discount} >= 0`
    ),
    check("chk_purchase_invoice_total_not_negative", sql`${t.total} >= 0`),
    check("chk_purchase_invoice_paid_not_negative", sql`${t.paidAmount} >= 0`),
    check(
      "chk_purchase_invoice_exchange_rate_positive",
      sql`${t.exchangeRate} > 0`
    ),
    check(
      "chk_purchase_invoice_base_amount_not_negative",
      sql`${t.baseAmount} >= 0`
    ),
    check(
      "chk_purchase_invoice_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type InsertPurchaseInvoice = typeof purchaseInvoices.$inferInsert;

export const purchaseInvoiceItems = pgTable(
  "purchase_invoice_items",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoiceId")
      .notNull()
      .references(() => purchaseInvoices.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    productName: varchar("productName", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [index("idx_purchase_items_invoice").on(t.invoiceId)]
);

export type PurchaseInvoiceItem = typeof purchaseInvoiceItems.$inferSelect;
export type InsertPurchaseInvoiceItem =
  typeof purchaseInvoiceItems.$inferInsert;

// â”€â”€â”€ Purchase Orders (Ø£ÙˆØ§Ù…Ø± Ø§Ù„Ø´Ø±Ø§Ø¡) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ø£Ù…Ø± Ø§Ù„Ø´Ø±Ø§Ø¡ Ù‡Ùˆ Ø§Ù„Ø§Ù„ØªØ²Ø§Ù… Ø§Ù„ØªØ¹Ø§Ù‚Ø¯ÙŠ Ù…Ø¹ Ø§Ù„Ù…ÙˆØ±Ø¯ â€” Ù†Ù‚Ø·Ø© Ø§Ù†Ø·Ù„Ø§Ù‚ Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø«Ù„Ø§Ø«ÙŠØ©.
export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    ...govColumns(),
    poNumber: varchar("poNumber", { length: 50 }).notNull(),
    supplierId: integer("supplierId")
      .notNull()
      .references(() => suppliers.id),
    branchId: integer("branchId").references(() => branches.id),
    costCenterId: integer("costCenterId").references(() => costCenters.id),
    warehouseId: integer("warehouseId").references(() => warehouses.id),
    projectId: integer("projectId"),
    requisitionId: integer("requisitionId").references(() => procurements.id),
    status: purchaseOrderStatusEnum("status").default("draft").notNull(),
    expectedDeliveryDate: timestamp("expectedDeliveryDate"),
    notes: text("notes"),
    subtotal: decimal("subtotal", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    taxAmount: decimal("taxAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).default("0").notNull(),
    currencyId: integer("currencyId").references(() => currencies.id),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    baseAmount: decimal("baseAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    issuedById: integer("issuedById").references(() => users.id),
    issuedAt: timestamp("issuedAt"),
    cancelledAt: timestamp("cancelledAt"),
    cancelledById: integer("cancelledById").references(() => users.id),
    cancelReason: varchar("cancelReason", { length: 255 }),
    closedAt: timestamp("closedAt"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    userId: integer("userId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_purchaseOrders_tenant").on(t.tenantId),
    index("idx_purchaseOrders_supplier").on(t.supplierId),
    index("idx_purchaseOrders_status").on(t.status),
    index("idx_purchaseOrders_requisition").on(t.requisitionId),
    index("idx_purchaseOrders_warehouse").on(t.warehouseId),
    unique("purchaseOrders_gc_tenant_unique").on(t.tenantId, t.globalCode),
    uniqueIndex("uq_purchaseOrders_tenant_number").on(t.tenantId, t.poNumber),
    unique("purchaseOrders_idempotency_key_unique").on(t.idempotencyKey),
    check("chk_purchase_order_total_not_negative", sql`${t.total} >= 0`),
    check("chk_purchase_order_subtotal_not_negative", sql`${t.subtotal} >= 0`),
    check("chk_purchase_order_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: serial("id").primaryKey(),
    poId: integer("poId")
      .notNull()
      .references(() => purchaseOrders.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    productName: varchar("productName", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull(),
    receivedQty: integer("receivedQty").default(0).notNull(),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_purchaseOrderItems_po").on(t.poId),
    index("idx_purchaseOrderItems_product").on(t.productId),
    check("chk_purchase_order_item_qty_positive", sql`${t.quantity} > 0`),
    check(
      "chk_purchase_order_item_received_not_negative",
      sql`${t.receivedQty} >= 0`
    ),
  ]
);

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

// â”€â”€â”€ Goods Receipt Notes (Ø³Ù†Ø¯Ø§Øª Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù… GRN) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ø§Ù„Ø³Ù†Ø¯ ÙŠØ±Ø­Ù‘Ù„ Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ÙØ¹Ù„ÙŠØ§Ù‹ ÙˆÙŠØ¤ÙƒØ¯ Ø§Ø³ØªÙ„Ø§Ù… Ø§Ù„ÙƒÙ…ÙŠØ§Øª Ù…Ù‚Ø§Ø¨Ù„ Ø£Ù…Ø± Ø§Ù„Ø´Ø±Ø§Ø¡.
export const goodsReceipts = pgTable(
  "goods_receipts",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    ...govColumns(),
    grnNumber: varchar("grnNumber", { length: 50 }).notNull(),
    poId: integer("poId")
      .notNull()
      .references(() => purchaseOrders.id),
    supplierId: integer("supplierId").references(() => suppliers.id),
    branchId: integer("branchId").references(() => branches.id),
    warehouseId: integer("warehouseId").references(() => warehouses.id),
    status: grnStatusEnum("status").default("draft").notNull(),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
    notes: text("notes"),
    postedAt: timestamp("postedAt"),
    postedById: integer("postedById").references(() => users.id),
    cancelledAt: timestamp("cancelledAt"),
    cancelledById: integer("cancelledById").references(() => users.id),
    cancelReason: varchar("cancelReason", { length: 255 }),
    userId: integer("userId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_goodsReceipts_tenant").on(t.tenantId),
    index("idx_goodsReceipts_po").on(t.poId),
    index("idx_goodsReceipts_supplier").on(t.supplierId),
    index("idx_goodsReceipts_status").on(t.status),
    unique("goodsReceipts_gc_tenant_unique").on(t.tenantId, t.globalCode),
    uniqueIndex("uq_goodsReceipts_tenant_number").on(t.tenantId, t.grnNumber),
    check("chk_goods_receipt_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type GoodsReceipt = typeof goodsReceipts.$inferSelect;
export type InsertGoodsReceipt = typeof goodsReceipts.$inferInsert;

export const goodsReceiptItems = pgTable(
  "goods_receipt_items",
  {
    id: serial("id").primaryKey(),
    grnId: integer("grnId")
      .notNull()
      .references(() => goodsReceipts.id),
    poItemId: integer("poItemId").references(() => purchaseOrderItems.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    productName: varchar("productName", { length: 255 }).notNull(),
    quantityReceived: integer("quantityReceived").notNull(),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_goodsReceiptItems_grn").on(t.grnId),
    index("idx_goodsReceiptItems_product").on(t.productId),
    check(
      "chk_goods_receipt_item_qty_positive",
      sql`${t.quantityReceived} > 0`
    ),
  ]
);

export type GoodsReceiptItem = typeof goodsReceiptItems.$inferSelect;
export type InsertGoodsReceiptItem = typeof goodsReceiptItems.$inferInsert;

// â”€â”€â”€ Orders & Distribution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    ...govColumns(),
    orderNumber: varchar("orderNumber", { length: 50 }).notNull(),
    customerId: integer("customerId").references(() => customers.id),
    status: orderStatusEnum("status").default("pending").notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).default("0").notNull(),
    deliveryAddress: text("deliveryAddress"),
    deliveryDate: timestamp("deliveryDate"),
    deliveryNotes: text("deliveryNotes"),
    assignedTo: varchar("assignedTo", { length: 255 }),
    userId: integer("userId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
  },
  t => [
    index("idx_orders_tenant").on(t.tenantId),
    index("idx_orders_customer").on(t.customerId),
    index("idx_orders_status").on(t.status),
    index("idx_orders_currency").on(t.currencyId),
    unique("orders_gc_tenant_unique").on(t.tenantId, t.globalCode),
    uniqueIndex("uq_orders_tenant_number").on(t.tenantId, t.orderNumber),
    unique("orders_idempotency_key_unique").on(t.idempotencyKey),
    check("chk_order_total_not_negative", sql`${t.total} >= 0`),
    check("chk_order_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId")
      .notNull()
      .references(() => orders.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    unitId: integer("unitId"), // ÙˆØ­Ø¯Ø© Ø§Ù„Ù‚ÙŠØ§Ø³ Ù„Ù„Ø³Ø·Ø±
    productName: varchar("productName", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    taxPct: decimal("taxPct", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_order_items_order").on(t.orderId),
    index("idx_order_items_product").on(t.productId), // ØªØ³Ø±ÙŠØ¹ Ø§Ù„Ø¨Ø­Ø«
    index("idx_order_items_order_product").on(t.orderId, t.productId),
  ]
);

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// â”€â”€â”€ Product Price Lists (Ø³Ø¹Ø± Ù„ÙƒÙ„ ÙØ±Ø¹/Ù…Ø³ØªÙˆØ¯Ø¹/Ø¯ÙˆÙ„Ø©/ÙˆØ­Ø¯Ø©) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ÙŠÙØ­Ù„ Ø§Ù„Ø³Ø¹Ø± Ø­Ø³Ø¨ Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ©: unit+branch+warehouse+country Ø«Ù… Ø§ÙØªØ±Ø§Ø¶ÙŠ Ø§Ù„Ù…Ù†ØªØ¬.
export const productPriceLists = pgTable(
  "product_price_lists",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    branchId: integer("branchId"),
    warehouseId: integer("warehouseId"),
    countryCode: varchar("countryCode", { length: 2 }),
    unitId: integer("unitId"),
    priceType: varchar("priceType", { length: 20 }).default("sale").notNull(), // sale | purchase | wholesale
    price: decimal("price", { precision: 15, scale: 2 }).notNull(),
    discountPct: decimal("discountPct", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    effectiveFrom: timestamp("effectiveFrom"),
    effectiveTo: timestamp("effectiveTo"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_productPriceLists_tenant").on(t.tenantId),
    index("idx_productPriceLists_product").on(t.productId),
    index("idx_productPriceLists_branch").on(t.branchId),
    index("idx_productPriceLists_warehouse").on(t.warehouseId),
    unique("productPriceLists_tenant_scope_unique").on(
      t.tenantId,
      t.productId,
      t.priceType,
      t.branchId,
      t.warehouseId,
      t.countryCode,
      t.unitId
    ),
    check("chk_product_price_list_price_positive", sql`${t.price} >= 0`),
    check(
      "chk_product_price_list_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type ProductPriceList = typeof productPriceLists.$inferSelect;
export type InsertProductPriceList = typeof productPriceLists.$inferInsert;

// â”€â”€â”€ Payments (Installments & Settlements) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const paymentSourceEnum = pgEnum("payment_source", [
  "sales",
  "purchases",
]);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    source: paymentSourceEnum("source").notNull(),
    invoiceId: integer("invoiceId").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum("paymentMethod").default("cash"),
    paymentDate: timestamp("paymentDate").defaultNow().notNull(),
    notes: text("notes"),
    userId: integer("userId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    baseAmount: decimal("baseAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
  },
  t => [
    index("idx_payments_tenant").on(t.tenantId),
    index("idx_payments_invoice").on(t.source, t.invoiceId),
    index("idx_payments_currency").on(t.currencyId),
    unique("payments_idempotency_key_unique").on(t.idempotencyKey),
    check("chk_payment_amount_positive", sql`${t.amount} > 0`),
    check("chk_payment_base_amount_positive", sql`${t.baseAmount} >= 0`),
    check("chk_payment_exchange_rate_positive", sql`${t.exchangeRate} > 0`),
    check("chk_payment_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

// â”€â”€â”€ Subscription Voucher/Codes (flexible local payment) â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * subscription_codes â€” Ø£ÙƒÙˆØ§Ù… ØªÙØ¹ÙŠÙ„ Ø§Ø´ØªØ±Ø§Ùƒ Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù…Ø±Ø© ÙˆØ§Ø­Ø¯Ø©.
 *
 * ÙŠØªÙŠØ­ Ù„Ù„Ù…Ø§Ù„Ùƒ Ø¥Ù†Ø´Ø§Ø¡ Ø£ÙƒÙˆØ§Ù… Ø¨Ø£Ø³Ø¹Ø§Ø±/Ø¹Ù…Ù„Ø§Øª/Ø¯ÙˆÙ„ Ù…Ø®ØªØ§Ø±Ø©ØŒ Ø«Ù… Ø¥Ø±Ø³Ø§Ù„Ù‡Ø§ Ù„Ù„Ø¹Ù…Ù„Ø§Ø¡
 * Ø¹Ø¨Ø± Ø¥ÙŠÙ…ÙŠÙ„ØŒ ÙˆØ§ØªØ³Ø§Ø¨ Ù†ØµÙ‘ÙŠØŒ Ø£Ùˆ Ù†Ø³Ø® ÙŠØ¯ÙˆÙŠ â€” Ø¨Ù…Ø§ ÙŠÙ†Ø§Ø³Ø¨ Ø§Ù„Ø³ÙˆÙ‚ Ø§Ù„Ù…Ø­Ù„ÙŠ ØªÙ…Ø§Ù…Ø§Ù‹.
 *
 * Ø§Ù„ØªØ¯ÙÙ‚:
 *  1. Ø§Ù„Ø¹Ù…ÙŠÙ„ ÙŠÙØªØªØ­ /claim ÙˆÙŠÙØ¯Ø®Ù„ Ø§Ù„ÙƒÙˆØ¯.
 *  2. claimSubscription ÙŠÙØªØ­ Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø± Ø§Ù„Ø­Ø§Ù„ÙŠ ÙƒÙ€ "trial" (Ø£Ùˆ ÙŠØ±ÙØ¹Ù‡)
 *     ÙˆÙŠÙƒØªØ¨ Ø³Ø¬Ù„Ø§Ù‹ Ø¯ÙØ¹ voucher ØºÙŠØ± Ù…Ø±Ø¨ÙˆØ· Ø¨Ù…Ø¹Ø§Ù„Ø¬ Ø®Ø§Ø±Ø¬ÙŠ.
 * Ù„Ø§ ÙŠÙ„Ø²Ù… Ø¨ÙˆØ§Ø¨Ø© Ø¯ÙØ¹ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ© â€” ÙƒÙ„ Ø¨Ù„Ø¯ ÙŠÙØ¯ÙŠØ± Ø·Ø±ÙŠÙ‚ØªÙ‡ Ø§Ù„Ø®Ø§ØµØ©ØŒ ÙˆÙŠØ¨Ù‚Ù‰
 * Ø§Ù„Ù†Ø¸Ø§Ù… ÙŠØ¹Ù…Ù„ Ø¨Ù„Ø§ Ø§Ù†Ù‚Ø·Ø§Ø¹ Ø¨ÙŠÙ†Ù…Ø§ ÙŠÙÙƒØªÙ…Ù„ Ø§Ù„Ø¯ÙØ¹.
 */
export const subscriptionCodes = pgTable(
  "subscription_codes",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    code: varchar("code", { length: 40 }).notNull().unique(),
    planId: integer("planId")
      .references(() => subscriptionPlans.id)
      .notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    country: varchar("country", { length: 60 }).default("Ø¹Ø§Ù„Ù…ÙŠ").notNull(),
    countryCode: varchar("countryCode", { length: 2 }).default("GL").notNull(),
    currency: varchar("currency", { length: 10 }).default("USD").notNull(),
    /** Ø§Ù„Ø³Ø¹Ø± Ø§Ù„Ø°ÙŠ Ø³ÙŠØ¯ÙØ¹Ù‡ Ø§Ù„Ø¹Ù…ÙŠÙ„ (Ø¨Ø¹Ø¯ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø¹Ù„Ù‰ Ø§Ù„Ø¹Ù…ÙˆÙ„Ø©/Ø§Ù„Ø±Ø³ÙˆÙ…). */
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    /** Ù…Ù† Ø±Ø¨Ø­ Ø§Ù„Ù…Ù†ØµØ©/Ø§Ù„Ø¨Ø§Ø¦Ø¹ â€” ÙŠÙØ¸Ù‡Ø± Ù„Ù„Ø¹Ù…ÙŠÙ„ ÙƒÙ‚ÙŠÙ…Ø© Ø§Ù„Ø£ÙƒÙˆØ§Ù…. */
    faceValue: decimal("faceValue", { precision: 10, scale: 2 }),
    periodMonths: integer("periodMonths").default(1).notNull(),
    /**
     * ÙƒÙŠÙ Ø£ÙÙ†Ø´Ø¦ Ø§Ù„Ø£ÙƒÙˆØ§Ù…:
     *  - single   : ÙƒÙˆØ¨ ÙˆØ§Ø­Ø¯ Ù„Ù„Ù…Ø³ØªØ£Ø¬Ø± (default)
     *  - multi    : ÙƒÙˆØ¨ Ù…Ø´Ø§Ø±Ùƒ Ø¨ÙŠÙ† Ù…Ø³ØªØ£Ø¬Ø±ÙŠÙ† (pool) â€” ØºÙŠØ± Ù…ÙØ¹Ù„ Ø­Ø§Ù„ÙŠØ§Ù‹
     */
    scope: varchar("scope", { length: 20 }).default("single").notNull(),
    /**
     * ÙˆØ³ÙŠÙ„Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ â€” ØªØ­Ø¯Ø¯ Ø·Ø±ÙŠÙ‚Ø© Ø§Ø³ØªÙ„Ø§Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„ Ù„Ù„ÙƒÙˆØ¯:
     * email | whatsapp | manual(Ù†Ø³Ø® ÙŠØ¯ÙˆÙŠ).
     */
    deliveryMode: varchar("deliveryMode", { length: 20 })
      .default("manual")
      .notNull(),
    deliveryTarget: varchar("deliveryTarget", { length: 255 }), // email Ø£Ùˆ Ø±Ù‚Ù… ÙˆØ§ØªØ³
    /** ÙƒÙ„Ø¨Ù„Ø¨: draft | active | used | revoked */
    status: varchar("status", { length: 20 }).default("draft").notNull(),
    /** Ù…Ø¹Ø±Ù Ø§Ù„Ù…Ù†Ø´Ø¦ (Ù…ÙˆØ¸Ù Ø£Ùˆ ØµØ§Ø­Ø¨ Ø§Ù„Ù…Ù†ØµØ©). */
    createdBy: varchar("createdBy", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    activatedAt: timestamp("activatedAt"),
    /**
     * Ø¨ÙŠØ§Ù†Ø§Øª Ø¯ÙØ¹ ØºÙŠØ± Ù…Ø±Ø¨ÙˆØ·Ø© Ø¨Ù…Ø¹Ø§Ù„Ø¬ Ø®Ø§Ø±Ø¬ÙŠ â€” ØªÙÙƒØªØ¨ Ø¹Ù†Ø¯ Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù….
     * { method: "voucher"|"whatsapp"|"bank_transfer"|"cash", note: "..." }
     */
    redemption: jsonb("redemption"),
    sortOrder: integer("sortOrder").default(0).notNull(),
  },
  t => [
    index("idx_subscription_code_status").on(t.status),
    index("idx_subscription_code_country").on(t.countryCode),
    check("chk_subscription_code_price_positive", sql`${t.price} >= 0`),
  ]
);

export type SubscriptionCode = typeof subscriptionCodes.$inferSelect;
export type InsertSubscriptionCode = typeof subscriptionCodes.$inferInsert;

// â”€â”€â”€ Payment Gateways (dynamic, per-country payment variables) â”€â”€â”€â”€â”€
/**
 *.payment_gateways â€” Ù…Ù†ØµØ© ØªÙØ¯ÙŠØ±Ù‡Ø§ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ù†ØµØ© (Ø§Ù„Ù…Ø§Ù„Ùƒ):
 * ÙƒÙ„ ØµÙ ÙŠÙ…Ø«Ù„ ÙˆØ³ÙŠÙ„Ø© Ø¯ÙØ¹ Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ØªØ®ØµÙŠØµ Ù„Ø£ÙŠ Ø¯ÙˆÙ„Ø©/Ø¹Ù…Ù„Ø©/Ù…Ø²ÙˆÙ‘Ø¯.
 * `providerType` ÙŠØ­Ø¯Ø¯ Ù…Ø®Ø·Ø· Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ø¯ÙŠÙ†Ø§Ù…ÙŠÙƒÙŠØ© ÙÙŠ Ø§Ù„Ø¹Ù…ÙŠÙ„ (PROVIDER_FIELD_SCHEMAS)ØŒ
 * Ùˆ`credentials` ÙŠÙØ®Ø²ÙŽÙ‘Ù† JSON Ù†ØµÙŠØ§Ù‹ Ø¨Ù†Ù…Ø· Ù†ÙØ³Ù‡ (zatcaConfig/posConfig).
 */
export const paymentGateways = pgTable(
  "payment_gateways",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    code: varchar("code", { length: 60 }).notNull().unique(),
    providerType: varchar("providerType", { length: 40 }).notNull(), // tap | moyasar | stripe | bank_transfer | cash | whatsapp | manual
    name: varchar("name", { length: 120 }).notNull(),
    country: varchar("country", { length: 60 }).default("Ø¹Ø§Ù„Ù…ÙŠ").notNull(),
    countryCode: varchar("countryCode", { length: 2 }).default("GL").notNull(),
    currency: varchar("currency", { length: 10 }).default("USD").notNull(),
    mode: varchar("mode", { length: 10 }).default("test").notNull(), // test | live
    credentials: text("credentials"), // JSON Ø¯ÙŠÙ†Ø§Ù…ÙŠÙƒÙŠ Ø­Ø³Ø¨ Ø§Ù„Ù…Ø²ÙˆÙ‘Ø¯
    feePercent: decimal("feePercent", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    feeFixed: decimal("feeFixed", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    instructions: text("instructions"), // ØªØ¹Ù„ÙŠÙ…Ø§Øª Ù„Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„ÙŠØ¯ÙˆÙŠØ©
    checkoutUrlTemplate: text("checkoutUrlTemplate"), // Ù‚Ø§Ù„Ø¨ Ø±Ø§Ø¨Ø· Ø¯ÙØ¹ Ù…Ø³ØªØ¶Ø§Ù (ÙŠØ³ØªÙ‚Ø¨Ù„ {amount} Ùˆ{invoice})
    isActive: boolean("isActive").default(true).notNull(),
    sortOrder: integer("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_payment_gateway_active").on(t.isActive),
    index("idx_payment_gateway_country").on(t.countryCode),
    check("chk_payment_gateway_mode_valid", sql`${t.mode} IN ('test', 'live')`),
  ]
);

export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type InsertPaymentGateway = typeof paymentGateways.$inferInsert;

// â”€â”€â”€ Subscription Policies (flexible, never-blocks-the-business) â”€â”€
/**
 * subscription_policies â€” Ø³ÙŠØ§Ø³Ø© Ø§Ø´ØªØ±Ø§Ùƒ Ù…Ø±Ù†Ø© ÙˆØ¬Ø§Ø°Ø¨Ø© Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ØªØ¹Ø¯ÙŠÙ„ Ù…Ù† Ø§Ù„Ù„ÙˆØ­Ø©:
 * Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ Ù„Ø§ ÙŠÙˆÙ‚Ù Ø§Ù„Ø¹Ù…Ù„ Ø£Ø¨Ø¯Ø§Ù‹Ø› ØªÙÙ‚ÙŠÙŽÙ‘Ø¯ Ù…ÙŠØ²Ø§Øª ØºÙŠØ± Ø­Ø±Ø¬Ø© ÙÙ‚Ø·ØŒ
 * ÙˆØ§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„ÙŠÙˆÙ…ÙŠØ© (Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª/Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª/Ø§Ù„Ø§Ø³ØªØ¹Ù„Ø§Ù…) ØªØ¨Ù‚Ù‰ Ù…ØªØ§Ø­Ø©.
 */
export const subscriptionPolicies = pgTable(
  "subscription_policies",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    code: varchar("code", { length: 50 }).notNull().unique(), // 'default'
    name: varchar("name", { length: 120 }).notNull(),
    trialDays: integer("trialDays").default(14).notNull(),
    /** Ù…Ù‡Ù„Ø© ÙƒØ§Ù…Ù„Ø© Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª Ø¨Ø¹Ø¯ Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ø¯ÙˆØ±Ø© (Ø¨Ø¯ÙˆÙ† Ø£ÙŠ Ù‚ÙŠÙˆØ¯). */
    graceDays: integer("graceDays").default(30).notNull(),
    /** Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª Ø§Ù„ÙƒØ§Ù…Ù„Ø© Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ù…Ù‡Ù„Ø© â€” Ø§ÙØªØ±Ø§Ø¶ÙŠØ§Ù‹ Ù†Ø¹Ù… (Ø¬Ø§Ø°Ø¨ÙŠØ© Ù„Ù„Ø¹Ù…ÙŠÙ„). */
    graceFullAccess: boolean("graceFullAccess").default(true).notNull(),
    /** Ø§Ù„Ø£ÙŠØ§Ù… Ø¨Ø¹Ø¯ Ø§Ù„Ù…Ù‡Ù„Ø© Ù‚Ø¨Ù„ Ø§Ù„Ø§Ù†ØªÙ‚Ø§Ù„ Ù„Ù„Ù‚Ø±Ø§Ø¡Ø© ÙÙ‚Ø· (Ù„Ù…Ø¯Ø© Ù‚ØµÙˆÙ‰ Ø¥Ø¬Ù…Ø§Ù„ÙŠØ©). */
    maxOverdueDays: integer("maxOverdueDays").default(120).notNull(),
    /** Ø£ÙƒÙˆØ§Ø¯ Ø§Ù„Ù…ÙŠØ²Ø§Øª Ø§Ù„Ù…Ù‚ÙŠØ¯Ø© Ø¹Ù†Ø¯ ØªØ¬Ø§ÙˆØ² Ø§Ù„Ù…Ù‡Ù„Ø© (JSON array). */
    restrictedFeatures: jsonb("restrictedFeatures"),
    /** Ø£ÙŠØ§Ù… Ø§Ù„ØªØ°ÙƒÙŠØ± Ù‚Ø¨Ù„ Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ø¯ÙˆØ±Ø© (JSON array) â€” Ø§Ù„Ø³Ø§Ù„Ø¨ = Ø¨Ø¹Ø¯ Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡. */
    dunningReminderDays: jsonb("dunningReminderDays"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    check("chk_policy_trial_days_positive", sql`${t.trialDays} >= 0`),
    check("chk_policy_grace_days_positive", sql`${t.graceDays} >= 0`),
    check("chk_policy_overdue_days_positive", sql`${t.maxOverdueDays} >= 0`),
  ]
);

export type SubscriptionPolicy = typeof subscriptionPolicies.$inferSelect;
export type InsertSubscriptionPolicy = typeof subscriptionPolicies.$inferInsert;

// â”€â”€â”€ Subscription Plans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    description: text("description"),
    priceMonthly: decimal("priceMonthly", {
      precision: 10,
      scale: 2,
    }).notNull(),
    priceYearly: decimal("priceYearly", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("USD").notNull(),
    maxUsers: integer("maxUsers").default(5).notNull(),
    maxBranches: integer("maxBranches").default(1).notNull(),
    maxTransactions: integer("maxTransactions").default(1000).notNull(),
    features: jsonb("features"),
    /**
     * ØªØ³Ø¹ÙŠØ± Ù…Ø±Ù† Ù„ÙƒÙ„ Ø¯ÙˆÙ„Ø© â€” JSON array:
     * [{ countryCode:"SA", country:"Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©", currency:"SAR",
     *    priceMonthly:"149", priceYearly:"1490", taxPercent:15 }]
     * Ø¹Ù†Ø¯ ØºÙŠØ§Ø¨Ù‡ ØªÙØ³ØªØ®Ø¯Ù… priceMonthly/priceYearly Ø§Ù„Ø¹Ø§Ù…Ø©.
     */
    countryPricing: jsonb("countryPricing"),
    isActive: boolean("isActive").default(true).notNull(),
    sortOrder: integer("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    check(
      "chk_subscription_plan_price_monthly_positive",
      sql`${t.priceMonthly} > 0`
    ),
    check(
      "chk_subscription_plan_price_yearly_positive",
      sql`${t.priceYearly} > 0`
    ),
    check(
      "chk_subscription_plan_currency_format",
      sql`${t.currency} ~ '^[A-Z]{3}$'`
    ),
  ]
);

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

// â”€â”€â”€ Tenant Subscriptions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const tenantSubscriptions = pgTable(
  "tenant_subscriptions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    planId: integer("planId")
      .notNull()
      .references(() => subscriptionPlans.id),
    status: varchar("status", { length: 20 }).notNull(),
    billingCycle: varchar("billingCycle", { length: 10 })
      .default("monthly")
      .notNull(),
    trialStartsAt: timestamp("trialStartsAt"),
    trialEndsAt: timestamp("trialEndsAt"),
    currentPeriodStart: timestamp("currentPeriodStart"),
    currentPeriodEnd: timestamp("currentPeriodEnd"),
    cancelAt: timestamp("cancelAt"),
    cancelledAt: timestamp("cancelledAt"),
    paymentProvider: varchar("paymentProvider", { length: 50 }),
    externalSubscriptionId: varchar("externalSubscriptionId", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_tenant_sub_tenant").on(t.tenantId),
    index("idx_tenant_sub_status").on(t.status),
    index("idx_tenant_sub_currency").on(t.currencyId),
    check("chk_tenant_sub_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;
export type InsertTenantSubscription = typeof tenantSubscriptions.$inferInsert;

// â”€â”€â”€ Billing Invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const billingInvoices = pgTable(
  "billing_invoices",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    subscriptionId: integer("subscriptionId").references(
      () => tenantSubscriptions.id
    ),
    invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    taxAmount: decimal("taxAmount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("USD").notNull(),
    dueDate: timestamp("dueDate").notNull(),
    paidAt: timestamp("paidAt"),
    paymentMethod: varchar("paymentMethod", { length: 50 }),
    externalPaymentId: varchar("externalPaymentId", { length: 255 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
  },
  t => [
    index("idx_billing_invoice_tenant").on(t.tenantId),
    index("idx_billing_invoice_status").on(t.status),
    index("idx_billing_invoice_currency").on(t.currencyId),
    uniqueIndex("uq_billingInvoices_tenant_number").on(
      t.tenantId,
      t.invoiceNumber
    ),
    unique("billingInvoices_idempotency_key_unique").on(t.idempotencyKey),
    check("chk_billing_invoice_subtotal_not_negative", sql`${t.subtotal} >= 0`),
    check("chk_billing_invoice_tax_not_negative", sql`${t.taxAmount} >= 0`),
    check("chk_billing_invoice_total_not_negative", sql`${t.total} >= 0`),
    check(
      "chk_billing_invoice_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type BillingInvoice = typeof billingInvoices.$inferSelect;
export type InsertBillingInvoice = typeof billingInvoices.$inferInsert;

// â”€â”€â”€ Payment History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const paymentHistory = pgTable(
  "payment_history",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    invoiceId: integer("invoiceId"),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("USD").notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    paymentMethod: varchar("paymentMethod", { length: 50 }),
    transactionId: varchar("transactionId", { length: 255 }),
    refundedAmount: decimal("refundedAmount", {
      precision: 10,
      scale: 2,
    }).default("0"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
  },
  t => [
    index("idx_payment_history_tenant").on(t.tenantId),
    index("idx_payment_history_invoice").on(t.invoiceId),
    index("idx_payment_history_currency").on(t.currencyId),
    unique("paymentHistory_idempotency_key_unique").on(t.idempotencyKey),
    check("chk_payment_history_amount_positive", sql`${t.amount} > 0`),
    check(
      "chk_payment_history_refund_not_negative",
      sql`${t.refundedAmount} >= 0`
    ),
    check(
      "chk_payment_history_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type PaymentHistoryRecord = typeof paymentHistory.$inferSelect;
export type InsertPaymentHistory = typeof paymentHistory.$inferInsert;

// â”€â”€â”€ Audit Logs (Structured) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    userId: integer("userId").references(() => users.id),
    sessionId: uuid("sessionId"),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    entityId: integer("entityId").notNull(),
    entityGlobalId: uuid("entityGlobalId"),
    oldValues: jsonb("oldValues"),
    newValues: jsonb("newValues"),
    // Device & geo context
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: varchar("userAgent", { length: 500 }),
    deviceId: integer("deviceId"),
    deviceFingerprint: varchar("deviceFingerprint", { length: 255 }),
    country: varchar("country", { length: 100 }),
    city: varchar("city", { length: 120 }),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    // Audit chain
    previousHash: varchar("previousHash", { length: 64 }),
    currentHash: varchar("currentHash", { length: 64 }).default("").notNull(),
    chainSequence: integer("chainSequence").default(0).notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_audit_logs_tenant").on(t.tenantId),
    index("idx_audit_logs_user").on(t.userId),
    index("idx_audit_logs_session").on(t.sessionId),
    index("idx_audit_logs_entity").on(t.entityType, t.entityId),
    index("idx_audit_logs_entity_global").on(t.entityGlobalId),
    index("idx_audit_logs_created").on(t.createdAt),
    index("idx_audit_logs_chain").on(t.tenantId, t.chainSequence),
    check("chk_audit_log_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// â”€â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").references(() => tenants.id),
    userId: integer("userId").references(() => users.id),
    type: varchar("type", { length: 50 }).notNull(),
    channel: varchar("channel", { length: 50 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    body: text("body").notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    sentAt: timestamp("sentAt"),
    readAt: timestamp("readAt"),
    metadata: jsonb("metadata"),
    errorMessage: text("errorMessage"),
    retryCount: integer("retryCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_notifications_tenant").on(t.tenantId),
    index("idx_notifications_user").on(t.userId),
    index("idx_notifications_status").on(t.status),
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// â”€â”€â”€ Team Invitations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const teamInvitations = pgTable(
  "team_invitations",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    email: varchar("email", { length: 255 }).notNull(),
    role: userRoleEnum("role").default("user").notNull(),
    invitedBy: integer("invitedBy").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    acceptedAt: timestamp("acceptedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_team_inv_tenant").on(t.tenantId),
    index("idx_team_inv_email").on(t.email),
    check(
      "chk_team_invitation_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = typeof teamInvitations.$inferInsert;

// â”€â”€â”€ Currencies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const currencies = pgTable(
  "currencies",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").references(() => tenants.id),
    code: varchar("code", { length: 10 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    symbol: varchar("symbol", { length: 10 }).notNull(),
    rate: decimal("rate", { precision: 18, scale: 8 }).default("1").notNull(),
    isDefault: boolean("isDefault").default(false).notNull(),
    decimalPlaces: integer("decimalPlaces").default(2).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_currencies_tenant").on(t.tenantId),
    check("chk_currency_rate_positive", sql`${t.rate} > 0`),
    check("chk_currency_code_format", sql`${t.code} ~ '^[A-Z]{3}$'`),
  ]
);

export type Currency = typeof currencies.$inferSelect;
export type InsertCurrency = typeof currencies.$inferInsert;

// â”€â”€â”€ Exchange Rates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    baseCurrency: varchar("baseCurrency", { length: 10 }).notNull(),
    quoteCurrency: varchar("quoteCurrency", { length: 10 }).notNull(),
    rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
    source: varchar("source", { length: 50 }),
    effectiveFrom: timestamp("effectiveFrom").notNull(),
    effectiveTo: timestamp("effectiveTo"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_exchange_rates_pair").on(t.baseCurrency, t.quoteCurrency),
    index("idx_exchange_rates_effective").on(t.effectiveFrom),
    unique("exchange_rates_pair_effective_unique").on(
      t.baseCurrency,
      t.quoteCurrency,
      t.effectiveFrom
    ),
    check("chk_exchange_rate_positive", sql`${t.rate} > 0`),
  ]
);

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = typeof exchangeRates.$inferInsert;

// â”€â”€â”€ File Uploads â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const fileUploads = pgTable(
  "file_uploads",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").references(() => tenants.id),
    userId: integer("userId").references(() => users.id),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }).notNull(),
    fileSize: integer("fileSize").notNull(),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    storageProvider: varchar("storageProvider", { length: 50 })
      .default("s3")
      .notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    entityType: varchar("entityType", { length: 50 }),
    entityId: integer("entityId"),
    folder: varchar("folder", { length: 200 }),
    isPublic: boolean("isPublic").default(false).notNull(),
    metadata: jsonb("metadata"),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Security & integrity
    sha256Hash: varchar("sha256Hash", { length: 64 }).default("").notNull(),
    md5Hash: varchar("md5Hash", { length: 32 }),
    isEncrypted: boolean("isEncrypted").default(false).notNull(),
    encryptionKeyId: varchar("encryptionKeyId", { length: 100 }),
    encryptionAlgorithm: varchar("encryptionAlgorithm", { length: 50 }),
    // Device & geo context
    deviceId: integer("deviceId"),
    deviceFingerprint: varchar("deviceFingerprint", { length: 255 }),
    ipAddress: varchar("ipAddress", { length: 45 }),
    country: varchar("country", { length: 100 }),
    city: varchar("city", { length: 120 }),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    // Retention
    retentionPolicy: varchar("retentionPolicy", { length: 50 }).default(
      "standard"
    ),
    retentionExpiresAt: timestamp("retentionExpiresAt"),
    legalHold: boolean("legalHold").default(false).notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_file_uploads_tenant").on(t.tenantId),
    index("idx_file_uploads_entity").on(t.entityType, t.entityId),
    index("idx_file_uploads_hash").on(t.sha256Hash),
    index("idx_file_uploads_retention").on(t.retentionExpiresAt),
    check("chk_file_upload_size_positive", sql`${t.fileSize} > 0`),
  ]
);

export type FileUpload = typeof fileUploads.$inferSelect;
export type InsertFileUpload = typeof fileUploads.$inferInsert;

// â”€â”€â”€ API Keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const apiKeys = pgTable(
  "api_keys",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    userId: integer("userId")
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 100 }).notNull(),
    keyHash: varchar("keyHash", { length: 255 }).notNull().unique(),
    keyPrefix: varchar("keyPrefix", { length: 20 }).notNull(),
    scopes: jsonb("scopes"),
    rateLimit: integer("rateLimit").default(1000).notNull(),
    expiresAt: timestamp("expiresAt"),
    lastUsedAt: timestamp("lastUsedAt"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_api_keys_tenant").on(t.tenantId),
    check("chk_api_key_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// â”€â”€â”€ Webhooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const webhooks = pgTable(
  "webhooks",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    url: varchar("url", { length: 500 }).notNull(),
    secret: varchar("secret", { length: 255 }).notNull(),
    events: jsonb("events").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    lastTriggeredAt: timestamp("lastTriggeredAt"),
    failureCount: integer("failureCount").default(0).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_webhooks_tenant").on(t.tenantId),
    check("chk_webhook_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

// â”€â”€â”€ Webhook Deliveries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    webhookId: integer("webhookId")
      .notNull()
      .references(() => webhooks.id),
    event: varchar("event", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull(),
    responseStatus: integer("responseStatus"),
    responseBody: text("responseBody"),
    deliveredAt: timestamp("deliveredAt"),
    success: boolean("success").default(false).notNull(),
    attemptCount: integer("attemptCount").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
  },
  t => [
    index("idx_webhook_deliveries_webhook").on(t.webhookId),
    index("idx_webhook_deliveries_created").on(t.createdAt),
    unique("webhookDeliveries_idempotency_key_unique").on(t.idempotencyKey),
  ]
);

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertWebhookDelivery = typeof webhookDeliveries.$inferInsert;

// â”€â”€â”€ Feature Flags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const featureFlags = pgTable(
  "feature_flags",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").references(() => tenants.id),
    key: varchar("key", { length: 100 }).notNull(),
    value: varchar("value", { length: 255 }).notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_feature_flags_tenant_key").on(t.tenantId, t.key),
    unique("feature_flags_tenant_key_unique").on(t.tenantId, t.key),
  ]
);

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = typeof featureFlags.$inferInsert;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ERP Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠ â€” ÙˆØ­Ø¯Ø§Øª Ø¹Ø±Ø¶ÙŠØ© Ù„ÙƒÙ„ Ø§Ù„Ø£Ø¯ÙˆØ§Ø± (HRØŒ Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ØŒ Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§ØªØŒ
// Ø®Ø¯Ù…Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ØŒ Ø§Ù„Ø¬ÙˆØ¯Ø©ØŒ Ø§Ù„Ø±ÙˆØ§ØªØ¨ØŒ Ø§Ù„Ø­Ø¶ÙˆØ±)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const employeeStatusEnum = pgEnum("employee_status", [
  "active",
  "on_leave",
  "terminated",
]);
export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "review",
  "done",
]);
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
export const requisitionStatusEnum = pgEnum("requisition_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "ordered",
  "received",
]);
export const approvalDecisionEnum = pgEnum("approval_decision", [
  "pending",
  "approved",
  "rejected",
]);
export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);
export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
export const inspectionResultEnum = pgEnum("inspection_result", [
  "pass",
  "fail",
  "conditional",
]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "leave",
]);
export const payrollStatusEnum = pgEnum("payroll_status", [
  "draft",
  "processed",
  "paid",
]);

// â”€â”€â”€ Ø§Ù„Ø£Ù‚Ø³Ø§Ù… â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const departments = pgTable(
  "departments",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 30 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    managerId: integer("managerId"),
    parentDepartmentId: integer("parentDepartmentId"),
    costCenter: varchar("costCenter", { length: 50 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_departments_tenant").on(t.tenantId),
    uniqueIndex("uq_departments_tenant_code").on(t.tenantId, t.code),
    check("chk_department_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

// â”€â”€â”€ Ø§Ù„Ù…ÙˆØ¸ÙÙˆÙ† â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 30 }).notNull(),
    userId: integer("userId").references(() => users.id),
    departmentId: integer("departmentId"),
    fullName: varchar("fullName", { length: 150 }).notNull(),
    jobTitle: varchar("jobTitle", { length: 120 }).notNull(),
    nationalId: varchar("nationalId", { length: 40 }),
    phone: varchar("phone", { length: 30 }),
    email: varchar("email", { length: 150 }),
    hireDate: timestamp("hireDate"),
    salary: decimal("salary", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    currency: varchar("currency", { length: 10 }).default("YER"),
    status: employeeStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_employees_tenant").on(t.tenantId),
    index("idx_employees_currency").on(t.currencyId),
    uniqueIndex("uq_employees_tenant_code").on(t.tenantId, t.code),
    check("chk_employee_salary_not_negative", sql`${t.salary} >= 0`),
    check("chk_employee_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// â”€â”€â”€ Ø§Ù„Ø­Ø¶ÙˆØ± ÙˆØ§Ù„Ø§Ù†ØµØ±Ø§Ù â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    employeeId: integer("employeeId").notNull(),
    date: timestamp("date").notNull(),
    checkIn: timestamp("checkIn"),
    checkOut: timestamp("checkOut"),
    status: attendanceStatusEnum("status").default("present").notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    deviceId: integer("deviceId"),
    ipAddress: varchar("ipAddress", { length: 45 }),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
  },
  t => [
    index("idx_attendance_tenant").on(t.tenantId),
    index("idx_attendance_employee").on(t.employeeId),
    index("idx_attendance_date").on(t.date),
    unique("attendance_employee_date_unique").on(t.employeeId, t.date),
    check("chk_attendance_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;

// â”€â”€â”€ Ø¯ÙˆØ±Ø§Øª Ø§Ù„Ø±ÙˆØ§ØªØ¨ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const payrollRuns = pgTable(
  "payroll_runs",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    periodName: varchar("periodName", { length: 40 }).notNull(),
    fromDate: timestamp("fromDate").notNull(),
    toDate: timestamp("toDate").notNull(),
    totalNet: decimal("totalNet", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    status: payrollStatusEnum("status").default("draft").notNull(),
    createdById: integer("createdById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_payroll_runs_tenant").on(t.tenantId),
    unique("payroll_runs_tenant_period_unique").on(t.tenantId, t.periodName),
    check("chk_payroll_run_total_not_negative", sql`${t.totalNet} >= 0`),
    check("chk_payroll_run_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type PayrollRun = typeof payrollRuns.$inferSelect;
export type InsertPayrollRun = typeof payrollRuns.$inferInsert;

// â”€â”€â”€ Ø¨Ù†ÙˆØ¯ Ø§Ù„Ø±ÙˆØ§ØªØ¨ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const payrollItems = pgTable(
  "payroll_items",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    payrollRunId: integer("payrollRunId")
      .notNull()
      .references(() => payrollRuns.id),
    employeeId: integer("employeeId").notNull(),
    basicSalary: decimal("basicSalary", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    deductions: decimal("deductions", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    net: decimal("net", { precision: 15, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_payroll_items_tenant").on(t.tenantId),
    index("idx_payroll_items_run").on(t.payrollRunId),
    index("idx_payroll_items_employee").on(t.employeeId),
    unique("payroll_items_run_employee_unique").on(
      t.payrollRunId,
      t.employeeId
    ),
    check("chk_payroll_item_basic_not_negative", sql`${t.basicSalary} >= 0`),
    check(
      "chk_payroll_item_deductions_not_negative",
      sql`${t.deductions} >= 0`
    ),
    check("chk_payroll_item_net_not_negative", sql`${t.net} >= 0`),
    check("chk_payroll_item_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type PayrollItem = typeof payrollItems.$inferSelect;
export type InsertPayrollItem = typeof payrollItems.$inferInsert;

// â”€â”€â”€ Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 30 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    status: projectStatusEnum("status").default("planning").notNull(),
    startDate: timestamp("startDate"),
    endDate: timestamp("endDate"),
    budget: decimal("budget", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    managerId: integer("managerId"),
    customerId: integer("customerId").references(() => customers.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_projects_tenant").on(t.tenantId),
    index("idx_projects_currency").on(t.currencyId),
    uniqueIndex("uq_projects_tenant_code").on(t.tenantId, t.code),
    check("chk_project_budget_not_negative", sql`${t.budget} >= 0`),
    check("chk_project_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// â”€â”€â”€ Ù…Ù‡Ø§Ù… Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const projectTasks = pgTable(
  "project_tasks",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    projectId: integer("projectId").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("todo").notNull(),
    priority: taskPriorityEnum("priority").default("medium").notNull(),
    assigneeId: integer("assigneeId"),
    dueDate: timestamp("dueDate"),
    estimatedHours: decimal("estimatedHours", { precision: 8, scale: 2 }),
    actualHours: decimal("actualHours", { precision: 8, scale: 2 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_project_tasks_tenant").on(t.tenantId),
    index("idx_project_tasks_project").on(t.projectId),
    index("idx_project_tasks_assignee").on(t.assigneeId),
    check("chk_project_task_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = typeof projectTasks.$inferInsert;

// â”€â”€â”€ Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const projectMembers = pgTable(
  "project_members",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    projectId: integer("projectId").notNull(),
    employeeId: integer("employeeId").notNull(),
    roleInProject: varchar("roleInProject", { length: 80 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_project_members_tenant").on(t.tenantId),
    index("idx_project_members_project").on(t.projectId),
    index("idx_project_members_employee").on(t.employeeId),
    unique("project_members_project_employee_unique").on(
      t.projectId,
      t.employeeId
    ),
    check("chk_project_member_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = typeof projectMembers.$inferInsert;

// â”€â”€â”€ Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª / Ø£ÙˆØ§Ù…Ø± Ø§Ù„ØªÙˆØ±ÙŠØ¯ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const procurements = pgTable(
  "procurements",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    requisitionNumber: varchar("requisitionNumber", { length: 40 }).notNull(),
    requestedById: integer("requestedById").references(() => users.id),
    departmentId: integer("departmentId"),
    itemName: varchar("itemName", { length: 200 }).notNull(),
    description: text("description"),
    quantity: decimal("quantity", { precision: 12, scale: 2 })
      .default("1")
      .notNull(),
    unit: varchar("unit", { length: 20 }).default("Ù‚Ø·Ø¹Ø©"),
    estimatedCost: decimal("estimatedCost", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    currency: varchar("currency", { length: 10 }).default("YER"),
    supplierId: integer("supplierId").references(() => suppliers.id),
    status: requisitionStatusEnum("status").default("draft").notNull(),
    approvedById: integer("approvedById").references(() => users.id),
    // â”€â”€â”€ Multi-step approval workflow (Module A) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    approvers: jsonb("approvers"), // ordered array of userIds
    approvalStep: integer("approvalStep").default(0).notNull(),
    approvalLog: jsonb("approvalLog"), // [{ by, at, action, note }]
    receivedCost: decimal("receivedCost", { precision: 15, scale: 2 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_procurements_tenant").on(t.tenantId),
    index("idx_procurements_currency").on(t.currencyId),
    uniqueIndex("uq_procurements_tenant_req").on(
      t.tenantId,
      t.requisitionNumber
    ),
    check("chk_procurement_quantity_positive", sql`${t.quantity} > 0`),
    check(
      "chk_procurement_estimated_cost_not_negative",
      sql`${t.estimatedCost} >= 0`
    ),
    check("chk_procurement_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Procurement = typeof procurements.$inferSelect;
export type InsertProcurement = typeof procurements.$inferInsert;

// â”€â”€â”€ Ø§Ø¹ØªÙ…Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const procurementApprovals = pgTable(
  "procurement_approvals",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    procurementId: integer("procurementId").notNull(),
    approverId: integer("approverId"),
    level: integer("level").default(1).notNull(),
    decision: approvalDecisionEnum("decision").default("pending").notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_procurement_approvals_tenant").on(t.tenantId),
    index("idx_procurement_approvals_proc").on(t.procurementId),
    unique("procurement_approvals_proc_level_unique").on(
      t.procurementId,
      t.level
    ),
    check(
      "chk_procurement_approval_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type ProcurementApproval = typeof procurementApprovals.$inferSelect;
export type InsertProcurementApproval =
  typeof procurementApprovals.$inferInsert;

// â”€â”€â”€ ØªØ°Ø§ÙƒØ± Ø®Ø¯Ù…Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    ticketNumber: varchar("ticketNumber", { length: 40 }).notNull(),
    subject: varchar("subject", { length: 200 }).notNull(),
    title: varchar("title", { length: 200 }), // Alias for subject / Ø§Ù„Ø¹Ù†ÙˆØ§Ù†
    description: text("description"),
    customerName: varchar("customerName", { length: 150 }),
    customerId: integer("customerId"), // Reference to customers table / Ù…Ø±Ø¬Ø¹ Ù„Ù„Ø¹Ù…Ù„Ø§Ø¡
    customerPhone: varchar("customerPhone", { length: 30 }),
    status: ticketStatusEnum("status").default("open").notNull(),
    priority: ticketPriorityEnum("priority").default("medium").notNull(),
    assignedToId: integer("assignedToId"),
    assignedTo: integer("assignedTo"), // Direct assignment / Ø§Ù„ØªØ¹ÙŠÙŠÙ† Ø§Ù„Ù…Ø¨Ø§Ø´Ø±
    firstResponseAt: timestamp("firstResponseAt"),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_tickets_tenant").on(t.tenantId),
    index("idx_tickets_assigned").on(t.assignedToId),
    uniqueIndex("uq_tickets_tenant_num").on(t.tenantId, t.ticketNumber),
    check("chk_ticket_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// â”€â”€â”€ Ø§Ù„Ø¬ÙˆØ¯Ø© ÙˆØ§Ù„ÙØ­Øµ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const qualityInspections = pgTable(
  "quality_inspections",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 40 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    type: varchar("type", { length: 80 }),
    result: inspectionResultEnum("result").default("pass").notNull(),
    inspectedById: integer("inspectedById").references(() => users.id),
    relatedEntity: varchar("relatedEntity", { length: 120 }),
    score: decimal("score", { precision: 6, scale: 2 }),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_quality_inspections_tenant").on(t.tenantId),
    uniqueIndex("uq_quality_tenant_code").on(t.tenantId, t.code),
    check(
      "chk_quality_score_range",
      sql`${t.score} IS NULL OR (${t.score} >= 0 AND ${t.score} <= 100)`
    ),
    check("chk_quality_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type QualityInspection = typeof qualityInspections.$inferSelect;
export type InsertQualityInspection = typeof qualityInspections.$inferInsert;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  INTEGRATION BACKBONE â€” Journal Entries (grouped, balanced GL headers)
//  Every posted financial event (sale / purchase / payment / payroll / â€¦)
//  is grouped under one journal entry so legs are traceable to their
//  source document via (sourceModule, sourceRefId, referenceNo).
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    organizationId: integer("organizationId").references(() => tenants.id),
    branchId: integer("branchId").references(() => branches.id),
    warehouseId: integer("warehouseId").references(() => warehouses.id),
    sourceModule: varchar("sourceModule", { length: 50 }),
    sourceRefType: varchar("sourceRefType", { length: 50 }),
    sourceRefId: integer("sourceRefId"),
    referenceNo: varchar("referenceNo", { length: 80 }),
    docNo: varchar("docNo", { length: 80 }),
    // Status & Workflow
    status: documentStatusEnum("status").default("draft").notNull(),
    stage: workflowStageEnum("stage").default("entry"),
    statusReason: text("statusReason"),
    statusChangedAt: timestamp("statusChangedAt"),
    statusChangedById: integer("statusChangedById").references(() => users.id),
    // Approval/Posting
    submittedAt: timestamp("submittedAt"),
    submittedById: integer("submittedById").references(() => users.id),
    approvedAt: timestamp("approvedAt"),
    approvedById: integer("approvedById").references(() => users.id),
    postedAt: timestamp("postedAt"),
    postedById: integer("postedById").references(() => users.id),
    voidedAt: timestamp("voidedAt"),
    voidedById: integer("voidedById").references(() => users.id),
    reversedAt: timestamp("reversedAt"),
    reversedById: integer("reversedById").references(() => users.id),
    reversalDocumentId: varchar("reversalDocumentId", { length: 100 }),
    // Amounts
    totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).default(
      "0"
    ),
    debitTotal: decimal("debitTotal", { precision: 15, scale: 2 }).default("0"),
    creditTotal: decimal("creditTotal", { precision: 15, scale: 2 }).default("0"),
    memo: text("memo"),
    createdById: integer("createdById").references(() => users.id),
    updatedById: integer("updatedById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deletedAt"),
    // Sync columns
    version: integer("version").default(1).notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
    clientId: varchar("clientId", { length: 100 }),
    rev: varchar("rev", { length: 64 }),
    syncStatus: syncStatusEnum("syncStatus").default("pending"),
    lastSyncAt: timestamp("lastSyncAt"),
    syncError: text("syncError"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
    // Integrity
    isPosted: boolean("isPosted").default(false).notNull(),
    isImmutable: boolean("isImmutable").default(false).notNull(),
    allowEdit: boolean("allowEdit").default(true).notNull(),
    allowPost: boolean("allowPost").default(false).notNull(),
  },
  t => [
    index("idx_journal_tenant").on(t.tenantId),
    index("idx_journal_source").on(t.sourceModule, t.sourceRefId),
    index("idx_journal_currency").on(t.currencyId),
    check("chk_journal_total_not_negative", sql`${t.totalAmount} >= 0`),
    check("chk_journal_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
    check(
      "chk_journal_immutable_posted",
      sql`
      CASE WHEN ${t.status} = 'posted' THEN ${t.isImmutable} = true ELSE true END
    `
    ),
  ]
);

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = typeof journalEntries.$inferInsert;

// â”€â”€â”€ Scheduled / recurring journal entries (automation) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const scheduledJournalEntries = pgTable(
  "scheduled_journal_entries",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    branchId: integer("branchId").references(() => branches.id),
    frequency: varchar("frequency", { length: 20 })
      .default("monthly")
      .notNull(),
    nextRunAt: timestamp("nextRunAt"),
    isActive: boolean("isActive").default(true).notNull(),
    legs: jsonb("legs"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_scheduledJournal_tenant").on(t.tenantId),
    index("idx_scheduledJournal_nextRun").on(t.nextRunAt),
    check(
      "chk_scheduled_journal_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type ScheduledJournalEntry = typeof scheduledJournalEntries.$inferSelect;
export type InsertScheduledJournalEntry =
  typeof scheduledJournalEntries.$inferInsert;

// â”€â”€â”€ Recurring / Scheduled Expenses (Intelligent Automation) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const recurringExpenseStatusEnum = pgEnum("recurring_expense_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
]);

export const recurringExpenseFrequencyEnum = pgEnum(
  "recurring_expense_frequency",
  [
    "daily",
    "weekly",
    "biweekly",
    "monthly",
    "quarterly",
    "semiannual",
    "annual",
    "custom",
  ]
);

export const expenseBasisEnum = pgEnum("expense_basis", ["accrual", "cash"]);

export const expenseApprovalStatusEnum = pgEnum("expense_approval_status", [
  "pending",
  "approved",
  "rejected",
  "auto_approved",
]);

export const recurringExpenses = pgTable(
  "recurring_expenses",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    categoryId: integer("categoryId").references(() => categories.id),
    vendorId: integer("vendorId").references(() => suppliers.id),
    accountId: integer("accountId")
      .references(() => accounts.id)
      .notNull(),
    branchId: integer("branchId").references(() => branches.id),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("YER").notNull(),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    taxAccountId: integer("taxAccountId").references(() => accounts.id),
    frequency: recurringExpenseFrequencyEnum("frequency")
      .default("monthly")
      .notNull(),
    customCron: varchar("customCron", { length: 100 }),
    dayOfMonth: integer("dayOfMonth"),
    dayOfWeek: integer("dayOfWeek"),
    weekOfMonth: integer("weekOfMonth"),
    startDate: timestamp("startDate").notNull(),
    endDate: timestamp("endDate"),
    maxOccurrences: integer("maxOccurrences"),
    occurrencesCount: integer("occurrencesCount").default(0).notNull(),
    basis: expenseBasisEnum("basis").default("accrual").notNull(),
    status: recurringExpenseStatusEnum("status").default("draft").notNull(),
    approvalStatus: expenseApprovalStatusEnum("approvalStatus")
      .default("pending")
      .notNull(),
    approverId: integer("approverId").references(() => users.id),
    approvedAt: timestamp("approvedAt"),
    approvedById: integer("approvedById").references(() => users.id),
    paymentMethod: varchar("paymentMethod", { length: 50 }),
    paymentAccountId: integer("paymentAccountId").references(() => accounts.id),
    autoPay: boolean("autoPay").default(false).notNull(),
    nextRunAt: timestamp("nextRunAt"),
    lastRunAt: timestamp("lastRunAt"),
    lastRunStatus: varchar("lastRunStatus", { length: 20 }),
    lastRunError: text("lastRunError"),
    budgetId: integer("budgetId").references(() => budgets.id),
    departmentId: integer("departmentId").references(() => departments.id),
    projectId: integer("projectId").references(() => projects.id),
    tags: jsonb("tags"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    createdById: integer("createdById").references(() => users.id),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_recurring_expenses_tenant").on(t.tenantId),
    index("idx_recurring_expenses_status").on(t.status),
    index("idx_recurring_expenses_next_run").on(t.nextRunAt),
    index("idx_recurring_expenses_vendor").on(t.vendorId),
    index("idx_recurring_expenses_category").on(t.categoryId),
    index("idx_recurring_expenses_account").on(t.accountId),
    index("idx_recurring_expenses_budget").on(t.budgetId),
    check("chk_recurring_expense_amount_positive", sql`${t.amount} > 0`),
    check(
      "chk_recurring_expense_exchange_rate_positive",
      sql`${t.exchangeRate} > 0`
    ),
    check(
      "chk_recurring_expense_tax_rate_not_negative",
      sql`${t.taxRate} >= 0`
    ),
    check(
      "chk_recurring_expense_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
    check(
      "chk_recurring_expense_account_not_null",
      sql`${t.accountId} IS NOT NULL`
    ),
    check(
      "chk_recurring_expense_dates",
      sql`${t.startDate} <= ${t.endDate} OR ${t.endDate} IS NULL`
    ),
  ]
);

export type RecurringExpense = typeof recurringExpenses.$inferSelect;
export type InsertRecurringExpense = typeof recurringExpenses.$inferInsert;

export const recurringExpenseRuns = pgTable(
  "recurring_expense_runs",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    recurringExpenseId: integer("recurringExpenseId")
      .notNull()
      .references(() => recurringExpenses.id),
    runNumber: integer("runNumber").notNull(),
    scheduledDate: timestamp("scheduledDate").notNull(),
    executedDate: timestamp("executedDate"),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    taxAmount: decimal("taxAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).notNull(),
    baseAmount: decimal("baseAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    journalEntryId: integer("journalEntryId").references(
      () => journalEntries.id
    ),
    purchaseInvoiceId: integer("purchaseInvoiceId").references(
      () => purchaseInvoices.id
    ),
    paymentTransactionId: integer("paymentTransactionId").references(
      () => transactions.id
    ),
    errorMessage: text("errorMessage"),
    processedById: integer("processedById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_recurring_expense_runs_tenant").on(t.tenantId),
    index("idx_recurring_expense_runs_recurring").on(t.recurringExpenseId),
    index("idx_recurring_expense_runs_scheduled").on(t.scheduledDate),
    index("idx_recurring_expense_runs_status").on(t.status),
    unique("recurring_expense_runs_unique").on(
      t.recurringExpenseId,
      t.runNumber
    ),
    check("chk_recurring_expense_run_amount_positive", sql`${t.amount} > 0`),
    check(
      "chk_recurring_expense_run_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type RecurringExpenseRun = typeof recurringExpenseRuns.$inferSelect;
export type InsertRecurringExpenseRun =
  typeof recurringExpenseRuns.$inferInsert;

// â”€â”€â”€ Master Data: Units of Measure â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const units = pgTable(
  "units",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 20 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    nameAr: varchar("nameAr", { length: 80 }),
    symbol: varchar("symbol", { length: 20 }),
    baseUnitId: integer("baseUnitId"),
    conversionFactor: decimal("conversionFactor", {
      precision: 15,
      scale: 6,
    }).default("1"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_units_tenant").on(t.tenantId),
    uniqueIndex("uq_units_tenant_code").on(t.tenantId, t.code),
    check("chk_unit_conversion_positive", sql`${t.conversionFactor} > 0`),
    check("chk_unit_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Unit = typeof units.$inferSelect;
export type InsertUnit = typeof units.$inferInsert;

// â”€â”€â”€ Master Data: Product Units of Measure (multi-UOM conversions) â”€â”€â”€
export const productUnits = pgTable(
  "product_units",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    unitId: integer("unitId").notNull(),
    conversionFactor: decimal("conversionFactor", { precision: 15, scale: 6 })
      .default("1")
      .notNull(),
    isBase: boolean("isBase").default(false).notNull(),
    barcode: varchar("barcode", { length: 100 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_productUnits_tenant").on(t.tenantId),
    index("idx_productUnits_product").on(t.productId),
    unique("product_units_product_unit_unique").on(t.productId, t.unitId),
    check(
      "chk_product_unit_conversion_positive",
      sql`${t.conversionFactor} > 0`
    ),
    check("chk_product_unit_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type ProductUnit = typeof productUnits.$inferSelect;
export type InsertProductUnit = typeof productUnits.$inferInsert;

// â”€â”€â”€ Master Data: Categories (products / services / expenses) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 30 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    nameAr: varchar("nameAr", { length: 100 }),
    parentId: integer("parentId").references((): AnyPgColumn => categories.id),
    type: varchar("type", { length: 30 }).default("product"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_categories_tenant").on(t.tenantId),
    uniqueIndex("uq_categories_tenant_code").on(t.tenantId, t.code),
    check("chk_category_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// â”€â”€â”€ RBAC: Roles, user-role junction, permission catalogue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const roles = pgTable(
  "roles",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 80 }).notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    description: text("description"),
    permissions: text("permissions"), // JSON array of permission keys
    isSystem: boolean("isSystem").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_roles_tenant").on(t.tenantId),
    uniqueIndex("uq_roles_tenant_code").on(t.tenantId, t.code),
    check("chk_role_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

export const userRoles = pgTable(
  "user_roles",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    userId: integer("userId")
      .notNull()
      .references(() => users.id),
    roleId: integer("roleId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_userroles_tenant").on(t.tenantId),
    uniqueIndex("uq_userroles_user_role").on(t.userId, t.roleId),
    check("chk_user_role_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

export const permissions = pgTable(
  "permissions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    key: varchar("key", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    category: varchar("category", { length: 50 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [uniqueIndex("uq_permissions_key").on(t.key)]
);

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

// â”€â”€â”€ Documents repository (linked to any entity) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 40 }),
    title: varchar("title", { length: 200 }).notNull(),
    type: varchar("type", { length: 50 }),
    entityType: varchar("entityType", { length: 50 }),
    entityId: integer("entityId"),
    fileUrl: text("fileUrl"),
    fileUploadId: integer("fileUploadId"),
    notes: text("notes"),
    uploadedById: integer("uploadedById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_documents_tenant").on(t.tenantId),
    index("idx_documents_entity").on(t.entityType, t.entityId),
    check("chk_document_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type DocumentRow = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// â”€â”€â”€ Messages (direct in-app messaging between users) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    fromUserId: text("fromUserId").notNull(),
    fromName: text("fromName"),
    toUserId: text("toUserId").notNull(),
    body: text("body").notNull(),
    isRead: boolean("isRead").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_messages_tenant").on(t.tenantId),
    index("idx_messages_to").on(t.tenantId, t.toUserId),
    index("idx_messages_from").on(t.tenantId, t.fromUserId),
    check("chk_message_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// â”€â”€â”€ POS: cashier sessions + orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const posSessions = pgTable(
  "pos_sessions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 40 }).notNull(),
    openedById: integer("openedById")
      .notNull()
      .references(() => users.id),
    openedAt: timestamp("openedAt").defaultNow().notNull(),
    closedAt: timestamp("closedAt"),
    openingFloat: decimal("openingFloat", { precision: 15, scale: 2 }).default(
      "0"
    ),
    closingFloat: decimal("closingFloat", { precision: 15, scale: 2 }),
    expectedCash: decimal("expectedCash", { precision: 15, scale: 2 }),
    countedCash: decimal("countedCash", { precision: 15, scale: 2 }),
    variance: decimal("variance", { precision: 15, scale: 2 }),
    status: varchar("status", { length: 20 }).default("open").notNull(),
    notes: text("notes"),
    branchId: integer("branchId").references(() => branches.id),
    deviceId: integer("deviceId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_pos_sessions_tenant").on(t.tenantId),
    index("idx_pos_sessions_currency").on(t.currencyId),
    check("chk_pos_session_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type PosSession = typeof posSessions.$inferSelect;
export type InsertPosSession = typeof posSessions.$inferInsert;

export const posOrders = pgTable(
  "pos_orders",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    sessionId: integer("sessionId"),
    salesInvoiceId: integer("salesInvoiceId"),
    total: decimal("total", { precision: 15, scale: 2 }).default("0"),
    paymentMethod: varchar("paymentMethod", { length: 20 }),
    status: varchar("status", { length: 20 }).default("completed"),
    createdById: integer("createdById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_pos_orders_tenant").on(t.tenantId),
    index("idx_pos_orders_currency").on(t.currencyId),
    check("chk_pos_order_total_not_negative", sql`${t.total} >= 0`),
    check("chk_pos_order_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type PosOrder = typeof posOrders.$inferSelect;

// â”€â”€â”€ POS Cash Events (cash in/out within a shift) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ØªØªØ¨Ø¹ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© Ø¯Ø§Ø®Ù„ Ø§Ù„ÙˆØ±Ø¯ÙŠØ©: Ø³Ø­Ø¨ (paid-out) Ø£Ùˆ Ø¥ÙŠØ¯Ø§Ø¹ (paid-in).
// Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© Ø§Ù„Ù…ØªÙˆÙ‚Ø¹Ø© ÙÙŠ Ø§Ù„Ø¥Ù‚ÙØ§Ù„ = Ø±Ø£Ø³ Ø§Ù„Ù…Ø§Ù„ Ø§Ù„Ø§ÙØªØªØ§Ø­ÙŠ + Ù…Ø¯ÙÙˆØ¹Ø§Øª Ù†Ù‚Ø¯ÙŠØ© + Ø¥ÙŠØ¯Ø§Ø¹Ø§Øª âˆ’ Ø³Ø­ÙˆØ¨Ø§Øª âˆ’ Ù…Ø±ØªØ¬Ø¹Ø§Øª Ù†Ù‚Ø¯ÙŠØ©.
export const posCashEvents = pgTable(
  "pos_cash_events",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    sessionId: integer("sessionId")
      .references(() => posSessions.id)
      .notNull(),
    type: varchar("type", { length: 10 }).notNull(), // "in" | "out"
    amount: decimal("amount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    reason: varchar("reason", { length: 255 }).notNull(),
    notes: text("notes"),
    createdById: integer("createdById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_pos_cash_events_tenant").on(t.tenantId),
    index("idx_pos_cash_events_session").on(t.sessionId),
    index("idx_pos_cash_events_currency").on(t.currencyId),
    check("chk_pos_cash_amount_positive", sql`${t.amount} >= 0`),
  ]
);

export type PosCashEvent = typeof posCashEvents.$inferSelect;
export type InsertPosCashEvent = typeof posCashEvents.$inferInsert;

// â”€â”€â”€ POS Returns (Ù…Ø±ØªØ¬Ø¹Ø§Øª ÙˆØ§Ø³ØªØ¨Ø¯Ø§Ù„Ø§Øª) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ù…Ø±ØªØ¬Ø¹ ÙƒØ§Ù…Ù„ Ø£Ùˆ Ø¬Ø²Ø¦ÙŠ Ù…Ø±ØªØ¨Ø· Ø¨Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø£ØµÙ„ÙŠØ© Ù…Ø¹ Ø³Ø¬Ù„ Ø§Ù„Ø£ØµÙ†Ø§Ù Ø§Ù„Ù…Ø³ØªØ±Ø¬Ø¹Ø©.
export const posReturns = pgTable(
  "pos_returns",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    returnNumber: varchar("returnNumber", { length: 50 }).notNull(),
    originalInvoiceId: integer("originalInvoiceId").notNull(),
    originalInvoiceNumber: varchar("originalInvoiceNumber", { length: 50 }),
    customerId: integer("customerId").references(() => customers.id),
    branchId: integer("branchId").references(() => branches.id),
    sessionId: integer("sessionId").references(() => posSessions.id),
    refundMethod: paymentMethodEnum("refundMethod").default("cash"),
    refundReference: varchar("refundReference", { length: 100 }),
    reason: varchar("reason", { length: 255 }),
    status: varchar("status", { length: 20 }).default("completed").notNull(),
    refundAmount: decimal("refundAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    createdById: integer("createdById")
      .notNull()
      .references(() => users.id),
    processedById: integer("processedById").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    processedAt: timestamp("processedAt"),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_pos_returns_tenant").on(t.tenantId),
    index("idx_pos_returns_invoice").on(t.originalInvoiceId),
    uniqueIndex("uq_pos_returns_tenant_number").on(t.tenantId, t.returnNumber),
    index("idx_pos_returns_currency").on(t.currencyId),
    check("chk_pos_return_refund_not_negative", sql`${t.refundAmount} >= 0`),
  ]
);

export type PosReturn = typeof posReturns.$inferSelect;
export type InsertPosReturn = typeof posReturns.$inferInsert;

export const posReturnItems = pgTable(
  "pos_return_items",
  {
    id: serial("id").primaryKey(),
    returnId: integer("returnId")
      .references(() => posReturns.id)
      .notNull(),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    productName: varchar("productName", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    taxAmount: decimal("taxAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    restock: boolean("restock").default(true).notNull(),
    condition: varchar("condition", { length: 20 }).default("new").notNull(),
    serialNumbers: text("serialNumbers"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_pos_return_items_return").on(t.returnId),
    index("idx_pos_return_items_product").on(t.productId),
  ]
);

export type PosReturnItem = typeof posReturnItems.$inferSelect;
export type InsertPosReturnItem = typeof posReturnItems.$inferInsert;

// â”€â”€â”€ POS Held Carts (ØªØ¹Ù„ÙŠÙ‚ ÙˆØ§Ø³ØªØ¹Ø§Ø¯Ø© Ø§Ù„ÙÙˆØ§ØªÙŠØ±) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ù„Ù‚Ø·Ø© Ø³Ù„Ø© ÙƒØ§Ù…Ù„Ø© (JSON) ÙŠÙØ¹Ù„ÙŽÙ‘Ù‚ Ø¹Ù„ÙŠÙ‡Ø§ ÙˆØªÙØ³ØªØ¹Ø§Ø¯ Ø¨Ø£Ù…Ø§Ù†ØŒ Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ø§Ù„ÙƒØ§Ø´ÙŠØ±.
export const posHeldCarts = pgTable(
  "pos_held_carts",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 40 }).notNull(),
    heldById: integer("heldById")
      .notNull()
      .references(() => users.id),
    branchId: integer("branchId").references(() => branches.id),
    sessionId: integer("sessionId"),
    customerId: integer("customerId").references(() => customers.id),
    snapshot: text("snapshot").notNull(),
    total: decimal("total", { precision: 15, scale: 2 }).default("0").notNull(),
    itemCount: integer("itemCount").default(0).notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt"),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_pos_held_carts_tenant").on(t.tenantId),
    index("idx_pos_held_carts_held_by").on(t.heldById),
    index("idx_pos_held_carts_status").on(t.status),
    index("idx_pos_held_carts_currency").on(t.currencyId),
  ]
);

export type PosHeldCart = typeof posHeldCarts.$inferSelect;
export type InsertPosHeldCart = typeof posHeldCarts.$inferInsert;

// â”€â”€â”€ Custom Fields (Extra Fields) â€” EAV subsystem â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Provides tenants the ability to add arbitrary extra fields to any business
// entity (account, product, customer, employee, journal, invoice, ...) without
// altering core tables. Definitions drive the UI; values are stored per entity.

export const customFieldDefs = pgTable(
  "custom_field_defs",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    key: varchar("key", { length: 50 }).notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    type: varchar("type", { length: 20 }).notNull().default("text"),
    options: text("options"),
    required: boolean("required").default(false).notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    // JSON Schema validation
    jsonSchema: jsonb("jsonSchema"),
  },
  t => [
    uniqueIndex("custom_field_defs_tenant_entity_key").on(
      t.tenantId,
      t.entityType,
      t.key
    ),
    check(
      "chk_custom_field_def_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type CustomFieldDef = typeof customFieldDefs.$inferSelect;
export type InsertCustomFieldDef = typeof customFieldDefs.$inferInsert;

export const customFieldValues = pgTable(
  "custom_field_values",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: integer("entity_id").notNull(),
    fieldKey: varchar("field_key", { length: 50 }).notNull(),
    value: text("value"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("custom_field_values_tenant_entity").on(
      t.tenantId,
      t.entityType,
      t.entityId
    ),
    unique("custom_field_values_entity_field_unique").on(
      t.entityType,
      t.entityId,
      t.fieldKey
    ),
    check(
      "chk_custom_field_value_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type CustomFieldValue = typeof customFieldValues.$inferSelect;
export type InsertCustomFieldValue = typeof customFieldValues.$inferInsert;
export type InsertPosOrder = typeof posOrders.$inferInsert;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ÙˆØ­Ø¯Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ÙŠÙ† ÙˆØ§Ù„Ù†Ø³Ø¨ ÙˆØ§Ù„Ø¨ÙˆÙ†ØµØ§Øª (Module A â€” Sales Reps)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const salesReps = pgTable(
  "sales_reps",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    commissionType: varchar("commissionType", { length: 20 })
      .default("percent")
      .notNull(),
    commissionValue: decimal("commissionValue", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    bonusThreshold: decimal("bonusThreshold", { precision: 15, scale: 2 }),
    bonusAmount: decimal("bonusAmount", { precision: 15, scale: 2 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    currencyId: integer("currencyId").references(() => currencies.id),
  },
  t => [
    index("idx_sales_reps_tenant").on(t.tenantId),
    index("idx_sales_reps_currency").on(t.currencyId),
    check(
      "chk_sales_rep_commission_not_negative",
      sql`${t.commissionValue} >= 0`
    ),
    check("chk_sales_rep_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type SalesRep = typeof salesReps.$inferSelect;
export type InsertSalesRep = typeof salesReps.$inferInsert;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ÙˆØ­Ø¯Ø© Ø§Ù„Ø¹Ø±ÙˆØ¶ Ø§Ù„Ù…Ø§Ù„ÙŠØ© ÙˆØ§Ù„ÙƒÙ…ÙŠØ© (Module B â€” Offers / Discounts)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const offers = pgTable(
  "offers",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 255 }).notNull(),
    kind: varchar("kind", { length: 20 }).default("financial").notNull(),
    discountPercent: decimal("discountPercent", { precision: 6, scale: 2 })
      .default("0")
      .notNull(),
    minQty: decimal("minQty", { precision: 15, scale: 2 }),
    productId: integer("productId"),
    categoryId: integer("categoryId").references(() => categories.id),
    startDate: timestamp("startDate"),
    endDate: timestamp("endDate"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_offers_tenant").on(t.tenantId),
    index("idx_offers_product").on(t.productId),
    index("idx_offers_category").on(t.categoryId),
    check("chk_offer_discount_not_negative", sql`${t.discountPercent} >= 0`),
    check("chk_offer_discount_not_over_100", sql`${t.discountPercent} <= 100`),
    check("chk_offer_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

// â”€â”€â”€ Translations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const translations = pgTable(
  "translations",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    key: varchar("key", { length: 255 }).notNull(),
    culture: varchar("culture", { length: 10 }).notNull(),
    value: text("value").notNull(),
    context: varchar("context", { length: 100 }),
    isApproved: boolean("isApproved").default(false).notNull(),
    approvedById: integer("approvedById").references(() => users.id),
    approvedAt: timestamp("approvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_translations_tenant").on(t.tenantId),
    index("idx_translations_culture").on(t.culture),
    unique("translations_key_culture_tenant_unique").on(
      t.key,
      t.culture,
      t.tenantId
    ),
    check("chk_translation_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = typeof translations.$inferInsert;

// â”€â”€â”€ Biometric Templates (Governed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const biometricTemplates = pgTable(
  "biometric_templates",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    userId: integer("userId")
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 30 }).notNull(), // fingerprint, face, iris, voice
    algorithm: varchar("algorithm", { length: 50 }).notNull(), // e.g., ISO 19794-2, ISO 39794-5
    algorithmVersion: varchar("algorithmVersion", { length: 20 }).notNull(),
    templateHash: varchar("templateHash", { length: 64 }).notNull(), // SHA-256 of encrypted template
    encryptedTemplate: text("encryptedTemplate").notNull(), // Encrypted biometric data
    encryptionKeyId: varchar("encryptionKeyId", { length: 100 }).notNull(),
    qualityScore: integer("qualityScore"), // 0-100
    status: varchar("status", { length: 20 }).default("active").notNull(), // active, revoked, expired
    enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
    enrolledById: integer("enrolledById")
      .notNull()
      .references(() => users.id),
    approvedById: integer("approvedById").references(() => users.id),
    approvedAt: timestamp("approvedAt"),
    revokedAt: timestamp("revokedAt"),
    revokedById: integer("revokedById").references(() => users.id),
    revocationReason: varchar("revocationReason", { length: 255 }),
    expiresAt: timestamp("expiresAt"),
    lastVerifiedAt: timestamp("lastVerifiedAt"),
    verificationCount: integer("verificationCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_biometric_tenant").on(t.tenantId),
    index("idx_biometric_user").on(t.userId),
    index("idx_biometric_type").on(t.type),
    index("idx_biometric_status").on(t.status),
    unique("biometric_template_user_type_unique").on(t.userId, t.type),
    check(
      "chk_biometric_quality_score_range",
      sql`${t.qualityScore} IS NULL OR (${t.qualityScore} >= 0 AND ${t.qualityScore} <= 100)`
    ),
    check("chk_biometric_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type BiometricTemplate = typeof biometricTemplates.$inferSelect;
export type InsertBiometricTemplate = typeof biometricTemplates.$inferInsert;

// â”€â”€â”€ Sync Metadata (Global aggregate tracking) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const syncMetadata = pgTable(
  "sync_metadata",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    aggregateId: uuid("aggregateId").notNull(),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    entityId: integer("entityId").notNull(),
    entityGlobalId: uuid("entityGlobalId").notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
    clientVersion: integer("clientVersion").default(0).notNull(),
    conflictState: varchar("conflictState", { length: 20 })
      .default("none")
      .notNull(), // none, client_wins, server_wins, manual
    conflictData: jsonb("conflictData"), // { clientValue, serverValue, resolvedValue }
    lastSyncAt: timestamp("lastSyncAt").defaultNow().notNull(),
    lastConflictAt: timestamp("lastConflictAt"),
    resolvedAt: timestamp("resolvedAt"),
    resolvedById: integer("resolvedById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_sync_metadata_tenant").on(t.tenantId),
    index("idx_sync_metadata_aggregate").on(t.aggregateId),
    index("idx_sync_metadata_entity").on(t.entityType, t.entityId),
    unique("sync_metadata_aggregate_entity_unique").on(
      t.aggregateId,
      t.entityType,
      t.entityId
    ),
    check("chk_sync_metadata_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type SyncMetadata = typeof syncMetadata.$inferSelect;
export type InsertSyncMetadata = typeof syncMetadata.$inferInsert;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MANAGEMENT ACCOUNTING â€” Ø§Ù„Ù…Ø­Ø§Ø³Ø¨Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ© Ø§Ù„Ù…ØªÙ‚Ø¯Ù…Ø©
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ Cost Centers / Profit Centers (Ù…Ø±Ø§ÙƒØ² Ø§Ù„ØªÙƒÙ„ÙØ© ÙˆØ§Ù„Ø±Ø¨Ø­) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const costCenterTypeEnum = pgEnum("cost_center_type", [
  "cost", // Ù…Ø±ÙƒØ² ØªÙƒÙ„ÙØ©
  "profit", // Ù…Ø±ÙƒØ² Ø±Ø¨Ø­
  "investment", // Ù…Ø±ÙƒØ² Ø§Ø³ØªØ«Ù…Ø§Ø±
  "revenue", // Ù…Ø±ÙƒØ² Ø¥ÙŠØ±Ø§Ø¯
]);

export const costCenters = pgTable(
  "cost_centers",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 30 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    nameAr: varchar("nameAr", { length: 150 }),
    type: costCenterTypeEnum("type").default("cost").notNull(),
    parentId: integer("parentId").references((): AnyPgColumn => costCenters.id),
    managerId: integer("managerId"), // Ù…ÙˆØ¸Ù Ù…Ø³Ø¤ÙˆÙ„
    departmentId: integer("departmentId"),
    budgetAccountId: integer("budgetAccountId"), // Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…ÙˆØ§Ø²Ù†Ø© Ø§Ù„Ù…Ø±ØªØ¨Ø·
    isActive: boolean("isActive").default(true).notNull(),
    description: text("description"),
    // Allocation configuration
    allocationBase: varchar("allocationBase", { length: 50 }), // headcount, area, revenue, direct_hours, machine_hours, custom
    allocationWeight: decimal("allocationWeight", {
      precision: 10,
      scale: 4,
    }).default("1"),
    // Hierarchy path for fast queries
    path: varchar("path", { length: 500 }), // e.g., /1/5/12/
    level: integer("level").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_cost_centers_tenant").on(t.tenantId),
    index("idx_cost_centers_parent").on(t.parentId),
    index("idx_cost_centers_type").on(t.type),
    index("idx_cost_centers_path").on(t.path),
    // PERFORMANCE: Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ù…Ø±ØªØ¨Ø© Ø¨Ø§Ù„Ø±Ù…Ø² Ø¯Ø§Ø®Ù„ Ø§Ù„Ù…Ø¤Ø³Ø³Ø©
    index("idx_cost_centers_tenant_code").on(t.tenantId, t.code),
    unique("cost_centers_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_cost_center_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type CostCenter = typeof costCenters.$inferSelect;
export type InsertCostCenter = typeof costCenters.$inferInsert;

// â”€â”€â”€ Allocation Rules (Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø¢Ù„ÙŠ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const allocationMethodEnum = pgEnum("allocation_method", [
  "fixed", // Ù†Ø³Ø¨Ø© Ø«Ø§Ø¨ØªØ©
  "proportional", // ØªÙ†Ø§Ø³Ø¨ÙŠ Ø­Ø³Ø¨ Ø§Ù„Ø£Ø³Ø§Ø³
  "step_down", // Ø®Ø·ÙˆØ© Ø¨Ø®Ø·ÙˆØ© (sequential)
  "reciprocal", // ØªØ¨Ø§Ø¯Ù„ÙŠ (simultaneous equations)
  "activity_based", // Ø§Ù„Ù‚Ø§Ø¦Ù… Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù†Ø´Ø·Ø© (ABC)
]);

export const allocationRules = pgTable(
  "allocation_rules",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    method: allocationMethodEnum("method").default("proportional").notNull(),
    // Source: Ù…Ø§ ÙŠØªÙ… ØªÙˆØ²ÙŠØ¹Ù‡
    sourceType: varchar("sourceType", { length: 30 }).notNull(), // cost_center, account, fixed_amount
    sourceCostCenterId: integer("sourceCostCenterId"),
    sourceAccountId: integer("sourceAccountId"),
    sourceFixedAmount: decimal("sourceFixedAmount", {
      precision: 15,
      scale: 2,
    }),
    // Target: ÐºÑƒÐ´Ð° ÙŠØªÙ… Ø§Ù„ØªÙˆØ²ÙŠØ¹
    targetCostCenterIds: jsonb("targetCostCenterIds").notNull(), // array of cost center IDs
    // Basis: Ø£Ø³Ø§Ø³ Ø§Ù„ØªÙˆØ²ÙŠØ¹
    basisType: varchar("basisType", { length: 50 }), // headcount, area, revenue, direct_labor_hours, machine_hours, custom_driver
    basisDriverId: integer("basisDriverId"), // custom driver account/cost center
    basisFormula: text("basisFormula"), // JSON: custom formula
    // Filters
    filterAccountTypes: jsonb("filterAccountTypes"), // which account types to allocate
    filterDateRange: jsonb("filterDateRange"), // {from, to} or periodName
    // Schedule
    isRecurring: boolean("isRecurring").default(false).notNull(),
    frequency: varchar("frequency", { length: 20 }), // monthly, quarterly, yearly
    nextRunAt: timestamp("nextRunAt"),
    lastRunAt: timestamp("lastRunAt"),
    // Status
    isActive: boolean("isActive").default(true).notNull(),
    priority: integer("priority").default(0).notNull(), // for step-down ordering
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_allocation_rules_tenant").on(t.tenantId),
    index("idx_allocation_rules_source_cc").on(t.sourceCostCenterId),
    index("idx_allocation_rules_next_run").on(t.nextRunAt),
    check(
      "chk_allocation_rule_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type AllocationRule = typeof allocationRules.$inferSelect;
export type InsertAllocationRule = typeof allocationRules.$inferInsert;

// â”€â”€â”€ Allocation Runs (Ø³Ø¬Ù„ Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„ØªÙˆØ²ÙŠØ¹) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const allocationRuns = pgTable(
  "allocation_runs",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    ruleId: integer("ruleId").notNull(),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).default("draft").notNull(), // draft, posted, reversed
    totalAllocated: decimal("totalAllocated", {
      precision: 15,
      scale: 2,
    }).default("0"),
    details: jsonb("details"), // [{ targetCostCenterId, basisValue, allocatedAmount }]
    postedAt: timestamp("postedAt"),
    postedById: integer("postedById").references(() => users.id),
    reversedAt: timestamp("reversedAt"),
    reversedById: integer("reversedById").references(() => users.id),
    reversalReason: varchar("reversalReason", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_allocation_runs_tenant").on(t.tenantId),
    index("idx_allocation_runs_rule").on(t.ruleId),
    index("idx_allocation_runs_period").on(t.periodName),
    unique("allocation_runs_rule_period_unique").on(t.ruleId, t.periodName),
    check("chk_allocation_run_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type AllocationRun = typeof allocationRuns.$inferSelect;
export type InsertAllocationRun = typeof allocationRuns.$inferInsert;

// â”€â”€â”€ Budget Versions (Ø¥ØµØ¯Ø§Ø±Ø§Øª Ø§Ù„Ù…ÙˆØ§Ø²Ù†Ø©: Ù…Ø®Ø·Ø·ØŒ Ù…Ø¹ØªÙ…Ø¯ØŒ Ù…Ù†Ù‚Ø­) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const budgetVersionEnum = pgEnum("budget_version", [
  "draft",
  "approved",
  "revised",
  "final",
]);

export const budgetScenarios = pgTable(
  "budget_scenarios",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    version: budgetVersionEnum("version").default("draft").notNull(),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    costCenterId: integer("costCenterId").references(() => costCenters.id),
    // Scenario assumptions
    assumptions: jsonb("assumptions"), // { growthRate, inflationRate, fxRate, ... }
    // Status
    approvedById: integer("approvedById").references(() => users.id),
    approvedAt: timestamp("approvedAt"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_budget_scenarios_tenant").on(t.tenantId),
    index("idx_budget_scenarios_period").on(t.periodName),
    unique("budget_scenarios_tenant_name_period_unique").on(
      t.tenantId,
      t.name,
      t.periodName
    ),
    check(
      "chk_budget_scenario_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type BudgetScenario = typeof budgetScenarios.$inferSelect;
export type InsertBudgetScenario = typeof budgetScenarios.$inferInsert;

// â”€â”€â”€ Budget Lines (ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…ÙˆØ§Ø²Ù†Ø© Ù„ÙƒÙ„ Ø­Ø³Ø§Ø¨/Ù…Ø±ÙƒØ²) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const budgetLines = pgTable(
  "budget_lines",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    scenarioId: integer("scenarioId").notNull(),
    accountId: integer("accountId")
      .notNull()
      .references(() => accounts.id),
    costCenterId: integer("costCenterId").references(() => costCenters.id),
    periodName: varchar("periodName", { length: 50 }).notNull(), // monthly breakdown
    amount: decimal("amount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    spentAmount: decimal("spent_amount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    quantity: decimal("quantity", { precision: 15, scale: 4 }), // for driver-based budgets
    unitPrice: decimal("unitPrice", { precision: 15, scale: 4 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_budget_lines_tenant").on(t.tenantId),
    index("idx_budget_lines_scenario").on(t.scenarioId),
    index("idx_budget_lines_account").on(t.accountId),
    index("idx_budget_lines_cc_period").on(t.costCenterId, t.periodName),
    unique("budget_lines_scenario_account_cc_period_unique").on(
      t.scenarioId,
      t.accountId,
      t.costCenterId,
      t.periodName
    ),
    check("chk_budget_line_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type BudgetLine = typeof budgetLines.$inferSelect;
export type InsertBudgetLine = typeof budgetLines.$inferInsert;

// â”€â”€â”€ Variance Analysis (ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø§Ù†Ø­Ø±Ø§ÙØ§Øª) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const varianceAnalyses = pgTable(
  "variance_analyses",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    scenarioId: integer("scenarioId").notNull(),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    accountId: integer("accountId")
      .notNull()
      .references(() => accounts.id),
    costCenterId: integer("costCenterId").references(() => costCenters.id),
    budgetAmount: decimal("budgetAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    actualAmount: decimal("actualAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    varianceAmount: decimal("varianceAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    variancePercent: decimal("variancePercent", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    varianceType: varchar("varianceType", { length: 20 }), // favorable, unfavorable
    // Variance breakdown
    priceVariance: decimal("priceVariance", {
      precision: 15,
      scale: 2,
    }).default("0"),
    quantityVariance: decimal("quantityVariance", {
      precision: 15,
      scale: 2,
    }).default("0"),
    mixVariance: decimal("mixVariance", { precision: 15, scale: 2 }).default(
      "0"
    ),
    volumeVariance: decimal("volumeVariance", {
      precision: 15,
      scale: 2,
    }).default("0"),
    // Commentary
    commentary: text("commentary"),
    reviewedById: integer("reviewedById").references(() => users.id),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_variance_tenant").on(t.tenantId),
    index("idx_variance_scenario").on(t.scenarioId),
    index("idx_variance_account_cc").on(t.accountId, t.costCenterId),
    index("idx_variance_period").on(t.periodName),
    unique("variance_scenario_account_cc_period_unique").on(
      t.scenarioId,
      t.accountId,
      t.costCenterId,
      t.periodName
    ),
    check("chk_variance_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type VarianceAnalysis = typeof varianceAnalyses.$inferSelect;
export type InsertVarianceAnalysis = typeof varianceAnalyses.$inferInsert;

// â”€â”€â”€ KPI Definitions (ØªØ¹Ø±ÙŠÙ Ø§Ù„Ù…Ø¤Ø´Ø±Ø§Øª Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const kpiDataTypeEnum = pgEnum("kpi_data_type", [
  "currency",
  "percentage",
  "ratio",
  "count",
  "days",
  "custom",
]);

export const kpiFrequencyEnum = pgEnum("kpi_frequency", [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "realtime",
]);

export const kpis = pgTable(
  "kpis",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    nameAr: varchar("nameAr", { length: 150 }),
    description: text("description"),
    category: varchar("category", { length: 50 }), // financial, operational, sales, hr, inventory
    dataType: kpiDataTypeEnum("dataType").default("currency").notNull(),
    frequency: kpiFrequencyEnum("frequency").default("monthly").notNull(),
    // Formula / Calculation
    formula: text("formula"), // SQL or expression: (revenue - cogs) / revenue * 100
    numeratorAccountIds: jsonb("numeratorAccountIds"), // account IDs for numerator
    denominatorAccountIds: jsonb("denominatorAccountIds"), // account IDs for denominator
    // Targets
    targetValue: decimal("targetValue", { precision: 15, scale: 4 }),
    targetMin: decimal("targetMin", { precision: 15, scale: 4 }),
    targetMax: decimal("targetMax", { precision: 15, scale: 4 }),
    // Thresholds for alerts
    warningThreshold: decimal("warningThreshold", { precision: 15, scale: 4 }),
    criticalThreshold: decimal("criticalThreshold", {
      precision: 15,
      scale: 4,
    }),
    // Direction
    higherIsBetter: boolean("higherIsBetter").default(true).notNull(),
    // Display
    decimalPlaces: integer("decimalPlaces").default(2).notNull(),
    chartType: varchar("chartType", { length: 20 }).default("line"), // line, bar, gauge, kpi_card
    color: varchar("color", { length: 20 }).default("#3B82F6"),
    // Status
    isActive: boolean("isActive").default(true).notNull(),
    isSystem: boolean("isSystem").default(false).notNull(), // built-in KPIs
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_kpis_tenant").on(t.tenantId),
    index("idx_kpis_category").on(t.category),
    unique("kpis_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_kpi_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type KPI = typeof kpis.$inferSelect;
export type InsertKPI = typeof kpis.$inferInsert;

// â”€â”€â”€ KPI Measurements (Ù‚ÙŠÙ… Ø§Ù„Ù…Ø¤Ø´Ø±Ø§Øª Ø§Ù„Ù…Ø­Ø³ÙˆØ¨Ø©) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const kpiMeasurements = pgTable(
  "kpi_measurements",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    kpiId: integer("kpiId").notNull(),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    costCenterId: integer("costCenterId").references(() => costCenters.id),
    value: decimal("value", { precision: 15, scale: 4 }).notNull(),
    targetValue: decimal("targetValue", { precision: 15, scale: 4 }),
    variance: decimal("variance", { precision: 15, scale: 4 }),
    variancePercent: decimal("variancePercent", { precision: 10, scale: 2 }),
    status: varchar("status", { length: 20 }).default("on_track").notNull(), // on_track, warning, critical
    computedAt: timestamp("computedAt").defaultNow().notNull(),
    computedBy: varchar("computedBy", { length: 50 }).default("auto"), // auto, manual
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_kpi_measurements_tenant").on(t.tenantId),
    index("idx_kpi_measurements_kpi").on(t.kpiId),
    index("idx_kpi_measurements_period").on(t.periodName),
    index("idx_kpi_measurements_status").on(t.status),
    unique("kpi_measurements_kpi_period_cc_unique").on(
      t.kpiId,
      t.periodName,
      t.costCenterId
    ),
    check(
      "chk_kpi_measurement_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type KPIMeasurement = typeof kpiMeasurements.$inferSelect;
export type InsertKPIMeasurement = typeof kpiMeasurements.$inferInsert;

// â”€â”€â”€ Report Definitions (ØªØ¹Ø±ÙŠÙ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ù…Ø±Ù†Ø©) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const reportTypeEnum = pgEnum("report_type", [
  "tabular",
  "pivot",
  "chart",
  "dashboard",
  "financial_statement",
  "custom",
]);

export const reportDefinitions = pgTable(
  "report_definitions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    nameAr: varchar("nameAr", { length: 150 }),
    description: text("description"),
    type: reportTypeEnum("type").default("tabular").notNull(),
    category: varchar("category", { length: 50 }), // financial, managerial, operational, compliance
    // Data Source
    dataSource: varchar("dataSource", { length: 100 }).notNull(), // transactions, accounts, budget_lines, kpi_measurements, custom_sql
    queryConfig: jsonb("queryConfig").notNull(), // { filters, dimensions, measures, sorting, grouping }
    // Layout
    layoutConfig: jsonb("layoutConfig"), // { columns, rows, values, filters, formatting }
    chartConfig: jsonb("chartConfig"), // for chart types
    // Parameters
    parameters: jsonb("parameters"), // [{ name, type, default, required, options }]
    // Scheduling
    isScheduled: boolean("isScheduled").default(false).notNull(),
    scheduleCron: varchar("scheduleCron", { length: 100 }), // cron expression
    scheduleRecipients: jsonb("scheduleRecipients"), // [{ userId, email, format }]
    lastGeneratedAt: timestamp("lastGeneratedAt"),
    // Permissions
    isPublic: boolean("isPublic").default(false).notNull(),
    allowedRoles: jsonb("allowedRoles"), // role IDs
    allowedUsers: jsonb("allowedUsers"), // user IDs
    // Versioning
    version: integer("version").default(1).notNull(),
    parentReportId: integer("parentReportId"), // for derived reports
    // Status
    isActive: boolean("isActive").default(true).notNull(),
    isSystem: boolean("isSystem").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    createdById: integer("createdById").references(() => users.id),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_report_defs_tenant").on(t.tenantId),
    index("idx_report_defs_category").on(t.category),
    unique("report_defs_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_report_def_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type ReportDefinition = typeof reportDefinitions.$inferSelect;
export type InsertReportDefinition = typeof reportDefinitions.$inferInsert;

// â”€â”€â”€ Report Executions (Ø³Ø¬Ù„ ØªÙ†ÙÙŠØ° Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const reportExecutions = pgTable(
  "report_executions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    reportId: integer("reportId").notNull(),
    parameters: jsonb("parameters"),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, running, completed, failed
    resultData: jsonb("resultData"), // cached result
    resultUrl: varchar("resultUrl", { length: 500 }), // exported file URL
    rowCount: integer("rowCount").default(0),
    executionTimeMs: integer("executionTimeMs").default(0),
    errorMessage: text("errorMessage"),
    executedById: integer("executedById").references(() => users.id),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_report_executions_tenant").on(t.tenantId),
    index("idx_report_executions_report").on(t.reportId),
    index("idx_report_executions_status").on(t.status),
    check(
      "chk_report_execution_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type ReportExecution = typeof reportExecutions.$inferSelect;
export type InsertReportExecution = typeof reportExecutions.$inferInsert;

// â”€â”€â”€ Consolidation Entities (ÙƒÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¯Ù…Ø¬ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const consolidationMethodEnum = pgEnum("consolidation_method", [
  "full", // Ø¯Ù…Ø¬ ÙƒØ§Ù…Ù„
  "proportional", // ØªÙ†Ø§Ø³Ø¨ÙŠ (equity method)
  "cost", // ØªÙƒÙ„ÙØ©
]);

export const consolidationEntities = pgTable(
  "consolidation_entities",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id), // parent/group tenant
    code: varchar("code", { length: 30 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    entityTenantId: integer("entityTenantId").notNull(), // child/subsidiary tenant
    ownershipPercent: decimal("ownershipPercent", { precision: 5, scale: 2 })
      .default("100")
      .notNull(),
    method: consolidationMethodEnum("method").default("full").notNull(),
    functionalCurrency: varchar("functionalCurrency", { length: 10 })
      .default("YER")
      .notNull(),
    reportingCurrency: varchar("reportingCurrency", { length: 10 })
      .default("YER")
      .notNull(),
    // Elimination rules
    eliminationRules: jsonb("eliminationRules"), // [{ fromEntity, toEntity, accountId, rule }]
    // Status
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_consolidation_entities_tenant").on(t.tenantId),
    index("idx_consolidation_entities_entity").on(t.entityTenantId),
    unique("consolidation_entities_tenant_code_unique").on(t.tenantId, t.code),
    check(
      "chk_consolidation_ownership",
      sql`${t.ownershipPercent} > 0 AND ${t.ownershipPercent} <= 100`
    ),
    check("chk_consolidation_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type ConsolidationEntity = typeof consolidationEntities.$inferSelect;
export type InsertConsolidationEntity =
  typeof consolidationEntities.$inferInsert;

// â”€â”€â”€ Consolidation Adjustments (Ù‚ÙˆØ§Ø¦Ù… Ø§Ù„Ø¯Ù…Ø¬) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const consolidationAdjustments = pgTable(
  "consolidation_adjustments",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    periodName: varchar("periodName", { length: 50 }).notNull(),
    consolidationEntityId: integer("consolidationEntityId").notNull(),
    adjustmentType: varchar("adjustmentType", { length: 50 }).notNull(), // elimination, translation, goodwill, nci
    accountId: integer("accountId")
      .notNull()
      .references(() => accounts.id),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull(),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 }).default(
      "1"
    ),
    description: text("description"),
    postedAt: timestamp("postedAt"),
    postedById: integer("postedById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_consolidation_adj_tenant").on(t.tenantId),
    index("idx_consolidation_adj_period").on(t.periodName),
    index("idx_consolidation_adj_entity").on(t.consolidationEntityId),
    check(
      "chk_consolidation_adj_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type ConsolidationAdjustment =
  typeof consolidationAdjustments.$inferSelect;
export type InsertConsolidationAdjustment =
  typeof consolidationAdjustments.$inferInsert;
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€â”€ PHARMACY MODULE (FDA/WHO/JCAHO aligned) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const prescriptions = pgTable(
  "prescriptions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    customerId: varchar("customer_id", { length: 255 }).notNull(),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    doctorName: varchar("doctor_name", { length: 255 }).notNull(),
    doctorLicense: varchar("doctor_license", { length: 100 }).notNull(),
    issueDate: timestamp("issue_date").notNull(),
    expiryDate: timestamp("expiry_date").notNull(),
    status: prescriptionStatusEnum("status").default("pending").notNull(),
    notes: text("notes"),
    prescriptionNumber: varchar("prescription_number", { length: 50 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_prescriptions_tenant").on(t.tenantId),
    index("idx_prescriptions_customer").on(t.customerId),
    index("idx_prescriptions_status").on(t.status),
    index("idx_prescriptions_expiry").on(t.expiryDate),
  ]
);

export const prescriptionItems = pgTable(
  "prescription_items",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    prescriptionId: integer("prescription_id").notNull(),
    productId: integer("product_id").notNull(),
    quantity: integer("quantity").notNull(),
    dosage: varchar("dosage", { length: 100 }),
    frequency: varchar("frequency", { length: 100 }),
    duration: varchar("duration", { length: 100 }),
    instructions: text("instructions"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
  },
  t => [
    index("idx_prescription_items_prescription").on(t.prescriptionId),
    index("idx_prescription_items_product").on(t.productId),
  ]
);

export const controlledSubstancesLog = pgTable(
  "controlled_substances_log",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    productId: integer("product_id").notNull(),
    operation: varchar("operation", { length: 20 }).notNull(),
    quantity: integer("quantity").notNull(),
    reason: text("reason").notNull(),
    referenceNumber: varchar("reference_number", { length: 100 }),
    userId: integer("user_id").notNull(),
    customerId: varchar("customer_id", { length: 255 }),
    prescriptionId: integer("prescription_id"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
  },
  t => [
    index("idx_controlled_log_product").on(t.productId),
    index("idx_controlled_log_tenant").on(t.tenantId),
    index("idx_controlled_log_timestamp").on(t.timestamp),
  ]
);

export const drugInteractions = pgTable(
  "drug_interactions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").references(() => tenants.id),
    drugA: varchar("drug_a", { length: 200 }).notNull(),
    drugB: varchar("drug_b", { length: 200 }).notNull(),
    severity: drugInteractionSeverityEnum("severity").notNull(),
    description: text("description").notNull(),
    mechanism: text("mechanism"),
    clinicalEffect: text("clinical_effect"),
    recommendation: text("recommendation"),
    evidenceLevel: varchar("evidence_level", { length: 20 }),
    source: varchar("source", { length: 100 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_drug_interactions_a").on(t.drugA),
    index("idx_drug_interactions_b").on(t.drugB),
    index("idx_drug_interactions_tenant").on(t.tenantId),
  ]
);

export const patientAllergies = pgTable(
  "patient_allergies",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    customerId: varchar("customer_id", { length: 255 }).notNull(),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    allergen: varchar("allergen", { length: 200 }).notNull(),
    allergenType: varchar("allergen_type", { length: 50 }).notNull(),
    severity: varchar("severity", { length: 20 }).notNull(),
    reaction: text("reaction"),
    diagnosedBy: varchar("diagnosed_by", { length: 255 }),
    diagnosedAt: varchar("diagnosed_at", { length: 20 }),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_patient_allergies_customer").on(t.customerId),
    index("idx_patient_allergies_tenant").on(t.tenantId),
  ]
);
export const insuranceClaims = pgTable(
  "insurance_claims",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    claimNumber: varchar("claim_number", { length: 50 }).notNull(),
    prescriptionId: integer("prescription_id"),
    customerId: varchar("customer_id", { length: 255 }).notNull(),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    insuranceProvider: varchar("insurance_provider", { length: 200 }).notNull(),
    policyNumber: varchar("policy_number", { length: 100 }).notNull(),
    totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull(),
    coveredAmount: decimal("covered_amount", {
      precision: 14,
      scale: 2,
    }).default("0"),
    copayAmount: decimal("copay_amount", { precision: 14, scale: 2 }).default(
      "0"
    ),
    status: varchar("status", { length: 20 }).default("DRAFT").notNull(),
    submittedAt: timestamp("submitted_at"),
    responseAt: timestamp("response_at"),
    rejectionReason: text("rejection_reason"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_insurance_claims_tenant").on(t.tenantId),
    index("idx_insurance_claims_prescription").on(t.prescriptionId),
    index("idx_insurance_claims_customer").on(t.customerId),
  ]
);

export const drugRecalls = pgTable(
  "drug_recalls",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").references(() => tenants.id),
    productId: integer("product_id"),
    batchId: integer("batch_id"),
    drugName: varchar("drug_name", { length: 200 }).notNull(),
    recallClass: varchar("recall_class", { length: 20 }).notNull(),
    reason: text("reason").notNull(),
    manufacturer: varchar("manufacturer", { length: 200 }),
    recallDate: varchar("recall_date", { length: 20 }).notNull(),
    initiatedBy: varchar("initiated_by", { length: 200 }),
    affectedQuantity: integer("affected_quantity"),
    action: varchar("action", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).default("OPEN").notNull(),
    resolvedAt: timestamp("resolved_at"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_drug_recalls_tenant").on(t.tenantId),
    index("idx_drug_recalls_status").on(t.status),
    index("idx_drug_recalls_class").on(t.recallClass),
  ]
);
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€â”€ QUOTATION ENGINE (industry-agnostic, configuration-driven) â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const quotationDirectionEnum = pgEnum("quotation_direction", [
  "sale",
  "purchase",
]);
export const quotationStatusEnum = pgEnum("quotation_status", [
  "draft",
  "in_review",
  "approved",
  "sent",
  "negotiating",
  "accepted",
  "rejected",
  "expired",
  "converted",
  "closed",
  "cancelled",
]);
export const quotationItemKindEnum = pgEnum("quotation_item_kind", [
  "product",
  "service",
  "project",
  "subscription",
  "production",
  "distribution",
  "other",
]);
export const quotationApprovalStatusEnum = pgEnum("quotation_approval_status", [
  "pending",
  "approved",
  "rejected",
]);
export const quotationNegotiationSideEnum = pgEnum(
  "quotation_negotiation_side",
  ["us", "counterparty"]
);
export const quotationPartyRoleEnum = pgEnum("quotation_party_role", [
  "customer",
  "supplier",
  "broker",
  "sales_rep",
  "approver",
  "contact",
]);
export const quotationLinkTypeEnum = pgEnum("quotation_link_type", [
  "crm_customer",
  "crm_supplier",
  "inventory_product",
  "procurement",
  "sales_order",
  "sales_invoice",
  "purchase_order",
  "purchase_invoice",
  "project",
  "service",
  "production_order",
  "accounting_entry",
]);
export const quotationTypes = pgTable(
  "quotation_types",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    nameAr: varchar("nameAr", { length: 255 }),
    direction: quotationDirectionEnum("direction").default("sale").notNull(),
    itemKinds: jsonb("itemKinds").default(["product", "service"]).notNull(),
    defaultValidityDays: integer("defaultValidityDays").default(30).notNull(),
    defaultTerms: jsonb("defaultTerms").default([]),
    pricingConfig: jsonb("pricingConfig").default({}),
    approvalPolicy: jsonb("approvalPolicy").default({}),
    numberingPrefix: varchar("numberingPrefix", { length: 20 }).default("QT"),
    isActive: boolean("isActive").default(true).notNull(),
    isSystem: boolean("isSystem").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_quotation_types_tenant").on(t.tenantId),
    unique("quotation_types_code_tenant_unique").on(t.code, t.tenantId),
  ]
);

export const quotations = pgTable(
  "quotations",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    country: varchar("country", { length: 100 }).default("Ø§Ù„ÙŠÙ…Ù†"),
    workSiteId: integer("workSiteId"),
    deviceId: integer("deviceId"),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    globalCode: varchar("globalCode", { length: 160 }),
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
    quotationNumber: varchar("quotationNumber", { length: 50 }).notNull(),
    typeId: integer("typeId"),
    direction: quotationDirectionEnum("direction").default("sale").notNull(),
    status: quotationStatusEnum("status").default("draft").notNull(),
    version: integer("version").default(1).notNull(),
    customerId: integer("customerId").references(() => customers.id),
    supplierId: integer("supplierId").references(() => suppliers.id),
    counterpartyName: varchar("counterpartyName", { length: 255 }),
    branchId: integer("branchId").references(() => branches.id),
    costCenterId: integer("costCenterId").references(() => costCenters.id),
    warehouseId: integer("warehouseId").references(() => warehouses.id),
    projectId: integer("projectId"),
    currency: varchar("currency", { length: 10 }).default("YER").notNull(),
    currencyRate: decimal("currencyRate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    subtotal: decimal("subtotal", { precision: 18, scale: 2 }).default("0"),
    discountTotal: decimal("discountTotal", {
      precision: 18,
      scale: 2,
    }).default("0"),
    taxTotal: decimal("taxTotal", { precision: 18, scale: 2 }).default("0"),
    commissionTotal: decimal("commissionTotal", {
      precision: 18,
      scale: 2,
    }).default("0"),
    grandTotal: decimal("grandTotal", { precision: 18, scale: 2 }).default("0"),
    costTotal: decimal("costTotal", { precision: 18, scale: 2 }).default("0"),
    marginTotal: decimal("marginTotal", { precision: 18, scale: 2 }).default(
      "0"
    ),
    marginPct: decimal("marginPct", { precision: 10, scale: 4 }).default("0"),
    paymentTerms: text("paymentTerms"),
    deliveryTerms: text("deliveryTerms"),
    validityDate: timestamp("validityDate"),
    notes: text("notes"),
    convertedRefType: varchar("convertedRefType", { length: 50 }),
    convertedRefId: integer("convertedRefId"),
    createdById: integer("createdById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_quotations_tenant").on(t.tenantId),
    index("idx_quotations_type").on(t.typeId),
    index("idx_quotations_status").on(t.status),
    index("idx_quotations_direction").on(t.direction),
    index("idx_quotations_customer").on(t.customerId),
    index("idx_quotations_supplier").on(t.supplierId),
    index("idx_quotations_updated").on(t.updatedAt),
    uniqueIndex("uq_quotations_tenant_number").on(
      t.tenantId,
      t.quotationNumber
    ),
  ]
);
export const quotationItems = pgTable(
  "quotation_items",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    quotationId: integer("quotationId").notNull(),
    kind: quotationItemKindEnum("kind").default("product").notNull(),
    refId: integer("refId"),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    quantity: decimal("quantity", { precision: 15, scale: 4 }).default("1"),
    unit: varchar("unit", { length: 50 }),
    unitPrice: decimal("unitPrice", { precision: 18, scale: 4 }).default("0"),
    costPrice: decimal("costPrice", { precision: 18, scale: 4 }).default("0"),
    discountPct: decimal("discountPct", { precision: 10, scale: 4 }).default(
      "0"
    ),
    discountAmount: decimal("discountAmount", {
      precision: 18,
      scale: 2,
    }).default("0"),
    taxPct: decimal("taxPct", { precision: 10, scale: 4 }).default("0"),
    taxAmount: decimal("taxAmount", { precision: 18, scale: 2 }).default("0"),
    lineTotal: decimal("lineTotal", { precision: 18, scale: 2 }).default("0"),
    lineCost: decimal("lineCost", { precision: 18, scale: 2 }).default("0"),
    lineMargin: decimal("lineMargin", { precision: 18, scale: 2 }).default("0"),
    sortOrder: integer("sortOrder").default(0),
    config: jsonb("config").default({}),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_quotation_items_quotation").on(t.quotationId),
    index("idx_quotation_items_ref").on(t.kind, t.refId),
  ]
);

export const quotationVersions = pgTable(
  "quotation_versions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    quotationId: integer("quotationId").notNull(),
    versionNo: integer("versionNo").default(1).notNull(),
    snapshot: jsonb("snapshot").notNull(),
    changeSummary: text("changeSummary"),
    createdById: integer("createdById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_quotation_versions_quotation").on(t.quotationId),
    unique("quotation_versions_quotation_version_unique").on(
      t.quotationId,
      t.versionNo
    ),
  ]
);

export const quotationAlternatives = pgTable(
  "quotation_alternatives",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    quotationId: integer("quotationId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    itemsJson: jsonb("itemsJson").default([]),
    totalsJson: jsonb("totalsJson").default({}),
    isSelected: boolean("isSelected").default(false),
    createdById: integer("created_by_id").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [index("idx_quotation_alternatives_quotation").on(t.quotationId)]
);

export const quotationTerms = pgTable(
  "quotation_terms",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    quotationId: integer("quotationId").notNull(),
    category: varchar("category", { length: 50 }),
    title: varchar("title", { length: 255 }),
    body: text("body"),
    sortOrder: integer("sortOrder").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [index("idx_quotation_terms_quotation").on(t.quotationId)]
);

export const quotationParties = pgTable(
  "quotation_parties",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    quotationId: integer("quotationId").notNull(),
    role: quotationPartyRoleEnum("role").notNull(),
    entityType: varchar("entityType", { length: 50 }),
    entityId: integer("entityId"),
    name: varchar("name", { length: 255 }).notNull(),
    commissionPct: decimal("commissionPct", {
      precision: 10,
      scale: 4,
    }).default("0"),
    commissionAmount: decimal("commissionAmount", {
      precision: 18,
      scale: 2,
    }).default("0"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_quotation_parties_quotation").on(t.quotationId),
    index("idx_quotation_parties_entity").on(t.entityType, t.entityId),
  ]
);
export const quotationApprovals = pgTable(
  "quotation_approvals",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    quotationId: integer("quotationId").notNull(),
    approverId: integer("approverId"),
    approverName: varchar("approverName", { length: 255 }),
    level: integer("level").default(1),
    status: quotationApprovalStatusEnum("status").default("pending").notNull(),
    comment: text("comment"),
    decidedAt: timestamp("decidedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_quotation_approvals_quotation").on(t.quotationId),
    index("idx_quotation_approvals_approver").on(t.approverId),
  ]
);

export const quotationNegotiations = pgTable(
  "quotation_negotiations",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    quotationId: integer("quotationId").notNull(),
    round: integer("round").default(1).notNull(),
    side: quotationNegotiationSideEnum("side").notNull(),
    message: text("message").notNull(),
    proposedTotal: decimal("proposedTotal", { precision: 18, scale: 2 }),
    proposedChanges: jsonb("proposedChanges").default({}),
    createdById: integer("createdById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [index("idx_quotation_negotiations_quotation").on(t.quotationId)]
);

export const quotationAttachments = pgTable(
  "quotation_attachments",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    quotationId: integer("quotationId").notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    fileUrl: text("fileUrl").notNull(),
    fileType: varchar("fileType", { length: 100 }),
    fileSize: integer("fileSize"),
    uploadedById: integer("uploadedById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [index("idx_quotation_attachments_quotation").on(t.quotationId)]
);

export const quotationLinks = pgTable(
  "quotation_links",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    quotationId: integer("quotationId").notNull(),
    linkType: quotationLinkTypeEnum("linkType").notNull(),
    entityType: varchar("entityType", { length: 50 }).notNull(),
    entityId: integer("entityId").notNull(),
    notes: text("notes"),
    createdById: integer("createdById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_quotation_links_quotation").on(t.quotationId),
    index("idx_quotation_links_entity").on(t.entityType, t.entityId),
  ]
);

export const quotationAnalyses = pgTable(
  "quotation_analyses",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    quotationId: integer("quotationId").notNull(),
    versionNo: integer("versionNo").default(1).notNull(),
    inputHash: varchar("inputHash", { length: 64 }).notNull(),
    scores: jsonb("scores").notNull(),
    ranking: jsonb("ranking"),
    benchmarks: jsonb("benchmarks"),
    anomalies: jsonb("anomalies").default([]),
    forecast: jsonb("forecast"),
    recommendations: jsonb("recommendations").default([]),
    whatIf: jsonb("whatIf").default([]),
    generatedBy: varchar("generatedBy", { length: 30 })
      .default("engine")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_quotation_analyses_quotation").on(t.quotationId),
    index("idx_quotation_analyses_created").on(t.createdAt),
  ]
);

export const quotationAlerts = pgTable(
  "quotation_alerts",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    quotationId: integer("quotationId"),
    alertType: varchar("alertType", { length: 40 }).notNull(),
    severity: varchar("severity", { length: 20 }).default("info").notNull(),
    message: text("message").notNull(),
    evidence: jsonb("evidence").default({}),
    isRead: boolean("isRead").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_quotation_alerts_tenant").on(t.tenantId),
    index("idx_quotation_alerts_quotation").on(t.quotationId),
    index("idx_quotation_alerts_unread").on(t.tenantId, t.isRead),
  ]
);
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€â”€ VOUCHERS SYSTEM (GAAP/IFRS aligned) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const voucherTypeEnum = pgEnum("voucher_type", [
  "payment",
  "receipt",
  "journal",
  "adjustment",
]);
export const voucherStatusEnum = pgEnum("voucher_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "posted",
  "cancelled",
]);
export const voucherApprovalLevelEnum = pgEnum("voucher_approval_level", [
  "none",
  "level1",
  "level2",
  "level3",
  "final",
]);
export const vouchers = pgTable(
  "vouchers",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    voucherNumber: varchar("voucher_number", { length: 50 }).notNull(),
    voucherPrefix: varchar("voucher_prefix", { length: 10 })
      .default("VCH")
      .notNull(),
    voucherType: voucherTypeEnum("voucher_type").notNull(),
    status: voucherStatusEnum("status").default("draft").notNull(),
    voucherDate: timestamp("voucher_date").notNull(),
    dueDate: timestamp("due_date"),
    postingDate: timestamp("posting_date"),
    amount: decimal("amount", { precision: 18, scale: 4 }).notNull(),
    baseAmount: decimal("base_amount", { precision: 18, scale: 4 })
      .default("0")
      .notNull(),
    currencyId: integer("currency_id"),
    exchangeRate: decimal("exchange_rate", { precision: 18, scale: 8 })
      .default("1")
      .notNull(),
    counterpartyType: varchar("counterparty_type", { length: 20 }),
    counterpartyId: integer("counterparty_id"),
    counterpartyName: varchar("counterparty_name", { length: 255 }),
    bankAccountId: integer("bank_account_id"),
    bankAccountCode: varchar("bank_account_code", { length: 20 }),
    referenceNo: varchar("reference_no", { length: 100 }),
    referenceType: varchar("reference_type", { length: 50 }),
    referenceId: integer("reference_id"),
    linkedVoucherId: integer("linked_voucher_id"),
    departmentId: integer("department_id"),
    projectId: integer("project_id"),
    costCenterId: integer("cost_center_id").references(() => costCenters.id),
    businessUnit: varchar("business_unit", { length: 100 }),
    budgetId: integer("budget_id"),
    budgetLineId: integer("budget_line_id"),
    budgetValidated: boolean("budget_validated").default(false),
    budgetVariance: decimal("budget_variance", {
      precision: 18,
      scale: 4,
    }).default("0"),
    approvalLevel: voucherApprovalLevelEnum("approval_level").default("none"),
    approvedById: integer("approved_by_id").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    rejectedById: integer("rejected_by_id"),
    rejectedAt: timestamp("rejected_at"),
    rejectionReason: text("rejection_reason"),
    requiresLevel1Approval: boolean("requires_level1_approval").default(false),
    requiresLevel2Approval: boolean("requires_level2_approval").default(false),
    requiresLevel3Approval: boolean("requires_level3_approval").default(false),
    postedById: integer("posted_by_id").references(() => users.id),
    journalEntryId: integer("journal_entry_id").references(
      () => journalEntries.id
    ),
    reversalOfId: integer("reversal_of_id"),
    description: text("description"),
    notes: text("notes"),
    internalMemo: text("internal_memo"),
    attachmentsCount: integer("attachments_count").default(0),
    branchId: integer("branch_id").references(() => branches.id),
    createdById: integer("created_by_id").references(() => users.id),
    updatedById: integer("updated_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    serverVersion: integer("server_version").default(1).notNull(),
    lastSyncAt: timestamp("last_sync_at"),
    conflictState: varchar("conflict_state", { length: 20 }).default("none"),
    aggregateId: uuid("aggregate_id"),
  },
  t => [
    index("idx_vouchers_tenant").on(t.tenantId),
    index("idx_vouchers_number").on(t.tenantId, t.voucherNumber),
    index("idx_vouchers_type").on(t.tenantId, t.voucherType),
    index("idx_vouchers_status").on(t.tenantId, t.status),
    index("idx_vouchers_date").on(t.voucherDate),
    index("idx_vouchers_counterparty").on(t.counterpartyType, t.counterpartyId),
    index("idx_vouchers_cost_center").on(t.costCenterId),
    index("idx_vouchers_department").on(t.departmentId),
    index("idx_vouchers_project").on(t.projectId),
    index("idx_vouchers_journal").on(t.journalEntryId),
    unique("vouchers_gc_tenant_unique").on(t.tenantId, t.GlobalId),
    check("chk_voucher_amount_positive", sql`${t.amount} > 0`),
    check("chk_voucher_base_amount_positive", sql`${t.baseAmount} >= 0`),
    check("chk_voucher_exchange_rate_positive", sql`${t.exchangeRate} > 0`),
  ]
);
export const voucherLines = pgTable(
  "voucher_lines",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    voucherId: integer("voucherId").notNull(),
    accountId: integer("accountId")
      .notNull()
      .references(() => accounts.id),
    accountCode: varchar("account_code", { length: 20 }),
    accountName: varchar("account_name", { length: 255 }),
    debitAmount: decimal("debit_amount", { precision: 18, scale: 4 }).default(
      "0"
    ),
    creditAmount: decimal("credit_amount", { precision: 18, scale: 4 }).default(
      "0"
    ),
    costCenterId: integer("cost_center_id").references(() => costCenters.id),
    departmentId: integer("department_id"),
    projectId: integer("project_id"),
    allocationPercentage: decimal("allocation_percentage", {
      precision: 8,
      scale: 4,
    }).default("100"),
    allocatedAmount: decimal("allocated_amount", {
      precision: 18,
      scale: 4,
    }).default("0"),
    description: text("description"),
    reference: varchar("reference", { length: 100 }),
    lineOrder: integer("line_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
  },
  t => [
    index("idx_voucher_lines_voucher").on(t.voucherId),
    index("idx_voucher_lines_account").on(t.accountId),
    index("idx_voucher_lines_cost_center").on(t.costCenterId),
    check(
      "chk_voucher_line_allocation",
      sql`${t.allocationPercentage} >= 0 AND ${t.allocationPercentage} <= 100`
    ),
  ]
);

export const voucherApprovals = pgTable(
  "voucher_approvals",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").references(() => tenants.id),
    voucherId: integer("voucherId").notNull(),
    approverId: integer("approver_id"),
    approvalLevel: voucherApprovalLevelEnum("approval_level").default("level1"),
    status: quotationApprovalStatusEnum("status").default("pending").notNull(),
    comment: text("comment"),
    decidedAt: timestamp("decidedAt"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  t => [
    index("idx_voucher_approvals_voucher").on(t.voucherId),
    index("idx_voucher_approvals_approver").on(t.approverId),
    index("idx_voucher_approvals_level").on(t.approvalLevel),
  ]
);

export const voucherSequences = pgTable(
  "voucher_sequences",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    voucherType: voucherTypeEnum("voucher_type").notNull(),
    prefix: varchar("prefix", { length: 10 }).notNull(),
    currentNumber: integer("current_number").default(0).notNull(),
    format: varchar("format", { length: 50 })
      .default("{PREFIX}/{YYYY}/{NNNNNN}")
      .notNull(),
    resetPeriod: varchar("reset_period", { length: 20 }).default("yearly"),
    lastResetDate: timestamp("last_reset_date"),
    numberPadding: integer("number_padding").default(6),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  t => [
    index("idx_voucher_sequences_tenant").on(t.tenantId),
    unique("voucher_sequences_tenant_type_unique").on(
      t.tenantId,
      t.voucherType
    ),
  ]
);
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€â”€ HEALTHCARE & PATIENT MANAGEMENT (HIPAA/HL7 FHIR/ICD-10) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const genderEnum = pgEnum("gender", [
  "male",
  "female",
  "other",
  "unknown",
]);
export const bloodTypeEnum = pgEnum("blood_type", [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "unknown",
]);
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
]);
export const appointmentTypeEnum = pgEnum("appointment_type", [
  "new_patient",
  "follow_up",
  "consultation",
  "procedure",
  "emergency",
  "routine",
  "telemedicine",
]);
export const visitTypeEnum = pgEnum("visit_type", [
  "outpatient",
  "inpatient",
  "emergency",
  "telemedicine",
  "home_visit",
]);
export const recordEntryTypeEnum = pgEnum("record_entry_type", [
  "diagnosis",
  "procedure",
  "medication",
  "allergy",
  "vital_signs",
  "lab_result",
  "imaging",
  "note",
  "referral",
  "instruction",
]);
export const healthcareFacilities = pgTable(
  "healthcare_facilities",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    branchId: integer("branch_id"),
    name: varchar("name", { length: 200 }).notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    specialty: varchar("specialty", { length: 100 }),
    department: varchar("department", { length: 100 }),
    floor: varchar("floor", { length: 20 }),
    building: varchar("building", { length: 100 }),
    isActive: boolean("is_active").default(true).notNull(),
    acceptsInsurance: boolean("accepts_insurance").default(false).notNull(),
    insuranceProviders: jsonb("insurance_providers").default([]),
    operatingHours: jsonb("operating_hours").default({}),
    contactPhone: varchar("contact_phone", { length: 50 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_healthcare_facilities_tenant").on(t.tenantId),
    index("idx_healthcare_facilities_branch").on(t.branchId),
    index("idx_healthcare_facilities_type").on(t.type),
    unique("uq_healthcare_facility_code").on(t.tenantId, t.code),
  ]
);

export const healthcareProviders = pgTable(
  "healthcare_providers",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    employeeId: integer("employee_id"),
    userId: uuid("user_id"),
    facilityId: integer("facility_id"),
    licenseNumber: varchar("license_number", { length: 100 }),
    specialization: varchar("specialization", { length: 100 }).notNull(),
    title: varchar("title", { length: 50 }),
    qualifications: jsonb("qualifications").default([]),
    yearsExperience: integer("years_experience"),
    consultationFee: decimal("consultation_fee", { precision: 14, scale: 2 }),
    followUpFee: decimal("follow_up_fee", { precision: 14, scale: 2 }),
    isActive: boolean("is_active").default(true).notNull(),
    isAcceptingPatients: boolean("is_accepting_patients")
      .default(true)
      .notNull(),
    scheduleTemplate: jsonb("schedule_template").default({}),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_healthcare_providers_tenant").on(t.tenantId),
    index("idx_healthcare_providers_employee").on(t.employeeId),
    index("idx_healthcare_providers_facility").on(t.facilityId),
  ]
);

export const patients = pgTable(
  "patients",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    patientNumber: varchar("patient_number", { length: 50 }).notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    localFirstName: varchar("local_first_name", { length: 100 }),
    localLastName: varchar("local_last_name", { length: 100 }),
    gender: genderEnum("gender"),
    dateOfBirth: timestamp("date_of_birth"),
    age: integer("age"),
    bloodType: bloodTypeEnum("blood_type"),
    nationality: varchar("nationality", { length: 100 }),
    nationalId: varchar("national_id", { length: 100 }),
    passportNumber: varchar("passport_number", { length: 100 }),
    maritalStatus: varchar("marital_status", { length: 50 }),
    occupation: varchar("occupation", { length: 100 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    mobile: varchar("mobile", { length: 50 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    region: varchar("region", { length: 100 }),
    postalCode: varchar("postal_code", { length: 20 }),
    country: varchar("country", { length: 100 }),
    emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
    emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),
    emergencyContactRelation: varchar("emergency_contact_relation", {
      length: 50,
    }),
    insuranceProvider: varchar("insurance_provider", { length: 200 }),
    insurancePolicyNumber: varchar("insurance_policy_number", { length: 100 }),
    insuranceCardNumber: varchar("insurance_card_number", { length: 100 }),
    insuranceExpiry: varchar("insurance_expiry", { length: 20 }),
    primaryProviderId: integer("primary_provider_id"),
    primaryFacilityId: integer("primary_facility_id"),
    allergies: jsonb("allergies").default([]),
    chronicConditions: jsonb("chronic_conditions").default([]),
    notes: text("notes"),
    isVIP: boolean("is_vip").default(false),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_patients_tenant").on(t.tenantId),
    index("idx_patients_number").on(t.patientNumber),
    index("idx_patients_name").on(t.fullName),
    index("idx_patients_phone").on(t.phone),
    index("idx_patients_national_id").on(t.nationalId),
    unique("uq_patients_number_tenant").on(t.tenantId, t.patientNumber),
  ]
);
export const appointments = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    appointmentNumber: varchar("appointment_number", { length: 50 }).notNull(),
    patientId: integer("patient_id").notNull(),
    providerId: integer("provider_id"),
    facilityId: integer("facility_id"),
    appointmentType:
      appointmentTypeEnum("appointment_type").default("new_patient"),
    status: appointmentStatusEnum("status").default("scheduled").notNull(),
    scheduledDate: timestamp("scheduled_date"),
    scheduledTime: varchar("scheduled_time", { length: 20 }),
    scheduledEndTime: varchar("scheduled_end_time", { length: 20 }),
    duration: integer("duration"),
    chiefComplaint: text("chief_complaint"),
    notes: text("notes"),
    reason: text("reason"),
    isFirstVisit: boolean("is_first_visit").default(false),
    isTelemedicine: boolean("is_telemedicine").default(false),
    consultationFee: decimal("consultation_fee", { precision: 14, scale: 2 }),
    visitType: visitTypeEnum("visit_type").default("outpatient"),
    checkedInAt: timestamp("checked_in_at"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
    noShowAt: timestamp("no_show_at"),
    rescheduledFromId: integer("rescheduled_from_id"),
    createdById: integer("created_by_id"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_appointments_tenant").on(t.tenantId),
    index("idx_appointments_patient").on(t.patientId),
    index("idx_appointments_provider").on(t.providerId),
    index("idx_appointments_facility").on(t.facilityId),
    index("idx_appointments_status").on(t.status),
    index("idx_appointments_date").on(t.scheduledDate),
    // PERFORMANCE: ÙÙ‡Ø§Ø±Ø³ Ù…Ø±ÙƒØ¨Ø© Ù„Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø³Ø§Ø®Ù†Ø© (Ù…Ø¤Ø³Ø³Ø© + ØªØ±ØªÙŠØ¨/ØªØµÙÙŠØ©)
    index("idx_appointments_tenant_date").on(t.tenantId, t.scheduledDate),
    index("idx_appointments_tenant_patient_date").on(
      t.tenantId,
      t.patientId,
      t.scheduledDate
    ),
    index("idx_appointments_tenant_provider_date").on(
      t.tenantId,
      t.providerId,
      t.scheduledDate
    ),
    index("idx_appointments_tenant_status_date").on(
      t.tenantId,
      t.status,
      t.scheduledDate
    ),
    unique("uq_appointments_number_tenant").on(t.tenantId, t.appointmentNumber),
  ]
);

export const medicalRecords = pgTable(
  "medical_records",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    recordNumber: varchar("record_number", { length: 50 }).notNull(),
    patientId: integer("patient_id").notNull(),
    appointmentId: integer("appointment_id"),
    visitType: visitTypeEnum("visit_type").default("outpatient"),
    providerId: integer("provider_id"),
    facilityId: integer("facility_id"),
    visitDate: timestamp("visit_date"),
    admissionDate: timestamp("admission_date"),
    dischargeDate: timestamp("discharge_date"),
    chiefComplaint: text("chief_complaint"),
    historyOfPresentIllness: text("history_of_present_illness"),
    physicalExamination: text("physical_examination"),
    assessment: text("assessment"),
    plan: text("plan"),
    createdById: integer("created_by_id"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_medical_records_tenant").on(t.tenantId),
    index("idx_medical_records_patient").on(t.patientId),
    index("idx_medical_records_visit_date").on(t.visitDate),
    index("idx_medical_records_provider").on(t.providerId),
    unique("uq_medical_records_number_tenant").on(t.tenantId, t.recordNumber),
  ]
);

export const diagnosisTypeEnum = pgEnum("diagnosis_type", [
  "primary",
  "secondary",
  "complication",
  "cause_of_death",
]);
export const icdCodeSystemEnum = pgEnum("icd_code_system", [
  "ICD10",
  "ICD9",
  "ICPC2",
  "SNOMED_CT",
]);

export const medicalRecordEntries = pgTable(
  "medical_record_entries",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    recordId: integer("record_id").notNull(),
    patientId: integer("patient_id").notNull(),
    entryType: recordEntryTypeEnum("entry_type").notNull(),
    diagnosisType: diagnosisTypeEnum("diagnosis_type"),
    icdCode: varchar("icd_code", { length: 20 }),
    icdCodeSystem: icdCodeSystemEnum("icd_code_system"),
    diagnosisDescription: text("diagnosis_description"),
    isConfirmed: boolean("is_confirmed").default(false),
    severity: varchar("severity", { length: 20 }),
    notes: text("notes"),
    createdById: integer("created_by_id"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_medical_record_entries_record").on(t.recordId),
    index("idx_medical_record_entries_patient").on(t.patientId),
    index("idx_medical_record_entries_type").on(t.entryType),
  ]
);
export const vitalSignRecords = pgTable(
  "vital_sign_records",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    patientId: integer("patient_id").notNull(),
    recordId: integer("record_id"),
    appointmentId: integer("appointment_id"),
    recordedAt: timestamp("recorded_at").notNull(),
    recordedBy: integer("recorded_by").notNull(),
    temperature: decimal("temperature", { precision: 5, scale: 2 }),
    temperatureUnit: varchar("temperature_unit", { length: 10 }).default("C"),
    heartRate: integer("heart_rate"),
    respiratoryRate: integer("respiratory_rate"),
    bloodPressureSystolic: integer("blood_pressure_systolic"),
    bloodPressureDiastolic: integer("blood_pressure_diastolic"),
    oxygenSaturation: decimal("oxygen_saturation", { precision: 5, scale: 2 }),
    weight: decimal("weight", { precision: 6, scale: 2 }),
    height: decimal("height", { precision: 6, scale: 2 }),
    bmi: decimal("bmi", { precision: 5, scale: 2 }),
    waistCircumference: decimal("waist_circumference", {
      precision: 6,
      scale: 2,
    }),
    headCircumference: decimal("head_circumference", {
      precision: 5,
      scale: 2,
    }),
    painLevel: integer("pain_level"),
    glasgowComaScale: integer("glasgow_coma_scale"),
    pupilResponse: varchar("pupil_response", { length: 50 }),
    notes: text("notes"),
    isAbnormal: boolean("is_abnormal").default(false).notNull(),
    abnormalFlags: jsonb("abnormal_flags").default([]),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_vital_signs_patient").on(t.patientId),
    index("idx_vital_signs_record").on(t.recordId),
    index("idx_vital_signs_appointment").on(t.appointmentId),
    index("idx_vital_signs_recorded_at").on(t.recordedAt),
  ]
);

export const patientConsents = pgTable(
  "patient_consents",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    patientId: integer("patient_id").notNull(),
    consentType: varchar("consent_type", { length: 100 }).notNull(),
    description: text("description").notNull(),
    version: varchar("version", { length: 50 }),
    isGranted: boolean("is_granted").default(false).notNull(),
    grantedAt: timestamp("granted_at"),
    grantedBy: varchar("granted_by", { length: 255 }),
    revokedAt: timestamp("revoked_at"),
    revokedBy: varchar("revoked_by", { length: 255 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_patient_consents_patient").on(t.patientId),
    index("idx_patient_consents_tenant").on(t.tenantId),
  ]
);

export const icdCodes = pgTable(
  "icd_codes",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 20 }).notNull(),
    system: icdCodeSystemEnum("system").notNull(),
    description: text("description").notNull(),
    descriptionAr: text("description_ar"),
    category: varchar("category", { length: 200 }),
    subCategory: varchar("sub_category", { length: 200 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_icd_codes_code").on(t.code),
    index("idx_icd_codes_system").on(t.system),
    unique("uq_icd_code_system").on(t.code, t.system),
  ]
);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€â”€ SECURITY OPERATIONS (NIST CSF 2.0 / MITRE ATT&CK) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const securityEvents = pgTable(
  "security_events",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    rawData: jsonb("raw_data"),
    severity: varchar("severity", { length: 20 }).default("medium").notNull(),
    status: varchar("status", { length: 30 }).default("detected").notNull(),
    actorType: varchar("actor_type", { length: 20 }).default("system"),
    actorId: varchar("actor_id", { length: 255 }),
    actorName: varchar("actor_name", { length: 255 }),
    actorIp: varchar("actor_ip", { length: 45 }),
    actorUserAgent: text("actor_user_agent"),
    incidentId: integer("incident_id"),
    iocType: varchar("ioc_type", { length: 50 }),
    iocValue: varchar("ioc_value", { length: 255 }),
    targetType: varchar("target_type", { length: 50 }),
    targetId: varchar("target_id", { length: 255 }),
    targetName: varchar("target_name", { length: 255 }),
    riskScore: decimal("risk_score", { precision: 8, scale: 2 }).default("0"),
    mitreTechniqueId: varchar("mitre_technique_id", { length: 20 }),
    mitreTacticId: varchar("mitre_tactic_id", { length: 20 }),
    attackPattern: text("attack_pattern"),
    sessionId: varchar("session_id", { length: 255 }),
    eventTimestamp: timestamp("event_timestamp").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  t => [
    index("idx_security_events_tenant").on(t.tenantId),
    index("idx_security_events_timestamp").on(t.eventTimestamp),
    index("idx_security_events_severity").on(t.severity),
    index("idx_security_events_type").on(t.eventType),
    index("idx_security_events_status").on(t.status),
    index("idx_security_events_actor").on(t.actorId),
  ]
);

export const securityIncidents = pgTable(
  "security_incidents",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    incidentNumber: varchar("incident_number", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    severity: varchar("severity", { length: 20 }).default("medium").notNull(),
    category: varchar("category", { length: 50 }),
    status: varchar("status", { length: 30 }).default("identified").notNull(),
    affectedUsers: integer("affected_users"),
    affectedSystems: integer("affected_systems"),
    dataBreach: boolean("data_breach").default(false),
    detectedAt: timestamp("detected_at").defaultNow().notNull(),
    containedAt: timestamp("contained_at"),
    eradicatedAt: timestamp("eradicated_at"),
    recoveredAt: timestamp("recovered_at"),
    closedAt: timestamp("closed_at"),
    createdBy: integer("created_by"),
    assignedTo: integer("assignedTo"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  t => [
    index("idx_security_incidents_tenant").on(t.tenantId),
    index("idx_security_incidents_status").on(t.status),
    index("idx_security_incidents_severity").on(t.severity),
    index("idx_security_incidents_number").on(t.incidentNumber),
  ]
);
export const vulnerabilities = pgTable(
  "vulnerabilities",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    severity: varchar("severity", { length: 20 }).default("medium").notNull(),
    status: varchar("status", { length: 30 }).default("open").notNull(),
    cveId: varchar("cveId", { length: 50 }),
    cvssScore: decimal("cvss_score", { precision: 5, scale: 2 }),
    affectedAsset: varchar("affectedAsset", { length: 255 }),
    discoveredAt: timestamp("discovered_at").defaultNow().notNull(),
    patchedAt: timestamp("patchedAt"),
    remediation: text("remediation"),
    discoveredBy: varchar("discovered_by", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  t => [
    index("idx_vulnerabilities_tenant").on(t.tenantId),
    index("idx_vulnerabilities_severity").on(t.severity),
    index("idx_vulnerabilities_status").on(t.status),
  ]
);

export const complianceControls = pgTable(
  "compliance_controls",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    framework: varchar("framework", { length: 50 }).notNull(),
    controlId: varchar("control_id", { length: 50 }).notNull(),
    controlName: varchar("control_name", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 30 })
      .default("not_implemented")
      .notNull(),
    evidence: jsonb("evidence").default([]),
    owner: varchar("owner", { length: 255 }),
    dueDate: timestamp("dueDate"),
    lastAssessedAt: timestamp("lastAssessedAt"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  t => [
    index("idx_compliance_controls_tenant").on(t.tenantId),
    index("idx_compliance_controls_framework").on(t.framework),
    index("idx_compliance_controls_status").on(t.status),
    unique("compliance_controls_framework_id_tenant_unique").on(
      t.tenantId,
      t.framework,
      t.controlId
    ),
  ]
);

export const threatIntelSources = pgTable(
  "threat_intel_sources",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId").references(() => tenants.id),
    sourceName: varchar("sourceName", { length: 255 }).notNull(),
    sourceType: varchar("source_type", { length: 50 }),
    url: text("url"),
    apiKeyRef: varchar("apiKeyRef", { length: 255 }),
    lastFetchAt: timestamp("lastFetchAt"),
    fetchIntervalMin: integer("fetchIntervalMin").default(1440),
    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  t => [
    index("idx_threat_intel_tenant").on(t.tenantId),
    index("idx_threat_intel_active").on(t.isActive),
  ]
);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€â”€ WORKFLOW ENGINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const workflowStatusEnum = pgEnum("workflow_status", [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "in_progress",
  "completed",
  "cancelled",
  "on_hold",
]);

export const workflowStepStatusEnum = pgEnum("workflow_step_status", [
  "pending",
  "active",
  "completed",
  "skipped",
  "failed",
  "reassigned",
]);

export const workflowStepTypeEnum = pgEnum("workflow_step_type", [
  "approval",
  "task",
  "notification",
  "automation",
  "integration",
  "parallel",
  "gateway",
]);

export const workflowTransitionTypeEnum = pgEnum("workflow_transition_type", [
  "submit",
  "approve",
  "reject",
  "reassign",
  "escalate",
  "delegate",
  "complete",
  "cancel",
  "resume",
  "hold",
]);

export const workflowPriorityEnum = pgEnum("workflow_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

// Workflow Definitions â€” template for workflows
export const workflowDefinitions = pgTable(
  "workflow_definitions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    nameAr: varchar("nameAr", { length: 200 }),
    description: text("description"),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    version: integer("version").default(1).notNull(),
    steps: jsonb("steps").notNull(), // array of step definitions
    settings: jsonb("settings").default({}), // workflow settings
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    createdById: integer("createdById").references(() => users.id),
    updatedById: integer("updatedById").references(() => users.id),
  },
  t => [
    index("idx_workflow_definitions_tenant").on(t.tenantId),
    index("idx_workflow_definitions_entity").on(t.entityType),
    index("idx_workflow_definitions_active").on(t.isActive),
    unique("workflow_definitions_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_workflow_def_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type WorkflowDefinition = typeof workflowDefinitions.$inferSelect;
export type InsertWorkflowDefinition = typeof workflowDefinitions.$inferInsert;

// Workflow Instances â€” running workflows
export const workflowInstances = pgTable(
  "workflow_instances",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    definitionId: integer("definitionId")
      .notNull()
      .references(() => workflowDefinitions.id),
    definitionVersion: integer("definitionVersion").default(1).notNull(),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    entityId: uuid("entityId").notNull(),
    status: workflowStatusEnum("status").default("draft").notNull(),
    currentStepId: uuid("currentStepId"),
    currentAssigneeId: uuid("currentAssigneeId"),
    currentAssigneeRole: varchar("currentAssigneeRole", { length: 50 }),
    priority: workflowPriorityEnum("priority").default("medium").notNull(),
    dueDate: timestamp("dueDate"),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    cancelledAt: timestamp("cancelledAt"),
    cancelledById: uuid("cancelledById"),
    cancellationReason: varchar("cancellationReason", { length: 255 }),
    context: jsonb("context").default({}),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    createdById: uuid("createdById").references(() => users.id),
    updatedById: uuid("updatedById").references(() => users.id),
  },
  t => [
    index("idx_workflow_instances_tenant").on(t.tenantId),
    index("idx_workflow_instances_definition").on(t.definitionId),
    index("idx_workflow_instances_entity").on(t.entityType, t.entityId),
    index("idx_workflow_instances_status").on(t.status),
    index("idx_workflow_instances_assignee").on(t.currentAssigneeId),
    index("idx_workflow_instances_due").on(t.dueDate),
    check("chk_workflow_inst_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type InsertWorkflowInstance = typeof workflowInstances.$inferInsert;

// Workflow Tasks â€” individual tasks within an instance
export const workflowTasks = pgTable(
  "workflow_tasks",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    instanceId: integer("instanceId")
      .notNull()
      .references(() => workflowInstances.id),
    stepId: uuid("stepId").notNull(),
    stepCode: varchar("stepCode", { length: 50 }).notNull(),
    stepName: varchar("stepName", { length: 200 }).notNull(),
    stepType: workflowStepTypeEnum("stepType").notNull(),
    status: workflowStepStatusEnum("status").default("pending").notNull(),
    assigneeId: uuid("assigneeId"),
    assigneeRole: varchar("assigneeRole", { length: 50 }),
    assignedAt: timestamp("assignedAt"),
    dueDate: timestamp("dueDate"),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    completedBy: uuid("completedBy"),
    outcome: varchar("outcome", { length: 50 }), // approved, rejected, completed, skipped, escalated, delegated
    comment: text("comment"),
    formData: jsonb("formData").default({}),
    previousTaskId: uuid("previousTaskId"),
    delegatedFromId: uuid("delegatedFromId"),
    delegatedToId: uuid("delegatedToId"),
    escalatedFromId: uuid("escalatedFromId"),
    escalatedToId: uuid("escalatedToId"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_workflow_tasks_tenant").on(t.tenantId),
    index("idx_workflow_tasks_instance").on(t.instanceId),
    index("idx_workflow_tasks_step").on(t.stepId),
    index("idx_workflow_tasks_assignee").on(t.assigneeId),
    index("idx_workflow_tasks_status").on(t.status),
    index("idx_workflow_tasks_due").on(t.dueDate),
    check("chk_workflow_task_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type WorkflowTask = typeof workflowTasks.$inferSelect;
export type InsertWorkflowTask = typeof workflowTasks.$inferInsert;

// Workflow History â€” audit trail of all transitions
export const workflowHistory = pgTable(
  "workflow_history",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    instanceId: integer("instanceId")
      .notNull()
      .references(() => workflowInstances.id),
    taskId: uuid("taskId"),
    fromStepId: uuid("fromStepId"),
    toStepId: uuid("toStepId"),
    transitionType: workflowTransitionTypeEnum("transitionType").notNull(),
    actorId: uuid("actorId").notNull(),
    actorRole: varchar("actorRole", { length: 50 }),
    comment: text("comment"),
    formData: jsonb("formData").default({}),
    contextSnapshot: jsonb("contextSnapshot").default({}),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_workflow_history_tenant").on(t.tenantId),
    index("idx_workflow_history_instance").on(t.instanceId),
    index("idx_workflow_history_task").on(t.taskId),
    index("idx_workflow_history_actor").on(t.actorId),
    index("idx_workflow_history_created").on(t.createdAt),
    check("chk_workflow_hist_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type WorkflowHistory = typeof workflowHistory.$inferSelect;
export type InsertWorkflowHistory = typeof workflowHistory.$inferInsert;

// â”€â”€â”€ Intermediary Parties (drivers, agents, brokers, representatives) â”€â”€
export const partyRoleEnum = pgEnum("party_role", [
  "driver",
  "agent",
  "broker",
  "intermediary",
  "representative",
  "distributor",
  "wholesaler",
  "retailer",
  "consultant",
  "customs_agent",
  "logistics_provider",
  "warehouse_operator",
  "deliverer",
  "collector",
]);

export const partyTypeEnum = pgEnum("party_type", [
  "person",
  "company",
  "freelancer",
]);

export const intermediaryParties = pgTable(
  "intermediary_parties",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    partyRole: partyRoleEnum("partyRole").notNull(),
    partyType: partyTypeEnum("partyType").default("person").notNull(),
    code: varchar("code", { length: 50 }),
    name: varchar("name", { length: 255 }).notNull(),
    nameAr: varchar("nameAr", { length: 255 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    nationalId: varchar("nationalId", { length: 50 }),
    taxNumber: varchar("taxNumber", { length: 50 }),
    address: text("address"),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    commissionType: varchar("commissionType", { length: 20 }).default(
      "percent"
    ),
    commissionValue: decimal("commissionValue", {
      precision: 15,
      scale: 2,
    }).default("0"),
    bonusThreshold: decimal("bonusThreshold", { precision: 15, scale: 2 }),
    bonusAmount: decimal("bonusAmount", { precision: 15, scale: 2 }),
    creditLimit: decimal("creditLimit", { precision: 15, scale: 2 }).default(
      "0"
    ),
    currentBalance: decimal("currentBalance", {
      precision: 15,
      scale: 2,
    }).default("0"),
    status: varchar("status", { length: 20 }).default("active"),
    notes: text("notes"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_intermediaryParties_tenant").on(t.tenantId),
    index("idx_intermediaryParties_role").on(t.partyRole),
    index("idx_intermediaryParties_status").on(t.status),
    unique("intermediaryParties_code_tenant_unique").on(t.code, t.tenantId),
    check(
      "chk_intermediaryParty_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type IntermediaryParty = typeof intermediaryParties.$inferSelect;
export type InsertIntermediaryParty = typeof intermediaryParties.$inferInsert;

// â”€â”€â”€ Document-Party Links (who handled which document) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const partyLinkSourceEnum = pgEnum("party_link_source", [
  "sales_invoice",
  "purchase_invoice",
  "order",
  "transfer",
  "delivery",
  "quotation",
  "voucher",
  "return",
]);

export const documentPartyLinks = pgTable(
  "document_party_links",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    partyId: integer("partyId")
      .notNull()
      .references(() => intermediaryParties.id),
    sourceType: partyLinkSourceEnum("sourceType").notNull(),
    sourceId: integer("sourceId").notNull(),
    role: varchar("role", { length: 50 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
  },
  t => [
    index("idx_docPartyLinks_tenant").on(t.tenantId),
    index("idx_docPartyLinks_source").on(t.sourceType, t.sourceId),
    index("idx_docPartyLinks_party").on(t.partyId),
    check("chk_docPartyLink_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type DocumentPartyLink = typeof documentPartyLinks.$inferSelect;
export type InsertDocumentPartyLink = typeof documentPartyLinks.$inferInsert;

// â”€â”€â”€ Additional Expenses per Document â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const expenseCategoryEnum = pgEnum("expense_category", [
  "shipping",
  "loading",
  "unloading",
  "customs_fee",
  "insurance",
  "fuel",
  "toll",
  "warehousing",
  "packaging",
  "handling",
  "other",
]);

export const documentExpenses = pgTable(
  "document_expenses",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    documentType: varchar("documentType", { length: 50 }).notNull(),
    documentId: integer("documentId").notNull(),
    category: expenseCategoryEnum("category").notNull(),
    description: varchar("description", { length: 500 }),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("YER"),
    exchangeRate: decimal("exchangeRate", { precision: 18, scale: 8 }).default(
      "1"
    ),
    baseAmount: decimal("baseAmount", { precision: 15, scale: 2 }),
    partyId: integer("partyId").references(() => intermediaryParties.id),
    notes: text("notes"),
    isIncludedInTotal: boolean("isIncludedInTotal").default(true),
    createdBy: integer("createdBy").references(() => users.id),
    approvedBy: integer("approvedBy").references(() => users.id),
    approvedAt: timestamp("approvedAt"),
    status: varchar("status", { length: 20 }).default("pending"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
  },
  t => [
    index("idx_docExpenses_tenant").on(t.tenantId),
    index("idx_docExpenses_document").on(t.documentType, t.documentId),
    index("idx_docExpenses_category").on(t.category),
    check("chk_docExpense_amount_positive", sql`${t.amount} > 0`),
    check("chk_docExpense_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type DocumentExpense = typeof documentExpenses.$inferSelect;
export type InsertDocumentExpense = typeof documentExpenses.$inferInsert;

// â”€â”€â”€ Promotions / Bonuses / Offers (line-level) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const promotionTypeEnum = pgEnum("promotion_type", [
  "percentage",
  "fixed_amount",
  "buy_x_get_y",
  "bundle",
  "volume_tier",
  "seasonal",
]);

export const promotionStatusEnum = pgEnum("promotion_status", [
  "draft",
  "active",
  "paused",
  "expired",
  "cancelled",
]);

export const promotions = pgTable(
  "promotions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 50 }),
    name: varchar("name", { length: 255 }).notNull(),
    nameAr: varchar("nameAr", { length: 255 }),
    type: promotionTypeEnum("type").notNull(),
    status: promotionStatusEnum("status").default("draft").notNull(),
    value: decimal("value", { precision: 15, scale: 4 }),
    minQuantity: integer("minQuantity").default(0),
    maxQuantity: integer("maxQuantity"),
    productIds: text("productIds"),
    categoryIds: text("categoryIds"),
    startDate: timestamp("startDate").notNull(),
    endDate: timestamp("endDate").notNull(),
    applicableTo: varchar("applicableTo", { length: 20 }).default("all"),
    partyId: integer("partyId").references(() => intermediaryParties.id),
    maxUses: integer("maxUses"),
    currentUses: integer("currentUses").default(0),
    stackable: boolean("stackable").default(false),
    notes: text("notes"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
  },
  t => [
    index("idx_promotions_tenant").on(t.tenantId),
    index("idx_promotions_status").on(t.status),
    unique("promotions_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_promotion_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = typeof promotions.$inferInsert;

// â”€â”€â”€ Approval Queue (Pre-Approval Control) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const approvalQueuePriorityEnum = pgEnum("approval_queue_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const approvalQueueStatusEnum = pgEnum("approval_queue_status", [
  "pending",
  "approved",
  "rejected",
  "modified",
  "escalated",
  "cancelled",
]);

export const approvalQueues = pgTable(
  "approval_queues",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    documentType: varchar("documentType", { length: 50 }).notNull(),
    documentId: integer("documentId").notNull(),
    title: varchar("title", { length: 255 }),
    description: text("description"),
    action: varchar("action", { length: 50 }).notNull(),
    proposedData: jsonb("proposedData").default({}),
    previousData: jsonb("previousData").default({}),
    priority: approvalQueuePriorityEnum("priority").default("normal"),
    status: approvalQueueStatusEnum("status").default("pending").notNull(),
    requestedById: integer("requestedById").references(() => users.id),
    assignedToId: integer("assignedToId").references(() => users.id),
    approvedById: integer("approvedById").references(() => users.id),
    rejectedById: integer("rejectedById").references(() => users.id),
    approvedAt: timestamp("approvedAt"),
    rejectedAt: timestamp("rejectedAt"),
    rejectionReason: varchar("rejectionReason", { length: 500 }),
    modificationNote: text("modificationNote"),
    expiresAt: timestamp("expiresAt"),
    escalationLevel: integer("escalationLevel").default(0),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
  },
  t => [
    index("idx_approvalQueues_tenant").on(t.tenantId),
    index("idx_approvalQueues_document").on(t.documentType, t.documentId),
    index("idx_approvalQueues_status").on(t.status),
    index("idx_approvalQueues_priority").on(t.priority),
    index("idx_approvalQueues_assigned").on(t.assignedToId),
    check("chk_approvalQueue_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type ApprovalQueue = typeof approvalQueues.$inferSelect;
export type InsertApprovalQueue = typeof approvalQueues.$inferInsert;

// â”€â”€â”€ Line Item History (Revert / Audit Trail) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const lineItemActionEnum = pgEnum("line_item_action", [
  "add",
  "edit",
  "delete",
  "revert",
  "approve",
  "reject",
]);

export const lineItemHistory = pgTable(
  "line_item_history",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    documentType: varchar("documentType", { length: 50 }).notNull(),
    documentId: integer("documentId").notNull(),
    lineItemId: integer("lineItemId"),
    action: lineItemActionEnum("action").notNull(),
    previousData: jsonb("previousData").default({}),
    newData: jsonb("newData").default({}),
    diffData: jsonb("diffData").default({}),
    reason: text("reason"),
    performedBy: integer("performedBy").references(() => users.id),
    performedAt: timestamp("performedAt").defaultNow().notNull(),
    isRevert: boolean("isRevert").default(false),
    revertedFromId: integer("revertedFromId"),
    serverVersion: integer("serverVersion").default(1).notNull(),
  },
  t => [
    index("idx_lineItemHist_tenant").on(t.tenantId),
    index("idx_lineItemHist_document").on(t.documentType, t.documentId),
    index("idx_lineItemHist_lineItem").on(t.lineItemId),
    index("idx_lineItemHist_action").on(t.action),
    index("idx_lineItemHist_performed").on(t.performedAt),
    check("chk_lineItemHist_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type LineItemHistory = typeof lineItemHistory.$inferSelect;
export type InsertLineItemHistory = typeof lineItemHistory.$inferInsert;

// â”€â”€â”€ Flexible Line Items (Enhanced line items with full pricing) â”€
export const invoiceLineDiscountTypeEnum = pgEnum(
  "invoice_line_discount_type",
  ["percentage", "fixed_amount", "bundle", "volume"]
);

export const flexibleLineItems = pgTable(
  "flexible_line_items",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    documentType: varchar("documentType", { length: 50 }).notNull(),
    documentId: integer("documentId").notNull(),
    lineOrder: integer("lineOrder").notNull().default(0),
    productId: integer("productId").references(() => products.id),
    serviceId: integer("serviceId"),
    productName: varchar("productName", { length: 255 }),
    productCode: varchar("productCode", { length: 50 }),
    batchId: integer("batchId").references(() => inventoryBatches.id),
    serialNumbers: text("serialNumbers"),
    quantity: decimal("quantity", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),
    unitId: integer("unitId").references(() => units.id),
    secondaryUnitId: integer("secondaryUnitId").references(() => units.id),
    secondaryUnitFactor: decimal("secondaryUnitFactor", {
      precision: 15,
      scale: 4,
    }).default("1"),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 4 }).default("0"),
    discountType:
      invoiceLineDiscountTypeEnum("discountType").default("percentage"),
    discountValue: decimal("discountValue", {
      precision: 15,
      scale: 4,
    }).default("0"),
    discountAmount: decimal("discountAmount", {
      precision: 15,
      scale: 2,
    }).default("0"),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0"),
    taxAmount: decimal("taxAmount", { precision: 15, scale: 2 }).default("0"),
    subtotal: decimal("subtotal", { precision: 15, scale: 2 }).default("0"),
    total: decimal("total", { precision: 15, scale: 2 }).default("0"),
    weight: decimal("weight", { precision: 15, scale: 4 }),
    volume: decimal("volume", { precision: 15, scale: 4 }),
    expiryDate: timestamp("expiryDate"),
    manufactureDate: timestamp("manufactureDate"),
    status: varchar("status", { length: 20 }).default("pending"),
    notes: text("notes"),
    createdBy: integer("createdBy").references(() => users.id),
    approvedBy: integer("approvedBy").references(() => users.id),
    approvedAt: timestamp("approvedAt"),
    rejectedById: integer("rejectedById"),
    rejectionReason: varchar("rejectionReason", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
  },
  t => [
    index("idx_flexibleLines_tenant").on(t.tenantId),
    index("idx_flexibleLines_document").on(t.documentType, t.documentId),
    index("idx_flexibleLines_product").on(t.productId),
    index("idx_flexibleLines_batch").on(t.batchId),
    index("idx_flexibleLines_order").on(
      t.documentType,
      t.documentId,
      t.lineOrder
    ),
    check("chk_flexibleLine_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type FlexibleLineItem = typeof flexibleLineItems.$inferSelect;
export type InsertFlexibleLineItem = typeof flexibleLineItems.$inferInsert;

// â”€â”€â”€ Ticket Responses (Ù„Ø±Ø¯ÙˆØ¯ Ø¹Ù„Ù‰ Ø§Ù„Ø¨Ù„Ø§ØºØ§Øª / Customer service ticket responses) â”€â”€â”€

export const ticketResponses = pgTable(
  "ticket_responses",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticketId")
      .notNull()
      .references(() => tickets.id),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    rating: integer("rating").notNull(), // 1-5 scale
    customerComments: text("customerComments"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_ticketResponses_tenant").on(t.ticketId),
    index("idx_ticketResponses_tenantId").on(t.tenantId),
    check("chk_ticketResponse_tenant_not_null", sql`${t.ticketId} IS NOT NULL`),
    check(
      "chk_ticketResponse_tenantId_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type TicketResponse = typeof ticketResponses.$inferSelect;
export type InsertTicketResponse = typeof ticketResponses.$inferInsert;

// â”€â”€â”€ Inventory Items Summary (Ù…Ù„Ø®Øµ Ø¹Ù†Ø§ØµØ± Ø§Ù„Ù…Ø®Ø²ÙˆÙ† / Inventory items summary) â”€â”€â”€
export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    branchId: integer("branchId")
      .notNull()
      .references(() => branches.id),
    currentStock: integer("currentStock").default(0).notNull(),
    minimumStock: integer("minimumStock").default(0).notNull(),
    costPrice: decimal("costPrice", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    unique("inventoryItems_productBranch_unique").on(t.productId, t.branchId),
    index("idx_inventoryItems_tenant").on(t.tenantId),
    index("idx_inventoryItems_branch").on(t.branchId),
    check("chk_inventoryItem_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;

// â”€â”€â”€ Partner Accounting (Ù…Ø­Ø§Ø³Ø¨Ø© Ø§Ù„Ø´Ø±ÙƒØ§Ø¡) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const partners = pgTable(
  "partners",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 150 }).notNull(),
    nameAr: varchar("nameAr", { length: 150 }),
    capitalAmount: decimal("capitalAmount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    ownershipPercent: decimal("ownershipPercent", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    profitSharePercent: decimal("profitSharePercent", {
      precision: 5,
      scale: 2,
    })
      .default("0")
      .notNull(),
    email: varchar("email", { length: 150 }),
    phone: varchar("phone", { length: 50 }),
    currentAccountAccountId: integer("currentAccountAccountId").references(
      () => accounts.id
    ),
    capitalAccountId: integer("capitalAccountId").references(() => accounts.id),
    isActive: boolean("isActive").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
  },
  t => [
    index("idx_partners_tenant").on(t.tenantId),
    check("chk_partner_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = typeof partners.$inferInsert;

export const partnerTransactions = pgTable(
  "partner_transactions",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    partnerId: integer("partnerId")
      .notNull()
      .references(() => partners.id),
    type: varchar("type", { length: 30 }).notNull(), // capital_contribution, drawing, profit_distribution, interest, loan
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    transactionDate: timestamp("transactionDate").defaultNow().notNull(),
    narration: text("narration"),
    journalEntryId: integer("journalEntryId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
  },
  t => [
    index("idx_partnerTransactions_tenant").on(t.tenantId),
    index("idx_partnerTransactions_partner").on(t.partnerId),
    check("chk_partner_tx_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type PartnerTransaction = typeof partnerTransactions.$inferSelect;
export type InsertPartnerTransaction = typeof partnerTransactions.$inferInsert;

// â”€â”€â”€ Production Accounting & BOM (Ù…Ø­Ø§Ø³Ø¨Ø© Ø§Ù„Ø¥Ù†ØªØ§Ø¬ ÙˆØªÙƒØ§Ù„ÙŠÙ Ø§Ù„Ø¥Ù†ØªØ§Ø¬) â”€â”€â”€
export const billsOfMaterials = pgTable(
  "bills_of_materials",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    outputQty: decimal("outputQty", { precision: 15, scale: 4 })
      .default("1")
      .notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    items: jsonb("items").notNull(), // [{ productId, quantity, unitCost }]
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
  },
  t => [
    index("idx_boms_tenant").on(t.tenantId),
    index("idx_boms_product").on(t.productId),
    unique("boms_code_tenant_unique").on(t.code, t.tenantId),
    check("chk_bom_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type BillOfMaterials = typeof billsOfMaterials.$inferSelect;
export type InsertBillOfMaterials = typeof billsOfMaterials.$inferInsert;

export const productionOrders = pgTable(
  "production_orders",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    orderNumber: varchar("orderNumber", { length: 50 }).notNull(),
    bomId: integer("bomId")
      .notNull()
      .references(() => billsOfMaterials.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    plannedQty: decimal("plannedQty", { precision: 15, scale: 4 }).notNull(),
    producedQty: decimal("producedQty", { precision: 15, scale: 4 })
      .default("0")
      .notNull(),
    scrapedQty: decimal("scrapedQty", { precision: 15, scale: 4 })
      .default("0")
      .notNull(),
    status: varchar("status", { length: 30 }).default("planned").notNull(), // planned, in_progress, completed, cancelled
    warehouseId: integer("warehouseId").references(() => warehouses.id),
    costCenterId: integer("costCenterId").references(() => costCenters.id),
    estimatedCost: decimal("estimatedCost", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    actualCost: decimal("actualCost", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    journalEntryId: integer("journalEntryId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    serverVersion: integer("serverVersion").default(1).notNull(),
  },
  t => [
    index("idx_productionOrders_tenant").on(t.tenantId),
    index("idx_productionOrders_status").on(t.status),
    unique("productionOrders_number_tenant_unique").on(
      t.orderNumber,
      t.tenantId
    ),
    check(
      "chk_production_order_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type ProductionOrder = typeof productionOrders.$inferSelect;
export type InsertProductionOrder = typeof productionOrders.$inferInsert;

// â”€â”€â”€ Elias Pro subsystem (Ù†Ø¸Ø§Ù… Ø§Ù„ÙŠØ§Ø³ Ø¨Ø±Ùˆ Ø§Ù„ÙØ±Ø¹ÙŠ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Elias Pro is an operational bounded-context: IT maintenance, device
// diagnostics and repair-shop work orders. It is integrated as a FIRST-CLASS
// subsystem through an anti-corruption layer (server/eliasPro) â€” the platform
// never reads EliasPro's raw JSON directly.
//
// Every table is tenant-scoped and indexed the same way as the rest of the
// schema (idx_<table>_tenant + composite tenant/date indexes) so tenant
// filters and chronological reports stay index-only.
export const eliasProNodes = pgTable(
  "elias_pro_nodes",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    /** Stable machine code, unique per tenant (e.g. "NODE-HQ-01"). */
    code: varchar("code", { length: 40 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    /** Base URL of the EliasPro node agent (Pode REST surface). */
    baseUrl: varchar("baseUrl", { length: 500 }).notNull(),
    /**
     * SHA-256 fingerprint of the node's shared bearer token. Used to detect
     * token rotation without decrypting anything.
     */
    tokenHash: varchar("tokenHash", { length: 64 }),
    /**
     * AES-256-GCM encrypted bearer token (see server/eliasPro/tokenVault.ts).
     * The platform must be able to call the node later (health checks, engine
     * runs), so the token has to be recoverable â€” it is encrypted at rest with
     * the server master key and is NEVER returned to the browser.
     */
    tokenEnc: text("tokenEnc"),
    status: varchar("status", { length: 20 }).default("active").notNull(), // active | offline | error | disabled
    /** True when the node is served by the built-in simulator. */
    isSimulated: boolean("isSimulated").default(false).notNull(),
    agentVersion: varchar("agentVersion", { length: 40 }),
    platform: varchar("platform", { length: 40 }),
    /** Engine ids this node advertises. */
    capabilities: jsonb("capabilities").notNull().default([]),
    lastSeenAt: timestamp("lastSeenAt"),
    lastError: text("lastError"),
    lastLatencyMs: integer("lastLatencyMs"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    // Sync columns
    serverVersion: integer("serverVersion").default(1).notNull(),
    lastSyncAt: timestamp("lastSyncAt"),
    conflictState: varchar("conflictState", { length: 20 }).default("none"),
    aggregateId: uuid("aggregateId"),
  },
  t => [
    index("idx_eliasProNodes_tenant").on(t.tenantId),
    unique("eliasProNodes_code_tenant_unique").on(t.code, t.tenantId),
    index("idx_eliasProNodes_status").on(t.status),
    check("chk_eliasProNode_tenant_not_null", sql`${t.tenantId} IS NOT NULL`),
  ]
);

export type EliasProNode = typeof eliasProNodes.$inferSelect;
export type InsertEliasProNode = typeof eliasProNodes.$inferInsert;

export const eliasProDiagnostics = pgTable(
  "elias_pro_diagnostics",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    /** Owning node â€” null for browser-submitted probes. */
    nodeId: integer("nodeId").references(() => eliasProNodes.id, {
      onDelete: "set null",
    }),
    /** Stable identity of the inspected device. */
    deviceKey: varchar("deviceKey", { length: 200 }).notNull(),
    deviceLabel: varchar("deviceLabel", { length: 160 }).notNull(),
    platform: varchar("platform", { length: 20 }).default("unknown").notNull(),
    /** agent | browser */
    source: varchar("source", { length: 20 }).default("agent").notNull(),
    /** Weighted health score 0..100. */
    score: integer("score").default(0).notNull(),
    /** excellent | good | fair | poor | critical */
    level: varchar("level", { length: 20 }).default("fair").notNull(),
    /** Full health report (areas, findings, labels). */
    report: jsonb("report").notNull(),
    /** Normalized device snapshot. */
    snapshot: jsonb("snapshot").notNull(),
    capturedAt: timestamp("capturedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_eliasProDiagnostics_tenant").on(t.tenantId),
    index("idx_eliasProDiagnostics_tenant_captured").on(
      t.tenantId,
      t.capturedAt
    ),
    index("idx_eliasProDiagnostics_device").on(t.deviceKey, t.capturedAt),
    index("idx_eliasProDiagnostics_node").on(t.nodeId),
    check(
      "chk_eliasProDiagnostic_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type EliasProDiagnostic = typeof eliasProDiagnostics.$inferSelect;
export type InsertEliasProDiagnostic = typeof eliasProDiagnostics.$inferInsert;

export const eliasProEngineRuns = pgTable(
  "elias_pro_engine_runs",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    nodeId: integer("nodeId").references(() => eliasProNodes.id, {
      onDelete: "set null",
    }),
    engineId: varchar("engineId", { length: 40 }).notNull(),
    engineCode: varchar("engineCode", { length: 20 }).notNull(),
    /** success | failed | timeout | skipped */
    status: varchar("status", { length: 20 }).default("success").notNull(),
    durationMs: integer("durationMs").default(0).notNull(),
    output: jsonb("output"),
    error: text("error"),
    triggeredBy: integer("triggeredBy"),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    finishedAt: timestamp("finishedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [
    index("idx_eliasProEngineRuns_tenant").on(t.tenantId),
    index("idx_eliasProEngineRuns_tenant_started").on(t.tenantId, t.startedAt),
    index("idx_eliasProEngineRuns_node").on(t.nodeId),
    check(
      "chk_eliasProEngineRun_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type EliasProEngineRun = typeof eliasProEngineRuns.$inferSelect;
export type InsertEliasProEngineRun = typeof eliasProEngineRuns.$inferInsert;

export const eliasProWorkOrders = pgTable(
  "elias_pro_work_orders",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenants.id),
    nodeId: integer("nodeId").references(() => eliasProNodes.id, {
      onDelete: "set null",
    }),
    /** EliasPro native reference, e.g. "TKT-2026-0007". */
    externalRef: varchar("externalRef", { length: 40 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    customerName: varchar("customerName", { length: 150 }),
    customerPhone: varchar("customerPhone", { length: 30 }),
    deviceType: varchar("deviceType", { length: 60 }),
    deviceSerial: varchar("deviceSerial", { length: 120 }),
    /** received | diagnosed | repairing | awaiting_parts | ready | delivered | cancelled */
    status: varchar("status", { length: 20 }).default("received").notNull(),
    /** low | medium | high | critical */
    priority: varchar("priority", { length: 20 }).default("medium").notNull(),
    reportedIssue: text("reportedIssue"),
    estimatedCost: decimal("estimatedCost", { precision: 15, scale: 2 }),
    /** [{ sku, name, qty, unitCost }] */
    parts: jsonb("parts").notNull().default([]),
    /** Linked diagnostic that produced this work order. */
    diagnosticId: integer("diagnosticId").references(
      () => eliasProDiagnostics.id,
      { onDelete: "set null" }
    ),
    /** Optional bridge to the platform support desk (tickets.id). */
    supportTicketId: integer("supportTicketId").references(() => tickets.id, {
      onDelete: "set null",
    }),
    receivedAt: timestamp("receivedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  t => [
    index("idx_eliasProWorkOrders_tenant").on(t.tenantId),
    index("idx_eliasProWorkOrders_tenant_status").on(t.tenantId, t.status),
    index("idx_eliasProWorkOrders_tenant_created").on(t.tenantId, t.createdAt),
    unique("eliasProWorkOrders_ref_tenant_unique").on(
      t.externalRef,
      t.tenantId
    ),
    check(
      "chk_eliasProWorkOrder_tenant_not_null",
      sql`${t.tenantId} IS NOT NULL`
    ),
  ]
);

export type EliasProWorkOrder = typeof eliasProWorkOrders.$inferSelect;
export type InsertEliasProWorkOrder = typeof eliasProWorkOrders.$inferInsert;

export const drizzleMigrations = pgTable("drizzle_migrations", {
  id: serial("id").primaryKey(),
  hash: varchar("hash", { length: 255 }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type DrizzleMigration = typeof drizzleMigrations.$inferSelect;
export type InsertDrizzleMigration = typeof drizzleMigrations.$inferInsert;


// ═══════════════════════════════════════════════════════════════
// Status History - غير قابل للحذف للتدقيق الكامل
// ═══════════════════════════════════════════════════════════════
export const statusHistory = pgTable(
  "status_history",
  {
    id: serial("id").primaryKey(),
    GlobalId: uuid("GlobalId").defaultRandom().notNull().unique(),
    organizationId: integer("organizationId").references(() => tenants.id),
    tenantId: integer("tenantId").references(() => tenants.id),
    branchId: integer("branchId").references(() => branches.id),
    entityType: varchar("entityType", { length: 30 }).notNull(), // master|document|operation|journal|stock_movement|payment
    entityId: varchar("entityId", { length: 100 }).notNull(),
    entityNo: varchar("entityNo", { length: 80 }),
    fromStatus: varchar("fromStatus", { length: 30 }),
    toStatus: varchar("toStatus", { length: 30 }).notNull(),
    fromStage: varchar("fromStage", { length: 30 }),
    toStage: varchar("toStage", { length: 30 }),
    action: statusActionEnum("action").notNull(),
    reason: text("reason"),
    notes: text("notes"),
    changedById: integer("changedById").references(() => users.id),
    changedByName: varchar("changedByName", { length: 255 }),
    changedAt: timestamp("changedAt").defaultNow().notNull(),
    ipAddress: varchar("ipAddress", { length: 64 }),
    userAgent: text("userAgent"),
    clientId: varchar("clientId", { length: 100 }),
    metadata: jsonb("metadata"),
  },
  t => [
    index("idx_status_history_entity").on(t.entityType, t.entityId),
    index("idx_status_history_tenant").on(t.tenantId),
    index("idx_status_history_changed_at").on(t.changedAt),
    index("idx_status_history_org_entity").on(t.organizationId, t.entityType, t.entityId),
  ]
);

export type StatusHistory = typeof statusHistory.$inferSelect;
export type InsertStatusHistory = typeof statusHistory.$inferSelect;



// ═══════════════════════════════════════════════════════════════
// Status History Helper - triggers logic handled in app layer
// ═══════════════════════════════════════════════════════════════



