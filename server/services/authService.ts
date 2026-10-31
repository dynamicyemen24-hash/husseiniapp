/**
 * Enhanced Authentication Service — Enterprise-grade auth for multi-tenant SaaS
 * Features:
 * - Registration with duplicate checking, email verification, tenant provisioning
 * - Login with rate limiting, device tracking, geo IP, MFA, account lockout
 * - Password reset with secure tokens, expiry, single-use
 * - Email verification with tokens, resend, expiry
 * - Session management with device tracking
 */

import { eq, and, or, sql, desc, gte, lt, gt } from "drizzle-orm";
import { randomBytes, timingSafeEqual, createHash } from "crypto";
import nodemailer from "nodemailer";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getDb } from "../db";
import {
  users,
  loginAttempts,
  tenants,
  branches,
  settings,
  accounts,
  activityLogs,
  tenantSubscriptions,
  subscriptionPlans,
  subscriptionPolicies,
} from "../../drizzle/schema";
import { hashPassword, verifyPassword } from "../_core/password";
import { generateSecret, verifyToken, otpauthUrl } from "../_core/totp";
import { getClientIp, geolocate, parseDevice } from "../_core/geo";
import { sdk } from "../_core/sdk";
import { COOKIE_NAME, ONE_MONTH_MS } from "../../shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { provisionGenericTenant, applyAuthSchema } from "../_core/systemRouter";
import { checkCustomerDuplicate } from "./deduplication";
import { validateEmail, validatePhone, validateName } from "./validation";
import { ENV } from "../_core/env";

// ============================================================================
// Types & Schemas
// ============================================================================

export const RegisterInputSchema = z.object({
  name: z.string().min(2).max(120),
  username: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-zA-Z0-9_.-]+$/, "اسم المستخدم: حروف وأرقام و . _ - فقط"),
  password: z.string().min(8).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  country: z.string().max(100).optional(),
  currency: z.string().max(50).optional(),
  acceptTerms: z.literal(true),
});

export const LoginInputSchema = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
  rememberMe: z.boolean().optional(),
  mfaToken: z.string().min(6).max(6).optional(),
});

export const ForgotPasswordInputSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordInputSchema = z
  .object({
    token: z.string().min(32).max(128),
    password: z.string().min(8).max(200),
    confirmPassword: z.string().min(8).max(200),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "كلمات المرور غير متطابقة",
    path: ["confirmPassword"],
  });

export const VerifyEmailInputSchema = z.object({
  token: z.string().min(32).max(128),
});

export const ResendVerificationInputSchema = z.object({
  email: z.string().email(),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailInputSchema>;
export type ResendVerificationInput = z.infer<
  typeof ResendVerificationInputSchema
>;

// ============================================================================
// Constants
// ============================================================================

const TOKEN_BYTES = 32;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const RESET_TOKEN_EXPIRY_HOURS = 2;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MINUTES = 15;
const LOCKOUT_DURATION_MINUTES = 30;
const SESSION_REFRESH_THRESHOLD_HOURS = 1;

export type EmailDeliveryConfig = {
  enabled: boolean;
  mode: "smtp" | "console";
  from: string;
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  secure?: boolean;
};

export function getEmailDeliveryConfig(
  overrides: Partial<{
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    emailFrom: string;
    isProduction: boolean;
  }> = {}
): EmailDeliveryConfig {
  const isProduction = overrides.isProduction ?? ENV.isProduction;
  const host = overrides.smtpHost ?? ENV.smtpHost ?? "";
  const port = overrides.smtpPort ?? ENV.smtpPort ?? 587;
  const user = overrides.smtpUser ?? ENV.smtpUser ?? "";
  const password = overrides.smtpPass ?? ENV.smtpPass ?? "";
  const from =
    overrides.emailFrom ?? ENV.emailFrom ?? "no-reply@alhusainia.local";

  const hasCredentials = !!host && !!user && !!password && !!from;
  const enabled = hasCredentials && (isProduction || hasCredentials);

  return {
    enabled,
    mode: enabled ? "smtp" : "console",
    from,
    host: host || undefined,
    port: enabled ? port : undefined,
    user: user || undefined,
    pass: password || undefined,
    secure: port === 465,
  };
}

// ============================================================================
// Token Generation & Validation
// ============================================================================

function generateSecureToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

function hashToken(token: string): string {
  // Simple hash for storage - in production use bcrypt/scrypt
  return createHash("sha256").update(token).digest("hex");
}

function verifyTokenHash(token: string, hash: string): boolean {
  return timingSafeEqual(Buffer.from(hashToken(token)), Buffer.from(hash));
}

// ============================================================================
// Database Helpers
// ============================================================================

async function getDbOrThrow() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "قاعدة البيانات غير متاحة",
    });
  return db;
}

