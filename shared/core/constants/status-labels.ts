// ═══════════════════════════════════════════════════════════════
// مصطلحات تشغيلية عربية - Status Labels
// ═══════════════════════════════════════════════════════════════

import { DocumentStatus, MasterStatus, WorkflowStage } from '../enums/status';

export const DocumentStatusLabelAr: Record<DocumentStatus, string> = {
  draft: 'مسودة',
  submitted: 'مُرسلة للمراجعة',
  pending_approval: 'بإنتظار الاعتماد',
  approved: 'معتمدة',
  posted: 'مُرحلة',
  closed: 'مغلقة',
  voided: 'ملغاة',
  reversed: 'معكوسة',
  cancelled: 'ملغاة (إلغاء)',
  rejected: 'مرفوضة',
};

export const MasterStatusLabelAr: Record<MasterStatus, string> = {
  draft: 'مسودة',
  active: 'نشط',
  inactive: 'غير نشط',
  suspended: 'معلق',
  archived: 'مؤرشف',
};

export const WorkflowStageLabelAr: Record<WorkflowStage, string> = {
  entry: 'قيد الإدخال',
  review: 'قيد المراجعة',
  approval: 'قيد الاعتماد',
  posting: 'جاهز للترحيل',
  integration: 'قيد التكامل',
  closed: 'مغلق نهائياً',
};

export const DocumentStatusLabelEn: Record<DocumentStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  posted: 'Posted',
  closed: 'Closed',
  voided: 'Voided',
  reversed: 'Reversed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};
