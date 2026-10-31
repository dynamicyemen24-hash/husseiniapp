/**
 * Elias Pro — tRPC router.
 * ============================================================
 * Thin transport layer over the Elias Pro application service.
 *
 * RESPONSIBILITY SPLIT
 *   router  → validate input (zod, from `shared/eliasPro/schemas`), authorise
 *             (tenant scope), call the service, shape the response.
 *   service → every business rule, risk gate and aggregation.
 *   adapter → transport only.
 *
 * No EliasPro raw JSON ever crosses this boundary: responses are built from
 * the platform contracts in `shared/eliasPro`.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, tenantProcedure } from "../_core/trpc";
import {
  eliasCaptureInputSchema,
  eliasEngineListSchema,
  eliasEngineRunInputSchema,
  eliasNodeInputSchema,
  eliasProbeSubmitSchema,
  eliasWorkOrderCreateSchema,
  eliasWorkOrderListSchema,
  eliasWorkOrderStatusSchema,
  eliasWorkOrderUpdateSchema,
} from "../../shared/eliasPro";
import { listEliasEngines } from "../../shared/eliasPro";
import {
  captureDiagnostic,
  checkAllNodesHealth,
  checkNodeHealth,
  createWorkOrder,
  deviceTrends,
  fleetOverview,
  listDiagnostics,
  listEngineRuns,
  listNodes,
  listWorkOrders,
  registerNode,
  removeNode,
  runEngine,
  submitBrowserProbe,
  updateWorkOrderStatus,
} from "./service";

/** Maps a service-layer error to a typed tRPC error. */
function toTRPC(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (message.startsWith("NODE_NOT_FOUND")) {
    throw new TRPCError({ code: "NOT_FOUND", message: "العقدة غير موجودة" });
  }
  if (message.startsWith("WORK_ORDER_NOT_FOUND")) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "أمر الصيانة غير موجود",
    });
  }
  if (message.startsWith("ENGINE_NOT_FOUND")) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "محرك الصيانة غير موجود",
    });
  }
  if (message.startsWith("RISK_ACK_REQUIRED")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "هذا المحرك يغيّر حالة العقدة — يتطلب إقراراً صريحاً من المشغّل قبل التنفيذ",
    });
  }
  if (message.startsWith("NODE_DISABLED")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "العقدة معطّلة" });
  }
  if (message.startsWith("NODE_MISCONFIGURED")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "بيانات اتصال العقدة غير مكتملة",
    });
  }
  if (message.startsWith("DATABASE_UNAVAILABLE")) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "قاعدة البيانات غير متاحة حالياً",
    });
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
}

async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    return toTRPC(err);
  }
}