async function recordLoginAttempt(
  db: any,
  input: {
    username: string;
    success: boolean;
    ip?: string | null;
    userAgent?: string | null;
    device?: string;
    country?: string;
    city?: string;
    lat?: string | null;
    lng?: string | null;
    userId?: number | null;
    tenantId?: number | null;
  }
) {
  try {
    await db.insert(loginAttempts).values({
      username: input.username,
      success: input.success,
      ip: input.ip || null,
      userAgent: input.userAgent || null,
      device: input.device,
      country: input.country,
      city: input.city,
      lat: input.lat,
      lng: input.lng,
      userId: input.userId ?? null,
      tenantId: input.tenantId ?? null,
    });
  } catch (e) {
    console.warn("[auth] attempt log failed", (e as any)?.message);
  }
}

async function getFailedAttempts(db: any, username: string): Promise<number> {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000);
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.username, username),
        eq(loginAttempts.success, false),
        gte(loginAttempts.createdAt, since)
      )
    );
  return result[0]?.count ?? 0;
}

async function isAccountLocked(
  db: any,
  username: string
): Promise<{ locked: boolean; remainingMinutes?: number }> {
  const fails = await getFailedAttempts(db, username);
  if (fails >= MAX_LOGIN_ATTEMPTS) {
    const recent = await db
      .select({ createdAt: loginAttempts.createdAt })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.username, username),
          eq(loginAttempts.success, false),
          gte(
            loginAttempts.createdAt,
            new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000)
          )
        )
      )
      .orderBy(desc(loginAttempts.createdAt))
      .limit(1);

    if (recent[0]) {
      const lockoutEnd = new Date(
        recent[0].createdAt.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000
      );
      const remaining = Math.max(
        1,
        Math.ceil((lockoutEnd.getTime() - Date.now()) / 60000)
      );
      return { locked: true, remainingMinutes: remaining };
    }
    return { locked: true, remainingMinutes: LOCKOUT_DURATION_MINUTES };
  }
  return { locked: false };
}

// ============================================================================
// Registration Service
// ============================================================================

