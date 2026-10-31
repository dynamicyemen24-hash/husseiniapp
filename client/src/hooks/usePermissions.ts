import { trpc } from "@/lib/trpc";
import { PERMISSIONS, ROLE_DEFINITIONS } from "../../../shared/permissions";

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Client-side permission gate. The server remains the source of truth
 * (every write procedure is protected by requirePermissions), but this hook
 * lets the UI hide disabled controls and match the granted role scopes
 * (e.g. accountancy/reports/procurement) exposed in shared/permissions.
 */
export function usePermissions() {
  const { data } = trpc.auth.me.useQuery(undefined, {
    staleTime: 60_000,
    placeholderData: previous => previous,
  });
  const role = data?.role;
  const isAdmin = role === "owner" || role === "admin";
  const roleDefs = ROLE_DEFINITIONS as unknown as Record<
    string,
    { permissions: string[] }
  >;
  const granted = roleDefs[role ?? ""]?.permissions ?? [];

  const can = (permission: PermissionKey | string) => {
    // Admins/owners bypass granular checks on the client (server enforces too).
    if (isAdmin) return true;
    return granted.includes(permission);
  };

  const canAll = (permissions: PermissionKey[] | string[]) =>
    permissions.every(p => can(p));

  const canAny = (permissions: PermissionKey[] | string[]) =>
    permissions.some(p => can(p));

  return { role, isAdmin, ready: data !== undefined, can, canAll, canAny };
}
