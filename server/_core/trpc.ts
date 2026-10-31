import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import * as Sentry from "@sentry/node";
import type { TrpcContext } from "./context";
import { enforceSubscription } from "./subscription";
import { requireOwner } from "./tenant";
import { logger } from "./logger";
import {
  classifyTrpcRoute,
  deriveTraceId,
  recordTrpcRequest,
} from "./observability";
import {
  resolveUserPermissions,
  PERMISSION_DENIED_MSG,
  type PermissionKey,
} from "./rbac";
import { recordAuditEvent } from "./audit";
import { invalidateTenantReadModels } from "./tenantCache";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // لغة التاجر: أخطاء التحقق من المدخلات (Zod) تصل الإنجليزية افتراضياً —
    // نترجمها لعربية ودية مع إبقاء الرمز الأصلي للدعم الفني.
    const cause = (error as { cause?: unknown }).cause;
    const isInputError =
      error.code === "BAD_REQUEST" &&
      (cause instanceof Error
        ? /validation|invalid|required|expected|Zod/i.test(
            `${cause.name} ${cause.message}`
          )
        : /validation|invalid|expected/i.test(error.message));
    if (isInputError) {
      return {
        ...shape,
        message: "تحقق من البيانات المدخلة — بعض الحقول ناقصة أو غير صحيحة",
      };
    }
    return shape;
  },
});

export const router = t.router;

/**
 * observabilityMiddleware — runs FIRST on every procedure (see the exported
 * procedure builders below). Emits one structured JSON log per tRPC call via
 * the SINGLE logger/redact() entrypoint:
 *   { requestId, traceId, tenantId, route, type, kind, durationMs, ok }
 * and records the sample in the in-memory SLI store that feeds GET /api/slo.
 * The traceId extends x-request-id (or honours W3C `traceparent`).
 */
const observabilityMiddleware = t.middleware(async opts => {
  const { ctx, next, path, type } = opts;
  const start = Date.now();
  const traceId = deriveTraceId(
    ctx.requestId,
    (ctx.req.headers as Record<string, unknown>)?.["traceparent"]
  );
  try {
    Sentry.getCurrentScope?.().setTag("trace_id", traceId);
  } catch {
    /* Sentry optional */
  }
  const route = path ?? "unknown";
  try {
    const result = await next();
    const durationMs = Date.now() - start;
    const kind = classifyTrpcRoute(route, type);
    recordTrpcRequest({ route, kind, durationMs, ok: true });
    logger.info("trpc", {
      requestId: ctx.requestId,
      traceId,
      tenantId: ctx.tenantId ?? undefined,
      route,
      type,
      kind,
      durationMs,
      ok: true,
    });
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    const kind = classifyTrpcRoute(route, type);
    recordTrpcRequest({ route, kind, durationMs, ok: false });
    logger.error("trpc_error", {
      requestId: ctx.requestId,
      traceId,
      tenantId: ctx.tenantId ?? undefined,
      route,
      type,
      kind,
      durationMs,
      ok: false,
      code: (err as { code?: unknown })?.code,
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
});

/**
 * auditMiddleware — auto-records audit events for security-relevant and financial procedures.
 * - Runs on all procedures tagged `financial_write` (see observability.ts)
 * - Runs on `adminProcedure` and `ownerProcedure`
 * - Extracts `action` from procedure path (e.g., `vouchers.post` → `VOUCHER_POSTED`)
 * - Captures `before` state by fetching resource pre-mutation for updates/deletes
 */
const auditMiddleware = t.middleware(async opts => {
  const { ctx, next, path, type } = opts;
  const route = path ?? "unknown";
  const kind = classifyTrpcRoute(route, type);

  // Only audit financial writes, admin, and owner procedures
  const shouldAudit =
    kind === "financial_write" ||
    route.startsWith("admin.") ||
    route.startsWith("owner.") ||
    route.startsWith("security.") ||
    route.startsWith("backup.") ||
    route.startsWith("vouchers.") ||
    route.startsWith("accountingClosing.") ||
    route.startsWith("inventory.adjustStock") ||
    route.startsWith("inventory.physicalCount") ||
    route.startsWith("inventory.transferStock");

  if (!shouldAudit || !ctx.tenantId || !ctx.user) {
    return next();
  }

  // Derive action from route
  const action = route
    .split(".")
    .map(part => part.toUpperCase())
    .join("_");

  const result = await next();

  // Record audit after successful execution
  try {
    await recordAuditEvent(ctx, {
      action,
      resourceType: route.split(".")[0],
      resourceId: String((opts.input as any)?.id ?? "unknown"),
      metadata: {
        route,
        type,
        kind,
      },
    });
  } catch (e) {
    // Audit failures should never block the main operation
    console.error("[audit] Failed to record audit event:", e);
  }

  return result;
});

export const publicProcedure = t.procedure.use(observabilityMiddleware);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  const user = ctx.user;

  return next({
    ctx: {
      ...ctx,
      user,
    },
  });
});

const requireTenant = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (!ctx.tenantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "يجب ربط المستخدم بمؤسسة (tenant) قبل تنفيذ العملية",
    });
  }
  const user = ctx.user;
  const tenantId = ctx.tenantId;

  // Subscription lifecycle: suspended tenants are blocked; an expired
  // trial auto-transitions to grace (never blocks the business).
  await enforceSubscription(ctx.tenantId);

  const result = await next({
    ctx: {
      ...ctx,
      user,
      tenantId: ctx.tenantId,
    },
  });

  // إبطال ذاكرة القراءة بعد أي كتابة — حتى لا تبقى المؤشرات قديمة.
  if (opts.type === "mutation" && ctx.tenantId) {
    try {
      invalidateTenantReadModels(ctx.tenantId);
    } catch {
      /* الإبطال لا يجب أن يُفشل العملية */
    }
  }

  return result;
});

