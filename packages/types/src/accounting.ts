import { z } from "zod";
import {
  UUIDSchema,
  ISODateStringSchema,
  CurrencyCodeSchema,
  TenantIdSchema,
  UserIdSchema,
  MoneySchema,
  AddressSchema,
  ContactInfoSchema,
  AuditFieldsSchema,
  EntityStatusSchema,
  PaginationInputSchema,
  PaginatedResponseSchema,
} from "./common";

export const AccountTypeSchema = z.enum([
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
  "cost_of_sales",
]);
export type AccountType = z.infer<typeof AccountTypeSchema>;

export const AccountSubTypeSchema = z.enum([
  "current_asset",
  "fixed_asset",
  "intangible_asset",
  "current_liability",
  "long_term_liability",
  "share_capital",
  "retained_earnings",
  "reserves",
  "operating_revenue",
  "non_operating_revenue",
  "operating_expense",
  "non_operating_expense",
  "direct_cost",
  "indirect_cost",
]);
export type AccountSubType = z.infer<typeof AccountSubTypeSchema>;

export const AccountSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    code: z.string().max(20).regex(/^\d+$/),
    name: z.string().max(200),
    nameAr: z.string().max(200).optional(),
    type: AccountTypeSchema,
    subType: AccountSubTypeSchema.optional(),
    parentId: UUIDSchema.optional(),
    level: z.number().int().min(1).max(10).default(1),
    isControlAccount: z.boolean().default(false),
    controlAccountType: z
      .enum([
        "customers",
        "suppliers",
        "inventory",
        "fixed_assets",
        "payroll",
        "tax",
        "bank",
        "cash",
      ])
      .optional(),
    currency: CurrencyCodeSchema.default("SAR"),
    allowManualEntry: z.boolean().default(true),
    description: z.string().optional(),
    status: EntityStatusSchema.default("active"),
    openingBalance: MoneySchema.default({ amount: 0, currency: "SAR" }),
    currentBalance: MoneySchema.default({ amount: 0, currency: "SAR" }),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type Account = z.infer<typeof AccountSchema>;

export const AccountCreateSchema = AccountSchema.omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  deletedAt: true,
  deletedBy: true,
});
export type AccountCreate = z.infer<typeof AccountCreateSchema>;

export const FiscalYearSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    name: z.string().max(100),
    startDate: ISODateStringSchema,
    endDate: ISODateStringSchema,
    status: z.enum(["open", "closed", "archived"]).default("open"),
    closedAt: ISODateStringSchema.optional(),
    closedBy: UserIdSchema.optional(),
  })
  .merge(AuditFieldsSchema);
export type FiscalYear = z.infer<typeof FiscalYearSchema>;

export const FiscalPeriodSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    fiscalYearId: UUIDSchema,
    periodNumber: z.number().int().min(1).max(13),
    name: z.string().max(100),
    startDate: ISODateStringSchema,
    endDate: ISODateStringSchema,
    status: z.enum(["open", "closed", "closing"]).default("open"),
    closedAt: ISODateStringSchema.optional(),
    closedBy: UserIdSchema.optional(),
  })
  .merge(AuditFieldsSchema);
export type FiscalPeriod = z.infer<typeof FiscalPeriodSchema>;

export const JournalEntrySchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    number: z.string().max(50),
    date: ISODateStringSchema,
    periodId: UUIDSchema,
    reference: z.string().max(100).optional(),
    referenceType: z
      .enum([
        "manual",
        "sales_invoice",
        "purchase_invoice",
        "payment",
        "receipt",
        "payroll",
        "depreciation",
        "inventory",
        "adjustment",
        "closing",
        "opening",
      ])
      .default("manual"),
    referenceId: UUIDSchema.optional(),
    description: z.string().max(500),
    lines: z
      .array(
        z.object({
          id: UUIDSchema,
          accountId: UUIDSchema,
          accountCode: z.string().max(20),
          accountName: z.string(),
          description: z.string().optional(),
          debit: MoneySchema.default({ amount: 0, currency: "SAR" }),
          credit: MoneySchema.default({ amount: 0, currency: "SAR" }),
          costCenterId: UUIDSchema.optional(),
          projectId: UUIDSchema.optional(),
          dimension1Id: UUIDSchema.optional(),
          dimension2Id: UUIDSchema.optional(),
          metadata: z.record(z.unknown()).default({}),
        })
      )
      .min(2),
    totalDebit: MoneySchema,
    totalCredit: MoneySchema,
    status: z
      .enum(["draft", "posted", "reversed", "cancelled"])
      .default("draft"),
    postedAt: ISODateStringSchema.optional(),
    postedBy: UserIdSchema.optional(),
    reversedAt: ISODateStringSchema.optional(),
    reversedBy: UserIdSchema.optional(),
    reversalReason: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export const JournalEntryCreateSchema = JournalEntrySchema.omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  deletedAt: true,
  deletedBy: true,
});
export type JournalEntryCreate = z.infer<typeof JournalEntryCreateSchema>;