export async function registerUser(
  input: RegisterInput,
  ctx: { req: any; res: any }
) {
  const db = await getDbOrThrow();

  // تأكد من وجود جداول الاشتراك/البوابات (idempotent) قبل الاستعلام فيها.
  await applyAuthSchema(db);

  // Validate input
  const nameValidation = validateName(input.name);
  if (!nameValidation.ok) {
    throw new TRPCError({ code: "BAD_REQUEST", message: nameValidation.error });
  }

  if (input.email) {
    const emailValidation = validateEmail(input.email);
    if (!emailValidation.ok) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: emailValidation.error,
      });
    }
  }

  if (input.phone) {
    const phoneValidation = validatePhone(
      input.phone,
      input.country || "OTHER"
    );
    if (!phoneValidation.ok) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: phoneValidation.error,
      });
    }
  }

  const uname = input.username.trim().toLowerCase();

  // Check username duplicate
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, uname))
    .limit(1);

  if (existingUser.length) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "اسم المستخدم مُستخدم مسبقاً",
    });
  }

  // Check email duplicate (if provided)
  if (input.email) {
    const existingEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email.toLowerCase()))
      .limit(1);

    if (existingEmail.length) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "البريد الإلكتروني مسجل مسبقاً",
      });
    }
  }

  // Create password hash
  const passwordHash = await hashPassword(input.password);

  // Generate verification token
  const verificationToken = generateSecureToken();
  const verificationTokenHash = hashToken(verificationToken);
  const verificationTokenExpiry = new Date(
    Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  );

  // Provision tenant and create user in transaction
  const result = await db.transaction(async (tx: any) => {
    const code = `ORG-${Date.now().toString(36).toUpperCase()}`;
    const tid = await provisionGenericTenant(tx, {
      name: input.name.trim(),
      code,
      country: input.country,
      currency: input.currency,
    });

    const [userRow] = await tx
      .insert(users)
      .values({
        openId: `local:${uname}`,
        tenantId: tid,
        name: input.name.trim(),
        email: input.email ? input.email.toLowerCase() : null,
        loginMethod: "local",
        username: uname,
        passwordHash,
        role: "admin",
        lastSignedIn: new Date(),
        // Email verification fields
        emailVerified: false,
        verificationToken: verificationTokenHash,
        verificationTokenExpiry,
      })
      .returning();

    await tx
      .update(tenants)
      .set({ ownerUserId: userRow.id })
      .where(eq(tenants.id, tid));

    // ── Trial subscription provisioning ─────────────────────────────
    // يمنح المستأجر الجديد تجربة مجانية كاملة (trialDays من السياسة
    // الافتراضية). لا يتوقف العمل بعد انتهائها أبداً — تنتقل تلقائياً
    // إلى مهلة مرنة (grace) عبر billingAccess.
    const policyRows = await tx
      .select({
        trialDays: subscriptionPolicies.trialDays,
      })
      .from(subscriptionPolicies)
      .where(eq(subscriptionPolicies.code, "default"))
      .limit(1);
    const trialDays = policyRows[0]?.trialDays ?? 14;
    const trialPlan = await tx
      .select({ id: subscriptionPlans.id })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.code, "starter"))
      .limit(1);
    const trialStart = new Date();
    const trialEnd = new Date(Date.now() + trialDays * 86_400_000);

    const existingSub = await tx
      .select({ id: tenantSubscriptions.id })
      .from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.tenantId, tid))
      .limit(1);
    if (existingSub.length === 0) {
      await tx.insert(tenantSubscriptions).values({
        tenantId: tid,
        planId: trialPlan[0]?.id ?? 1,
        status: "trial",
        billingCycle: "monthly",
        currentPeriodStart: trialStart,
        currentPeriodEnd: trialEnd,
        paymentProvider: "trial",
      });
    }

    await tx
      .update(settings)
      .set({
        subscriptionStatus: "trial",
        trialEndsAt: trialEnd,
        updatedAt: trialStart,
      })
      .where(eq(settings.tenantId, tid));

    return {
      user: userRow,
      tenantId: tid,
      verificationToken,
      trialStart,
      trialEnd,
    };
  });

  // Create session
  const token = await sdk.createSessionToken(result.user.openId, {
    name: input.name.trim(),
  });

  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: ONE_MONTH_MS,
  });

  // Send verification email (async, non-blocking)
  sendVerificationEmail(
    result.user.email!,
    result.verificationToken,
    result.user.name
  ).catch(console.error);

  // Send a warm welcome + trial details (async, non-blocking).
  sendWelcomeEmail(
    result.user.email!,
    input.username.trim(),
    input.name.trim(),
    result.trialEnd
  ).catch(console.error);

  return {
    ok: true as const,
    tenantId: result.tenantId,
    userId: result.user.id,
    emailSent: !!result.user.email,
    trialStart: result.trialStart,
    trialEndsAt: result.trialEnd,
    message:
      "تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.",
  };
}

// ============================================================================
// Login Service
// ============================================================================

