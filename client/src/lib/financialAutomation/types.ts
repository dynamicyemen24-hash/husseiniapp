/**
 * Financial Automation Engine — Type Definitions
 * Phase 2: Recurring Transactions, Auto-Posting, Workflow, Reconciliation
 */

/** Recurrence frequency types */
export type RecurrenceFrequency =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom";

/** Recurrence end condition types */
export type RecurrenceEndType = "never" | "afterCount" | "date";

/** Recurring transaction pattern */
export interface RecurrencePattern {
  id: string;
  name: string;
  frequency: RecurrenceFrequency;
  /** Number of periods between each recurrence (e.g., every 2 months) */
  interval: number;
  /** End condition */
  end: RecurrenceEndType;
  /** Number of recurrences if end = "afterCount" */
  endAfter?: number;
  /** End date if end = "date" */
  endDate?: Date;
  /** Day of month for monthly recurrence (1-31, or special values) */
  dayOfMonth?: number;
  /** Day of week for weekly recurrence (0-6, 0=Sunday) */
  dayOfWeek?: number;
  /** Week of month for monthly (1=first, 2=second, 3=third, 4=fourth, 5=last) */
  weekOfMonth?: "first" | "second" | "third" | "fourth" | "last";
  /** Time of day for execution */
  timeOfDay?: Date;
  /** Multi-company support */
  companyIds?: string[];
  /** Description/notes */
  description?: string;
  /** Active status */
  active: boolean;
  /** Created date */
  createdAt: Date;
  /** Last executed date */
  lastExecutedAt?: Date;
}

/** Recurring invoice/template */
export interface RecurringTemplate {
  id: string;
  name: string;
  voucherType: "payment" | "receipt" | "journal" | "adjustment";
  description: string;
  /** Associated account templates */
  accountTemplates: AccountTemplate[];
  /** Recurrence pattern */
  pattern: RecurrencePattern;
  /** Auto-posting configuration */
  autoPost: boolean;
  /** Approval requirement */
  requiresApproval: boolean;
  /** Threshold for auto-approval */
  approvalThreshold?: number;
  /** Created by */
  createdBy: string;
  /** Created at */
  createdAt: Date;
  /** Last executed date */
  lastExecutedAt?: Date;
  /** Active status */
  active: boolean;
}

/** Account template for recurring vouchers */
export interface AccountTemplate {
  accountId: string;
  accountCode: string;
  accountName: string;
  debitAmount?: number;
  creditAmount?: number;
  allocationPercentage?: number;
  costCenterId?: string;
  departmentId?: string;
  projectId?: string;
}

/** Auto-posting rule */
export interface AutoPostingRule {
  id: string;
  name: string;
  description: string;
  /** Condition for triggering the rule */
  condition: AutoPostingCondition;
  /** Journal entry template */
  journalEntryTemplate: JournalEntryTemplate;
  /** Auto-approval configuration */
  autoApprove: boolean;
  /** Threshold amount for auto-approval */
  approvalThreshold?: number;
  /** Created by */
  createdBy: string;
  /** Created at */
  createdAt: Date;
  /** Last executed */
  lastExecutedAt?: Date;
  /** Active status */
  active: boolean;
}

/** Auto-posting condition */
export interface AutoPostingCondition {
  /** Trigger on voucher creation */
  triggerOnCreation: boolean;
  /** Minimum amount threshold */
  minAmount?: number;
  /** Maximum amount threshold */
  maxAmount?: number;
  /** Account filter */
  accountFilter?: string[];
  /** Department filter */
  departmentFilter?: string[];
  /** Project filter */
  projectFilter?: string[];
  /** VAT treatment */
  vatTreatment?: "taxable" | "exempt" | "zeroRated";
}

/** Journal entry template for auto-posting */
export interface JournalEntryTemplate {
  /** Debit account */
  debitAccountId: string;
  /** Credit account */
  creditAccountId: string;
  /** Debit amount (or function to calculate) */
  debitAmount: number | ((context: AutoPostingContext) => number);
  /** Credit amount (or function to calculate) */
  creditAmount: number | ((context: AutoPostingContext) => number);
  /** Narration/description */
  narration: string;
  /** Cost center allocation */
  costCenterId?: string;
  /** Department allocation */
  departmentId?: string;
  /** Project allocation */
  projectId?: string;
}

