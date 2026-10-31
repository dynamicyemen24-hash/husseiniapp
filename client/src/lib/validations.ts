import { z } from "zod";

// ── POS / Sales ──
export const createSaleSchema = z.object({
  customerId: z.number().nullable().optional(),
  items: z
    .array(
      z.object({
        productId: z.number(),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0),
        discount: z.number().min(0),
      })
    )
    .refine(items => items.length > 0, {
      message: "The cart must have at least one item",
    }),
  paymentMethod: z.enum(["cash", "card", "transfer", "credit", "online"]),
  paidAmount: z.string().optional(),
  discount: z.string().optional(),
});

export const addToCartSchema = z.object({
  productId: z.number(),
  quantity: z.number().min(1).max(999),
  maxStock: z.number().min(0),
});

// ── Opening Balances ──
export const balanceEntrySchema = z.object({
  accountId: z.number(),
  amount: z.number().min(0),
  type: z.enum(["debit", "credit"]),
  notes: z.string().optional(),
});

export const openingBalancesSchema = z.object({
  entries: z.array(balanceEntrySchema).min(1),
  periodName: z.string().min(1),
  currencyCode: z.string().min(1),
  exchangeRate: z
    .number()
    .min(0)
    .refine(v => v > 0, "Must be positive"),
});

// ── Fiscal Period ──
export const createPeriodSchema = z.object({
  name: z.string().min(2).max(50),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  notes: z.string().optional(),
});

export const closePeriodSchema = z.object({
  periodId: z.number(),
  confirmation: z.literal(true),
});

// ── Inventory Movement ──
export const inventoryMovementSchema = z.object({
  productId: z.number(),
  quantity: z.number().min(1),
  type: z.enum(["in", "out", "transfer", "adjustment"]),
  notes: z.string().optional(),
  fromWarehouseId: z.number().optional(),
  toWarehouseId: z.number().optional(),
});

// ── Purchase Order ──
export const purchaseOrderSchema = z.object({
  supplierId: z.number(),
  items: z.array(
    z.object({
      productId: z.number(),
      quantity: z.number().min(1),
      unitPrice: z.number().min(0),
    })
  ),
  notes: z.string().optional(),
});

// ── Customer / Product Search ──
export const searchSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().min(1).max(100).default(20),
});

// ── Payment ──
export const paymentSchema = z.object({
  amount: z.string().refine(v => {
    const num = Number(v);
    return !isNaN(num) && num > 0;
  }, "المبلغ يجب أن يكون رقمًا أكبر من صفر"),
  method: z.enum(["cash", "card", "transfer", "credit", "online"]),
  reference: z.string().optional(),
});