export async function loginUser(
  input: LoginInput,
  ctx: { req: any; res: any }
) {
  const db = await getDbOrThrow();

  const uname = input.username.trim().toLowerCase();
  const ip = getClientIp(ctx.req);
  const geo = await geolocate(ip);
  const ua = ctx.req.headers["user-agent"];
  const device = parseDevice(ua);

  // Helper to convert null to undefined for DB schema compatibility
  const n2u = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

  // Check account lockout
  const lockStatus = await isAccountLocked(db, uname);
  if (lockStatus.locked) {
    await recordLoginAttempt(db, {
      username: uname,
      success: false,
      ip,
      userAgent: ua,
      device,
      country: n2u(geo.country),
      city: n2u(geo.city),
      lat: geo.lat != null ? String(geo.lat) : undefined,
      lng: geo.lng != null ? String(geo.lng) : undefined,
    });
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `الحساب مقفل مؤقتاً. حاول مرة أخرى بعد ${lockStatus.remainingMinutes} دقيقة.`,
    });
  }

  // Find user
  const user = (
    await db.select().from(users).where(eq(users.username, uname)).limit(1)
  )[0];

  if (!user) {
    await recordLoginAttempt(db, {
      username: uname,
      success: false,
      ip,
      userAgent: ua,
      device,
      country: n2u(geo.country),
      city: n2u(geo.city),
      lat: geo.lat != null ? String(geo.lat) : undefined,
      lng: geo.lng != null ? String(geo.lng) : undefined,
    });
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ACCOUNT_NOT_FOUND",
    });
  }

  // Check if user has password (local auth)
  if (!user.passwordHash) {
    await recordLoginAttempt(db, {
      username: uname,
      success: false,
      ip,
      userAgent: ua,
      device,
      country: n2u(geo.country),
      city: n2u(geo.city),
      lat: geo.lat != null ? String(geo.lat) : undefined,
      lng: geo.lng != null ? String(geo.lng) : undefined,
      userId: user.id,
      tenantId: user.tenantId,
    });
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "هذا الحساب يستخدم تسجيل دخول خارجي (OAuth). يرجى استخدام بوابة الدخول الموحدة.",
    });
  }

  // Verify password
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    await recordLoginAttempt(db, {
      username: uname,
      success: false,
      ip,
      userAgent: ua,
      device,
      country: n2u(geo.country),
      city: n2u(geo.city),
      lat: geo.lat != null ? String(geo.lat) : undefined,
      lng: geo.lng != null ? String(geo.lng) : undefined,
      userId: user.id,
      tenantId: user.tenantId,
    });

    // Check if now locked
    const newLockStatus = await isAccountLocked(db, uname);
    if (newLockStatus.locked) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `كلمة المرور غير صحيحة. الحساب مقفل مؤقتاً. حاول مرة أخرى بعد ${newLockStatus.remainingMinutes} دقيقة.`,
      });
    }

    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "كلمة المرور غير صحيحة",
    });
  }

  // Check MFA if enabled
  if (user.mfaEnabled && user.mfaSecret) {
    if (!input.mfaToken) {
      return { mfaRequired: true as const, userId: user.id };
    }
    const mfaOk = verifyToken(user.mfaSecret, input.mfaToken);
    if (!mfaOk) {
      await recordLoginAttempt(db, {
        username: uname,
        success: false,
        ip,
        userAgent: ua,
        device,
        country: n2u(geo.country),
        city: n2u(geo.city),
        lat: geo.lat != null ? String(geo.lat) : undefined,
        lng: geo.lng != null ? String(geo.lng) : undefined,
        userId: user.id,
        tenantId: user.tenantId,
      });
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "رمز التحقق الثنائي غير صحيح",
      });
    }
  }

  // Check email verification
  if (!user.emailVerified && user.email) {
    // Allow login but flag unverified email
    // In production, you might want to block or force verification
  }

  // Record successful attempt
  await recordLoginAttempt(db, {
    username: uname,
    success: true,
    ip,
    userAgent: ua,
    device,
    country: n2u(geo.country),
    city: n2u(geo.city),
    lat: geo.lat != null ? String(geo.lat) : undefined,
    lng: geo.lng != null ? String(geo.lng) : undefined,
    userId: user.id,
    tenantId: user.tenantId,
  });

  // Reset failed attempts on successful login
  await db
    .update(users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastSignedIn: new Date(),
    })
    .where(eq(users.id, user.id));

  // Create session
  const maxAge = input.rememberMe ? ONE_MONTH_MS * 12 : ONE_MONTH_MS; // 1 year if remember me
  const token = await sdk.createSessionToken(user.openId, {
    name: user.name || uname,
  });

  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge,
  });

  return {
    ok: true as const,
    user: {
      id: user.id,
      name: user.name,
      tenantId: user.tenantId,
      role: user.role,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
    },
    requiresEmailVerification: !user.emailVerified && !!user.email,
  };
}

// ============================================================================
// Password Reset Service
// ============================================================================

export async function requestPasswordReset(input: ForgotPasswordInput) {
  const db = await getDbOrThrow();
  const email = input.email.toLowerCase();

  const user = (
    await db.select().from(users).where(eq(users.email, email)).limit(1)
  )[0];

  // Always return success to prevent email enumeration
  if (!user) {
    return {
      ok: true as const,
      message: "إذا كان البريد مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور",
    };
  }

  // Generate reset token
  const resetToken = generateSecureToken();
  const resetTokenHash = hashToken(resetToken);
  const resetTokenExpiry = new Date(
    Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  );

  await db
    .update(users)
    .set({
      resetToken: resetTokenHash,
      resetTokenExpiry,
    })
    .where(eq(users.id, user.id));

  // Send reset email (async, non-blocking)
  const resetEmail: string = user.email as string;
  if (resetEmail) {
    sendPasswordResetEmail(
      resetEmail,
      resetToken,
      user.name ?? "المستخدم"
    ).catch(console.error);
  }

  return {
    ok: true as const,
    message: "إذا كان البريد مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور",
  };
}

