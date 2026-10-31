/**
 * Elias Pro — shared validation schemas.
 * ============================================================
 * Zod schemas used at the tRPC boundary so the client and the server agree on
 * the exact payload shape. Keeping them in `shared/` avoids drift between the
 * browser form and the server handler.
 */
import { z } from "zod";
import {
  ELIAS_ENGINE_CATEGORIES,
  ELIAS_NODE_STATUSES,
  ELIAS_WORK_ORDER_PRIORITIES,
  ELIAS_WORK_ORDER_STATUSES,
} from "./types";

// ─── Nodes ────────────────────────────────────────────────────────
export const eliasNodeInputSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9._-]+$/, "الكود يقبل الحروف والأرقام والشرطة فقط"),
  name: z.string().min(2).max(120),
  baseUrl: z
    .string()
    .url("الرابط غير صالح")
    .refine(
      u => /^https?:\/\//i.test(u),
      "يجب أن يبدأ الرابط بـ http أو https"
    ),
  /** Shared bearer token used to authenticate against the node agent. */
  token: z.string().min(8).max(200).optional(),
  /** Simulated node — used for demos, sandboxes and air-gapped installs. */
  isSimulated: z.boolean().optional().default(false),
  capabilities: z.array(z.string().max(40)).max(64).optional().default([]),
});

export type EliasNodeInput = z.infer<typeof eliasNodeInputSchema>;

export const eliasNodeStatusSchema = z.enum(ELIAS_NODE_STATUSES);

// ─── Diagnostics ──────────────────────────────────────────────────
export const eliasCaptureInputSchema = z.object({
  nodeId: z.number().int().positive(),
});

export const eliasProbeSubmitSchema = z.object({
  deviceKey: z.string().min(4).max(200),
  deviceLabel: z.string().min(1).max(160),
  platform: z.enum(["windows", "android", "ios", "linux", "web"]),
  cpuLoadPct: z.number().min(0).max(100).nullable().optional(),
  cpuName: z.string().max(160).nullable().optional(),
  cores: z.number().int().min(0).max(512).nullable().optional(),
  totalRamGb: z.number().min(0).max(4096).nullable().optional(),
  freeRamGb: z.number().min(0).max(4096).nullable().optional(),
  storageTotalGb: z.number().min(0).max(1_000_000).nullable().optional(),
  storageFreeGb: z.number().min(0).max(1_000_000).nullable().optional(),
  batteryLevelPct: z.number().min(0).max(100).nullable().optional(),
  batteryCharging: z.boolean().nullable().optional(),
  networkType: z.string().max(40).nullable().optional(),
  downlinkMbps: z.number().min(0).max(10_000).nullable().optional(),
  rttMs: z.number().min(0).max(60_000).nullable().optional(),
  /** Browser-measured health score (0..100) computed on the device. */
  clientScore: z.number().min(0).max(100).nullable().optional(),
  clientFindings: z
    .array(
      z.object({
        id: z.string().max(120),
        severity: z.enum(["high", "medium", "low"]),
        area: z.enum(["network", "storage", "battery", "cpu", "ram"]),
        titleAr: z.string().max(200),
        detailAr: z.string().max(500),
        actionAr: z.string().max(500),
      })
    )
    .max(50)
    .optional(),
});

export type EliasProbeSubmit = z.infer<typeof eliasProbeSubmitSchema>;

// ─── Engines ──────────────────────────────────────────────────────
export const eliasEngineRunInputSchema = z.object({
  nodeId: z.number().int().positive(),
  engineId: z.string().min(2).max(40),
  /** Free-form engine arguments — forwarded verbatim to the node. */
  args: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
  /** Explicit acknowledgement required for medium/high risk engines. */
  acknowledgeRisk: z.boolean().optional().default(false),
});

export type EliasEngineRunInput = z.infer<typeof eliasEngineRunInputSchema>;

// ─── Work orders ──────────────────────────────────────────────────
export const eliasWorkOrderCreateSchema = z.object({
  nodeId: z.number().int().positive(),
  title: z.string().min(3).max(200),
  customerName: z.string().max(150).nullable().optional(),
  customerPhone: z.string().max(30).nullable().optional(),
  deviceType: z.string().max(60).nullable().optional(),
  deviceSerial: z.string().max(120).nullable().optional(),
  reportedIssue: z.string().max(2000).nullable().optional(),
  priority: z.enum(ELIAS_WORK_ORDER_PRIORITIES).optional().default("medium"),
  estimatedCost: z.number().min(0).max(10_000_000).nullable().optional(),
});

export type EliasWorkOrderCreate = z.infer<typeof eliasWorkOrderCreateSchema>;

export const eliasWorkOrderStatusSchema = z.enum(ELIAS_WORK_ORDER_STATUSES);

export const eliasWorkOrderUpdateSchema = z.object({
  id: z.number().int().positive(),
  status: eliasWorkOrderStatusSchema,
});

export const eliasWorkOrderListSchema = z.object({
  status: eliasWorkOrderStatusSchema.optional(),
  search: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export const eliasSyncToSupportSchema = z.object({
  id: z.number().int().positive(),
  /** Optional explicit subject override for the platform support ticket. */
  subject: z.string().min(3).max(200).optional(),
});

// ─── Catalogue filters ────────────────────────────────────────────
export const eliasEngineCategorySchema = z.enum(ELIAS_ENGINE_CATEGORIES);

export const eliasEngineListSchema = z.object({
  category: eliasEngineCategorySchema.optional(),
  portableOnly: z.boolean().optional().default(false),
});
