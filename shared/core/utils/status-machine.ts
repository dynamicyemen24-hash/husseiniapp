import { 
  DocumentStatus, 
  MasterStatus, 
  WorkflowStage, 
  POSTED_STATUSES, 
  IMMUTABLE_STATUSES,
  StatusAction 
} from '../enums/status';
import { BaseWorkflow } from '../types/base-entity';

// ═══════════════════════════════════════════════════════════════
// State Machine خبير - انتقالات صارمة + فحوص ما قبل الترحيل
// ═══════════════════════════════════════════════════════════════

export interface TransitionContext {
  hasLines?: boolean;
  isBalanced?: boolean;        // للقيود المحاسبية
  hasStockAvailable?: boolean;
  periodLocked?: boolean;
  hasPermission?: boolean;
  reasonRequired?: boolean;
}

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
  nextStatus?: string;
  nextStage?: WorkflowStage | null;
  requiresReason?: boolean;
}

// انتقالات المستندات التشغيلية
const DOCUMENT_TRANSITIONS: Record<DocumentStatus, Array<{ to: DocumentStatus; toStage: WorkflowStage | null; action: string; requiresReason?: boolean; validate?: (ctx: TransitionContext) => TransitionResult }>> = {
  draft: [
    { 
      to: DocumentStatus.SUBMITTED, 
      toStage: WorkflowStage.REVIEW, 
      action: StatusAction.SUBMIT,
      validate: (ctx) => {
        if (!ctx.hasLines) return { allowed: false, reason: 'يجب إضافة بنود على الأقل' };
        return { allowed: true };
      }
    },
    { to: DocumentStatus.CANCELLED, toStage: WorkflowStage.CLOSED, action: StatusAction.CANCEL, requiresReason: true },
  ],
  submitted: [
    { to: DocumentStatus.PENDING_APPROVAL, toStage: WorkflowStage.APPROVAL, action: StatusAction.SUBMIT },
    { to: DocumentStatus.DRAFT, toStage: WorkflowStage.ENTRY, action: StatusAction.RETURN, requiresReason: true },
    { to: DocumentStatus.REJECTED, toStage: WorkflowStage.CLOSED, action: StatusAction.REJECT, requiresReason: true },
  ],
  pending_approval: [
    { to: DocumentStatus.APPROVED, toStage: WorkflowStage.POSTING, action: StatusAction.APPROVE },
    { to: DocumentStatus.DRAFT, toStage: WorkflowStage.ENTRY, action: StatusAction.RETURN, requiresReason: true },
    { to: DocumentStatus.REJECTED, toStage: WorkflowStage.CLOSED, action: StatusAction.REJECT, requiresReason: true },
  ],
  approved: [
    { 
      to: DocumentStatus.POSTED, 
      toStage: WorkflowStage.INTEGRATION, 
      action: StatusAction.POST,
      validate: (ctx) => {
        if (ctx.periodLocked) return { allowed: false, reason: 'الفترة المالية مغلقة' };
        if (ctx.isBalanced === false) return { allowed: false, reason: 'القيد غير متوازن - مجموع المدين يجب أن يساوي مجموع الدائن' };
        if (ctx.hasStockAvailable === false) return { allowed: false, reason: 'الكمية غير متوفرة في المخزن' };
        if (!ctx.hasPermission) return { allowed: false, reason: 'لا توجد صلاحية للترحيل' };
        return { allowed: true };
      }
    },
    { to: DocumentStatus.VOIDED, toStage: WorkflowStage.CLOSED, action: StatusAction.VOID, requiresReason: true },
    { to: DocumentStatus.CANCELLED, toStage: WorkflowStage.CLOSED, action: StatusAction.CANCEL, requiresReason: true },
  ],
  posted: [
    { to: DocumentStatus.CLOSED, toStage: WorkflowStage.CLOSED, action: StatusAction.POST }, // بعد نجاح التكامل
    { to: DocumentStatus.VOIDED, toStage: WorkflowStage.CLOSED, action: StatusAction.VOID, requiresReason: true },
    { to: DocumentStatus.REVERSED, toStage: WorkflowStage.CLOSED, action: StatusAction.REVERSE, requiresReason: true },
  ],
  rejected: [],
  voided: [],
  reversed: [],
  cancelled: [],
  closed: [],
};

