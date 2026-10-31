import { z } from "zod";
import { eq, and, or, ilike, asc } from "drizzle-orm";
import { router, tenantProcedure, requirePermissions } from "./_core/trpc";
import { getDb } from "./db";
import { customers, suppliers } from "../drizzle/schema";
import { buildSearchVariants, likePattern, rankRow } from "./_core/searchUtils";
import {
  validatePhone,
  validateEmail,
  validateTaxNumber,
  validateName,
} from "./services/validation";
import { checkCustomerDuplicate } from "./services/deduplication";
import { PERMISSIONS } from "../shared/permissions";

/**
 * Unified beneficiary — شخص أو جهة، أي دولة
 * - single search across customers+suppliers
 * - strict validation (phone/email/tax per country)
 * - dedup guarantee (code/phone/email/tax)
 * - linked to orders/invoices via customerId/supplierId
 */
export const beneficiariesRouter = router({
  search: tenantProcedure
    .use(requirePermissions(PERMISSIONS.BENEFICIARIES_VIEW))
    .input(
      z.object({
        q: z.string().min(1),
        kind: z.enum(["customer", "supplier", "all"]).default("all"),
        limit: z.number().min(1).max(20).default(8),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return [];

      // Normalize Arabic + escape LIKE wildcards (anti pattern-injection).
      const variants = buildSearchVariants(input.q);
      if (!variants.length) return [];
      const matchAny = (cols: any[]) =>
        or(
          ...cols.flatMap(col => variants.map(v => ilike(col, likePattern(v))))
        );

      // Both branches run in parallel — latency = slowest, not the sum.
      const [cust, supp] = await Promise.all([
        input.kind === "supplier"
          ? Promise.resolve([] as any[])
          : db
              .select()
              .from(customers)
              .where(
                and(
                  eq(customers.tenantId, ctx.tenantId!),
                  matchAny([customers.name, customers.code, customers.phone])
                )
              )
              .limit(input.limit),
        input.kind === "customer"
          ? Promise.resolve([] as any[])
          : db
              .select()
              .from(suppliers)
              .where(
                and(
                  eq(suppliers.tenantId, ctx.tenantId!),
                  matchAny([suppliers.name, suppliers.code, suppliers.phone])
                )
              )
              .limit(input.limit),
      ]);

      // Relevance-ordered merged list (prefix > word-start > substring).
      const ranked = [
        ...cust.map((c: any) => ({
          ...c,
          kind: "customer" as const,
          _score: rankRow(variants[0], [c.name], [c.code]),
        })),
        ...supp.map((s: any) => ({
          ...s,
          kind: "supplier" as const,
          _score: rankRow(variants[0], [s.name], [s.code]),
        })),
      ]
        .sort(
          (a, b) =>
            b._score - a._score || (a.code ?? "").localeCompare(b.code ?? "")
        )
        .slice(0, input.limit);

      return ranked.map(({ _score: _s, ...row }: any) => row);
    }),

  upsert: tenantProcedure
    .use(requirePermissions(PERMISSIONS.BENEFICIARIES_MANAGE))
    .input(
      z.object({
        kind: z.enum(["customer", "supplier"]),
        name: z.string().min(2).max(120),
        code: z.string().min(1).max(30).optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        country: z.string().min(2).max(4).default("YE"),
        city: z.string().optional(),
        taxNumber: z.string().optional(),
        beneficiaryType: z.enum(["person", "entity"]).default("person"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");

      // تحقق دقيق
      const nameCheck = validateName(input.name);
      if (!nameCheck.ok) throw new Error(nameCheck.error);
      if (input.phone) {
        const p = validatePhone(input.phone, input.country);
        if (!p.ok) throw new Error(p.error);
      }
      if (input.email) {
        const e = validateEmail(input.email);
        if (!e.ok) throw new Error(e.error);
      }
      if (input.taxNumber) {
        const t = validateTaxNumber(input.taxNumber, input.country);
        if (!t.ok) throw new Error(t.error);
      }

      const table = input.kind === "customer" ? customers : suppliers;
      const dup = await checkCustomerDuplicate(db, table, ctx.tenantId!, {
        code: input.code,
        phone: input.phone,
        email: input.email,
        taxNumber: input.taxNumber,
        name: input.name,
      });
      if (dup.isDuplicate) throw new Error(dup.message || "السجل موجود مسبقاً");

      const code =
        input.code?.trim() ||
        `${input.kind === "customer" ? "CUST" : "SUPP"}-${Date.now().toString(36).toUpperCase()}`;
      const [row] = await db
        .insert(table)
        .values({
          tenantId: ctx.tenantId!,
          code,
          name: input.name.trim(),
          phone: input.phone?.trim() || null,
          email: input.email?.trim().toLowerCase() || null,
          taxNumber: input.taxNumber?.trim() || null,
          city: input.city?.trim() || null,
          address: input.country
            ? `${input.country} — ${input.city || ""}`.trim()
            : null,
        } as any)
        .returning();
      return row;
    }),
});
