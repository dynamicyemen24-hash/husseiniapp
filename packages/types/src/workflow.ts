import { z } from "zod";
import {
  UUIDSchema,
  ISODateStringSchema,
  TenantIdSchema,
  UserIdSchema,
  PaginationInputSchema,
  PaginatedResponseSchema,
} from "./common";

export const WorkflowStatusSchema = z.enum([
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "in_progress",
  "completed",
  "cancelled",
  "on_hold",
]);
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

export const WorkflowStepStatusSchema = z.enum([
  "pending",
  "active",
  "completed",
  "skipped",
  "failed",
  "reassigned",
]);
export type WorkflowStepStatus = z.infer<typeof WorkflowStepStatusSchema>;

export const WorkflowTransitionTypeSchema = z.enum([
  "submit",
  "approve",
  "reject",
  "reassign",
  "escalate",
  "delegate",
  "complete",
  "cancel",
  "resume",
  "hold",
]);
export type WorkflowTransitionType = z.infer<
  typeof WorkflowTransitionTypeSchema
>;

export const WorkflowDefinitionSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    code: z.string().max(50),
    name: z.string().max(200),
    nameAr: z.string().max(200).optional(),
    description: z.string().optional(),
    entityType: z.string().max(100),
    version: z.number().int().positive().default(1),
    isActive: z.boolean().default(true),
    steps: z
      .array(
        z.object({
          id: UUIDSchema,
          code: z.string().max(50),
          name: z.string().max(200),
          nameAr: z.string().max(200).optional(),
          type: z.enum([
            "approval",
            "task",
            "notification",
            "automation",
            "integration",
            "parallel",
            "gateway",
          ]),
          assigneeType: z
            .enum([
              "user",
              "role",
              "department",
              "manager",
              "creator",
              "dynamic",
            ])
            .optional(),
          assigneeId: UUIDSchema.optional(),
          roleCode: z.string().max(50).optional(),
          departmentId: UUIDSchema.optional(),
          dynamicAssigneeExpression: z.string().optional(),
          dueDateExpression: z.string().optional(),
          slaHours: z.number().int().positive().optional(),
          conditions: z
            .array(
              z.object({
                field: z.string(),
                operator: z.enum([
                  "eq",
                  "ne",
                  "gt",
                  "gte",
                  "lt",
                  "lte",
                  "in",
                  "not_in",
                  "contains",
                  "starts_with",
                  "ends_with",
                ]),
                value: z.unknown(),
              })
            )
            .default([]),
          actions: z
            .array(
              z.object({
                type: z.enum([
                  "set_field",
                  "send_notification",
                  "call_webhook",
                  "create_record",
                  "update_record",
                  "execute_script",
                ]),
                config: z.record(z.unknown()),
              })
            )
            .default([]),
          transitions: z
            .array(
              z.object({
                toStepId: UUIDSchema,
                type: WorkflowTransitionTypeSchema,
                condition: z.string().optional(),
                requiredRoles: z.array(z.string()).default([]),
              })
            )
            .default([]),
          order: z.number().int().positive(),
        })
      )
      .min(1),
    settings: z
      .object({
        allowParallelExecution: z.boolean().default(false),
        allowReassignment: z.boolean().default(true),
        allowDelegation: z.boolean().default(true),
        escalationEnabled: z.boolean().default(false),
        escalationHours: z.number().int().positive().optional(),
        escalationToRole: z.string().max(50).optional(),
        autoCompleteOnFinalApproval: z.boolean().default(true),
        requireAllApprovals: z.boolean().default(true),
        allowCommentOnReject: z.boolean().default(true),
        requireCommentOnReject: z.boolean().default(false),
      })
      .default({}),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(
    z.object({
      createdAt: ISODateStringSchema,
      createdBy: UserIdSchema,
      updatedAt: ISODateStringSchema,
      updatedBy: UserIdSchema.optional(),
    })
  );
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

export const WorkflowInstanceSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    definitionId: UUIDSchema,
    definitionVersion: z.number().int().positive(),
    entityType: z.string().max(100),
    entityId: UUIDSchema,
    status: WorkflowStatusSchema.default("draft"),
    currentStepId: UUIDSchema.optional(),
    currentAssigneeId: UUIDSchema.optional(),
    currentAssigneeRole: z.string().max(50).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    dueDate: ISODateStringSchema.optional(),
    startedAt: ISODateStringSchema.optional(),
    completedAt: ISODateStringSchema.optional(),
    cancelledAt: ISODateStringSchema.optional(),
    cancelledBy: UserIdSchema.optional(),
    cancellationReason: z.string().optional(),
    context: z.record(z.unknown()).default({}),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(
    z.object({
      createdAt: ISODateStringSchema,
      createdBy: UserIdSchema,
      updatedAt: ISODateStringSchema,
      updatedBy: UserIdSchema.optional(),
    })
  );
