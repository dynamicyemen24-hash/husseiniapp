import { createMachine, assign, sendTo, setup } from "xstate";
import { z } from "zod";
import type {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowTask,
  WorkflowStatus,
  WorkflowStepStatus,
  WorkflowTransitionType,
} from "@alhusseiniya/types/workflow";
import { invoiceApprovalDefinition } from "./machines/invoice-approval";
import { voucherApprovalDefinition } from "./machines/voucher-approval";
import { requisitionApprovalDefinition } from "./machines/requisition-approval";
import { procurementApprovalDefinition } from "./machines/procurement-approval";

export const WorkflowContextSchema = z.object({
  instanceId: z.string().uuid(),
  definitionId: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  currentStepId: z.string().uuid().optional(),
  currentAssigneeId: z.string().uuid().optional(),
  currentAssigneeRole: z.string().optional(),
  status: z.enum([
    "draft",
    "pending_approval",
    "approved",
    "rejected",
    "in_progress",
    "completed",
    "cancelled",
    "on_hold",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  context: z.record(z.unknown()),
  formData: z.record(z.unknown()),
  tasks: z.array(
    z.object({
      id: z.string().uuid(),
      stepId: z.string().uuid(),
      stepCode: z.string(),
      stepName: z.string(),
      stepType: z.enum([
        "approval",
        "task",
        "notification",
        "automation",
        "integration",
        "parallel",
        "gateway",
      ]),
      status: z.enum([
        "pending",
        "active",
        "completed",
        "skipped",
        "failed",
        "reassigned",
      ]),
      assigneeId: z.string().uuid().optional(),
      assigneeRole: z.string().optional(),
      assignedAt: z.string().datetime().optional(),
      dueDate: z.string().datetime().optional(),
      startedAt: z.string().datetime().optional(),
      completedAt: z.string().datetime().optional(),
      completedBy: z.string().uuid().optional(),
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
      formData: z.record(z.unknown()),
      previousTaskId: z.string().uuid().optional(),
    })
  ),
  history: z.array(
    z.object({
      id: z.string().uuid(),
      instanceId: z.string().uuid(),
      taskId: z.string().uuid().optional(),
      fromStepId: z.string().uuid().optional(),
      toStepId: z.string().uuid().optional(),
      transitionType: z.enum([
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
      ]),
      actorId: z.string().uuid(),
      actorRole: z.string().optional(),
      comment: z.string().optional(),
      formData: z.record(z.unknown()),
      timestamp: z.string().datetime(),
    })
  ),
});

export type WorkflowContext = z.infer<typeof WorkflowContextSchema>;

export const WorkflowEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("START"),
    payload: z.object({ assigneeId: z.string().uuid().optional() }),
  }),
  z.object({
    type: z.literal("SUBMIT"),
    payload: z.object({
      formData: z.record(z.unknown()).optional(),
      comment: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("APPROVE"),
    payload: z.object({
      taskId: z.string().uuid(),
      formData: z.record(z.unknown()).optional(),
      comment: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("REJECT"),
    payload: z.object({
      taskId: z.string().uuid(),
      comment: z.string().min(1),
      formData: z.record(z.unknown()).optional(),
    }),
  }),
  z.object({
    type: z.literal("REASSIGN"),
    payload: z.object({
      taskId: z.string().uuid(),
      newAssigneeId: z.string().uuid(),
      comment: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("DELEGATE"),
    payload: z.object({
      taskId: z.string().uuid(),
      delegatedToId: z.string().uuid(),
      comment: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("ESCALATE"),
    payload: z.object({
      taskId: z.string().uuid(),
      escalatedToId: z.string().uuid(),
      comment: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("COMPLETE_TASK"),
    payload: z.object({
      taskId: z.string().uuid(),
      formData: z.record(z.unknown()).optional(),
      comment: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("CANCEL"),
    payload: z.object({ reason: z.string().min(1) }),
  }),
  z.object({
    type: z.literal("HOLD"),
    payload: z.object({ reason: z.string().optional() }),
  }),
  z.object({ type: z.literal("RESUME"), payload: z.object({}) }),
  z.object({
    type: z.literal("SKIP_STEP"),
    payload: z.object({
      taskId: z.string().uuid(),
      reason: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("TIMEOUT"),
    payload: z.object({ taskId: z.string().uuid() }),
  }),
]);

export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;

export function createWorkflowMachine(definition: WorkflowDefinition) {
  const stepMap = new Map(definition.steps.map(s => [s.id, s]));
  const initialStep = definition.steps[0];

  return setup({
    types: {
      context: WorkflowContextSchema,
      events: WorkflowEventSchema,
    },
    actions: {
      initializeTasks: assign(({ context, event }) => {
        if (event.type !== "START") return context;

        const tasks = definition.steps.map(step => ({
          id: crypto.randomUUID(),
          stepId: step.id,
          stepCode: step.code,
          stepName: step.name,
          stepType: step.type,
          status: step.id === initialStep.id ? "active" : "pending",
          assigneeId: step.assigneeId,
          assigneeRole: step.assigneeRole,
          assignedAt:
            step.id === initialStep.id ? new Date().toISOString() : undefined,
          dueDate: step.slaHours
            ? new Date(
                Date.now() + step.slaHours * 60 * 60 * 1000
              ).toISOString()
            : undefined,
          formData: {},
        }));

        return {
          ...context,
          status: "pending_approval" as const,
          currentStepId: initialStep.id,
          currentAssigneeId: initialStep.assigneeId,
          currentAssigneeRole: initialStep.assigneeRole,
          startedAt: new Date().toISOString(),
          tasks,
        };
      }),
      recordHistory: assign(({ context, event }) => {
        const historyEntry = {
          id: crypto.randomUUID(),
          instanceId: context.instanceId,
          taskId: "taskId" in event.payload ? event.payload.taskId : undefined,
          fromStepId: context.currentStepId,
          toStepId: undefined,
          transitionType: event.type as WorkflowTransitionType,
          actorId:
            "actorId" in event.payload
              ? event.payload.actorId
              : context.currentAssigneeId || "",
          actorRole:
            "actorRole" in event.payload
              ? event.payload.actorRole
              : context.currentAssigneeRole,
          comment:
            "comment" in event.payload ? event.payload.comment : undefined,
          formData:
            "formData" in event.payload ? event.payload.formData || {} : {},
          timestamp: new Date().toISOString(),
        };

        return {
          ...context,
          history: [...context.history, historyEntry],
        };
      }),
      updateTaskStatus: assign(({ context, event }) => {
        if (!("taskId" in event.payload)) return context;

        const { taskId } = event.payload;
        const taskIndex = context.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return context;

        const newTasks = [...context.tasks];
        const task = newTasks[taskIndex];

        let newStatus: WorkflowStepStatus = task.status;
        let outcome: WorkflowTask["outcome"];

        switch (event.type) {
          case "APPROVE":
            newStatus = "completed";
            outcome = "approved";
            break;
          case "REJECT":
            newStatus = "completed";
            outcome = "rejected";
            break;
          case "COMPLETE_TASK":
            newStatus = "completed";
            outcome = "completed";
            break;
          case "REASSIGN":
            newStatus = "reassigned";
            outcome = undefined;
            break;
          case "DELEGATE":
            newStatus = "reassigned";
            outcome = "delegated";
            break;
          case "ESCALATE":
            newStatus = "reassigned";
            outcome = "escalated";
            break;
          case "SKIP_STEP":
            newStatus = "skipped";
            outcome = "skipped";
            break;
        }

        newTasks[taskIndex] = {
          ...task,
          status: newStatus,
          outcome,
          completedAt: [
            "APPROVE",
            "REJECT",
            "COMPLETE_TASK",
            "SKIP_STEP",
          ].includes(event.type)
            ? new Date().toISOString()
            : task.completedAt,
          completedBy: ["APPROVE", "REJECT", "COMPLETE_TASK"].includes(
            event.type
          )
            ? event.payload.actorId
            : task.completedBy,
          comment:
            "comment" in event.payload ? event.payload.comment : task.comment,
          formData:
            "formData" in event.payload
              ? { ...task.formData, ...event.payload.formData }
              : task.formData,
        };

        if (event.type === "REASSIGN") {
          newTasks[taskIndex].assigneeId = event.payload.newAssigneeId;
          newTasks[taskIndex].assignedAt = new Date().toISOString();
        }

        if (event.type === "DELEGATE") {
          newTasks[taskIndex].delegatedFromId = task.assigneeId;
          newTasks[taskIndex].assigneeId = event.payload.delegatedToId;
          newTasks[taskIndex].assignedAt = new Date().toISOString();
        }

        return { ...context, tasks: newTasks };
      }),
      advanceToNextStep: assign(({ context, event }) => {
        if (!["APPROVE", "COMPLETE_TASK", "SKIP_STEP"].includes(event.type))
          return context;

        const currentStep = stepMap.get(context.currentStepId!);
        if (!currentStep)
          return {
            ...context,
            status: "completed" as const,
            completedAt: new Date().toISOString(),
          };

        const transitions = currentStep.transitions.filter(t => {
          if (t.condition) {
            try {
              return new Function("ctx", "return " + t.condition)(context);
            } catch {
              return false;
            }
          }
          return true;
        });

        const nextTransition = transitions.find(
          t =>
            (event.type === "APPROVE" && t.type === "approve") ||
            (event.type === "COMPLETE_TASK" &&
              ["complete", "approve"].includes(t.type)) ||
            (event.type === "SKIP_STEP" && t.type === "complete")
        );

        if (!nextTransition) {
          return {
            ...context,
            status: "completed" as const,
            completedAt: new Date().toISOString(),
          };
        }

        const nextStep = stepMap.get(nextTransition.toStepId);
        if (!nextStep)
          return {
            ...context,
            status: "completed" as const,
            completedAt: new Date().toISOString(),
          };

        const nextTaskIndex = context.tasks.findIndex(
          t => t.stepId === nextStep.id && t.status === "pending"
        );
        if (nextTaskIndex === -1)
          return {
            ...context,
            status: "completed" as const,
            completedAt: new Date().toISOString(),
          };

        const newTasks = [...context.tasks];
        newTasks[nextTaskIndex] = {
          ...newTasks[nextTaskIndex],
          status: "active",
          assignedAt: new Date().toISOString(),
          dueDate: nextStep.slaHours
            ? new Date(
                Date.now() + nextStep.slaHours * 60 * 60 * 1000
              ).toISOString()
            : undefined,
        };

        return {
          ...context,
          currentStepId: nextStep.id,
          currentAssigneeId: nextStep.assigneeId,
          currentAssigneeRole: nextStep.assigneeRole,
          tasks: newTasks,
          status: "pending_approval" as const,
        };
      }),
      handleRejection: assign(({ context }) => ({
        ...context,
        status: "rejected" as const,
        completedAt: new Date().toISOString(),
      })),
      handleCancellation: assign(({ context, event }) => ({
        ...context,
        status: "cancelled" as const,
        cancelledAt: new Date().toISOString(),
        cancellationReason:
          "reason" in event.payload ? event.payload.reason : undefined,
      })),
      handleHold: assign(({ context }) => ({
        ...context,
        status: "on_hold" as const,
      })),
      handleResume: assign(({ context }) => ({
        ...context,
        status: "pending_approval" as const,
      })),
    },
    guards: {
      canApprove: ({ context, event }) => {
        if (event.type !== "APPROVE") return false;
        const task = context.tasks.find(t => t.id === event.payload.taskId);
        return task?.status === "active" && task.stepType === "approval";
      },
      canReject: ({ context, event }) => {
        if (event.type !== "REJECT") return false;
        const task = context.tasks.find(t => t.id === event.payload.taskId);
        return task?.status === "active" && task.stepType === "approval";
      },
      canComplete: ({ context, event }) => {
        if (event.type !== "COMPLETE_TASK") return false;
        const task = context.tasks.find(t => t.id === event.payload.taskId);
        return task?.status === "active" && task.stepType === "task";
      },
      isFinalStep: ({ context }) => {
        const currentStep = stepMap.get(context.currentStepId!);
        if (!currentStep) return true;
        return currentStep.transitions.length === 0;
      },
    },
  }).createMachine({
    id: `workflow-${definition.code}`,
    initial: "draft",
    context: {
      instanceId: "",
      definitionId: definition.id,
      entityType: definition.entityType,
      entityId: "",
      status: "draft",
      priority: "medium",
      context: {},
      formData: {},
      tasks: [],
      history: [],
    },
    states: {
      draft: {
        on: {
          START: {
            target: "running",
            actions: ["initializeTasks", "recordHistory"],
          },
        },
      },
      running: {
        initial: "pending_approval",
        states: {
          pending_approval: {},
          in_progress: {},
        },
        on: {
          APPROVE: [
            {
              guard: "canApprove",
              actions: [
                "updateTaskStatus",
                "recordHistory",
                "advanceToNextStep",
              ],
            },
          ],
          REJECT: [
            {
              guard: "canReject",
              actions: ["updateTaskStatus", "recordHistory", "handleRejection"],
            },
          ],
          COMPLETE_TASK: [
            {
              guard: "canComplete",
              actions: [
                "updateTaskStatus",
                "recordHistory",
                "advanceToNextStep",
              ],
            },
          ],
          REASSIGN: {
            actions: ["updateTaskStatus", "recordHistory"],
          },
          DELEGATE: {
            actions: ["updateTaskStatus", "recordHistory"],
          },
          ESCALATE: {
            actions: ["updateTaskStatus", "recordHistory"],
          },
          SKIP_STEP: {
            actions: ["updateTaskStatus", "recordHistory", "advanceToNextStep"],
          },
          CANCEL: {
            target: "cancelled",
            actions: ["handleCancellation", "recordHistory"],
          },
          HOLD: {
            target: "on_hold",
            actions: ["handleHold", "recordHistory"],
          },
          TIMEOUT: {
            actions: ["recordHistory"],
          },
        },
      },
      on_hold: {
        on: {
          RESUME: {
            target: "running",
            actions: ["handleResume", "recordHistory"],
          },
          CANCEL: {
            target: "cancelled",
            actions: ["handleCancellation", "recordHistory"],
          },
        },
      },
      approved: {
        type: "final",
      },
      rejected: {
        type: "final",
      },
      completed: {
        type: "final",
      },
      cancelled: {
        type: "final",
      },
    },
  });
}

export class WorkflowRegistry {
  private machines = new Map<
    string,
    ReturnType<typeof createWorkflowMachine>
  >();

  register(definition: WorkflowDefinition) {
    this.machines.set(definition.id, createWorkflowMachine(definition));
  }

  get(definitionId: string) {
    return this.machines.get(definitionId);
  }

  has(definitionId: string) {
    return this.machines.has(definitionId);
  }

  remove(definitionId: string) {
    return this.machines.delete(definitionId);
  }

  clear() {
    this.machines.clear();
  }
}

export const workflowRegistry = new WorkflowRegistry();

export const defaultWorkflowDefinitions = [
  invoiceApprovalDefinition,
  voucherApprovalDefinition,
  requisitionApprovalDefinition,
  procurementApprovalDefinition,
];

export function initializeDefaultWorkflows() {
  for (const def of defaultWorkflowDefinitions) {
    workflowRegistry.register(def);
  }
}

initializeDefaultWorkflows();
