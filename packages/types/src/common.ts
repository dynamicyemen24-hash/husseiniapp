import { z } from "zod";

export const UUIDSchema = z.string().uuid();
export type UUID = z.infer<typeof UUIDSchema>;

export const ISODateStringSchema = z.string().datetime({ offset: true });
export type ISODateString = z.infer<typeof ISODateStringSchema>;

export const CurrencyCodeSchema = z.enum(["SAR", "USD", "EUR"]);
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

export const LanguageCodeSchema = z.enum(["ar", "en"]);
export type LanguageCode = z.infer<typeof LanguageCodeSchema>;

export const TenantIdSchema = z.number().int().positive();
export type TenantId = z.infer<typeof TenantIdSchema>;

export const UserIdSchema = z.number().int().positive();
export type UserId = z.infer<typeof UserIdSchema>;

export const PaginationInputSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type PaginationInput = z.infer<typeof PaginationInputSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T
) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  });

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.unknown()).optional(),
      })
      .optional(),
    meta: z
      .object({
        requestId: z.string(),
        timestamp: ISODateStringSchema,
        version: z.string(),
      })
      .optional(),
  });

export const MoneySchema = z.object({
  amount: z.number().multipleOf(0.01),
  currency: CurrencyCodeSchema,
});
export type Money = z.infer<typeof MoneySchema>;

export const AddressSchema = z.object({
  street: z.string().max(200),
  city: z.string().max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).default("SA"),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});
export type Address = z.infer<typeof AddressSchema>;

export const ContactInfoSchema = z.object({
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  contactPerson: z.string().max(100).optional(),
});
export type ContactInfo = z.infer<typeof ContactInfoSchema>;

export const AuditFieldsSchema = z.object({
  createdAt: ISODateStringSchema,
  createdBy: UserIdSchema,
  updatedAt: ISODateStringSchema,
  updatedBy: UserIdSchema.optional(),
  deletedAt: ISODateStringSchema.optional(),
  deletedBy: UserIdSchema.optional(),
});
export type AuditFields = z.infer<typeof AuditFieldsSchema>;

export const EntityStatusSchema = z.enum([
  "active",
  "inactive",
  "archived",
  "draft",
]);
export type EntityStatus = z.infer<typeof EntityStatusSchema>;

export const PrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export type Priority = z.infer<typeof PrioritySchema>;
