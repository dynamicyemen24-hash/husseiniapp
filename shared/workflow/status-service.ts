// ═══════════════════════════════════════════════════════════════
// Status Service - مشترك بين Client/Server
// تسجيل تلقائي لكل انتقال حالة + مرحلة في statusHistory
// ═══════════════════════════════════════════════════════════════

import { canTransitionDocument, canTransitionMaster, computeAllowEdit, computeAllowPost, TransitionContext } from '../core/utils/status-machine';
import { DocumentStatus, MasterStatus, StatusAction, WorkflowStage } from '../core/enums/status';
import { StatusHistoryEntry } from '../core/types/base-entity';

export interface StatusTransitionRequest {
  entityType: 'master' | 'document' | 'operation' | 'journal' | 'stock_movement' | 'payment';
  entityId: string;
  entityNo?: string | null;
  organizationId: string;
  branchId?: string | null;
  fromStatus: string;
  fromStage?: WorkflowStage | null;
  toStatus: string;
  toStage?: WorkflowStage | null;
  action: StatusAction | string;
  reason?: string | null;
  notes?: string | null;
  changedById?: string | null;
  changedByName?: string | null;
  clientId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
  context?: TransitionContext;
}

export class StatusService {
  static validateDocumentTransition(
    fromStatus: DocumentStatus,
    toStatus: DocumentStatus,
    context: TransitionContext = {}
  ) {
    return canTransitionDocument(fromStatus, toStatus, context);
  }

  static validateMasterTransition(
    fromStatus: MasterStatus,
    toStatus: MasterStatus,
    context: TransitionContext = {}
  ) {
    return canTransitionMaster(fromStatus, toStatus, context);
  }

  static computeFlags(entity: any) {
    return {
      allowEdit: computeAllowEdit(entity),
      allowPost: computeAllowPost(entity),
    };
  }

  static buildHistoryEntry(req: StatusTransitionRequest): StatusHistoryEntry {
    const now = new Date();
    let id: string;
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && typeof (globalThis as any).crypto.randomUUID === 'function') {
        id = (globalThis as any).crypto.randomUUID();
      } else {
        id = Date.now().toString() + '-' + Math.random().toString(36).slice(2);
      }
    } catch (e) {
      id = Date.now().toString() + '-' + Math.random().toString(36).slice(2);
    }
    return {
      id,
      organizationId: req.organizationId,
      branchId: req.branchId || null,
      entityType: req.entityType,
      entityId: req.entityId,
      entityNo: req.entityNo || null,
      fromStatus: req.fromStatus || null,
      toStatus: req.toStatus,
      fromStage: req.fromStage || null,
      toStage: req.toStage || null,
      action: req.action,
      reason: req.reason || null,
      notes: req.notes || null,
      changedById: req.changedById || null,
      changedByName: req.changedByName || null,
      changedAt: now,
      ipAddress: req.ipAddress || null,
      userAgent: req.userAgent || null,
      clientId: req.clientId,
      metadata: req.metadata || null,
    };
  }

  static applyTransition<T>(entity: T, req: StatusTransitionRequest): T {
    const now = new Date();
    const result: any = Object.assign({}, entity);
    
    // التحقق قبل التطبيق
    if (req.entityType === 'document' || req.entityType === 'journal') {
      const validation = this.validateDocumentTransition(
        req.fromStatus as DocumentStatus,
        req.toStatus as DocumentStatus,
        req.context || {}
      );
      if (!validation.allowed) {
        throw new Error(validation.reason || 'انتقال غير مسموح به');
      }
    } else if (req.entityType === 'master') {
      const validation = this.validateMasterTransition(
        req.fromStatus as MasterStatus,
        req.toStatus as MasterStatus,
        req.context || {}
      );
      if (!validation.allowed) {
        throw new Error(validation.reason || 'انتقال غير مسموح به');
      }
    }
    
    // تطبيق التغيير
    result.status = req.toStatus;
    result.stage = req.toStage || null;
    result.statusReason = req.reason || null;
    result.statusChangedAt = now;
    result.statusChangedById = req.changedById || null;
    result.updatedAt = now;
    result.updatedById = req.changedById || null;
    result.version = (result.version || 1) + 1;
    
    // تحديث تواريخ حسب الإجراء
    if (req.action === StatusAction.SUBMIT) {
      result.submittedAt = now;
      result.submittedById = req.changedById || null;
    } else if (req.action === StatusAction.APPROVE) {
      result.approvedAt = now;
      result.approvedById = req.changedById || null;
    } else if (req.action === StatusAction.POST) {
      result.postedAt = now;
      result.postedById = req.changedById || null;
      result.isPosted = true;
      result.isImmutable = true;
      result.allowEdit = false;
      result.allowPost = false;
    } else if (req.action === StatusAction.VOID) {
      result.voidedAt = now;
      result.voidedById = req.changedById || null;
      result.isImmutable = true;
      result.allowEdit = false;
    } else if (req.action === StatusAction.REVERSE) {
      result.reversedAt = now;
      result.reversedById = req.changedById || null;
      result.isImmutable = true;
      result.allowEdit = false;
    }
    
    // إعادة حساب flags
    const flags = this.computeFlags(result);
    result.allowEdit = flags.allowEdit;
    result.allowPost = flags.allowPost;
    
    return result;
  }
}



