import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  protectedProcedure,
  tenantProcedure,
  adminProcedure,
  router,
  requirePermissions,
} from "../_core/trpc";
import { PERMISSIONS } from "../../shared/permissions";
import { getDb } from "../db";
import {
  workflowDefinitions,
  workflowInstances,
  workflowTasks,
  workflowHistory,
} from "../../drizzle/schema";
import { eq, and, desc, sql, count, inArray, or } from "drizzle-orm";
import { randomUUID } from "crypto";
// import { workflowRegistry, createWorkflowMachine } from "@alhusseiniya/workflow-engine";
// import { saveInstance, loadInstance, getOverdueInstances } from "@alhusseiniya/workflow-engine/persistence";
// import { WorkflowEventSchema } from "@alhusseiniya/workflow-engine";

const uuidv4 = randomUUID;

const WorkflowDefinitionCreateSchema = z.object({
  code: z.string().max(50),
  name: z.string().max(200),
  nameAr: z.string().max(200).optional(),
  description: z.string().optional(),
  entityType: z.string().max(100),
  steps: z
    .array(
      z.object({
        id: z.string().uuid(),
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
          .enum(["user", "role", "department", "manager", "creator", "dynamic"])
          .optional(),
        assigneeId: z.string().uuid().optional(),
        roleCode: z.string().max(50).optional(),
        departmentId: z.string().uuid().optional(),
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
              config: z.record(z.string(), z.unknown()),
            })
          )
          .default([]),
        transitions: z
          .array(
            z.object({
              toStepId: z.string().uuid(),
              type: z.enum([
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
    .partial()
    .default({}),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const WorkflowDefinitionUpdateSchema = WorkflowDefinitionCreateSchema.partial();

const WorkflowInstanceStartSchema = z.object({
  definitionId: z.string().uuid(),
  entityType: z.string().max(100),
  entityId: z.string().uuid(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  context: z.record(z.string(), z.unknown()).default({}),
  assigneeId: z.string().uuid().optional(),
});

const WorkflowEventInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("START"),
    payload: z.object({ assigneeId: z.string().uuid().optional() }),
  }),
  z.object({
    type: z.literal("SUBMIT"),
    payload: z.object({
      formData: z.record(z.string(), z.unknown()).optional(),
      comment: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("APPROVE"),
    payload: z.object({
      taskId: z.string().uuid(),
      formData: z.record(z.string(), z.unknown()).optional(),
      comment: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("REJECT"),
    payload: z.object({
      taskId: z.string().uuid(),
      comment: z.string().min(1),
      formData: z.record(z.string(), z.unknown()).optional(),
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
      formData: z.record(z.string(), z.unknown()).optional(),
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
  z.object({
    type: z.literal("RESUME"),
    payload: z.object({ reason: z.string().optional() }),
  }),
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

const WorkflowDefinitionFilterSchema = z.object({
  entityType: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

const WorkflowInstanceFilterSchema = z.object({
  definitionId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  status: z
    .enum([
      "draft",
      "pending_approval",
      "approved",
      "rejected",
      "in_progress",
      "completed",
      "cancelled",
      "on_hold",
    ])
    .optional(),
  assigneeId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

const WorkflowTaskFilterSchema = z.object({
  instanceId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  status: z
    .enum(["pending", "active", "completed", "skipped", "failed", "reassigned"])
    .optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const workflowRouter = router({
  definitions: router({
    list: tenantProcedure
      .use(requirePermissions(PERMISSIONS.WORKFLOW_READ))
      .input(WorkflowDefinitionFilterSchema)
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const conditions = [
          eq(workflowDefinitions.tenantId, ctx.tenantId ?? 0),
        ];
        if (input.entityType)
          conditions.push(eq(workflowDefinitions.entityType, input.entityType));
        if (input.isActive !== undefined)
          conditions.push(eq(workflowDefinitions.isActive, input.isActive));
        if (input.search)
          conditions.push(
            sql`${workflowDefinitions.name} ILIKE ${"%" + input.search + "%"}`
          );

        const [items, total] = await Promise.all([
          db
            .select()
            .from(workflowDefinitions)
            .where(and(...conditions))
            .orderBy(desc(workflowDefinitions.createdAt))
            .limit(input.limit)
            .offset((input.page - 1) * input.limit),
          db
            .select({ count: count() })
            .from(workflowDefinitions)
            .where(and(...conditions)),
        ]);

        return {
          items,
          total: total[0]?.count ?? 0,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil((total[0]?.count ?? 0) / input.limit),
        };
      }),

    get: tenantProcedure
      .use(requirePermissions(PERMISSIONS.WORKFLOW_READ))
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const [def] = await db
          .select()
          .from(workflowDefinitions)
          .where(
            and(
              eq(workflowDefinitions.id, input.id),
              eq(workflowDefinitions.tenantId, ctx.tenantId ?? 0)
            )
          )
          .limit(1);

        if (!def)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow definition not found",
          });
        return def;
      }),

    create: tenantProcedure
      .use(requirePermissions(PERMISSIONS.WORKFLOW_ADMIN))
      .input(WorkflowDefinitionCreateSchema)
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const existing = await db
          .select()
          .from(workflowDefinitions)
          .where(
            and(
              eq(workflowDefinitions.code, input.code),
              eq(workflowDefinitions.tenantId, ctx.tenantId ?? 0)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Workflow code already exists",
          });
        }

        const [def] = await db
          .insert(workflowDefinitions)
          .values({
            tenantId: ctx.tenantId ?? 0,
            code: input.code,
            name: input.name,
            nameAr: input.nameAr,
            description: input.description,
            entityType: input.entityType,
            version: 1,
            steps: input.steps as any,
            settings: input.settings as any,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdById: ctx.user.id,
            updatedById: ctx.user.id,
          } as any)
          .returning();

        // Register the machine in the registry
        // workflowRegistry.register(def as any);
        return def;
      }),

    update: tenantProcedure
      .use(requirePermissions(PERMISSIONS.WORKFLOW_ADMIN))
      .input(
        z
          .object({ id: z.number().int().positive() })
          .merge(WorkflowDefinitionUpdateSchema)
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const { id, ...data } = input;
        const [def] = await db
          .update(workflowDefinitions)
          .set({
            ...data,
            steps: data.steps as any,
            settings: data.settings as any,
            updatedAt: new Date(),
            updatedById: ctx.user.id,
          } as any)
          .where(
            and(
              eq(workflowDefinitions.id, id),
              eq(workflowDefinitions.tenantId, ctx.tenantId ?? 0)
            )
          )
          .returning();

        if (!def)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow definition not found",
          });
        // workflowRegistry.register(def as any);
        return def;
      }),

    delete: tenantProcedure
      .use(requirePermissions(PERMISSIONS.WORKFLOW_ADMIN))
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        await db
          .delete(workflowDefinitions)
          .where(
            and(
              eq(workflowDefinitions.id, input.id),
              eq(workflowDefinitions.tenantId, ctx.tenantId ?? 0)
            )
          );

        // workflowRegistry.remove(input.id.toString());
        return { success: true };
      }),
  }),

  instances: router({
    start: tenantProcedure
      .use(requirePermissions(PERMISSIONS.WORKFLOW_WRITE))
      .input(WorkflowInstanceStartSchema)
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const [def] = await db
          .select()
          .from(workflowDefinitions)
          .where(
            and(
              eq(workflowDefinitions.id, parseInt(input.definitionId)),
              eq(workflowDefinitions.tenantId, ctx.tenantId ?? 0)
            )
          )
          .limit(1);

        if (!def)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow definition not found",
          });
        if (!def.isActive)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Workflow definition is not active",
          });

        // TODO: Re-enable when @alhusseiniya/workflow-engine package is built
        // const machine = workflowRegistry.get(def.id.toString()) || createWorkflowMachine(def as any);
        // const instanceId = uuidv4();
        //
        // const initialContext = {
        //   instanceId,
        //   definitionId: def.id.toString(),
        //   entityType: input.entityType,
        //   entityId: input.entityId,
        //   status: "draft" as const,
        //   priority: input.priority,
        //   context: input.context,
        //   formData: {},
        //   tasks: [],
        //   history: [],
        // };
        //
        // const started = machine.provide({ actions: {} }).start(initialContext);
        // started.send({ type: "START", payload: { assigneeId: input.assigneeId } });
        //
        // const context = started.getSnapshot().context;
        // await saveInstance(context);
        //
        // return { instanceId, status: context.status };

        // Fallback: create instance directly in DB without workflow engine
        const instanceId = uuidv4();
        const [instance] = await db
          .insert(workflowInstances)
          .values({
            id: instanceId,
            tenantId: ctx.tenantId ?? 0,
            definitionId: def.id,
            entityType: input.entityType,
            entityId: input.entityId,
            status: "draft",
            currentStepId: null,
            currentAssigneeId: input.assigneeId ?? null,
            priority: input.priority ?? "medium",
            context: input.context ?? {},
            metadata: {},
            startedAt: new Date(),
            updatedAt: new Date(),
            createdById: ctx.user.id,
            updatedById: ctx.user.id,
          } as any)
          .returning();

        return { instanceId: instance.id, status: instance.status };
      }),

    sendEvent: tenantProcedure
      .use(requirePermissions(PERMISSIONS.WORKFLOW_WRITE))
      .input(
        z.object({
          instanceId: z.string().uuid(),
          event: WorkflowEventInputSchema,
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        // TODO: Re-enable when @alhusseiniya/workflow-engine package is built
        // const context = await loadInstance(input.instanceId);
        // if (!context) throw new TRPCError({ code: "NOT_FOUND", message: "Workflow instance not found" });
        //
        // const [def] = await db
        //   .select()
        //   .from(workflowDefinitions)
        //   .where(eq(workflowDefinitions.id, parseInt(context.definitionId)))
        //   .limit(1);
        //
        // if (!def) throw new TRPCError({ code: "NOT_FOUND", message: "Workflow definition not found" });
        //
        // const machine = workflowRegistry.get(def.id.toString()) || createWorkflowMachine(def as any);
        // const actor = machine.provide({ actions: {} }).start(context);
        // actor.send({ ...input.event, payload: { ...input.event.payload, actorId: ctx.user.id, actorRole: ctx.user.role } });
        //
        // const newContext = actor.getSnapshot().context;
        // await saveInstance(newContext);
        //
        // return { status: newContext.status, currentStepId: newContext.currentStepId };

        // Fallback: update instance status directly in DB
        const [instance] = await db
          .update(workflowInstances)
          .set({
            status: "completed",
            updatedAt: new Date(),
            updatedById: ctx.user.id,
          } as any)
          .where(eq(workflowInstances.GlobalId, input.instanceId))
          .returning();

        return {
          status: instance?.status ?? "completed",
          currentStepId: instance?.currentStepId ?? null,
        };
      }),

    get: tenantProcedure
      .use(requirePermissions(PERMISSIONS.WORKFLOW_READ))
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        // TODO: Re-enable when @alhusseiniya/workflow-engine package is built
        // const context = await loadInstance(input.id);
        // if (!context) throw new TRPCError({ code: "NOT_FOUND", message: "Workflow instance not found" });
        // return context;

        // Fallback: get instance directly from DB
        const [instance] = await db
          .select()
          .from(workflowInstances)
          .where(
            and(
              eq(workflowInstances.GlobalId, input.id),
              eq(workflowInstances.tenantId, ctx.tenantId ?? 0)
            )
          )
          .limit(1);

        if (!instance)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow instance not found",
          });
        return instance;
      }),

    list: tenantProcedure
      .use(requirePermissions(PERMISSIONS.WORKFLOW_READ))
      .input(WorkflowInstanceFilterSchema)
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const conditions = [eq(workflowInstances.tenantId, ctx.tenantId ?? 0)];
        if (input.definitionId)
          conditions.push(
            eq(workflowInstances.definitionId, parseInt(input.definitionId))
          );
        if (input.entityType)
          conditions.push(eq(workflowInstances.entityType, input.entityType));
        if (input.entityId)
          conditions.push(eq(workflowInstances.entityId, input.entityId));
        if (input.status)
          conditions.push(eq(workflowInstances.status, input.status as any));
        if (input.assigneeId)
          conditions.push(
            eq(workflowInstances.currentAssigneeId, input.assigneeId)
          );
        if (input.dateFrom)
          conditions.push(
            sql`${workflowInstances.createdAt} >= ${new Date(input.dateFrom)}`
          );
        if (input.dateTo)
          conditions.push(
            sql`${workflowInstances.createdAt} <= ${new Date(input.dateTo)}`
          );

        const [items, total] = await Promise.all([
          db
            .select()
            .from(workflowInstances)
            .where(and(...conditions))
            .orderBy(desc(workflowInstances.createdAt))
            .limit(input.limit)
            .offset((input.page - 1) * input.limit),
          db
            .select({ count: count() })
            .from(workflowInstances)
            .where(and(...conditions)),
        ]);

        return {
          items,
          total: total[0]?.count ?? 0,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil((total[0]?.count ?? 0) / input.limit),
        };
      }),
  }),

  tasks: router({
    get: tenantProcedure
      .use(requirePermissions(PERMISSIONS.WORKFLOW_READ))
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const [task] = await db
          .select()
          .from(workflowTasks)
          .where(
            and(
              eq(workflowTasks.id, input.id),
              eq(workflowTasks.tenantId, ctx.tenantId ?? 0)
            )
          )
          .limit(1);

        if (!task)
          throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
        return task;
      }),

    list: tenantProcedure
      .use(requirePermissions(PERMISSIONS.WORKFLOW_READ))
      .input(WorkflowTaskFilterSchema)
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const conditions = [eq(workflowTasks.tenantId, ctx.tenantId ?? 0)];
        if (input.instanceId)
          conditions.push(
            eq(workflowTasks.instanceId, parseInt(input.instanceId))
          );
        if (input.assigneeId)
          conditions.push(eq(workflowTasks.assigneeId, input.assigneeId));
        if (input.status)
          conditions.push(eq(workflowTasks.status, input.status as any));

        const [items, total] = await Promise.all([
          db
            .select()
            .from(workflowTasks)
            .where(and(...conditions))
            .orderBy(desc(workflowTasks.createdAt))
            .limit(input.limit)
            .offset((input.page - 1) * input.limit),
          db
            .select({ count: count() })
            .from(workflowTasks)
            .where(and(...conditions)),
        ]);

        return {
          items,
          total: total[0]?.count ?? 0,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil((total[0]?.count ?? 0) / input.limit),
        };
      }),

    myTasks: tenantProcedure
      .use(requirePermissions(PERMISSIONS.WORKFLOW_READ))
      .input(WorkflowTaskFilterSchema)
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        if (!ctx.user)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });

        const conditions = [
          eq(workflowTasks.tenantId, ctx.tenantId ?? 0),
          eq(workflowTasks.assigneeId, ctx.user.GlobalId),
        ];
        if (input.instanceId)
          conditions.push(
            eq(workflowTasks.instanceId, parseInt(input.instanceId))
          );
        if (input.status)
          conditions.push(eq(workflowTasks.status, input.status as any));

        const [items, total] = await Promise.all([
          db
            .select()
            .from(workflowTasks)
            .where(and(...conditions))
            .orderBy(desc(workflowTasks.createdAt))
            .limit(input.limit)
            .offset((input.page - 1) * input.limit),
          db
            .select({ count: count() })
            .from(workflowTasks)
            .where(and(...conditions)),
        ]);

        return {
          items,
          total: total[0]?.count ?? 0,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil((total[0]?.count ?? 0) / input.limit),
        };
      }),
  }),
});

export type WorkflowRouter = typeof workflowRouter;
