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

export const CustomerSchema = z
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
    creditLimit: MoneySchema.optional(),
    paymentTermsDays: z.number().int().nonnegative().default(30),
    status: EntityStatusSchema.default("active"),
    tags: z.array(z.string()).default([]),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type Customer = z.infer<typeof CustomerSchema>;

export const CustomerCreateSchema = CustomerSchema.omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  deletedAt: true,
  deletedBy: true,
});
export type CustomerCreate = z.infer<typeof CustomerCreateSchema>;

export const CustomerUpdateSchema = CustomerCreateSchema.partial();
export type CustomerUpdate = z.infer<typeof CustomerUpdateSchema>;

export const SalesInvoiceSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    number: z.string().max(50),
    date: ISODateStringSchema,
    dueDate: ISODateStringSchema.optional(),
    customerId: UUIDSchema,
    customerSnapshot: CustomerSchema.optional(),
    items: z
      .array(
        z.object({
          id: UUIDSchema,
          productId: UUIDSchema.optional(),
          productSnapshot: z
            .object({
              name: z.string(),
              nameAr: z.string().optional(),
              sku: z.string().optional(),
              unit: z.string(),
            })
            .optional(),
          description: z.string().optional(),
          quantity: z.number().positive(),
          unitPrice: MoneySchema,
          discountPercent: z.number().min(0).max(100).default(0),
          discountAmount: MoneySchema.default({
            amount: 0,
            currency: CurrencyCodeSchema.enum.SAR,
          }),
          taxRate: z.number().min(0).max(100).default(15),
          taxAmount: MoneySchema,
          lineTotal: MoneySchema,
        })
      )
      .min(1),
    subtotal: MoneySchema,
    discountTotal: MoneySchema,
    taxTotal: MoneySchema,
    grandTotal: MoneySchema,
    paidAmount: MoneySchema.default({
      amount: 0,
      currency: CurrencyCodeSchema.enum.SAR,
    }),
    balanceAmount: MoneySchema,
    status: z
      .enum(["draft", "pending", "approved", "posted", "cancelled", "refunded"])
      .default("draft"),
    paymentStatus: z
      .enum(["unpaid", "partial", "paid", "overpaid"])
      .default("unpaid"),
    notes: z.string().optional(),
    terms: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type SalesInvoice = z.infer<typeof SalesInvoiceSchema>;

export const SalesInvoiceCreateSchema = SalesInvoiceSchema.omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  deletedAt: true,
  deletedBy: true,
});
export type SalesInvoiceCreate = z.infer<typeof SalesInvoiceCreateSchema>;

export const SalesInvoiceUpdateSchema = SalesInvoiceCreateSchema.partial();
export type SalesInvoiceUpdate = z.infer<typeof SalesInvoiceUpdateSchema>;

export const SalesOrderSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    number: z.string().max(50),
    date: ISODateStringSchema,
    customerId: UUIDSchema,
    items: z
      .array(
        z.object({
          id: UUIDSchema,
          productId: UUIDSchema,
          quantity: z.number().positive(),
          unitPrice: MoneySchema,
          discountPercent: z.number().min(0).max(100).default(0),
          taxRate: z.number().min(0).max(100).default(15),
        })
      )
      .min(1),
    status: z
      .enum([
        "draft",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ])
      .default("draft"),
    deliveryAddress: AddressSchema.optional(),
    expectedDate: ISODateStringSchema.optional(),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type SalesOrder = z.infer<typeof SalesOrderSchema>;

export const SalesOrderCreateSchema = SalesOrderSchema.omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  deletedAt: true,
  deletedBy: true,
});
export type SalesOrderCreate = z.infer<typeof SalesOrderCreateSchema>;

export const QuotationSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    number: z.string().max(50),
    date: ISODateStringSchema,
    validUntil: ISODateStringSchema,
    customerId: UUIDSchema,
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
        })
      )
      .min(1),
    subtotal: MoneySchema,
    discountTotal: MoneySchema,
    taxTotal: MoneySchema,
    grandTotal: MoneySchema,
    status: z
      .enum(["draft", "sent", "accepted", "rejected", "expired", "converted"])
      .default("draft"),
    notes: z.string().optional(),
    terms: z.string().optional(),
    convertedToInvoiceId: UUIDSchema.optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type Quotation = z.infer<typeof QuotationSchema>;

export const QuotationCreateSchema = QuotationSchema.omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  deletedAt: true,
  deletedBy: true,
});
export type QuotationCreate = z.infer<typeof QuotationCreateSchema>;

export const SalesPaymentSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    date: ISODateStringSchema,
    customerId: UUIDSchema,
    invoiceId: UUIDSchema.optional(),
    amount: MoneySchema,
    method: z.enum([
      "cash",
      "bank_transfer",
      "card",
      "check",
      "wallet",
      "other",
    ]),
    reference: z.string().max(100).optional(),
    status: z
      .enum(["pending", "cleared", "bounced", "refunded"])
      .default("pending"),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type SalesPayment = z.infer<typeof SalesPaymentSchema>;

export const CustomerFilterSchema = z.object({
  search: z.string().optional(),
  status: EntityStatusSchema.optional(),
  hasCreditLimit: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});
export type CustomerFilter = z.infer<typeof CustomerFilterSchema>;

export const SalesInvoiceFilterSchema = z.object({
  customerId: UUIDSchema.optional(),
  status: z
    .enum(["draft", "pending", "approved", "posted", "cancelled", "refunded"])
    .optional(),
  paymentStatus: z.enum(["unpaid", "partial", "paid", "overpaid"]).optional(),
  dateFrom: ISODateStringSchema.optional(),
  dateTo: ISODateStringSchema.optional(),
  amountMin: MoneySchema.optional(),
  amountMax: MoneySchema.optional(),
});
export type SalesInvoiceFilter = z.infer<typeof SalesInvoiceFilterSchema>;

export const PaginatedCustomersSchema = PaginatedResponseSchema(CustomerSchema);
export type PaginatedCustomers = z.infer<typeof PaginatedCustomersSchema>;

export const PaginatedSalesInvoicesSchema =
  PaginatedResponseSchema(SalesInvoiceSchema);
export type PaginatedSalesInvoices = z.infer<
  typeof PaginatedSalesInvoicesSchema
>;

export const PaginatedSalesOrdersSchema =
  PaginatedResponseSchema(SalesOrderSchema);
export type PaginatedSalesOrders = z.infer<typeof PaginatedSalesOrdersSchema>;

export const PaginatedQuotationsSchema =
  PaginatedResponseSchema(QuotationSchema);
export type PaginatedQuotations = z.infer<typeof PaginatedQuotationsSchema>;

export const PaginatedSalesPaymentsSchema =
  PaginatedResponseSchema(SalesPaymentSchema);
export type PaginatedSalesPayments = z.infer<
  typeof PaginatedSalesPaymentsSchema
>;
