// ═══════════════════════════════════════════════════════════════
// Unified Status & Workflow Enums (Expert-level)
// مطابق لأفضل الممارسات SAP B1 / Microsoft Dynamics / Oracle
// ═══════════════════════════════════════════════════════════════

export const MasterStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived',
} as const;

export type MasterStatus = typeof MasterStatus[keyof typeof MasterStatus];

export const DocumentStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  POSTED: 'posted',
  CLOSED: 'closed',
  VOIDED: 'voided',
  REVERSED: 'reversed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
} as const;

export type DocumentStatus = typeof DocumentStatus[keyof typeof DocumentStatus];

export const OperationStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REVERSED: 'reversed',
} as const;

export type OperationStatus = typeof OperationStatus[keyof typeof OperationStatus];

export const SyncStatus = {
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed',
  CONFLICT: 'conflict',
} as const;

export type SyncStatus = typeof SyncStatus[keyof typeof SyncStatus];

export const WorkflowStage = {
  ENTRY: 'entry',
  REVIEW: 'review',
  APPROVAL: 'approval',
  POSTING: 'posting',
  INTEGRATION: 'integration',
  CLOSED: 'closed',
} as const;

export type WorkflowStage = typeof WorkflowStage[keyof typeof WorkflowStage];

export const StatusAction = {
  CREATE: 'CREATE',
  SUBMIT: 'SUBMIT',
  RETURN: 'RETURN',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  POST: 'POST',
  VOID: 'VOID',
  REVERSE: 'REVERSE',
  CANCEL: 'CANCEL',
  ARCHIVE: 'ARCHIVE',
  ACTIVATE: 'ACTIVATE',
  DEACTIVATE: 'DEACTIVATE',
  SUSPEND: 'SUSPEND',
} as const;

export type StatusAction = typeof StatusAction[keyof typeof StatusAction];

export const EntityType = {
  MASTER: 'master',
  DOCUMENT: 'document',
  OPERATION: 'operation',
  JOURNAL: 'journal',
  STOCK_MOVEMENT: 'stock_movement',
  PAYMENT: 'payment',
} as const;

export type EntityType = typeof EntityType[keyof typeof EntityType];

// ثوابت سريعة للفحص
export const POSTED_STATUSES: DocumentStatus[] = [
  DocumentStatus.POSTED,
  DocumentStatus.CLOSED,
  DocumentStatus.REVERSED,
  DocumentStatus.VOIDED,
];

export const IMMUTABLE_STATUSES: DocumentStatus[] = [
  DocumentStatus.POSTED,
  DocumentStatus.CLOSED,
  DocumentStatus.REVERSED,
  DocumentStatus.VOIDED,
  DocumentStatus.CANCELLED,
];