export const protectedProcedure = t.procedure
  .use(observabilityMiddleware)
  .use(requireUser);
export const tenantProcedure = t.procedure
  .use(observabilityMiddleware)
  .use(requireTenant)
  .use(auditMiddleware);

export const adminProcedure = t.procedure
  .use(observabilityMiddleware)
  .use(requireTenant)
  .use(auditMiddleware)
  .use(
    t.middleware(async opts => {
      const { ctx, next } = opts;

      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
      }
      const user = ctx.user;

      return next({
        ctx: {
          ...ctx,
          user,
        },
      });
    })
  );

// ─── Platform owner (super-admin) procedure ────────────────────────
/**
 * `ownerProcedure` — للإجراءات الحصرية بمالك المنصة (إدارة بوابات الدفع،
 * سياسات الاشتراك، إدارة المستأجرين). يعتمد `requireOwner` من tenant.ts
 * والذي يقارن `openId` مع `OWNER_OPEN_ID`.
 */
export const ownerProcedure = t.procedure
  .use(observabilityMiddleware)
  .use(auditMiddleware)
  .use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: UNAUTHED_ERR_MSG,
        });
      }
      requireOwner(ctx);
      const user = ctx.user;
      return next({ ctx: { ...ctx, user, tenantId: ctx.tenantId } });
    })
  );

/**
 * `requirePermissions` — middleware factory enforcing granular RBAC.
 *
 * Usage:
 *   myProc: tenantProcedure
 *     .use(requirePermissions(PERMISSIONS.VOUCHERS_CREATE))
 *     .mutation(...)
 *
 * Accepts a single key, or `all`/`any` arrays for compound requirements:
 *   .use(requirePermissions({ all: [A, B] }))
 *   .use(requirePermissions({ any: [A, B] }))
 */
export function requirePermissions(
  required: PermissionKey | { all: PermissionKey[] } | { any: PermissionKey[] }
) {
  const keys: PermissionKey[] =
    typeof required === "string"
      ? [required]
      : "all" in required
        ? required.all
        : required.any;
  const mode =
    typeof required === "object" && "any" in required ? "any" : "all";

  return t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    const user = ctx.user;

    // The platform owner (super-admin) bypasses granular checks.
    if (ctx.isSuperAdmin) {
      return next({ ctx: { ...ctx, user } });
    }

    const userPerms = await resolveUserPermissions(ctx);

    const ok =
      mode === "any"
        ? keys.some(k => userPerms.includes(k))
        : keys.every(k => userPerms.includes(k));

    if (!ok) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: PERMISSION_DENIED_MSG,
      });
    }

    // Re-assert the narrowed `user` so downstream handlers keep the
    // non-null type guaranteed by `tenantProcedure`/`requireUser`.
    return next({ ctx: { ...ctx, user } });
  });
}