export async function resetPassword(input: ResetPasswordInput) {
  const db = await getDbOrThrow();

  const tokenHash = hashToken(input.token);

  const user = (
    await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.resetToken, tokenHash),
          gt(users.resetTokenExpiry, new Date())
        )
      )
      .limit(1)
  )[0];

  if (!user) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "رابط إعادة التعيين غير صحيح أو منتهي الصلاحية",
    });
  }

  // Hash new password
  const passwordHash = await hashPassword(input.password);

  // Update password and clear reset token
  await db
    .update(users)
    .set({
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    })
    .where(eq(users.id, user.id));

  // Invalidate all sessions (optional - for security)
  // This would require a session store; for JWT we rely on short expiry

  return { ok: true as const, message: "تم إعادة تعيين كلمة المرور بنجاح" };
}

// ============================================================================
// Email Verification Service
// ============================================================================

export async function verifyEmail(input: VerifyEmailInput) {
  const db = await getDbOrThrow();

  const tokenHash = hashToken(input.token);

  const user = (
    await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.verificationToken, tokenHash),
          gt(users.verificationTokenExpiry, new Date())
        )
      )
      .limit(1)
  )[0];

  if (!user) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "رابط التحقق غير صحيح أو منتهي الصلاحية",
    });
  }

  await db
    .update(users)
    .set({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    })
    .where(eq(users.id, user.id));

  return { ok: true as const, message: "تم التحقق من البريد الإلكتروني بنجاح" };
}

export async function resendVerificationEmail(input: ResendVerificationInput) {
  const db = await getDbOrThrow();
  const email = input.email.toLowerCase();

  const user = (
    await db.select().from(users).where(eq(users.email, email)).limit(1)
  )[0];

  // Always return success to prevent email enumeration
  if (!user) {
    return {
      ok: true as const,
      message: "إذا كان البريد مسجلاً، تم إرسال رابط التحقق",
    };
  }

  if (user.emailVerified) {
    return { ok: true as const, message: "البريد الإلكتروني مُحقق بالفعل" };
  }

  // Generate new verification token
  const verificationToken = generateSecureToken();
  const verificationTokenHash = hashToken(verificationToken);
  const verificationTokenExpiry = new Date(
    Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  );

  await db
    .update(users)
    .set({
      verificationToken: verificationTokenHash,
      verificationTokenExpiry,
    })
    .where(eq(users.id, user.id));

  // Send verification email (async, non-blocking)
  const verifyEmail: string = user.email as string;
  if (verifyEmail) {
    sendVerificationEmail(
      verifyEmail,
      verificationToken,
      user.name ?? "المستخدم"
    ).catch(console.error);
  }

  return {
    ok: true as const,
    message: "تم إرسال رابط التحقق إلى بريدك الإلكتروني",
  };
}

// ============================================================================
// Session Management
// ============================================================================

export async function logoutUser(ctx: { req: any; res: any }) {
  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  return { success: true as const };
}

export async function getCurrentUser(ctx: { user: any }) {
  if (!ctx.user) return null;
  return {
    id: ctx.user.id,
    name: ctx.user.name,
    email: ctx.user.email,
    tenantId: ctx.user.tenantId,
    role: ctx.user.role,
    emailVerified: ctx.user.emailVerified,
    mfaEnabled: ctx.user.mfaEnabled,
    username: ctx.user.username,
  };
}

