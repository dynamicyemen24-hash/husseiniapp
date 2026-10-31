import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import {
  customers,
  products,
  accounts,
  warehouses,
  costCenters,
} from "../drizzle/schema";
import { eq, like } from "drizzle-orm";

export const smartRouter = router({
  customer: router({
    search: publicProcedure
      .input(z.object({ q: z.string().min(2).max(50) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const results = await db
          .select()
          .from(customers)
          .where(like(customers.name, `%${input.q}%`))
          .limit(20);

        return results.map((c: any) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          email: c.email,
          phone: c.phone,
          address: c.address,
          city: c.city,
          taxNumber: c.taxNumber,
          balance: c.balance?.toString() ?? "0",
          creditLimit: c.creditLimit?.toString() ?? "0",
          paymentTermsDays: c.paymentTermsDays ?? 0,
        }));
      }),

    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const [result] = await db
          .select()
          .from(customers)
          .where(eq(customers.id, Number(input.id)));

        if (!result) return null;
        return {
          id: result.id,
          name: result.name,
          code: result.code,
          email: result.email,
          phone: result.phone,
          address: result.address,
          city: result.city,
          taxNumber: result.taxNumber,
          balance: result.balance?.toString() ?? "0",
          creditLimit: result.creditLimit?.toString() ?? "0",
          paymentTermsDays: result.paymentTermsDays ?? 0,
        };
      }),
  }),

  product: router({
    search: publicProcedure
      .input(z.object({ q: z.string().min(2).max(50) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const results = await db
          .select()
          .from(products)
          .where(like(products.name, `%${input.q}%`))
          .limit(20);

        return results.map((p: any) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          barcode: p.barcode,
          category: p.category,
          unit: p.unit,
          salePrice: p.salePrice?.toString() ?? "0",
          purchasePrice: p.purchasePrice?.toString() ?? "0",
          currentStock: p.currentStock ?? 0,
          minStock: p.minStock ?? 0,
        }));
      }),
  }),

  account: router({
    search: publicProcedure
      .input(z.object({ q: z.string().min(2).max(50) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const results = await db
          .select()
          .from(accounts)
          .where(like(accounts.name, `%${input.q}%`))
          .limit(20);

        return results.map((a: any) => ({
          id: a.id,
          name: a.name,
          code: a.code,
          type: a.type,
          balance: a.balance?.toString() ?? "0",
          hasSubAccounts: a.hasSubAccounts ?? false,
        }));
      }),
  }),

  docNumber: router({
    generate: publicProcedure
      .input(z.object({ type: z.string() }))
      .query(async ({ input }) => {
        const year = new Date().getFullYear();
        const prefixes: Record<string, string> = {
          vouchers: "VCH",
          invoices: "INV",
          purchases: "PRC",
          sales: "SLD",
          journals: "JRN",
          requisitions: "REQ",
          payments: "PAY",
          receipts: "RCP",
        };
        const prefix = prefixes[input.type] ?? "DOC";
        const nextSeq = Math.floor(Math.random() * 999) + 1;

        return {
          number: `${prefix}-${String(nextSeq).padStart(5, "0")}-${year}`,
          prefix,
          year,
          sequence: nextSeq,
        };
      }),
  }),

  warehouse: router({
    search: publicProcedure
      .input(z.object({ q: z.string().min(2).max(50) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const results = await db
          .select()
          .from(warehouses)
          .where(like(warehouses.name, `%${input.q}%`))
          .limit(10);

        return results.map((w: any) => ({
          id: w.id,
          name: w.name,
          code: w.code,
          location: w.location,
        }));
      }),
  }),

  costCenter: router({
    search: publicProcedure
      .input(z.object({ q: z.string().min(2).max(50) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const results = await db
          .select()
          .from(costCenters)
          .where(like(costCenters.name, `%${input.q}%`))
          .limit(10);

        return results.map((cc: any) => ({
          id: cc.id,
          name: cc.name,
          code: cc.code,
          type: cc.type,
        }));
      }),
  }),

  paymentMethod: router({
    list: publicProcedure.query(async () => {
      return [
        { id: "cash", name: "نقدي", code: "CASH" },
        { id: "bank-transfer", name: "تحويل بنكي", code: "BANK" },
        { id: "check", name: "شيك", code: "CHK" },
        { id: "credit-card", name: "بطاقة ائتمانية", code: "CC" },
      ];
    }),
  }),

  currency: router({
    list: publicProcedure.query(async () => {
      return [
        { id: "SAR", name: "ريال سعودي", code: "SAR", symbol: "ر.س", rate: 1 },
        {
          id: "USD",
          name: "دولار أمريكي",
          code: "USD",
          symbol: "$",
          rate: 3.75,
        },
        { id: "EUR", name: "يورو", code: "EUR", symbol: "€", rate: 4.08 },
      ];
    }),
  }),
});
