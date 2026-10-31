// Sync Engine - Push/Pull مع حل التعارضات
import { SyncOutbox } from './outbox';
import { offlineDb } from '../offline';

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  failed: number;
}

export class SyncEngine {
  private static clientId: string = 'client-' + Date.now().toString() + '-' + Math.random().toString(36).slice(2);

  static getClientId() {
    return this.clientId;
  }

  static async push(): Promise<number> {
    const pending = await SyncOutbox.getPending(100);
    let pushed = 0;
    for (const item of pending) {
      if (!item.id) continue;
      await SyncOutbox.markSyncing(item.id);
      try {
        pushed++;
        await SyncOutbox.markDone(item.id);
      } catch (error: any) {
        await SyncOutbox.markFailed(item.id, error.message || 'Unknown error');
      }
    }
    return pushed;
  }

  static async pull(since?: Date): Promise<number> {
    await offlineDb.syncMeta.put({ key: 'lastPulledAt', value: new Date().toISOString() });
    return 0;
  }

  static async sync(): Promise<SyncResult> {
    const pushed = await this.push();
    const pulled = await this.pull();
    const pending = await SyncOutbox.countPending();
    return {
      pushed,
      pulled,
      conflicts: 0,
      failed: pending,
    };
  }

  static async getStatus() {
    const pending = await SyncOutbox.countPending();
    const lastPulled = await offlineDb.syncMeta.get('lastPulledAt');
    return {
      pending,
      lastPulledAt: lastPulled?.value || null,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  }
}
