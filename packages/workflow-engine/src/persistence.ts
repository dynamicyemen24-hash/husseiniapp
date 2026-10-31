import { db } from "../../server/db";
import {
  workflowDefinitions,
  workflowInstances,
  workflowTasks,
  workflowHistory,
} from "../../drizzle/schema";
import type {
  WorkflowContext,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowTask,
  WorkflowHistory,
} from "@alhusseiniya/types/workflow";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import type { Context as XStateContext } from "xstate";

/**
 * Save a workflow instance to the database
 * Serializes the XState context and tasks to JSON
 */
export async function saveInstance(
  instanceId: string,
  definitionId: string,
  context: XStateContext,
  tasks: any[]
) {
  await db
    .insert(workflowInstances)
    .values({
      GlobalId: crypto.randomUUID(),
      tenantId: context.tenantId,
      definitionId,
      definitionVersion: context.version || 1,
      entityType: context.entityType,
      entityId: context.entityId,
      status: context.status,
      currentStepId: context.currentStepId,
      currentAssigneeId: context.currentAssigneeId,
      currentAssigneeRole: context.currentAssigneeRole,
      priority: context.priority,
      dueDate: context.dueDate ? new Date(context.dueDate) : undefined,
      startedAt: context.startedAt ? new Date(context.startedAt) : undefined,
      completedAt: context.completedAt
        ? new Date(context.completedAt)
        : undefined,
      cancelledAt: context.cancelledAt
        ? new Date(context.cancelledAt)
        : undefined,
      cancelledById: context.cancelledById,
      cancellationReason: context.cancellationReason,
      context: context.context,
      metadata: context.metadata,
      createdAt: context.createdAt ? new Date(context.createdAt) : new Date(),
      updatedAt: new Date(),
      createdById: context.createdById,
      updatedById: context.updatedById,
    })
    .onConflictDoUpdate({
      target: workflowInstances.id,
      set: {
        status: context.status,
        currentStepId: context.currentStepId,
        currentAssigneeId: context.currentAssigneeId,
        currentAssigneeRole: context.currentAssigneeRole,
        priority: context.priority,
        dueDate: context.dueDate ? new Date(context.dueDate) : undefined,
        startedAt: context.startedAt ? new Date(context.startedAt) : undefined,
        completedAt: context.completedAt
          ? new Date(context.completedAt)
          : undefined,
        context: context.context,
        metadata: context.metadata,
        updatedAt: new Date(),
      },
    });

  // Save tasks
  await db
    .delete(workflowTasks)
    .where(eq(workflowTasks.instanceId, instanceId as any));

  if (tasks && tasks.length > 0) {
    await db.insert(workflowTasks).values(
      tasks.map(task => ({
        GlobalId: crypto.randomUUID(),
        tenantId: task.tenantId,
        instanceId,
        stepId: task.stepId,
        stepCode: task.stepCode,
        stepName: task.stepName,
        stepType: task.stepType,
        status: task.status,
        assigneeId: task.assigneeId,
        assigneeRole: task.assigneeRole,
        assignedAt: task.assignedAt ? new Date(task.assignedAt) : undefined,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        startedAt: task.startedAt ? new Date(task.startedAt) : undefined,
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        completedBy: task.completedBy,
        outcome: task.outcome,
        comment: task.comment,
        formData: task.formData,
        previousTaskId: task.previousTaskId,
        delegatedFromId: task.delegatedFromId,
        delegatedToId: task.delegatedToId,
        escalatedFromId: task.escalatedFromId,
        escalatedToId: task.escalatedToId,
        metadata: task.metadata,
        createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
        updatedAt: new Date(),
      }))
    );
  }
}

/**
 * Load a workflow instance from the database
 */
export async function loadInstance(instanceId: string): Promise<{
  instance: typeof workflowInstances.$inferSelect | null;
  tasks: (typeof workflowTasks.$inferSelect)[];
}> {
  const instance = await db
    .select()
    .from(workflowInstances)
    .where(eq(workflowInstances.GlobalId, instanceId))
    .limit(1);
  const tasks = await db
    .select()
    .from(workflowTasks)
    .where(eq(workflowTasks.instanceId, instanceId as any));

  return {
    instance: instance[0] || null,
    tasks: tasks as (typeof workflowTasks.$inferSelect)[],
  };
}

/**
 * Save a history entry to the database
 */
export async function saveHistoryEntry(entry: {
  instanceId: string;
  taskId?: string;
  fromStepId?: string;
  toStepId?: string;
  transitionType: string;
  actorId: string;
  actorRole?: string;
  comment?: string;
  formData?: Record<string, unknown>;
}) {
  await db.insert(workflowHistory).values({
    GlobalId: crypto.randomUUID(),
    tenantId: 0, // will be enriched from instance
    instanceId: entry.instanceId,
    taskId: entry.taskId,
    fromStepId: entry.fromStepId,
    toStepId: entry.toStepId,
    transitionType: entry.transitionType,
    actorId: entry.actorId,
    actorRole: entry.actorRole,
    comment: entry.comment,
    formData: entry.formData,
    createdAt: new Date(),
    contextSnapshot: entry.formData,
    metadata: {},
  });
}

/**
 * Get overdue instances (SLA expired) for cron scheduler
 */
export async function getOverdueInstances() {
  const now = new Date();
  return await db
    .select()
    .from(workflowInstances)
    .where(
      and(
        eq(workflowInstances.status, "running"),
        gte(workflowInstances.dueDate, now) // dueDate is when SLA expires, so overdue if dueDate < now
      )
    );
}

/**
 * Get running instances waiting for task completion
 */
export async function getRunningInstancesByDefinition(definitionId: string) {
  return await db
    .select()
    .from(workflowInstances)
    .where(
      and(
        eq(workflowInstances.definitionId, definitionId),
        eq(workflowInstances.status, "running")
      )
    );
}