export type WorkflowInstance = z.infer<typeof WorkflowInstanceSchema>;

export const WorkflowTaskSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    instanceId: UUIDSchema,
    stepId: UUIDSchema,
    stepCode: z.string().max(50),
    stepName: z.string().max(200),
    stepType: z.enum([
      "approval",
      "task",
      "notification",
      "automation",
      "integration",
      "parallel",
      "gateway",
    ]),
    status: WorkflowStepStatusSchema.default("pending"),
    assigneeId: UUIDSchema.optional(),
    assigneeRole: z.string().max(50).optional(),
    assignedAt: ISODateStringSchema.optional(),
    dueDate: ISODateStringSchema.optional(),
    startedAt: ISODateStringSchema.optional(),
    completedAt: ISODateStringSchema.optional(),
    completedBy: UserIdSchema.optional(),
    outcome: z
      .enum([
        "approved",
        "rejected",
        "completed",
        "skipped",
        "escalated",
        "delegated",
      ])
      .optional(),
    comment: z.string().optional(),
    formData: z.record(z.unknown()).default({}),
    previousTaskId: UUIDSchema.optional(),
    delegatedFromId: UUIDSchema.optional(),
    delegatedToId: UUIDSchema.optional(),
    escalatedFromId: UUIDSchema.optional(),
    escalatedToId: UUIDSchema.optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(
    z.object({
      createdAt: ISODateStringSchema,
      createdBy: UserIdSchema,
      updatedAt: ISODateStringSchema,
      updatedBy: UserIdSchema.optional(),
    })
  );
export type WorkflowTask = z.infer<typeof WorkflowTaskSchema>;

export const WorkflowHistorySchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    instanceId: UUIDSchema,
    taskId: UUIDSchema.optional(),
    fromStepId: UUIDSchema.optional(),
    toStepId: UUIDSchema.optional(),
    transitionType: WorkflowTransitionTypeSchema,
    actorId: UserIdSchema,
    actorRole: z.string().max(50).optional(),
    comment: z.string().optional(),
    formData: z.record(z.unknown()).default({}),
    contextSnapshot: z.record(z.unknown()).default({}),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(
    z.object({
      createdAt: ISODateStringSchema,
    })
  );
export type WorkflowHistory = z.infer<typeof WorkflowHistorySchema>;

export const WorkflowDefinitionCreateSchema = WorkflowDefinitionSchema.omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
});
export type WorkflowDefinitionCreate = z.infer<
  typeof WorkflowDefinitionCreateSchema
>;

export const WorkflowInstanceStartSchema = z.object({
  definitionId: UUIDSchema,
  entityType: z.string().max(100),
  entityId: UUIDSchema,
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  context: z.record(z.unknown()).default({}),
  assigneeId: UUIDSchema.optional(),
});
export type WorkflowInstanceStart = z.infer<typeof WorkflowInstanceStartSchema>;

export const WorkflowTaskActionSchema = z.object({
  taskId: UUIDSchema,
  action: WorkflowTransitionTypeSchema,
  comment: z.string().optional(),
  formData: z.record(z.unknown()).default({}),
  assigneeId: UUIDSchema.optional(),
});
export type WorkflowTaskAction = z.infer<typeof WorkflowTaskActionSchema>;

export const WorkflowDefinitionFilterSchema = z.object({
  entityType: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
});
export type WorkflowDefinitionFilter = z.infer<
  typeof WorkflowDefinitionFilterSchema
>;

export const WorkflowInstanceFilterSchema = z.object({
  definitionId: UUIDSchema.optional(),
  entityType: z.string().optional(),
  entityId: UUIDSchema.optional(),
  status: WorkflowStatusSchema.optional(),
  assigneeId: UUIDSchema.optional(),
  dateFrom: ISODateStringSchema.optional(),
  dateTo: ISODateStringSchema.optional(),
});
export type WorkflowInstanceFilter = z.infer<
  typeof WorkflowInstanceFilterSchema
>;

export const PaginatedWorkflowDefinitionsSchema = PaginatedResponseSchema(
  WorkflowDefinitionSchema
);
export type PaginatedWorkflowDefinitions = z.infer<
  typeof PaginatedWorkflowDefinitionsSchema
>;

export const PaginatedWorkflowInstancesSchema = PaginatedResponseSchema(
  WorkflowInstanceSchema
);
export type PaginatedWorkflowInstances = z.infer<
  typeof PaginatedWorkflowInstancesSchema
>;

export const PaginatedWorkflowTasksSchema =
  PaginatedResponseSchema(WorkflowTaskSchema);
export type PaginatedWorkflowTasks = z.infer<
  typeof PaginatedWorkflowTasksSchema
>;

export const PaginatedWorkflowHistorySchema = PaginatedResponseSchema(
  WorkflowHistorySchema
);
export type PaginatedWorkflowHistory = z.infer<
  typeof PaginatedWorkflowHistorySchema
>;
