import { DocumentStatus, MasterStatus, OperationStatus, WorkflowStage, SyncStatus } from '../enums/status';

// ═══════════════════════════════════════════════════════════════
// Base Entity Fields - إلزامية لكل سجل وكل عملية
// ═══════════════════════════════════════════════════════════════

export interface BaseSyncAudit {
  // Tenant & Scope
  organizationId: string;      // إجباري
  branchId: string | null;
  warehouseId: string | null;

  // Audit
  createdAt: Date | string;
  createdById: string | null;
  updatedAt: Date | string;
  updatedById: string | null;
  deletedAt: Date | string | null; // Soft Delete

  // Sync
  version: number;             // Optimistic Locking
  clientId: string;
  rev: string;                 // للتمييز بين النسخ
  syncStatus: SyncStatus;
  lastSyncedAt: Date | string | null;
  syncError: string | null;
}

export interface BaseWorkflow {
  // Status & Workflow
  status: DocumentStatus | MasterStatus | OperationStatus | string;
  stage: WorkflowStage | null;
  statusReason: string | null;
  statusChangedAt: Date | string | null;
  statusChangedById: string | null;

  // Posting / Approval
  submittedAt: Date | string | null;
  submittedById: string | null;
  approvedAt: Date | string | null;
  approvedById: string | null;
  postedAt: Date | string | null;
  postedById: string | null;
  voidedAt: Date | string | null;
  voidedById: string | null;
  reversedAt: Date | string | null;
  reversedById: string | null;
  reversalDocumentId: string | null;

  // Integrity
  isPosted: boolean;
  isImmutable: boolean;
  allowEdit: boolean;
  allowPost: boolean;
}

export interface BaseEntity extends BaseSyncAudit, BaseWorkflow {
  id: string;
}

export interface BaseMaster extends BaseEntity {
  code: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface BaseDocument extends BaseEntity {
  docNo: string;              // رقم المستند
  docDate: Date | string;     // تاريخ المستند
  currencyCode?: string | null;
  exchangeRate?: number | null;
}

export interface BaseOperation extends BaseEntity {
  operationNo: string;
  operationDate: Date | string;
}

export interface StatusHistoryEntry {
  id: string;
  organizationId: string;
  branchId: string | null;
  entityType: 'master' | 'document' | 'operation' | 'journal' | 'stock_movement' | 'payment';
  entityId: string;
  entityNo: string | null;
  fromStatus: string | null;
  toStatus: string;
  fromStage: string | null;
  toStage: string | null;
  action: string;
  reason: string | null;
  notes: string | null;
  changedById: string | null;
  changedByName: string | null;
  changedAt: Date | string;
  ipAddress: string | null;
  userAgent: string | null;
  clientId: string;
  metadata: Record<string, any> | null;
}
