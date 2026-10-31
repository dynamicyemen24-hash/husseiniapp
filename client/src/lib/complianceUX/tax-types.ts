/**
 * Tax Regime Types — Multi-Tax Regime System
 * Configurable tax rates per jurisdiction with effective dating
 */

import { z } from "zod";

export const TaxTypeSchema = z.enum(["vat", "gst", "sales_tax", "vat_exempt"]);
export type TaxType = z.infer<typeof TaxTypeSchema>;

export const TaxJurisdictionSchema = z.object({
  code: z.string().max(10),
  name: z.string().max(100),
  nameAr: z.string().max(100).optional(),
  country: z.string().max(100).default("SA"),
  region: z.string().max(100).optional(),
  taxType: TaxTypeSchema.default("vat"),
  rate: z.number().min(0).max(100).default(15),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  effectiveFrom: z.string().datetime({ offset: true }),
  effectiveTo: z.string().datetime({ offset: true }).optional(),
  description: z.string().optional(),
});
export type TaxJurisdiction = z.infer<typeof TaxJurisdictionSchema>;

export const TaxPeriodSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(100),
  type: z.enum(["monthly", "quarterly", "annually"]),
  startDate: z.string().datetime({ offset: true }),
  endDate: z.string().datetime({ offset: true }),
  status: z.enum(["open", "closed", "finalized"]).default("open"),
  isFiled: z.boolean().default(false),
  filedAt: z.string().datetime({ offset: true }).optional(),
});
export type TaxPeriod = z.infer<typeof TaxPeriodSchema>;

export const TaxRateChangeSchema = z.object({
  id: z.string().uuid(),
  jurisdictionId: z.string().uuid(),
  previousRate: z.number().min(0).max(100),
  newRate: z.number().min(0).max(100),
  effectiveDate: z.string().datetime({ offset: true }),
  changedBy: z.string(),
  reason: z.string().optional(),
});
export type TaxRateChange = z.infer<typeof TaxRateChangeSchema>;

export const TaxConfigSchema = z.object({
  tenantId: z.number().int().positive(),
  jurisdictions: z.array(TaxJurisdictionSchema).default([]),
  periods: z.array(TaxPeriodSchema).default([]),
  rateChanges: z.array(TaxRateChangeSchema).default([]),
  defaultTaxType: TaxTypeSchema.default("vat"),
  defaultCurrency: z.string().max(3).default("SAR"),
});
export type TaxConfig = z.infer<typeof TaxConfigSchema>;

export const TaxTransactionSchema = z.object({
  id: z.string().uuid(),
  transactionId: z.string().uuid(),
  referenceType: z.string(),
  referenceId: z.string().uuid(),
  jurisdictionId: z.string().uuid(),
  taxType: TaxTypeSchema,
  rate: z.number().min(0).max(100),
  amountBeforeTax: z.number().multipleOf(0.01),
  taxAmount: z.number().multipleOf(0.01),
  amountAfterTax: z.number().multipleOf(0.01),
  periodId: z.string().uuid().optional(),
  createdAt: z.string().datetime({ offset: true }),
  createdBy: z.string(),
});
export type TaxTransaction = z.infer<typeof TaxTransactionSchema>;