/** Auto-posting context */
export interface AutoPostingContext {
  /** Voucher ID being processed */
  voucherId: string;
  /** Company/Tenant ID */
  tenantId: number;
  /** Current date */
  currentDate: Date;
  /** Exchange rate if multi-currency */
  fxRate?: number;
  /** Related transaction IDs */
  relatedIds?: string[];
}

/** Workflow approval step */
export interface WorkflowApprovalStep {
  stepId: string;
  name: string;
  approverRole: string;
  /** Approval action: approve, reject, requestChanges */
  action: "approve" | "reject" | "requestChanges";
  /** Conditions for this step */
  conditions?: ApprovalCondition[];
  /** Timeout in minutes */
  timeoutMinutes?: number;
  /** Escalation approver if timeout */
  escalationTo?: string;
}

/** Approval condition */
export interface ApprovalCondition {
  /** Minimum amount for this step to apply */
  minAmount?: number;
  /** Required approver count */
  requiredCount?: number;
  /** Allow parallel approvals */
  allowParallel: boolean;
}

/** Financial workflow approval */
export interface FinancialWorkflowApproval {
  /** Unique workflow ID */
  workflowId: string;
  /** Associated voucher/template ID */
  sourceId: string;
  /** Workflow steps */
  steps: WorkflowApprovalStep[];
  /** Current step index */
  currentStep: number;
  /** Status: pending, approved, rejected */
  status: "pending" | "approved" | "rejected";
  /** Created at */
  createdAt: Date;
  /** Completed at */
  completedAt?: Date;
  /** Approved by */
  approvedBy?: string;
  /** Rejection reason */
  rejectionReason?: string;
}

/** Reconciliation match */
export interface ReconciliationMatch {
  /** Bank transaction ID */
  bankTransactionId: string;
  /** System transaction ID */
  systemTransactionId: string;
  /** Match status: matched, unmatched, partial */
  matchStatus: "matched" | "unmatched" | "partial";
  /** Amount difference */
  amountDifference: number;
  /** Payee match score (0-100) */
  payeeMatchScore: number;
  /** Confidence level */
  confidenceLevel: "high" | "medium" | "low";
  /** Created at */
  createdAt: Date;
  /** Matched by */
  matchedBy?: string;
}

/** Bank reconciliation item */
export interface BankReconciliationItem {
  /** Bank transaction */
  bankTransaction: {
    id: string;
    date: Date;
    description: string;
    amount: number;
    currency: string;
  };
  /** Matching system transactions */
  systemTransactions: SystemTransaction[];
  /** Match results */
  matchResults: ReconciliationMatch[];
  /** Notes/observations */
  notes?: string;
  /** Status: reviewed, action_required */
  status: "reviewed" | "action_required";
}

/** System transaction for reconciliation */
export interface SystemTransaction {
  /** Transaction ID */
  id: string;
  /** Date */
  date: Date;
  /** Description */
  description: string;
  /** Amount */
  amount: number;
  /** Currency */
  currency: string;
  /** Associated voucher ID */
  voucherId: string;
  /** Type: payment, receipt, journal */
  voucherType: "payment" | "receipt" | "journal";
}

/** Cash flow projection week */
export interface CashFlowWeek {
  week: number;
  dateRange: [Date, Date];
  operatingCash: number;
  investingCash: number;
  financingCash: number;
  netCashFlow: number;
  cumulativeCash: number;
}

/** Cash flow scenario */
export type CashFlowScenario = "conservative" | "base" | "optimistic";

/** Cash flow forecast result */
export interface CashFlowForecast {
  scenario: CashFlowScenario;
  weeks: CashFlowWeek[];
  openingBalance: number;
  closingBalance: number;
  totalOperating: number;
  totalInvesting: number;
  totalFinancing: number;
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
}

/** Ratio data interfaces (imported from financial analytics) */
export type {
  RatioData,
  RatioInputs,
  CalculatedRatio,
} from "@shared/financialAnalytics/types";
export type { VarianceResult } from "@shared/financialAnalytics/varianceCalculations";

/** Budget scenario types */
export type BudgetScenario =
  | "currentYearBudget"
  | "priorYearActual"
  | "forecast";

/** Variance filter options */
export interface VarianceFilter {
  budgetScenario: BudgetScenario;
  period: ComparisonPeriod;
  accountCategories?: string[];
  minVariancePercentage?: number;
}

/** Comparison period */
export interface ComparisonPeriod {
  id: PeriodId;
  label: string;
  startDate: Date;
  endDate: Date;
}

/** Period identifier */
export type PeriodId = "current" | "previous" | "budget" | "forecast";
