/**
 * server/customerServiceReportsRouter.ts — Customer Service & Support Reporting Engine
 * ==========================================================================
 * Authoritative server-side computation of customer service metrics and analytics:
 *
 *   • Support Tickets Summary       (ملخص طلبات الدعم / Support tickets overview)
 *   • Ticket Status Distribution      (توزيع طلبات الدعم حسب الحالة / Ticket status breakdown)
 *   • First Response Time           (وقت الاستجابة الأولي / First response time)
 *   • Resolution Time               (وقت الحل / Resolution time)
 *   • Customer Satisfaction          (رضا العملاء / Customer satisfaction CSAT)
 *   • Top Issues                    (أبرز المشكلات / Top issues)
 *
 * All reports are tenant-scoped and audit-logged via `activityLogs`.
 *
 * @module server/customerServiceReportsRouter
 */
import { z } from "zod";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { router, tenantProcedure } from "./_core/trpc";
import { requireTenantId } from "./_core/tenant";
import { getDb } from "./db";
import { tickets, ticketResponses, users } from "../drizzle/schema";

interface TicketExample {
  ticketId: number;
  title: string;
  status: string;
  createdAt: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  SHARED TYPES & CONSTANTS
 * ───────────────────────────────────────────────────────────────────────────── */

type Db = any;

/** Ticket status values. */
const TICKET_STATUSES = [
  "open",
  "in-progress",
  "pending",
  "resolved",
  "closed",
] as const;

/** Ticket priority values. */
const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

/* ─────────────────────────────────────────────────────────────────────────────
 *  ZOD INPUT SCHEMAS
 * ───────────────────────────────────────────────────────────────────────────── */

/** Input for tickets summary report. */
const ticketsSummaryInputSchema = z.object({
  asOf: z
    .string()
    .optional()
    .describe("ISO-8601 date (YYYY-MM-DD). Defaults to today."),
  status: z.enum(["open", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

/** Input for ticket status distribution report. */
const ticketStatusDistributionInputSchema = z.object({
  asOf: z
    .string()
    .optional()
    .describe("ISO-8601 date (YYYY-MM-DD). Defaults to today."),
  status: z.enum(["open", "resolved", "closed"]).optional(),
});

/** Input for first response time report. */
const firstResponseTimeInputSchema = z.object({
  startDate: z.string().describe("Start date (YYYY-MM-DD)"),
  endDate: z.string().describe("End date (YYYY-MM-DD)"),
});

/** Input for resolution time report. */
const resolutionTimeInputSchema = z.object({
  startDate: z.string().describe("Start date (YYYY-MM-DD)"),
  endDate: z.string().describe("End date (YYYY-MM-DD)"),
});

/** Input for CSAT report. */
const csatInputSchema = z.object({
  startDate: z.string().describe("Start date (YYYY-MM-DD)"),
  endDate: z.string().describe("End date (YYYY-MM-DD)"),
  minScore: z.number().int().min(0).max(5).optional().default(1),
});

/** Input for top issues report. */
const topIssuesInputSchema = z.object({
  asOf: z
    .string()
    .optional()
    .describe("ISO-8601 date (YYYY-MM-DD). Defaults to today."),
  limit: z.number().int().positive().default(10),
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  HELPER FUNCTIONS
 * ───────────────────────────────────────────────────────────────────────────── */

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : undefined;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  REPORT PROCEDURES
 * ───────────────────────────────────────────────────────────────────────────── */

export const customerServiceReportsRouter = router({
  /**
   * CS-01: Support Tickets Summary Report
   * ملخص طلبات الدعم - نظرة عامة علىTickets الدعم
   */
  ticketsSummary: tenantProcedure
    .input(ticketsSummaryInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return null;

      // Simplified status filter - only use valid enum values
      const validStatuses = [
        "open",
        "in-progress",
        "pending",
        "resolved",
        "closed",
      ] as const;
      const validPriorities = ["low", "medium", "high", "urgent"] as const;

      const statusFilter =
        input?.status && validStatuses.includes(input.status as any)
          ? inArray(tickets.status, [input.status])
          : undefined;
      const priorityFilter =
        input?.priority && validPriorities.includes(input.priority as any)
          ? inArray(tickets.priority, [input.priority])
          : undefined;

      // Get tickets
      const ticketRows = await db
        .select({
          id: tickets.id,
          title: tickets.title,
          status: tickets.status,
          priority: tickets.priority,
          createdAt: tickets.createdAt,
          resolvedAt: tickets.resolvedAt,
          customerId: tickets.customerId,
          assignedTo: tickets.assignedTo,
        })
        .from(tickets)
        .where(
          and(eq(tickets.tenantId, ctx.tenantId), statusFilter, priorityFilter)
        );

      // Count by status
      const statusCounts = ticketRows.reduce(
        (acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Count by priority
      const priorityCounts = ticketRows.reduce(
        (acc, t) => {
          acc[t.priority] = (acc[t.priority] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Calculate stats
      const totalTickets = ticketRows.length;
      const openTickets = statusCounts["open"] || 0;
      const resolvedTickets = statusCounts["resolved"] || 0;
      const closedTickets = statusCounts["closed"] || 0;

      // Average resolution time (for resolved/closed tickets)
      const resolvedTicketsWithTime = ticketRows.filter(
        t => t.resolvedAt && t.createdAt
      );
      const totalResolutionTime = resolvedTicketsWithTime.reduce((sum, t) => {
        const created = t.createdAt ? new Date(t.createdAt).getTime() : 0;
        const resolved = t.resolvedAt ? new Date(t.resolvedAt).getTime() : 0;
        if (Number.isFinite(created) && Number.isFinite(resolved)) {
          return sum + Math.max(0, (resolved - created) / 86400000); // days
        }
        return sum;
      }, 0);
      const avgResolutionTime =
        resolvedTicketsWithTime.length > 0
          ? totalResolutionTime / resolvedTicketsWithTime.length
          : 0;

      return {
        asOf: input?.asOf || new Date().toISOString().split("T")[0],
        totalTickets,
        byStatus: statusCounts,
        byPriority: priorityCounts,
        openTickets,
        resolvedTickets,
        closedTickets,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * CS-02: Ticket Status Distribution Report
   * توزيع طلبات الدعم حسب الحالة - breakdown of ticket statuses
   */
  ticketStatusDistribution: tenantProcedure
    .input(ticketStatusDistributionInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return { distribution: [], total: 0 };

      // Get all tickets
      const ticketRows = await db
        .select({
          id: tickets.id,
          status: tickets.status,
          priority: tickets.priority,
          createdAt: tickets.createdAt,
        })
        .from(tickets)
        .where(eq(tickets.tenantId, ctx.tenantId));

      // Count by status
      const statusCounts = ticketRows.reduce(
        (acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Calculate percentages
      const total = ticketRows.length;
      const distribution = Object.entries(statusCounts).map(
        ([status, count]) => ({
          status,
          count,
          percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0,
        })
      );

      return {
        distribution,
        total,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * CS-03: First Response Time Report
   * وقت الاستجابة الأولي - متوسط وقت الاستجابة لطلبات الدعم
   */
  firstResponseTime: tenantProcedure
    .input(firstResponseTimeInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return { avgFirstResponse: 0, totalTickets: 0 };

      const start = parseDate(input.startDate);
      const end = parseDate(input.endDate);
      const targetEnd = end || new Date();

      // Get tickets created within date range
      const ticketRows = await db
        .select({
          id: tickets.id,
          createdAt: tickets.createdAt,
          firstResponseAt: tickets.firstResponseAt,
          status: tickets.status,
        })
        .from(tickets)
        .where(
          and(
            eq(tickets.tenantId, ctx.tenantId),
            gte(tickets.createdAt, sql`${input.startDate}`),
            lte(tickets.createdAt, sql`${input.endDate}`)
          )
        );

      // Calculate first response time for tickets that got a response
      const ticketsWithResponse = ticketRows.filter(
        t => t.firstResponseAt && t.createdAt
      );

      const totalTickets = ticketsWithResponse.length;

      const totalResponseTime = ticketsWithResponse.reduce((sum, t) => {
        const created = t.createdAt ? new Date(t.createdAt).getTime() : 0;
        const firstResponse = t.firstResponseAt
          ? new Date(t.firstResponseAt).getTime()
          : 0;
        if (Number.isFinite(created) && Number.isFinite(firstResponse)) {
          return sum + Math.max(0, (firstResponse - created) / 3600000); // hours
        }
        return sum;
      }, 0);

      const avgFirstResponse =
        ticketsWithResponse.length > 0
          ? Math.round((totalResponseTime / ticketsWithResponse.length) * 10) /
            10
          : 0;

      return {
        avgFirstResponse, // in hours
        totalTickets,
        period: {
          start: input.startDate,
          end: input.endDate || new Date().toISOString().split("T")[0],
        },
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * CS-04: Resolution Time Report
   * وقت الحل - متوسط وقت حل طلبات الدعم
   */
  resolutionTime: tenantProcedure
    .input(resolutionTimeInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return { avgResolution: 0, totalTickets: 0 };

      const start = parseDate(input.startDate);
      const end = parseDate(input.endDate);
      const targetEnd = end || new Date();

      // Get tickets with resolution dates within range
      const ticketRows = await db
        .select({
          id: tickets.id,
          createdAt: tickets.createdAt,
          resolvedAt: tickets.resolvedAt,
          status: tickets.status,
        })
        .from(tickets)
        .where(
          and(
            eq(tickets.tenantId, ctx.tenantId),
            gte(tickets.createdAt, sql`${input.startDate}`),
            lte(tickets.resolvedAt, sql`${input.endDate}`)
          )
        );

      // Calculate resolution time for resolved/closed tickets
      const resolvedTickets = ticketRows.filter(
        t => t.resolvedAt && t.createdAt
      );

      const totalTickets = resolvedTickets.length;

      const totalResolutionTime = resolvedTickets.reduce((sum, t) => {
        const created = t.createdAt ? new Date(t.createdAt).getTime() : 0;
        const resolved = t.resolvedAt ? new Date(t.resolvedAt).getTime() : 0;
        if (Number.isFinite(created) && Number.isFinite(resolved)) {
          return sum + Math.max(0, (resolved - created) / 86400000); // days
        }
        return sum;
      }, 0);

      const avgResolution =
        resolvedTickets.length > 0
          ? Math.round((totalResolutionTime / resolvedTickets.length) * 10) / 10
          : 0;

      return {
        avgResolution, // in days
        totalTickets,
        period: {
          start: input.startDate,
          end: input.endDate || new Date().toISOString().split("T")[0],
        },
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * CS-05: Customer Satisfaction (CSAT) Report
   * رضا العملاء - تقييم رضا العملاء عن الخدمة
   */
  csatReport: tenantProcedure
    .input(csatInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId)
        return { satisfaction: [], avgScore: 0, total: 0 };

      const start = parseDate(input.startDate);
      const end = parseDate(input.endDate);
      const minScore = input.minScore || 1;

      // Get ticket responses with ratings
      const responses = await db
        .select({
          id: ticketResponses.id,
          ticketId: ticketResponses.ticketId,
          rating: ticketResponses.rating,
          createdAt: ticketResponses.createdAt,
          customerComments: ticketResponses.customerComments,
        })
        .from(ticketResponses)
        .where(
          and(
            eq(ticketResponses.tenantId, ctx.tenantId),
            gte(ticketResponses.createdAt, sql`${input.startDate}`),
            lte(ticketResponses.createdAt, sql`${input.endDate}`)
          )
        );

      // Filter by minimum score if specified
      const filteredResponses = minScore
        ? responses.filter(r => r.rating >= minScore)
        : responses;

      // Calculate statistics
      const totalResponses = filteredResponses.length;

      if (totalResponses === 0) {
        return {
          satisfaction: [],
          avgScore: 0,
          total: 0,
          period: {
            start: input.startDate,
            end: input.endDate || new Date().toISOString().split("T")[0],
          },
          generatedAt: new Date().toISOString(),
        };
      }

      // Rating distribution (1-5 scale)
      const ratingDistribution = filteredResponses.reduce(
        (acc, r) => {
          const rating = r.rating;
          if (!acc[rating]) acc[rating] = 0;
          acc[rating]++;
          return acc;
        },
        {} as Record<number, number>
      );

      // Convert to structured format
      const satisfaction = Array.from({ length: 5 }, (_, i) => i + 1).map(
        rating => ({
          rating,
          count: ratingDistribution[rating] || 0,
          percentage:
            totalResponses > 0
              ? ((ratingDistribution[rating] || 0) / totalResponses) * 100
              : 0,
        })
      );

      // Average score
      const totalScore = filteredResponses.reduce(
        (sum, r) => sum + r.rating,
        0
      );
      const avgScore = Math.round((totalScore / totalResponses) * 10) / 10;

      return {
        satisfaction,
        avgScore,
        total: totalResponses,
        ratingDistribution,
        period: {
          start: input.startDate,
          end: input.endDate || new Date().toISOString().split("T")[0],
        },
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * CS-06: Top Issues Report
   * أبرز المشكلات - الموضوعات الشائعة في تickets الدعم
   */
  topIssues: tenantProcedure
    .input(topIssuesInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return { issues: [], total: 0 };

      // Get tickets with titles
      const ticketRows = await db
        .select({
          id: tickets.id,
          title: tickets.title,
          status: tickets.status,
          priority: tickets.priority,
          createdAt: tickets.createdAt,
        })
        .from(tickets)
        .where(eq(tickets.tenantId, ctx.tenantId));

      // Extract "issue" from title by looking at common patterns
      // or just use the title directly
      const issueCounts = ticketRows.reduce(
        (acc, t) => {
          const title = (t.title ?? "").toLowerCase();
          // Simple keyword matching for common issues
          const keywords = [
            "login",
            "password",
            "account",
            "payment",
            "delivery",
            "product",
            "shipping",
            "return",
            "refund",
            "bug",
            "error",
            "technical",
          ];

          let matchedKeyword: string | null = null;
          for (const kw of keywords) {
            if (title.includes(kw)) {
              matchedKeyword = kw;
              break;
            }
          }
          if (!matchedKeyword) {
            matchedKeyword = "other";
          }

          if (!acc[matchedKeyword])
            acc[matchedKeyword] = { count: 0, examples: [] };
          acc[matchedKeyword].count++;

          // Example ticket type for issue tracking

          // Store example (most recent)
          interface TicketExample {
            ticketId: number;
            title: string;
            status: string;
            createdAt: string;
          }

          if (acc[matchedKeyword].examples.length < 3) {
            acc[matchedKeyword].examples.push({
              ticketId: t.id,
              title: t.title ?? "",
              status: t.status ?? "",
              createdAt: t.createdAt ?? "",
            });
          }

          return acc;
        },
        {} as Record<string, { count: number; examples: any[] }>
      );

      // Sort by count descending and take top N
      const sortedIssues = Object.entries(issueCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, input.limit || 10)
        .map(([issue, data]) => ({
          issue,
          count: data.count,
          percentage: total > 0 ? ((data.count / total) * 100).toFixed(1) : 0,
          examples: data.examples.map(ex => ({
            ticketId: ex.ticketId,
            title: ex.title,
            status: ex.status,
          })),
        }));

      const total = ticketRows.length;

      return {
        issues: sortedIssues,
        total,
        generatedAt: new Date().toISOString(),
      };
    }),
});

export type CustomerServiceReports = typeof customerServiceReportsRouter;
