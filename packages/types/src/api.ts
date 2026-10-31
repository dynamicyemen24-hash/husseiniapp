import { z } from "zod";
import {
  UUIDSchema,
  ISODateStringSchema,
  TenantIdSchema,
  UserIdSchema,
  LanguageCodeSchema,
  PaginationInputSchema,
  PaginatedResponseSchema,
  ApiResponseSchema,
} from "./common";

export const HealthCheckSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  version: z.string(),
  timestamp: ISODateStringSchema,
  uptime: z.number().positive(),
  checks: z.record(
    z.object({
      status: z.enum(["pass", "warn", "fail"]),
      latencyMs: z.number().optional(),
      message: z.string().optional(),
      details: z.record(z.unknown()).optional(),
    })
  ),
});
export type HealthCheck = z.infer<typeof HealthCheckSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().positive(),
  tokenType: z.literal("Bearer"),
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const AuthUserSchema = z.object({
  id: UserIdSchema,
  tenantId: TenantIdSchema,
  username: z.string().max(100),
  email: z.string().email(),
  fullName: z.string().max(200),
  fullNameAr: z.string().max(200).optional(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  language: LanguageCodeSchema.default("ar"),
  timezone: z.string().default("Asia/Riyadh"),
  avatarUrl: z.string().url().optional(),
  lastLoginAt: ISODateStringSchema.optional(),
  mfaEnabled: z.boolean().default(false),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LoginInputSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(8).max(128),
  rememberMe: z.boolean().default(false),
  mfaCode: z.string().max(10).optional(),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const RegisterInputSchema = z.object({
  tenantName: z.string().min(2).max(200),
  tenantNameAr: z.string().min(2).max(200).optional(),
  username: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(200),
  fullNameAr: z.string().min(2).max(200).optional(),
  phone: z.string().max(20).optional(),
  language: LanguageCodeSchema.default("ar"),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const RefreshTokenInputSchema = z.object({
  refreshToken: z.string(),
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenInputSchema>;

export const ChangePasswordInputSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;

export const ForgotPasswordInputSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;

export const ResetPasswordInputSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(128),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;

export const MfaSetupResponseSchema = z.object({
  secret: z.string(),
  qrCodeUrl: z.string().url(),
  backupCodes: z.array(z.string()),
});
export type MfaSetupResponse = z.infer<typeof MfaSetupResponseSchema>;

export const MfaVerifyInputSchema = z.object({
  code: z.string().length(6),
});
export type MfaVerifyInput = z.infer<typeof MfaVerifyInputSchema>;

export const WebhookEventSchema = z.object({
  id: UUIDSchema,
  eventType: z.string(),
  payload: z.record(z.unknown()),
  timestamp: ISODateStringSchema,
  tenantId: TenantIdSchema.optional(),
  signature: z.string().optional(),
});
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

export const WebhookRegistrationSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    url: z.string().url(),
    events: z.array(z.string()),
    secret: z.string(),
    isActive: z.boolean().default(true),
    retryCount: z.number().int().nonnegative().default(0),
    lastTriggeredAt: ISODateStringSchema.optional(),
    lastSuccessAt: ISODateStringSchema.optional(),
    lastFailureAt: ISODateStringSchema.optional(),
    lastFailureReason: z.string().optional(),
  })
  .merge(
    z.object({
      createdAt: ISODateStringSchema,
      createdBy: UserIdSchema,
      updatedAt: ISODateStringSchema,
      updatedBy: UserIdSchema.optional(),
    })
  );
export type WebhookRegistration = z.infer<typeof WebhookRegistrationSchema>;

export const WebhookRegistrationCreateSchema = WebhookRegistrationSchema.omit({
  id: true,
  secret: true,
  retryCount: true,
  lastTriggeredAt: true,
  lastSuccessAt: true,
  lastFailureAt: true,
  lastFailureReason: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
});
export type WebhookRegistrationCreate = z.infer<
  typeof WebhookRegistrationCreateSchema
>;

export const FileUploadSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    filename: z.string().max(255),
    originalName: z.string().max(255),
    mimeType: z.string().max(100),
    size: z.number().int().positive(),
    url: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
    uploadedBy: UserIdSchema,
    entityType: z.string().max(100).optional(),
    entityId: UUIDSchema.optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(
    z.object({
      createdAt: ISODateStringSchema,
    })
  );
export type FileUpload = z.infer<typeof FileUploadSchema>;

export const FileUploadInitSchema = z.object({
  filename: z.string().max(255),
  mimeType: z.string().max(100),
  size: z.number().int().positive(),
  entityType: z.string().max(100).optional(),
  entityId: UUIDSchema.optional(),
});
export type FileUploadInit = z.infer<typeof FileUploadInitSchema>;

export const FileUploadCompleteSchema = z.object({
  uploadId: UUIDSchema,
  parts: z.array(
    z.object({
      partNumber: z.number().int().positive(),
      etag: z.string(),
    })
  ),
});
export type FileUploadComplete = z.infer<typeof FileUploadCompleteSchema>;

export const NotificationSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    userId: UUIDSchema,
    type: z.enum([
      "info",
      "success",
      "warning",
      "error",
      "task",
      "approval",
      "mention",
      "system",
    ]),
    title: z.string().max(200),
    titleAr: z.string().max(200).optional(),
    message: z.string().max(1000),
    messageAr: z.string().max(1000).optional(),
    actionUrl: z.string().url().optional(),
    actionLabel: z.string().max(50).optional(),
    actionLabelAr: z.string().max(50).optional(),
    isRead: z.boolean().default(false),
    readAt: ISODateStringSchema.optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    expiresAt: ISODateStringSchema.optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(
    z.object({
      createdAt: ISODateStringSchema,
    })
  );
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationCreateSchema = NotificationSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  isRead: true,
  readAt: true,
});
export type NotificationCreate = z.infer<typeof NotificationCreateSchema>;

export const SearchInputSchema = z.object({
  query: z.string().min(1).max(500),
  entityTypes: z.array(z.string()).optional(),
  filters: z.record(z.unknown()).default({}),
  pagination: PaginationInputSchema.optional(),
});
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const SearchResultSchema = z.object({
  entityType: z.string(),
  entityId: UUIDSchema,
  title: z.string(),
  titleAr: z.string().optional(),
  snippet: z.string().optional(),
  url: z.string().url().optional(),
  score: z.number(),
  metadata: z.record(z.unknown()).default({}),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number().int().nonnegative(),
  tookMs: z.number().int().nonnegative(),
  suggestions: z.array(z.string()).optional(),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const AuditLogSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    userId: UUIDSchema.optional(),
    action: z.string().max(100),
    entityType: z.string().max(100),
    entityId: UUIDSchema.optional(),
    oldValues: z.record(z.unknown()).optional(),
    newValues: z.record(z.unknown()).optional(),
    ipAddress: z.string().max(45).optional(),
    userAgent: z.string().optional(),
    requestId: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(
    z.object({
      createdAt: ISODateStringSchema,
    })
  );
export type AuditLog = z.infer<typeof AuditLogSchema>;

export const AuditLogFilterSchema = z.object({
  userId: UUIDSchema.optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: UUIDSchema.optional(),
  dateFrom: ISODateStringSchema.optional(),
  dateTo: ISODateStringSchema.optional(),
});
export type AuditLogFilter = z.infer<typeof AuditLogFilterSchema>;

export const PaginatedNotificationsSchema =
  PaginatedResponseSchema(NotificationSchema);
export type PaginatedNotifications = z.infer<
  typeof PaginatedNotificationsSchema
>;

export const PaginatedAuditLogsSchema = PaginatedResponseSchema(AuditLogSchema);
export type PaginatedAuditLogs = z.infer<typeof PaginatedAuditLogsSchema>;

export const PaginatedWebhookRegistrationsSchema = PaginatedResponseSchema(
  WebhookRegistrationSchema
);
export type PaginatedWebhookRegistrations = z.infer<
  typeof PaginatedWebhookRegistrationsSchema
>;

export const PaginatedFileUploadsSchema =
  PaginatedResponseSchema(FileUploadSchema);
export type PaginatedFileUploads = z.infer<typeof PaginatedFileUploadsSchema>;
