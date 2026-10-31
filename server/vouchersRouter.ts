/**
 * Vouchers Router - Standard International Methodology
 *
 * Implements payment and receipt vouchers with:
 * - International accounting standards (GAAP/IFRS aligned)
 * - Management accounting principles
 * - Multi-level approval workflow
 * - Budget validation and cost center allocation
 * - Comprehensive audit trail
 *
 * Workflow: Draft → Pending → Approved → Posted
 * Supports: Payment, Receipt, Journal, and Adjustment vouchers
 */

import {
  router,
  tenantProcedure,
  adminProcedure,
  publicProcedure,
  requirePermissions,
} from "./_core/trpc";
import { PERMISSIONS } from "../shared/permissions";
import { eq, and, desc, asc, gte, lte, sql, isNull, or } from "drizzle-orm";
import { z } from "zod";
import {
  vouchers,
  voucherLines,
  voucherApprovals,
  voucherSequences,
  accounts,
  transactions,
  journalEntries,
  costCenters,
  departments,
  projects,
  budgets,
  budgetLines,
  customers,
  suppliers,
  employees,
  currencies,
  branches,
  activityLogs,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { getTenantConfig } from "./routers";
import { requireTenantId } from "./_core/tenant";
import { assertPeriodOpen } from "./services/accountingEngine";
import { recordAuditEvent } from "./_core/audit";

// Voucher type enum for reference
const voucherTypeSchema = z.enum([
  "payment",
  "receipt",
  "journal",
  "adjustment",
]);
const voucherStatusSchema = z.enum([
  "draft",
  "pending",
  "approved",
  "rejected",
  "posted",
  "cancelled",
]);
const approvalLevelSchema = z.enum([
  "none",
  "level1",
  "level2",
  "level3",
  "final",
]);

// Generate next voucher number based on sequence
async function generateVoucherNumber(
  tx: any,
  tenantId: number,
  voucherType: string
): Promise<{ prefix: string; number: string }> {
  // Get or create sequence
  let seq = await tx
    .select()
    .from(voucherSequences)
    .where(
      and(
        eq(voucherSequences.tenantId, tenantId),
        eq(voucherSequences.voucherType, voucherType as any)
      )
    )
    .limit(1);

  if (seq.length === 0) {
    // Create default sequence
    const defaultPrefix =
      voucherType === "payment"
        ? "PAY"
        : voucherType === "receipt"
          ? "REC"
          : voucherType === "journal"
            ? "JNL"
            : "ADJ";

    const [newSeq] = await tx
      .insert(voucherSequences)
      .values({
        tenantId,
        voucherType: voucherType as any,
        prefix: defaultPrefix,
        format: "{PREFIX}/{YYYY}/{NNNNNN}",
        currentNumber: 0,
        resetPeriod: "yearly",
        numberPadding: 6,
        isActive: true,
      })
      .returning();

    seq = [newSeq];
  }

  const currentSeq = seq[0];
  const newNumber = currentSeq.currentNumber + 1;

  // Update sequence
  await tx
    .update(voucherSequences)
    .set({
      currentNumber: newNumber,
      updatedAt: new Date(),
    })
    .where(eq(voucherSequences.id, currentSeq.id));

  // Format the number
  const now = new Date();
  const year = now.getFullYear();
  const paddedNumber = newNumber
    .toString()
    .padStart(currentSeq.numberPadding, "0");
  const formattedNumber = currentSeq.format
    .replace("{PREFIX}", currentSeq.prefix)
    .replace("{YYYY}", year.toString())
    .replace("{YY}", year.toString().slice(-2))
    .replace("{MM}", (now.getMonth() + 1).toString().padStart(2, "0"))
    .replace("{DD}", now.getDate().toString().padStart(2, "0"))
    .replace("{NNNNNN}", paddedNumber);

  return { prefix: currentSeq.prefix, number: formattedNumber };
}

// Validate voucher lines balance (debits = credits)
function validateVoucherLines(lines: any[]): void {
  const totalDebits = lines.reduce(
    (sum, l) => sum + parseFloat(l.debitAmount || "0"),
    0
  );
  const totalCredits = lines.reduce(
    (sum, l) => sum + parseFloat(l.creditAmount || "0"),
    0
  );

  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    throw new Error(
      `القيود غير متوازنة: مجموع المدين ${totalDebits} ≠ مجموع الدائن ${totalCredits}`
    );
  }
}

// Determine required approval levels based on amount thresholds
function getRequiredApprovalLevels(
  amount: number,
  config: any
): {
  requiresLevel1: boolean;
  requiresLevel2: boolean;
  requiresLevel3: boolean;
} {
  const thresholds = config.voucherApprovalThresholds || {
    level1: 1000, // Supervisor approval
    level2: 10000, // Manager approval
    level3: 50000, // Director approval
  };

  return {
    requiresLevel1: amount >= thresholds.level1,
    requiresLevel2: amount >= thresholds.level2,
    requiresLevel3: amount >= thresholds.level3,
  };
}

