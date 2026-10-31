import { createHash } from "crypto";
import { eq, desc, sql } from "drizzle-orm";
import type { TrpcContext } from "./context";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";

export interface AuditEventInput {
  action: string;
  resourceType: string;
  resourceId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

function computeHash(
  prevHash: string | null,
  entry: Record<string, unknown>
): string {
  const payload = (prevHash ?? "") + JSON.stringify(entry);
  return createHash("sha256").update(payload).digest("hex");
}

async function getLastChainEntry(tx: any, tenantId: number) {
  const [last] = await tx
    .select({
      currentHash: auditLogs.currentHash,
      chainSequence: auditLogs.chainSequence,
    })
    .from(auditLogs)
    .where(eq(auditLogs.tenantId, tenantId))
    .orderBy(desc(auditLogs.chainSequence))
    .limit(1);
  return last;
}

export async function recordAuditEvent(
  ctx: TrpcContext,
  input: AuditEventInput
): Promise<void> {
  if (!ctx.tenantId) return;

  const db = await getDb();
  if (!db) return;

  const actorId = ctx.user?.id ?? null;
  const actorRole = ctx.user?.role ?? "system";

  const metadata = {
    ...input.metadata,
    ip: ctx.req?.headers["x-forwarded-for"] ?? ctx.req?.ip ?? "unknown",
    userAgent: ctx.req?.headers["user-agent"] ?? "unknown",
    traceId: ctx.requestId,
    isSuperAdmin: ctx.isSuperAdmin,
  };

  await (db as any).transaction(async (tx: any) => {
    const lastEntry = await getLastChainEntry(tx, ctx.tenantId!);
    const prevHash = lastEntry?.currentHash ?? null;
    const chainSequence = (lastEntry?.chainSequence ?? 0) + 1;

    const entry = {
      tenantId: ctx.tenantId!,
      userId: actorId,
      sessionId: ctx.req?.headers["x-session-id"] as string | undefined,
      action: input.action,
      entityType: input.resourceType,
      entityId: Number(input.resourceId) || 0,
      entityGlobalId: input.resourceId.includes("-")
        ? (input.resourceId as any)
        : undefined,
      oldValues: input.before ?? null,
      newValues: input.after ?? null,
      ipAddress: metadata.ip as string,
      userAgent: metadata.userAgent as string,
      deviceId: undefined,
      deviceFingerprint: undefined,
      country: undefined,
      city: undefined,
      lat: undefined,
      lng: undefined,
      previousHash: prevHash,
      currentHash: "",
      chainSequence,
      createdAt: new Date(),
    };

    const hash = computeHash(prevHash, entry);
    entry.currentHash = hash;

    await tx.insert(auditLogs).values(entry);
  });
}

export async function verifyAuditChain(tenantId: number): Promise<
  Array<{
    id: number;
    chainSequence: number;
    expectedHash: string;
    actualHash: string;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  const entries = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.tenantId, tenantId))
    .orderBy(auditLogs.chainSequence);

  const broken: Array<{
    id: number;
    chainSequence: number;
    expectedHash: string;
    actualHash: string;
  }> = [];

  let prevHash: string | null = null;
  for (const entry of entries) {
    const entryForHash = {
      tenantId: entry.tenantId,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityGlobalId: entry.entityGlobalId,
      oldValues: entry.oldValues,
      newValues: entry.newValues,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      previousHash: entry.previousHash,
      chainSequence: entry.chainSequence,
      createdAt: entry.createdAt,
    };
    const expectedHash = computeHash(prevHash, entryForHash);
    if (expectedHash !== entry.currentHash) {
      broken.push({
        id: entry.id,
        chainSequence: entry.chainSequence,
        expectedHash,
        actualHash: entry.currentHash,
      });
    }
    prevHash = entry.currentHash;
  }

  return broken;
}

export async function getAuditLogs(
  tenantId: number,
  filters: {
    actorId?: number;
    action?: string;
    resourceType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    cursor?: number;
    limit?: number;
  }
) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null };

  const conditions = [eq(auditLogs.tenantId, tenantId)];

  if (filters.actorId) conditions.push(eq(auditLogs.userId, filters.actorId));
  if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters.resourceType)
    conditions.push(eq(auditLogs.entityType, filters.resourceType));
  if (filters.dateFrom)
    conditions.push(sql`${auditLogs.createdAt} >= ${filters.dateFrom}`);
  if (filters.dateTo)
    conditions.push(sql`${auditLogs.createdAt} <= ${filters.dateTo}`);
  if (filters.cursor) conditions.push(sql`${auditLogs.id} < ${filters.cursor}`);

  const limit = filters.limit ?? 50;
  const items = await db
    .select()
    .from(auditLogs)
    .where(sql`${sql.join(conditions, sql` AND `)}`)
    .orderBy(desc(auditLogs.id))
    .limit(limit + 1);

  let nextCursor: number | null = null;
  if (items.length > limit) {
    const last = items.pop()!;
    nextCursor = last.id;
  }

  return { items, nextCursor };
}

export async function exportAuditLogs(
  tenantId: number,
  filters: {
    actorId?: number;
    action?: string;
    resourceType?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<string> {
  const db = await getDb();
  if (!db) return "";

  const conditions = [eq(auditLogs.tenantId, tenantId)];

  if (filters.actorId) conditions.push(eq(auditLogs.userId, filters.actorId));
  if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters.resourceType)
    conditions.push(eq(auditLogs.entityType, filters.resourceType));
  if (filters.dateFrom)
    conditions.push(sql`${auditLogs.createdAt} >= ${filters.dateFrom}`);
  if (filters.dateTo)
    conditions.push(sql`${auditLogs.createdAt} <= ${filters.dateTo}`);

  const items = await db
    .select()
    .from(auditLogs)
    .where(sql`${sql.join(conditions, sql` AND `)}`)
    .orderBy(auditLogs.chainSequence);

  const headers = [
    "id",
    "chainSequence",
    "createdAt",
    "actorId",
    "actorRole",
    "action",
    "resourceType",
    "resourceId",
    "before",
    "after",
    "metadata",
    "previousHash",
    "currentHash",
  ];

  const rows = items.map(e => [
    e.id,
    e.chainSequence,
    e.createdAt.toISOString(),
    e.userId ?? "",
    "",
    e.action,
    e.entityType,
    e.entityId,
    JSON.stringify(e.oldValues ?? {}),
    JSON.stringify(e.newValues ?? {}),
    JSON.stringify({}),
    e.previousHash ?? "",
    e.currentHash,
  ]);

  const csv = [
    headers.join(","),
    ...rows.map(r =>
      r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
  return csv;
}
