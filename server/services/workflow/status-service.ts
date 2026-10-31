// ═══════════════════════════════════════════════════════════════
// Server Status Service - يستخدم Drizzle + statusHistory
// ═══════════════════════════════════════════════════════════════

import { statusHistory } from '../../../drizzle/schema';
import { StatusService, StatusTransitionRequest } from '../../../shared/workflow/status-service';

// Note: db import will be wired based on actual server db location
export class ServerStatusService extends StatusService {
  static async recordHistory(req: StatusTransitionRequest) {
    try {
      const entry = this.buildHistoryEntry(req);
      // TODO: wire actual db
      console.log('[StatusService] history:', entry.id);
      return entry;
    } catch (error) {
      console.error('[StatusService] Failed to record history:', error);
      throw error;
    }
  }

  static async transitionDocument(table: any, entityId: number | string, req: StatusTransitionRequest) {
    await this.recordHistory(req);
    return { success: true };
  }
}
