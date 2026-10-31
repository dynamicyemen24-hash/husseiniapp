import { TRPCError } from "@trpc/server";
import { ENV } from "./env";
import type { TrpcContext } from "./context";

/**
 * Central tenant-context enforcement.
 *
 * Every tenant-scoped procedure MUST derive the effective tenant id from here
 * instead of reading `ctx.tenantId` directly. This guarantees that:
 *  - a regular user is bound to their own `user.tenantId`
 *  - the platform OWNER (super-admin) may impersonate any tenant by sending
 *    the `x-tenant-id` header (set only from the owner-only tenant switcher)
 *
 * Throws FORBIDDEN when no tenant is resolvable (e.g. user with no tenant yet).
 */
export function requireTenantId(ctx: { tenantId: number | null }): number {
  if (ctx.tenantId == null) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "TENANT_REQUIRED: هذا الإجراء يتطلب ارتباط المستخدم بمؤسسة نشطة",
    });
  }
  return ctx.tenantId;
}

/** True only for the platform owner (super-admin). */
export function isOwner(ctx: TrpcContext): boolean {
  return !!ctx.user && ctx.user.openId === ENV.ownerOpenId;
}

/** Throws unless the caller is the platform owner (super-admin). */
export function requireOwner(ctx: TrpcContext): void {
  if (!isOwner(ctx)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "SUPER_ADMIN_REQUIRED: الإجراء متاح لمالك المنصة فقط",
    });
  }
}