export async function updateProfile(
  ctx: { user: any },
  input: {
    name: string;
    email?: string;
    themePreference?: string;
    emailNotifications?: boolean;
    whatsappNotifications?: boolean;
    compactMode?: boolean;
  }
) {
  const db = await getDbOrThrow();

  const nameValidation = validateName(input.name);
  if (!nameValidation.ok) {
    throw new TRPCError({ code: "BAD_REQUEST", message: nameValidation.error });
  }

  if (input.email) {
    const emailValidation = validateEmail(input.email);
    if (!emailValidation.ok) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: emailValidation.error,
      });
    }

    // Check email duplicate
    const existingEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.email, input.email.toLowerCase()),
          sql`${users.id} != ${ctx.user.id}`
        )
      )
      .limit(1);

    if (existingEmail.length) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "البريد الإلكتروني مستخدم مسبقاً",
      });
    }
  }

  await db
    .update(users)
    .set({
      name: input.name,
      email: input.email ? input.email.toLowerCase() : null,
      themePreference: input.themePreference,
      emailNotifications: input.emailNotifications,
      whatsappNotifications: input.whatsappNotifications,
      compactMode: input.compactMode,
    })
    .where(eq(users.id, ctx.user.id));

  await db.insert(activityLogs).values({
    userId: ctx.user.id,
    userName: input.name,
    action: "تحديث الملف الشخصي",
    details: `تم تحديث الملف الشخصي بواسطة ${input.name}`,
  });

  return { success: true };
}

export async function changePassword(
  ctx: { user: any },
  input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }
) {
  const db = await getDbOrThrow();

  if (input.newPassword !== input.confirmPassword) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "كلمات المرور غير متطابقة",
    });
  }

  if (input.newPassword.length < 8) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
    });
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, ctx.user.id))
    .limit(1);
  if (!user[0])
    throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });

  const ok = await verifyPassword(input.currentPassword, user[0].passwordHash);
  if (!ok) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "كلمة المرور الحالية غير صحيحة",
    });
  }

  const passwordHash = await hashPassword(input.newPassword);

  await db
    .update(users)
    .set({
      passwordHash,
      passwordChangedAt: new Date(),
    })
    .where(eq(users.id, ctx.user.id));

  return { ok: true as const, message: "تم تغيير كلمة المرور بنجاح" };
}

// ============================================================================
// MFA Service
// ============================================================================

export async function setupMfa(ctx: { user: any }) {
  const db = await getDbOrThrow();

  const secret = generateSecret();
  const url = otpauthUrl(secret, ctx.user.username || ctx.user.name || "user");

  await db
    .update(users)
    .set({ mfaSecret: secret })
    .where(eq(users.id, ctx.user.id));

  return { secret, otpauthUrl: url };
}

export async function verifySetupMfa(
  ctx: { user: any },
  input: { token: string }
) {
  const db = await getDbOrThrow();

  const user = (
    await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1)
  )[0];

  if (!user?.mfaSecret) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "لم يتم إنشاء سر" });
  }

  const ok = verifyToken(user.mfaSecret, input.token);
  if (!ok) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "رمز غير صحيح" });
  }

  await db
    .update(users)
    .set({ mfaEnabled: true })
    .where(eq(users.id, ctx.user.id));

  return { ok: true as const };
}

export async function disableMfa(ctx: { user: any }) {
  const db = await getDbOrThrow();

  await db
    .update(users)
    .set({ mfaEnabled: false, mfaSecret: null })
    .where(eq(users.id, ctx.user.id));

  return { ok: true as const };
}

// ============================================================================
// Login History / Security
// ============================================================================

export async function getLoginHistory(ctx: { user: any }) {
  const db = await getDbOrThrow();

  const rows = await db
    .select()
    .from(loginAttempts)
    .where(
      or(
        eq(loginAttempts.userId, ctx.user.id),
        eq(loginAttempts.username, ctx.user.username ?? "")
      )
    )
    .orderBy(desc(loginAttempts.createdAt))
    .limit(50);

  return rows;
}

export async function revokeAllSessions(ctx: { user: any }) {
  // For JWT-based auth, we'd need a token blacklist or version field
  // For now, we can force password change which invalidates sessions
  const db = await getDbOrThrow();

  await db
    .update(users)
    .set({ passwordChangedAt: new Date() })
    .where(eq(users.id, ctx.user.id));

  return {
    ok: true as const,
    message: "تم إلغاء جميع الجلسات. ستحتاج لتسجيل الدخول مرة أخرى.",
  };
}

// ============================================================================
// Email Service
// ============================================================================

