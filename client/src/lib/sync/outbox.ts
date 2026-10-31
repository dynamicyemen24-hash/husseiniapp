// ═══════════════════════════════════════════════════════════════
// Sync Outbox Pattern - Offline -> Cloud
// كل عملية محلية تسجل في Outbox قبل/مع الحفظ
// ═══════════════════════════════════════════════════════════════

import { offlineDb } from '../offline';

export interface OutboxItem {
  id?: number;
  entity: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
  organizationId: string;
  branchId?: string | null;
  clientId: string;
  version: number;
  rev: string;
  attempts: number;
  lastError?: string | null;
  createdAt: Date;
  syncStatus: 'pending' | 'syncing' | 'failed';
}

export class SyncOutbox {
  static async add(item: Omit<OutboxItem, 'id' | 'attempts' | 'createdAt' | 'syncStatus'>) {
    const entry: OutboxItem = {
      ...item,
      attempts: 0,
      createdAt: new Date(),
      syncStatus: 'pending',
    };
    const id = await offlineDb.syncOutbox.add(entry);
    return id;
  }

  static async getPending(limit = 50): Promise<OutboxItem[]> {
    return await offlineDb.syncOutbox
      .where('syncStatus')
      .equals('pending')
      .sortBy('createdAt')
      .then((items: any[]) => items.slice(0, limit));
  }

  static async markSyncing(id: number) {
    await offlineDb.syncOutbox.update(id, { syncStatus: 'syncing' });
  }

  static async markFailed(id: number, error: string) {
    await offlineDb.syncOutbox.update(id, {
      syncStatus: 'failed',
      lastError: error,
      attempts: (await offlineDb.syncOutbox.get(id))?.attempts + 1 || 1
    });
  }

  static async markDone(id: number) {
    await offlineDb.syncOutbox.delete(id);
  }

  static async countPending(): Promise<number> {
    return await offlineDb.syncOutbox.where('syncStatus').equals('pending').count();
  }
}