// Post voucher to GL (double-entry)
async function postVoucherToGl(
  tx: any,
  voucher: any,
  lines: any[],
  userId: number | null
): Promise<number> {
  // Create journal entry
  const totalAmount = parseFloat(voucher.amount);
  const [journalEntry] = await tx
    .insert(journalEntries)
    .values({
      tenantId: voucher.tenantId,
      branchId: voucher.branchId,
      sourceModule: "vouchers",
      sourceRefType: voucher.voucherType,
      sourceRefId: voucher.id,
      referenceNo: voucher.voucherNumber,
      status: "posted",
      totalAmount: totalAmount.toFixed(4),
      description: voucher.description,
      createdById: userId,
      postedAt: new Date(),
    })
    .returning();

  // Create transaction lines
  for (const line of lines) {
    const debitAmount = parseFloat(line.debitAmount || "0");
    const creditAmount = parseFloat(line.creditAmount || "0");

    if (debitAmount > 0) {
      await tx.insert(transactions).values({
        tenantId: voucher.tenantId,
        accountId: line.accountId,
        branchId: voucher.branchId,
        amount: debitAmount.toFixed(4),
        type: "debit",
        transactionDate: voucher.voucherDate,
        narration: line.description || voucher.description,
        lifecycleStatus: "posted",
        referenceType: "voucher",
        referenceId: voucher.id,
        sourceModule: "vouchers",
        journalEntryId: journalEntry.id,
        userId,
        // Management accounting
        costCenterId: line.costCenterId,
        departmentId: line.departmentId,
        projectId: line.projectId,
      });
    }

    if (creditAmount > 0) {
      await tx.insert(transactions).values({
        tenantId: voucher.tenantId,
        accountId: line.accountId,
        branchId: voucher.branchId,
        amount: creditAmount.toFixed(4),
        type: "credit",
        transactionDate: voucher.voucherDate,
        narration: line.description || voucher.description,
        lifecycleStatus: "posted",
        referenceType: "voucher",
        referenceId: voucher.id,
        sourceModule: "vouchers",
        journalEntryId: journalEntry.id,
        userId,
        // Management accounting
        costCenterId: line.costCenterId,
        departmentId: line.departmentId,
        projectId: line.projectId,
      });
    }
  }

  return journalEntry.id;
}