export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ delivered: boolean; mode: "smtp" | "console" }> {
  const config = getEmailDeliveryConfig();

  if (!config.enabled || !config.host || !config.user || !config.pass) {
    console.log(
      `[Email][console] ${options.subject} => ${options.to}\n${options.text}`
    );
    return { delivered: false, mode: "console" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port ?? 587,
      secure: config.secure ?? false,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? `<p>${options.text.replace(/\n/g, "<br />")}</p>`,
    });

    return { delivered: true, mode: "smtp" };
  } catch (error) {
    console.error("[Email][smtp] delivery failed", error);
    console.log(
      `[Email][console-fallback] ${options.subject} => ${options.to}\n${options.text}`
    );
    return { delivered: false, mode: "console" };
  }
}

async function sendVerificationEmail(
  email: string,
  token: string,
  name: string
): Promise<void> {
  if (!email) return;
  const verifyUrl = `${ENV.appUrl || "https://alhusainiaye.vercel.app"}/verify-email?token=${token}`;
  await sendTransactionalEmail({
    to: email,
    subject: "تفعيل حسابك - منصة الحسينية",
    text: `مرحباً ${name}،\n\nيرجى التحقق من بريدك الإلكتروني عبر الرابط التالي:\n${verifyUrl}\n\nإذا لم تكن قد طلبت هذا، يمكنك تجاهل الرسالة.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
        <h3 style="margin-bottom: 12px;">مرحباً ${name}</h3>
        <p>يرجى التحقق من بريدك الإلكتروني عبر الرابط التالي:</p>
        <p><a href="${verifyUrl}" target="_blank" rel="noopener noreferrer">تفعيل الحساب الآن</a></p>
        <p>إذا لم تكن قد طلبت هذا، يمكنك تجاهل الرسالة.</p>
      </div>
    `,
  });
}

async function sendWelcomeEmail(
  email: string,
  username: string,
  name: string,
  trialEndsAt?: Date
): Promise<void> {
  if (!email) return;
  const days = trialEndsAt
    ? Math.max(1, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : 14;
  await sendTransactionalEmail({
    to: email,
    subject: "أهلاً بك في منصة الحسينية 🎉",
    text: `مرحباً ${name}،\n\nتم إنشاء حسابك بنجاح.\nاسم المستخدم: ${username}\n\nلديك ${days} يوماً من فترة التجربة المجانية الكاملة.\nابدأ من هنا: ${ENV.appUrl || "https://alhusainiaye.vercel.app"}\n\nمهم: لن يتوقف عملك أبداً بعد انتهاء التجربة — يتحول النظام تلقائياً إلى مهلة مرنة تبقى خلالها بياناتك وعملياتك اليومية متاحة.`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.8; color: #0f172a;">
        <h3 style="margin-bottom: 12px;">مرحباً ${name} 👋</h3>
        <p>تم إنشاء حسابك في منصة الحسينية بنجاح.</p>
        <p><strong>اسم المستخدم:</strong> ${username}</p>
        <p><strong>فترة التجربة:</strong> ${days} يوماً كاملة بجميع الوحدات.</p>
        <p style="margin-top:16px;">
          <a href="${ENV.appUrl || "https://alhusainiaye.vercel.app"}" target="_blank" rel="noopener noreferrer"
             style="background:#1e3a5f;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;">
            ابدأ العمل الآن
          </a>
        </p>
        <p style="margin-top:20px;font-size:13px;color:#475569;">
          لن يتوقف عملك أبداً بعد انتهاء التجربة — يتحول النظام تلقائياً إلى مهلة مرنة تبقى خلالها بياناتك وعملياتك اليومية متاحة.
        </p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(
  email: string,
  token: string,
  name: string
): Promise<void> {
  if (!email) return;
  const resetUrl = `${ENV.appUrl || "https://alhusainiaye.vercel.app"}/reset-password?token=${token}`;
  await sendTransactionalEmail({
    to: email,
    subject: "إعادة تعيين كلمة المرور - منصة الحسينية",
    text: `مرحباً ${name}،\n\nلإعادة تعيين كلمة المرور، استخدم الرابط التالي:\n${resetUrl}\n\nإذا لم تطلب هذا، يمكنك تجاهل الرسالة.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
        <h3 style="margin-bottom: 12px;">مرحباً ${name}</h3>
        <p>لإعادة تعيين كلمة المرور، استخدم الرابط التالي:</p>
        <p><a href="${resetUrl}" target="_blank" rel="noopener noreferrer">إعادة تعيين كلمة المرور</a></p>
        <p>إذا لم تطلب هذا، يمكنك تجاهل الرسالة.</p>
      </div>
    `,
  });
}
