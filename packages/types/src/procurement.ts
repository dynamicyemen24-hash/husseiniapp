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

export const PurchaseRequisitionSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    number: z.string().max(50),
    date: ISODateStringSchema,
    requestedBy: UserIdSchema,
    departmentId: UUIDSchema.optional(),
    projectId: UUIDSchema.optional(),
    items: z
      .array(
        z.object({
          id: UUIDSchema,
          productId: UUIDSchema.optional(),
          description: z.string(),
          quantity: z.number().positive(),
          unitId: UUIDSchema.optional(),
          estimatedUnitPrice: MoneySchema.optional(),
          requiredDate: ISODateStringSchema.optional(),
          justification: z.string().optional(),
        })
      )
      .min(1),
    status: z
      .enum([
        "draft",
        "submitted",
        "approved",
        "rejected",
        "converted",
        "cancelled",
      ])
      .default("draft"),
    approvedBy: UserIdSchema.optional(),
    approvedAt: ISODateStringSchema.optional(),
    rejectionReason: z.string().optional(),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type PurchaseRequisition = z.infer<typeof PurchaseRequisitionSchema>;

export const PurchaseOrderSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    number: z.string().max(50),
    date: ISODateStringSchema,
    supplierId: UUIDSchema,
    requisitionId: UUIDSchema.optional(),
    currency: CurrencyCodeSchema.default("SAR"),
    exchangeRate: z.number().positive().default(1),
    items: z
      .array(
        z.object({
          id: UUIDSchema,
          productId: UUIDSchema.optional(),
          description: z.string(),
          quantity: z.number().positive(),
          unitId: UUIDSchema,
          unitPrice: MoneySchema,
          discountPercent: z.number().min(0).max(100).default(0),
          taxRate: z.number().min(0).max(100).default(15),
          taxAmount: MoneySchema,
          lineTotal: MoneySchema,
          requiredDate: ISODateStringSchema.optional(),
          receivedQuantity: z.number().default(0),
          billedQuantity: z.number().default(0),
        })
      )
      .min(1),
    subtotal: MoneySchema,
    discountTotal: MoneySchema,
    taxTotal: MoneySchema,
    grandTotal: MoneySchema,
    deliveryAddress: AddressSchema.optional(),
    deliveryTerms: z.string().optional(),
    paymentTerms: z.string().optional(),
    status: z
      .enum([
        "draft",
        "sent",
        "acknowledged",
        "partial",
        "received",
        "completed",
        "cancelled",
      ])
      .default("draft"),
    sentAt: ISODateStringSchema.optional(),
    acknowledgedAt: ISODateStringSchema.optional(),
    completedAt: ISODateStringSchema.optional(),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;

export const PurchaseReceiptSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    number: z.string().max(50),
    date: ISODateStringSchema,
    purchaseOrderId: UUIDSchema,
    supplierId: UUIDSchema,
    warehouseId: UUIDSchema,
    items: z
      .array(
        z.object({
          id: UUIDSchema,
          poItemId: UUIDSchema,
          productId: UUIDSchema,
          quantityReceived: z.number().positive(),
          quantityAccepted: z.number().default(0),
          quantityRejected: z.number().default(0),
          rejectionReason: z.string().optional(),
          batchId: UUIDSchema.optional(),
          serialNumbers: z.array(z.string()).optional(),
          unitCost: MoneySchema,
        })
      )
      .min(1),
    status: z
      .enum(["draft", "partial", "completed", "returned", "cancelled"])
      .default("draft"),
    receivedBy: UserIdSchema.optional(),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type PurchaseReceipt = z.infer<typeof PurchaseReceiptSchema>;

export const PurchaseReturnSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    number: z.string().max(50),
    date: ISODateStringSchema,
    purchaseReceiptId: UUIDSchema,
    supplierId: UUIDSchema,
    warehouseId: UUIDSchema,
    type: z.enum([
      "return_to_supplier",
      "damaged",
      "wrong_item",
      "excess",
      "quality_issue",
    ]),
    items: z
      .array(
        z.object({
          id: UUIDSchema,
          receiptItemId: UUIDSchema,
          productId: UUIDSchema,
          quantity: z.number().positive(),
          batchId: UUIDSchema.optional(),
          serialNumbers: z.array(z.string()).optional(),
          unitCost: MoneySchema,
          reason: z.string().max(500),
        })
      )
      .min(1),
    totalValue: MoneySchema,
    status: z
      .enum([
        "draft",
        "approved",
        "shipped",
        "received_by_supplier",
        "credited",
        "cancelled",
      ])
      .default("draft"),
    approvedBy: UserIdSchema.optional(),
    approvedAt: ISODateStringSchema.optional(),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type PurchaseReturn = z.infer<typeof PurchaseReturnSchema>;

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
    taxRegistrationNumber: z.string().max(50).optional(),
    bankAccount: z
      .object({
        bankName: z.string().max(100),
        accountNumber: z.string().max(50),
        iban: z.string().max(50).optional(),
        swift: z.string().max(20).optional(),
      })
      .optional(),
    rating: z.number().min(0).max(5).optional(),
    isPreferred: z.boolean().default(false),
    status: EntityStatusSchema.default("active"),
    tags: z.array(z.string()).default([]),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type Supplier = z.infer<typeof SupplierSchema>;

