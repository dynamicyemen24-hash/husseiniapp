import { z } from "zod";
import { router, tenantProcedure } from "./_core/trpc";
import { eq, and, desc, sql } from "drizzle-orm";
import { partners, partnerTransactions } from "../drizzle/schema";
import { postBalancedJournalInTx } from "./services/accountingEngine";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";

export const partnerAccountingRouter = router({
  getPartners: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const list = await db
      .select()
      .from(partners)
      .where(eq(partners.tenantId, ctx.tenantId))
      .orderBy(partners.name);
    return list;
  }),

  createPartner: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1),
        nameAr: z.string().optional(),
        capitalAmount: z.number().default(0),
        ownershipPercent: z.number().min(0).max(100),
        profitSharePercent: z.number().min(0).max(100),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        currentAccountAccountId: z.number().optional(),
        capitalAccountId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [inserted] = await db
        .insert(partners)
        .values({
          tenantId: ctx.tenantId,
          name: input.name,
          nameAr: input.nameAr || null,
          capitalAmount: input.capitalAmount.toFixed(2),
          ownershipPercent: input.ownershipPercent.toFixed(2),
          profitSharePercent: input.profitSharePercent.toFixed(2),
          email: input.email || null,
          phone: input.phone || null,
          currentAccountAccountId: input.currentAccountAccountId || null,
          capitalAccountId: input.capitalAccountId || null,
          notes: input.notes || null,
        })
        .returning();
      return inserted;
    }),

  addTransaction: tenantProcedure
    .input(
      z.object({
        partnerId: z.number(),
        type: z.enum([
          "capital_contribution",
          "drawing",
          "profit_distribution",
          "interest",
          "loan",
        ]),
        amount: z.number().positive(),
        narration: z.string().min(1),
        debitAccountId: z.number(),
        creditAccountId: z.number(),
        transactionDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tenantId = ctx.tenantId!;

      const txDate = input.transactionDate
        ? new Date(input.transactionDate)
        : new Date();

      // القيد المحاسبي + حركة الشريك + تحديث رأس المال في معاملة واحدة:
      // أي فشل يتراجع عن الجميع (لا قيد يتيم بلا حركة شريك).
      return await db.transaction(async (tx: any) => {
        const partnerRows = await tx
          .select()
          .from(partners)
          .where(
            and(
              eq(partners.id, input.partnerId),
              eq(partners.tenantId, tenantId)
            )
          )
          .limit(1)
          .forUpdate();

        if (partnerRows.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "الشريك غير موجود",
          });
        }

        // Post balanced journal entry
        const journalRes = await postBalancedJournalInTx(tx, {
          tenantId,
          date: txDate,
          narration: `حركة شريك (${input.type}): ${input.narration} - الشريك #${input.partnerId}`,
          sourceModule: "partner_accounting",
          legs: [
            {
              accountId: input.debitAccountId,
              type: "debit",
              amount: input.amount,
              narration: input.narration,
            },
            {
              accountId: input.creditAccountId,
              type: "credit",
              amount: input.amount,
              narration: input.narration,
            },
          ],
        });

        const [txRecord] = await tx
          .insert(partnerTransactions)
          .values({
            tenantId,
            partnerId: input.partnerId,
            type: input.type,
            amount: input.amount.toFixed(2),
            transactionDate: txDate,
            narration: input.narration,
            journalEntryId: journalRes.journalId,
          })
          .returning();

        // If capital contribution, update capital amount
        if (input.type === "capital_contribution") {
          const p = partnerRows[0];
          const newCap = parseFloat(p.capitalAmount) + input.amount;
          await tx
            .update(partners)
            .set({ capitalAmount: newCap.toFixed(2), updatedAt: new Date() })
            .where(
              and(
                eq(partners.id, input.partnerId),
                eq(partners.tenantId, tenantId)
              )
            );
        }

        return { txRecord, journalId: journalRes.journalId };
      });
    }),

  getTransactions: tenantProcedure
    .input(
      z
        .object({
          partnerId: z.number().optional(),
          limit: z.number().int().min(1).max(200).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { rows: [], total: 0 };
      const tenantId = ctx.tenantId!;
      const conditions = [eq(partnerTransactions.tenantId, tenantId)];
      if (input?.partnerId) {
        conditions.push(eq(partnerTransactions.partnerId, input.partnerId));
      }
      const where = and(...conditions);
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(partnerTransactions)
          .where(where)
          .orderBy(desc(partnerTransactions.transactionDate))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(partnerTransactions)
          .where(where),
      ]);

      return { rows, total: countResult[0]?.count ?? 0 };
    }),

  equityStatement: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { totalCapital: 0, partnersCount: 0, details: [] };
    const partnerList = await db
      .select()
      .from(partners)
      .where(eq(partners.tenantId, ctx.tenantId));

    let totalCapital = 0;
    const details = partnerList.map((p: any) => {
      const cap = parseFloat(p.capitalAmount);
      totalCapital += cap;
      return {
        id: p.id,
        name: p.name,
        nameAr: p.nameAr,
        capitalAmount: cap,
        ownershipPercent: parseFloat(p.ownershipPercent),
        profitSharePercent: parseFloat(p.profitSharePercent),
      };
    });

    return {
      totalCapital,
      partnersCount: partnerList.length,
      details,
    };
  }),
});
