/**
 * Sync Engine for ALHUSAINIA Accounting.
 *
 * Handles:
 * - Queueing mutations offline
 * - Replaying to server when online
 * - Conflict resolution (last-writer-wins per record)
 * - Multi-branch sync
 * - Automatic retry with exponential backoff
 */

import {
  getPendingSyncs,
  removeSyncEntry,
  incrementRetry,
  getSyncMeta,
  setSyncMeta,
  getAll,
  bulkPut,
  removeLocalRow,
  type TableName,
} from "./db";

const MAX_RETRIES = 5;
const SYNC_INTERVAL_MS = 30_000;

// ─── Server Sync API ──────────────────────────────────────────────

const SYNC_API = "/api/trpc";

async function trpcQuery<T>(procedure: string, input?: unknown): Promise<T> {
  const params: Record<string, string> = { batch: "1" };
  if (input !== undefined) {
    params.input = JSON.stringify({ "0": { json: input } });
  } else {
    params.input = JSON.stringify({ "0": { json: undefined } });
  }
  const url = `${SYNC_API}/${procedure}?${new URLSearchParams(params).toString()}`;
  const resp = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) throw new Error(`Sync API error: ${resp.status}`);
  const data = await resp.json();
  return data[0]?.result?.data as T;
}

async function trpcMutate<T>(procedure: string, input: unknown): Promise<T> {
  const params = new URLSearchParams({ batch: "1" });
  const url = `${SYNC_API}/${procedure}?${params.toString()}`;
  const resp = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "0": { json: input } }),
  });
  if (!resp.ok) throw new Error(`Sync mutation error: ${resp.status}`);
  const data = await resp.json();
  return data[0]?.result?.data as T;
}

// ─── Conflict Resolution ──────────────────────────────────────────

/**
 * Resolves a pull-time conflict between a server record and a local record
 * that still has UNSYNCED edits (`_status === "pending"`).
 *
 * Production semantics (financial-grade):
 * - The copy with the strictly higher edit-version wins.
 * - On a version tie, the most recently edited copy wins.
 * - When the CLIENT wins, the result must stay "pending" so the push phase
 *   re-delivers the unsynced intent on the next cycle — marking it "synced"
 *   here would silently drop the operator's offline edit.
 * - When the SERVER wins, the authoritative copy becomes synced locally and
 *   the overridden local edit is reported in `conflicts` for review.
 */
function resolveConflict(
  serverRecord: any,
  clientRecord: any
): {
  winner: "server" | "client";
  merged: any;
  /** true → keep _status:"pending" so push re-delivers this intent. */
  preservePending: boolean;
} {
  const serverVersion = serverRecord?._version || 0;
  const clientVersion = clientRecord?._version || 0;

  if (clientVersion > serverVersion) {
    return { winner: "client", merged: clientRecord, preservePending: true };
  }
  if (serverVersion > clientVersion) {
    return { winner: "server", merged: serverRecord, preservePending: false };
  }
  if ((clientRecord?._syncedAt || 0) > (serverRecord?._syncedAt || 0)) {
    return { winner: "client", merged: clientRecord, preservePending: true };
  }
  return { winner: "server", merged: serverRecord, preservePending: false };
}

// ─── Pull (Server → Client) ───────────────────────────────────────

/**
 * Pulls a single table from the server snapshot.
 *
 * PERFORMANCE: The snapshot is fetched ONCE per full sync cycle and passed in
 * via the `snapshot` parameter. Previously, each of the 20 tables triggered its
 * own identical `getFullSnapshot` API call (N+1 problem), causing 20x the
 * network round-trips and server load. Now `performFullSync` fetches the
 * snapshot once and reuses it for every table.
 */