export const eliasProRouter = router({
  // ─── Engine catalogue ───────────────────────────────────────────
  engines: router({
    list: tenantProcedure.input(eliasEngineListSchema).query(({ input }) => {
      const all = listEliasEngines(input.category);
      return input.portableOnly ? all.filter(e => e.portable) : all;
    }),
  }),

  // ─── Node registry ──────────────────────────────────────────────
  nodes: router({
    list: tenantProcedure.query(async ({ ctx }) =>
      guarded(() => listNodes(ctx.tenantId))
    ),

    register: tenantProcedure
      .input(eliasNodeInputSchema)
      .mutation(async ({ ctx, input }) =>
        guarded(() =>
          registerNode(ctx.tenantId, {
            code: input.code,
            name: input.name,
            baseUrl: input.baseUrl,
            token: input.token ?? null,
            isSimulated: input.isSimulated,
            capabilities: input.capabilities,
          })
        )
      ),

    remove: tenantProcedure
      .input(z.object({ nodeId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) =>
        guarded(() => removeNode(ctx.tenantId, input.nodeId))
      ),

    health: tenantProcedure
      .input(z.object({ nodeId: z.number().int().positive() }))
      .query(async ({ ctx, input }) =>
        guarded(() => checkNodeHealth(ctx.tenantId, input.nodeId))
      ),

    healthAll: tenantProcedure.query(async ({ ctx }) =>
      guarded(() => checkAllNodesHealth(ctx.tenantId))
    ),
  }),

  // ─── Diagnostics ────────────────────────────────────────────────
  diagnostics: router({
    list: tenantProcedure
      .input(
        z.object({
          deviceKey: z.string().max(200).optional(),
          nodeId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(200).optional().default(50),
        })
      )
      .query(async ({ ctx, input }) =>
        guarded(() =>
          listDiagnostics(ctx.tenantId, {
            deviceKey: input.deviceKey,
            nodeId: input.nodeId,
            limit: input.limit,
          })
        )
      ),

    capture: tenantProcedure
      .input(eliasCaptureInputSchema)
      .mutation(async ({ ctx, input }) =>
        guarded(() => captureDiagnostic(ctx.tenantId, input.nodeId))
      ),

    submitProbe: tenantProcedure
      .input(eliasProbeSubmitSchema)
      .mutation(async ({ ctx, input }) =>
        guarded(() =>
          submitBrowserProbe(ctx.tenantId, {
            deviceKey: input.deviceKey,
            deviceLabel: input.deviceLabel,
            platform: input.platform,
            cpuLoadPct: input.cpuLoadPct,
            cpuName: input.cpuName,
            cores: input.cores,
            totalRamGb: input.totalRamGb,
            freeRamGb: input.freeRamGb,
            storageTotalGb: input.storageTotalGb,
            storageFreeGb: input.storageFreeGb,
            batteryLevelPct: input.batteryLevelPct,
            batteryCharging: input.batteryCharging,
            networkType: input.networkType,
            downlinkMbps: input.downlinkMbps,
            rttMs: input.rttMs,
          })
        )
      ),

    trends: tenantProcedure
      .input(
        z.object({
          deviceKey: z.string().min(1).max(200),
          horizon: z.number().int().min(1).max(60).optional().default(8),
        })
      )
      .query(async ({ ctx, input }) =>
        guarded(() =>
          deviceTrends(ctx.tenantId, input.deviceKey, input.horizon)
        )
      ),
  }),

  // ─── Engine runs ────────────────────────────────────────────────
  runEngine: tenantProcedure
    .input(eliasEngineRunInputSchema)
    .mutation(async ({ ctx, input }) =>
      guarded(() =>
        runEngine(ctx.tenantId, ctx.user?.id ?? null, {
          nodeId: input.nodeId,
          engineId: input.engineId,
          args: input.args,
          acknowledgeRisk: input.acknowledgeRisk,
        })
      )
    ),

  engineRuns: tenantProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(200).optional().default(50),
      })
    )
    .query(async ({ ctx, input }) =>
      guarded(() => listEngineRuns(ctx.tenantId, input.limit))
    ),

  // ─── Work orders ────────────────────────────────────────────────
  workOrders: router({
    list: tenantProcedure
      .input(eliasWorkOrderListSchema)
      .query(async ({ ctx, input }) =>
        guarded(() =>
          listWorkOrders(ctx.tenantId, {
            status: input.status,
            search: input.search,
            limit: input.limit,
          })
        )
      ),

    create: tenantProcedure
      .input(eliasWorkOrderCreateSchema)
      .mutation(async ({ ctx, input }) =>
        guarded(() =>
          createWorkOrder(ctx.tenantId, {
            nodeId: input.nodeId,
            title: input.title,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            deviceType: input.deviceType,
            deviceSerial: input.deviceSerial,
            reportedIssue: input.reportedIssue,
            priority: input.priority,
            estimatedCost: input.estimatedCost,
          })
        )
      ),

    setStatus: tenantProcedure
      .input(eliasWorkOrderUpdateSchema)
      .mutation(async ({ ctx, input }) =>
        guarded(() =>
          updateWorkOrderStatus(ctx.tenantId, input.id, input.status)
        )
      ),
  }),

  // ─── Fleet overview ─────────────────────────────────────────────
  fleet: router({
    overview: tenantProcedure.query(async ({ ctx }) =>
      guarded(() => fleetOverview(ctx.tenantId))
    ),
  }),
});

// Keep the status schema import referenced for type-safety at the boundary.
export const eliasWorkOrderStatuses = eliasWorkOrderStatusSchema.options;