export const CostCenterSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    code: z.string().max(50),
    name: z.string().max(200),
    nameAr: z.string().max(200).optional(),
    parentId: UUIDSchema.optional(),
    managerId: UserIdSchema.optional(),
    budget: MoneySchema.optional(),
    status: EntityStatusSchema.default("active"),
  })
  .merge(AuditFieldsSchema);
export type CostCenter = z.infer<typeof CostCenterSchema>;

export const ProjectSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    code: z.string().max(50),
    name: z.string().max(200),
    nameAr: z.string().max(200).optional(),
    description: z.string().optional(),
    startDate: ISODateStringSchema,
    endDate: ISODateStringSchema.optional(),
    budget: MoneySchema.optional(),
    status: z
      .enum(["planning", "active", "on_hold", "completed", "cancelled"])
      .default("planning"),
    customerId: UUIDSchema.optional(),
    managerId: UserIdSchema.optional(),
  })
  .merge(AuditFieldsSchema);
export type Project = z.infer<typeof ProjectSchema>;

export const DimensionSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    code: z.string().max(50),
    name: z.string().max(200),
    nameAr: z.string().max(200).optional(),
    dimensionType: z.enum([
      "department",
      "location",
      "channel",
      "custom1",
      "custom2",
    ]),
    parentId: UUIDSchema.optional(),
    status: EntityStatusSchema.default("active"),
  })
  .merge(AuditFieldsSchema);
export type Dimension = z.infer<typeof DimensionSchema>;

export const SupplierSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    code: z.string().max(50),
    name: z.string().max(200),
    nameAr: z.string().max(200).optional(),
    commercialRegister: z.string().max(50).optional(),
    vatNumber: z.string().max(50).optional(),
    address: AddressSchema.optional(),
    contact: ContactInfoSchema.optional(),
    paymentTermsDays: z.number().int().nonnegative().default(30),
    currency: CurrencyCodeSchema.default("SAR"),
    status: EntityStatusSchema.default("active"),
    tags: z.array(z.string()).default([]),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type Supplier = z.infer<typeof SupplierSchema>;

export const PurchaseInvoiceSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    number: z.string().max(50),
    supplierInvoiceNumber: z.string().max(100).optional(),
    date: ISODateStringSchema,
    dueDate: ISODateStringSchema.optional(),
    supplierId: UUIDSchema,
    items: z
      .array(
        z.object({
          id: UUIDSchema,
          productId: UUIDSchema.optional(),
          description: z.string(),
          quantity: z.number().positive(),
          unitPrice: MoneySchema,
          discountPercent: z.number().min(0).max(100).default(0),
          taxRate: z.number().min(0).max(100).default(15),
          taxAmount: MoneySchema,
          lineTotal: MoneySchema,
          accountId: UUIDSchema.optional(),
          costCenterId: UUIDSchema.optional(),
          projectId: UUIDSchema.optional(),
        })
      )
      .min(1),
    subtotal: MoneySchema,
    discountTotal: MoneySchema,
    taxTotal: MoneySchema,
    grandTotal: MoneySchema,
    paidAmount: MoneySchema.default({ amount: 0, currency: "SAR" }),
    balanceAmount: MoneySchema,
    status: z
      .enum(["draft", "pending", "approved", "posted", "cancelled"])
      .default("draft"),
    paymentStatus: z
      .enum(["unpaid", "partial", "paid", "overpaid"])
      .default("unpaid"),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type PurchaseInvoice = z.infer<typeof PurchaseInvoiceSchema>;