export const vouchersRouter = router({
  // ─── Voucher Numbering Sequences ──────────────────────────────────
  getSequences: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return await db
      .select()
      .from(voucherSequences)
      .where(eq(voucherSequences.tenantId, ctx.tenantId!))
      .orderBy(voucherSequences.voucherType);
  }),

  // ─── Create Voucher ────────────────────────────────────────────────
  create: tenantProcedure
    .use(requirePermissions(PERMISSIONS.VOUCHERS_CREATE))
    .input(
      z.object({
        voucherType: voucherTypeSchema,
        voucherDate: z.string(),
        dueDate: z.string().optional(),
        amount: z.string().refine(v => {
          const n = parseFloat(v);
          return !isNaN(n) && n > 0;
        }, "المبلغ يجب أن يكون رقماً موجباً"),
        currencyId: z.number().optional(),
        exchangeRate: z.string().optional(),

        counterpartyType: z
          .enum(["customer", "supplier", "employee", "other"])
          .optional(),
        counterpartyId: z.number().optional(),
        counterpartyName: z.string().optional(),

        bankAccountId: z.number().optional(),
        bankAccountCode: z.string().optional(),

        referenceNo: z.string().optional(),
        referenceType: z.string().optional(),
        referenceId: z.number().optional(),

        departmentId: z.number().optional(),
        projectId: z.number().optional(),
        costCenterId: z.number().optional(),
        businessUnit: z.string().optional(),

        budgetId: z.number().optional(),
        budgetLineId: z.number().optional(),

        description: z.string().optional(),
        notes: z.string().optional(),
        internalMemo: z.string().optional(),

        branchId: z.number().optional(),

        lines: z
          .array(
            z.object({
              accountId: z.number(),
              accountCode: z.string(),
              accountName: z.string().optional(),
              debitAmount: z.string().default("0"),
              creditAmount: z.string().default("0"),
              costCenterId: z.number().optional(),
              departmentId: z.number().optional(),
              projectId: z.number().optional(),
              allocationPercentage: z.string().optional(),
              description: z.string().optional(),
              reference: z.string().optional(),
            })
          )
          .min(1, "يجب إدخال سطر محاسبي واحد على الأقل"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("يجب إنشاء مؤسسة أولاً");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validate lines balance
      validateVoucherLines(input.lines);

      // Get tenant config for approval thresholds
      const config = await getTenantConfig(db, ctx.tenantId);
      const approvalLevels = getRequiredApprovalLevels(
        parseFloat(input.amount),
        config
      );

      return await (db as any).transaction(async (tx: any) => {
        // Generate voucher number
        const { prefix, number } = await generateVoucherNumber(
          tx,
          ctx.tenantId!,
          input.voucherType
        );

        // Get default currency and exchange rate
        let currencyId = input.currencyId;
        let exchangeRate = parseFloat(input.exchangeRate || "1");
        let baseAmount = parseFloat(input.amount);

        if (!currencyId) {
          const defaultCurrency = await tx
            .select()
            .from(currencies)
            .where(eq(currencies.isDefault, true))
            .limit(1);
          currencyId = defaultCurrency[0]?.id;
          exchangeRate = 1;
          baseAmount = parseFloat(input.amount);
        } else if (exchangeRate !== 1) {
          baseAmount = parseFloat(input.amount) * exchangeRate;
        }

        // Get default branch if not specified
        let branchId = input.branchId;
        if (!branchId) {
          const mainBranch = await tx
            .select()
            .from(branches)
            .where(
              and(
                eq(branches.tenantId, ctx.tenantId!),
                eq(branches.isMain, true)
              )
            )
            .limit(1);
          branchId = mainBranch[0]?.id;
        }

        // Create voucher
        const [voucher] = await tx
          .insert(vouchers)
          .values({
            tenantId: ctx.tenantId!,
            voucherNumber: number,
            voucherPrefix: prefix,
            voucherType: input.voucherType,
            status: "draft",
            voucherDate: new Date(input.voucherDate),
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            amount: input.amount,
            baseAmount: baseAmount.toFixed(4),
            currencyId,
            exchangeRate: exchangeRate.toString(),

            counterpartyType: input.counterpartyType,
            counterpartyId: input.counterpartyId,
            counterpartyName: input.counterpartyName,

            bankAccountId: input.bankAccountId,
            bankAccountCode: input.bankAccountCode,

            referenceNo: input.referenceNo,
            referenceType: input.referenceType,
            referenceId: input.referenceId,

            departmentId: input.departmentId,
            projectId: input.projectId,
            costCenterId: input.costCenterId,
            businessUnit: input.businessUnit,

            budgetId: input.budgetId,
            budgetLineId: input.budgetLineId,
            budgetValidated: false,

            requiresLevel1Approval: approvalLevels.requiresLevel1,
            requiresLevel2Approval: approvalLevels.requiresLevel2,
            requiresLevel3Approval: approvalLevels.requiresLevel3,
            approvalLevel: "none",

            description: input.description,
            notes: input.notes,
            internalMemo: input.internalMemo,

            branchId,

            createdById: ctx.user.id,
            updatedById: ctx.user.id,
          })
          .returning();

        // Create voucher lines
        for (let i = 0; i < input.lines.length; i++) {
          const line = input.lines[i];
          const debitAmount = parseFloat(line.debitAmount || "0");
          const creditAmount = parseFloat(line.creditAmount || "0");
          const allocPct = parseFloat(line.allocationPercentage || "100");

          await tx.insert(voucherLines).values({
            tenantId: ctx.tenantId!,
            voucherId: voucher.id,
            accountId: line.accountId,
            accountCode: line.accountCode,
            accountName: line.accountName,
            debitAmount: debitAmount.toFixed(4),
            creditAmount: creditAmount.toFixed(4),
            costCenterId: line.costCenterId || input.costCenterId,
            departmentId: line.departmentId || input.departmentId,
            projectId: line.projectId || input.projectId,
            allocationPercentage: allocPct.toString(),
            allocatedAmount: (
              ((debitAmount || creditAmount) * allocPct) /
              100
            ).toFixed(4),
            description: line.description,
            reference: line.reference,
            lineOrder: i,
          });
        }

        // Log activity
        await tx.insert(activityLogs).values({
          tenantId: ctx.tenantId!,
          userId: ctx.user.id,
          action: `إنشاء قيد ${input.voucherType === "payment" ? "صرف" : input.voucherType === "receipt" ? "قبض" : "يومية"} رقم ${number}`,
          details: `المبلغ: ${input.amount}`,
        });

        // Audit log
        await recordAuditEvent(ctx, {
          action: "VOUCHER_CREATED",
          resourceType: "voucher",
          resourceId: String(voucher.id),
          after: {
            id: voucher.id,
            voucherNumber: number,
            voucherType: input.voucherType,
            status: "draft",
            amount: input.amount,
            voucherDate: input.voucherDate,
          },
          metadata: { route: "vouchers.create" },
        });

        return { voucherId: voucher.id, voucherNumber: number };
      });
    }),

  // ─── Get Single Voucher ────────────────────────────────────────────
  get: tenantProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const voucher = await db
        .select()
        .from(vouchers)
        .where(
          and(eq(vouchers.id, input.id), eq(vouchers.tenantId, ctx.tenantId!))
        )
        .limit(1);

      if (!voucher[0]) return null;

      const lines = await db
        .select()
        .from(voucherLines)
        .where(eq(voucherLines.voucherId, input.id))
        .orderBy(voucherLines.lineOrder);

      const approvals = await db
        .select()
        .from(voucherApprovals)
        .where(eq(voucherApprovals.voucherId, input.id))
        .orderBy(desc(voucherApprovals.createdAt));

      return { ...voucher[0], lines, approvals };
    }),

  // ─── List Vouchers ─────────────────────────────────────────────────
  list: tenantProcedure
    .input(
      z
        .object({
          type: voucherTypeSchema.optional(),
          status: voucherStatusSchema.optional(),
          fromDate: z.string().optional(),
          toDate: z.string().optional(),
          counterpartyType: z.string().optional(),
          counterpartyId: z.number().optional(),
          departmentId: z.number().optional(),
          projectId: z.number().optional(),
          costCenterId: z.number().optional(),
          search: z.string().optional(),
          page: z.number().default(1),
          pageSize: z.number().default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const conditions = [eq(vouchers.tenantId, ctx.tenantId!)];

      if (input?.type) {
        conditions.push(eq(vouchers.voucherType, input.type));
      }
      if (input?.status) {
        conditions.push(eq(vouchers.status, input.status));
      }
      if (input?.fromDate) {
        conditions.push(gte(vouchers.voucherDate, new Date(input.fromDate)));
      }
      if (input?.toDate) {
        conditions.push(lte(vouchers.voucherDate, new Date(input.toDate)));
      }
      if (input?.counterpartyType) {
        conditions.push(eq(vouchers.counterpartyType, input.counterpartyType));
      }
      if (input?.counterpartyId) {
        conditions.push(eq(vouchers.counterpartyId, input.counterpartyId));
      }
      if (input?.departmentId) {
        conditions.push(eq(vouchers.departmentId, input.departmentId));
      }
      if (input?.projectId) {
        conditions.push(eq(vouchers.projectId, input.projectId));
      }
      if (input?.costCenterId) {
        conditions.push(eq(vouchers.costCenterId, input.costCenterId));
      }
      if (input?.search) {
        const searchPattern = `%${input.search}%`;
        const searchCond = or(
          sql`${vouchers.voucherNumber} ILIKE ${searchPattern}`,
          sql`${vouchers.description} ILIKE ${searchPattern}`,
          sql`${vouchers.counterpartyName} ILIKE ${searchPattern}`
        );
        if (searchCond) conditions.push(searchCond);
      }

      const offset = ((input?.page || 1) - 1) * (input?.pageSize || 20);

      const items = await db
        .select()
        .from(vouchers)
        .where(and(...conditions))
        .orderBy(desc(vouchers.voucherDate), desc(vouchers.id))
        .limit(input?.pageSize || 20)
        .offset(offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(vouchers)
        .where(and(...conditions));

      return {
        items,
        total: totalResult?.count || 0,
        page: input?.page || 1,
        pageSize: input?.pageSize || 20,
      };
    }),

  // ─── Update Voucher ────────────────────────────────────────────────
  update: tenantProcedure
    .input(
      z.object({
        id: z.number(),
        voucherDate: z.string().optional(),
        dueDate: z.string().optional(),
        amount: z.string().optional(),
        currencyId: z.number().optional(),
        exchangeRate: z.string().optional(),

        counterpartyType: z
          .enum(["customer", "supplier", "employee", "other"])
          .optional(),
        counterpartyId: z.number().optional(),
        counterpartyName: z.string().optional(),

        bankAccountId: z.number().optional(),
        bankAccountCode: z.string().optional(),

        referenceNo: z.string().optional(),
        referenceType: z.string().optional(),
        referenceId: z.number().optional(),

        departmentId: z.number().optional(),
        projectId: z.number().optional(),
        costCenterId: z.number().optional(),
        businessUnit: z.string().optional(),

        description: z.string().optional(),
        notes: z.string().optional(),
        internalMemo: z.string().optional(),

        lines: z
          .array(
            z.object({
              id: z.number().optional(),
              accountId: z.number(),
              accountCode: z.string(),
              accountName: z.string().optional(),
              debitAmount: z.string().default("0"),
              creditAmount: z.string().default("0"),
              costCenterId: z.number().optional(),
              departmentId: z.number().optional(),
              projectId: z.number().optional(),
              allocationPercentage: z.string().optional(),
              description: z.string().optional(),
              reference: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("يجب إنشاء مؤسسة أولاً");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get existing voucher
      const existing = await db
        .select()
        .from(vouchers)
        .where(
          and(eq(vouchers.id, input.id), eq(vouchers.tenantId, ctx.tenantId!))
        )
        .limit(1);

      if (!existing[0]) throw new Error("القيود غير موجود");
      if (existing[0].status !== "draft") {
        throw new Error("لا يمكن تعديل قيد غير مسودة");
      }

      return await (db as any).transaction(async (tx: any) => {
        const updateData: any = {
          updatedById: ctx.user.id,
          updatedAt: new Date(),
        };

        if (input.voucherDate)
          updateData.voucherDate = new Date(input.voucherDate);
        if (input.dueDate) updateData.dueDate = new Date(input.dueDate);
        if (input.amount) {
          updateData.amount = input.amount;
          const config = await getTenantConfig(tx, ctx.tenantId!);
          const approvalLevels = getRequiredApprovalLevels(
            parseFloat(input.amount),
            config
          );
          updateData.requiresLevel1Approval = approvalLevels.requiresLevel1;
          updateData.requiresLevel2Approval = approvalLevels.requiresLevel2;
          updateData.requiresLevel3Approval = approvalLevels.requiresLevel3;
        }
        if (input.currencyId) updateData.currencyId = input.currencyId;
        if (input.exchangeRate) updateData.exchangeRate = input.exchangeRate;
        if (input.counterpartyType)
          updateData.counterpartyType = input.counterpartyType;
        if (input.counterpartyId)
          updateData.counterpartyId = input.counterpartyId;
        if (input.counterpartyName)
          updateData.counterpartyName = input.counterpartyName;
        if (input.bankAccountId) updateData.bankAccountId = input.bankAccountId;
        if (input.bankAccountCode)
          updateData.bankAccountCode = input.bankAccountCode;
        if (input.referenceNo) updateData.referenceNo = input.referenceNo;
        if (input.referenceType) updateData.referenceType = input.referenceType;
        if (input.referenceId) updateData.referenceId = input.referenceId;
        if (input.departmentId) updateData.departmentId = input.departmentId;
        if (input.projectId) updateData.projectId = input.projectId;
        if (input.costCenterId) updateData.costCenterId = input.costCenterId;
        if (input.businessUnit) updateData.businessUnit = input.businessUnit;
        if (input.description !== undefined)
          updateData.description = input.description;
        if (input.notes !== undefined) updateData.notes = input.notes;
        if (input.internalMemo !== undefined)
          updateData.internalMemo = input.internalMemo;

        await tx
          .update(vouchers)
          .set(updateData)
          .where(
            and(eq(vouchers.id, input.id), eq(vouchers.tenantId, ctx.tenantId!))
          );

        // Update lines if provided
        if (input.lines) {
          validateVoucherLines(input.lines);

          // Delete existing lines
          await tx
            .delete(voucherLines)
            .where(eq(voucherLines.voucherId, input.id));

          // Insert new lines
          for (let i = 0; i < input.lines.length; i++) {
            const line = input.lines[i];
            await tx.insert(voucherLines).values({
              tenantId: ctx.tenantId!,
              voucherId: input.id,
              accountId: line.accountId,
              accountCode: line.accountCode,
              accountName: line.accountName,
              debitAmount: line.debitAmount || "0",
              creditAmount: line.creditAmount || "0",
              costCenterId: line.costCenterId,
              departmentId: line.departmentId,
              projectId: line.projectId,
              allocationPercentage: line.allocationPercentage || "100",
              description: line.description,
              reference: line.reference,
              lineOrder: i,
            });
          }
        }

        await tx.insert(activityLogs).values({
          tenantId: ctx.tenantId!,
          userId: ctx.user.id,
          action: `تعديل قيد ${existing[0].voucherNumber}`,
          details: input.amount ? `تغيير المبلغ إلى ${input.amount}` : "",
        });

        return { success: true };
      });
    }),

  // ─── Submit for Approval ────────────────────────────────────────────
  submit: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("يجب إنشاء مؤسسة أولاً");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const voucher = await db
        .select()
        .from(vouchers)
        .where(
          and(eq(vouchers.id, input.id), eq(vouchers.tenantId, ctx.tenantId!))
        )
        .limit(1);

      if (!voucher[0]) throw new Error("القيود غير موجود");
      if (voucher[0].status !== "draft") {
        throw new Error("يمكن تقديم المسودات فقط للمراجعة");
      }

      // Get lines and validate balance
      const lines = await db
        .select()
        .from(voucherLines)
        .where(eq(voucherLines.voucherId, input.id));

      if (lines.length === 0) {
        throw new Error("يجب إدخال سطر محاسبي واحد على الأقل");
      }

      validateVoucherLines(lines);

      return await (db as any).transaction(async (tx: any) => {
        await tx
          .update(vouchers)
          .set({
            status: "pending",
            updatedAt: new Date(),
            updatedById: ctx.user.id,
          })
          .where(eq(vouchers.id, input.id));

        await tx.insert(voucherApprovals).values({
          tenantId: ctx.tenantId!,
          voucherId: input.id,
          approvalLevel: "none",
          action: "submitted",
          newStatus: "pending",
          approverId: ctx.user.id,
          approverName: ctx.user.name || ctx.user.email,
        });

        await tx.insert(activityLogs).values({
          tenantId: ctx.tenantId!,
          userId: ctx.user.id,
          action: `تقديم قيد ${voucher[0].voucherNumber} للمراجعة`,
          details: "",
        });

        return { success: true };
      });
    }),

  // ─── Approve Voucher ───────────────────────────────────────────────
  approve: tenantProcedure
    .use(requirePermissions(PERMISSIONS.VOUCHERS_APPROVE))
    .input(
      z.object({
        id: z.number(),
        level: approvalLevelSchema,
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("يجب إنشاء مؤسسة أولاً");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const voucher = await db
        .select()
        .from(vouchers)
        .where(
          and(eq(vouchers.id, input.id), eq(vouchers.tenantId, ctx.tenantId!))
        )
        .limit(1);

      if (!voucher[0]) throw new Error("القيود غير موجود");
      if (voucher[0].status !== "pending") {
        throw new Error("يمكن اعتماد المعلقات فقط");
      }

      // Check if this level approval is required
      const canApprove =
        (input.level === "level1" && voucher[0].requiresLevel1Approval) ||
        (input.level === "level2" && voucher[0].requiresLevel2Approval) ||
        (input.level === "level3" && voucher[0].requiresLevel3Approval) ||
        input.level === "final";

      if (!canApprove) {
        throw new Error(`لا يتطلب هذا القيد اعتماد المستوى ${input.level}`);
      }

      return await (db as any).transaction(async (tx: any) => {
        // Capture before state
        const beforeState = { ...voucher[0] };

        // Update voucher
        await tx
          .update(vouchers)
          .set({
            approvalLevel: input.level,
            approvedById: ctx.user.id,
            approvedAt: new Date(),
            status: "approved",
            updatedAt: new Date(),
            updatedById: ctx.user.id,
          })
          .where(eq(vouchers.id, input.id));

        // Log approval
        await tx.insert(voucherApprovals).values({
          tenantId: ctx.tenantId!,
          voucherId: input.id,
          approvalLevel: input.level,
          action: "approved",
          approverId: ctx.user.id,
          approverName: ctx.user.name || ctx.user.email,
          comments: input.comments,
          previousStatus: "pending",
          newStatus: "approved",
        });

        await tx.insert(activityLogs).values({
          tenantId: ctx.tenantId!,
          userId: ctx.user.id,
          action: `اعتماد قيد ${voucher[0].voucherNumber} - المستوى ${input.level}`,
          details: input.comments || "",
        });

        // Audit log
        await recordAuditEvent(ctx, {
          action: "VOUCHER_APPROVED",
          resourceType: "voucher",
          resourceId: String(input.id),
          before: {
            status: beforeState.status,
            approvalLevel: beforeState.approvalLevel,
          },
          after: {
            status: "approved",
            approvalLevel: input.level,
            approvedById: ctx.user.id,
            approvedAt: new Date().toISOString(),
          },
          metadata: { route: "vouchers.approve", level: input.level },
        });

        return { success: true };
      });
    }),

  // ─── Reject Voucher ────────────────────────────────────────────────
  reject: tenantProcedure
    .use(requirePermissions(PERMISSIONS.VOUCHERS_REJECT))
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(1, "يجب إدخال سبب الرفض"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("يجب إنشاء مؤسسة أولاً");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const voucher = await db
        .select()
        .from(vouchers)
        .where(
          and(eq(vouchers.id, input.id), eq(vouchers.tenantId, ctx.tenantId!))
        )
        .limit(1);

      if (!voucher[0]) throw new Error("القيود غير موجود");
      if (voucher[0].status !== "pending") {
        throw new Error("يمكن رفض المعلقات فقط");
      }

      return await (db as any).transaction(async (tx: any) => {
        await tx
          .update(vouchers)
          .set({
            status: "rejected",
            rejectedById: ctx.user.id,
            rejectedAt: new Date(),
            rejectionReason: input.reason,
            updatedAt: new Date(),
            updatedById: ctx.user.id,
          })
          .where(eq(vouchers.id, input.id));

        await tx.insert(voucherApprovals).values({
          tenantId: ctx.tenantId!,
          voucherId: input.id,
          approvalLevel: "none",
          action: "rejected",
          approverId: ctx.user.id,
          approverName: ctx.user.name || ctx.user.email,
          comments: input.reason,
          previousStatus: "pending",
          newStatus: "rejected",
        });

        await tx.insert(activityLogs).values({
          tenantId: ctx.tenantId!,
          userId: ctx.user.id,
          action: `رفض قيد ${voucher[0].voucherNumber}`,
          details: `السبب: ${input.reason}`,
        });

        return { success: true };
      });
    }),

  // ─── Post Voucher (Post to GL) ─────────────────────────────────────
  post: tenantProcedure
    .use(requirePermissions(PERMISSIONS.VOUCHERS_POST))
    .input(
      z.object({
        id: z.number(),
        validateBudget: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("يجب إنشاء مؤسسة أولاً");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const voucher = await db
        .select()
        .from(vouchers)
        .where(
          and(eq(vouchers.id, input.id), eq(vouchers.tenantId, ctx.tenantId!))
        )
        .limit(1);

      if (!voucher[0]) throw new Error("القيود غير موجود");
      if (voucher[0].status !== "approved") {
        throw new Error("يجب اعتماد القيد أولاً قبل الترحيل");
      }

      // Budget validation
      if (input.validateBudget && voucher[0].budgetLineId) {
        const budgetLine = await db
          .select()
          .from(budgetLines)
          .where(eq(budgetLines.id, voucher[0].budgetLineId))
          .limit(1);

        if (budgetLine[0]) {
          const budgetAmount = parseFloat(budgetLine[0].amount || "0");
          const spentAmount = parseFloat(budgetLine[0].spentAmount || "0");
          const voucherAmount = parseFloat(voucher[0].amount);

          if (spentAmount + voucherAmount > budgetAmount) {
            const variance = spentAmount + voucherAmount - budgetAmount;
            throw new Error(
              `تجاوز الميزانية: المبلغ المطلوب ${voucherAmount} + المنصرف ${spentAmount} = ${spentAmount + voucherAmount} > الميزانية ${budgetAmount}. تجاوز: ${variance}`
            );
          }
        }
      }

      const lines = await db
        .select()
        .from(voucherLines)
        .where(eq(voucherLines.voucherId, input.id));

      // Validate period is open before posting
      const tenantId = requireTenantId(ctx);
      const txDate = new Date(voucher[0].voucherDate);
      try {
        await assertPeriodOpen(
          db,
          tenantId,
          txDate,
          `voucher_${voucher[0].voucherNumber}`
        );
      } catch (e: any) {
        throw new Error(
          `لا يمكن ترحيل القيد: ${e?.message || "الفترة المالية غير مفتوحة"}`,
          { cause: e }
        );
      }

      return await (db as any).transaction(async (tx: any) => {
        // Post to GL
        const journalEntryId = await postVoucherToGl(
          tx,
          voucher[0],
          lines,
          ctx.user.id
        );

        // Update voucher status
        await tx
          .update(vouchers)
          .set({
            status: "posted",
            postedById: ctx.user.id,
            postingDate: new Date(),
            journalEntryId,
            updatedAt: new Date(),
            updatedById: ctx.user.id,
          })
          .where(eq(vouchers.id, input.id));

        // Update budget spent amount if applicable
        if (voucher[0].budgetLineId) {
          const voucherAmount = parseFloat(voucher[0].amount);
          await tx
            .update(budgetLines)
            .set({
              spentAmount: sql`${budgetLines.spentAmount} + ${voucherAmount}`,
            })
            .where(eq(budgetLines.id, voucher[0].budgetLineId));
        }

        // Update counterparty balance
        if (voucher[0].counterpartyType && voucher[0].counterpartyId) {
          const amount = parseFloat(voucher[0].amount);
          if (voucher[0].voucherType === "payment") {
            // Payment decreases counterparty balance (we paid them)
            if (voucher[0].counterpartyType === "customer") {
              await tx
                .update(customers)
                .set({ balance: sql`${customers.balance} - ${amount}` })
                .where(eq(customers.id, voucher[0].counterpartyId));
            } else if (voucher[0].counterpartyType === "supplier") {
              await tx
                .update(suppliers)
                .set({ balance: sql`${suppliers.balance} - ${amount}` })
                .where(eq(suppliers.id, voucher[0].counterpartyId));
            }
          } else if (voucher[0].voucherType === "receipt") {
            // Receipt increases counterparty balance (they paid us)
            if (voucher[0].counterpartyType === "customer") {
              await tx
                .update(customers)
                .set({ balance: sql`${customers.balance} + ${amount}` })
                .where(eq(customers.id, voucher[0].counterpartyId));
            } else if (voucher[0].counterpartyType === "supplier") {
              await tx
                .update(suppliers)
                .set({ balance: sql`${suppliers.balance} + ${amount}` })
                .where(eq(suppliers.id, voucher[0].counterpartyId));
            }
          }
        }

        await tx.insert(activityLogs).values({
          tenantId: ctx.tenantId!,
          userId: ctx.user.id,
          action: `ترحيل قيد ${voucher[0].voucherNumber}`,
          details: `المبلغ: ${voucher[0].amount} - رقم القيد: ${journalEntryId}`,
        });

        // Audit log
        await recordAuditEvent(ctx, {
          action: "VOUCHER_POSTED",
          resourceType: "voucher",
          resourceId: String(input.id),
          before: {
            status: "approved",
            postedById: null,
            postingDate: null,
            journalEntryId: null,
          },
          after: {
            status: "posted",
            postedById: ctx.user.id,
            postingDate: new Date().toISOString(),
            journalEntryId,
          },
          metadata: { route: "vouchers.post" },
        });

        return { success: true, journalEntryId };
      });
    }),

  // ─── Cancel Voucher ────────────────────────────────────────────────
  cancel: tenantProcedure
    .use(requirePermissions(PERMISSIONS.VOUCHERS_CANCEL))
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(1, "يجب إدخال سبب الإلغاء"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("يجب إنشاء مؤسسة أولاً");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const voucher = await db
        .select()
        .from(vouchers)
        .where(
          and(eq(vouchers.id, input.id), eq(vouchers.tenantId, ctx.tenantId!))
        )
        .limit(1);

      if (!voucher[0]) throw new Error("القيود غير موجود");
      if (voucher[0].status === "posted") {
        throw new Error("لا يمكن إلغاء قيد مرحل - استخدم قيد معكوس");
      }
      if (voucher[0].status === "cancelled") {
        throw new Error("القيد ملغي بالفعل");
      }

      return await (db as any).transaction(async (tx: any) => {
        const beforeState = { ...voucher[0] };

        await tx
          .update(vouchers)
          .set({
            status: "cancelled",
            updatedAt: new Date(),
            updatedById: ctx.user.id,
            notes: sql`${vouchers.notes} || ${"\n[إلغاء]: " + input.reason}`,
          })
          .where(eq(vouchers.id, input.id));

        await tx.insert(activityLogs).values({
          tenantId: ctx.tenantId!,
          userId: ctx.user.id,
          action: `إلغاء قيد ${voucher[0].voucherNumber}`,
          details: `السبب: ${input.reason}`,
        });

        // Audit log
        await recordAuditEvent(ctx, {
          action: "VOUCHER_CANCELLED",
          resourceType: "voucher",
          resourceId: String(input.id),
          before: {
            status: beforeState.status,
          },
          after: {
            status: "cancelled",
            cancellationReason: input.reason,
          },
          metadata: { route: "vouchers.cancel" },
        });

        return { success: true };
      });
    }),

  // ─── Reverse Posted Voucher ────────────────────────────────────────
  reverse: tenantProcedure
    .input(
      z.object({
        id: z.number(),
        reversalDate: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("يجب إنشاء مؤسسة أولاً");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const original = await db
        .select()
        .from(vouchers)
        .where(
          and(eq(vouchers.id, input.id), eq(vouchers.tenantId, ctx.tenantId!))
        )
        .limit(1);

      if (!original[0]) throw new Error("القيود غير موجود");
      if (original[0].status !== "posted") {
        throw new Error("لا يمكن عكس قيد غير مرحل");
      }

      return await (db as any).transaction(async (tx: any) => {
        // Get original lines
        const lines = await tx
          .select()
          .from(voucherLines)
          .where(eq(voucherLines.voucherId, input.id));

        // Generate new voucher number with REV prefix
        const { number } = await generateVoucherNumber(
          tx,
          ctx.tenantId!,
          "adjustment"
        );

        // Create reversal voucher
        const [reversal] = await tx
          .insert(vouchers)
          .values({
            tenantId: ctx.tenantId!,
            voucherNumber: number,
            voucherPrefix: "REV",
            voucherType: "adjustment",
            status: "posted",
            voucherDate: new Date(input.reversalDate),
            amount: original[0].amount,
            baseAmount: original[0].baseAmount,
            currencyId: original[0].currencyId,
            exchangeRate: original[0].exchangeRate,
            counterpartyType: original[0].counterpartyType,
            counterpartyId: original[0].counterpartyId,
            counterpartyName: original[0].counterpartyName,
            bankAccountId: original[0].bankAccountId,
            bankAccountCode: original[0].bankAccountCode,
            departmentId: original[0].departmentId,
            projectId: original[0].projectId,
            costCenterId: original[0].costCenterId,
            description: `تعديل معكوس للقيد ${original[0].voucherNumber}${input.reason ? " - " + input.reason : ""}`,
            notes: `معكوس للقيد رقم ${original[0].voucherNumber}`,
            branchId: original[0].branchId,
            reversalOfId: input.id,
            postedById: ctx.user.id,
            postingDate: new Date(),
            createdById: ctx.user.id,
            updatedById: ctx.user.id,
          })
          .returning();

        // Create reversed lines (swap debit/credit)
        for (let i = 0; i < lines.length; i++) {
          const origLine = lines[i];
          await tx.insert(voucherLines).values({
            tenantId: ctx.tenantId!,
            voucherId: reversal.id,
            accountId: origLine.accountId,
            accountCode: origLine.accountCode,
            accountName: origLine.accountName,
            debitAmount: origLine.creditAmount, // Swap
            creditAmount: origLine.debitAmount, // Swap
            costCenterId: origLine.costCenterId,
            departmentId: origLine.departmentId,
            projectId: origLine.projectId,
            description: `معكوس: ${origLine.description || ""}`,
            lineOrder: i,
          });
        }

        // Post reversal to GL
        const reversedVoucher = { ...reversal, tenantId: ctx.tenantId };
        await postVoucherToGl(
          tx,
          reversedVoucher,
          await tx
            .select()
            .from(voucherLines)
            .where(eq(voucherLines.voucherId, reversal.id)),
          ctx.user.id
        );

        // Revert budget spent amount
        if (original[0].budgetLineId) {
          const amount = parseFloat(original[0].amount);
          await tx
            .update(budgetLines)
            .set({
              spentAmount: sql`${budgetLines.spentAmount} - ${amount}`,
            })
            .where(eq(budgetLines.id, original[0].budgetLineId));
        }

        // Revert counterparty balance
        if (original[0].counterpartyType && original[0].counterpartyId) {
          const amount = parseFloat(original[0].amount);
          if (original[0].voucherType === "payment") {
            if (original[0].counterpartyType === "customer") {
              await tx
                .update(customers)
                .set({ balance: sql`${customers.balance} + ${amount}` })
                .where(eq(customers.id, original[0].counterpartyId));
            } else if (original[0].counterpartyType === "supplier") {
              await tx
                .update(suppliers)
                .set({ balance: sql`${suppliers.balance} + ${amount}` })
                .where(eq(suppliers.id, original[0].counterpartyId));
            }
          } else if (original[0].voucherType === "receipt") {
            if (original[0].counterpartyType === "customer") {
              await tx
                .update(customers)
                .set({ balance: sql`${customers.balance} - ${amount}` })
                .where(eq(customers.id, original[0].counterpartyId));
            } else if (original[0].counterpartyType === "supplier") {
              await tx
                .update(suppliers)
                .set({ balance: sql`${suppliers.balance} - ${amount}` })
                .where(eq(suppliers.id, original[0].counterpartyId));
            }
          }
        }

        await tx.insert(activityLogs).values({
          tenantId: ctx.tenantId!,
          userId: ctx.user.id,
          action: `تعديل معكوس للقيد ${original[0].voucherNumber} → ${number}`,
          details: input.reason || "",
        });

        // Audit log
        await recordAuditEvent(ctx, {
          action: "VOUCHER_REVERSED",
          resourceType: "voucher",
          resourceId: String(input.id),
          before: {
            status: original[0].status,
            voucherNumber: original[0].voucherNumber,
          },
          after: {
            reversalId: reversal.id,
            reversalNumber: number,
            reversalDate: input.reversalDate,
            reason: input.reason,
          },
          metadata: { route: "vouchers.reverse" },
        });

        return {
          success: true,
          reversalId: reversal.id,
          reversalNumber: number,
        };
      });
    }),

  // ─── Budget Validation ─────────────────────────────────────────────
  validateBudget: tenantProcedure
    .input(
      z.object({
        budgetLineId: z.number(),
        amount: z.string(),
        excludeVoucherId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { valid: false, error: "Database unavailable" };

      const budgetLine = await db
        .select()
        .from(budgetLines)
        .where(eq(budgetLines.id, input.budgetLineId))
        .limit(1);

      if (!budgetLine[0]) {
        return { valid: false, error: "خط الميزانية غير موجود" };
      }

      const budgetAmount = parseFloat(budgetLine[0].amount || "0");
      const spentAmount = parseFloat(budgetLine[0].spentAmount || "0");
      const proposedAmount = parseFloat(input.amount);

      const totalAfter = spentAmount + proposedAmount;
      const variance = totalAfter - budgetAmount;
      const variancePercentage =
        budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;

      return {
        valid: totalAfter <= budgetAmount,
        budgetAmount,
        spentAmount,
        proposedAmount,
        remainingBudget: Math.max(0, budgetAmount - spentAmount),
        totalAfter,
        variance: Math.abs(variance),
        variancePercentage: Math.abs(variancePercentage).toFixed(2),
        isOverBudget: totalAfter > budgetAmount,
        isNearBudget: totalAfter > budgetAmount * 0.9, // 90% threshold
      };
    }),

  // ─── Get Voucher Statistics ─────────────────────────────────────────
  getStats: tenantProcedure
    .input(
      z
        .object({
          fromDate: z.string().optional(),
          toDate: z.string().optional(),
          type: voucherTypeSchema.optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const conditions = [eq(vouchers.tenantId, ctx.tenantId!)];
      if (input?.fromDate)
        conditions.push(gte(vouchers.voucherDate, new Date(input.fromDate)));
      if (input?.toDate)
        conditions.push(lte(vouchers.voucherDate, new Date(input.toDate)));
      if (input?.type) conditions.push(eq(vouchers.voucherType, input.type));

      // Total amounts by type and status
      const stats = await db
        .select({
          voucherType: vouchers.voucherType,
          status: vouchers.status,
          totalAmount: sql<string>`sum(${vouchers.amount})`,
          count: sql<number>`count(*)`,
        })
        .from(vouchers)
        .where(and(...conditions))
        .groupBy(vouchers.voucherType, vouchers.status);

      // Pending approvals count
      const pendingCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(vouchers)
        .where(
          and(
            eq(vouchers.tenantId, ctx.tenantId!),
            eq(vouchers.status, "pending")
          )
        );

      // Total by type
      const totalPayments = await db
        .select({ total: sql<string>`coalesce(sum(${vouchers.amount}), 0)` })
        .from(vouchers)
        .where(
          and(
            eq(vouchers.tenantId, ctx.tenantId!),
            eq(vouchers.voucherType, "payment"),
            eq(vouchers.status, "posted")
          )
        );

      const totalReceipts = await db
        .select({ total: sql<string>`coalesce(sum(${vouchers.amount}), 0)` })
        .from(vouchers)
        .where(
          and(
            eq(vouchers.tenantId, ctx.tenantId!),
            eq(vouchers.voucherType, "receipt"),
            eq(vouchers.status, "posted")
          )
        );

      return {
        byStatus: stats,
        pendingApprovals: pendingCount[0]?.count || 0,
        totalPayments: parseFloat(totalPayments[0]?.total || "0"),
        totalReceipts: parseFloat(totalReceipts[0]?.total || "0"),
        netCashFlow:
          parseFloat(totalReceipts[0]?.total || "0") -
          parseFloat(totalPayments[0]?.total || "0"),
      };
    }),
});