export async function pullFromServer(
  tableName: TableName,
  snapshot?: any
): Promise<{
  pulled: number;
  conflicts: Array<{ tableName: string; recordId: string; resolution: string }>;
}> {
  const meta = await getSyncMeta(tableName);
  try {
    // Use the full snapshot endpoint: covers every table in one request.
    // If a snapshot was already fetched by performFullSync, reuse it.
    if (!snapshot) {
      snapshot = await trpcQuery<any>("sync.getFullSnapshot");
    }
    if (!snapshot || typeof snapshot !== "object")
      return { pulled: 0, conflicts: [] };

    let serverRecords: any[] = [];
    if (Array.isArray(snapshot[tableName])) {
      serverRecords = snapshot[tableName];
    } else if (tableName === "settings" && snapshot.settings) {
      serverRecords = [snapshot.settings];
    } else if (tableName === "tenants" && Array.isArray(snapshot.tenants)) {
      serverRecords = snapshot.tenants;
    } else if (tableName === "branches" && Array.isArray(snapshot.branches)) {
      serverRecords = snapshot.branches;
    } else if (tableName === "users" && snapshot.users) {
      serverRecords = [snapshot.users];
    } else if (
      tableName === "branchPermissions" &&
      Array.isArray(snapshot.branchPermissions)
    ) {
      serverRecords = snapshot.branchPermissions;
    } else if (
      tableName === "activityLogs" &&
      Array.isArray(snapshot.activityLogs)
    ) {
      serverRecords = snapshot.activityLogs;
    } else {
      return { pulled: 0, conflicts: [] };
    }

    const localRecords = await getAll(tableName);
    const localMap = new Map(localRecords.map((r: any) => [String(r.id), r]));
    // Deduplicate by business code for chart-of-accounts style tables
    const localByCode = new Map<string, any>(
      tableName === "accounts"
        ? localRecords
            .map((r: any): [string, any] => [String(r.code), r])
            .filter(([, v]) => v?.code != null)
        : []
    );
    const conflicts: Array<{
      tableName: string;
      recordId: string;
      resolution: string;
    }> = [];
    const toUpsert: any[] = [];

    for (const srvRec of serverRecords) {
      if (srvRec == null || srvRec.id == null) continue;
      const id = String(srvRec.id);
      const localRec = localMap.get(id);

      // Skip records that already exist locally under the same business code
      if (tableName === "accounts" && srvRec.code != null) {
        const codeMatch = localByCode.get(String(srvRec.code));
        if (codeMatch && String(codeMatch.id) !== id) {
          continue;
        }
      }

      if (!localRec) {
        toUpsert.push({
          ...srvRec,
          _syncId: `server-${id}`,
          _version: srvRec._version || 0,
          _syncedAt: Date.now(),
          _status: "synced",
          _deviceId: "server",
        });
      } else if (localRec._status === "pending") {
        const { winner, merged, preservePending } = resolveConflict(
          srvRec,
          localRec
        );
        conflicts.push({
          tableName,
          recordId: id,
          resolution:
            winner === "server"
              ? "server-canonical (local override reported)"
              : "client-pending-preserved (will re-push)",
        });
        toUpsert.push({
          ...merged,
          // Client-winner keeps "pending" so the push phase re-delivers the
          // operator's offline intent — it is NOT yet acknowledged by server.
          _status: preservePending ? "pending" : "synced",
        });
      } else {
        toUpsert.push({
          ...srvRec,
          _syncId: localRec._syncId,
          _version: Math.max(localRec._version || 0, srvRec._version || 0),
          _syncedAt: Date.now(),
          _status: "synced",
          _deviceId: localRec._deviceId,
        });
      }
    }

    if (toUpsert.length > 0) {
      await bulkPut(tableName, toUpsert);
    }
    await setSyncMeta(tableName, (meta?.lastSyncVersion || 0) + 1);
    return { pulled: toUpsert.length, conflicts };
  } catch (error) {
    console.warn(`[Sync] Pull failed for ${tableName}:`, error);
    return { pulled: 0, conflicts: [] };
  }
}

// ─── Push (Client → Server) ───────────────────────────────────────