const MASTER_TRANSITIONS: Record<MasterStatus, Array<{ to: MasterStatus; action: string; requiresReason?: boolean; validate?: (ctx: TransitionContext) => TransitionResult }>> = {
  draft: [
    { to: MasterStatus.ACTIVE, action: StatusAction.ACTIVATE },
    { to: MasterStatus.ARCHIVED, action: StatusAction.ARCHIVE },
  ],
  active: [
    { to: MasterStatus.INACTIVE, action: StatusAction.DEACTIVATE },
    { to: MasterStatus.SUSPENDED, action: StatusAction.SUSPEND, requiresReason: true },
    { to: MasterStatus.ARCHIVED, action: StatusAction.ARCHIVE },
  ],
  inactive: [
    { to: MasterStatus.ACTIVE, action: StatusAction.ACTIVATE },
    { to: MasterStatus.SUSPENDED, action: StatusAction.SUSPEND, requiresReason: true },
    { to: MasterStatus.ARCHIVED, action: StatusAction.ARCHIVE },
  ],
  suspended: [
    { to: MasterStatus.ACTIVE, action: StatusAction.ACTIVATE },
    { to: MasterStatus.ARCHIVED, action: StatusAction.ARCHIVE },
  ],
  archived: [],
};

export function canTransitionDocument(
  currentStatus: DocumentStatus,
  toStatus: DocumentStatus,
  ctx: TransitionContext = {}
): TransitionResult {
  const transitions = DOCUMENT_TRANSITIONS[currentStatus] || [];
  const trans = transitions.find(t => t.to === toStatus);
  
  if (!trans) {
    return { allowed: false, reason: 'انتقال غير مسموح به منطقياً' };
  }
  
  if (trans.requiresReason && !ctx.reasonRequired) {
    // السماح بالتحقق لاحقاً
  }
  
  if (trans.validate) {
    const result = trans.validate(ctx);
    if (!result.allowed) return result;
  }
  
  return {
    allowed: true,
    nextStatus: trans.to,
    nextStage: trans.toStage,
  };
}

export function canTransitionMaster(
  currentStatus: MasterStatus,
  toStatus: MasterStatus,
  ctx: TransitionContext = {}
): TransitionResult {
  const transitions = MASTER_TRANSITIONS[currentStatus] || [];
  const trans = transitions.find(t => t.to === toStatus);
  
  if (!trans) {
    return { allowed: false, reason: 'انتقال غير مسموح به' };
  }
  
  if (trans.validate) {
    const result = trans.validate(ctx);
    if (!result.allowed) return result;
  }
  
  return { allowed: true, nextStatus: trans.to };
}

export function computeAllowEdit(workflow: BaseWorkflow): boolean {
  const status = workflow.status as DocumentStatus;
  
  if (workflow.isImmutable) return false;
  if (IMMUTABLE_STATUSES.includes(status as any)) return false;
  if (status === DocumentStatus.POSTED) return false;
  
  // مسموح بالتعديل فقط في draft/submitted/pending_approval/rejected
  const editableStatuses: string[] = [
    DocumentStatus.DRAFT,
    DocumentStatus.SUBMITTED,
    DocumentStatus.PENDING_APPROVAL,
    DocumentStatus.REJECTED,
  ];
  
  return editableStatuses.includes(status as string);
}

export function computeAllowPost(workflow: BaseWorkflow): boolean {
  const status = workflow.status as DocumentStatus;
  if (workflow.isImmutable) return false;
  if (status !== DocumentStatus.APPROVED) return false;
  if (workflow.isPosted) return false;
  return true;
}

export function isPostedStatus(status: string): boolean {
  return POSTED_STATUSES.includes(status as DocumentStatus);
}

export function isImmutableStatus(status: string): boolean {
  return IMMUTABLE_STATUSES.includes(status as DocumentStatus);
}