export const BankAccountSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    accountId: UUIDSchema,
    bankName: z.string().max(100),
    branchName: z.string().max(100).optional(),
    accountNumber: z.string().max(50),
    iban: z.string().max(50).optional(),
    swift: z.string().max(20).optional(),
    currency: CurrencyCodeSchema.default("SAR"),
    isDefault: z.boolean().default(false),
    status: EntityStatusSchema.default("active"),
  })
  .merge(AuditFieldsSchema);
export type BankAccount = z.infer<typeof BankAccountSchema>;

export const BankTransactionSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    bankAccountId: UUIDSchema,
    date: ISODateStringSchema,
    valueDate: ISODateStringSchema.optional(),
    description: z.string().max(500),
    reference: z.string().max(100).optional(),
    amount: MoneySchema,
    balance: MoneySchema,
    type: z.enum(["debit", "credit"]),
    status: z
      .enum(["unreconciled", "reconciled", "matched"])
      .default("unreconciled"),
    journalEntryId: UUIDSchema.optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type BankTransaction = z.infer<typeof BankTransactionSchema>;

export const TaxReturnSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    periodId: UUIDSchema,
    type: z.enum(["vat", "zakat", "income_tax", "withholding"]),
    referenceNumber: z.string().max(100).optional(),
    status: z.enum(["draft", "filed", "paid", "audited"]).default("draft"),
    filedAt: ISODateStringSchema.optional(),
    paidAt: ISODateStringSchema.optional(),
    outputTax: MoneySchema.default({ amount: 0, currency: "SAR" }),
    inputTax: MoneySchema.default({ amount: 0, currency: "SAR" }),
    netTax: MoneySchema.default({ amount: 0, currency: "SAR" }),
    penalty: MoneySchema.default({ amount: 0, currency: "SAR" }),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type TaxReturn = z.infer<typeof TaxReturnSchema>;

export const AccountFilterSchema = z.object({
  search: z.string().optional(),
  type: AccountTypeSchema.optional(),
  subType: AccountSubTypeSchema.optional(),
  parentId: UUIDSchema.optional(),
  isControlAccount: z.boolean().optional(),
  status: EntityStatusSchema.optional(),
});
export type AccountFilter = z.infer<typeof AccountFilterSchema>;

export const JournalEntryFilterSchema = z.object({
  periodId: UUIDSchema.optional(),
  dateFrom: ISODateStringSchema.optional(),
  dateTo: ISODateStringSchema.optional(),
  referenceType: z
    .enum([
      "manual",
      "sales_invoice",
      "purchase_invoice",
      "payment",
      "receipt",
      "payroll",
      "depreciation",
      "inventory",
      "adjustment",
      "closing",
      "opening",
    ])
    .optional(),
  status: z.enum(["draft", "posted", "reversed", "cancelled"]).optional(),
  accountId: UUIDSchema.optional(),
});
export type JournalEntryFilter = z.infer<typeof JournalEntryFilterSchema>;

export const PaginatedAccountsSchema = PaginatedResponseSchema(AccountSchema);
export type PaginatedAccounts = z.infer<typeof PaginatedAccountsSchema>;

export const PaginatedJournalEntriesSchema =
  PaginatedResponseSchema(JournalEntrySchema);
export type PaginatedJournalEntries = z.infer<
  typeof PaginatedJournalEntriesSchema
>;

export const PaginatedCostCentersSchema =
  PaginatedResponseSchema(CostCenterSchema);
export type PaginatedCostCenters = z.infer<typeof PaginatedCostCentersSchema>;

export const PaginatedProjectsSchema = PaginatedResponseSchema(ProjectSchema);
export type PaginatedProjects = z.infer<typeof PaginatedProjectsSchema>;

export const PaginatedSuppliersSchema = PaginatedResponseSchema(SupplierSchema);
export type PaginatedSuppliers = z.infer<typeof PaginatedSuppliersSchema>;

export const PaginatedPurchaseInvoicesSchema = PaginatedResponseSchema(
  PurchaseInvoiceSchema
);
export type PaginatedPurchaseInvoices = z.infer<
  typeof PaginatedPurchaseInvoicesSchema
>;

export const PaginatedBankTransactionsSchema = PaginatedResponseSchema(
  BankTransactionSchema
);
export type PaginatedBankTransactions = z.infer<
  typeof PaginatedBankTransactionsSchema
>;

export const PaginatedTaxReturnsSchema =
  PaginatedResponseSchema(TaxReturnSchema);
export type PaginatedTaxReturns = z.infer<typeof PaginatedTaxReturnsSchema>;