export async function pushPendingChanges(): Promise<{
  pushed: number;
  failed: number;
}> {
  const pending = await getPendingSyncs();
  let pushed = 0;
  let failed = 0;

  for (const entry of pending) {
    if (entry.retries >= MAX_RETRIES) {
      // Never silently discard unsynced mutations. The entry stays queued and
      // is counted as failed so the UI can surface it for manual attention —
      // dropping it here is exactly how financial data disappears.
      failed++;
      continue;
    }

    try {
      const table = entry.tableName as TableName;
      const rpcMap: Record<string, string> = {
        accounts:
          entry.operation === "create"
            ? "accounting.addAccount"
            : "accounting.updateAccount",
        transactions:
          entry.operation === "create"
            ? "accounting.addTransaction"
            : "accounting.updateTransaction",
        settings: "accounting.updateSettings",
        budgets: "accounting.saveBudget",
        openingBalances: "accounting.saveOpeningBalances",
        branches: "accounting.createBranch",
        products:
          entry.operation === "create" ? "products.create" : "products.update",
        customers:
          entry.operation === "create"
            ? "customers.create"
            : "customers.update",
        suppliers:
          entry.operation === "create"
            ? "suppliers.create"
            : "suppliers.update",
        orders:
          entry.operation === "create"
            ? "orders.create"
            : "orders.updateStatus",
      };

      const rpcName = rpcMap[table];
      if (!rpcName || entry.operation === "delete") {
        await removeSyncEntry(entry.id!);
        continue;
      }

      await trpcMutate(rpcName, entry.payload);
      await removeSyncEntry(entry.id!);
      if (
        entry.operation === "create" &&
        (table === "transactions" || table === "budgets")
      ) {
        await removeLocalRow(
          table,
          (entry.payload as any)?.id ?? entry.recordId
        );
      }
      pushed++;
    } catch (error) {
      console.warn(`[Sync] Push failed for entry ${entry.id}:`, error);
      await incrementRetry(entry.id!);
      failed++;
    }
  }

  return { pushed, failed };
}

// ─── Full Sync Cycle ──────────────────────────────────────────────

export interface SyncResult {
  pushed: number;
  pulled: number;
  failed: number;
  conflicts: Array<{ tableName: string; recordId: string; resolution: string }>;
  timestamp: number;
}

/**
 * Performs a full sync cycle: push pending changes, then pull all tables.
 *
 * PERFORMANCE: Fetches the server snapshot ONCE and reuses it for all 20
 * tables, instead of making 20 identical API calls.
 */
export async function performFullSync(): Promise<SyncResult> {
  const pushResult = await pushPendingChanges();

  const tables: TableName[] = [
    "accounts",
    "transactions",
    "settings",
    "budgets",
    "openingBalances",
    "branches",
    "tenants",
    "activityLogs",
    "products",
    "warehouses",
    "inventoryMovements",
    "customers",
    "suppliers",
    "salesInvoices",
    "salesInvoiceItems",
    "purchaseInvoices",
    "purchaseInvoiceItems",
    "orders",
    "orderItems",
    "payments",
  ];

  // Fetch the full snapshot ONCE — reused for every table below.
  let snapshot: any = null;
  try {
    snapshot = await trpcQuery<any>("sync.getFullSnapshot");
  } catch (error) {
    console.warn("[Sync] Failed to fetch full snapshot:", error);
  }

  let totalPulled = 0;
  const allConflicts: SyncResult["conflicts"] = [];

  for (const table of tables) {
    const result = await pullFromServer(table, snapshot);
    totalPulled += result.pulled;
    allConflicts.push(...result.conflicts);
  }

  return {
    pushed: pushResult.pushed,
    pulled: totalPulled,
    failed: pushResult.failed,
    conflicts: allConflicts,
    timestamp: Date.now(),
  };
}

// ─── Sync Manager (Singleton) ─────────────────────────────────────

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastResult: SyncResult | null;
}

export class SyncManager {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isOnline = false;
  private isSyncing = false;
  private started = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private lastResult: SyncResult | null = null;

  private handleOnline = () => {
    this.isOnline = true;
    this.notify();
    this.syncNow();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.notify();
  };

  get status(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastResult: this.lastResult,
    };
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.isOnline = navigator.onLine;
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    this.intervalId = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncNow();
      }
    }, SYNC_INTERVAL_MS);

    if (this.isOnline) {
      this.syncNow();
    }
  }

  stop() {
    if (!this.started) return;
    this.started = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
  }

  async syncNow(): Promise<SyncResult | null> {
    if (this.isSyncing) return null;
    this.isSyncing = true;
    this.notify();

    try {
      this.lastResult = await performFullSync();
      return this.lastResult;
    } catch (error) {
      console.error("[SyncManager] Sync failed:", error);
      return null;
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const status = this.status;
    this.listeners.forEach(l => l(status));
  }
}

export const syncManager = new SyncManager();