export const SupplierQuotationSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    number: z.string().max(50),
    date: ISODateStringSchema,
    validUntil: ISODateStringSchema,
    supplierId: UUIDSchema,
    requisitionId: UUIDSchema.optional(),
    currency: CurrencyCodeSchema.default("SAR"),
    exchangeRate: z.number().positive().default(1),
    items: z
      .array(
        z.object({
          id: UUIDSchema,
          productId: UUIDSchema.optional(),
          description: z.string(),
          quantity: z.number().positive(),
          unitId: UUIDSchema,
          unitPrice: MoneySchema,
          discountPercent: z.number().min(0).max(100).default(0),
          taxRate: z.number().min(0).max(100).default(15),
          leadTimeDays: z.number().int().nonnegative().optional(),
        })
      )
      .min(1),
    subtotal: MoneySchema,
    discountTotal: MoneySchema,
    taxTotal: MoneySchema,
    grandTotal: MoneySchema,
    status: z
      .enum(["draft", "submitted", "accepted", "rejected", "expired"])
      .default("draft"),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type SupplierQuotation = z.infer<typeof SupplierQuotationSchema>;

export const ContractSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    number: z.string().max(50),
    name: z.string().max(200),
    nameAr: z.string().max(200).optional(),
    supplierId: UUIDSchema,
    type: z.enum([
      "blanket",
      "fixed_price",
      "time_material",
      "service_level",
      "maintenance",
    ]),
    startDate: ISODateStringSchema,
    endDate: ISODateStringSchema,
    autoRenew: z.boolean().default(false),
    renewalNoticeDays: z.number().int().nonnegative().default(30),
    value: MoneySchema,
    currency: CurrencyCodeSchema.default("SAR"),
    paymentTerms: z.string().optional(),
    terms: z.string().optional(),
    status: z
      .enum(["draft", "active", "expired", "terminated", "renewed"])
      .default("draft"),
    documentUrl: z.string().url().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type Contract = z.infer<typeof ContractSchema>;

export const PurchaseRequisitionFilterSchema = z.object({
  search: z.string().optional(),
  requestedBy: UUIDSchema.optional(),
  departmentId: UUIDSchema.optional(),
  status: z
    .enum([
      "draft",
      "submitted",
      "approved",
      "rejected",
      "converted",
      "cancelled",
    ])
    .optional(),
  dateFrom: ISODateStringSchema.optional(),
  dateTo: ISODateStringSchema.optional(),
});
export type PurchaseRequisitionFilter = z.infer<
  typeof PurchaseRequisitionFilterSchema
>;

export const PurchaseOrderFilterSchema = z.object({
  search: z.string().optional(),
  supplierId: UUIDSchema.optional(),
  status: z
    .enum([
      "draft",
      "sent",
      "acknowledged",
      "partial",
      "received",
      "completed",
      "cancelled",
    ])
    .optional(),
  dateFrom: ISODateStringSchema.optional(),
  dateTo: ISODateStringSchema.optional(),
});
export type PurchaseOrderFilter = z.infer<typeof PurchaseOrderFilterSchema>;

export const PurchaseReceiptFilterSchema = z.object({
  search: z.string().optional(),
  purchaseOrderId: UUIDSchema.optional(),
  supplierId: UUIDSchema.optional(),
  warehouseId: UUIDSchema.optional(),
  status: z
    .enum(["draft", "partial", "completed", "returned", "cancelled"])
    .optional(),
  dateFrom: ISODateStringSchema.optional(),
  dateTo: ISODateStringSchema.optional(),
});
export type PurchaseReceiptFilter = z.infer<typeof PurchaseReceiptFilterSchema>;

export const SupplierFilterSchema = z.object({
  search: z.string().optional(),
  isPreferred: z.boolean().optional(),
  status: EntityStatusSchema.optional(),
});
export type SupplierFilter = z.infer<typeof SupplierFilterSchema>;

export const PaginatedPurchaseRequisitionsSchema = PaginatedResponseSchema(
  PurchaseRequisitionSchema
);
export type PaginatedPurchaseRequisitions = z.infer<
  typeof PaginatedPurchaseRequisitionsSchema
>;

export const PaginatedPurchaseOrdersSchema =
  PaginatedResponseSchema(PurchaseOrderSchema);
export type PaginatedPurchaseOrders = z.infer<
  typeof PaginatedPurchaseOrdersSchema
>;

export const PaginatedPurchaseReceiptsSchema = PaginatedResponseSchema(
  PurchaseReceiptSchema
);
export type PaginatedPurchaseReceipts = z.infer<
  typeof PaginatedPurchaseReceiptsSchema
>;

export const PaginatedPurchaseReturnsSchema =
  PaginatedResponseSchema(PurchaseReturnSchema);
export type PaginatedPurchaseReturns = z.infer<
  typeof PaginatedPurchaseReturnsSchema
>;

export const PaginatedSuppliersSchema = PaginatedResponseSchema(SupplierSchema);
export type PaginatedSuppliers = z.infer<typeof PaginatedSuppliersSchema>;

export const PaginatedSupplierQuotationsSchema = PaginatedResponseSchema(
  SupplierQuotationSchema
);
export type PaginatedSupplierQuotations = z.infer<
  typeof PaginatedSupplierQuotationsSchema
>;

export const PaginatedContractsSchema = PaginatedResponseSchema(ContractSchema);
export type PaginatedContracts = z.infer<typeof PaginatedContractsSchema>;
